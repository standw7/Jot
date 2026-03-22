from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.models.user import User
from app.models.user_settings import UserSettings
from app.schemas.settings import IntegrationStatus, UserSettingsResponse
from app.services import doit as doit_service
from app.services import linkwarden as lw_service

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/", response_model=UserSettingsResponse)
def get_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get user settings and integration status."""
    user_settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    if not user_settings:
        user_settings = UserSettings(user_id=current_user.id)
        db.add(user_settings)
        db.commit()
        db.refresh(user_settings)

    integrations = [
        IntegrationStatus(name="Linkwarden", connected=lw_service.is_configured()),
        IntegrationStatus(name="DoIt", connected=doit_service.is_configured()),
    ]

    return UserSettingsResponse(
        id=user_settings.id,
        integrations=integrations,
        google_connected=bool(user_settings.google_refresh_token),
        jot_calendar_id=user_settings.jot_calendar_id,
    )
