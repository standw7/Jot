"use client";

import { useState, useRef, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, GripVertical, ExternalLink, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ListItem } from "@/lib/types";

interface NoteItemProps {
  item: ListItem;
  onUpdate: (updates: { content?: string; item_type?: "text" | "checkbox" }) => void;
  onDelete: () => void;
  onToggleCheck: () => void;
  onDeleteLink: (linkId: string) => void;
  onDeleteImage: (imageId: string) => void;
  // DnD (checkbox items only)
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
  onDragEnd?: () => void;
  isDragOver?: boolean;
}

export function NoteItem({
  item, onUpdate, onDelete, onToggleCheck,
  onDeleteLink, onDeleteImage,
  onDragStart, onDragOver, onDrop, onDragEnd, isDragOver,
}: NoteItemProps) {
  const isCheckbox = item.item_type === "checkbox";

  if (isCheckbox) {
    return (
      <CheckboxItem
        item={item}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onToggleCheck={onToggleCheck}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        isDragOver={isDragOver}
      />
    );
  }

  return (
    <TextBlock
      item={item}
      onUpdate={onUpdate}
      onDelete={onDelete}
      onDeleteLink={onDeleteLink}
      onDeleteImage={onDeleteImage}
    />
  );
}

// ── Text Block ────────────────────────────────────────────
// Freeform text, multi-line. Click to edit. Enter = new line. Save on blur.
function TextBlock({
  item, onUpdate, onDelete, onDeleteLink, onDeleteImage,
}: {
  item: ListItem;
  onUpdate: (updates: { content?: string }) => void;
  onDelete: () => void;
  onDeleteLink: (linkId: string) => void;
  onDeleteImage: (imageId: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(item.content);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setEditContent(item.content); }, [item.content]);

  useEffect(() => {
    if (isEditing && ref.current) {
      ref.current.focus();
      ref.current.selectionStart = ref.current.value.length;
      autoResize(ref.current);
    }
  }, [isEditing]);

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }

  function handleSave() {
    const trimmed = editContent.trim();
    if (!trimmed) {
      onDelete();
      return;
    }
    if (trimmed !== item.content) {
      onUpdate({ content: trimmed });
    }
    setIsEditing(false);
  }

  function getDomain(url: string): string {
    try { return new URL(url).hostname.replace("www.", ""); }
    catch { return url; }
  }

  return (
    <div className="px-2 py-1">
      {isEditing ? (
        <textarea
          ref={ref}
          value={editContent}
          onChange={(e) => {
            setEditContent(e.target.value);
            autoResize(e.target);
          }}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setEditContent(item.content);
              setIsEditing(false);
            }
          }}
          className="w-full bg-transparent border-none outline-none resize-none text-sm min-h-[24px] leading-relaxed"
          rows={1}
        />
      ) : (
        <div
          onClick={() => { setEditContent(item.content); setIsEditing(true); }}
          className="cursor-text prose-sm"
        >
          <MarkdownContent content={item.content} />
        </div>
      )}

      {/* Links */}
      {item.links && item.links.length > 0 && (
        <div className="mt-1.5 space-y-1">
          {item.links.map((link) => (
            <div key={link.id} className="group/link flex items-center gap-2 px-2 py-1 rounded bg-muted/50 text-xs">
              {link.favicon_url && <img src={link.favicon_url} alt="" className="h-4 w-4 flex-shrink-0" />}
              <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex-1 truncate text-blue-500 hover:underline">
                {link.title || getDomain(link.url)}
              </a>
              <span className="text-muted-foreground truncate max-w-[120px]">{getDomain(link.url)}</span>
              <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <button onClick={() => onDeleteLink(link.id)} className="opacity-0 group-hover/link:opacity-100 text-muted-foreground hover:text-destructive flex-shrink-0">
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
              <button onClick={() => onDeleteImage(image.id)} className="absolute -top-1 -right-1 opacity-0 group-hover/img:opacity-100 bg-destructive text-destructive-foreground rounded-full p-0.5">
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Checkbox Item ─────────────────────────────────────────
// Single-line, interactive: check, drag, delete.
function CheckboxItem({
  item, onUpdate, onDelete, onToggleCheck,
  onDragStart, onDragOver, onDrop, onDragEnd, isDragOver,
}: {
  item: ListItem;
  onUpdate: (updates: { content?: string }) => void;
  onDelete: () => void;
  onToggleCheck: () => void;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
  onDragEnd?: () => void;
  isDragOver?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(item.content);
  const [isChecking, setIsChecking] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { setEditContent(item.content); }, [item.content]);
  useEffect(() => {
    if (isEditing && ref.current) {
      ref.current.focus();
      ref.current.selectionStart = ref.current.value.length;
    }
  }, [isEditing]);

  function handleSave() {
    const trimmed = editContent.trim();
    if (!trimmed) {
      onDelete();
      return;
    }
    if (trimmed !== item.content) {
      onUpdate({ content: trimmed });
    }
    setIsEditing(false);
  }

  function handleCheck() {
    setIsChecking(true);
    onToggleCheck();
    if (!item.is_checked) {
      setTimeout(() => setIsChecking(false), 800);
    } else {
      setIsChecking(false);
    }
  }

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart?.();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onDragOver?.(e);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop?.();
      }}
      onDragEnd={() => onDragEnd?.()}
      className={`group flex items-center gap-2 py-1 px-2 rounded-md hover:bg-accent/50 transition-all ${
        isChecking && !item.is_checked ? "opacity-50 transition-opacity duration-300" : ""
      } ${item.is_checked ? "opacity-50" : ""} ${isDragOver ? "border-t-2 border-primary" : ""}`}
    >
      {/* Drag handle */}
      <div className="opacity-0 group-hover:opacity-100 cursor-grab flex-shrink-0">
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
      </div>

      {/* Checkbox */}
      <Checkbox
        checked={item.is_checked}
        onCheckedChange={handleCheck}
        className="h-4 w-4 flex-shrink-0"
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            ref={ref}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); handleSave(); }
              if (e.key === "Escape") { setEditContent(item.content); setIsEditing(false); }
              if (e.key === "Backspace" && editContent === "") { e.preventDefault(); onDelete(); }
            }}
            className="w-full bg-transparent border-none outline-none text-sm"
          />
        ) : (
          <span
            onClick={() => { setEditContent(item.content); setIsEditing(true); }}
            className={`text-sm cursor-text ${item.is_checked ? "line-through text-muted-foreground" : ""}`}
          >
            {item.content}
          </span>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-destructive transition-all flex-shrink-0"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── Shared Markdown Renderer ──────────────────────────────
function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="text-sm leading-relaxed whitespace-pre-wrap break-words my-0">{children}</p>,
        h1: ({ children }) => <h1 className="text-xl font-bold my-0">{children}</h1>,
        h2: ({ children }) => <h2 className="text-lg font-bold my-0">{children}</h2>,
        h3: ({ children }) => <h3 className="text-base font-semibold my-0">{children}</h3>,
        strong: ({ children }) => <strong className="font-bold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        code: ({ children, className }) => {
          if (className?.includes("language-")) {
            return <code className="block bg-muted rounded px-2 py-1 text-xs font-mono my-1 overflow-x-auto">{children}</code>;
          }
          return <code className="bg-muted rounded px-1 py-0.5 text-xs font-mono">{children}</code>;
        },
        pre: ({ children }) => <pre className="my-1">{children}</pre>,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline" onClick={(e) => e.stopPropagation()}>
            {children}
          </a>
        ),
        ul: ({ children }) => <ul className="list-disc list-inside text-sm my-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside text-sm my-0.5">{children}</ol>,
        li: ({ children }) => <li className="text-sm">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-muted-foreground/30 pl-3 text-sm text-muted-foreground italic my-0.5">{children}</blockquote>
        ),
        hr: () => <hr className="border-muted my-2" />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
