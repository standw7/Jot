import type {
  User,
  Folder,
  FolderInsert,
  FolderUpdate,
  JotList,
  JotListInsert,
  JotListUpdate,
  ListItem,
  ListItemInsert,
  ListItemUpdate,
  ItemLink,
  ItemImage,
  UserSettings,
  UserSettingsUpdate,
} from "./types";

const BASE_URL = "/api/backend";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("jot_token");
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  timeoutMs: number = 55000,
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw { error: "Timeout", detail: "Request timed out. Please try again.", statusCode: 0 };
    }
    throw { error: "Network error", detail: "Could not reach the server. Please try again.", statusCode: 0 };
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 204) {
    return undefined as unknown as T;
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw {
      error: body.error ?? "Request failed",
      detail: body.detail ?? res.statusText,
      statusCode: res.status,
    };
  }

  return res.json();
}

// ── Auth ─────────────────────────────────────────────────────

export async function signup(email: string, password: string): Promise<{ access_token: string; token_type: string }> {
  return request("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function login(email: string, password: string): Promise<{ access_token: string; token_type: string }> {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function getCurrentUser(): Promise<User> {
  return request("/auth/me");
}

// ── Folders ──────────────────────────────────────────────────

export async function getFolders(): Promise<Folder[]> {
  return request("/folders");
}

export async function createFolder(folder: FolderInsert): Promise<Folder> {
  return request("/folders", {
    method: "POST",
    body: JSON.stringify(folder),
  });
}

export async function updateFolder(id: string, updates: FolderUpdate): Promise<Folder> {
  return request(`/folders/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function deleteFolder(id: string): Promise<void> {
  return request(`/folders/${id}`, { method: "DELETE" });
}

// ── Lists ────────────────────────────────────────────────────

export async function getLists(params?: {
  folder_id?: string;
  pinned?: boolean;
}): Promise<JotList[]> {
  const qs = new URLSearchParams();
  if (params?.folder_id) qs.set("folder_id", params.folder_id);
  if (params?.pinned !== undefined) qs.set("pinned", String(params.pinned));
  const query = qs.toString();
  return request(`/lists${query ? `?${query}` : ""}`);
}

export async function createList(list: JotListInsert): Promise<JotList> {
  return request("/lists", {
    method: "POST",
    body: JSON.stringify(list),
  });
}

export async function getList(id: string): Promise<JotList & { items: ListItem[] }> {
  return request(`/lists/${id}`);
}

export async function updateList(id: string, updates: JotListUpdate): Promise<JotList> {
  return request(`/lists/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function deleteList(id: string): Promise<void> {
  return request(`/lists/${id}`, { method: "DELETE" });
}

// ── Items ────────────────────────────────────────────────────

export async function getItems(listId: string, showChecked?: boolean): Promise<ListItem[]> {
  const qs = showChecked !== undefined ? `?show_checked=${showChecked}` : "";
  return request(`/lists/${listId}/items${qs}`);
}

export async function createItem(listId: string, item: ListItemInsert): Promise<ListItem> {
  return request(`/lists/${listId}/items`, {
    method: "POST",
    body: JSON.stringify(item),
  });
}

export async function updateItem(listId: string, itemId: string, updates: ListItemUpdate): Promise<ListItem> {
  return request(`/lists/${listId}/items/${itemId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function deleteItem(listId: string, itemId: string): Promise<void> {
  return request(`/lists/${listId}/items/${itemId}`, { method: "DELETE" });
}

export async function toggleItemCheck(listId: string, itemId: string): Promise<ListItem> {
  return request(`/lists/${listId}/items/${itemId}/check`, { method: "POST" });
}

// ── Item Links ───────────────────────────────────────────────

export async function addItemLink(
  listId: string,
  itemId: string,
  link: { url: string; title?: string },
): Promise<ItemLink> {
  return request(`/lists/${listId}/items/${itemId}/links`, {
    method: "POST",
    body: JSON.stringify(link),
  });
}

export async function deleteItemLink(listId: string, itemId: string, linkId: string): Promise<void> {
  return request(`/lists/${listId}/items/${itemId}/links/${linkId}`, { method: "DELETE" });
}

// ── Item Images ──────────────────────────────────────────────

export async function uploadItemImage(
  listId: string,
  itemId: string,
  file: File,
): Promise<ItemImage> {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE_URL}/lists/${listId}/items/${itemId}/images`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw { error: "Upload failed", detail: body.detail ?? res.statusText, statusCode: res.status };
  }

  return res.json();
}

export async function deleteItemImage(listId: string, itemId: string, imageId: string): Promise<void> {
  return request(`/lists/${listId}/items/${itemId}/images/${imageId}`, { method: "DELETE" });
}

// ── Settings ─────────────────────────────────────────────────

export async function getSettings(): Promise<UserSettings> {
  return request("/settings");
}

export async function updateSettings(updates: UserSettingsUpdate): Promise<UserSettings> {
  return request("/settings", {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}
