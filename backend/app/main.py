import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy import inspect, text

from app.config import settings
from app.database import Base, engine
import app.models  # noqa: F401 — register all models with Base.metadata
from app.routers import auth, calendar, doit, folders, images, items, linkwarden, lists
from app.routers import settings as settings_router


def _run_migrations():
    """Add missing columns to existing tables."""
    inspector = inspect(engine)
    with engine.begin() as conn:
        if "list_items" in inspector.get_table_names():
            columns = {c["name"] for c in inspector.get_columns("list_items")}
            if "item_type" not in columns:
                conn.execute(text(
                    "ALTER TABLE list_items ADD COLUMN item_type VARCHAR(20) DEFAULT 'text' NOT NULL"
                ))


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables on startup (no-op if they already exist)
    Base.metadata.create_all(bind=engine)
    _run_migrations()
    # Ensure upload directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    yield


app = FastAPI(
    title="Jot API",
    description="Backend API for Jot — a notes and lists app.",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
origins = [
    settings.FRONTEND_URL,
    "http://localhost:3000",
    "http://localhost:3008",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(folders.router)
app.include_router(lists.router)
app.include_router(items.router)
app.include_router(images.router)
app.include_router(linkwarden.router)
app.include_router(doit.router)
app.include_router(calendar.router)
app.include_router(settings_router.router)


@app.get("/health")
def health_check() -> dict[str, str]:
    """Simple health check endpoint."""
    return {"status": "ok"}
