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
  const [newItemType, setNewItemType] = useState<"text" | "checkbox">("text");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const newLineRef = useRef<HTMLTextAreaElement>(null);

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

  async function handleAddItem(content: string) {
    if (!content.trim()) return;
    try {
      const item = await api.createItem(listId, {
        content: content.trim(),
        item_type: newItemType,
      });
      setItems((prev) => [...prev, item]);
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

  // Click on the empty area below items to focus the new line
  function handlePageClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (target === e.currentTarget) {
      newLineRef.current?.focus();
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
    <div className="max-w-2xl mx-auto p-6 min-h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => router.push("/lists")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1" />

        {/* Type toggle */}
        <button
          onClick={() => setNewItemType(newItemType === "text" ? "checkbox" : "text")}
          className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground"
          title={`New lines: ${newItemType === "text" ? "text" : "checkbox"}`}
        >
          {newItemType === "text" ? (
            <Type className="h-4 w-4" />
          ) : (
            <CheckSquare className="h-4 w-4" />
          )}
        </button>

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

      {/* Title */}
      <div className="mb-4 px-2">
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
            className="text-2xl font-bold border-none shadow-none px-0 h-auto"
            autoFocus
          />
        ) : (
          <h1
            onClick={() => setIsEditingTitle(true)}
            className="text-2xl font-bold cursor-text hover:text-foreground/80 transition-colors"
          >
            {note.icon && <span className="mr-2">{note.icon}</span>}
            {note.name}
            {note.is_pinned && <Pin className="inline h-4 w-4 ml-2 text-muted-foreground" />}
          </h1>
        )}
      </div>

      {/* Content area — click empty space to focus new line */}
      <div className="flex-1 cursor-text" onClick={handlePageClick}>
        {/* Items */}
        <div className="space-y-0.5">
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
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors my-3 px-2"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showChecked ? "rotate-180" : ""}`} />
            {showChecked ? "Hide" : "Show"} completed ({checkedCount})
          </button>
        )}

        {/* New line — seamless, no border, just like typing on the page */}
        <NewLine
          ref={newLineRef}
          itemType={newItemType}
          onSubmit={handleAddItem}
          isEmpty={items.length === 0}
        />
      </div>
    </div>
  );
}

// Seamless new-line input that looks like part of the page
import { forwardRef, useState as useStateInner } from "react";

const NewLine = forwardRef<
  HTMLTextAreaElement,
  { itemType: "text" | "checkbox"; onSubmit: (content: string) => void; isEmpty: boolean }
>(function NewLine({ itemType, onSubmit, isEmpty }, ref) {
  const [value, setValue] = useStateInner("");

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) {
        onSubmit(value);
        setValue("");
      }
    }
  }

  return (
    <div className="flex items-start gap-2 py-1.5 px-2">
      {itemType === "checkbox" && (
        <div className="mt-0.5 flex-shrink-0">
          <div className="h-4 w-4 rounded-sm border border-muted-foreground/30" />
        </div>
      )}
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={isEmpty ? "Start typing..." : ""}
        className="w-full bg-transparent border-none outline-none resize-none text-sm min-h-[24px] placeholder:text-muted-foreground/40"
        rows={1}
      />
    </div>
  );
});
