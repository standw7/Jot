from datetime import datetime

from pydantic import BaseModel


class FolderCreate(BaseModel):
    name: str
    parent_id: str | None = None
    sort_order: int = 0


class FolderUpdate(BaseModel):
    name: str | None = None
    parent_id: str | None = None
    sort_order: int | None = None


class FolderResponse(BaseModel):
    id: str
    user_id: str
    parent_id: str | None
    name: str
    sort_order: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FolderTreeResponse(FolderResponse):
    children: list["FolderTreeResponse"] = []
