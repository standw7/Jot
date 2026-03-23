"use client";

import { Pin, MoreHorizontal, Trash2, Edit2, Copy } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { JotList } from "@/lib/types";

interface NoteCardProps {
  note: JotList;
  onClick: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}

export function NoteCard({ note, onClick, onDelete, onTogglePin }: NoteCardProps) {
  return (
    <div
      onClick={onClick}
      className="group relative p-4 rounded-lg border border-border hover:border-foreground/20 bg-card cursor-pointer transition-all hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {note.icon && <span className="text-lg">{note.icon}</span>}
            <h3 className="font-medium truncate">{note.name}</h3>
            {note.is_pinned && <Pin className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
          </div>
          {note.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{note.description}</p>
          )}
          {note.preview && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{note.preview}</p>
          )}
          <p className="text-xs text-muted-foreground/60 mt-1.5">
            {new Date(note.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            onClick={(e) => e.stopPropagation()}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
          >
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onTogglePin(); }}>
              <Pin className="h-4 w-4 mr-2" />
              {note.is_pinned ? "Unpin" : "Pin"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
