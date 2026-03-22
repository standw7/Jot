"use client";

import { useState, useRef, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, GripVertical, ExternalLink, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
    setEditContent(item.content);
  }, [item.content]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.selectionStart = inputRef.current.value.length;
      autoResize(inputRef.current);
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

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      setEditContent(item.content);
      setIsEditing(false);
    }
    if (e.key === "Backspace" && editContent === "") {
      e.preventDefault();
      onDelete();
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
      className={`group flex items-start gap-2 py-1 px-2 rounded-md hover:bg-accent/50 transition-all ${
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
        <div className="mt-1 flex-shrink-0">
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
            onChange={(e) => {
              setEditContent(e.target.value);
              autoResize(e.target);
            }}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent border-none outline-none resize-none text-sm min-h-[24px] leading-relaxed"
            rows={1}
          />
        ) : (
          <div
            onClick={() => {
              setEditContent(item.content);
              setIsEditing(true);
            }}
            className={`cursor-text ${
              item.is_checked ? "line-through text-muted-foreground" : ""
            }`}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Strip outer <p> wrapper for inline-feel
                p: ({ children }) => <p className="text-sm leading-relaxed whitespace-pre-wrap break-words my-0">{children}</p>,
                h1: ({ children }) => <h1 className="text-xl font-bold my-0">{children}</h1>,
                h2: ({ children }) => <h2 className="text-lg font-bold my-0">{children}</h2>,
                h3: ({ children }) => <h3 className="text-base font-semibold my-0">{children}</h3>,
                strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                code: ({ children, className }) => {
                  const isBlock = className?.includes("language-");
                  if (isBlock) {
                    return <code className="block bg-muted rounded px-2 py-1 text-xs font-mono my-1 overflow-x-auto">{children}</code>;
                  }
                  return <code className="bg-muted rounded px-1 py-0.5 text-xs font-mono">{children}</code>;
                },
                pre: ({ children }) => <pre className="my-1">{children}</pre>,
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {children}
                  </a>
                ),
                ul: ({ children }) => <ul className="list-disc list-inside text-sm my-0.5">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside text-sm my-0.5">{children}</ol>,
                li: ({ children }) => <li className="text-sm">{children}</li>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-muted-foreground/30 pl-3 text-sm text-muted-foreground italic my-0.5">
                    {children}
                  </blockquote>
                ),
                hr: () => <hr className="border-muted my-2" />,
              }}
            >
              {item.content}
            </ReactMarkdown>
          </div>
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
