import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ListItem(Base):
    __tablename__ = "list_items"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    list_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("lists.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    item_type: Mapped[str] = mapped_column(String(20), default="text")  # "text" or "checkbox"
    is_checked: Mapped[bool] = mapped_column(Boolean, default=False)
    checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    indent_level: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    jot_list: Mapped["JotList"] = relationship(back_populates="items")  # noqa: F821
    links: Mapped[list["ItemLink"]] = relationship(back_populates="item", cascade="all, delete-orphan")  # noqa: F821
    images: Mapped[list["ItemImage"]] = relationship(back_populates="item", cascade="all, delete-orphan")  # noqa: F821
    linkwarden_links: Mapped[list["LinkwardenLink"]] = relationship(back_populates="item", cascade="all, delete-orphan")  # noqa: F821
    doit_task_links: Mapped[list["DoitTaskLink"]] = relationship(back_populates="item", cascade="all, delete-orphan")  # noqa: F821
    calendar_event_links: Mapped[list["CalendarEventLink"]] = relationship(back_populates="item", cascade="all, delete-orphan")  # noqa: F821
