import { useOS } from "@/lib/os/store";
import { APP_MAP } from "@/lib/os/registry";
import { AppIcon } from "./AppIcon";
import type { PermissionKind } from "@/lib/os/types";
import { Bell, Camera, Clipboard, FolderOpen, Globe, HardDrive, MapPin, Mic, MonitorUp, ShieldCheck } from "lucide-react";

const META: Record<PermissionKind, { label: string; description: string; icon: typeof Camera }> = {
  camera: { label: "Camera", description: "take photos or video from this device", icon: Camera },
  microphone: { label: "Microphone", description: "record audio into your files", icon: Mic },
  notifications: { label: "Notifications", description: "send notifications through the WindOS shell", icon: Bell },
  clipboard: { label: "Clipboard", description: "read and write your device clipboard", icon: Clipboard },
  screen: { label: "Screen capture", description: "capture or record a display", icon: MonitorUp },
  network: { label: "Network", description: "make requests to external services", icon: Globe },
  location: { label: "Location", description: "request location-aware weather", icon: MapPin },
  storage: { label: "Storage", description: "read and write WindOS application data", icon: HardDrive },
  files: { label: "Files", description: "read and write your WindOS virtual drive", icon: FolderOpen },
};

export function PermissionPrompt() {
  const os = useOS();
  const prompt = os.permissionPrompt;
  if (!prompt) return null;
  const app = APP_MAP.get(prompt.appId);
  const meta = META[prompt.kind];
  const Icon = meta.icon;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div
        className="windos-pop w-full max-w-md overflow-hidden rounded-2xl border border-border/70 bg-popover text-popover-foreground shadow-2xl"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="permission-title"
      >
        <div className="border-b border-border/60 bg-muted/40 px-5 py-4">
          <div className="flex items-center gap-3">
            {app && <AppIcon app={app} size="md" />}
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Permission request</p>
              <h2 id="permission-title" className="text-sm font-semibold">
                {app?.name ?? prompt.appId} wants access
              </h2>
            </div>
            <ShieldCheck className="ml-auto size-5 text-primary" />
          </div>
        </div>
        <div className="px-5 py-4">
          <div className="mb-3 flex items-start gap-3 rounded-xl border border-border/70 bg-background/60 p-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-4" />
            </div>
            <div>
              <p className="text-xs font-semibold">{meta.label}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                Allow {app?.name ?? "this app"} to {meta.description}?
              </p>
            </div>
          </div>
          <p className="text-[10.5px] leading-relaxed text-muted-foreground">
            WindOS permissions apply inside this simulator. Your browser may still ask for its own
            permission for camera, microphone or screen capture. You can revoke this later in
            WindSecurity or Settings → Privacy &amp; security.
          </p>
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              className="rounded-lg border border-border px-3.5 py-2 text-xs font-medium transition hover:bg-muted"
              onClick={() => os.answerPermission(false)}
            >
              Don't allow
            </button>
            <button
              className="rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
              onClick={() => os.answerPermission(true)}
            >
              Allow
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
