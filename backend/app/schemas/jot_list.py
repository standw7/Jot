from datetime import datetime

from pydantic import BaseModel


class JotListCreate(BaseModel):
    name: str
    folder_id: str | None = None
    description: str | None = None
    icon: str | None = None
    color: str | None = None
    is_pinned: bool = False
    sort_order: int = 0


class JotListUpdate(BaseModel):
    name: str | None = None
    folder_id: str | None = None
    description: str | None = None
    icon: str | None = None
    color: str | None = None
    is_pinned: bool | None = None
    sort_order: int | None = None


class JotListResponse(BaseModel):
    id: str
    user_id: str
    folder_id: str | None
    name: str
    description: str | None
    icon: str | None
    color: str | None
    is_pinned: bool
    sort_order: int
    item_count: int = 0
    checked_count: int = 0
    preview: str | None = None
    created_at: datetime
    updated_at: datetime
    last_opened_at: datetime | None = None

    model_config = {"from_attributes": True}
