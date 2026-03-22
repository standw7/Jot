"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ListChecks, Type, CheckSquare, Pin, Bookmark, Calendar } from "lucide-react";

export default function HelpPage() {
  const router = useRouter();

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => router.push("/lists")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold">Help</h1>
      </div>

      <div className="space-y-8 text-sm">
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            Getting Started
          </h2>
          <p className="text-muted-foreground mb-2">
            Jot is a notes and lists app. Create notes to jot down freeform text, make checklists, or mix both.
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Click <strong>+ New Note</strong> to create a note</li>
            <li>Organize notes into folders using the sidebar</li>
            <li>Pin important notes for quick access</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Type className="h-5 w-5" />
            Text & Checklists
          </h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Toggle between <strong>text mode</strong> (T icon) and <strong>checkbox mode</strong> (checkbox icon) when adding items</li>
            <li>Text items are freeform — great for notes, descriptions, paragraphs</li>
            <li>Checkbox items can be checked off — perfect for shopping lists, to-dos</li>
            <li>Mix both types in a single note</li>
            <li>Click any item to edit it inline</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Check Animation
          </h2>
          <p className="text-muted-foreground">
            When you check a checkbox item, it fades out and slides away. Checked items are hidden by default — use the <strong>"Show completed"</strong> toggle at the bottom to reveal them.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Bookmark className="h-5 w-5" />
            Integrations
          </h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li><strong>Linkwarden</strong> — Browse and embed bookmarks from your Linkwarden collections</li>
            <li><strong>DoIt</strong> — Create tasks in DoIt directly from note items</li>
            <li><strong>Google Calendar</strong> — Create calendar events from note items</li>
          </ul>
          <p className="text-muted-foreground mt-2">
            Configure integrations in <strong>Settings</strong>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Pin className="h-5 w-5" />
            Tips
          </h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Press <strong>Enter</strong> to quickly add items</li>
            <li>Click the note title to rename it</li>
            <li>Use the <strong>...</strong> menu on note cards to pin or delete</li>
            <li>Attach links and images to any item</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
