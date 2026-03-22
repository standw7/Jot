"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ListChecks, Type, CheckSquare, Pin, Bookmark, Calendar, Hash } from "lucide-react";

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
            Jot is a notes app. Create notes to jot down thoughts, make checklists, or mix both — like Notion.
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Click <strong>+ New Note</strong> to create a note</li>
            <li>Type on the page — each line becomes a block</li>
            <li>Press <strong>Enter</strong> to add new lines</li>
            <li>Organize notes into folders using the sidebar</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Markdown
          </h2>
          <p className="text-muted-foreground mb-2">
            All text supports full markdown syntax. Write it raw and it renders on blur.
          </p>
          <div className="bg-muted/50 rounded-lg p-3 space-y-1 font-mono text-xs text-muted-foreground">
            <p><strong className="text-foreground">**bold**</strong> → <strong>bold</strong></p>
            <p><em className="text-foreground">*italic*</em> → <em>italic</em></p>
            <p><code className="text-foreground bg-muted px-1 rounded">`code`</code> → <code className="bg-muted px-1 rounded">code</code></p>
            <p># Heading 1 / ## Heading 2 / ### Heading 3</p>
            <p>[link text](url) → clickable link</p>
            <p>&gt; quote → blockquote</p>
            <p>- item → bullet list</p>
            <p>1. item → numbered list</p>
            <p>--- → horizontal rule</p>
            <p>~~strikethrough~~ → <s>strikethrough</s></p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Checkboxes
          </h2>
          <p className="text-muted-foreground mb-2">
            Start a line with <code className="bg-muted px-1 rounded text-xs">[ ]</code> or <code className="bg-muted px-1 rounded text-xs">- [ ]</code> to create a checkbox item.
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Type <code className="bg-muted px-1 rounded text-xs">[ ] Buy groceries</code> → creates a checkbox</li>
            <li>Click the checkbox to check it off</li>
            <li>Checked items fade out and hide — use <strong>&quot;Show completed&quot;</strong> to see them</li>
            <li>Everything else defaults to plain text</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Type className="h-5 w-5" />
            Editing
          </h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Click any block to edit it</li>
            <li>Press <strong>Enter</strong> to save, <strong>Escape</strong> to cancel</li>
            <li>Press <strong>Backspace</strong> on an empty block to delete it</li>
            <li>Click the note title to rename it</li>
            <li>Hover over a block to see the drag handle and delete button</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Bookmark className="h-5 w-5" />
            Integrations
          </h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li><strong>Linkwarden</strong> — Browse and embed bookmarks</li>
            <li><strong>DoIt</strong> — Create tasks from note items</li>
            <li><strong>Google Calendar</strong> — Create events from note items</li>
          </ul>
          <p className="text-muted-foreground mt-2">
            Integrations are auto-configured via Docker. Check status in <strong>Settings</strong>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Pin className="h-5 w-5" />
            Tips
          </h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Use the <strong>...</strong> menu to pin or delete notes</li>
            <li>Pin important notes for quick access</li>
            <li>Attach links and images to any item</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
