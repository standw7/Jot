"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LiveDocument } from "@/components/lists/note-item";
import {
  ArrowLeft,
  MoreHorizontal,
  Trash2,
  Pin,
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
  const [loading, setLoading] = useState(true);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");

  // Single document state — the entire note is one string
  const [doc, setDoc] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [savedItemIds, setSavedItemIds] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const savingRef = useRef(false);

  // ── Convert items ↔ document ───────────────────────────────

  function itemsToDocument(items: ListItem[]): string {
    return items
      .map((item) => {
        if (item.item_type === "checkbox") {
          return `- [${item.is_checked ? "x" : " "}] ${item.content}`;
        }
        return item.content;
      })
      .join("\n");
  }

  // ── Load ───────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      const [data, items] = await Promise.all([
        api.getList(listId),
        api.getItems(listId, true), // include checked items
      ]);
      setNote(data);
      setEditTitle(data.name);
      setDoc(itemsToDocument(items));
      setSavedItemIds(items.map((i) => i.id));
    } catch {
      toast.error("Note not found");
      router.push("/lists");
    } finally {
      setLoading(false);
    }
  }, [listId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const el = textareaRef.current;
      el.focus();
      const len = el.value.length;
      el.selectionStart = len;
      el.selectionEnd = len;
      autoResize(el);
    }
  }, [isEditing]);

  // ── Save document ──────────────────────────────────────────

  async function saveDocument(content: string) {
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      if (savedItemIds.length === 1) {
        // Update existing single item
        await api.updateItem(listId, savedItemIds[0], { content });
      } else if (savedItemIds.length === 0) {
        if (!content.trim()) { savingRef.current = false; return; }
        // Create new item
        const item = await api.createItem(listId, {
          content,
          item_type: "text",
        });
        setSavedItemIds([item.id]);
      } else {
        // Migration: multiple items → single text item
        const item = await api.createItem(listId, {
          content,
          item_type: "text",
        });
        // Delete old items
        await Promise.all(
          savedItemIds.map((id) => api.deleteItem(listId, id).catch(() => {})),
        );
        setSavedItemIds([item.id]);
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      savingRef.current = false;
    }
  }

  // ── Checkbox toggle (in preview mode) ──────────────────────

  function handleToggleCheckbox(lineIndex: number) {
    const lines = doc.split("\n");
    const line = lines[lineIndex];
    if (/^- \[ \]/.test(line)) {
      lines[lineIndex] = line.replace("- [ ]", "- [x]");
    } else if (/^- \[x\]/.test(line)) {
      lines[lineIndex] = line.replace("- [x]", "- [ ]");
    }
    const newDoc = lines.join("\n");
    setDoc(newDoc);
    saveDocument(newDoc);
  }

  // ── Delete line (checkbox, in preview mode) ────────────────

  function handleDeleteLine(lineIndex: number) {
    const lines = doc.split("\n");
    lines.splice(lineIndex, 1);
    const newDoc = lines.join("\n");
    setDoc(newDoc);
    saveDocument(newDoc);
  }

  // ── Reorder line (drag-and-drop in preview mode) ───────────

  function handleReorderLine(fromLine: number, toLine: number) {
    const lines = doc.split("\n");
    const [moved] = lines.splice(fromLine, 1);
    lines.splice(toLine > fromLine ? toLine - 1 : toLine, 0, moved);
    const newDoc = lines.join("\n");
    setDoc(newDoc);
    saveDocument(newDoc);
  }

  // ── Text editing ───────────────────────────────────────────

  function handleDocChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    let value = e.target.value;
    // Auto-convert [] or [x] at start of line to checkbox syntax
    value = value.replace(/^(\s*)\[\s*\]\s*/gm, "$1- [ ] ");
    value = value.replace(/^(\s*)\[x\]\s*/gm, "$1- [x] ");
    setDoc(value);
    autoResize(e.target);
  }

  function handleDocBlur() {
    setIsEditing(false);
    saveDocument(doc);
  }

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }

  // ── Note actions ───────────────────────────────────────────

  async function handleUpdateTitle() {
    if (!editTitle.trim() || editTitle.trim() === note?.name) {
      setIsEditingTitle(false);
      return;
    }
    try {
      await api.updateList(listId, { name: editTitle.trim() });
      setNote((prev) => (prev ? { ...prev, name: editTitle.trim() } : prev));
      setIsEditingTitle(false);
    } catch {
      toast.error("Failed to update title");
    }
  }

  async function handleTogglePin() {
    if (!note) return;
    try {
      await api.updateList(listId, { is_pinned: !note.is_pinned });
      setNote((prev) =>
        prev ? { ...prev, is_pinned: !prev.is_pinned } : prev,
      );
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

  // ── Render ─────────────────────────────────────────────────

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
            <DropdownMenuItem
              onClick={handleDeleteNote}
              className="text-destructive"
            >
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
            {note.is_pinned && (
              <Pin className="inline h-4 w-4 ml-2 text-muted-foreground" />
            )}
          </h1>
        )}
      </div>

      {/* Document — single editable surface */}
      <div
        className="flex-1 px-2 cursor-text"
        onClick={() => !isEditing && setIsEditing(true)}
      >
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={doc}
            onChange={handleDocChange}
            onBlur={handleDocBlur}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                textareaRef.current?.blur();
              }
            }}
            className="w-full bg-transparent border-none outline-none resize-none text-sm min-h-[200px] leading-relaxed placeholder:text-muted-foreground/40"
            placeholder="Start typing... (use - [ ] for checkboxes, or type [])"
          />
        ) : (
          <LiveDocument
            content={doc}
            onToggleCheckbox={handleToggleCheckbox}
            onReorderLine={handleReorderLine}
            onDeleteLine={handleDeleteLine}
          />
        )}
      </div>
    </div>
  );
}
