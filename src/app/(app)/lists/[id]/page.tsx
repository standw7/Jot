"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NoteItem } from "@/components/lists/note-item";
import {
  ArrowLeft,
  Type,
  CheckSquare,
  MoreHorizontal,
  Trash2,
  Pin,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as api from "@/lib/api";
import { toast } from "sonner";
import type { JotList, ListItem } from "@/lib/types";

export default function ListDetailPage() {
  const params = useParams();
  const router = useRouter();
  const listId = params.id as string;

  const [note, setNote] = useState<JotList | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [showChecked, setShowChecked] = useState(false);
  const [checkedCount, setCheckedCount] = useState(0);
  const [newContent, setNewContent] = useState("");
  const [newItemType, setNewItemType] = useState<"text" | "checkbox">("text");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchNote = useCallback(async () => {
    try {
      const data = await api.getList(listId);
      setNote(data);
      setEditTitle(data.name);
      setCheckedCount(data.checked_count ?? 0);
    } catch {
      toast.error("Note not found");
      router.push("/lists");
    }
  }, [listId, router]);

  const fetchItems = useCallback(async () => {
    try {
      const data = await api.getItems(listId, showChecked);
      setItems(data);
    } catch {
      toast.error("Failed to load items");
    } finally {
      setLoading(false);
    }
  }, [listId, showChecked]);

  useEffect(() => {
    fetchNote();
    fetchItems();
  }, [fetchNote, fetchItems]);

  async function handleAddItem() {
    if (!newContent.trim()) return;
    try {
      const item = await api.createItem(listId, {
        content: newContent.trim(),
        item_type: newItemType,
      });
      setItems((prev) => [...prev, item]);
      setNewContent("");
      inputRef.current?.focus();
    } catch {
      toast.error("Failed to add item");
    }
  }

  async function handleUpdateItem(itemId: string, updates: { content?: string; item_type?: "text" | "checkbox"; is_checked?: boolean }) {
    try {
      const updated = await api.updateItem(listId, itemId, updates);
      setItems((prev) => prev.map((i) => (i.id === itemId ? updated : i)));
    } catch {
      toast.error("Failed to update item");
    }
  }

  async function handleDeleteLink(itemId: string, linkId: string) {
    try {
      await api.deleteItemLink(listId, itemId, linkId);
      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? { ...i, links: (i.links ?? []).filter((l) => l.id !== linkId) }
            : i
        )
      );
    } catch {
      toast.error("Failed to delete link");
    }
  }

  async function handleDeleteImage(itemId: string, imageId: string) {
    try {
      await api.deleteItemImage(listId, itemId, imageId);
      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? { ...i, images: (i.images ?? []).filter((img) => img.id !== imageId) }
            : i
        )
      );
    } catch {
      toast.error("Failed to delete image");
    }
  }

  async function handleDeleteItem(itemId: string) {
    try {
      await api.deleteItem(listId, itemId);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch {
      toast.error("Failed to delete item");
    }
  }

  async function handleToggleCheck(itemId: string) {
    try {
      const updated = await api.toggleItemCheck(listId, itemId);
      if (updated.is_checked && !showChecked) {
        // Animate out then remove
        setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, is_checked: true } : i)));
        setTimeout(() => {
          setItems((prev) => prev.filter((i) => i.id !== itemId));
          setCheckedCount((c) => c + 1);
        }, 500);
      } else {
        setItems((prev) => prev.map((i) => (i.id === itemId ? updated : i)));
        if (!updated.is_checked) {
          setCheckedCount((c) => Math.max(0, c - 1));
        }
      }
    } catch {
      toast.error("Failed to update item");
    }
  }

  async function handleUpdateTitle() {
    if (!editTitle.trim() || editTitle.trim() === note?.name) {
      setIsEditingTitle(false);
      return;
    }
    try {
      await api.updateList(listId, { name: editTitle.trim() });
      setNote((prev) => prev ? { ...prev, name: editTitle.trim() } : prev);
      setIsEditingTitle(false);
    } catch {
      toast.error("Failed to update title");
    }
  }

  async function handleTogglePin() {
    if (!note) return;
    try {
      await api.updateList(listId, { is_pinned: !note.is_pinned });
      setNote((prev) => prev ? { ...prev, is_pinned: !prev.is_pinned } : prev);
    } catch {
      toast.error("Failed to update note");
    }
  }

  async function handleDelete() {
    try {
      await api.deleteList(listId);
      router.push("/lists");
    } catch {
      toast.error("Failed to delete note");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!note) return null;

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => router.push("/lists")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1">
          {isEditingTitle ? (
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleUpdateTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleUpdateTitle();
                if (e.key === "Escape") {
                  setEditTitle(note.name);
                  setIsEditingTitle(false);
                }
              }}
              className="text-xl font-bold border-none shadow-none px-0 h-auto"
              autoFocus
            />
          ) : (
            <h1
              onClick={() => setIsEditingTitle(true)}
              className="text-xl font-bold cursor-text hover:text-foreground/80 transition-colors"
            >
              {note.icon && <span className="mr-2">{note.icon}</span>}
              {note.name}
              {note.is_pinned && <Pin className="inline h-4 w-4 ml-2 text-muted-foreground" />}
            </h1>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleTogglePin}>
              <Pin className="h-4 w-4 mr-2" />
              {note.is_pinned ? "Unpin" : "Pin"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Items */}
      <div className="space-y-0.5 mb-4">
        {items.map((item) => (
          <NoteItem
            key={item.id}
            item={item}
            onUpdate={(updates) => handleUpdateItem(item.id, updates)}
            onDelete={() => handleDeleteItem(item.id)}
            onToggleCheck={() => handleToggleCheck(item.id)}
            onDeleteLink={(linkId) => handleDeleteLink(item.id, linkId)}
            onDeleteImage={(imageId) => handleDeleteImage(item.id, imageId)}
          />
        ))}
      </div>

      {/* Show completed toggle */}
      {checkedCount > 0 && (
        <button
          onClick={() => setShowChecked(!showChecked)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 px-2"
        >
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showChecked ? "rotate-180" : ""}`} />
          {showChecked ? "Hide" : "Show"} completed ({checkedCount})
        </button>
      )}

      {/* Add item input */}
      <div className="flex items-center gap-2 p-2 border border-border rounded-lg bg-card">
        {/* Type toggle */}
        <button
          onClick={() => setNewItemType(newItemType === "text" ? "checkbox" : "text")}
          className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground"
          title={`Adding as ${newItemType === "text" ? "text" : "checkbox"} — click to toggle`}
        >
          {newItemType === "text" ? (
            <Type className="h-4 w-4" />
          ) : (
            <CheckSquare className="h-4 w-4" />
          )}
        </button>

        <Input
          ref={inputRef}
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleAddItem();
            }
          }}
          placeholder={newItemType === "text" ? "Jot something down..." : "Add a checklist item..."}
          className="border-none shadow-none"
        />
      </div>
    </div>
  );
}
