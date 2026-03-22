from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.models.user import User
from app.models.user_settings import UserSettings
from app.schemas.settings import UserSettingsResponse, UserSettingsUpdate

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/", response_model=UserSettingsResponse)
def get_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get user settings."""
    user_settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    if not user_settings:
        user_settings = UserSettings(user_id=current_user.id)
        db.add(user_settings)
        db.commit()
        db.refresh(user_settings)

    return UserSettingsResponse(
        id=user_settings.id,
        linkwarden_api_url=user_settings.linkwarden_api_url,
        linkwarden_api_key=user_settings.linkwarden_api_key,
        doit_api_url=user_settings.doit_api_url,
        doit_api_key=user_settings.doit_api_key,
        google_connected=bool(user_settings.google_refresh_token),
        jot_calendar_id=user_settings.jot_calendar_id,
    )


@router.put("/", response_model=UserSettingsResponse)
def update_settings(
    body: UserSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update user settings."""
    user_settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    if not user_settings:
        user_settings = UserSettings(user_id=current_user.id)
        db.add(user_settings)

    if body.linkwarden_api_url is not None:
        user_settings.linkwarden_api_url = body.linkwarden_api_url
    if body.linkwarden_api_key is not None:
        user_settings.linkwarden_api_key = body.linkwarden_api_key
    if body.doit_api_url is not None:
        user_settings.doit_api_url = body.doit_api_url
    if body.doit_api_key is not None:
        user_settings.doit_api_key = body.doit_api_key

    db.commit()
    db.refresh(user_settings)

    return UserSettingsResponse(
        id=user_settings.id,
        linkwarden_api_url=user_settings.linkwarden_api_url,
        linkwarden_api_key=user_settings.linkwarden_api_key,
        doit_api_url=user_settings.doit_api_url,
        doit_api_key=user_settings.doit_api_key,
        google_connected=bool(user_settings.google_refresh_token),
        jot_calendar_id=user_settings.jot_calendar_id,
    )
