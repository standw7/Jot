"use client";

import { useState, useRef, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, GripVertical, ExternalLink, X } from "lucide-react";
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
  if (item.item_type === "checkbox") {
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
// Freeform text. Shows Obsidian-style live preview when not focused.
// Click to edit in textarea. Save on blur.
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
          onClick={(e) => {
            // Don't enter edit mode if clicking a link
            if ((e.target as HTMLElement).tagName === "A") return;
            setEditContent(item.content);
            setIsEditing(true);
          }}
          className="cursor-text"
        >
          <LiveMarkdown content={item.content} />
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
    if (!trimmed) { onDelete(); return; }
    if (trimmed !== item.content) onUpdate({ content: trimmed });
    setIsEditing(false);
  }

  function handleCheck(e: React.MouseEvent) {
    e.stopPropagation();
    setIsChecking(true);
    onToggleCheck();
    if (!item.is_checked) {
      setTimeout(() => setIsChecking(false), 800);
    } else {
      setIsChecking(false);
    }
  }

  function startEditing() {
    setEditContent(item.content);
    setIsEditing(true);
  }

  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; onDragStart?.(); }}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; onDragOver?.(e); }}
      onDrop={(e) => { e.preventDefault(); onDrop?.(); }}
      onDragEnd={() => onDragEnd?.()}
      onClick={!isEditing ? startEditing : undefined}
      className={`group flex items-center gap-2 py-1 px-2 rounded-md hover:bg-accent/50 transition-all cursor-text ${
        isChecking && !item.is_checked ? "opacity-50 transition-opacity duration-300" : ""
      } ${item.is_checked ? "opacity-50" : ""} ${isDragOver ? "border-t-2 border-primary" : ""}`}
    >
      {/* Drag handle */}
      <div className="opacity-0 group-hover:opacity-100 cursor-grab flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
      </div>

      {/* Checkbox */}
      <div className="flex-shrink-0" onClick={handleCheck}>
        <Checkbox checked={item.is_checked} className="h-4 w-4" />
      </div>

      {/* Content — click anywhere on row to edit */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            ref={ref}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onBlur={handleSave}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); handleSave(); }
              if (e.key === "Escape") { setEditContent(item.content); setIsEditing(false); }
              if (e.key === "Backspace" && editContent === "") { e.preventDefault(); onDelete(); }
            }}
            className="w-full bg-transparent border-none outline-none text-sm"
          />
        ) : (
          <span className={`text-sm ${item.is_checked ? "line-through text-muted-foreground" : ""}`}>
            {item.content}
          </span>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-destructive transition-all flex-shrink-0"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── Obsidian-style Live Markdown ──────────────────────────
// Shows markdown syntax (dimmed) with live visual styling.
// Headings are bigger, bold is bold, links are clickable, etc.
function LiveMarkdown({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="text-sm leading-relaxed">
      {lines.map((line, i) => (
        <LiveLine key={i} line={line} />
      ))}
    </div>
  );
}

function LiveLine({ line }: { line: string }) {
  // Empty line
  if (!line) return <div className="h-[1.5em]">{"\u200B"}</div>;

  // Horizontal rule
  if (/^-{3,}$/.test(line.trim())) return <hr className="border-muted my-1" />;

  // Heading
  const hMatch = line.match(/^(#{1,3}) (.*)/);
  if (hMatch) {
    const level = hMatch[1].length;
    const cls = level === 1 ? "text-xl font-bold" : level === 2 ? "text-lg font-bold" : "text-base font-semibold";
    return (
      <div className={cls}>
        <span className="text-muted-foreground/40">{hMatch[1]} </span>
        <InlineMarkdown text={hMatch[2]} />
      </div>
    );
  }

  // Blockquote
  const bqMatch = line.match(/^(>) (.*)/);
  if (bqMatch) {
    return (
      <div className="border-l-2 border-muted-foreground/30 pl-3 text-muted-foreground italic">
        <span className="text-muted-foreground/40">&gt; </span>
        <InlineMarkdown text={bqMatch[2]} />
      </div>
    );
  }

  // Bullet list
  const bulletMatch = line.match(/^(- )(.*)/);
  if (bulletMatch) {
    return (
      <div>
        <span className="text-muted-foreground/40">- </span>
        <InlineMarkdown text={bulletMatch[2]} />
      </div>
    );
  }

  // Numbered list
  const numMatch = line.match(/^(\d+\. )(.*)/);
  if (numMatch) {
    return (
      <div>
        <span className="text-muted-foreground/40">{numMatch[1]}</span>
        <InlineMarkdown text={numMatch[2]} />
      </div>
    );
  }

  // Regular line
  return <div><InlineMarkdown text={line} /></div>;
}

// Inline markdown: bold, italic, code, links, strikethrough
function InlineMarkdown({ text }: { text: string }) {
  // Process inline patterns with a single regex scan
  const regex = /(\*\*(.+?)\*\*)|(~~(.+?)~~)|(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)|(`(.+?)`)|\[(.+?)\]\((.+?)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      // Bold: **text**
      parts.push(
        <span key={key++}>
          <span className="text-muted-foreground/40">**</span>
          <strong>{match[2]}</strong>
          <span className="text-muted-foreground/40">**</span>
        </span>
      );
    } else if (match[3]) {
      // Strikethrough: ~~text~~
      parts.push(
        <span key={key++}>
          <span className="text-muted-foreground/40">~~</span>
          <s>{match[4]}</s>
          <span className="text-muted-foreground/40">~~</span>
        </span>
      );
    } else if (match[5]) {
      // Italic: *text*
      parts.push(
        <span key={key++}>
          <span className="text-muted-foreground/40">*</span>
          <em>{match[5]}</em>
          <span className="text-muted-foreground/40">*</span>
        </span>
      );
    } else if (match[6]) {
      // Code: `text`
      parts.push(
        <span key={key++}>
          <span className="text-muted-foreground/40">`</span>
          <code className="bg-muted rounded px-0.5 font-mono text-[0.85em]">{match[7]}</code>
          <span className="text-muted-foreground/40">`</span>
        </span>
      );
    } else if (match[8] && match[9]) {
      // Link: [text](url)
      const href = /^https?:\/\//.test(match[9]) ? match[9] : `https://${match[9]}`;
      parts.push(
        <span key={key++}>
          <span className="text-muted-foreground/40">[</span>
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline" onClick={(e) => e.stopPropagation()}>
            {match[8]}
          </a>
          <span className="text-muted-foreground/40">]({match[9]})</span>
        </span>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts.length > 0 ? parts : text}</>;
}
