# Codebase Guide

## Project Structure

```
Jot/
├── backend/                     # FastAPI backend
│   ├── app/
│   │   ├── main.py              # App entry, CORS, router registration, migrations
│   │   ├── config.py            # Settings from env vars (pydantic-settings)
│   │   ├── database.py          # SQLAlchemy engine + session
│   │   ├── deps.py              # JWT auth + get_db dependency
│   │   ├── models/              # SQLAlchemy ORM models
│   │   │   ├── user.py          # User model
│   │   │   ├── user_settings.py # Per-user integration settings
│   │   │   ├── folder.py        # Hierarchical folders
│   │   │   ├── jot_list.py      # Notes/lists
│   │   │   ├── list_item.py     # Items (text or checkbox)
│   │   │   ├── item_link.py     # URL links on items
│   │   │   ├── item_image.py    # Image attachments on items
│   │   │   ├── linkwarden_*.py  # Linkwarden integration models
│   │   │   ├── doit_task_link.py # DoIt integration model
│   │   │   └── calendar_event_link.py # Calendar integration model
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── routers/             # API route handlers
│   │   │   ├── auth.py          # signup, login, /me
│   │   │   ├── folders.py       # CRUD + tree building
│   │   │   ├── lists.py         # CRUD with item counts
│   │   │   ├── items.py         # CRUD + check toggle + links + images
│   │   │   ├── images.py        # Static image serving
│   │   │   ├── linkwarden.py    # Linkwarden proxy endpoints
│   │   │   ├── doit.py          # DoIt proxy endpoints
│   │   │   ├── calendar.py      # Google Calendar + OAuth
│   │   │   └── settings.py      # User settings CRUD
│   │   └── services/            # External API clients
│   │       ├── linkwarden.py    # Linkwarden API calls
│   │       ├── doit.py          # DoIt API calls
│   │       ├── google_auth.py   # Google OAuth flow
│   │       └── google_calendar.py # Google Calendar API
│   ├── Dockerfile
│   └── requirements.txt
├── src/                         # Next.js frontend
│   ├── app/
│   │   ├── layout.tsx           # Root layout (AuthProvider, Toaster)
│   │   ├── page.tsx             # Redirect to /lists
│   │   ├── login/page.tsx       # Login/signup form
│   │   ├── (app)/               # Auth-protected routes
│   │   │   ├── layout.tsx       # Auth guard (redirects to /login)
│   │   │   ├── lists/page.tsx   # Notes grid + sidebar
│   │   │   ├── lists/[id]/page.tsx # Note detail (items, editing)
│   │   │   ├── settings/page.tsx # Integration settings
│   │   │   └── help/page.tsx    # Usage guide
│   │   └── api/backend/[...path]/route.ts # Backend proxy
│   ├── components/
│   │   ├── ui/                  # shadcn components
│   │   ├── nav/sidebar.tsx      # Sidebar with folder tree
│   │   └── lists/
│   │       ├── note-card.tsx    # Note card for grid view
│   │       └── note-item.tsx    # Individual item row
│   └── lib/
│       ├── api.ts               # Typed fetch wrapper
│       ├── auth-context.tsx     # Auth state management
│       ├── types.ts             # TypeScript interfaces
│       └── utils.ts             # cn() utility
├── Dockerfile                   # Multi-stage Next.js build
├── package.json
├── next.config.ts               # standalone output
├── components.json              # shadcn config
└── instructions.md              # Feature specification
```

## Key Files

| File | Purpose |
|------|---------|
| `backend/app/main.py` | App entry, startup migrations, router registration |
| `backend/app/deps.py` | `get_current_user` (JWT + API key auth) |
| `backend/app/routers/items.py` | Most complex router — CRUD + check + links + images |
| `src/app/(app)/lists/[id]/page.tsx` | Note detail page — most complex frontend component |
| `src/lib/api.ts` | All API calls, typed |
| `src/lib/auth-context.tsx` | Auth state, login/logout |

## Architecture & Data Flow

1. User authenticates → JWT stored in localStorage as `jot_token`
2. Frontend API calls go to `/api/backend/*` → Next.js proxy → FastAPI backend
3. Backend uses SQLAlchemy with SQLite (persisted in Docker volume `jot_db`)
4. Image uploads saved to Docker volume `jot_uploads`, served via `/images/{filename}`
5. Integration calls (Linkwarden, DoIt, Calendar) proxied through backend to avoid CORS

## "If You Need to Change X, Look at Y"

- **Auth flow** → `backend/app/routers/auth.py` + `src/lib/auth-context.tsx`
- **Database schema** → `backend/app/models/`
- **API endpoints** → `backend/app/routers/`
- **API types** → `src/lib/types.ts`
- **API client** → `src/lib/api.ts`
- **Note detail UI** → `src/app/(app)/lists/[id]/page.tsx` + `src/components/lists/note-item.tsx`
- **Notes grid** → `src/app/(app)/lists/page.tsx` + `src/components/lists/note-card.tsx`
- **Sidebar** → `src/components/nav/sidebar.tsx`
- **Docker config** → `~/homelab/docker-compose.yml` (jot + jot-backend services)
- **Caddy routing** → `~/homelab/caddy/Caddyfile`
- **Environment vars** → `~/homelab/.env` + `backend/app/config.py`

## Patterns & Conventions

- Backend follows DoIt patterns exactly (same deps.py, auth flow, Docker setup)
- All API paths use no trailing slashes (FastAPI redirects them)
- Items have `item_type` field: `"text"` or `"checkbox"`
- SQLite migrations via `_run_migrations()` in `main.py` (ALTER TABLE for new columns)
- Frontend uses shadcn/ui (new-york style) with Tailwind CSS v4
- Dark mode ready via CSS variables
