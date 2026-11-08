import { useEffect, useMemo, useRef, useState } from "react";
import { useOS } from "@/lib/os/store";
import { ACCENTS, SETTINGS_INDEX, WALLPAPERS, wallpaperById } from "@/lib/os/settings";
import { playSound, speak } from "@/lib/os/sound";
import { formatBytes } from "@/lib/os/fs";
import { formatDuration } from "@/lib/os/hooks";
import { APP_MAP } from "@/lib/os/registry";
import { downloadText } from "@/lib/os/zip";
import type { PermissionKind } from "@/lib/os/types";
import { cn } from "@/lib/utils";
import { Field, GhostButton, PrimaryButton, inputClass, selectClass } from "./ui";
import {
  Accessibility,
  AppWindow,
  BatteryCharging,
  Bell,
  Check,
  ChevronRight,
  Clock3,
  Cpu,
  Database,
  Download,
  HardDrive,
  Info,
  Laptop,
  LayoutGrid,
  Lock,
  Monitor,
  Moon,
  Palette,
  Play,
  Plug,
  Power,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  Shield,
  Smartphone,
  Sparkles,
  Sun,
  Trash2,
  Type,
  Upload,
  User,
  Volume2,
  Wallpaper,
  Wifi,
} from "lucide-react";

type SectionId =
  | "system" | "display" | "sound" | "power" | "storage" | "personalization" | "taskbar" | "startup"
  | "installed" | "defaults" | "notifications" | "permissions" | "privacy" | "accessibility" | "updates" | "reset" | "about";

const SECTIONS: { id: SectionId; label: string; icon: typeof Settings2; group: string; keywords: string }[] = [
  { id: "system", label: "System", icon: Laptop, group: "System", keywords: "name version device overview" },
  { id: "display", label: "Display", icon: Monitor, group: "System", keywords: "brightness night light scale resolution monitors" },
  { id: "sound", label: "Sound", icon: Volume2, group: "System", keywords: "volume chime notification sounds" },
  { id: "power", label: "Power & battery", icon: BatteryCharging, group: "System", keywords: "sleep lock shutdown restart plan" },
  { id: "storage", label: "Storage", icon: HardDrive, group: "System", keywords: "disk space drive quota trash" },
  { id: "personalization", label: "Personalisation", icon: Palette, group: "Personalisation", keywords: "theme wallpaper accent lock screen screensaver icons" },
  { id: "taskbar", label: "Taskbar", icon: LayoutGrid, group: "Personalisation", keywords: "position alignment labels clock pinned" },
  { id: "startup", label: "Startup apps", icon: Play, group: "Apps", keywords: "boot launch" },
  { id: "installed", label: "Installed apps", icon: AppWindow, group: "Apps", keywords: "uninstall size version update store" },
  { id: "defaults", label: "Default apps", icon: Plug, group: "Apps", keywords: "browser editor associations" },
  { id: "notifications", label: "Notifications", icon: Bell, group: "Privacy & security", keywords: "banner sounds permission" },
  { id: "permissions", label: "App permissions", icon: Shield, group: "Privacy & security", keywords: "camera microphone clipboard files screen location" },
  { id: "privacy", label: "Privacy & security", icon: Lock, group: "Privacy & security", keywords: "safe mode guest events developer" },
  { id: "accessibility", label: "Accessibility", icon: Accessibility, group: "Accessibility", keywords: "contrast motion cursor text speech font" },
  { id: "updates", label: "WindOS Update", icon: RefreshCw, group: "Update & recovery", keywords: "channel auto update version" },
  { id: "reset", label: "Recovery", icon: RotateCcw, group: "Update & recovery", keywords: "reset wipe restore points backup" },
  { id: "about", label: "About WindOS", icon: Info, group: "About", keywords: "creator anyel gonzalez version features registry" },
];

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn("relative h-5 w-9 shrink-0 rounded-full transition", checked ? "bg-primary" : "bg-muted-foreground/25")}
    >
      <span className={cn("absolute top-0.5 size-4 rounded-full bg-white shadow transition-all", checked ? "left-[18px]" : "left-0.5")} />
    </button>
  );
}

function Row({ icon: Icon, title, body, children }: { icon?: typeof Settings2; title: string; body?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-border/40 px-3 py-2.5 last:border-0">
      {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" />}
      <div className="min-w-0 flex-1">
        <p className="text-[11.5px] font-medium">{title}</p>
        {body && <p className="mt-0.5 text-[9.5px] leading-snug text-muted-foreground">{body}</p>}
      </div>
      {children}
    </div>
  );
}

function Slider({ value, onChange, min = 0, max = 100, label }: { value: number; onChange: (value: number) => void; min?: number; max?: number; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-32 accent-[var(--os-accent)]" aria-label={label} />
      <span className="w-9 text-right text-[10px] tabular-nums text-muted-foreground">{value}%</span>
    </span>
  );
}

async function compressImage(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("decode failed"));
    element.src = dataUrl;
  });
  const max = 1600;
  const scale = Math.min(1, max / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d");
  if (!context) return dataUrl;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.78);
}

export default function Settings({ payload }: { payload?: Record<string, unknown> }) {
  const os = useOS();
  const initial = typeof payload?.section === "string" && SECTIONS.some((section) => section.id === payload.section) ? (payload.section as SectionId) : "system";
  const [section, setSection] = useState<SectionId>(initial);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [resetConfirm, setResetConfirm] = useState("");
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreLabel, setRestoreLabel] = useState("");
  const wallpaperInput = useRef<HTMLInputElement>(null);
  const lockInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof payload?.section === "string" && SECTIONS.some((item) => item.id === payload.section)) setSection(payload.section as SectionId);
  }, [payload?.section]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return SECTIONS;
    return SECTIONS.filter((item) => `${item.label} ${item.keywords} ${item.group}`.toLowerCase().includes(search));
  }, [query]);

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  async function uploadWallpaper(file: File | undefined, target: "desktop" | "lock") {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      flash("Choose an image file.");
      return;
    }
    try {
      const dataUrl = await compressImage(file);
      if (target === "desktop") os.updateSettings({ wallpaper: dataUrl, wallpaperKind: "custom" });
      else os.updateSettings({ lockWallpaper: dataUrl });
      flash(target === "desktop" ? "Custom wallpaper applied and saved." : "Lock screen image updated.");
      os.logEvent({ level: "info", title: "Wallpaper changed", detail: `Custom ${target} image applied locally.` });
    } catch {
      flash("That image could not be processed.");
    }
  }

  const groups = [...new Set(filtered.map((item) => item.group))];
  const usage = os.fs.usage();
  const appsInstalled = os.installed.length;
  const currentWallpaper = WALLPAPERS.find((item) => item.id === os.settings.wallpaper);
  const appUpdates = os.appUpdates;

  const grantsByApp = useMemo(() => {
    const map = new Map<string, { kind: PermissionKind; granted: boolean }[]>();
    for (const grant of Object.values(os.grants)) {
      const list = map.get(grant.appId) ?? [];
      list.push({ kind: grant.kind, granted: grant.granted });
      map.set(grant.appId, list);
    }
    return [...map.entries()];
  }, [os.grants]);

  return (
    <div className="flex h-full min-h-0 bg-background text-foreground">
      <aside className="flex w-[216px] shrink-0 flex-col border-r border-border/60 bg-muted/15">
        <div className="border-b border-border/60 p-3">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full text-[12px] font-semibold text-white" style={{ background: os.settings.avatarColor }}>
              {os.settings.displayName.slice(0, 1).toUpperCase() || "U"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold">{os.settings.displayName}</p>
              <p className="text-[9px] text-muted-foreground">Local account · WindOS 1.0.0</p>
            </div>
          </div>
          <div className="flex h-7 items-center gap-1.5 rounded-md border border-border bg-background px-2">
            <Search className="size-3 text-muted-foreground" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a setting" className="h-full w-full bg-transparent text-[10px] outline-none" aria-label="Find a setting" />
          </div>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {groups.map((group) => (
            <div key={group} className="mb-2">
              <p className="px-2 pb-1 text-[8.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">{group}</p>
              {filtered.filter((item) => item.group === group).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={cn(
                    "relative mb-0.5 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[10.5px] transition",
                    section === item.id ? "bg-primary/10 font-medium text-primary" : "text-foreground/75 hover:bg-muted hover:text-foreground",
                  )}
                >
                  {section === item.id && <span className="absolute left-0 top-1/2 h-3.5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />}
                  <item.icon className="size-3.5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                  {item.id === "installed" && appUpdates.length > 0 && <span className="ml-auto rounded-full bg-primary px-1 text-[8px] text-primary-foreground">{appUpdates.length}</span>}
                </button>
              ))}
            </div>
          ))}
          {filtered.length === 0 && <p className="px-2 py-3 text-[10px] text-muted-foreground">No settings match “{query}”.</p>}
        </nav>
        <div className="border-t border-border/60 p-2">
          <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => setSection("about")}>
            <Info className="size-3.5" /> About WindOS <ChevronRight className="ml-auto size-3" />
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 border-b border-border/50 bg-background/85 px-5 py-2.5 backdrop-blur">
          <h2 className="text-[13px] font-semibold">{SECTIONS.find((item) => item.id === section)?.label}</h2>
          <p className="text-[9.5px] text-muted-foreground">Settings are stored locally in this browser profile.</p>
        </div>
        <div className="mx-auto max-w-3xl px-4 py-4 pb-12">
          {toast && <div className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[10px] text-emerald-700 dark:text-emerald-300">{toast}</div>}

          {section === "system" && (
            <div className="space-y-3">
              <div className="rounded-xl border border-border/70 bg-gradient-to-br from-primary/8 to-transparent p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-primary/12 text-primary"><Cpu className="size-5" /></div>
                  <div>
                    <p className="text-[15px] font-semibold tracking-tight">{os.settings.displayName}’s WindOS</p>
                    <p className="text-[10px] text-muted-foreground">Version 1.0.0 · simulated x86-64 · Vector kernel</p>
                  </div>
                </div>
              </div>
              <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
                <Row title="Device name" body="Shown on the lock screen and About page">
                  <input value={os.settings.displayName} onChange={(event) => os.updateSettings({ displayName: event.target.value })} className={cn(inputClass, "h-7 w-40")} aria-label="Display name" />
                </Row>
                <Row icon={User} title="Avatar colour">
                  <div className="flex gap-1.5">
                    {["#4f5bd5", "#178f8a", "#c1802a", "#c2557a", "#7a5cd6", "#2f7fbf"].map((color) => (
                      <button key={color} className={cn("size-5 rounded-full border-2", os.settings.avatarColor === color ? "border-foreground" : "border-transparent")} style={{ background: color }} onClick={() => os.updateSettings({ avatarColor: color })} aria-label={`Avatar ${color}`} />
                    ))}
                  </div>
                </Row>
                <Row icon={Clock3} title="Uptime" body="Time since this WindOS session booted"><span className="text-[11px] font-medium tabular-nums">{formatDuration(os.bootedAt ? Date.now() - os.bootedAt : 0)}</span></Row>
                <Row icon={Database} title="Storage used" body="Real browser quota available to WindOS"><span className="text-[11px]">{formatBytes(usage.bytes)}</span></Row>
                <Row icon={AppWindow} title="Applications" body={`${appsInstalled} installed · ${APP_MAP.size} registered`}>
                  <button className="text-[10px] text-primary hover:underline" onClick={() => setSection("installed")}>Manage</button>
                </Row>
                <Row icon={Sparkles} title="Feature registry" body="640 capabilities across 40 categories">
                  <button className="text-[10px] text-primary hover:underline" onClick={() => os.openApp("registry")}>Open registry</button>
                </Row>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <button className="rounded-lg border border-border/70 bg-card p-2 text-[10px] hover:bg-muted" onClick={os.lock}><Lock className="mx-auto mb-1 size-4 text-muted-foreground" />Lock</button>
                <button className="rounded-lg border border-border/70 bg-card p-2 text-[10px] hover:bg-muted" onClick={os.sleep}><Moon className="mx-auto mb-1 size-4 text-muted-foreground" />Sleep</button>
                <button className="rounded-lg border border-border/70 bg-card p-2 text-[10px] hover:bg-muted" onClick={os.restart}><RefreshCw className="mx-auto mb-1 size-4 text-muted-foreground" />Restart</button>
                <button className="rounded-lg border border-border/70 bg-card p-2 text-[10px] hover:bg-muted" onClick={os.shutdown}><Power className="mx-auto mb-1 size-4 text-muted-foreground" />Shut down</button>
              </div>
            </div>
          )}

          {section === "display" && (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
                <Row icon={Sun} title="Brightness" body="Dims the rendered desktop with an overlay"><Slider value={os.settings.brightness} onChange={(brightness) => os.updateSettings({ brightness })} label="Brightness" /></Row>
                <Row icon={Moon} title="Night light" body="Warms the display colour temperature"><Toggle checked={os.settings.nightLight} onChange={(nightLight) => os.updateSettings({ nightLight })} label="Night light" /></Row>
                <Row icon={Type} title="Text size" body="Scales OS typography from 85% to 135%"><Slider min={85} max={135} value={os.settings.fontScale} onChange={(fontScale) => os.updateSettings({ fontScale })} label="Font scale" /></Row>
                <Row icon={Monitor} title="Display scale" body="Scales the entire interface; useful for large screens"><Slider min={85} max={125} value={os.settings.uiScale} onChange={(uiScale) => os.updateSettings({ uiScale })} label="UI scale" /></Row>
                <Row icon={Sparkles} title="Compact spacing" body="Tighter padding in lists and toolbars"><Toggle checked={os.settings.compactMode} onChange={(compactMode) => os.updateSettings({ compactMode })} label="Compact mode" /></Row>
              </div>
              <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
                <Row icon={Monitor} title="Second display" body="Simulates a second monitor beside the main desktop"><Toggle checked={os.settings.secondDisplay} onChange={(secondDisplay) => os.updateSettings({ secondDisplay })} label="Second display" /></Row>
                <Row icon={Monitor} title="Monitor layout" body="Extend the desktop across displays, or mirror the same desktop">
                  <select value={os.settings.monitorLayout} onChange={(event) => os.updateSettings({ monitorLayout: event.target.value as "extend" | "duplicate" })} className={cn(inputClass, "h-7 w-28")}>
                    <option value="extend">Extend</option>
                    <option value="duplicate">Duplicate</option>
                  </select>
                </Row>
                <Row icon={LayoutGrid} title="Desktop grid snapping" body="Desktop icons align to a 16 px grid as you drag them"><Toggle checked={os.settings.gridSnap} onChange={(gridSnap) => os.updateSettings({ gridSnap })} label="Grid snapping" /></Row>
              </div>
              <p className="text-[9.5px] text-muted-foreground">Actual display resolution is controlled by your device. WindOS scales its own rendered surface within the browser tab.</p>
            </div>
          )}

          {section === "sound" && (
            <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
              <Row icon={Volume2} title="Master volume" body="Applies to WindOS-generated UI sounds">
                <Slider value={os.settings.volume} onChange={(volume) => os.updateSettings({ volume })} label="Master volume" />
              </Row>
              <Row icon={Volume2} title="Test sound" body="Plays a generated tone; no audio file is downloaded">
                <GhostButton onClick={() => { os.updateSettings({ sounds: true }); playSound("notify", true); }}><Play className="size-3" /> Play</GhostButton>
              </Row>
              <Row title="Interface sounds" body="Clicks, notifications and window cues"><Toggle checked={os.settings.sounds} onChange={(sounds) => os.updateSettings({ sounds })} label="Interface sounds" /></Row>
              <Row title="Notification sounds" body="Tone when a notification arrives"><Toggle checked={os.settings.notificationSounds} onChange={(notificationSounds) => os.updateSettings({ notificationSounds })} label="Notification sounds" /></Row>
              <Row title="Startup chime" body="Play a tone after boot completes"><Toggle checked={os.settings.startupChime} onChange={(startupChime) => os.updateSettings({ startupChime })} label="Startup chime" /></Row>
            </div>
          )}

          {section === "power" && (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
                <Row icon={BatteryCharging} title="Power plan" body="Changes simulated CPU and memory scaling">
                  <select value={os.settings.powerPlan} onChange={(event) => os.updateSettings({ powerPlan: event.target.value as typeof os.settings.powerPlan })} className={cn(inputClass, "h-7 w-28")}>
                    <option value="balanced">Balanced</option>
                    <option value="saver">Power saver</option>
                    <option value="performance">Performance</option>
                  </select>
                </Row>
                <Row icon={BatteryCharging} title="Host battery" body="Reported by the browser when available; otherwise unavailable">
                  <span className="text-[10px] text-muted-foreground">see Monitor</span>
                </Row>
                <Row icon={Moon} title="Screensaver" body="Starts after inactivity; any input dismisses it">
                  <select value={os.settings.screensaver} onChange={(event) => os.updateSettings({ screensaver: event.target.value as typeof os.settings.screensaver })} className={cn(inputClass, "h-7 w-28")}>
                    <option value="none">None</option>
                    <option value="aurora">Aurora</option>
                    <option value="bubbles">Bubbles</option>
                    <option value="clock">Clock</option>
                    <option value="stars">Stars</option>
                  </select>
                </Row>
                <Row title="Screensaver idle minutes" body="Minimum one minute">
                  <input type="number" min={1} max={60} value={os.settings.screensaverMinutes} onChange={(event) => os.updateSettings({ screensaverMinutes: Math.max(1, Number(event.target.value) || 1) })} className={cn(inputClass, "h-7 w-16 text-right")} />
                </Row>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <GhostButton onClick={os.lock}><Lock className="size-3.5" /> Lock now</GhostButton>
                <GhostButton onClick={os.sleep}><Moon className="size-3.5" /> Sleep now</GhostButton>
                <GhostButton onClick={os.restart}><RefreshCw className="size-3.5" /> Restart</GhostButton>
                <GhostButton onClick={os.shutdown}><Power className="size-3.5" /> Shut down</GhostButton>
              </div>
              <p className="text-[9.5px] text-muted-foreground">Shutdown and sleep are simulated; closing the tab ends the session but your files stay stored.</p>
            </div>
          )}

          {section === "storage" && (
            <div className="space-y-3">
              <div className="rounded-xl border border-border/70 bg-card p-4">
                <div className="mb-1 flex items-end justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">WindOS (C:)</p>
                    <p className="text-[20px] font-semibold">{formatBytes(usage.bytes)} <span className="text-[10px] font-normal text-muted-foreground">virtual files</span></p>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{usage.files} files · {usage.folders} folders</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (usage.bytes / (1024 * 1024 * 1024)) * 100)}%` }} />
                </div>
                <p className="mt-1 text-[9px] text-muted-foreground">Virtual disk capacity 1 GB. Browser origin quota: {formatBytes(os.storage.quota)} ({formatBytes(os.storage.usage)} used).</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {os.fs.children(null).filter((node) => node.type === "folder").slice(0, 6).map((folder) => {
                  const files = os.fs.children(folder.id).filter((node) => node.type === "file");
                  const bytes = files.reduce((sum, node) => sum + node.size, 0);
                  return (
                    <button key={folder.id} className="rounded-lg border border-border/70 bg-card p-2.5 text-left hover:bg-muted/40" onClick={() => os.openApp("files", { openId: folder.id })}>
                      <p className="truncate text-[10.5px] font-medium">{folder.name}</p>
                      <p className="text-[9px] text-muted-foreground">{formatBytes(bytes)} · {files.length} files</p>
                    </button>
                  );
                })}
              </div>
              <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
                <Row icon={Trash2} title="Recycle Bin" body={`${os.fs.allTrash().length} items awaiting permanent deletion`}>
                  <button className="text-[10px] text-red-500 hover:underline" onClick={() => { const count = os.fs.emptyTrash(); flash(`${count} items permanently deleted.`); }}>Empty</button>
                </Row>
                <Row icon={Download} title="Export a file" body="Choose a file to download from the virtual drive">
                  <button className="text-[10px] text-primary hover:underline" onClick={() => { const file = os.fs.recent(10).find((node) => node.type === "file" && node.content); if (file) { downloadText(file.content ?? "", file.name, file.mime); flash(`Exported ${file.name}`); } else flash("No text file available to export."); }}>Export recent file</button>
                </Row>
                <Row icon={Info} title="Clearing browser data" body="WindOS data lives in IndexedDB and localStorage for this origin"><span className="text-[9.5px] text-muted-foreground">Export a backup first</span></Row>
              </div>
            </div>
          )}

          {section === "personalization" && (
            <div className="space-y-3">
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Theme</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["light", "dark"] as const).map((theme) => (
                    <button
                      key={theme}
                      onClick={() => os.updateSettings({ theme })}
                      className={cn("overflow-hidden rounded-xl border-2 text-left transition", os.settings.theme === theme ? "border-primary" : "border-border/60 hover:border-border")}
                    >
                      <div className={cn("flex h-16 gap-1.5 p-2", theme === "light" ? "bg-[#eef2f9]" : "bg-[#111827]")}>
                        <div className={cn("w-6 rounded", theme === "light" ? "bg-white/80" : "bg-white/10")} />
                        <div className="flex flex-1 flex-col gap-1">
                          <div className={cn("h-2.5 rounded", theme === "light" ? "bg-white" : "bg-white/15")} />
                          <div className={cn("flex-1 rounded", theme === "light" ? "bg-white/70" : "bg-white/8")} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between bg-card px-2.5 py-1.5 text-[10px] font-medium capitalize">
                        {theme} mode {os.settings.theme === theme && <Check className="size-3 text-primary" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Accent colour</p>
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-card p-3">
                  {ACCENTS.map((accent) => (
                    <button key={accent.id} onClick={() => os.updateSettings({ accent: accent.value })} className={cn("flex items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-2 text-[9.5px] transition", os.settings.accent === accent.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted")}>
                      <span className="flex size-4 items-center justify-center rounded-full" style={{ background: accent.value }}>{os.settings.accent === accent.value && <Check className="size-2.5 text-white" />}</span>
                      {accent.name}
                    </button>
                  ))}
                  <label className="flex items-center gap-1 text-[9.5px] text-muted-foreground">
                    Custom
                    <input type="color" value={os.settings.accent} onChange={(event) => os.updateSettings({ accent: event.target.value })} className="size-5 cursor-pointer rounded border-0 bg-transparent" aria-label="Custom accent" />
                  </label>
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Wallpaper</p>
                  <GhostButton className="h-6 px-1.5 text-[9px]" onClick={() => wallpaperInput.current?.click()}><Upload className="size-3" /> Upload image</GhostButton>
                </div>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                  {WALLPAPERS.map((wallpaper) => (
                    <button
                      key={wallpaper.id}
                      onClick={() => os.updateSettings({ wallpaper: wallpaper.id, wallpaperKind: wallpaper.kind })}
                      className={cn("group relative overflow-hidden rounded-lg border-2 text-left transition", os.settings.wallpaper === wallpaper.id ? "border-primary" : "border-transparent hover:border-border")}
                      title={wallpaper.name}
                    >
                      <div className={cn("h-14 w-full", wallpaper.className)} style={{ background: wallpaper.background }} />
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/25 px-1 py-0.5 text-[7.5px] text-white backdrop-blur-sm">
                        <span className="truncate">{wallpaper.name}</span>
                        {wallpaper.kind === "animated" && <Sparkles className="size-2 shrink-0" />}
                      </div>
                      {os.settings.wallpaper === wallpaper.id && <span className="absolute right-1 top-1 flex size-3.5 items-center justify-center rounded-full bg-primary text-white"><Check className="size-2" /></span>}
                    </button>
                  ))}
                  {os.settings.wallpaper.startsWith("data:") && (
                    <div className="relative overflow-hidden rounded-lg border-2 border-primary">
                      <img src={os.settings.wallpaper} alt="Custom wallpaper" className="h-14 w-full object-cover" />
                      <span className="absolute bottom-0 w-full bg-black/35 px-1 py-0.5 text-[7.5px] text-white">Custom</span>
                    </div>
                  )}
                </div>
                <div className="mt-2 space-y-2 rounded-xl border border-border/70 bg-card p-3">
                  <div className="flex items-center justify-between text-[10px]"><span>Wallpaper dim</span><Slider value={os.settings.wallpaperDim} onChange={(wallpaperDim) => os.updateSettings({ wallpaperDim })} label="Wallpaper dim" /></div>
                  <div className="flex items-center justify-between text-[10px]"><span>Wallpaper blur</span><Slider min={0} max={24} value={os.settings.wallpaperBlur} onChange={(wallpaperBlur) => os.updateSettings({ wallpaperBlur })} label="Wallpaper blur" /></div>
                  <div className="flex items-center justify-between text-[10px]"><span>Desktop icons</span><Toggle checked={os.settings.desktopIcons} onChange={(desktopIcons) => os.updateSettings({ desktopIcons })} label="Desktop icons" /></div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span>Icon size</span>
                    <select value={os.settings.iconSize} onChange={(event) => os.updateSettings({ iconSize: event.target.value as "sm" | "md" | "lg" })} className={cn(inputClass, "h-6 w-20 text-[10px]")}>
                      <option value="sm">Small</option><option value="md">Medium</option><option value="lg">Large</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between text-[10px]"><span>Window animations</span><Toggle checked={os.settings.animations} onChange={(animations) => os.updateSettings({ animations })} label="Animations" /></div>
                  <div className="flex items-center justify-between text-[10px]"><span>Window transparency</span><Toggle checked={os.settings.transparency} onChange={(transparency) => os.updateSettings({ transparency })} label="Transparency" /></div>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
                <Row icon={Lock} title="Lock screen wallpaper">
                  <select value={WALLPAPERS.some((item) => item.id === os.settings.lockWallpaper) ? os.settings.lockWallpaper : ""} onChange={(event) => os.updateSettings({ lockWallpaper: event.target.value })} className={cn(inputClass, "h-7 w-32")}>
                    {WALLPAPERS.map((wallpaper) => <option key={wallpaper.id} value={wallpaper.id}>{wallpaper.name}</option>)}
                    {os.settings.lockWallpaper.startsWith("data:") && <option value={os.settings.lockWallpaper}>Custom image</option>}
                  </select>
                </Row>
                <Row icon={Upload} title="Upload lock screen image">
                  <GhostButton className="h-6" onClick={() => lockInput.current?.click()}>Choose</GhostButton>
                </Row>
                <Row icon={Moon} title="Screensaver">
                  <select value={os.settings.screensaver} onChange={(event) => os.updateSettings({ screensaver: event.target.value as typeof os.settings.screensaver })} className={cn(inputClass, "h-7 w-24")}>
                    <option value="none">None</option><option value="aurora">Aurora</option><option value="bubbles">Bubbles</option><option value="clock">Clock</option><option value="stars">Stars</option>
                  </select>
                </Row>
                <Row icon={Monitor} title="Current wallpaper"><span className="max-w-[160px] truncate text-[9.5px] text-muted-foreground">{currentWallpaper?.name ?? "Custom image"}</span></Row>
              </div>
            </div>
          )}

          {section === "taskbar" && (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
                <Row title="Taskbar position" body="Bottom is the WindOS default">
                  <select value={os.settings.taskbarPosition} onChange={(event) => os.updateSettings({ taskbarPosition: event.target.value as "bottom" | "top" })} className={cn(inputClass, "h-7 w-24")}><option value="bottom">Bottom</option><option value="top">Top</option></select>
                </Row>
                <Row title="Alignment" body="Centre icons or align to the left">
                  <select value={os.settings.taskbarAlign} onChange={(event) => os.updateSettings({ taskbarAlign: event.target.value as "center" | "left" })} className={cn(inputClass, "h-7 w-24")}><option value="center">Center</option><option value="left">Left</option></select>
                </Row>
                <Row title="Show app labels" body="Adds titles beside running app icons"><Toggle checked={os.settings.taskbarLabels} onChange={(taskbarLabels) => os.updateSettings({ taskbarLabels })} label="Taskbar labels" /></Row>
                <Row title="Transparency effects" body="Frosted taskbar and menus"><Toggle checked={os.settings.taskbarTransparent} onChange={(taskbarTransparent) => os.updateSettings({ taskbarTransparent })} label="Taskbar transparency" /></Row>
                <Row title="24-hour clock"><Toggle checked={os.settings.clock24h} onChange={(clock24h) => os.updateSettings({ clock24h })} label="24-hour clock" /></Row>
                <Row title="Show seconds"><Toggle checked={os.settings.showSeconds} onChange={(showSeconds) => os.updateSettings({ showSeconds })} label="Show seconds" /></Row>
                <Row title="Show date"><Toggle checked={os.settings.showDate} onChange={(showDate) => os.updateSettings({ showDate })} label="Show date" /></Row>
                <Row title="Notification banners" body="Pop-up banners for new notifications"><Toggle checked={os.settings.notificationBanner} onChange={(notificationBanner) => os.updateSettings({ notificationBanner })} label="Notification banners" /></Row>
              </div>
              <div className="rounded-xl border border-border/70 bg-card p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Pinned taskbar apps</p>
                <div className="space-y-1">
                  {os.installed.map((entry) => {
                    const app = APP_MAP.get(entry.id);
                    if (!app) return null;
                    const pinned = os.settings.pinnedApps.includes(entry.id);
                    return (
                      <div key={entry.id} className="flex items-center gap-2 rounded px-1 py-1 text-[10.5px] hover:bg-muted/40">
                        <app.icon className="size-3.5 text-muted-foreground" />
                        <span className="flex-1 truncate">{app.name}</span>
                        <button className={cn("rounded px-1.5 py-0.5 text-[8.5px]", pinned ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")} onClick={() => os.togglePinApp(entry.id)}>{pinned ? "Pinned" : "Pin"}</button>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-end"><GhostButton onClick={() => os.resetIconPositions()}>Reset desktop icon positions</GhostButton></div>
            </div>
          )}

          {section === "startup" && (
            <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
              <div className="border-b border-border/50 p-3 text-[9.5px] text-muted-foreground">Startup apps launch after the desktop becomes available. Safe mode overrides this list. Boot time impact is simulated.</div>
              {os.installed.map((entry) => {
                const app = APP_MAP.get(entry.id);
                if (!app) return null;
                const enabled = os.settings.startupApps.includes(entry.id);
                return (
                  <div key={entry.id} className="flex items-center gap-2 border-b border-border/40 px-3 py-2 last:border-0">
                    <app.icon className="size-4 text-muted-foreground" />
                    <div className="min-w-0 flex-1"><p className="text-[11px] font-medium">{app.name}</p><p className="text-[9px] text-muted-foreground">{app.publisher}</p></div>
                    <Toggle checked={enabled} onChange={(value) => os.updateSettings({ startupApps: value ? [...os.settings.startupApps, entry.id] : os.settings.startupApps.filter((id) => id !== entry.id) })} label={`Startup ${app.name}`} />
                  </div>
                );
              })}
            </div>
          )}

          {section === "installed" && (
            <div className="space-y-3">
              {appUpdates.length > 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/8 px-3 py-2 text-[10px]">
                  <RefreshCw className="size-3.5 text-primary" />
                  <span className="flex-1">{appUpdates.length} application update{appUpdates.length === 1 ? "" : "s"} available.</span>
                  <PrimaryButton onClick={() => { os.applyAllUpdates(); flash("All app updates installed."); }}>Update all</PrimaryButton>
                </div>
              )}
              <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
                {os.installed.map((entry) => {
                  const app = APP_MAP.get(entry.id);
                  if (!app) return null;
                  const update = appUpdates.find((item) => item.app.id === entry.id);
                  return (
                    <div key={entry.id} className="flex items-center gap-2.5 border-b border-border/40 px-3 py-2 last:border-0">
                      <div className="flex size-7 items-center justify-center rounded-lg bg-muted"><app.icon className="size-3.5" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-medium">{app.name}</p>
                        <p className="text-[9px] text-muted-foreground">v{entry.version} · {app.sizeMb} MB · {app.publisher}</p>
                      </div>
                      {update && <button className="rounded bg-primary px-1.5 py-0.5 text-[8.5px] font-medium text-primary-foreground" onClick={() => { os.updateApp(entry.id); flash(`${app.name} updated.`); }}>Update</button>}
                      <button
                        className="rounded px-1.5 py-0.5 text-[8.5px] text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
                        onClick={() => {
                          const ok = os.uninstallApp(entry.id);
                          flash(ok ? `${app.name} uninstalled. Files were kept.` : `${app.name} is a protected system app.`);
                        }}
                      >
                        Uninstall
                      </button>
                    </div>
                  );
                })}
              </div>
              <GhostButton onClick={() => os.openApp("store")}>Open WindStore</GhostButton>
            </div>
          )}

          {section === "defaults" && (
            <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
              <Row icon={Wifi} title="Default browser" body="Used for links opened by other apps">
                <select value={os.settings.defaultBrowser} onChange={(event) => os.updateSettings({ defaultBrowser: event.target.value })} className={cn(inputClass, "h-7 w-32")}>
                  <option value="browser">WindBrowser</option>
                </select>
              </Row>
              <Row icon={AppWindow} title="Preferred editor" body="Opens text and code files from other apps">
                <select value={os.settings.preferredEditor} onChange={(event) => os.updateSettings({ preferredEditor: event.target.value })} className={cn(inputClass, "h-7 w-32")}>
                  <option value="code">WindCode</option>
                  <option value="notes">WindNotes</option>
                </select>
              </Row>
              <Row icon={Plug} title="File associations" body="Text, images, audio, PDFs, archives and code each have handlers">
                <button className="text-[10px] text-primary hover:underline" onClick={() => os.openApp("control")}>Manage</button>
              </Row>
              <Row icon={AppWindow} title="Open files with" body="Double-click behaviour for folders and files">
                <select value={os.settings.doubleClickOpen ? "double" : "single"} onChange={(event) => os.updateSettings({ doubleClickOpen: event.target.value === "double" })} className={cn(inputClass, "h-7 w-32")}>
                  <option value="double">Double-click</option>
                  <option value="single">Single-click</option>
                </select>
              </Row>
            </div>
          )}

          {section === "notifications" && (
            <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
              <Row icon={Bell} title="Notification banners" body="Banner appears briefly in the lower-right corner"><Toggle checked={os.settings.notificationBanner} onChange={(notificationBanner) => os.updateSettings({ notificationBanner })} label="Notification banners" /></Row>
              <Row icon={Volume2} title="Notification sounds"><Toggle checked={os.settings.notificationSounds} onChange={(notificationSounds) => os.updateSettings({ notificationSounds })} label="Notification sounds" /></Row>
              <Row icon={Shield} title="Permission mode" body="Ask every time, or automatically allow apps you trust">
                <select value={os.settings.appPermissionMode} onChange={(event) => os.updateSettings({ appPermissionMode: event.target.value as "ask" | "auto" })} className={cn(inputClass, "h-7 w-24")}>
                  <option value="ask">Ask</option><option value="auto">Auto allow</option>
                </select>
              </Row>
              <Row icon={Bell} title="Send a test notification" body="Requires the notifications capability">
                <GhostButton className="h-6" onClick={async () => {
                  if (!os.hasPermission("settings", "notifications")) await os.requestPermission("settings", "notifications");
                  os.notify({ appId: "WindOS", title: "Test notification", body: "Notifications are working. Open the notification centre from the taskbar clock." });
                }}>Send</GhostButton>
              </Row>
            </div>
          )}

          {section === "permissions" && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border/60 bg-muted/25 p-3 text-[9.5px] text-muted-foreground">
                WindOS gates camera, microphone, screen capture, clipboard, files, notifications and location through an in-OS prompt. These permissions govern simulated operating-system access only — a page cannot grant itself real host capabilities without the browser’s own prompt.
              </div>
              <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
                {grantsByApp.length === 0 && <p className="p-4 text-center text-[10px] text-muted-foreground">No app has requested a permission yet.</p>}
                {grantsByApp.map(([appId, grants]) => (
                  <div key={appId} className="border-b border-border/40 px-3 py-2 last:border-0">
                    <p className="mb-1 text-[11px] font-medium">{APP_MAP.get(appId)?.name ?? appId}</p>
                    <div className="flex flex-wrap gap-1">
                      {grants.map((grant) => (
                        <button
                          key={grant.kind}
                          onClick={() => { os.revokePermission(appId, grant.kind); flash(`Revoked ${grant.kind} from ${appId}.`); }}
                          className="flex items-center gap-1 rounded-full border border-border bg-muted/40 px-1.5 py-0.5 text-[8.5px] capitalize hover:border-red-400/50 hover:text-red-500"
                          title="Click to revoke"
                        >
                          {grant.kind} <span className={grant.granted ? "text-emerald-500" : "text-red-500"}>·</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
                <Row icon={Shield} title="Security centre" body="Events, sandboxing, suspicious downloads and trust indicators">
                  <GhostButton className="h-6" onClick={() => os.openApp("security")}>Open</GhostButton>
                </Row>
                <Row icon={Lock} title="Permission grants" body="Revoke every permission for every app">
                  <button className="text-[10px] text-red-500 hover:underline" onClick={() => { for (const grant of Object.values(os.grants)) os.revokePermission(grant.appId, grant.kind); flash("All permissions revoked."); }}>Revoke all</button>
                </Row>
              </div>
            </div>
          )}

          {section === "privacy" && (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
                <Row icon={Shield} title="Safe mode" body="Disables startup apps and developer features until reboot"><Toggle checked={os.settings.safeMode} onChange={(safeMode) => { os.updateSettings({ safeMode }); flash(safeMode ? "Safe mode enabled. Restart to apply." : "Safe mode disabled."); }} label="Safe mode" /></Row>
                <Row icon={Shield} title="Developer mode" body="Enables WindDevTools and experimental diagnostics"><Toggle checked={os.settings.developerMode} onChange={(developerMode) => os.updateSettings({ developerMode })} label="Developer mode" /></Row>
                <Row icon={User} title="Guest session" body="Read-only drive with temporary settings">
                  {os.guest ? <GhostButton className="h-6" onClick={os.endGuest}>End guest</GhostButton> : <GhostButton className="h-6" onClick={() => { os.startGuest(); flash("Guest session started."); }}>Start guest</GhostButton>}
                </Row>
                <Row icon={Database} title="Backup and export" body="Create a verified JSON backup of files, settings and installed apps">
                  <GhostButton className="h-6" onClick={() => os.openApp("backup")}>WindBackup</GhostButton>
                </Row>
                <Row icon={Trash2} title="Delete all WindOS data" body="Wipes the virtual drive and every saved preference">
                  <button className="text-[10px] text-red-500 hover:underline" onClick={() => setResetOpen(true)}>Erase</button>
                </Row>
              </div>
              <p className="text-[9.5px] leading-relaxed text-muted-foreground">WindOS does not provide host antivirus, firewall or malware protection and cannot inspect files outside this browser tab. Web pages also cannot guarantee Microsoft Edge is installed or control the host browser.</p>
            </div>
          )}

          {section === "accessibility" && (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
                <Row icon={Type} title="Text size" body="Scales the OS type scale"><Slider min={85} max={135} value={os.settings.fontScale} onChange={(fontScale) => os.updateSettings({ fontScale })} label="Text size" /></Row>
                <Row icon={Monitor} title="Display scale"><Slider min={85} max={125} value={os.settings.uiScale} onChange={(uiScale) => os.updateSettings({ uiScale })} label="Display scale" /></Row>
                <Row icon={Accessibility} title="High contrast" body="Stronger borders and text contrast"><Toggle checked={os.settings.highContrast} onChange={(highContrast) => os.updateSettings({ highContrast })} label="High contrast" /></Row>
                <Row icon={Sparkles} title="Reduce motion" body="Disables wallpaper and window animations"><Toggle checked={os.settings.reducedMotion} onChange={(reducedMotion) => os.updateSettings({ reducedMotion })} label="Reduce motion" /></Row>
                <Row icon={Monitor} title="Large cursor" body="Larger pointer and focus outlines"><Toggle checked={os.settings.largeCursor} onChange={(largeCursor) => os.updateSettings({ largeCursor })} label="Large cursor" /></Row>
                <Row icon={Moon} title="Night light"><Toggle checked={os.settings.nightLight} onChange={(nightLight) => os.updateSettings({ nightLight })} label="Night light" /></Row>
              </div>
              <div className="rounded-xl border border-border/70 bg-card p-3">
                <p className="mb-1 text-[10px] font-semibold">Screen reader check</p>
                <p className="mb-2 text-[9.5px] text-muted-foreground">WindOS ships semantic labels and focus styles. Use your browser’s screen reader; built-in speech synthesis speaks a short sample below.</p>
                <div className="flex gap-2">
                  <GhostButton onClick={() => speak(`Welcome to WindOS, ${os.settings.displayName}. Accessibility settings are active.`)}><Volume2 className="size-3.5" /> Speak sample</GhostButton>
                  <GhostButton onClick={() => os.openApp("accessibility")}>Open accessibility centre</GhostButton>
                </div>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/25 p-3 text-[9.5px] text-muted-foreground">Keyboard: <b>Ctrl+Space</b> search, <b>Esc</b> closes menus, <b>Alt+Tab</b> task view, arrow keys navigate the start menu.</div>
            </div>
          )}

          {section === "updates" && (
            <div className="space-y-3">
              <div className="rounded-xl border border-border/70 bg-gradient-to-br from-primary/10 to-transparent p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/12 text-primary"><RefreshCw className="size-5" /></div>
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold">WindOS 1.0.0 is up to date</p>
                    <p className="text-[9.5px] text-muted-foreground">Channel: {os.settings.updateChannel} · last checked just now</p>
                  </div>
                  <PrimaryButton onClick={() => { os.createRestorePoint("Before update check", "manual"); flash("Update check complete. WindOS 1.0.0 is current."); }}>Check</PrimaryButton>
                </div>
              </div>
              <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
                <Row icon={RefreshCw} title="Update channel" body="Developer channel unlocks diagnostics earlier">
                  <select value={os.settings.updateChannel} onChange={(event) => os.updateSettings({ updateChannel: event.target.value as typeof os.settings.updateChannel })} className={cn(inputClass, "h-7 w-28")}>
                    <option value="stable">Stable</option><option value="fast">Fast</option><option value="developer">Developer</option>
                  </select>
                </Row>
                <Row icon={RefreshCw} title="Automatic app updates" body="Install available package updates after boot"><Toggle checked={os.settings.autoUpdates} onChange={(autoUpdates) => os.updateSettings({ autoUpdates })} label="Automatic updates" /></Row>
                <Row icon={AppWindow} title="Application updates" body={`${appUpdates.length} package updates available`}>
                  <button className="text-[10px] text-primary hover:underline" onClick={() => setSection("installed")}>Review</button>
                </Row>
                <Row icon={RotateCcw} title="Restore points" body={`${os.restorePoints.length} saved checkpoints`}>
                  <button className="text-[10px] text-primary hover:underline" onClick={() => setRestoreOpen(true)}>Create</button>
                </Row>
                <Row icon={Info} title="Build information" body="Version 1.0.0 · built by Anyel Gonzalez · 640 feature registry entries"><span className="text-[9.5px] text-muted-foreground">2026</span></Row>
              </div>
              <div className="flex gap-2">
                <GhostButton onClick={() => os.openApp("update")}>Open WindUpdate</GhostButton>
                <GhostButton onClick={() => os.openApp("recovery")}>Recovery environment</GhostButton>
              </div>
            </div>
          )}

          {section === "reset" && (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
                <Row icon={RotateCcw} title="Restore points" body="Roll settings or files back to a recorded checkpoint">
                  <GhostButton className="h-6" onClick={() => setRestoreOpen(true)}>Create checkpoint</GhostButton>
                </Row>
                <Row icon={Download} title="Backup" body="Export a JSON backup before resetting"><GhostButton className="h-6" onClick={() => os.openApp("backup")}>Open WindBackup</GhostButton></Row>
                <Row icon={RefreshCw} title="Restart in safe mode" body="Loads without startup apps"><GhostButton className="h-6" onClick={os.bootSafeMode}>Restart now</GhostButton></Row>
                <Row icon={Shield} title="Recovery environment" body="Advanced diagnostics and restore tools"><GhostButton className="h-6" onClick={os.enterRecovery}>Enter recovery</GhostButton></Row>
              </div>
              <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
                <p className="text-[12px] font-semibold text-red-600 dark:text-red-400">Reset this PC</p>
                <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">Removes every virtual file, application install, permission grant, setting and restore point. This cannot be undone without a backup.</p>
                <button className="mt-2 rounded-md bg-red-600 px-3 py-1.5 text-[10.5px] font-semibold text-white hover:bg-red-500" onClick={() => setResetOpen(true)}>Erase everything</button>
              </div>
              <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
                <Row icon={Settings2} title="Reset settings only" body="Restores theme, taskbar and accessibility defaults; keeps files">
                  <button className="text-[10px] text-amber-600 hover:underline dark:text-amber-400" onClick={() => { os.resetSettings(); flash("Settings restored to defaults."); }}>Reset</button>
                </Row>
                <Row icon={RotateCcw} title="Restore points available" body={`${os.restorePoints.length} checkpoints stored locally`}>
                  <button className="text-[10px] text-primary hover:underline" onClick={() => setRestoreOpen(true)}>Manage</button>
                </Row>
              </div>
            </div>
          )}

          {section === "about" && (
            <div className="space-y-3">
              <div className="rounded-xl border border-border/70 bg-gradient-to-br from-primary/12 via-card to-card p-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-[18px] font-bold text-primary-foreground">W</div>
                  <div>
                    <p className="text-[18px] font-semibold tracking-tight">WindOS</p>
                    <p className="text-[10px] text-muted-foreground">Version 1.0.0 · Build by Anyel Gonzalez</p>
                  </div>
                </div>
                <p className="mt-3 text-[10.5px] leading-relaxed text-muted-foreground">A complete virtual desktop operating system running in your browser: persistent virtual filesystem, 40+ applications, terminal, security centre, store, backup and recovery — all local, no account required.</p>
              </div>
              <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
                <Row icon={Info} title="Product"><span className="text-[10px]">WindOS</span></Row>
                <Row icon={Cpu} title="Version"><span className="text-[10px]">1.0.0</span></Row>
                <Row icon={User} title="Creator"><span className="text-[10px] font-medium">Anyel Gonzalez</span></Row>
                <Row icon={AppWindow} title="Installed applications"><span className="text-[10px]">{appsInstalled}</span></Row>
                <Row icon={Sparkles} title="Feature registry"><span className="text-[10px]">{os.searchAll("").features.length || 640} entries</span></Row>
                <Row icon={HardDrive} title="Virtual storage"><span className="text-[10px]">{formatBytes(usage.bytes)} across {usage.files} files</span></Row>
                <Row icon={Database} title="Persistence"><span className="text-[10px]">IndexedDB + localStorage</span></Row>
                <Row icon={Smartphone} title="Responsive"><span className="text-[10px]">Desktop, tablet, iPhone</span></Row>
              </div>
              <div className="flex flex-wrap gap-2">
                <GhostButton onClick={() => os.openApp("about")}>Full About page</GhostButton>
                <GhostButton onClick={() => os.openApp("registry")}>Feature registry</GhostButton>
                <GhostButton onClick={() => os.openApp("help")}>Help centre</GhostButton>
                <GhostButton onClick={() => os.openApp("update")}>Check for updates</GhostButton>
              </div>
              <p className="text-[9px] leading-relaxed text-muted-foreground">WindOS is an original simulator inspired by desktop operating-system conventions. It is not affiliated with Microsoft. Simulated hardware metrics are labelled throughout; real browser storage and host capabilities are reported separately.</p>
            </div>
          )}
        </div>
      </main>

      <input ref={wallpaperInput} type="file" accept="image/*" className="hidden" onChange={(event) => { void uploadWallpaper(event.target.files?.[0], "desktop"); event.target.value = ""; }} />
      <input ref={lockInput} type="file" accept="image/*" className="hidden" onChange={(event) => { void uploadWallpaper(event.target.files?.[0], "lock"); event.target.value = ""; }} />

      {resetOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-popover p-4 shadow-2xl">
            <p className="text-[13px] font-semibold text-red-600 dark:text-red-400">Erase all WindOS data?</p>
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">Every virtual file, app install, permission and preference will be deleted. Type <b>RESET</b> to confirm.</p>
            <input value={resetConfirm} onChange={(event) => setResetConfirm(event.target.value)} className={cn(inputClass, "mt-3")} placeholder="RESET" aria-label="Type RESET to confirm" />
            <div className="mt-3 flex justify-end gap-2">
              <GhostButton onClick={() => { setResetOpen(false); setResetConfirm(""); }}>Cancel</GhostButton>
              <button
                disabled={resetConfirm !== "RESET"}
                className="rounded-md bg-red-600 px-3 py-1.5 text-[10.5px] font-semibold text-white disabled:opacity-40"
                onClick={async () => {
                  await os.wipeAll();
                  setResetOpen(false);
                  setResetConfirm("");
                }}
              >Erase everything</button>
            </div>
          </div>
        </div>
      )}

      {restoreOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-popover p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold">Restore points</p>
              <button className="rounded p-1 text-muted-foreground hover:bg-muted" onClick={() => setRestoreOpen(false)}>Close</button>
            </div>
            <div className="mt-2 flex gap-1.5">
              <input value={restoreLabel} onChange={(event) => setRestoreLabel(event.target.value)} placeholder="Checkpoint label" className={inputClass} />
              <PrimaryButton disabled={!restoreLabel.trim()} onClick={() => { os.createRestorePoint(restoreLabel.trim(), "manual"); setRestoreLabel(""); flash("Restore point created."); }}>Create</PrimaryButton>
            </div>
            <div className="mt-3 max-h-56 space-y-1.5 overflow-y-auto">
              {os.restorePoints.length === 0 && <p className="rounded border border-dashed border-border p-3 text-center text-[10px] text-muted-foreground">No restore points yet.</p>}
              {os.restorePoints.map((point) => (
                <div key={point.id} className="rounded-lg border border-border/60 p-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10.5px] font-medium">{point.label}</p>
                    <span className="text-[8.5px] text-muted-foreground">{new Date(point.at).toLocaleString()}</span>
                  </div>
                  <p className="text-[8.5px] text-muted-foreground">{point.kind} · {point.fileCount} files · {point.appCount} apps · checksum {point.checksum?.slice(0, 10) ?? "—"}</p>
                  <div className="mt-1 flex gap-1.5">
                    <button className="rounded bg-primary/10 px-1.5 py-0.5 text-[8.5px] text-primary" onClick={() => { const ok = os.applyRestorePoint(point.id, "settings"); flash(ok ? "Settings restored." : "That restore point is not available."); }}>Restore settings</button>
                    <button className="rounded bg-muted px-1.5 py-0.5 text-[8.5px]" onClick={() => { const ok = os.applyRestorePoint(point.id, "files"); flash(ok ? "Files restored." : "That restore point is not available."); }}>Restore files</button>
                    <button className="ml-auto rounded px-1.5 py-0.5 text-[8.5px] text-red-500 hover:bg-red-500/10" onClick={() => { os.deleteRestorePoint(point.id); flash("Restore point deleted."); }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

