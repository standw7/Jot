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
│   │   │   ├── user_settings.py # Google Calendar settings (Linkwarden/DoIt removed)
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
│   │   │   ├── items.py         # CRUD + check toggle + reorder
│   │   │   ├── images.py        # Static image serving
│   │   │   ├── linkwarden.py    # Linkwarden proxy endpoints
│   │   │   ├── doit.py          # DoIt proxy endpoints
│   │   │   ├── calendar.py      # Google Calendar + OAuth
│   │   │   └── settings.py      # Read-only integration status
│   │   └── services/            # External API clients (use env vars directly)
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
│   │   │   ├── lists/page.tsx   # Google Drive-style notes + folders grid
│   │   │   ├── lists/[id]/page.tsx # Note detail (single-document editor)
│   │   │   ├── settings/page.tsx # Read-only integration status badges
│   │   │   └── help/page.tsx    # Usage guide + markdown reference
│   │   └── api/backend/[...path]/route.ts # Backend proxy (fixes 204 bug)
│   ├── components/
│   │   ├── ui/                  # shadcn components
│   │   └── lists/
│   │       ├── note-card.tsx    # Note card for grid view
│   │       └── note-item.tsx    # LiveDocument + LiveLine + InlineMarkdown
│   └── lib/
│       ├── api.ts               # Typed fetch wrapper
│       ├── auth-context.tsx     # Auth state management
│       ├── types.ts             # TypeScript interfaces
│       └── utils.ts             # cn() utility
├── Dockerfile                   # Multi-stage Next.js build
├── package.json
├── next.config.ts               # standalone output
├── components.json              # shadcn config
└── instructions.md              # Original feature specification
```

## Key Files

| File | Purpose |
|------|---------|
| `src/app/(app)/lists/[id]/page.tsx` | **Most important file** — single-document editor with Tab/Enter nesting, drag-and-drop, checkbox toggle, save/load |
| `src/components/lists/note-item.tsx` | LiveDocument (preview renderer), LiveLine (per-line Obsidian-style formatting), InlineMarkdown (bold/italic/code/links) |
| `src/app/(app)/lists/page.tsx` | Google Drive-style folders + note cards grid, drag notes into folders |
| `src/app/api/backend/[...path]/route.ts` | Proxy to FastAPI — handles 204 No Content correctly |
| `src/lib/api.ts` | All API calls, typed |
| `backend/app/routers/items.py` | Item CRUD + check toggle + reorder |
| `backend/app/main.py` | App entry, startup migrations |

## Architecture & Data Flow

### Single-Document Model (Frontend)

The note detail page treats the entire note as a **single text string**. This enables standard text editing (backspace across lines, Ctrl+A, etc.).

1. **Load**: Fetch items from backend → convert to document string (text items keep content, checkbox items become `- [ ] content` / `- [x] content`)
2. **Edit**: Single `<textarea>` — all standard text editing works natively
3. **Preview**: `LiveDocument` component renders Obsidian-style (dimmed syntax, visual styling, interactive checkboxes)
4. **Save**: On blur, the entire document is saved as a single text item. Multi-item notes auto-migrate on first save.

### Checkbox Syntax

Checkboxes use Obsidian-style markdown in the text:
- `- [ ] unchecked item`
- `- [x] checked item`
- `  - [ ] nested item` (2 spaces per indent level)

Typing `[]` at the start of a line auto-converts to `- [ ] `.

### Key Behaviors

- **Tab**: Indent checkbox (nest under previous)
- **Shift+Tab**: Outdent checkbox
- **Enter on checkbox with content**: New checkbox at same indent
- **Enter on empty nested checkbox**: Outdent one level
- **Enter on empty root checkbox**: Exit checkbox mode
- **Drag bottom half of checkbox**: Nest under target (with children)
- **Drag top of any line**: Reorder (insert above)
- **Click checkbox**: Toggle checked state
- **Delete checkbox**: Removes line + nested children
- **`- text`**: Renders as bullet point (•)

### Backend

1. User authenticates → JWT stored in localStorage as `jot_token`
2. Frontend API calls go to `/api/backend/*` → Next.js proxy → FastAPI backend
3. Backend uses SQLAlchemy with SQLite (persisted in Docker volume `jot_db`)
4. Integration calls (Linkwarden, DoIt, Calendar) use env vars directly (no per-user config)

### Notes Grid (Google Drive-style)

- Folders appear as clickable cards at top of page
- Click folder to navigate in, back arrow to go up
- Drag and drop notes onto folder cards to move them
- "Drop here to move to parent" zone when inside a folder
- No sidebar — everything is in the main content area

## "If You Need to Change X, Look at Y"

- **Note editing UX** → `src/app/(app)/lists/[id]/page.tsx` (all editor logic)
- **Markdown rendering** → `src/components/lists/note-item.tsx` (LiveDocument, LiveLine, InlineMarkdown)
- **Checkbox behavior** → `handleDocKeyDown` in page.tsx (Tab/Enter/Escape)
- **Drag-and-drop** → `handleReorderLine` + `handleNestLine` in page.tsx, drag handlers in LiveLine
- **Notes grid / folders** → `src/app/(app)/lists/page.tsx`
- **Note card preview** → `src/components/lists/note-card.tsx`
- **API proxy** → `src/app/api/backend/[...path]/route.ts` (204 fix, no body on DELETE)
- **Auth flow** → `backend/app/routers/auth.py` + `src/lib/auth-context.tsx`
- **Database schema** → `backend/app/models/`
- **API endpoints** → `backend/app/routers/`
- **API types** → `src/lib/types.ts`
- **API client** → `src/lib/api.ts`
- **Docker config** → `~/homelab/docker-compose.yml` (jot + jot-backend services)
- **Caddy routing** → `~/homelab/caddy/Caddyfile`
- **Environment vars** → `~/homelab/.env` + `backend/app/config.py`

## Patterns & Conventions

- **Single document model**: Frontend treats note content as one string, not separate item components
- Backend stores content as a single text item (migrated from multi-item on first save)
- All API paths use no trailing slashes (FastAPI redirects with 308)
- HTTP 204 responses handled specially in proxy (no body allowed)
- SQLite migrations via `_run_migrations()` in `main.py`
- Frontend uses shadcn/ui (new-york style) with Tailwind CSS v4
- Integration services use module-level env var constants, not per-user config
- Obsidian-style rendering: syntax chars visible but dimmed, visual styling applied
