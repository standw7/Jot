"use client";

import { useState, useRef, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, GripVertical, ExternalLink, X, Image as ImageIcon } from "lucide-react";
import type { ListItem } from "@/lib/types";

interface NoteItemProps {
  item: ListItem;
  onUpdate: (updates: { content?: string; item_type?: "text" | "checkbox"; is_checked?: boolean }) => void;
  onDelete: () => void;
  onToggleCheck: () => void;
  onDeleteLink: (linkId: string) => void;
  onDeleteImage: (imageId: string) => void;
}

export function NoteItem({ item, onUpdate, onDelete, onToggleCheck, onDeleteLink, onDeleteImage }: NoteItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(item.content);
  const [isChecking, setIsChecking] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.selectionStart = inputRef.current.value.length;
    }
  }, [isEditing]);

  function handleSave() {
    const trimmed = editContent.trim();
    if (trimmed && trimmed !== item.content) {
      onUpdate({ content: trimmed });
    }
    setIsEditing(false);
  }

  function handleCheck() {
    if (item.item_type !== "checkbox") return;
    setIsChecking(true);
    onToggleCheck();
    if (!item.is_checked) {
      setTimeout(() => setIsChecking(false), 800);
    } else {
      setIsChecking(false);
    }
  }

  function getDomain(url: string): string {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return url;
    }
  }

  return (
    <div
      className={`group flex items-start gap-2 py-1.5 px-2 rounded-md hover:bg-accent/50 transition-all ${
        isChecking && !item.is_checked ? "opacity-50 transition-opacity duration-300" : ""
      } ${item.is_checked ? "opacity-50" : ""}`}
      style={{ paddingLeft: `${item.indent_level * 24 + 8}px` }}
    >
      {/* Drag handle */}
      <div className="opacity-0 group-hover:opacity-100 cursor-grab mt-1 flex-shrink-0">
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
      </div>

      {/* Checkbox (only for checkbox items) */}
      {item.item_type === "checkbox" && (
        <div className="mt-0.5 flex-shrink-0">
          <Checkbox
            checked={item.is_checked}
            onCheckedChange={handleCheck}
            className="h-4 w-4"
          />
        </div>
      )}

      {/* Content + attachments */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <textarea
            ref={inputRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSave();
              }
              if (e.key === "Escape") {
                setEditContent(item.content);
                setIsEditing(false);
              }
            }}
            className="w-full bg-transparent border-none outline-none resize-none text-sm min-h-[24px]"
            rows={1}
          />
        ) : (
          <p
            onClick={() => {
              setEditContent(item.content);
              setIsEditing(true);
            }}
            className={`text-sm cursor-text whitespace-pre-wrap break-words ${
              item.is_checked ? "line-through text-muted-foreground" : ""
            }`}
          >
            {item.content}
          </p>
        )}

        {/* Links */}
        {item.links && item.links.length > 0 && (
          <div className="mt-1.5 space-y-1">
            {item.links.map((link) => (
              <div
                key={link.id}
                className="group/link flex items-center gap-2 px-2 py-1 rounded bg-muted/50 text-xs"
              >
                {link.favicon_url && (
                  <img src={link.favicon_url} alt="" className="h-4 w-4 flex-shrink-0" />
                )}
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 truncate text-blue-500 hover:underline"
                >
                  {link.title || getDomain(link.url)}
                </a>
                <span className="text-muted-foreground truncate max-w-[120px]">
                  {getDomain(link.url)}
                </span>
                <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <button
                  onClick={() => onDeleteLink(link.id)}
                  className="opacity-0 group-hover/link:opacity-100 text-muted-foreground hover:text-destructive flex-shrink-0"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Images */}
        {item.images && item.images.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-2">
            {item.images.map((image) => (
              <div key={image.id} className="group/img relative">
                <img
                  src={`/api/backend/images/${image.filename}`}
                  alt={image.original_name}
                  className="h-12 w-12 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => window.open(`/api/backend/images/${image.filename}`, "_blank")}
                />
                <button
                  onClick={() => onDeleteImage(image.id)}
                  className="absolute -top-1 -right-1 opacity-0 group-hover/img:opacity-100 bg-destructive text-destructive-foreground rounded-full p-0.5"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete button */}
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-destructive transition-all mt-0.5 flex-shrink-0"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
