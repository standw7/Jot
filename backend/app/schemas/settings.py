from pydantic import BaseModel


class IntegrationStatus(BaseModel):
    name: str
    connected: bool


class UserSettingsResponse(BaseModel):
    id: str
    integrations: list[IntegrationStatus]
    google_connected: bool = False
    jot_calendar_id: str | None = None

    model_config = {"from_attributes": True}
