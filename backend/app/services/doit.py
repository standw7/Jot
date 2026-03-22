import httpx

from app.config import settings

_URL = settings.DOIT_API_URL
_KEY = settings.DOIT_INTERNAL_API_KEY
_HEADERS = {"Authorization": f"Bearer {_KEY}"} if _KEY else {}


def is_configured() -> bool:
    return bool(_URL and _KEY)


async def create_task(title: str, description: str | None = None) -> dict:
    """Create a task in DoIt."""
    if not is_configured():
        raise ValueError("DoIt integration not configured")
    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{_URL}/tasks",
            json={"title": title, "description": description},
            headers=_HEADERS,
            timeout=10,
        )
        res.raise_for_status()
        return res.json()


async def get_task(task_id: str) -> dict:
    """Get a task from DoIt."""
    if not is_configured():
        raise ValueError("DoIt integration not configured")
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{_URL}/tasks/{task_id}", headers=_HEADERS, timeout=10)
        res.raise_for_status()
        return res.json()


async def get_projects() -> list[dict]:
    """Get projects from DoIt."""
    if not is_configured():
        return []
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{_URL}/projects", headers=_HEADERS, timeout=10)
        res.raise_for_status()
        return res.json()
