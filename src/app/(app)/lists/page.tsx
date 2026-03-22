"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { NoteCard } from "@/components/lists/note-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  StickyNote,
  FolderPlus,
  Folder as FolderIcon,
  FolderOpen,
  ArrowLeft,
  Pin,
  Settings,
  LogOut,
  HelpCircle,
  MoreHorizontal,
  Trash2,
  Pencil,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as api from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import type { Folder, JotList } from "@/lib/types";

export default function ListsPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [notes, setNotes] = useState<JotList[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewNote, setShowNewNote] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newNoteName, setNewNoteName] = useState("");
  const [newFolderName, setNewFolderName] = useState("");

  // Folder rename
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameFolderValue, setRenameFolderValue] = useState("");

  // DnD state for dragging notes into folders
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [dragOverUnfiled, setDragOverUnfiled] = useState(false);

  const fetchFolders = useCallback(async () => {
    try {
      setFolders(await api.getFolders());
    } catch {
      toast.error("Failed to load folders");
    }
  }, []);

  const fetchNotes = useCallback(async () => {
    try {
      const params: { folder_id?: string } = {};
      if (currentFolderId) params.folder_id = currentFolderId;
      setNotes(await api.getLists(params));
    } catch {
      toast.error("Failed to load notes");
    } finally {
      setLoading(false);
    }
  }, [currentFolderId]);

  useEffect(() => { fetchFolders(); }, [fetchFolders]);
  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  // Get current folder info
  const currentFolder = currentFolderId
    ? findFolder(folders, currentFolderId)
    : null;

  // Get subfolders of current folder
  const subfolders = currentFolderId
    ? (currentFolder?.children ?? [])
    : folders;

  // Filter notes: when at root, only show unfiled notes
  const displayNotes = currentFolderId
    ? notes
    : notes.filter((n) => !n.folder_id);

  // ── Actions ───────────────────────────────────────────────

  async function handleCreateNote() {
    if (!newNoteName.trim()) return;
    try {
      const note = await api.createList({
        name: newNoteName.trim(),
        folder_id: currentFolderId,
      });
      setShowNewNote(false);
      setNewNoteName("");
      router.push(`/lists/${note.id}`);
    } catch {
      toast.error("Failed to create note");
    }
  }

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    try {
      await api.createFolder({ name: newFolderName.trim(), parent_id: currentFolderId });
      setShowNewFolder(false);
      setNewFolderName("");
      fetchFolders();
    } catch {
      toast.error("Failed to create folder");
    }
  }

  async function handleDeleteNote(id: string) {
    try {
      await api.deleteList(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch {
      toast.error("Failed to delete note");
    }
  }

  async function handleTogglePin(note: JotList) {
    try {
      await api.updateList(note.id, { is_pinned: !note.is_pinned });
      fetchNotes();
    } catch {
      toast.error("Failed to update note");
    }
  }

  async function handleDeleteFolder(folderId: string) {
    try {
      await api.deleteFolder(folderId);
      fetchFolders();
      fetchNotes(); // notes may have been unfiled
    } catch {
      toast.error("Failed to delete folder");
    }
  }

  async function handleRenameFolder(folderId: string, name: string) {
    if (!name.trim()) return;
    try {
      await api.updateFolder(folderId, { name: name.trim() });
      setRenamingFolderId(null);
      fetchFolders();
    } catch {
      toast.error("Failed to rename folder");
    }
  }

  // ── Drag & Drop ───────────────────────────────────────────

  async function handleDropOnFolder(folderId: string) {
    if (!draggedNoteId) return;
    try {
      await api.updateList(draggedNoteId, { folder_id: folderId });
      setDraggedNoteId(null);
      setDragOverFolderId(null);
      fetchNotes();
    } catch {
      toast.error("Failed to move note");
    }
  }

  async function handleDropOnParent() {
    if (!draggedNoteId) return;
    // Move to parent folder (or unfiled if at root — send "" so backend sets null)
    const parentId = currentFolder?.parent_id ?? "";
    try {
      await api.updateList(draggedNoteId, { folder_id: parentId });
      setDraggedNoteId(null);
      setDragOverUnfiled(false);
      fetchNotes();
    } catch {
      toast.error("Failed to move note");
    }
  }

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StickyNote className="h-5 w-5" />
          <span className="font-semibold text-lg">Jot</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push("/help")} title="Help">
            <HelpCircle className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push("/settings")} title="Settings">
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout} title="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        {/* Header with breadcrumb */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {currentFolderId && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentFolderId(currentFolder?.parent_id ?? null)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <h1 className="text-2xl font-bold">
              {currentFolder?.name ?? "All Notes"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowNewFolder(true)}>
              <FolderPlus className="h-4 w-4 mr-1" />
              New Folder
            </Button>
            <Button size="sm" onClick={() => setShowNewNote(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New Note
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        ) : (
          <>
            {/* "Move up" drop zone — visible when inside a folder and dragging */}
            {currentFolderId && draggedNoteId && (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOverUnfiled(true); }}
                onDragLeave={() => setDragOverUnfiled(false)}
                onDrop={(e) => { e.preventDefault(); handleDropOnParent(); }}
                className={`flex items-center gap-2 px-4 py-3 mb-4 rounded-lg border-2 border-dashed transition-colors ${
                  dragOverUnfiled ? "border-primary bg-primary/5" : "border-muted-foreground/20"
                }`}
              >
                <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Drop here to move to {currentFolder?.parent_id ? "parent folder" : "All Notes"}
                </span>
              </div>
            )}

            {/* Folders */}
            {subfolders.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
                {subfolders.map((folder) => (
                  <div
                    key={folder.id}
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverFolderId(folder.id); }}
                    onDragLeave={() => setDragOverFolderId(null)}
                    onDrop={(e) => { e.preventDefault(); handleDropOnFolder(folder.id); }}
                    className={`group relative flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all hover:bg-accent/50 ${
                      dragOverFolderId === folder.id ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border"
                    }`}
                    onClick={() => {
                      if (renamingFolderId !== folder.id) {
                        setCurrentFolderId(folder.id);
                        setLoading(true);
                      }
                    }}
                  >
                    {dragOverFolderId === folder.id ? (
                      <FolderOpen className="h-5 w-5 text-primary flex-shrink-0" />
                    ) : (
                      <FolderIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}
                    {renamingFolderId === folder.id ? (
                      <Input
                        value={renameFolderValue}
                        onChange={(e) => setRenameFolderValue(e.target.value)}
                        onBlur={() => handleRenameFolder(folder.id, renameFolderValue)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenameFolder(folder.id, renameFolderValue);
                          if (e.key === "Escape") setRenamingFolderId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="h-6 text-sm border-none shadow-none px-0"
                        autoFocus
                      />
                    ) : (
                      <span className="text-sm font-medium truncate">{folder.name}</span>
                    )}
                    {/* Folder menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted"
                      >
                        <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setRenamingFolderId(folder.id);
                          setRenameFolderValue(folder.name);
                        }}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}

            {/* Notes */}
            {displayNotes.length === 0 && subfolders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <StickyNote className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg mb-2">No notes yet</p>
                <p className="text-sm">Create a new note to get started</p>
              </div>
            ) : displayNotes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {displayNotes.map((note) => (
                  <div
                    key={note.id}
                    draggable
                    onDragStart={() => setDraggedNoteId(note.id)}
                    onDragEnd={() => { setDraggedNoteId(null); setDragOverFolderId(null); setDragOverUnfiled(false); }}
                  >
                    <NoteCard
                      note={note}
                      onClick={() => router.push(`/lists/${note.id}`)}
                      onDelete={() => handleDeleteNote(note.id)}
                      onTogglePin={() => handleTogglePin(note)}
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* New Note Dialog */}
      <Dialog open={showNewNote} onOpenChange={setShowNewNote}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Note</DialogTitle>
          </DialogHeader>
          <Input
            value={newNoteName}
            onChange={(e) => setNewNoteName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreateNote(); }}
            placeholder="Note name..."
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewNote(false)}>Cancel</Button>
            <Button onClick={handleCreateNote} disabled={!newNoteName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Folder Dialog */}
      <Dialog open={showNewFolder} onOpenChange={setShowNewFolder}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
          </DialogHeader>
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreateFolder(); }}
            placeholder="Folder name..."
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolder(false)}>Cancel</Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Recursively find a folder by ID
function findFolder(folders: Folder[], id: string): Folder | null {
  for (const f of folders) {
    if (f.id === id) return f;
    if (f.children) {
      const found = findFolder(f.children, id);
      if (found) return found;
    }
  }
  return null;
}
