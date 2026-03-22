from pydantic import BaseModel


class UserSettingsResponse(BaseModel):
    id: str
    linkwarden_api_url: str | None
    linkwarden_api_key: str | None
    doit_api_url: str | None
    doit_api_key: str | None
    google_connected: bool = False
    jot_calendar_id: str | None

    model_config = {"from_attributes": True}


class UserSettingsUpdate(BaseModel):
    linkwarden_api_url: str | None = None
    linkwarden_api_key: str | None = None
    doit_api_url: str | None = None
    doit_api_key: str | None = None
