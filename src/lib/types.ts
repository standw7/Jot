// ── Core Types ─────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  children?: Folder[];
  lists?: JotList[];
}

export interface FolderInsert {
  name: string;
  parent_id?: string | null;
  sort_order?: number;
}

export interface FolderUpdate {
  name?: string;
  parent_id?: string | null;
  sort_order?: number;
}

export interface JotList {
  id: string;
  user_id: string;
  folder_id: string | null;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  is_pinned: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  last_opened_at: string | null;
  item_count?: number;
  checked_count?: number;
  preview?: string | null;
  linkwarden_collections?: LinkwardenCollection[];
}

export interface JotListInsert {
  name: string;
  folder_id?: string | null;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  is_pinned?: boolean;
  sort_order?: number;
}

export interface JotListUpdate {
  name?: string;
  folder_id?: string | null;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  is_pinned?: boolean;
  sort_order?: number;
}

export interface ListItem {
  id: string;
  list_id: string;
  user_id: string;
  content: string;
  item_type: "text" | "checkbox";
  is_checked: boolean;
  checked_at: string | null;
  sort_order: number;
  indent_level: number;
  created_at: string;
  updated_at: string;
  links?: ItemLink[];
  images?: ItemImage[];
  linkwarden_links?: LinkwardenLinkEmbed[];
  doit_task_links?: DoitTaskLinkEmbed[];
  calendar_event_links?: CalendarEventLinkEmbed[];
}

export interface ListItemInsert {
  content: string;
  item_type?: "text" | "checkbox";
  sort_order?: number;
  indent_level?: number;
}

export interface ListItemUpdate {
  content?: string;
  item_type?: "text" | "checkbox";
  is_checked?: boolean;
  sort_order?: number;
  indent_level?: number;
}

// ── Rich Content ───────────────────────────────────────────

export interface ItemLink {
  id: string;
  item_id: string;
  url: string;
  title: string | null;
  favicon_url: string | null;
  created_at: string;
}

export interface ItemImage {
  id: string;
  item_id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

// ── Integration Embeds ─────────────────────────────────────

export interface LinkwardenCollection {
  id: string;
  list_id: string;
  collection_id: number;
  collection_name: string;
  link_count: number;
  created_at: string;
}

export interface LinkwardenLinkEmbed {
  id: string;
  item_id: string;
  linkwarden_link_id: number;
  url: string;
  title: string | null;
  thumbnail_url: string | null;
  created_at: string;
}

export interface DoitTaskLinkEmbed {
  id: string;
  item_id: string;
  doit_task_id: string;
  doit_task_name: string;
  doit_task_status: string;
  created_at: string;
}

export interface CalendarEventLinkEmbed {
  id: string;
  item_id: string;
  google_event_id: string;
  event_summary: string;
  event_date: string;
  event_time: string | null;
  calendar_id: string | null;
  created_at: string;
}

// ── Settings ───────────────────────────────────────────────

export interface IntegrationStatus {
  name: string;
  connected: boolean;
}

export interface UserSettings {
  id: string;
  integrations: IntegrationStatus[];
  google_connected: boolean;
  jot_calendar_id: string | null;
}
