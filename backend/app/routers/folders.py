from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.models.folder import Folder
from app.models.jot_list import JotList
from app.models.user import User
from app.schemas.folder import FolderCreate, FolderResponse, FolderTreeResponse, FolderUpdate

router = APIRouter(prefix="/folders", tags=["folders"])


def _build_tree(folders: list[Folder], parent_id: str | None = None) -> list[dict]:
    """Build a nested tree from flat folder list."""
    tree = []
    for f in folders:
        if f.parent_id == parent_id:
            children = _build_tree(folders, f.id)
            item = FolderTreeResponse.model_validate(f).model_dump()
            item["children"] = children
            tree.append(item)
    tree.sort(key=lambda x: x["sort_order"])
    return tree


@router.get("/", response_model=list[FolderTreeResponse])
def get_folders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all folders as a nested tree."""
    folders = db.query(Folder).filter(Folder.user_id == current_user.id).all()
    return _build_tree(folders)


@router.post("/", response_model=FolderResponse, status_code=status.HTTP_201_CREATED)
def create_folder(
    body: FolderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new folder."""
    if body.parent_id:
        parent = db.query(Folder).filter(
            Folder.id == body.parent_id, Folder.user_id == current_user.id
        ).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent folder not found")

    folder = Folder(
        user_id=current_user.id,
        name=body.name.strip(),
        parent_id=body.parent_id,
        sort_order=body.sort_order,
    )
    db.add(folder)
    db.commit()
    db.refresh(folder)
    return folder


@router.put("/{folder_id}", response_model=FolderResponse)
def update_folder(
    folder_id: str,
    body: FolderUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a folder."""
    folder = db.query(Folder).filter(
        Folder.id == folder_id, Folder.user_id == current_user.id
    ).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    if body.name is not None:
        folder.name = body.name.strip()
    if body.parent_id is not None:
        folder.parent_id = body.parent_id
    if body.sort_order is not None:
        folder.sort_order = body.sort_order

    db.commit()
    db.refresh(folder)
    return folder


@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_folder(
    folder_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a folder. Moves its lists to unfiled (folder_id = null)."""
    folder = db.query(Folder).filter(
        Folder.id == folder_id, Folder.user_id == current_user.id
    ).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    # Move lists to unfiled
    db.query(JotList).filter(JotList.folder_id == folder_id).update(
        {"folder_id": None}, synchronize_session="fetch"
    )

    db.delete(folder)
    db.commit()
