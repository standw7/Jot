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

  // Single document state
  const [doc, setDoc] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [savedItemIds, setSavedItemIds] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const savingRef = useRef(false);

  // ── Helpers ────────────────────────────────────────────────

  function itemsToDocument(items: ListItem[]): string {
    return items
      .map((item) => {
        if (item.item_type === "checkbox") {
          const indent = "  ".repeat(item.indent_level ?? 0);
          return `${indent}- [${item.is_checked ? "x" : " "}] ${item.content}`;
        }
        return item.content;
      })
      .join("\n");
  }

  /** Return exclusive end index covering lineIdx and all its indented children. */
  function getChildrenEnd(lines: string[], lineIdx: number): number {
    const indent = lines[lineIdx].match(/^(\s*)/)?.[1].length ?? 0;
    let end = lineIdx + 1;
    while (end < lines.length) {
      const next = lines[end].match(/^(\s*)/)?.[1].length ?? 0;
      if (next > indent) end++;
      else break;
    }
    return end;
  }

  function setCursor(pos: number) {
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = pos;
        textareaRef.current.selectionEnd = pos;
      }
    });
  }

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }

  // ── Load ───────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      const [data, items] = await Promise.all([
        api.getList(listId),
        api.getItems(listId, true),
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

  // ── Save ───────────────────────────────────────────────────

  async function saveDocument(content: string) {
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      if (savedItemIds.length === 1) {
        await api.updateItem(listId, savedItemIds[0], { content });
      } else if (savedItemIds.length === 0) {
        if (!content.trim()) {
          savingRef.current = false;
          return;
        }
        const item = await api.createItem(listId, {
          content,
          item_type: "text",
        });
        setSavedItemIds([item.id]);
      } else {
        const item = await api.createItem(listId, {
          content,
          item_type: "text",
        });
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

  // ── Preview-mode interactions ──────────────────────────────

  function handleToggleCheckbox(lineIndex: number) {
    const lines = doc.split("\n");
    const line = lines[lineIndex];
    if (/^(\s*)- \[ \]/.test(line)) {
      lines[lineIndex] = line.replace("- [ ]", "- [x]");
    } else if (/^(\s*)- \[x\]/.test(line)) {
      lines[lineIndex] = line.replace("- [x]", "- [ ]");
    }
    const newDoc = lines.join("\n");
    setDoc(newDoc);
    saveDocument(newDoc);
  }

  function handleDeleteLine(lineIndex: number) {
    const lines = doc.split("\n");
    const end = getChildrenEnd(lines, lineIndex);
    lines.splice(lineIndex, end - lineIndex);
    const newDoc = lines.join("\n");
    setDoc(newDoc);
    saveDocument(newDoc);
  }

  function handleReorderLine(fromLine: number, toLine: number) {
    const lines = doc.split("\n");
    const end = getChildrenEnd(lines, fromLine);
    const moved = lines.splice(fromLine, end - fromLine);
    const target = toLine > fromLine ? toLine - moved.length : toLine;
    lines.splice(target, 0, ...moved);
    const newDoc = lines.join("\n");
    setDoc(newDoc);
    saveDocument(newDoc);
  }

  function handleNestLine(fromLine: number, targetLine: number) {
    const lines = doc.split("\n");
    const end = getChildrenEnd(lines, fromLine);
    const moved = lines.splice(fromLine, end - fromLine);

    // Adjust target after removal
    const adj = fromLine < targetLine ? targetLine - moved.length : targetLine;
    const targetIndent = lines[adj].match(/^(\s*)/)?.[1].length ?? 0;

    // Insert after target's children
    let ins = adj + 1;
    while (ins < lines.length) {
      const d = lines[ins].match(/^(\s*)/)?.[1].length ?? 0;
      if (d > targetIndent) ins++;
      else break;
    }

    // Re-indent moved lines
    const srcIndent = moved[0].match(/^(\s*)/)?.[1].length ?? 0;
    const delta = targetIndent + 2 - srcIndent;
    const reindented = moved.map((l) => {
      if (delta > 0) return " ".repeat(delta) + l;
      if (delta < 0) {
        const ws = l.match(/^(\s*)/)?.[1].length ?? 0;
        return l.slice(Math.min(-delta, ws));
      }
      return l;
    });

    lines.splice(ins, 0, ...reindented);
    const newDoc = lines.join("\n");
    setDoc(newDoc);
    saveDocument(newDoc);
  }

  // ── Textarea editing ───────────────────────────────────────

  function handleDocChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    let value = e.target.value;
    value = value.replace(/^(\s*)\[\s*\]\s*/gm, "$1- [ ] ");
    value = value.replace(/^(\s*)\[x\]\s*/gm, "$1- [x] ");
    setDoc(value);
    autoResize(e.target);
  }

  function handleDocKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    const { selectionStart, value } = el;

    // Current line boundaries
    const before = value.slice(0, selectionStart);
    const lineStart = before.lastIndexOf("\n") + 1;
    const lineEndIdx = value.indexOf("\n", selectionStart);
    const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
    const currentLine = value.slice(lineStart, lineEnd);

    // ── Tab: indent / outdent list items (checkboxes & bullets) ──
    if (e.key === "Tab") {
      const listMatch = currentLine.match(/^(\s*)(- .*)/);
      if (!listMatch) return;
      e.preventDefault();

      let newLine: string;
      let delta: number;
      if (e.shiftKey) {
        if (listMatch[1].length < 2) return;
        newLine = currentLine.slice(2);
        delta = -2;
      } else {
        newLine = "  " + currentLine;
        delta = 2;
      }

      const newDoc = value.slice(0, lineStart) + newLine + value.slice(lineEnd);
      setDoc(newDoc);
      setCursor(Math.max(lineStart, selectionStart + delta));
      return;
    }

    // ── Enter: checkbox continuation ──
    if (e.key === "Enter") {
      const cbMatch = currentLine.match(/^(\s*)(- \[([ x])\] )(.*)/);
      if (!cbMatch) return; // normal newline for non-checkbox lines

      e.preventDefault();
      const indent = cbMatch[1];
      const content = cbMatch[4];
      const prefixLen = indent.length + cbMatch[2].length;
      const posInContent = selectionStart - lineStart - prefixLen;

      if (content.trim() === "") {
        // Empty checkbox → outdent or exit
        if (indent.length >= 2) {
          // Outdent one level
          const newLine = indent.slice(2) + "- [ ] ";
          const newDoc =
            value.slice(0, lineStart) + newLine + value.slice(lineEnd);
          setDoc(newDoc);
          setCursor(lineStart + newLine.length);
        } else {
          // Root level → remove empty checkbox, exit checkbox mode
          let rmStart = lineStart;
          let rmEnd = lineEnd;
          if (lineStart > 0) rmStart -= 1; // remove preceding newline
          else if (lineEnd < value.length) rmEnd += 1;
          const newDoc = value.slice(0, rmStart) + value.slice(rmEnd);
          setDoc(newDoc);
          setCursor(rmStart);
        }
      } else {
        // Has content → split at cursor, new unchecked checkbox at same indent
        const beforeContent = content.slice(0, Math.max(0, posInContent));
        const afterContent = content.slice(Math.max(0, posInContent));

        const kept =
          indent + `- [${cbMatch[3]}] ` + beforeContent;
        const added = indent + "- [ ] " + afterContent;

        const newDoc =
          value.slice(0, lineStart) +
          kept +
          "\n" +
          added +
          value.slice(lineEnd);
        setDoc(newDoc);
        setCursor(lineStart + kept.length + 1 + indent.length + 6);
      }
      return;
    }

    // ── Escape ──
    if (e.key === "Escape") {
      e.preventDefault();
      el.blur();
    }
  }

  function handleDocBlur() {
    setIsEditing(false);
    saveDocument(doc);
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

      {/* Document */}
      <div
        className="flex-1 px-2 cursor-text"
        onClick={() => !isEditing && setIsEditing(true)}
      >
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={doc}
            onChange={handleDocChange}
            onKeyDown={handleDocKeyDown}
            onBlur={handleDocBlur}
            className="w-full bg-transparent border-none outline-none resize-none text-sm min-h-[200px] leading-relaxed placeholder:text-muted-foreground/40 font-mono"
            placeholder="Start typing... (use - [ ] for checkboxes, or type [])"
          />
        ) : (
          <LiveDocument
            content={doc}
            onToggleCheckbox={handleToggleCheckbox}
            onReorderLine={handleReorderLine}
            onNestLine={handleNestLine}
            onDeleteLine={handleDeleteLine}
          />
        )}
      </div>
    </div>
  );
}
