import httpx

from app.config import settings

_URL = settings.LINKWARDEN_API_URL
_KEY = settings.LINKWARDEN_API_KEY
_HEADERS = {"Authorization": f"Bearer {_KEY}"} if _KEY else {}


def is_configured() -> bool:
    return bool(_URL and _KEY)


async def get_collections() -> list[dict]:
    """Fetch all collections from Linkwarden."""
    if not is_configured():
        return []
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{_URL}/api/v1/collections", headers=_HEADERS, timeout=10)
        res.raise_for_status()
        data = res.json()
        return data.get("response", data) if isinstance(data, dict) else data


async def get_collection_links(collection_id: int) -> list[dict]:
    """Fetch links for a specific collection."""
    if not is_configured():
        return []
    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"{_URL}/api/v1/links",
            params={"collectionId": collection_id},
            headers=_HEADERS,
            timeout=10,
        )
        res.raise_for_status()
        data = res.json()
        return data.get("response", data) if isinstance(data, dict) else data


async def search_links(query: str) -> list[dict]:
    """Search Linkwarden links."""
    if not is_configured():
        return []
    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"{_URL}/api/v1/links",
            params={"searchQueryString": query},
            headers=_HEADERS,
            timeout=10,
        )
        res.raise_for_status()
        data = res.json()
        return data.get("response", data) if isinstance(data, dict) else data
