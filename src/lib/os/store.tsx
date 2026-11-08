import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type {
  AppDefinition,
  ClipboardEntry,
  DesktopIconPos,
  FeatureEntry,
  FSNode,
  InstalledApp,
  OSNotification,
  OSProcess,
  OSSettings,
  OSWindow,
  PermissionGrant,
  PermissionKind,
  PowerState,
  QuickSettings,
  RestorePoint,
  SecurityEvent,
  SystemStats,
} from "./types";
import { APPS, APP_MAP, PREINSTALLED } from "./registry";
import {
  SEED_FOLDERS,
  VirtualFileSystem,
  type SerializedFS,
} from "./fs";
import { checksum, kvAvailable, kvDel, kvGet, kvSet, storageEstimate } from "./db";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  SETTINGS_INDEX,
  type SettingSearchEntry,
} from "./settings";
import { HELP_TOPICS, searchHelp, type HelpTopic } from "./help";
import { searchFeatures } from "./features";
import { FEATURE_REGISTRY } from "./features";
import { playSound } from "./sound";

export interface SearchResults {
  apps: AppDefinition[];
  files: FSNode[];
  settings: SettingSearchEntry[];
  features: FeatureEntry[];
  topics: HelpTopic[];
  actions: { id: string; label: string; description: string; run: () => void }[];
}

export interface PermissionPrompt {
  appId: string;
  kind: PermissionKind;
}

export interface BackupOptions {
  includeSettings: boolean;
  includeFiles: boolean;
  includeApps: boolean;
  includeClipboard: boolean;
}

export interface BackupPayload {
  product: string;
  version: string;
  createdAt: number;
  checksum: string;
  data: {
    settings: OSSettings;
    fs: SerializedFS;
    installed: InstalledApp[];
    grants: Record<string, PermissionGrant>;
    quick: QuickSettings;
    clipboard: ClipboardEntry[];
    desktops: DesktopSpec[];
    appStorage: Record<string, string>;
  };
}

export interface DesktopSpec {
  id: string;
  name: string;
}

export interface OSContextValue {
  ready: boolean;
  fsReady: boolean;
  fsPersistent: boolean;
  power: PowerState;
  settings: OSSettings;
  updateSettings: (patch: Partial<OSSettings>) => void;
  resetSettings: () => void;
  onboarded: boolean;
  guest: boolean;
  fs: VirtualFileSystem;
  fsVersion: number;
  windows: OSWindow[];
  activeWindowId: string | null;
  openApp: (appId: string, payload?: Record<string, unknown>) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  toggleMaximize: (id: string) => void;
  setWindowBounds: (id: string, bounds: Partial<Pick<OSWindow, "x" | "y" | "w" | "h">>) => void;
  moveWindowToDesktop: (id: string, desktop: number) => void;
  moveWindowToMonitor: (id: string, monitor: number) => void;
  minimizeAll: () => void;
  restoreApp: (appId: string) => void;
  togglePinApp: (appId: string) => void;
  desktops: DesktopSpec[];
  activeDesktop: number;
  setActiveDesktop: (index: number) => void;
  addDesktop: () => void;
  removeDesktop: (id: string) => void;
  renameDesktop: (id: string, name: string) => void;
  processes: OSProcess[];
  killProcess: (pid: number) => void;
  stats: SystemStats;
  bootedAt: number;
  notifications: OSNotification[];
  unreadCount: number;
  notify: (input: { appId: string; title: string; body: string; actions?: { label: string; appId: string }[] }) => void;
  markNotificationsRead: () => void;
  dismissNotification: (id: string) => void;
  clearNotifications: () => void;
  grants: Record<string, PermissionGrant>;
  hasPermission: (appId: string, kind: PermissionKind) => boolean;
  requestPermission: (appId: string, kind: PermissionKind) => Promise<boolean>;
  revokePermission: (appId: string, kind: PermissionKind) => void;
  permissionPrompt: PermissionPrompt | null;
  answerPermission: (allow: boolean) => void;
  securityEvents: SecurityEvent[];
  logEvent: (event: Omit<SecurityEvent, "id" | "at">) => void;
  clearSecurityEvents: () => void;
  installed: InstalledApp[];
  installApp: (id: string) => void;
  uninstallApp: (id: string) => boolean;
  updateApp: (id: string) => void;
  applyAllUpdates: () => RestorePoint | null;
  appUpdates: { app: AppDefinition; from: string }[];
  isInstalled: (id: string) => boolean;
  quick: QuickSettings;
  setQuick: (patch: Partial<QuickSettings>) => void;
  clipboard: ClipboardEntry[];
  copyText: (text: string, source?: string) => Promise<boolean>;
  copyEntry: (entry: ClipboardEntry) => Promise<void>;
  readClipboard: (appId?: string) => Promise<string>;
  togglePinEntry: (id: string) => void;
  removeClipboardEntry: (id: string) => void;
  clearClipboard: (includePinned?: boolean) => void;
  searchAll: (query: string) => SearchResults;
  lock: () => void;
  unlock: () => void;
  sleep: () => void;
  restart: () => void;
  shutdown: () => void;
  powerOn: () => void;
  signOut: () => void;
  startGuest: () => void;
  endGuest: () => void;
  enterRecovery: () => void;
  bootSafeMode: () => void;
  completeBoot: () => void;
  completeWelcome: (profile: Partial<OSSettings>) => void;
  completeTutorial: () => void;
  restorePoints: RestorePoint[];
  createRestorePoint: (label: string, kind?: RestorePoint["kind"]) => RestorePoint;
  applyRestorePoint: (id: string, mode: "settings" | "files" | "full") => boolean;
  deleteRestorePoint: (id: string) => void;
  lastBackupAt: number;
  buildBackup: (options: BackupOptions, record?: boolean) => string;
  importBackup: (json: string, mode: "replace" | "merge") => { files: number };
  wipeAll: () => Promise<void>;
  storage: { usage: number; quota: number };
  iconPositions: Record<string, DesktopIconPos>;
  setIconPosition: (key: string, pos: DesktopIconPos) => void;
  resetIconPositions: () => void;
  screensaverActive: boolean;
  setScreensaverActive: (value: boolean) => void;
  systemError: string | null;
  setSystemError: (value: string | null) => void;
}

const OSContext = createContext<OSContextValue | null>(null);

export function useOS(): OSContextValue {
  const ctx = useContext(OSContext);
  if (!ctx) throw new Error("useOS must be used inside OSProvider");
  return ctx;
}

const INSTALLED_KEY = "windos.installed.v1";
const GRANTS_KEY = "windos.grants.v1";
const CLIP_KEY = "windos.clipboard.v1";
const QUICK_KEY = "windos.quick.v1";
const DESKTOP_KEY = "windos.desktops.v1";
const RP_KEY = "windos.restorepoints.v1";
const ICONS_KEY = "windos.icons.v1";
const BACKUP_TIME_KEY = "windos.lastbackup.v1";
const ONBOARD_KEY = "windos.onboarded.v1";
const GUEST_BACKUP_KEY = "windos.guest.backup.v1";

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or privacy mode */
  }
};

function defaultInstalled(): InstalledApp[] {
  return PREINSTALLED.map((id) => {
    const app = APP_MAP.get(id);
    return {
      id,
      // Two preinstalled packages intentionally trail the catalogue so the
      // update flow is demonstrable out of the box.
      version: id === "notes" || id === "weather" ? "0.9.0" : app?.version ?? "1.0.0",
      installedAt: Date.now(),
      autoUpdate: true,
      source: "builtin" as const,
    };
  });
}

const DEFAULT_QUICK: QuickSettings = {
  wifi: true,
  bluetooth: false,
  airplane: false,
  batterySaver: false,
  focusAssist: false,
  nightLight: false,
  mobileHotspot: false,
  nearbySharing: false,
};

const DEFAULT_STATS: SystemStats = {
  cpu: 14,
  memory: 36,
  disk: 42,
  network: 3,
  gpu: 8,
  history: { cpu: [12, 18, 14, 22, 17], memory: [31, 33, 35, 36, 36], disk: [42, 42, 42, 42, 42], network: [2, 5, 3, 8, 3] },
};

function versionGreater(a: string, b: string): boolean {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return true;
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return false;
  }
  return false;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function collectAppStorage(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.startsWith("windos.app.")) {
        const value = localStorage.getItem(key);
        if (value != null) out[key] = value;
      }
    }
  } catch {
    /* ignore */
  }
  return out;
}

export function OSProvider({ children }: { children: ReactNode }) {
  const fsRef = useRef<VirtualFileSystem | null>(null);
  if (!fsRef.current) fsRef.current = new VirtualFileSystem();
  const fs = fsRef.current;
  const fsVersion = useSyncExternalStore(fs.subscribe, fs.getVersion, fs.getVersion);

  const [settings, setSettings] = useState<OSSettings>(() => loadSettings());
  const [onboarded, setOnboarded] = useState<boolean>(() => localStorage.getItem(ONBOARD_KEY) === "1");
  const [ready, setReady] = useState(false);
  const [fsReady, setFsReady] = useState(false);
  const [fsPersistent, setFsPersistent] = useState(true);
  const [power, setPower] = useState<PowerState>("boot");
  const [guest, setGuest] = useState(false);
  const [bootedAt, setBootedAt] = useState(0);

  const [windows, setWindows] = useState<OSWindow[]>([]);
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
  const zCounter = useRef(20);
  const pidCounter = useRef(1200);
  const sessionStarted = useRef(false);
  const updateCheckNotified = useRef(false);
  const storageWarned = useRef(false);

  const [desktops, setDesktops] = useState<DesktopSpec[]>(() =>
    readJson<DesktopSpec[]>(DESKTOP_KEY, [
      { id: "desk-1", name: "Desktop 1" },
      { id: "desk-2", name: "Desktop 2" },
    ]),
  );
  const [activeDesktop, setActiveDesktopState] = useState(0);

  const [processes, setProcesses] = useState<OSProcess[]>([]);
  const [stats, setStats] = useState<SystemStats>(DEFAULT_STATS);

  const [notifications, setNotifications] = useState<OSNotification[]>([]);
  const [installed, setInstalled] = useState<InstalledApp[]>(() =>
    readJson<InstalledApp[]>(INSTALLED_KEY, defaultInstalled()),
  );
  const [grants, setGrants] = useState<Record<string, PermissionGrant>>(() => {
    const stored = readJson<Record<string, PermissionGrant>>(GRANTS_KEY, {});
    const next = { ...stored };
    // Built-in WindOS applications may post notifications by default. Explicit
    // revocations are preserved, and store-installed apps still ask first.
    for (const appId of PREINSTALLED) {
      const key = `${appId}:notifications`;
      if (!next[key]) next[key] = { appId, kind: "notifications", granted: true, at: Date.now() };
    }
    return next;
  });
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [clipboard, setClipboard] = useState<ClipboardEntry[]>(() =>
    readJson<ClipboardEntry[]>(CLIP_KEY, []),
  );
  const [quick, setQuickState] = useState<QuickSettings>(() =>
    readJson<QuickSettings>(QUICK_KEY, DEFAULT_QUICK),
  );
  const [restorePoints, setRestorePoints] = useState<RestorePoint[]>([]);
  const [lastBackupAt, setLastBackupAt] = useState<number>(() =>
    parseInt(localStorage.getItem(BACKUP_TIME_KEY) ?? "0", 10) || 0,
  );
  const [iconPositions, setIconPositions] = useState<Record<string, DesktopIconPos>>(() =>
    readJson<Record<string, DesktopIconPos>>(ICONS_KEY, {}),
  );
  const [storage, setStorage] = useState({ usage: 0, quota: 0 });
  const [screensaverActive, setScreensaverActive] = useState(false);
  const [systemError, setSystemError] = useState<string | null>(null);

  const [permissionPrompt, setPermissionPrompt] = useState<PermissionPrompt | null>(null);
  const permissionResolver = useRef<((value: boolean) => void) | null>(null);
  const guestSettingsBackup = useRef<OSSettings | null>(null);

  // ------------------------------------------------------------------ effects
  useEffect(() => {
    saveSettings(settings);
    const root = document.documentElement;
    root.classList.toggle("dark", settings.theme === "dark");
    root.style.setProperty("--primary", settings.accent);
    root.style.setProperty("--ring", settings.accent);
    root.style.setProperty("--os-accent", settings.accent);
    root.style.setProperty("--os-font-scale", `${settings.fontScale}%`);
    root.style.setProperty("--os-ui-scale", String(settings.uiScale / 100));
    root.classList.toggle("os-high-contrast", settings.highContrast);
    root.classList.toggle("os-reduce-motion", settings.reducedMotion || !settings.animations);
    root.classList.toggle("os-large-cursor", settings.largeCursor);
    root.classList.toggle("os-compact", settings.compactMode);
    root.classList.toggle("os-guest", guest);
    root.style.colorScheme = settings.theme;
  }, [settings, guest]);

  // A guest profile is temporary. If the page was reloaded mid-guest-session,
  // restore the personal profile instead of leaving a guest-locked settings set
  // persisted with a writable drive.
  useEffect(() => {
    fs.readOnly = false;
    if (!settings.guestSession) return;
    try {
      const raw = localStorage.getItem(GUEST_BACKUP_KEY);
      if (raw) setSettings(JSON.parse(raw) as OSSettings);
    } catch {
      /* fall back to clearing the guest flag below */
    }
    try {
      localStorage.removeItem(GUEST_BACKUP_KEY);
    } catch {
      /* ignore */
    }
    setGuest(false);
    setSettings((prev) => (prev.guestSession ? { ...prev, guestSession: false, displayName: prev.displayName === "Guest" ? "User" : prev.displayName } : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    writeJson(INSTALLED_KEY, installed);
  }, [installed]);

  useEffect(() => {
    writeJson(GRANTS_KEY, grants);
  }, [grants]);

  useEffect(() => {
    writeJson(CLIP_KEY, clipboard.slice(0, 60));
  }, [clipboard]);

  useEffect(() => {
    writeJson(QUICK_KEY, quick);
  }, [quick]);

  useEffect(() => {
    writeJson(DESKTOP_KEY, desktops);
  }, [desktops]);

  useEffect(() => {
    writeJson(ICONS_KEY, iconPositions);
  }, [iconPositions]);

  useEffect(() => {
    void storageEstimate().then(setStorage);
  }, [restorePoints.length, lastBackupAt, fsVersion]);

  // Initial load: virtual filesystem, restore points, real storage.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await kvGet<SerializedFS>("fs.v1");
      if (cancelled) return;
      if (stored && Array.isArray(stored.nodes) && stored.nodes.length) {
        fs.replace(stored);
      }
      setFsPersistent(await kvAvailable());
      setFsReady(true);
      setReady(true);
      const rp = await kvGet<RestorePoint[]>(RP_KEY);
      if (!cancelled && Array.isArray(rp)) setRestorePoints(rp);
      const est = await storageEstimate();
      if (!cancelled) setStorage(est);
    })();
    return () => {
      cancelled = true;
    };
  }, [fs]);

  // Debounced filesystem persistence.
  useEffect(() => {
    let timer: number | undefined;
    const unsubscribe = fs.subscribe(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void kvSet("fs.v1", fs.serialize()).then((ok) => {
          if (!ok) setFsPersistent(false);
        });
      }, 650);
    });
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, [fs]);

  // Simulated performance metrics. Clearly not host measurements.
  useEffect(() => {
    const id = window.setInterval(() => {
      setStats((prev) => {
        const load = windows.filter((w) => !w.minimized).length;
        const planFactor = settings.powerPlan === "saver" ? 0.72 : settings.powerPlan === "performance" ? 1.16 : 1;
        const cpu = clamp((prev.cpu + (Math.random() - 0.5) * 12 + load * 0.6) * planFactor, 4, 94);
        const mem = clamp((30 + windows.length * 4 + Math.random() * 8) * (settings.powerPlan === "saver" ? 0.88 : settings.powerPlan === "performance" ? 1.08 : 1), 18, 90);
        const network = clamp(prev.network + (Math.random() - 0.5) * 7, 0, 60);
        return {
          cpu: Math.round(cpu),
          memory: Math.round(mem),
          disk: 42,
          network: Math.round(network),
          gpu: Math.round(clamp(prev.gpu + (Math.random() - 0.5) * 5, 3, 40)),
          history: {
            cpu: [...prev.history.cpu.slice(-29), Math.round(cpu)],
            memory: [...prev.history.memory.slice(-29), Math.round(mem)],
            disk: [...prev.history.disk.slice(-29), 42],
            network: [...prev.history.network.slice(-29), Math.round(network)],
          },
        };
      });
      setProcesses((prev) =>
        prev.map((proc) => ({
          ...proc,
          cpu: Math.round(clamp(proc.cpu + (Math.random() - 0.5) * 4, 0, 64)),
          memory: Math.round(clamp(proc.memory + (Math.random() - 0.5) * 6, 8, 420)),
        })),
      );
    }, 1800);
    return () => window.clearInterval(id);
  }, [windows.length, settings.powerPlan]);

  // Calendars/tasks reminder notifications are sent by those apps directly.
  useEffect(() => {
    if (power === "desktop" && settings.startupChime && settings.sounds && !sessionStarted.current) {
      playSound("startup", true);
    }
  }, [power, settings.startupChime, settings.sounds]);

  // --------------------------------------------------------------- core utils
  function logEvent(event: Omit<SecurityEvent, "id" | "at">) {
    setSecurityEvents((prev) =>
      [
        {
          ...event,
          id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          at: Date.now(),
        },
        ...prev,
      ].slice(0, 250),
    );
  }

  function isInstalled(id: string) {
    return installed.some((app) => app.id === id);
  }

  function hasPermission(appId: string, kind: PermissionKind): boolean {
    if (kind === "files") return isInstalled(appId) || appId === "WindOS";
    if (appId === "WindOS" || appId === "system") return true;
    const grant = grants[`${appId}:${kind}`];
    return Boolean(grant?.granted);
  }

  function requestPermission(appId: string, kind: PermissionKind): Promise<boolean> {
    if (hasPermission(appId, kind)) return Promise.resolve(true);
    const existing = grants[`${appId}:${kind}`];
    if (existing && !existing.granted) return Promise.resolve(false);
    if (settings.guestSession) return Promise.resolve(false);
    if (settings.appPermissionMode === "auto") {
      setGrants((prev) => ({
        ...prev,
        [`${appId}:${kind}`]: { appId, kind, granted: true, at: Date.now() },
      }));
      logEvent({
        level: "info",
        title: "Permission auto-granted",
        detail: `${APP_MAP.get(appId)?.name ?? appId} was granted ${kind} (automatic mode).`,
        appId,
      });
      return Promise.resolve(true);
    }
    return new Promise<boolean>((resolve) => {
      permissionResolver.current = resolve;
      setPermissionPrompt({ appId, kind });
    });
  }

  function answerPermission(allow: boolean) {
    if (!permissionPrompt) return;
    const { appId, kind } = permissionPrompt;
    setGrants((prev) => ({
      ...prev,
      [`${appId}:${kind}`]: { appId, kind, granted: allow, at: Date.now() },
    }));
    logEvent({
      level: allow ? "info" : "warning",
      title: allow ? "Permission granted" : "Permission denied",
      detail: `${APP_MAP.get(appId)?.name ?? appId} requested ${kind}.`,
      appId,
    });
    permissionResolver.current?.(allow);
    permissionResolver.current = null;
    setPermissionPrompt(null);
  }

  function revokePermission(appId: string, kind: PermissionKind) {
    setGrants((prev) => ({
      ...prev,
      [`${appId}:${kind}`]: { appId, kind, granted: false, at: Date.now() },
    }));
    logEvent({
      level: "info",
      title: "Permission revoked",
      detail: `${kind} access was revoked for ${APP_MAP.get(appId)?.name ?? appId}.`,
      appId,
    });
  }

  function notify(input: {
    appId: string;
    title: string;
    body: string;
    actions?: { label: string; appId: string }[];
  }) {
    const known = APP_MAP.get(input.appId) ?? APPS.find((app) => app.name === input.appId);
    const appId = known?.id ?? input.appId;
    if (appId !== "WindOS" && appId !== "system" && !hasPermission(appId, "notifications")) {
      logEvent({
        level: "warning",
        title: "Notification blocked",
        detail: `${known?.name ?? input.appId} tried to notify without permission.`,
        appId,
      });
      return;
    }
    const notification: OSNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      appId,
      title: input.title,
      body: input.body,
      at: Date.now(),
      read: false,
      actions: input.actions,
    };
    setNotifications((prev) => [notification, ...prev].slice(0, 80));
    if (!quick.focusAssist && settings.notificationSounds && settings.sounds) {
      playSound("notify", true);
    }
  }

  function updateSettings(patch: Partial<OSSettings>) {
    setSettings((prev) => ({ ...prev, ...patch }));
  }

  function setQuick(patch: Partial<QuickSettings>) {
    setQuickState((prev) => {
      const next = { ...prev, ...patch };
      if (patch.airplane === true) {
        next.wifi = false;
        next.bluetooth = false;
      } else if (patch.airplane === false) {
        next.wifi = true;
      }
      if (patch.wifi === true && prev.airplane && patch.airplane === undefined) {
        next.airplane = false;
      }
      return next;
    });
    if (patch.nightLight !== undefined) {
      setSettings((prev) => ({ ...prev, nightLight: patch.nightLight! }));
    }
  }

  // -------------------------------------------------------------- window layer
  function nextPid() {
    pidCounter.current += 1;
    return pidCounter.current;
  }

  function openApp(appId: string, payload?: Record<string, unknown>) {
    const def = APP_MAP.get(appId);
    if (!def) return;
    if (!isInstalled(appId)) {
      notify({
        appId: "WindOS",
        title: "App not installed",
        body: `${def.name} is not installed. Open WindStore to install it.`,
        actions: [{ label: "Open Store", appId: "store" }],
      });
      return;
    }
    if (settings.safeMode && !def.builtin) {
      logEvent({ level: "warning", title: "Blocked in safe mode", detail: `${def.name} cannot start in safe mode.`, appId });
      return;
    }
    const existing = windows.find((w) => w.appId === appId && w.desktop === activeDesktop);
    if (existing) {
      setWindows((prev) =>
        prev.map((w) =>
          w.id === existing.id
            ? { ...w, payload: payload ?? w.payload, minimized: false, z: ++zCounter.current }
            : w,
        ),
      );
      setActiveWindowId(existing.id);
      return;
    }
    const count = windows.filter((w) => w.desktop === activeDesktop).length;
    const viewportW = typeof window !== "undefined" ? window.innerWidth : 1280;
    const viewportH = typeof window !== "undefined" ? window.innerHeight : 800;
    const width = Math.min(def.defaultSize.w, Math.max(320, viewportW - 32));
    const height = Math.min(def.defaultSize.h, Math.max(300, viewportH - 140));
    const x = Math.max(10, Math.min(110 + count * 26, viewportW - width - 20));
    const y = Math.max(10, Math.min(54 + count * 22, viewportH - height - 110));
    const win: OSWindow = {
      id: `win_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      appId,
      title: def.name,
      x,
      y,
      w: width,
      h: height,
      minimized: false,
      maximized: false,
      z: ++zCounter.current,
      desktop: activeDesktop,
      monitor: 1,
      payload,
    };
    setWindows((prev) => [...prev, win]);
    setActiveWindowId(win.id);
    setProcesses((prev) => [
      ...prev,
      {
        pid: nextPid(),
        appId,
        name: def.name,
        startedAt: Date.now(),
        state: "running",
        cpu: Math.round(4 + Math.random() * 12),
        memory: Math.round(60 + Math.random() * 120),
        windowId: win.id,
        responsiveness: 100,
      },
    ]);
    void storageEstimate().then(setStorage);
  }

  function closeWindow(id: string) {
    setWindows((prev) => {
      const remaining = prev.filter((w) => w.id !== id);
      setActiveWindowId((active) => {
        if (active !== id) return active;
        const top = [...remaining].sort((a, b) => b.z - a.z)[0];
        return top?.id ?? null;
      });
      return remaining;
    });
    setProcesses((prev) => prev.filter((p) => p.windowId !== id));
  }

  function focusWindow(id: string) {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, z: ++zCounter.current, minimized: false } : w)),
    );
    setActiveWindowId(id);
  }

  function minimizeWindow(id: string) {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, minimized: true } : w)));
    setActiveWindowId((active) => (active === id ? null : active));
  }

  function toggleMaximize(id: string) {
    setWindows((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        if (w.maximized) {
          const r = w.restoring ?? { x: w.x, y: w.y, w: 900, h: 600 };
          return { ...w, maximized: false, ...r, restoring: undefined };
        }
        return {
          ...w,
          maximized: true,
          restoring: { x: w.x, y: w.y, w: w.w, h: w.h },
          z: ++zCounter.current,
        };
      }),
    );
    setActiveWindowId(id);
  }

  function setWindowBounds(id: string, bounds: Partial<Pick<OSWindow, "x" | "y" | "w" | "h">>) {
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, ...bounds, maximized: bounds.w !== undefined ? false : w.maximized } : w,
      ),
    );
  }

  function moveWindowToDesktop(id: string, desktop: number) {
    if (desktop < 0 || desktop >= desktops.length) return;
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, desktop, minimized: false } : w)));
  }

  function moveWindowToMonitor(id: string, monitor: number) {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, monitor, maximized: false, x: 40, y: 40 } : w)));
  }

  function minimizeAll() {
    setWindows((prev) => prev.map((w) => (w.desktop === activeDesktop ? { ...w, minimized: true } : w)));
    setActiveWindowId(null);
  }

  function restoreApp(appId: string) {
    const candidates = windows.filter((w) => w.appId === appId && w.desktop === activeDesktop);
    const target = candidates.sort((a, b) => Number(a.minimized) - Number(b.minimized) || b.z - a.z)[0];
    if (!target) {
      openApp(appId);
      return;
    }
    focusWindow(target.id);
  }

  function togglePinApp(appId: string) {
    updateSettings({
      pinnedApps: settings.pinnedApps.includes(appId)
        ? settings.pinnedApps.filter((id) => id !== appId)
        : [...settings.pinnedApps, appId].slice(0, 8),
    });
  }

  function setActiveDesktop(index: number) {
    if (index < 0 || index >= desktops.length) return;
    setActiveDesktopState(index);
    setActiveWindowId(null);
  }

  function addDesktop() {
    setDesktops((prev) => [
      ...prev,
      { id: `desk_${Date.now()}`, name: `Desktop ${prev.length + 1}` },
    ]);
  }

  function removeDesktop(id: string) {
    if (desktops.length <= 1) return;
    const index = desktops.findIndex((d) => d.id === id);
    if (index < 0) return;
    const remaining = desktops.filter((d) => d.id !== id);
    setDesktops(remaining);
    setWindows((prev) =>
      prev.map((w) => {
        if (w.desktop === index) return { ...w, desktop: Math.max(0, index - 1) };
        if (w.desktop > index) return { ...w, desktop: w.desktop - 1 };
        return w;
      }),
    );
    setActiveDesktopState((active) => Math.min(active, remaining.length - 1));
  }

  function renameDesktop(id: string, name: string) {
    setDesktops((prev) => prev.map((d) => (d.id === id ? { ...d, name } : d)));
  }

  function killProcess(pid: number) {
    const proc = processes.find((p) => p.pid === pid);
    if (!proc) return;
    if (proc.system) {
      logEvent({
        level: "warning",
        title: "Protected process",
        detail: `${proc.name} is a critical WindOS service and cannot be terminated.`,
      });
      notify({ appId: "WindOS", title: "Process protected", body: `${proc.name} is required by WindOS and cannot be ended.` });
      return;
    }
    if (proc.windowId) {
      closeWindow(proc.windowId);
    } else {
      setProcesses((prev) => prev.filter((p) => p.pid !== pid));
    }
    logEvent({ level: "info", title: "Process ended", detail: `PID ${pid} (${proc.name}) was terminated by the user.` });
  }

  // ------------------------------------------------------------- session start
  function startSession() {
    if (sessionStarted.current) return;
    sessionStarted.current = true;
    setBootedAt(Date.now());
    setProcesses([
      { pid: 4, appId: "system", name: "WindOS Shell", startedAt: Date.now(), state: "running", cpu: 2, memory: 96, system: true, responsiveness: 100 },
      { pid: 8, appId: "system", name: "Search Indexer", startedAt: Date.now(), state: "idle", cpu: 1, memory: 42, system: true, responsiveness: 100 },
      { pid: 12, appId: "system", name: "Security Service", startedAt: Date.now(), state: "running", cpu: 1, memory: 58, system: true, responsiveness: 100 },
      { pid: 16, appId: "system", name: "Storage Service", startedAt: Date.now(), state: "idle", cpu: 0, memory: 34, system: true, responsiveness: 100 },
      { pid: 20, appId: "system", name: "Update Manager", startedAt: Date.now(), state: "idle", cpu: 0, memory: 30, system: true, responsiveness: 100 },
    ]);
    if (!settings.safeMode && !settings.guestSession) {
      for (const appId of settings.startupApps) {
        if (installed.some((a) => a.id === appId) && appId !== "settings") {
          openApp(appId);
        }
      }
    }
  }

  function completeBoot() {
    setReady(true);
    if (onboarded) {
      setPower("desktop");
      startSession();
    } else {
      setPower("welcome");
    }
  }

  function completeWelcome(profile: Partial<OSSettings>) {
    updateSettings(profile);
    try {
      localStorage.setItem(ONBOARD_KEY, "1");
    } catch {
      /* ignore */
    }
    setOnboarded(true);
    setPower("tutorial");
  }

  function completeTutorial() {
    setPower("desktop");
    startSession();
    logEvent({ level: "info", title: "WindOS ready", detail: "First-run setup completed and the desktop session started." });
  }

  function lock() {
    setPower("locked");
    playSound("lock", settings.sounds);
    logEvent({ level: "info", title: "Session locked", detail: "The desktop was locked by the user." });
  }

  function unlock() {
    if (power === "locked" || power === "sleep" || power === "signed-out") {
      setPower("desktop");
      if (!sessionStarted.current) startSession();
    }
  }

  function sleep() {
    setPower("sleep");
    logEvent({ level: "info", title: "Sleep", detail: "WindOS entered a simulated sleep state." });
  }

  function restart() {
    playSound("shutdown", settings.sounds);
    setPower("restarting");
    window.setTimeout(() => {
      setWindows([]);
      setProcesses([]);
      setActiveWindowId(null);
      sessionStarted.current = false;
      setBootedAt(0);
      setPower("boot");
      logEvent({ level: "info", title: "Restart", detail: "WindOS restarted." });
    }, 1600);
  }

  function shutdown() {
    playSound("shutdown", settings.sounds);
    setPower("shutting-down");
    window.setTimeout(() => {
      setWindows([]);
      setProcesses([]);
      setActiveWindowId(null);
      sessionStarted.current = false;
      setPower("off");
      logEvent({ level: "info", title: "Shut down", detail: "WindOS was shut down." });
    }, 1400);
  }

  function powerOn() {
    setPower("boot");
  }

  function signOut() {
    setWindows([]);
    setProcesses([]);
    setActiveWindowId(null);
    sessionStarted.current = false;
    setPower("signed-out");
    logEvent({ level: "info", title: "Signed out", detail: "The simulated user session ended." });
  }

  function startGuest() {
    guestSettingsBackup.current = settings;
    try {
      localStorage.setItem(GUEST_BACKUP_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
    setGuest(true);
    fs.readOnly = true;
    setWindows([]);
    setProcesses([]);
    setActiveWindowId(null);
    sessionStarted.current = false;
    setSettings({ ...DEFAULT_SETTINGS, displayName: "Guest", guestSession: true, sounds: false });
    setPower("desktop");
    setBootedAt(Date.now());
    sessionStarted.current = true;
    setProcesses([
      { pid: 4, appId: "system", name: "WindOS Shell", startedAt: Date.now(), state: "running", cpu: 2, memory: 92, system: true, responsiveness: 100 },
      { pid: 12, appId: "system", name: "Security Service", startedAt: Date.now(), state: "running", cpu: 1, memory: 54, system: true, responsiveness: 100 },
    ]);
    logEvent({ level: "info", title: "Guest session", detail: "A temporary read-only guest session started." });
  }

  function endGuest() {
    fs.readOnly = false;
    setGuest(false);
    let restored = guestSettingsBackup.current;
    try {
      const raw = localStorage.getItem(GUEST_BACKUP_KEY);
      if (raw) restored = JSON.parse(raw) as OSSettings;
      localStorage.removeItem(GUEST_BACKUP_KEY);
    } catch {
      /* use the in-memory backup */
    }
    if (restored) setSettings({ ...restored, guestSession: false });
    guestSettingsBackup.current = null;
    setWindows([]);
    setProcesses([]);
    setActiveWindowId(null);
    sessionStarted.current = false;
    setPower("locked");
    logEvent({ level: "info", title: "Guest session ended", detail: "The personal profile was restored." });
  }

  function enterRecovery() {
    setPower("recovery");
    logEvent({ level: "warning", title: "Recovery mode", detail: "WindOS booted into the recovery environment." });
  }

  function bootSafeMode() {
    updateSettings({ safeMode: true });
    setWindows([]);
    setProcesses([]);
    sessionStarted.current = false;
    setPower("desktop");
    startSession();
    logEvent({ level: "warning", title: "Safe mode", detail: "Startup apps and new installs are disabled until safe mode is turned off." });
  }

  // ---------------------------------------------------------- package manager
  const appUpdates = installed.flatMap((inst) => {
    const def = APP_MAP.get(inst.id);
    if (def && versionGreater(def.version, inst.version)) return [{ app: def, from: inst.version }];
    return [];
  });

  // Automatic update checks are opt-out. This reports availability after boot;
  // applying packages still requires an explicit action in WindUpdate.
  useEffect(() => {
    if (power === "boot") {
      updateCheckNotified.current = false;
      return;
    }
    if (power !== "desktop" || !settings.autoUpdates || updateCheckNotified.current) return;
    updateCheckNotified.current = true;
    if (appUpdates.length === 0) return;
    const timer = window.setTimeout(() => {
      notify({
        appId: "WindOS",
        title: `${appUpdates.length} app update${appUpdates.length === 1 ? "" : "s"} available`,
        body: "Automatic update checks are on. Review the local packages in WindUpdate.",
        actions: [{ label: "Review updates", appId: "update" }],
      });
    }, 1600);
    return () => window.clearTimeout(timer);
    // appUpdates is derived from installed; its length is enough to avoid noisy re-checks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [power, settings.autoUpdates, appUpdates.length]);

  // Warn once when the simulated 512 MB drive crosses 90% usage.
  useEffect(() => {
    if (!fsReady || power !== "desktop") return;
    const ratio = fs.usage().bytes / (512 * 1024 * 1024);
    if (ratio >= 0.9 && !storageWarned.current) {
      storageWarned.current = true;
      notify({ appId: "WindOS", title: "Virtual drive almost full", body: "The WindOS drive is above 90% capacity. Empty the Recycle Bin or export large files." });
      logEvent({ level: "warning", title: "Storage threshold", detail: `Virtual drive usage reached ${Math.round(ratio * 100)}%.` });
    }
    if (ratio < 0.8) storageWarned.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fsVersion, fsReady, power]);

  function installApp(id: string) {
    const def = APP_MAP.get(id);
    if (!def || isInstalled(id)) return;
    if (settings.safeMode) {
      notify({ appId: "WindOS", title: "Safe mode is on", body: "Turn off safe mode in WindSecurity before installing apps." });
      return;
    }
    setInstalled((prev) => [
      ...prev,
      {
        id,
        version: def.version,
        installedAt: Date.now(),
        autoUpdate: true,
        source: def.builtin ? "builtin" : "store",
      },
    ]);
    setGrants((prev) => ({
      ...prev,
      [`${id}:files`]: { appId: id, kind: "files", granted: true, at: Date.now() },
    }));
    logEvent({ level: "info", title: "App installed", detail: `${def.name} ${def.version} was installed from WindStore.`, appId: id });
    notify({ appId: "WindOS", title: "Installation complete", body: `${def.name} is now available in Start and search.` });
    playSound("install", settings.sounds);
  }

  function uninstallApp(id: string): boolean {
    const def = APP_MAP.get(id);
    if (!def) return false;
    if (def.systemCritical) {
      notify({ appId: "WindOS", title: "Protected application", body: `${def.name} is part of WindOS and cannot be removed.` });
      return false;
    }
    const wasActive = windows.find((w) => w.id === activeWindowId)?.appId === id;
    setInstalled((prev) => prev.filter((a) => a.id !== id));
    setWindows((prev) => prev.filter((w) => w.appId !== id));
    setProcesses((prev) => prev.filter((p) => p.appId !== id));
    setGrants((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) if (key.startsWith(`${id}:`)) delete next[key];
      return next;
    });
    if (wasActive) setActiveWindowId(null);
    logEvent({ level: "warning", title: "App uninstalled", detail: `${def.name} was removed. User files were kept.`, appId: id });
    notify({ appId: "WindOS", title: "App removed", body: `${def.name} was uninstalled. Your files were not touched.` });
    return true;
  }

  function updateApp(id: string) {
    const def = APP_MAP.get(id);
    if (!def) return;
    setInstalled((prev) =>
      prev.map((inst) => (inst.id === id ? { ...inst, version: def.version } : inst)),
    );
    logEvent({ level: "info", title: "Update installed", detail: `${def.name} updated to ${def.version}.`, appId: id });
    notify({ appId: "WindOS", title: "Update installed", body: `${def.name} is now version ${def.version}.` });
  }

  function applyAllUpdates(): RestorePoint | null {
    const outdated = appUpdates;
    if (!outdated.length) {
      notify({ appId: "WindOS", title: "Everything is current", body: "No app updates are waiting." });
      return null;
    }
    const point = createRestorePoint("Before app updates", "update");
    setInstalled((prev) =>
      prev.map((inst) => {
        const def = APP_MAP.get(inst.id);
        return def && versionGreater(def.version, inst.version) ? { ...inst, version: def.version } : inst;
      }),
    );
    logEvent({ level: "info", title: "Updates installed", detail: `${outdated.length} package updates were applied.` });
    notify({ appId: "WindOS", title: "Updates installed", body: `${outdated.length} app update${outdated.length === 1 ? "" : "s"} applied successfully.` });
    playSound("install", settings.sounds);
    return point;
  }

  // ---------------------------------------------------------------- clipboard
  async function copyText(text: string, source = "WindOS"): Promise<boolean> {
    const trimmed = text.slice(0, 20000);
    const sourceApp = APP_MAP.get(source) ?? APPS.find((app) => app.name === source);
    const sourceId = sourceApp?.id ?? (source === "WindOS" ? "WindOS" : source);
    if (sourceId !== "WindOS" && sourceId !== "system" && !hasPermission(sourceId, "clipboard")) {
      const granted = await requestPermission(sourceId, "clipboard");
      if (!granted) {
        logEvent({
          level: "warning",
          title: "Clipboard copy blocked",
          detail: `${sourceApp?.name ?? sourceId} tried to write to the clipboard without permission.`,
          appId: sourceId,
        });
        return false;
      }
    }
    setClipboard((prev) =>
      [
        {
          id: `clip_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          text: trimmed,
          at: Date.now(),
          pinned: false,
          source,
        },
        ...prev.filter((entry) => entry.text !== trimmed),
      ].slice(0, 50),
    );
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(trimmed);
        return true;
      }
    } catch {
      /* host clipboard may require a gesture or permission */
    }
    return false;
  }

  async function copyEntry(entry: ClipboardEntry) {
    await copyText(entry.text, entry.source);
  }

  async function readClipboard(appId = "WindOS"): Promise<string> {
    const known = APP_MAP.get(appId) ?? APPS.find((app) => app.name === appId);
    const resolvedId = known?.id ?? appId;
    if (resolvedId !== "WindOS" && resolvedId !== "system" && !hasPermission(resolvedId, "clipboard")) {
      const ok = await requestPermission(resolvedId, "clipboard");
      if (!ok) return "";
    }
    try {
      return (await navigator.clipboard.readText()) ?? "";
    } catch {
      return "";
    }
  }

  function togglePinEntry(id: string) {
    setClipboard((prev) => prev.map((entry) => (entry.id === id ? { ...entry, pinned: !entry.pinned } : entry)));
  }

  function removeClipboardEntry(id: string) {
    setClipboard((prev) => prev.filter((entry) => entry.id !== id));
  }

  function clearClipboard(includePinned = false) {
    setClipboard((prev) => (includePinned ? [] : prev.filter((entry) => entry.pinned)));
    logEvent({ level: "info", title: "Clipboard cleared", detail: includePinned ? "All clipboard history was erased." : "Unpinned clipboard entries were erased." });
  }

  // -------------------------------------------------------- restore and backup
  function snapshotData(): string {
    return JSON.stringify({
      settings,
      fs: fs.serialize(),
      installed,
      grants,
      quick,
      clipboard,
      desktops,
      appStorage: collectAppStorage(),
    });
  }

  function createRestorePoint(label: string, kind: RestorePoint["kind"] = "manual"): RestorePoint {
    const snapshot = snapshotData();
    const point: RestorePoint = {
      id: `rp_${Date.now()}`,
      label: label || "Manual restore point",
      at: Date.now(),
      kind,
      appCount: installed.length,
      fileCount: Object.keys(fs.nodes).length,
      checksum: checksum(snapshot),
      snapshot,
    };
    setRestorePoints((prev) => {
      const next = [point, ...prev].slice(0, 6);
      void kvSet(RP_KEY, next);
      return next;
    });
    logEvent({ level: "info", title: "Restore point created", detail: `${point.label} · ${point.fileCount} files · checksum ${point.checksum}` });
    return point;
  }

  function applyRestorePoint(id: string, mode: "settings" | "files" | "full"): boolean {
    const point = restorePoints.find((p) => p.id === id);
    if (!point) return false;
    if (checksum(point.snapshot) !== point.checksum) {
      logEvent({ level: "critical", title: "Restore point corrupt", detail: `${point.label} failed its integrity check.` });
      notify({ appId: "WindOS", title: "Restore failed", body: "This restore point failed its checksum test." });
      return false;
    }
    try {
      const data = JSON.parse(point.snapshot) as {
        settings?: OSSettings;
        fs?: SerializedFS;
        installed?: InstalledApp[];
        grants?: Record<string, PermissionGrant>;
        quick?: QuickSettings;
        clipboard?: ClipboardEntry[];
      };
      if (mode !== "files" && data.settings) setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
      if (mode !== "settings" && data.fs) fs.replace(data.fs);
      if (mode !== "files") {
        if (data.installed) setInstalled(data.installed);
        if (data.grants) setGrants(data.grants);
        if (data.quick) setQuickState(data.quick);
        if (data.clipboard) setClipboard(data.clipboard);
      }
      logEvent({ level: "info", title: "System restored", detail: `${point.label} restored (${mode}).` });
      notify({ appId: "WindOS", title: "Restore complete", body: `${point.label} was applied in ${mode} mode.` });
      return true;
    } catch (error) {
      setSystemError(error instanceof Error ? error.message : "Restore failed");
      return false;
    }
  }

  function deleteRestorePoint(id: string) {
    setRestorePoints((prev) => {
      const next = prev.filter((p) => p.id !== id);
      void kvSet(RP_KEY, next);
      return next;
    });
    logEvent({ level: "info", title: "Restore point deleted", detail: `Restore point ${id} was removed from local storage.` });
  }

  function buildBackup(options: BackupOptions, record = true): string {
    const emptyFs: SerializedFS = { version: 1, nodes: [], exportedAt: Date.now() };
    const data = {
      settings: options.includeSettings ? settings : { ...DEFAULT_SETTINGS, displayName: settings.displayName },
      fs: options.includeFiles ? fs.serialize() : emptyFs,
      installed: options.includeApps ? installed : [],
      grants,
      quick,
      clipboard: options.includeClipboard ? clipboard : [],
      desktops,
      appStorage: collectAppStorage(),
    };
    const payload: BackupPayload = {
      product: "WindOS",
      version: "1.0.0",
      createdAt: Date.now(),
      checksum: checksum(JSON.stringify(data)),
      data,
    };
    if (record) {
      const now = Date.now();
      setLastBackupAt(now);
      try {
        localStorage.setItem(BACKUP_TIME_KEY, String(now));
      } catch {
        /* ignore */
      }
    }
    return JSON.stringify(payload, null, 2);
  }

  function importBackup(json: string, mode: "replace" | "merge"): { files: number } {
    const parsed = JSON.parse(json) as BackupPayload;
    if (!parsed || parsed.product !== "WindOS" || !parsed.data) {
      throw new Error("This file is not a WindOS backup archive.");
    }
    if (parsed.checksum && checksum(JSON.stringify(parsed.data)) !== parsed.checksum) {
      throw new Error("Backup checksum mismatch — the archive is damaged or was edited.");
    }
    let files = 0;
    if (parsed.data.fs) files = fs.importTree(parsed.data.fs, mode);
    if (parsed.data.settings) setSettings({ ...DEFAULT_SETTINGS, ...parsed.data.settings });
    if (parsed.data.installed?.length) {
      setInstalled((prev) => {
        if (mode === "replace") return parsed.data.installed!;
        const map = new Map(prev.map((a) => [a.id, a]));
        for (const appEntry of parsed.data.installed!) map.set(appEntry.id, appEntry);
        return [...map.values()];
      });
    }
    if (parsed.data.grants) setGrants(parsed.data.grants);
    if (parsed.data.quick) setQuickState(parsed.data.quick);
    if (parsed.data.clipboard) setClipboard(parsed.data.clipboard);
    if (Array.isArray(parsed.data.desktops) && parsed.data.desktops.length) setDesktops(parsed.data.desktops);
    try {
      for (const [key, value] of Object.entries(parsed.data.appStorage ?? {})) {
        if (key.startsWith("windos.app.")) localStorage.setItem(key, value);
      }
    } catch {
      /* ignore */
    }
    const now = Date.now();
    setLastBackupAt(now);
    try {
      localStorage.setItem(BACKUP_TIME_KEY, String(now));
    } catch {
      /* ignore */
    }
    logEvent({ level: "info", title: "Backup imported", detail: `${files} files imported in ${mode} mode.` });
    notify({ appId: "WindOS", title: "Backup restored", body: `${files} files restored in ${mode} mode.` });
    return { files };
  }

  async function wipeAll() {
    fs.readOnly = false;
    fs.replace(null);
    setSettings({ ...DEFAULT_SETTINGS });
    setInstalled(defaultInstalled());
    setGrants({});
    setClipboard([]);
    setNotifications([]);
    setSecurityEvents([]);
    setQuickState(DEFAULT_QUICK);
    setRestorePoints([]);
    setIconPositions({});
    setLastBackupAt(0);
    setWindows([]);
    setProcesses([]);
    setActiveWindowId(null);
    setActiveDesktopState(0);
    guestSettingsBackup.current = null;
    setGuest(false);
    sessionStarted.current = false;
    const keys = [INSTALLED_KEY, GRANTS_KEY, CLIP_KEY, QUICK_KEY, DESKTOP_KEY, RP_KEY, ICONS_KEY, BACKUP_TIME_KEY, ONBOARD_KEY, GUEST_BACKUP_KEY, "windos.settings.v1"];
    for (const key of keys) {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    }
    for (const key of Object.keys(collectAppStorage())) {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    }
    await kvDel("fs.v1");
    await kvDel(RP_KEY);
    await kvSet("fs.v1", fs.serialize());
    setOnboarded(false);
    setBootedAt(0);
    setPower("boot");
    setPower("boot");
    logEvent({ level: "critical", title: "Factory reset", detail: "All WindOS local data was erased and the drive was re-seeded." });
  }

  // -------------------------------------------------------------------- search
  function searchAll(query: string): SearchResults {
    const q = query.trim();
    const lower = q.toLowerCase();
    const appResults = installed
      .map((entry) => APP_MAP.get(entry.id))
      .filter((app): app is AppDefinition => Boolean(app))
      .filter(
        (app) =>
          q &&
          (app.name.toLowerCase().includes(lower) ||
            app.tagline.toLowerCase().includes(lower) ||
            app.description.toLowerCase().includes(lower)),
      )
      .slice(0, 5);
    const fileResults = q ? fs.search(q).slice(0, 8) : [];
    const settingResults = SETTINGS_INDEX.filter(
      (entry) =>
        q &&
        (entry.label.toLowerCase().includes(lower) ||
          entry.section.toLowerCase().includes(lower) ||
          entry.keywords.includes(lower)),
    ).slice(0, 5);
    const featureResults = q ? searchFeatures(q).slice(0, 6) : [];
    const topicResults = q ? searchHelp(q).slice(0, 4) : [];
    const actions = [
      { id: "lock", label: "Lock WindOS", description: "Lock the current session", run: lock },
      { id: "settings", label: "Open Settings", description: "System preferences", run: () => openApp("settings") },
      { id: "taskmgr", label: "Open Task Manager", description: "Processes and performance", run: () => openApp("taskmanager") },
      { id: "backup", label: "Create restore point", description: "Snapshot settings and files", run: () => createRestorePoint("Quick snapshot") },
      { id: "restart", label: "Restart WindOS", description: "Restart the virtual machine", run: restart },
      { id: "shutdown", label: "Shut down WindOS", description: "Power off the virtual machine", run: shutdown },
    ].filter((action) => q && action.label.toLowerCase().includes(lower));
    return {
      apps: appResults,
      files: fileResults,
      settings: settingResults,
      features: featureResults,
      topics: topicResults,
      actions,
    };
  }

  // --------------------------------------------------------------------- icons
  function setIconPosition(key: string, pos: DesktopIconPos) {
    setIconPositions((prev) => ({ ...prev, [key]: pos }));
  }

  function resetIconPositions() {
    setIconPositions({});
  }

  useEffect(() => {
    if (!fsVersion) return;
    const timer = window.setTimeout(() => {
      void storageEstimate().then(setStorage);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [fsVersion]);

  // ----------------------------------------------------------------- remainders
  function resetSettings() {
    setSettings({ ...DEFAULT_SETTINGS, displayName: settings.displayName, avatarColor: settings.avatarColor });
    logEvent({ level: "info", title: "Settings reset", detail: "Preferences were restored to WindOS defaults. Files were untouched." });
  }

  function markNotificationsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function dismissNotification(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  function clearNotifications() {
    setNotifications([]);
  }

  function clearSecurityEvents() {
    setSecurityEvents([]);
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  const value: OSContextValue = {
    ready,
    fsReady,
    fsPersistent,
    power,
    settings,
    updateSettings,
    resetSettings,
    onboarded,
    guest,
    fs,
    fsVersion,
    windows,
    activeWindowId,
    openApp,
    closeWindow,
    focusWindow,
    minimizeWindow,
    toggleMaximize,
    setWindowBounds,
    moveWindowToDesktop,
    moveWindowToMonitor,
    minimizeAll,
    restoreApp,
    togglePinApp,
    desktops,
    activeDesktop,
    setActiveDesktop,
    addDesktop,
    removeDesktop,
    renameDesktop,
    processes,
    killProcess,
    stats,
    bootedAt,
    notifications,
    unreadCount,
    notify,
    markNotificationsRead,
    dismissNotification,
    clearNotifications,
    grants,
    hasPermission,
    requestPermission,
    revokePermission,
    permissionPrompt,
    answerPermission,
    securityEvents,
    logEvent,
    clearSecurityEvents,
    installed,
    installApp,
    uninstallApp,
    updateApp,
    applyAllUpdates,
    appUpdates,
    isInstalled,
    quick,
    setQuick,
    clipboard,
    copyText,
    copyEntry,
    readClipboard,
    togglePinEntry,
    removeClipboardEntry,
    clearClipboard,
    searchAll,
    lock,
    unlock,
    sleep,
    restart,
    shutdown,
    powerOn,
    signOut,
    startGuest,
    endGuest,
    enterRecovery,
    bootSafeMode,
    completeBoot,
    completeWelcome,
    completeTutorial,
    restorePoints,
    createRestorePoint,
    applyRestorePoint,
    deleteRestorePoint,
    lastBackupAt,
    buildBackup,
    importBackup,
    wipeAll,
    storage,
    iconPositions,
    setIconPosition,
    resetIconPositions,
    screensaverActive,
    setScreensaverActive,
    systemError,
    setSystemError,
  };

  return <OSContext.Provider value={value}>{children}</OSContext.Provider>;
}

