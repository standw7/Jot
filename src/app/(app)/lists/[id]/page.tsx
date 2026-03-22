"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { NoteItem } from "@/components/lists/note-item";
import {
  ArrowLeft,
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
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [loading, setLoading] = useState(true);

  // Editor state
  const [editorMode, setEditorMode] = useState<"text" | "checkbox">("text");
  const [textValue, setTextValue] = useState("");
  const [cbValue, setCbValue] = useState("");
  const textRef = useRef<HTMLTextAreaElement>(null);
  const cbRef = useRef<HTMLInputElement>(null);

  // DnD state
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

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

  // Focus checkbox input when entering checkbox mode
  useEffect(() => {
    if (editorMode === "checkbox") {
      cbRef.current?.focus();
    }
  }, [editorMode]);

  // ── Item CRUD ─────────────────────────────────────────────

  async function addTextItem(content: string) {
    if (!content.trim()) return;
    try {
      const item = await api.createItem(listId, { content: content.trim(), item_type: "text" });
      setItems((prev) => [...prev, item]);
    } catch {
      toast.error("Failed to add item");
    }
  }

  async function addCheckboxItem(content: string) {
    if (!content.trim()) return;
    try {
      const item = await api.createItem(listId, { content: content.trim(), item_type: "checkbox" });
      setItems((prev) => [...prev, item]);
    } catch {
      toast.error("Failed to add item");
    }
  }

  async function handleUpdateItem(itemId: string, updates: { content?: string; item_type?: "text" | "checkbox" }) {
    try {
      const updated = await api.updateItem(listId, itemId, updates);
      setItems((prev) => prev.map((i) => (i.id === itemId ? updated : i)));
    } catch {
      toast.error("Failed to update item");
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
        if (!updated.is_checked) setCheckedCount((c) => Math.max(0, c - 1));
      }
    } catch {
      toast.error("Failed to update item");
    }
  }

  async function handleDeleteLink(itemId: string, linkId: string) {
    try {
      await api.deleteItemLink(listId, itemId, linkId);
      setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, links: (i.links ?? []).filter((l) => l.id !== linkId) } : i));
    } catch {
      toast.error("Failed to delete link");
    }
  }

  async function handleDeleteImage(itemId: string, imageId: string) {
    try {
      await api.deleteItemImage(listId, itemId, imageId);
      setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, images: (i.images ?? []).filter((img) => img.id !== imageId) } : i));
    } catch {
      toast.error("Failed to delete image");
    }
  }

  // ── Note actions ──────────────────────────────────────────

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

  async function handleDeleteNote() {
    try {
      await api.deleteList(listId);
      router.push("/lists");
    } catch {
      toast.error("Failed to delete note");
    }
  }

  // ── Drag and Drop ─────────────────────────────────────────

  function handleDrop(targetId: string) {
    if (!draggedId || draggedId === targetId) return;
    const newItems = [...items];
    const dragIdx = newItems.findIndex((i) => i.id === draggedId);
    const dropIdx = newItems.findIndex((i) => i.id === targetId);
    if (dragIdx === -1 || dropIdx === -1) return;

    const [moved] = newItems.splice(dragIdx, 1);
    newItems.splice(dropIdx, 0, moved);
    setItems(newItems);
    setDraggedId(null);
    setDragOverId(null);

    // Persist new order
    api.reorderItems(listId, newItems.map((i) => i.id)).catch(() => {
      toast.error("Failed to reorder");
      fetchItems(); // revert on error
    });
  }

  // ── Editor: text mode ─────────────────────────────────────

  function handleTextChange(value: string) {
    const lines = value.split("\n");
    const lastLine = lines[lines.length - 1];

    // Detect [] or [ ] at start of line → enter checkbox mode
    const match = lastLine.match(/^\s*\[\s*\]\s*(.*)/);
    if (match) {
      // Save any text above the [] line
      const textAbove = lines.slice(0, -1).join("\n").trim();
      if (textAbove) addTextItem(textAbove);
      setTextValue("");

      // Switch to checkbox mode, carry over any text after []
      setEditorMode("checkbox");
      setCbValue(match[1] || "");
      return;
    }

    setTextValue(value);
  }

  function handleTextBlur() {
    if (textValue.trim()) {
      addTextItem(textValue.trim());
      setTextValue("");
    }
  }

  // ── Editor: checkbox mode ─────────────────────────────────

  function handleCbKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();

    if (cbValue.trim()) {
      addCheckboxItem(cbValue.trim());
      setCbValue("");
    } else {
      // Empty enter → exit checkbox mode
      setEditorMode("text");
      setCbValue("");
      // Focus text area after mode switch
      setTimeout(() => textRef.current?.focus(), 0);
    }
  }

  // ── Auto-resize textarea ──────────────────────────────────

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }

  // Click empty area to focus editor
  function handlePageClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (target === e.currentTarget) {
      if (editorMode === "checkbox") {
        cbRef.current?.focus();
      } else {
        textRef.current?.focus();
      }
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
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push("/lists")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1" />
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
            <DropdownMenuItem onClick={handleDeleteNote} className="text-destructive">
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
              if (e.key === "Escape") { setEditTitle(note.name); setIsEditingTitle(false); }
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

      {/* Content area */}
      <div className="flex-1 cursor-text" onClick={handlePageClick}>
        {/* Existing items */}
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
              // DnD only for checkbox items
              onDragStart={() => setDraggedId(item.id)}
              onDragOver={(e) => { e.preventDefault(); setDragOverId(item.id); }}
              onDrop={() => handleDrop(item.id)}
              onDragEnd={() => { setDraggedId(null); setDragOverId(null); }}
              isDragOver={dragOverId === item.id && draggedId !== item.id}
            />
          ))}
        </div>

        {/* ── Editor Area ─────────────────────────────────── */}
        <div className="px-2 py-1">
          {editorMode === "text" ? (
            <textarea
              ref={textRef}
              value={textValue}
              onChange={(e) => {
                handleTextChange(e.target.value);
                autoResize(e.target);
              }}
              onBlur={handleTextBlur}
              placeholder={items.length === 0 ? "Start typing... (type [] for a checklist)" : ""}
              className="w-full bg-transparent border-none outline-none resize-none text-sm min-h-[24px] leading-relaxed placeholder:text-muted-foreground/40"
              rows={1}
            />
          ) : (
            <div className="flex items-center gap-2">
              <Checkbox disabled className="h-4 w-4 flex-shrink-0 opacity-50" />
              <input
                ref={cbRef}
                value={cbValue}
                onChange={(e) => setCbValue(e.target.value)}
                onKeyDown={handleCbKeyDown}
                placeholder="Add item... (press Enter, empty Enter to exit)"
                className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground/40"
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Show completed toggle — always at bottom */}
        {checkedCount > 0 && (
          <button
            onClick={() => setShowChecked(!showChecked)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors my-3 px-2"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showChecked ? "rotate-180" : ""}`} />
            {showChecked ? "Hide" : "Show"} completed ({checkedCount})
          </button>
        )}
      </div>
    </div>
  );
}
