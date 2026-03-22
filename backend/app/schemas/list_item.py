from datetime import datetime

from pydantic import BaseModel

from app.schemas.item_image import ItemImageResponse
from app.schemas.item_link import ItemLinkResponse


class ListItemCreate(BaseModel):
    content: str
    item_type: str = "text"  # "text" or "checkbox"
    sort_order: int | None = None
    indent_level: int = 0


class ListItemUpdate(BaseModel):
    content: str | None = None
    item_type: str | None = None
    is_checked: bool | None = None
    sort_order: int | None = None
    indent_level: int | None = None


class ListItemReorder(BaseModel):
    item_ids: list[str]


class ListItemResponse(BaseModel):
    id: str
    list_id: str
    user_id: str
    content: str
    item_type: str
    is_checked: bool
    checked_at: datetime | None
    sort_order: int
    indent_level: int
    links: list[ItemLinkResponse] = []
    images: list[ItemImageResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
