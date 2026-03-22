from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.models.doit_task_link import DoitTaskLink
from app.models.list_item import ListItem
from app.models.user import User
from app.services import doit as doit_service

router = APIRouter(prefix="/doit", tags=["doit"])


class CreateTaskRequest(BaseModel):
    item_id: str
    title: str
    description: str | None = None


@router.post("/create-task", status_code=status.HTTP_201_CREATED)
async def create_task(
    body: CreateTaskRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a task in DoIt and link it to a list item."""
    item = db.query(ListItem).filter(ListItem.id == body.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    try:
        task = await doit_service.create_task(body.title, body.description)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"DoIt error: {e}")

    link = DoitTaskLink(
        item_id=body.item_id,
        user_id=current_user.id,
        doit_task_id=task["id"],
        doit_task_name=task.get("title", body.title),
        doit_task_status=task.get("status", "pending"),
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    return link


@router.get("/task-status/{task_id}")
async def get_task_status(
    task_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get the status of a DoIt task."""
    try:
        return await doit_service.get_task(task_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"DoIt error: {e}")


@router.get("/projects")
async def get_projects(current_user: User = Depends(get_current_user)):
    """Get DoIt projects."""
    try:
        return await doit_service.get_projects()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"DoIt error: {e}")


@router.delete("/link/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task_link(
    link_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a DoIt task link from an item."""
    link = db.query(DoitTaskLink).filter(
        DoitTaskLink.id == link_id, DoitTaskLink.user_id == current_user.id
    ).first()
    if not link:
        raise HTTPException(status_code=404, detail="Task link not found")
    db.delete(link)
    db.commit()
