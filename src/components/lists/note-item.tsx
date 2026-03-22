"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, GripVertical } from "lucide-react";

// ── Live Document ────────────────────────────────────────────
// Renders the entire note as Obsidian-style live preview with
// interactive checkboxes (click to toggle, drag to reorder, delete).
export function LiveDocument({
  content,
  onToggleCheckbox,
  onReorderLine,
  onDeleteLine,
}: {
  content: string;
  onToggleCheckbox: (lineIndex: number) => void;
  onReorderLine: (fromLine: number, toLine: number) => void;
  onDeleteLine: (lineIndex: number) => void;
}) {
  const lines = content.split("\n");
  const [draggedLine, setDraggedLine] = useState<number | null>(null);
  const [dragOverLine, setDragOverLine] = useState<number | null>(null);

  function handleDragEnd() {
    setDraggedLine(null);
    setDragOverLine(null);
  }

  if (!content) {
    return (
      <div className="text-sm text-muted-foreground/40 select-none py-1">
        Start typing... (use - [ ] for checkboxes, or type [])
      </div>
    );
  }

  return (
    <div className="text-sm leading-relaxed">
      {lines.map((line, i) => (
        <LiveLine
          key={i}
          line={line}
          lineIndex={i}
          onToggleCheckbox={onToggleCheckbox}
          onDeleteLine={onDeleteLine}
          onDragStart={() => setDraggedLine(i)}
          onDragOver={() => setDragOverLine(i)}
          onDrop={() => {
            if (draggedLine !== null && draggedLine !== i) {
              onReorderLine(draggedLine, i);
            }
            handleDragEnd();
          }}
          onDragEnd={handleDragEnd}
          isDragOver={dragOverLine === i && draggedLine !== null && draggedLine !== i}
        />
      ))}
    </div>
  );
}

// ── Live Line ────────────────────────────────────────────────
// Renders a single line with Obsidian-style formatting.
// Checkbox lines (- [ ] / - [x]) get interactive checkbox, drag handle, delete.
// All lines support drag-over drop zones for reordering checkboxes into them.
function LiveLine({
  line,
  lineIndex,
  onToggleCheckbox,
  onDeleteLine,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragOver,
}: {
  line: string;
  lineIndex: number;
  onToggleCheckbox: (lineIndex: number) => void;
  onDeleteLine: (lineIndex: number) => void;
  onDragStart: () => void;
  onDragOver: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
  isDragOver: boolean;
}) {
  // Drop zone wrapper for non-checkbox lines
  function dropZone(children: React.ReactNode) {
    return (
      <div
        className={isDragOver ? "border-t-2 border-primary" : ""}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          onDragOver();
        }}
        onDrop={(e) => {
          e.preventDefault();
          onDrop();
        }}
      >
        {children}
      </div>
    );
  }

  // Empty line
  if (!line) return dropZone(<div className="h-[1.5em]">{"\u200B"}</div>);

  // Horizontal rule
  if (/^-{3,}$/.test(line.trim())) return dropZone(<hr className="border-muted my-1" />);

  // Checkbox: - [ ] or - [x]  (must be checked BEFORE bullet list)
  const cbMatch = line.match(/^- \[([ x])\] (.*)/);
  if (cbMatch) {
    const isChecked = cbMatch[1] === "x";
    return (
      <div
        className={`group/cb flex items-center gap-2 py-0.5 px-1 rounded-md hover:bg-accent/50 transition-all ${
          isDragOver ? "border-t-2 border-primary" : ""
        } ${isChecked ? "opacity-50" : ""}`}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          onDragStart();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          onDragOver();
        }}
        onDrop={(e) => {
          e.preventDefault();
          onDrop();
        }}
        onDragEnd={() => onDragEnd()}
      >
        <div
          className="opacity-0 group-hover/cb:opacity-100 cursor-grab flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div
          className="flex-shrink-0 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCheckbox(lineIndex);
          }}
        >
          <Checkbox checked={isChecked} className="h-4 w-4" />
        </div>
        <span
          className={`flex-1 ${isChecked ? "line-through text-muted-foreground" : ""}`}
        >
          <InlineMarkdown text={cbMatch[2]} />
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteLine(lineIndex);
          }}
          className="opacity-0 group-hover/cb:opacity-100 p-0.5 text-muted-foreground hover:text-destructive transition-all flex-shrink-0"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  // Heading
  const hMatch = line.match(/^(#{1,3}) (.*)/);
  if (hMatch) {
    const level = hMatch[1].length;
    const cls =
      level === 1
        ? "text-xl font-bold"
        : level === 2
          ? "text-lg font-bold"
          : "text-base font-semibold";
    return dropZone(
      <div className={cls}>
        <span className="text-muted-foreground/40">{hMatch[1]} </span>
        <InlineMarkdown text={hMatch[2]} />
      </div>,
    );
  }

  // Blockquote
  const bqMatch = line.match(/^(>) (.*)/);
  if (bqMatch) {
    return dropZone(
      <div className="border-l-2 border-muted-foreground/30 pl-3 text-muted-foreground italic">
        <span className="text-muted-foreground/40">&gt; </span>
        <InlineMarkdown text={bqMatch[2]} />
      </div>,
    );
  }

  // Bullet list
  const bulletMatch = line.match(/^(- )(.*)/);
  if (bulletMatch) {
    return dropZone(
      <div>
        <span className="text-muted-foreground/40">- </span>
        <InlineMarkdown text={bulletMatch[2]} />
      </div>,
    );
  }

  // Numbered list
  const numMatch = line.match(/^(\d+\. )(.*)/);
  if (numMatch) {
    return dropZone(
      <div>
        <span className="text-muted-foreground/40">{numMatch[1]}</span>
        <InlineMarkdown text={numMatch[2]} />
      </div>,
    );
  }

  // Regular line
  return dropZone(
    <div>
      <InlineMarkdown text={line} />
    </div>,
  );
}

// ── Inline Markdown ──────────────────────────────────────────
// Renders inline formatting: bold, italic, code, links, strikethrough.
// Shows syntax characters dimmed with visual styling applied (Obsidian-style).
function InlineMarkdown({ text }: { text: string }) {
  const regex =
    /(\*\*(.+?)\*\*)|(~~(.+?)~~)|(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)|(`(.+?)`)|\[(.+?)\]\((.+?)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
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
        </span>,
      );
    } else if (match[3]) {
      // Strikethrough: ~~text~~
      parts.push(
        <span key={key++}>
          <span className="text-muted-foreground/40">~~</span>
          <s>{match[4]}</s>
          <span className="text-muted-foreground/40">~~</span>
        </span>,
      );
    } else if (match[5]) {
      // Italic: *text*
      parts.push(
        <span key={key++}>
          <span className="text-muted-foreground/40">*</span>
          <em>{match[5]}</em>
          <span className="text-muted-foreground/40">*</span>
        </span>,
      );
    } else if (match[6]) {
      // Code: `text`
      parts.push(
        <span key={key++}>
          <span className="text-muted-foreground/40">`</span>
          <code className="bg-muted rounded px-0.5 font-mono text-[0.85em]">
            {match[7]}
          </code>
          <span className="text-muted-foreground/40">`</span>
        </span>,
      );
    } else if (match[8] && match[9]) {
      // Link: [text](url)
      const href = /^https?:\/\//.test(match[9])
        ? match[9]
        : `https://${match[9]}`;
      parts.push(
        <span key={key++}>
          <span className="text-muted-foreground/40">[</span>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 underline"
            onClick={(e) => e.stopPropagation()}
          >
            {match[8]}
          </a>
          <span className="text-muted-foreground/40">]({match[9]})</span>
        </span>,
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts.length > 0 ? parts : text}</>;
}
