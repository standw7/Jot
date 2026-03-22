import os
import uuid as uuid_mod
from datetime import datetime, timezone
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.deps import get_current_user, get_db
from app.models.item_image import ItemImage
from app.models.item_link import ItemLink
from app.models.jot_list import JotList
from app.models.list_item import ListItem
from app.models.user import User
from app.schemas.item_image import ItemImageResponse
from app.schemas.item_link import ItemLinkCreate, ItemLinkResponse
from app.schemas.list_item import ListItemCreate, ListItemReorder, ListItemResponse, ListItemUpdate

router = APIRouter(prefix="/lists/{list_id}/items", tags=["items"])


def _get_list_or_404(list_id: str, user: User, db: Session) -> JotList:
    jot_list = db.query(JotList).filter(
        JotList.id == list_id, JotList.user_id == user.id
    ).first()
    if not jot_list:
        raise HTTPException(status_code=404, detail="List not found")
    return jot_list


@router.get("/", response_model=list[ListItemResponse])
def get_items(
    list_id: str,
    show_checked: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get items for a list."""
    _get_list_or_404(list_id, current_user, db)

    query = db.query(ListItem).options(
        joinedload(ListItem.links),
        joinedload(ListItem.images),
    ).filter(ListItem.list_id == list_id)
    if not show_checked:
        query = query.filter(ListItem.is_checked == False)  # noqa: E712
    query = query.order_by(ListItem.sort_order, ListItem.created_at)
    # Use unique() approach: get results, deduplicate by id
    results = query.all()
    seen = set()
    unique_items = []
    for item in results:
        if item.id not in seen:
            seen.add(item.id)
            unique_items.append(item)
    return unique_items


@router.post("/", response_model=ListItemResponse, status_code=status.HTTP_201_CREATED)
def create_item(
    list_id: str,
    body: ListItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new item in a list."""
    _get_list_or_404(list_id, current_user, db)

    # Auto-set sort_order to end of list
    if body.sort_order is None:
        max_order = db.query(ListItem.sort_order).filter(
            ListItem.list_id == list_id
        ).order_by(ListItem.sort_order.desc()).first()
        sort_order = (max_order[0] + 1) if max_order else 0
    else:
        sort_order = body.sort_order

    item = ListItem(
        list_id=list_id,
        user_id=current_user.id,
        content=body.content,
        item_type=body.item_type,
        sort_order=sort_order,
        indent_level=body.indent_level,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{item_id}", response_model=ListItemResponse)
def update_item(
    list_id: str,
    item_id: str,
    body: ListItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an item."""
    _get_list_or_404(list_id, current_user, db)

    item = db.query(ListItem).filter(
        ListItem.id == item_id, ListItem.list_id == list_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    if body.content is not None:
        item.content = body.content
    if body.item_type is not None:
        item.item_type = body.item_type
    if body.is_checked is not None:
        item.is_checked = body.is_checked
        item.checked_at = datetime.now(timezone.utc) if body.is_checked else None
    if body.sort_order is not None:
        item.sort_order = body.sort_order
    if body.indent_level is not None:
        item.indent_level = body.indent_level

    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(
    list_id: str,
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete an item."""
    _get_list_or_404(list_id, current_user, db)

    item = db.query(ListItem).filter(
        ListItem.id == item_id, ListItem.list_id == list_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    db.delete(item)
    db.commit()


@router.post("/{item_id}/check", response_model=ListItemResponse)
def toggle_check(
    list_id: str,
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Toggle check status of an item."""
    _get_list_or_404(list_id, current_user, db)

    item = db.query(ListItem).filter(
        ListItem.id == item_id, ListItem.list_id == list_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    item.is_checked = not item.is_checked
    item.checked_at = datetime.now(timezone.utc) if item.is_checked else None
    db.commit()
    db.refresh(item)
    return item


@router.post("/reorder", status_code=status.HTTP_200_OK)
def reorder_items(
    list_id: str,
    body: ListItemReorder,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Reorder items by providing ordered list of item IDs."""
    _get_list_or_404(list_id, current_user, db)

    for idx, item_id in enumerate(body.item_ids):
        db.query(ListItem).filter(
            ListItem.id == item_id, ListItem.list_id == list_id
        ).update({"sort_order": idx}, synchronize_session="fetch")

    db.commit()
    return {"ok": True}


# ── Item Links ────────────────────────────────────────────────

@router.post("/{item_id}/links", response_model=ItemLinkResponse, status_code=status.HTTP_201_CREATED)
def add_link(
    list_id: str,
    item_id: str,
    body: ItemLinkCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a link to an item."""
    _get_list_or_404(list_id, current_user, db)
    item = db.query(ListItem).filter(ListItem.id == item_id, ListItem.list_id == list_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Extract favicon URL from domain
    parsed = urlparse(body.url)
    favicon_url = f"https://www.google.com/s2/favicons?domain={parsed.netloc}&sz=32" if parsed.netloc else None

    link = ItemLink(
        item_id=item_id,
        url=body.url,
        title=body.title,
        favicon_url=favicon_url,
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    return link


@router.delete("/{item_id}/links/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_link(
    list_id: str,
    item_id: str,
    link_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a link from an item."""
    _get_list_or_404(list_id, current_user, db)
    link = db.query(ItemLink).filter(ItemLink.id == link_id, ItemLink.item_id == item_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    db.delete(link)
    db.commit()


# ── Item Images ───────────────────────────────────────────────

@router.post("/{item_id}/images", response_model=ItemImageResponse, status_code=status.HTTP_201_CREATED)
async def upload_image(
    list_id: str,
    item_id: str,
    file: UploadFile,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload an image to an item."""
    _get_list_or_404(list_id, current_user, db)
    item = db.query(ListItem).filter(ListItem.id == item_id, ListItem.list_id == list_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    # Generate unique filename
    ext = os.path.splitext(file.filename or "image.jpg")[1]
    filename = f"{uuid_mod.uuid4()}{ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(content)

    image = ItemImage(
        item_id=item_id,
        filename=filename,
        original_name=file.filename or "image.jpg",
        mime_type=file.content_type,
        size_bytes=len(content),
    )
    db.add(image)
    db.commit()
    db.refresh(image)
    return image


@router.delete("/{item_id}/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_image(
    list_id: str,
    item_id: str,
    image_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete an image from an item."""
    _get_list_or_404(list_id, current_user, db)
    image = db.query(ItemImage).filter(ItemImage.id == image_id, ItemImage.item_id == item_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    # Delete file
    filepath = os.path.join(settings.UPLOAD_DIR, image.filename)
    if os.path.exists(filepath):
        os.remove(filepath)

    db.delete(image)
    db.commit()
