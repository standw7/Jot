import httpx

from app.config import settings


async def get_collections(api_url: str | None = None, api_key: str | None = None) -> list[dict]:
    """Fetch all collections from Linkwarden."""
    url = api_url or settings.LINKWARDEN_API_URL
    key = api_key or settings.LINKWARDEN_API_KEY
    if not url or not key:
        return []

    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"{url}/api/v1/collections",
            headers={"Authorization": f"Bearer {key}"},
            timeout=10,
        )
        res.raise_for_status()
        data = res.json()
        return data.get("response", data) if isinstance(data, dict) else data


async def get_collection_links(
    collection_id: int,
    api_url: str | None = None,
    api_key: str | None = None,
) -> list[dict]:
    """Fetch links for a specific collection."""
    url = api_url or settings.LINKWARDEN_API_URL
    key = api_key or settings.LINKWARDEN_API_KEY
    if not url or not key:
        return []

    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"{url}/api/v1/links",
            params={"collectionId": collection_id},
            headers={"Authorization": f"Bearer {key}"},
            timeout=10,
        )
        res.raise_for_status()
        data = res.json()
        return data.get("response", data) if isinstance(data, dict) else data


async def search_links(
    query: str,
    api_url: str | None = None,
    api_key: str | None = None,
) -> list[dict]:
    """Search Linkwarden links."""
    url = api_url or settings.LINKWARDEN_API_URL
    key = api_key or settings.LINKWARDEN_API_KEY
    if not url or not key:
        return []

    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"{url}/api/v1/links",
            params={"searchQueryString": query},
            headers={"Authorization": f"Bearer {key}"},
            timeout=10,
        )
        res.raise_for_status()
        data = res.json()
        return data.get("response", data) if isinstance(data, dict) else data
