# Jot — Feature Specification

## Overview
Jot is a notes and lists app — like the iPhone Notes app but self-hosted. You can jot down freeform text, make checklists, or mix both in a single note. Integrates with existing homelab services (DoIt, Linkwarden, Google Calendar).

## Core Concepts

### Notes (formerly "Lists")
Each note is a container that can hold a mix of:
- **Text items**: Freeform text blocks (like paragraphs in Notes app)
- **Checkbox items**: Checkable list items with check/uncheck animation

A note can be purely text, purely a checklist, or a mix of both — just like iPhone Notes.

### Folders
Hierarchical folder tree for organizing notes. Self-referencing parent_id for nesting. Deleting a folder moves its notes to "unfiled".

## Core Features

### Notes & Folders
- **Folders**: Sidebar folder tree for organizing notes.
- **Notes**: Named notes with optional description, icon, color. Can be pinned. Sortable within folders.
- **Note cards**: Show note name, icon, color, item count, preview snippet.

### Note Items
- **Text items** (`item_type: "text"`): Freeform text blocks. No checkbox.
- **Checkbox items** (`item_type: "checkbox"`): Checkable items with check animation.
- **Check animation**: When a checkbox item is checked, it fades out (300ms opacity), then slides up after 500ms. Checked items hidden by default.
- **"Show completed (N)" toggle**: At bottom of note, shows count of checked items.
- **Inline editing**: Click on item content to edit in-place.
- **Add item input**: Always-visible input at bottom. Enter to add. Toggle between text/checkbox mode.
- **Reorder**: Drag to reorder items. Support indent levels for hierarchy.

### Rich Content (on items)
- **URL paste detection**: When URL pasted, detect and prompt for display name. Rich link card with favicon + title + domain.
- **Image upload**: Attach images to items. Inline thumbnails (48px), click to expand.

### Linkwarden Integration
- **Collection linking** (note-level): Link a Linkwarden collection to a note. Preview card.
- **Link embedding** (item-level): Search Linkwarden links and embed as rich card.

### DoIt Integration
- **"Add as DoIt task"**: Create a task in DoIt from any checkbox item. Status badge on item.

### Google Calendar Integration
- **"Add as calendar event"**: Create event from any item. Date badge on item.

### Settings
- Linkwarden: API URL + key
- DoIt: API URL + key
- Google Calendar: OAuth connect/disconnect

### Navigation
- **Sidebar**: Folder tree. "All Notes" and "Pinned" quick filters.
- **Top bar**: App name/logo, settings gear.

## UI/UX
- Dark theme by default (shadcn)
- Clean, minimal (Apple Notes-inspired)
- Fast interactions — optimistic updates
- Mobile-responsive

## Domain & Access
- URL: `http://notes.homelab`
- Port: 3008 (frontend), backend internal only
- Auth: email/password, JWT stored as `jot_token`
