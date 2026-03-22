from datetime import datetime

from pydantic import BaseModel


class ItemImageResponse(BaseModel):
    id: str
    item_id: str
    filename: str
    original_name: str
    mime_type: str
    size_bytes: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
