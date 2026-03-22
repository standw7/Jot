"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Bookmark, CheckSquare, Calendar, Save } from "lucide-react";
import * as api from "@/lib/api";
import { toast } from "sonner";
import type { UserSettings } from "@/lib/types";

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [lwUrl, setLwUrl] = useState("");
  const [lwKey, setLwKey] = useState("");
  const [doitUrl, setDoitUrl] = useState("");
  const [doitKey, setDoitKey] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getSettings();
        setSettings(data);
        setLwUrl(data.linkwarden_api_url || "");
        setLwKey(data.linkwarden_api_key || "");
        setDoitUrl(data.doit_api_url || "");
        setDoitKey(data.doit_api_key || "");
      } catch {
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await api.updateSettings({
        linkwarden_api_url: lwUrl || null,
        linkwarden_api_key: lwKey || null,
        doit_api_url: doitUrl || null,
        doit_api_key: doitKey || null,
      });
      setSettings(updated);
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

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
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      <div className="space-y-8">
        {/* Linkwarden */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Linkwarden</h2>
            {lwUrl && lwKey && <Badge variant="secondary">Connected</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            Connect to Linkwarden to browse collections and embed bookmarks in your notes.
          </p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="lw-url">API URL</Label>
              <Input
                id="lw-url"
                value={lwUrl}
                onChange={(e) => setLwUrl(e.target.value)}
                placeholder="http://linkwarden:3000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lw-key">API Key</Label>
              <Input
                id="lw-key"
                value={lwKey}
                onChange={(e) => setLwKey(e.target.value)}
                placeholder="Your Linkwarden API key"
                type="password"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* DoIt */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">DoIt</h2>
            {doitUrl && doitKey && <Badge variant="secondary">Connected</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            Connect to DoIt to create tasks from your note items.
          </p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="doit-url">API URL</Label>
              <Input
                id="doit-url"
                value={doitUrl}
                onChange={(e) => setDoitUrl(e.target.value)}
                placeholder="http://doit-backend:8000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doit-key">API Key</Label>
              <Input
                id="doit-key"
                value={doitKey}
                onChange={(e) => setDoitKey(e.target.value)}
                placeholder="DoIt internal API key"
                type="password"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Google Calendar */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Google Calendar</h2>
            {settings?.google_refresh_token && <Badge variant="secondary">Connected</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            Connect Google Calendar to create events from your note items.
          </p>
          <p className="text-sm text-muted-foreground italic">
            Google Calendar OAuth setup coming soon. Currently uses the same credentials as DoIt.
          </p>
        </div>

        <Separator />

        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
