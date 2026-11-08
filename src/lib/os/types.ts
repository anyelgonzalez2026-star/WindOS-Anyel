import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";

export type ThemeMode = "light" | "dark";
export type WallpaperKind = "preset" | "custom" | "animated";
export type PowerState =
  | "boot"
  | "welcome"
  | "tutorial"
  | "desktop"
  | "locked"
  | "sleep"
  | "shutting-down"
  | "restarting"
  | "signed-out"
  | "recovery"
  | "off";

export interface OSSettings {
  displayName: string;
  avatarColor: string;
  theme: ThemeMode;
  accent: string;
  wallpaper: string;
  wallpaperKind: WallpaperKind;
  wallpaperBlur: number;
  wallpaperDim: number;
  reducedMotion: boolean;
  fontScale: number;
  uiScale: number;
  highContrast: boolean;
  largeCursor: boolean;
  taskbarPosition: "bottom" | "top";
  taskbarAlign: "center" | "left";
  taskbarTransparent: boolean;
  taskbarLabels: boolean;
  clock24h: boolean;
  showSeconds: boolean;
  showDate: boolean;
  desktopIcons: boolean;
  showHiddenFiles: boolean;
  doubleClickOpen: boolean;
  animations: boolean;
  transparency: boolean;
  sounds: boolean;
  notificationSounds: boolean;
  startupChime: boolean;
  lockWallpaper: string;
  screensaver: "none" | "aurora" | "bubbles" | "clock" | "stars";
  screensaverMinutes: number;
  widgets: string[];
  brightness: number;
  volume: number;
  nightLight: boolean;
  compactMode: boolean;
  gridSnap: boolean;
  iconSize: "sm" | "md" | "lg";
  startupApps: string[];
  updateChannel: "stable" | "fast" | "developer";
  autoUpdates: boolean;
  developerMode: boolean;
  guestSession: boolean;
  defaultBrowser: string;
  preferredEditor: string;
  safeMode: boolean;
  secondDisplay: boolean;
  monitorLayout: "extend" | "duplicate";
  notificationBanner: boolean;
  appPermissionMode: "ask" | "auto";
  pinnedApps: string[];
  showBootAnimation: boolean;
  powerPlan: "balanced" | "saver" | "performance";
}

export interface DesktopIconPos {
  x: number;
  y: number;
}

export interface FSNode {
  id: string;
  name: string;
  type: "file" | "folder";
  parentId: string | null;
  content?: string;
  mime?: string;
  size: number;
  createdAt: number;
  modifiedAt: number;
  trashed?: boolean;
  originalParentId?: string | null;
  favorite?: boolean;
  locked?: boolean;
}

export interface OSWindow {
  id: string;
  appId: string;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minimized: boolean;
  maximized: boolean;
  z: number;
  desktop: number;
  monitor: number;
  payload?: Record<string, unknown>;
  restoring?: { x: number; y: number; w: number; h: number };
}

export interface OSProcess {
  pid: number;
  appId: string;
  name: string;
  startedAt: number;
  state: "running" | "idle" | "suspended" | "starting";
  cpu: number;
  memory: number;
  windowId?: string;
  system?: boolean;
  responsiveness: number;
}

export type PermissionKind =
  | "files"
  | "camera"
  | "microphone"
  | "notifications"
  | "clipboard"
  | "screen"
  | "network"
  | "location"
  | "storage";

export interface PermissionGrant {
  appId: string;
  kind: PermissionKind;
  granted: boolean;
  at: number;
}

export interface SecurityEvent {
  id: string;
  at: number;
  level: "info" | "warning" | "critical";
  title: string;
  detail: string;
  appId?: string;
}

export interface OSNotification {
  id: string;
  appId: string;
  title: string;
  body: string;
  at: number;
  read: boolean;
  actions?: { label: string; appId: string }[];
}

export interface ClipboardEntry {
  id: string;
  text: string;
  at: number;
  pinned: boolean;
  source: string;
}

export interface InstalledApp {
  id: string;
  version: string;
  installedAt: number;
  autoUpdate: boolean;
  source: "builtin" | "store" | "package";
}

export interface RestorePoint {
  id: string;
  label: string;
  at: number;
  kind: "manual" | "auto" | "update";
  appCount: number;
  fileCount: number;
  checksum: string;
  snapshot: string;
}

export interface UpdateRecord {
  id: string;
  at: number;
  from: string;
  to: string;
  channel: string;
}

export interface QuickSettings {
  wifi: boolean;
  bluetooth: boolean;
  airplane: boolean;
  batterySaver: boolean;
  focusAssist: boolean;
  nightLight: boolean;
  mobileHotspot: boolean;
  nearbySharing: boolean;
}

export interface AppDefinition {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  category: string;
  publisher: string;
  version: string;
  sizeMb: number;
  rating: number;
  ratingCount: number;
  builtin: boolean;
  featured?: boolean;
  permissions: PermissionKind[];
  tagline: string;
  featuredRank?: number;
  defaultSize: { w: number; h: number };
  systemCritical?: boolean;
  hidden?: boolean;
}

export interface AppProps {
  windowId: string;
  payload?: Record<string, unknown>;
}

export type AppComponent = ComponentType<AppProps>;

export interface StorePackage {
  app: AppDefinition;
  screenshots: { title: string; from: string; to: string }[];
  whatsNew: string[];
  installs: string;
}

export interface FeatureEntry {
  id: string;
  name: string;
  description: string;
  category: string;
  app: string;
  status: "implemented" | "limited";
  verified: boolean;
  note?: string;
}

export interface FeatureCategory {
  id: string;
  name: string;
  icon: LucideIcon;
  blurb: string;
  features: Omit<FeatureEntry, "id" | "category">[];
}

export interface SystemStats {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  gpu: number;
  history: { cpu: number[]; memory: number[]; disk: number[]; network: number[] };
}
