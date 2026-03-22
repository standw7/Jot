from datetime import datetime

from pydantic import BaseModel


class ItemLinkCreate(BaseModel):
    url: str
    title: str | None = None


class ItemLinkResponse(BaseModel):
    id: str
    item_id: str
    url: str
    title: str | None
    favicon_url: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
