import httpx

from app.config import settings


async def create_task(
    title: str,
    description: str | None = None,
    api_url: str | None = None,
    api_key: str | None = None,
) -> dict:
    """Create a task in DoIt."""
    url = api_url or settings.DOIT_API_URL
    key = api_key or settings.DOIT_INTERNAL_API_KEY
    if not url or not key:
        raise ValueError("DoIt integration not configured")

    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{url}/tasks",
            json={"title": title, "description": description},
            headers={"Authorization": f"Bearer {key}"},
            timeout=10,
        )
        res.raise_for_status()
        return res.json()


async def get_task(
    task_id: str,
    api_url: str | None = None,
    api_key: str | None = None,
) -> dict:
    """Get a task from DoIt."""
    url = api_url or settings.DOIT_API_URL
    key = api_key or settings.DOIT_INTERNAL_API_KEY
    if not url or not key:
        raise ValueError("DoIt integration not configured")

    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"{url}/tasks/{task_id}",
            headers={"Authorization": f"Bearer {key}"},
            timeout=10,
        )
        res.raise_for_status()
        return res.json()


async def get_projects(
    api_url: str | None = None,
    api_key: str | None = None,
) -> list[dict]:
    """Get projects from DoIt."""
    url = api_url or settings.DOIT_API_URL
    key = api_key or settings.DOIT_INTERNAL_API_KEY
    if not url or not key:
        return []

    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"{url}/projects",
            headers={"Authorization": f"Bearer {key}"},
            timeout=10,
        )
        res.raise_for_status()
        return res.json()
