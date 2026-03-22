"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/nav/sidebar";
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
import { Plus, StickyNote } from "lucide-react";
import * as api from "@/lib/api";
import { toast } from "sonner";
import type { Folder, JotList } from "@/lib/types";

export default function ListsPage() {
  const router = useRouter();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [notes, setNotes] = useState<JotList[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "pinned">("all");
  const [loading, setLoading] = useState(true);
  const [showNewNote, setShowNewNote] = useState(false);
  const [newNoteName, setNewNoteName] = useState("");

  const fetchFolders = useCallback(async () => {
    try {
      const data = await api.getFolders();
      setFolders(data);
    } catch {
      toast.error("Failed to load folders");
    }
  }, []);

  const fetchNotes = useCallback(async () => {
    try {
      const params: { folder_id?: string; pinned?: boolean } = {};
      if (selectedFolderId) params.folder_id = selectedFolderId;
      if (activeFilter === "pinned") params.pinned = true;
      const data = await api.getLists(params);
      setNotes(data);
    } catch {
      toast.error("Failed to load notes");
    } finally {
      setLoading(false);
    }
  }, [selectedFolderId, activeFilter]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  async function handleCreateFolder(name: string, parentId?: string | null) {
    try {
      await api.createFolder({ name, parent_id: parentId });
      fetchFolders();
    } catch {
      toast.error("Failed to create folder");
    }
  }

  async function handleCreateNote() {
    if (!newNoteName.trim()) return;
    try {
      const note = await api.createList({
        name: newNoteName.trim(),
        folder_id: selectedFolderId,
      });
      setShowNewNote(false);
      setNewNoteName("");
      router.push(`/lists/${note.id}`);
    } catch {
      toast.error("Failed to create note");
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

  return (
    <div className="flex h-screen">
      <Sidebar
        folders={folders}
        selectedFolderId={selectedFolderId}
        onSelectFolder={setSelectedFolderId}
        onSelectFilter={setActiveFilter}
        activeFilter={activeFilter}
        onCreateFolder={handleCreateFolder}
        onCreateNote={() => setShowNewNote(true)}
      />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">
              {activeFilter === "pinned"
                ? "Pinned"
                : selectedFolderId
                  ? folders.find((f) => f.id === selectedFolderId)?.name ?? "Notes"
                  : "All Notes"}
            </h1>
            <Button onClick={() => setShowNewNote(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              New Note
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <StickyNote className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg mb-2">No notes yet</p>
              <p className="text-sm">Create a new note to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {notes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onClick={() => router.push(`/lists/${note.id}`)}
                  onDelete={() => handleDeleteNote(note.id)}
                  onTogglePin={() => handleTogglePin(note)}
                />
              ))}
            </div>
          )}
        </div>
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
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateNote();
            }}
            placeholder="Note name..."
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewNote(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateNote} disabled={!newNoteName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
