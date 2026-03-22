import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class CalendarEventLink(Base):
    __tablename__ = "calendar_event_links"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    item_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("list_items.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    google_event_id: Mapped[str] = mapped_column(String(255), nullable=False)
    event_summary: Mapped[str] = mapped_column(String(500), nullable=False)
    event_date: Mapped[str] = mapped_column(String(10), nullable=False)
    event_time: Mapped[str | None] = mapped_column(String(5))
    calendar_id: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    item: Mapped["ListItem"] = relationship(back_populates="calendar_event_links")  # noqa: F821
