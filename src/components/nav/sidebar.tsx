"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  ListChecks,
  FolderPlus,
  Plus,
  Pin,
  ChevronRight,
  ChevronDown,
  Folder as FolderIcon,
  Settings,
  LogOut,
  StickyNote,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import type { Folder } from "@/lib/types";

interface SidebarProps {
  folders: Folder[];
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onSelectFilter: (filter: "all" | "pinned") => void;
  activeFilter: "all" | "pinned";
  onCreateFolder: (name: string, parentId?: string | null) => void;
  onCreateNote: () => void;
}

export function Sidebar({
  folders,
  selectedFolderId,
  onSelectFolder,
  onSelectFilter,
  activeFilter,
  onCreateFolder,
  onCreateNote,
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  function toggleExpanded(folderId: string) {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }

  function handleCreateFolder() {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName("");
      setShowNewFolder(false);
    }
  }

  function handleLogout() {
    logout();
    router.push("/login");
  }

  function renderFolderTree(folders: Folder[], depth = 0) {
    return folders.map((folder) => {
      const isExpanded = expandedFolders.has(folder.id);
      const hasChildren = folder.children && folder.children.length > 0;
      const isSelected = selectedFolderId === folder.id;

      return (
        <div key={folder.id}>
          <button
            onClick={() => {
              onSelectFolder(folder.id);
              onSelectFilter("all");
            }}
            className={`w-full flex items-center gap-1.5 px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors ${
              isSelected ? "bg-accent text-accent-foreground" : "text-foreground"
            }`}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
          >
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpanded(folder.id);
                }}
                className="p-0.5 hover:bg-muted rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>
            ) : (
              <span className="w-4.5" />
            )}
            <FolderIcon className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{folder.name}</span>
          </button>
          {hasChildren && isExpanded && renderFolderTree(folder.children!, depth + 1)}
        </div>
      );
    });
  }

  return (
    <div className="w-64 border-r border-border flex flex-col h-screen bg-sidebar">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-lg">
            <ListChecks className="h-5 w-5" />
            Jot
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onCreateNote}
            title="New note"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* Quick filters */}
          <button
            onClick={() => {
              onSelectFolder(null);
              onSelectFilter("all");
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors ${
              activeFilter === "all" && !selectedFolderId ? "bg-accent text-accent-foreground" : ""
            }`}
          >
            <StickyNote className="h-4 w-4 text-muted-foreground" />
            All Notes
          </button>
          <button
            onClick={() => {
              onSelectFolder(null);
              onSelectFilter("pinned");
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors ${
              activeFilter === "pinned" ? "bg-accent text-accent-foreground" : ""
            }`}
          >
            <Pin className="h-4 w-4 text-muted-foreground" />
            Pinned
          </button>

          {/* Folders section */}
          <div className="pt-3">
            <div className="flex items-center justify-between px-3 mb-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Folders
              </span>
              <button
                onClick={() => setShowNewFolder(!showNewFolder)}
                className="text-muted-foreground hover:text-foreground"
                title="New folder"
              >
                <FolderPlus className="h-3.5 w-3.5" />
              </button>
            </div>

            {showNewFolder && (
              <div className="px-2 mb-1">
                <Input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateFolder();
                    if (e.key === "Escape") setShowNewFolder(false);
                  }}
                  placeholder="Folder name..."
                  className="h-7 text-sm"
                  autoFocus
                />
              </div>
            )}

            {renderFolderTree(folders)}
          </div>
        </div>
      </ScrollArea>

      {/* Bottom actions */}
      <div className="p-2 border-t border-border space-y-1">
        <button
          onClick={() => router.push("/settings")}
          className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors ${
            pathname === "/settings" ? "bg-accent" : ""
          }`}
        >
          <Settings className="h-4 w-4 text-muted-foreground" />
          Settings
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}
