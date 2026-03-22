from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.models.jot_list import JotList
from app.models.linkwarden_collection import LinkwardenCollection
from app.models.linkwarden_link import LinkwardenLink
from app.models.list_item import ListItem
from app.models.user import User
from app.services import linkwarden as lw_service

router = APIRouter(prefix="/linkwarden", tags=["linkwarden"])


@router.get("/collections")
async def get_collections(current_user: User = Depends(get_current_user)):
    """Fetch available Linkwarden collections."""
    try:
        return await lw_service.get_collections()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Linkwarden error: {e}")


@router.get("/collections/{collection_id}/links")
async def get_collection_links(
    collection_id: int,
    current_user: User = Depends(get_current_user),
):
    """Fetch links for a Linkwarden collection."""
    try:
        return await lw_service.get_collection_links(collection_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Linkwarden error: {e}")


@router.get("/search")
async def search_links(
    q: str,
    current_user: User = Depends(get_current_user),
):
    """Search Linkwarden links."""
    try:
        return await lw_service.search_links(q)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Linkwarden error: {e}")


class LinkCollectionRequest(BaseModel):
    list_id: str
    collection_id: int
    collection_name: str


@router.post("/link-collection", status_code=status.HTTP_201_CREATED)
def link_collection(
    body: LinkCollectionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Link a Linkwarden collection to a list."""
    jot_list = db.query(JotList).filter(
        JotList.id == body.list_id, JotList.user_id == current_user.id
    ).first()
    if not jot_list:
        raise HTTPException(status_code=404, detail="List not found")

    lc = LinkwardenCollection(
        list_id=body.list_id,
        user_id=current_user.id,
        collection_id=body.collection_id,
        collection_name=body.collection_name,
    )
    db.add(lc)
    db.commit()
    db.refresh(lc)
    return lc


@router.delete("/link-collection/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
def unlink_collection(
    link_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a collection link."""
    lc = db.query(LinkwardenCollection).filter(
        LinkwardenCollection.id == link_id, LinkwardenCollection.user_id == current_user.id
    ).first()
    if not lc:
        raise HTTPException(status_code=404, detail="Collection link not found")
    db.delete(lc)
    db.commit()


class EmbedLinkRequest(BaseModel):
    item_id: str
    linkwarden_link_id: int
    url: str
    title: str | None = None
    thumbnail_url: str | None = None


@router.post("/embed-link", status_code=status.HTTP_201_CREATED)
def embed_link(
    body: EmbedLinkRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Embed a Linkwarden link on a list item."""
    item = db.query(ListItem).filter(ListItem.id == body.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    ll = LinkwardenLink(
        item_id=body.item_id,
        user_id=current_user.id,
        linkwarden_link_id=body.linkwarden_link_id,
        url=body.url,
        title=body.title,
        thumbnail_url=body.thumbnail_url,
    )
    db.add(ll)
    db.commit()
    db.refresh(ll)
    return ll


@router.delete("/embed-link/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_embedded_link(
    link_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove an embedded Linkwarden link."""
    ll = db.query(LinkwardenLink).filter(
        LinkwardenLink.id == link_id, LinkwardenLink.user_id == current_user.id
    ).first()
    if not ll:
        raise HTTPException(status_code=404, detail="Link not found")
    db.delete(ll)
    db.commit()
