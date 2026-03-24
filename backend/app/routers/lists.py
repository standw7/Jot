import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.models.jot_list import JotList
from app.models.list_item import ListItem
from app.models.user import User
from app.schemas.jot_list import JotListCreate, JotListResponse, JotListUpdate

router = APIRouter(prefix="/lists", tags=["lists"])


def _enrich_list(jot_list: JotList, db: Session) -> dict:
    """Add item_count, checked_count, and preview to a list response."""
    data = JotListResponse.model_validate(jot_list).model_dump()
    total = db.query(func.count(ListItem.id)).filter(ListItem.list_id == jot_list.id).scalar() or 0
    checked = db.query(func.count(ListItem.id)).filter(
        ListItem.list_id == jot_list.id, ListItem.is_checked == True  # noqa: E712
    ).scalar() or 0
    data["item_count"] = total
    data["checked_count"] = checked

    # Content preview — first item's content, stripped of markdown syntax
    first_item = db.query(ListItem.content).filter(
        ListItem.list_id == jot_list.id,
    ).order_by(ListItem.sort_order).first()
    if first_item and first_item.content:
        # Take first non-empty line, strip checkbox/bullet prefixes
        lines = [l.strip() for l in first_item.content.split("\n") if l.strip()]
        preview = ""
        for line in lines:
            # Strip checkbox prefix
            clean = re.sub(r"^- \[[ x]\] ", "", line)
            # Strip bullet prefix
            clean = re.sub(r"^- ", "", clean)
            # Strip heading prefix
            clean = re.sub(r"^#{1,3} ", "", clean)
            if clean:
                preview = clean[:120]
                break
        data["preview"] = preview or None
    else:
        data["preview"] = None
    return data


@router.get("/", response_model=list[JotListResponse])
def get_lists(
    folder_id: str | None = None,
    pinned: bool | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all lists, optionally filtered by folder or pinned status."""
    query = db.query(JotList).filter(JotList.user_id == current_user.id)

    if folder_id is not None:
        query = query.filter(JotList.folder_id == folder_id)
    if pinned is not None:
        query = query.filter(JotList.is_pinned == pinned)

    query = query.order_by(JotList.sort_order, JotList.created_at.desc())
    lists = query.all()

    return [_enrich_list(jl, db) for jl in lists]


@router.post("/", response_model=JotListResponse, status_code=status.HTTP_201_CREATED)
def create_list(
    body: JotListCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new list."""
    jot_list = JotList(
        user_id=current_user.id,
        name=body.name.strip(),
        folder_id=body.folder_id,
        description=body.description,
        icon=body.icon,
        color=body.color,
        is_pinned=body.is_pinned,
        sort_order=body.sort_order,
    )
    db.add(jot_list)
    db.commit()
    db.refresh(jot_list)
    return _enrich_list(jot_list, db)


@router.get("/{list_id}", response_model=JotListResponse)
def get_list(
    list_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single list."""
    jot_list = db.query(JotList).filter(
        JotList.id == list_id, JotList.user_id == current_user.id
    ).first()
    if not jot_list:
        raise HTTPException(status_code=404, detail="List not found")
    # Touch last_opened_at
    jot_list.last_opened_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(jot_list)
    return _enrich_list(jot_list, db)


@router.put("/{list_id}", response_model=JotListResponse)
def update_list(
    list_id: str,
    body: JotListUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a list."""
    jot_list = db.query(JotList).filter(
        JotList.id == list_id, JotList.user_id == current_user.id
    ).first()
    if not jot_list:
        raise HTTPException(status_code=404, detail="List not found")

    if body.name is not None:
        jot_list.name = body.name.strip()
    if body.folder_id is not None:
        jot_list.folder_id = body.folder_id if body.folder_id else None
    if body.description is not None:
        jot_list.description = body.description
    if body.icon is not None:
        jot_list.icon = body.icon
    if body.color is not None:
        jot_list.color = body.color
    if body.is_pinned is not None:
        jot_list.is_pinned = body.is_pinned
    if body.sort_order is not None:
        jot_list.sort_order = body.sort_order

    db.commit()
    db.refresh(jot_list)
    return _enrich_list(jot_list, db)


@router.delete("/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_list(
    list_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a list and all its items."""
    jot_list = db.query(JotList).filter(
        JotList.id == list_id, JotList.user_id == current_user.id
    ).first()
    if not jot_list:
        raise HTTPException(status_code=404, detail="List not found")

    db.delete(jot_list)
    db.commit()
