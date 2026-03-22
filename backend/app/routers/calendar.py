from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.deps import get_current_user, get_db
from app.models.calendar_event_link import CalendarEventLink
from app.models.list_item import ListItem
from app.models.user import User
from app.models.user_settings import UserSettings
from app.services import google_auth, google_calendar

router = APIRouter(prefix="/calendar", tags=["calendar"])


def _get_settings_or_error(user: User, db: Session) -> UserSettings:
    user_settings = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
    if not user_settings or not user_settings.google_refresh_token:
        raise HTTPException(status_code=400, detail="Google Calendar not connected")
    return user_settings


@router.get("/calendars")
async def list_calendars(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List user's Google calendars."""
    user_settings = _get_settings_or_error(current_user, db)
    try:
        return await google_calendar.list_calendars(user_settings.google_refresh_token)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Google Calendar error: {e}")


class CreateEventRequest(BaseModel):
    item_id: str
    summary: str
    date: str  # YYYY-MM-DD
    time: str | None = None  # HH:MM
    description: str | None = None


@router.post("/events", status_code=status.HTTP_201_CREATED)
async def create_event(
    body: CreateEventRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a Google Calendar event and link it to a list item."""
    user_settings = _get_settings_or_error(current_user, db)

    item = db.query(ListItem).filter(ListItem.id == body.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    calendar_id = user_settings.jot_calendar_id or "primary"

    try:
        event = await google_calendar.create_event(
            refresh_token=user_settings.google_refresh_token,
            calendar_id=calendar_id,
            summary=body.summary,
            date=body.date,
            time=body.time,
            description=body.description,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Google Calendar error: {e}")

    link = CalendarEventLink(
        item_id=body.item_id,
        user_id=current_user.id,
        google_event_id=event["id"],
        event_summary=body.summary,
        event_date=body.date,
        event_time=body.time,
        calendar_id=calendar_id,
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    return link


@router.delete("/events/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    link_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a calendar event and its link."""
    link = db.query(CalendarEventLink).filter(
        CalendarEventLink.id == link_id, CalendarEventLink.user_id == current_user.id
    ).first()
    if not link:
        raise HTTPException(status_code=404, detail="Event link not found")

    # Try to delete from Google Calendar
    user_settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    if user_settings and user_settings.google_refresh_token:
        try:
            await google_calendar.delete_event(
                user_settings.google_refresh_token,
                link.calendar_id or "primary",
                link.google_event_id,
            )
        except Exception:
            pass  # Event may already be deleted in Google

    db.delete(link)
    db.commit()


# ── Google OAuth ──────────────────────────────────────────────


class GoogleCodeRequest(BaseModel):
    code: str


@router.get("/google-auth-url")
def get_google_auth_url(
    state: str | None = None,
    current_user: User = Depends(get_current_user),
):
    """Return the Google OAuth authorization URL."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=400, detail="Google OAuth not configured")
    return {"url": google_auth.get_authorization_url(state=state)}


@router.post("/google-callback")
async def exchange_google_code(
    body: GoogleCodeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Exchange a Google authorization code for tokens."""
    try:
        tokens = await google_auth.exchange_code(body.code)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to exchange code: {e}")

    refresh_token = tokens.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=400,
            detail="No refresh token received. Try revoking access in Google Account settings.",
        )

    user_settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    if not user_settings:
        user_settings = UserSettings(user_id=current_user.id)
        db.add(user_settings)

    user_settings.google_refresh_token = refresh_token
    db.commit()
    return {"ok": True}


@router.delete("/google-disconnect")
def disconnect_google(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove Google Calendar connection."""
    user_settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    if user_settings:
        user_settings.google_refresh_token = None
        user_settings.jot_calendar_id = None
        db.commit()
    return {"ok": True}


class SetupCalendarRequest(BaseModel):
    calendar_id: str


@router.post("/setup")
def setup_calendar(
    body: SetupCalendarRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Set the calendar to use for Jot events."""
    user_settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    if not user_settings:
        user_settings = UserSettings(user_id=current_user.id)
        db.add(user_settings)

    user_settings.jot_calendar_id = body.calendar_id
    db.commit()
    return {"ok": True, "calendar_id": body.calendar_id}
