# Jot

A self-hosted notes and lists app — like the iPhone Notes app but running on your homelab. Mix freeform text and checklists in a single note. Integrates with DoIt (tasks), Linkwarden (bookmarks), and Google Calendar.

## Quick Start

```bash
cd ~/homelab
docker compose up -d --build jot jot-backend
```

Then visit `http://notes.homelab` and sign up.

## Architecture

- **Frontend**: Next.js 16 (TypeScript, Tailwind CSS, shadcn/ui)
- **Backend**: FastAPI (Python 3.12, SQLAlchemy, SQLite)
- **Auth**: JWT (stored as `jot_token` in localStorage)
- **Deployment**: Docker Compose at `~/homelab`
- **Domain**: `http://notes.homelab` (port 3008)

## Development

### Frontend
```bash
cd ~/homelab/Jot
npm install
npm run dev   # http://localhost:3000
```

### Backend
```bash
cd ~/homelab/Jot/backend
pip install -r requirements.txt
uvicorn app.main:app --reload  # http://localhost:8000
```

### Rebuild (production)
```bash
cd ~/homelab
docker compose up -d --build jot jot-backend
```

## Environment Variables

Set in `~/homelab/.env`:
- `JOT_SECRET_KEY` — JWT signing key
- `JOT_INTERNAL_API_KEY` — service-to-service auth
- `DOIT_GOOGLE_CLIENT_ID` / `DOIT_GOOGLE_CLIENT_SECRET` — shared Google OAuth credentials
- `DOIT_INTERNAL_API_KEY` — for DoIt integration
- `LINKWARDEN_API_KEY` — for Linkwarden integration

## Key Patterns

- Backend proxy: Frontend routes API calls through `/api/backend/[...path]` to avoid CORS
- No trailing slashes in API calls — FastAPI redirects them
- Items have `item_type`: `"text"` (freeform) or `"checkbox"` (checkable)
- Checked items: fade-out animation, hidden by default, "Show completed" toggle
- SQLite migrations run on startup via `_run_migrations()` in `main.py`

## Integration Services

| Service | Internal URL | Purpose |
|---------|-------------|---------|
| DoIt | `http://doit-backend:8000` | Create tasks from items |
| Linkwarden | `http://linkwarden:3000` | Browse/embed bookmarks |
| Google Calendar | OAuth API | Create events from items |
