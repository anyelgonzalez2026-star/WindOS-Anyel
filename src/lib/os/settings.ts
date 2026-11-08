import type { OSSettings } from "./types";

export interface Wallpaper {
  id: string;
  name: string;
  kind: "preset" | "animated";
  background: string;
  className?: string;
}

export const WALLPAPERS: Wallpaper[] = [
  {
    id: "meridian",
    name: "Meridian",
    kind: "preset",
    background:
      "radial-gradient(120% 100% at 12% 8%, #f7f9ff 0%, #e9eefb 38%, #dde6f6 72%, #d3dff2 100%)",
  },
  {
    id: "alabaster",
    name: "Alabaster",
    kind: "preset",
    background:
      "radial-gradient(100% 100% at 80% 0%, #fdfcf9 0%, #f5f3ee 45%, #e9e5dc 100%)",
  },
  {
    id: "slate",
    name: "Slate",
    kind: "preset",
    background:
      "radial-gradient(120% 110% at 18% 0%, #1c2635 0%, #131a26 45%, #0c111a 100%)",
  },
  {
    id: "midnight",
    name: "Midnight",
    kind: "preset",
    background:
      "radial-gradient(100% 100% at 75% 10%, #1b2233 0%, #121826 48%, #0b0f18 100%)",
  },
  {
    id: "ember",
    name: "Ember",
    kind: "preset",
    background:
      "radial-gradient(110% 90% at 15% 10%, #fbf5f0 0%, #f3e8df 45%, #e8d5c6 100%)",
  },
  {
    id: "moss",
    name: "Moss",
    kind: "preset",
    background:
      "radial-gradient(110% 90% at 20% 5%, #f1f7f2 0%, #e5efe7 45%, #d5e5d9 100%)",
  },
  {
    id: "dune",
    name: "Dune",
    kind: "preset",
    background:
      "radial-gradient(120% 100% at 85% 5%, #faf5ea 0%, #f1e8d6 50%, #e4d6bd 100%)",
  },
  {
    id: "tide",
    name: "Tide",
    kind: "preset",
    background:
      "radial-gradient(120% 100% at 10% 0%, #f2f9fb 0%, #e2f0f4 48%, #cfe4ea 100%)",
  },
  {
    id: "aurora",
    name: "Aurora Flow",
    kind: "animated",
    background: "linear-gradient(135deg, #0b1020 0%, #13203a 45%, #0d2b2a 100%)",
    className: "wp-aurora",
  },
  {
    id: "nebula",
    name: "Nebula",
    kind: "animated",
    background: "linear-gradient(140deg, #171226 0%, #221a3a 45%, #101726 100%)",
    className: "wp-nebula",
  },
  {
    id: "orbit",
    name: "Orbit",
    kind: "animated",
    background: "linear-gradient(160deg, #101827 0%, #16202f 50%, #0b1119 100%)",
    className: "wp-orbit",
  },
];

export const ACCENTS = [
  { id: "indigo", name: "Indigo", value: "#4f5bd5" },
  { id: "teal", name: "Teal", value: "#178f8a" },
  { id: "amber", name: "Amber", value: "#c1802a" },
  { id: "rose", name: "Rose", value: "#c2557a" },
  { id: "violet", name: "Violet", value: "#7a5cd6" },
  { id: "ocean", name: "Ocean", value: "#2f7fbf" },
  { id: "graphite", name: "Graphite", value: "#55657a" },
];

export const DEFAULT_SETTINGS: OSSettings = {
  displayName: "User",
  avatarColor: "#4f5bd5",
  theme: "light",
  accent: "#4f5bd5",
  wallpaper: "meridian",
  wallpaperKind: "preset",
  wallpaperBlur: 0,
  wallpaperDim: 0,
  reducedMotion: false,
  fontScale: 100,
  uiScale: 100,
  highContrast: false,
  largeCursor: false,
  taskbarPosition: "bottom",
  taskbarAlign: "center",
  taskbarTransparent: true,
  taskbarLabels: false,
  clock24h: false,
  showSeconds: false,
  showDate: true,
  desktopIcons: true,
  showHiddenFiles: false,
  doubleClickOpen: true,
  animations: true,
  transparency: true,
  sounds: true,
  notificationSounds: true,
  startupChime: true,
  lockWallpaper: "slate",
  screensaver: "none",
  screensaverMinutes: 5,
  widgets: ["greeting", "clock", "weather", "system"],
  brightness: 100,
  volume: 62,
  nightLight: false,
  compactMode: false,
  gridSnap: true,
  iconSize: "md",
  startupApps: ["files"],
  updateChannel: "stable",
  autoUpdates: true,
  developerMode: false,
  guestSession: false,
  defaultBrowser: "browser",
  preferredEditor: "code",
  safeMode: false,
  secondDisplay: false,
  monitorLayout: "extend",
  notificationBanner: true,
  appPermissionMode: "ask",
  pinnedApps: ["files", "browser", "terminal", "store", "settings"],
  showBootAnimation: true,
  powerPlan: "balanced",
};

const SETTINGS_KEY = "windos.settings.v1";

export function loadSettings(): OSSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<OSSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed, widgets: parsed.widgets ?? DEFAULT_SETTINGS.widgets };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: OSSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* storage may be full or blocked */
  }
}

export function wallpaperById(id: string): Wallpaper {
  return WALLPAPERS.find((w) => w.id === id) ?? WALLPAPERS[0];
}

export interface SettingSearchEntry {
  id: string;
  label: string;
  section: string;
  keywords: string;
}

export const SETTINGS_INDEX: SettingSearchEntry[] = [
  { id: "system", label: "System overview", section: "System", keywords: "about device name version" },
  { id: "display", label: "Display", section: "System", keywords: "resolution scaling brightness night light second monitor" },
  { id: "sound-settings", label: "Sound", section: "System", keywords: "volume mute notification startup chime" },
  { id: "power", label: "Power and battery", section: "System", keywords: "sleep shutdown restart battery saver plan" },
  { id: "storage", label: "Storage", section: "System", keywords: "drive space usage quota trash" },
  { id: "personalization", label: "Personalisation", section: "Personalisation", keywords: "theme wallpaper accent dark light" },
  { id: "taskbar", label: "Taskbar", section: "Personalisation", keywords: "position alignment labels transparency" },
  { id: "startup", label: "Startup", section: "Apps", keywords: "startup apps boot" },
  { id: "installed", label: "Installed apps", section: "Apps", keywords: "applications uninstall size version" },
  { id: "defaults", label: "Default apps", section: "Apps", keywords: "browser editor associations" },
  { id: "permissions", label: "App permissions", section: "Privacy & security", keywords: "camera microphone notifications clipboard files" },
  { id: "safe-mode", label: "Safe mode", section: "Privacy & security", keywords: "secure boot disable startup" },
  { id: "accessibility", label: "Accessibility", section: "Accessibility", keywords: "contrast motion cursor text speech magnifier" },
  { id: "updates", label: "Windows Update", section: "Windows Update", keywords: "update channel version restore" },
  { id: "reset", label: "Reset this PC", section: "Recovery", keywords: "factory reset wipe delete data" },
  { id: "about", label: "About WindOS", section: "About", keywords: "version creator anyel gonzalez registry features" },
];
