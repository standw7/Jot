"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Bookmark, CheckSquare, Calendar } from "lucide-react";
import * as api from "@/lib/api";
import { toast } from "sonner";
import type { UserSettings } from "@/lib/types";

const ICONS: Record<string, React.ElementType> = {
  Linkwarden: Bookmark,
  DoIt: CheckSquare,
};

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setSettings(await api.getSettings());
      } catch {
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

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

      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Integrations are configured automatically via Docker environment variables.
        </p>

        {settings?.integrations.map((integration) => {
          const Icon = ICONS[integration.name] ?? CheckSquare;
          return (
            <div key={integration.name} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">{integration.name}</span>
              </div>
              <Badge variant={integration.connected ? "secondary" : "outline"}>
                {integration.connected ? "Connected" : "Not configured"}
              </Badge>
            </div>
          );
        })}

        <Separator />

        {/* Google Calendar */}
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Google Calendar</span>
          </div>
          <Badge variant={settings?.google_connected ? "secondary" : "outline"}>
            {settings?.google_connected ? "Connected" : "Not connected"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground italic">
          Google Calendar OAuth setup coming soon. Currently uses the same credentials as DoIt.
        </p>
      </div>
    </div>
  );
}
