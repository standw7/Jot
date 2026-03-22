import httpx

from app.services.google_auth import refresh_access_token

CALENDAR_API = "https://www.googleapis.com/calendar/v3"


async def _get_headers(refresh_token: str) -> dict:
    access_token = await refresh_access_token(refresh_token)
    return {"Authorization": f"Bearer {access_token}"}


async def list_calendars(refresh_token: str) -> list[dict]:
    """List user's calendars."""
    headers = await _get_headers(refresh_token)
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{CALENDAR_API}/users/me/calendarList", headers=headers, timeout=10)
        res.raise_for_status()
        return res.json().get("items", [])


async def create_event(
    refresh_token: str,
    calendar_id: str,
    summary: str,
    date: str,
    time: str | None = None,
    description: str | None = None,
) -> dict:
    """Create a calendar event."""
    headers = await _get_headers(refresh_token)

    if time:
        event = {
            "summary": summary,
            "description": description,
            "start": {"dateTime": f"{date}T{time}:00", "timeZone": "America/Denver"},
            "end": {"dateTime": f"{date}T{time}:00", "timeZone": "America/Denver"},
        }
    else:
        event = {
            "summary": summary,
            "description": description,
            "start": {"date": date},
            "end": {"date": date},
        }

    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{CALENDAR_API}/calendars/{calendar_id}/events",
            json=event,
            headers=headers,
            timeout=10,
        )
        res.raise_for_status()
        return res.json()


async def delete_event(refresh_token: str, calendar_id: str, event_id: str) -> None:
    """Delete a calendar event."""
    headers = await _get_headers(refresh_token)
    async with httpx.AsyncClient() as client:
        res = await client.delete(
            f"{CALENDAR_API}/calendars/{calendar_id}/events/{event_id}",
            headers=headers,
            timeout=10,
        )
        res.raise_for_status()
