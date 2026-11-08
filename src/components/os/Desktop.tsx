import { useEffect, useRef, useState } from "react";
import { useOS } from "@/lib/os/store";
import { APP_MAP } from "@/lib/os/registry";
import { wallpaperById } from "@/lib/os/settings";
import { downloadBlob, downloadText } from "@/lib/os/zip";
import { iconForFile } from "@/lib/os/fs";
import type { FSNode, OSNotification } from "@/lib/os/types";
import { WindowFrame } from "./WindowFrame";
import { Taskbar } from "./Taskbar";
import { StartMenu } from "./StartMenu";
import { SearchPanel } from "./SearchPanel";
import { TaskView } from "./TaskView";
import { DesktopWidgets } from "./Widgets";
import { PermissionPrompt } from "./PermissionPrompt";
import { AppIcon } from "./AppIcon";
import { useElementSize, useMediaQuery, useNow } from "@/lib/os/hooks";
import { cn } from "@/lib/utils";
import {
  AppWindow,
  Archive,
  Bell,
  Calculator,
  Copy,
  FileCode2,
  FileText,
  Folder,
  FolderPlus,
  Image as ImageIcon,
  Info,
  Lock,
  Monitor,
  MousePointerClick,
  Pencil,
  Pin,
  PinOff,
  Plus,
  RefreshCw,
  Settings,
  Sparkles,
  Terminal,
  Trash2,
  Download,
  X,
} from "lucide-react";

const DESKTOP_APPS = ["files", "browser", "terminal", "code", "notes", "store", "settings", "help"];

interface IconItem {
  key: string;
  label: string;
  kind: "app" | "file" | "folder";
  appId?: string;
  nodeId?: string;
}

const FILE_ICONS: Record<string, typeof Folder> = {
  folder: Folder,
  image: ImageIcon,
  archive: Archive,
  code: FileCode2,
  text: FileText,
  pdf: FileText,
  audio: FileText,
  video: FileText,
  executable: FileCode2,
  file: FileText,
};

export function Desktop() {
  const os = useOS();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const wideEnough = useMediaQuery("(min-width: 1100px)");
  const [panel, setPanel] = useState<"start" | "search" | "taskview" | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [context, setContext] = useState<{ x: number; y: number; item?: IconItem } | null>(null);
  const [rename, setRename] = useState<{ nodeId: string; value: string } | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const paneMeasure = useElementSize<HTMLDivElement>();

  const monitors = os.settings.secondDisplay && wideEnough && !isMobile ? [1, 2] : [1];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      const mod = event.ctrlKey || event.metaKey;

      if (mod && event.code === "Space") {
        event.preventDefault();
        setPanel("search");
        return;
      }
      if (mod && event.key === "Escape") {
        event.preventDefault();
        setPanel((current) => (current === "start" ? null : "start"));
        return;
      }
      if (mod && event.shiftKey && event.key.toLowerCase() === "l") {
        event.preventDefault();
        os.lock();
        return;
      }
      if (mod && event.altKey && (event.key === "ArrowRight" || event.key === "ArrowLeft")) {
        event.preventDefault();
        const next =
          event.key === "ArrowRight"
            ? (os.activeDesktop + 1) % os.desktops.length
            : (os.activeDesktop - 1 + os.desktops.length) % os.desktops.length;
        os.setActiveDesktop(next);
        return;
      }
      if (event.altKey && event.key === "Tab") {
        event.preventDefault();
        const desktopWindows = os.windows
          .filter((w) => w.desktop === os.activeDesktop)
          .sort((a, b) => b.z - a.z);
        if (desktopWindows.length > 1) {
          const index = desktopWindows.findIndex((w) => w.id === os.activeWindowId);
          const next = desktopWindows[(index + 1) % desktopWindows.length];
          if (next) os.focusWindow(next.id);
        }
        return;
      }
      if (event.key === "Escape") {
        setPanel(null);
        setContext(null);
        return;
      }
      if (typing) return;
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Meta" && !event.ctrlKey && !event.altKey && !event.shiftKey) {
        setPanel((current) => (current === "start" ? null : "start"));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [os]);

  useEffect(() => {
    if (os.settings.screensaver === "none" || os.settings.screensaverMinutes <= 0) {
      os.setScreensaverActive(false);
      return;
    }
    let timer: number;
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => os.setScreensaverActive(true), os.settings.screensaverMinutes * 60000);
    };
    reset();
    const events = ["mousemove", "keydown", "pointerdown", "touchstart"];
    events.forEach((name) => window.addEventListener(name, reset, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      events.forEach((name) => window.removeEventListener(name, reset));
    };
  }, [os.settings.screensaver, os.settings.screensaverMinutes]);

  const desktopFiles = os.fs
    .children("folder_desktop")
    .sort((a, b) => a.name.localeCompare(b.name));

  const iconItems: IconItem[] = [
    ...DESKTOP_APPS.filter((id) => os.isInstalled(id)).map((id) => ({
      key: `app:${id}`,
      label: APP_MAP.get(id)?.name ?? id,
      kind: "app" as const,
      appId: id,
    })),
    ...desktopFiles.map((node) => ({
      key: `node:${node.id}`,
      label: node.name,
      kind: (node.type === "folder" ? "folder" : "file") as "folder" | "file",
      nodeId: node.id,
    })),
  ];

  const measuredHeight = paneMeasure.height || (typeof window !== "undefined" ? window.innerHeight - 140 : 600);
  const rows = Math.max(3, Math.floor((measuredHeight - 24) / 94));

  function positionFor(index: number) {
    const column = Math.floor(index / rows);
    const row = index % rows;
    return { x: 14 + column * 92, y: 14 + row * 94 };
  }

  function openItem(item: IconItem) {
    if (item.kind === "app" && item.appId) os.openApp(item.appId);
    if (item.nodeId) {
      const node = os.fs.byId(item.nodeId);
      if (!node) return;
      if (node.type === "folder") os.openApp("files", { folderId: node.id });
      else {
        const ext = node.name.split(".").pop()?.toLowerCase() ?? "";
        if (["md", "txt"].includes(ext)) os.openApp("notes", { openId: node.id });
        else if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) os.openApp("photos", { openId: node.id });
        else if (ext === "pdf") os.openApp("pdf", { openId: node.id });
        else os.openApp("files", { openId: node.id });
      }
    }
  }

  async function downloadNode(node: FSNode) {
    if (!node.content) {
      os.notify({ appId: "WindOS", title: "Cannot download folder", body: "Select a file inside the folder instead." });
      return;
    }
    if (node.content.startsWith("data:")) {
      try {
        const response = await fetch(node.content);
        downloadBlob(await response.blob(), node.name);
      } catch {
        os.notify({ appId: "WindOS", title: "Download failed", body: "The file data could not be read." });
      }
    } else {
      downloadText(node.content, node.name, node.mime ?? "text/plain");
    }
    os.logEvent({ level: "info", title: "File exported", detail: `${node.name} was downloaded from WindOS.` });
  }

  function createNewFolder() {
    const node = os.fs.createFolder("folder_desktop", "New folder");
    if (!node) {
      os.notify({ appId: "WindOS", title: "Read-only session", body: "Guest sessions cannot create files." });
      return;
    }
    setSelected(`node:${node.id}`);
    setRename({ nodeId: node.id, value: node.name });
  }

  function createNewFile() {
    const node = os.fs.createFile("folder_desktop", "New text file.txt", "", "text/plain");
    if (!node) {
      os.notify({ appId: "WindOS", title: "Read-only session", body: "Guest sessions cannot create files." });
      return;
    }
    setSelected(`node:${node.id}`);
    setRename({ nodeId: node.id, value: node.name });
  }

  const wallpaper = wallpaperById(os.settings.wallpaper);
  const customWallpaper = os.settings.wallpaper.startsWith("data:");
  const wallpaperStyle: React.CSSProperties = customWallpaper
    ? {
        backgroundImage: `url(${os.settings.wallpaper})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        filter: os.settings.wallpaperBlur ? `blur(${os.settings.wallpaperBlur}px)` : undefined,
        transform: os.settings.wallpaperBlur ? "scale(1.06)" : undefined,
      }
    : {
        background: wallpaper.background,
        filter: os.settings.wallpaperBlur ? `blur(${os.settings.wallpaperBlur}px)` : undefined,
        transform: os.settings.wallpaperBlur ? "scale(1.06)" : undefined,
      };

  const taskbar = (
    <Taskbar
      onToggleStart={() => setPanel((current) => (current === "start" ? null : "start"))}
      onOpenSearch={() => setPanel((current) => (current === "search" ? null : "search"))}
      onOpenTaskView={() => setPanel((current) => (current === "taskview" ? null : "taskview"))}
      startOpen={panel === "start"}
      searchOpen={panel === "search"}
    />
  );

  return (
    <div
      className={cn(
        "windos-desktop relative flex h-[100dvh] w-full flex-col overflow-hidden bg-background text-foreground",
        os.settings.highContrast && "high-contrast",
      )}
      style={{ fontSize: `${os.settings.fontScale}%` }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          key={os.settings.wallpaper}
          className={cn("absolute inset-0 transition-opacity duration-500", wallpaper.className, !customWallpaper && wallpaper.kind === "animated" && os.settings.animations && !os.settings.reducedMotion && "wallpaper-animate")}
          style={wallpaperStyle}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/[0.03] via-transparent to-slate-950/[0.10]" />
        <div className="absolute inset-0 bg-slate-950 transition-opacity" style={{ opacity: os.settings.wallpaperDim / 220 }} />
        <div className="absolute inset-0 bg-black transition-opacity" style={{ opacity: (100 - os.settings.brightness) / 260 }} />
        {os.settings.nightLight && (
          <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, rgba(255,170,80,0.16), rgba(255,120,60,0.06))" }} />
        )}
      </div>

      {os.settings.taskbarPosition === "top" && taskbar}

      <div className="relative z-10 flex min-h-0 flex-1">
        {monitors.map((monitor) => (
          <div
            key={monitor}
            ref={monitor === 1 ? paneMeasure.ref : undefined}
            data-monitor-pane
            className={cn(
              "relative min-w-0 flex-1 overflow-hidden",
              monitors.length > 1 && monitor === 2 && "border-l border-slate-950/25",
            )}
            onContextMenu={(event) => {
              if (monitor !== 1) return;
              event.preventDefault();
              setContext({ x: event.clientX, y: event.clientY });
            }}
            onPointerDown={() => {
              setSelected(null);
              setContext(null);
            }}
          >
            {monitors.length > 1 && (
              <span className="pointer-events-none absolute left-3 top-2 z-0 rounded-md bg-black/20 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-white/60">
                Display {monitor}
              </span>
            )}

            {monitor === 1 && <DesktopWidgets />}

            {monitor === 1 &&
              (isMobile ? (
                <div className="absolute inset-0 overflow-y-auto p-3 pr-3">
                  <div className="grid grid-cols-4 gap-1.5">
                    {iconItems.map((item) => (
                      <MobileIcon
                        key={item.key}
                        item={item}
                        onOpen={() => openItem(item)}
                        onContext={() => {
                          setContext({ x: window.innerWidth / 2 - 100, y: window.innerHeight / 2 - 100, item });
                        }}
                      />
                    ))}
                  </div>
                  <p className="mt-4 rounded-lg bg-black/25 px-2 py-1.5 text-center text-[9.5px] text-white/70">
                    WindOS on touch · windows open full screen
                  </p>
                </div>
              ) : os.settings.desktopIcons ? (
                <div className="absolute inset-0 z-[1]" aria-label="Desktop icons">
                  {iconItems.map((item, index) => (
                    <DesktopIcon
                      key={`${item.key}-${refreshTick}`}
                      item={item}
                      index={index}
                      position={os.iconPositions[item.key] ?? positionFor(index)}
                      selected={selected === item.key}
                      doubleClick={os.settings.doubleClickOpen}
                      onSelect={() => setSelected(item.key)}
                      onOpen={() => openItem(item)}
                      onMove={(pos) => os.setIconPosition(item.key, pos)}
                      onContext={(x, y) => {
                        setSelected(item.key);
                        setContext({ x, y, item });
                      }}
                    />
                  ))}
                </div>
              ) : null)}

            {os.windows
              .filter((win) =>
                monitor === 2
                  ? win.monitor === 2
                  : win.monitor === 1 || (win.monitor === 2 && monitors.length === 1),
              )
              .map((win) => (
                <WindowFrame
                  key={win.id}
                  win={win}
                  visible={win.desktop === os.activeDesktop && !win.minimized && (monitors.length > 1 || win.monitor === 1)}
                />
              ))}
          </div>
        ))}
      </div>

      {os.settings.taskbarPosition === "bottom" && taskbar}

      {os.guest && (
        <div className="fixed left-1/2 top-2 z-[86] flex -translate-x-1/2 items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/95 px-3 py-1.5 text-[11px] font-medium text-white shadow-lg">
          <Lock className="size-3" />
          Guest session · read-only drive
          <button className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] transition hover:bg-white/30" onClick={os.endGuest}>
            End session
          </button>
        </div>
      )}

      <StartMenu open={panel === "start"} onClose={() => setPanel(null)} />
      <SearchPanel open={panel === "search"} onClose={() => setPanel(null)} />
      <TaskView open={panel === "taskview"} onClose={() => setPanel(null)} />
      <PermissionPrompt />
      <NotificationBanners />
      <ScreensaverOverlay />
      <DesktopContextMenu
        context={context}
        onClose={() => setContext(null)}
        onNewFolder={createNewFolder}
        onNewFile={createNewFile}
        onRename={(nodeId) => {
          const node = os.fs.byId(nodeId);
          setRename({ nodeId, value: node?.name ?? "" });
        }}
        onDownload={(nodeId) => {
          const node = os.fs.byId(nodeId);
          if (node) void downloadNode(node);
        }}
        onRefresh={() => setRefreshTick((n) => n + 1)}
      />

      {rename && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="windos-pop w-full max-w-sm rounded-xl border border-border/70 bg-popover p-4 shadow-2xl">
            <h3 className="text-sm font-semibold">Rename</h3>
            <p className="mt-1 text-[11px] text-muted-foreground">This changes the real file name on your virtual drive.</p>
            <input
              autoFocus
              value={rename.value}
              onChange={(event) => setRename({ ...rename, value: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === "Enter" && rename.value.trim()) {
                  const ok = os.fs.rename(rename.nodeId, rename.value.trim());
                  if (!ok) os.notify({ appId: "WindOS", title: "Rename failed", body: "Guest sessions and locked files cannot be renamed." });
                  setRename(null);
                }
                if (event.key === "Escape") setRename(null);
              }}
              className="mt-3 h-9 w-full rounded-lg border border-border bg-background px-2.5 text-xs outline-none focus:border-primary/50"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button className="rounded-lg border px-3 py-1.5 text-xs" onClick={() => setRename(null)}>Cancel</button>
              <button
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                onClick={() => {
                  if (rename.value.trim()) {
                    os.fs.rename(rename.nodeId, rename.value.trim());
                  }
                  setRename(null);
                }}
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DesktopIcon({
  item,
  index,
  position,
  selected,
  doubleClick,
  onSelect,
  onOpen,
  onMove,
  onContext,
}: {
  item: IconItem;
  index: number;
  position: { x: number; y: number };
  selected: boolean;
  doubleClick: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onMove: (pos: { x: number; y: number }) => void;
  onContext: (x: number, y: number) => void;
}) {
  const os = useOS();
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null);
  const moved = useRef(false);
  void index;
  const app = item.appId ? APP_MAP.get(item.appId) : undefined;
  const node = item.nodeId ? os.fs.byId(item.nodeId) : undefined;
  const FileIcon = FILE_ICONS[node ? iconForFile(node) : "file"] ?? FileText;

  function pointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    event.stopPropagation();
    onSelect();
    const startX = event.clientX;
    const startY = event.clientY;
    const base = position;
    moved.current = false;
    const pane = (event.currentTarget as HTMLElement).closest("[data-monitor-pane]") as HTMLElement | null;
    const bounds = pane?.getBoundingClientRect();
    const move = (e: PointerEvent) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved.current = true;
      if (!moved.current) return;
      setOffset({
        x: Math.max(4, Math.min((bounds?.width ?? 800) - 80, base.x + dx)),
        y: Math.max(4, Math.min((bounds?.height ?? 600) - 84, base.y + dy)),
      });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      setOffset((current) => {
        if (moved.current && current) onMove(current);
        return null;
      });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
  }

  return (
    <button
      className={cn(
        "group absolute z-[1] flex w-[84px] flex-col items-center gap-1.5 rounded-lg p-2 text-center outline-none transition",
        selected ? "bg-white/20 ring-1 ring-white/50" : "hover:bg-white/10",
      )}
      style={{
        left: offset?.x ?? position.x,
        top: offset?.y ?? position.y,
        touchAction: "none",
      }}
      onPointerDown={pointerDown}
      onClick={() => onSelect()}
      onDoubleClick={() => (doubleClick ? onOpen() : undefined)}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onContext(event.clientX, event.clientY);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") onOpen();
      }}
      title={item.label}
      aria-label={`${item.label} desktop icon`}
    >
      {app ? (
        <AppIcon app={app} size="lg" className="shadow-md" />
      ) : (
        <span className="flex size-11 items-center justify-center rounded-[10px] border border-white/40 bg-white/75 text-amber-600 shadow-md dark:border-white/10 dark:bg-slate-800/90 dark:text-amber-400">
          <FileIcon className="size-5" />
        </span>
      )}
      <span className="line-clamp-2 rounded bg-black/30 px-1.5 py-0.5 text-[10px] font-medium leading-tight text-white shadow-sm backdrop-blur-sm">
        {item.label}
      </span>
    </button>
  );
}

function MobileIcon({ item, onOpen, onContext }: { item: IconItem; onOpen: () => void; onContext: () => void }) {
  const os = useOS();
  const app = item.appId ? APP_MAP.get(item.appId) : undefined;
  const node = item.nodeId ? os.fs.byId(item.nodeId) : undefined;
  const FileIcon = FILE_ICONS[node ? iconForFile(node) : "file"] ?? FileText;
  return (
    <button
      className="flex min-w-0 flex-col items-center gap-1 rounded-xl p-1.5 active:bg-white/15"
      onClick={onOpen}
      onContextMenu={(event) => {
        event.preventDefault();
        onContext();
      }}
    >
      {app ? (
        <AppIcon app={app} size="lg" />
      ) : (
        <span className="flex size-11 items-center justify-center rounded-[10px] border border-white/40 bg-white/70 text-amber-600">
          <FileIcon className="size-5" />
        </span>
      )}
      <span className="line-clamp-2 text-[9.5px] leading-tight text-white drop-shadow">{item.label}</span>
    </button>
  );
}

function DesktopContextMenu({
  context,
  onClose,
  onNewFolder,
  onNewFile,
  onRename,
  onDownload,
  onRefresh,
}: {
  context: { x: number; y: number; item?: IconItem } | null;
  onClose: () => void;
  onNewFolder: () => void;
  onNewFile: () => void;
  onRename: (nodeId: string) => void;
  onDownload: (nodeId: string) => void;
  onRefresh: () => void;
}) {
  const os = useOS();
  if (!context) return null;
  const item = context.item;
  const node = item?.nodeId ? os.fs.byId(item.nodeId) : undefined;
  const x = Math.min(context.x, (typeof window !== "undefined" ? window.innerWidth : 1200) - 240);
  const y = Math.min(context.y, (typeof window !== "undefined" ? window.innerHeight : 800) - 320);
  const app = item?.appId ? APP_MAP.get(item.appId) : undefined;

  return (
    <>
      <div className="fixed inset-0 z-[95]" onClick={onClose} onPointerDown={onClose} aria-hidden />
      <div
        className="windos-pop fixed z-[96] w-56 overflow-hidden rounded-xl border border-border/70 bg-popover/97 p-1 text-popover-foreground shadow-2xl backdrop-blur-2xl"
        style={{ left: x, top: y }}
        role="menu"
      >
        {item ? (
          <>
            <div className="flex items-center gap-2 px-2 pb-1.5 pt-1">
              {app ? <AppIcon app={app} size="xs" /> : <FileText className="size-3.5 text-muted-foreground" />}
              <span className="truncate text-[10.5px] font-semibold">{item.label}</span>
            </div>
            <div className="my-1 h-px bg-border" />
            <CtxItem icon={<MousePointerClick className="size-3.5" />} label="Open" onClick={() => {
              onClose();
              if (item.appId) os.openApp(item.appId);
              else if (item.nodeId) os.openApp("files", { openId: item.nodeId });
            }} />
            {app && (
              <CtxItem
                icon={os.settings.pinnedApps.includes(app.id) ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
                label={os.settings.pinnedApps.includes(app.id) ? "Unpin from taskbar" : "Pin to taskbar"}
                onClick={() => { os.togglePinApp(app.id); onClose(); }}
              />
            )}
            {node && (
              <>
                <CtxItem icon={<Pencil className="size-3.5" />} label="Rename" onClick={() => { onRename(node.id); onClose(); }} />
                {node.type === "file" && (
                  <CtxItem icon={<Download className="size-3.5" />} label="Download to computer" onClick={() => { onDownload(node.id); onClose(); }} />
                )}
                <CtxItem
                  icon={<Trash2 className="size-3.5" />}
                  label="Move to Recycle Bin"
                  danger
                  onClick={() => {
                    if (os.fs.trash(node.id)) {
                      os.notify({ appId: "WindOS", title: "Moved to Recycle Bin", body: `${node.name} can be restored from WindFiles.` });
                    }
                    onClose();
                  }}
                />
              </>
            )}
            {app && (
              <CtxItem icon={<Info className="size-3.5" />} label="App details" onClick={() => { os.openApp("about"); onClose(); }} />
            )}
            <CtxItem icon={<Copy className="size-3.5" />} label="Copy path" onClick={() => {
              if (node) void os.copyText(os.fs.pathOf(node.id), "Desktop");
              onClose();
            }} />
          </>
        ) : (
          <>
            <CtxItem icon={<FolderPlus className="size-3.5" />} label="New folder" onClick={() => { onNewFolder(); onClose(); }} />
            <CtxItem icon={<Plus className="size-3.5" />} label="New text file" onClick={() => { onNewFile(); onClose(); }} />
            <CtxItem icon={<RefreshCw className="size-3.5" />} label="Refresh desktop" onClick={() => { onRefresh(); onClose(); }} />
            <div className="my-1 h-px bg-border" />
            <CtxItem icon={<ImageIcon className="size-3.5" />} label="Change wallpaper" onClick={() => { os.openApp("settings", { section: "personalization" }); onClose(); }} />
            <CtxItem icon={<Sparkles className="size-3.5" />} label="Desktop widgets" onClick={() => { os.openApp("settings", { section: "personalization" }); onClose(); }} />
            <CtxItem
              icon={<Monitor className="size-3.5" />}
              label={os.settings.desktopIcons ? "Hide desktop icons" : "Show desktop icons"}
              onClick={() => { os.updateSettings({ desktopIcons: !os.settings.desktopIcons }); onClose(); }}
            />
            <CtxItem icon={<Settings className="size-3.5" />} label="Display settings" onClick={() => { os.openApp("settings", { section: "system" }); onClose(); }} />
            <div className="my-1 h-px bg-border" />
            <CtxItem icon={<Terminal className="size-3.5" />} label="Open WindTerminal" onClick={() => { os.openApp("terminal"); onClose(); }} />
            <CtxItem icon={<Calculator className="size-3.5" />} label="Open Calculator" onClick={() => { os.openApp("calculator"); onClose(); }} />
            <CtxItem icon={<Lock className="size-3.5" />} label="Lock WindOS" onClick={() => { os.lock(); onClose(); }} />
          </>
        )}
      </div>
    </>
  );
}

function CtxItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11.5px] transition hover:bg-muted",
        danger && "text-red-600 hover:bg-red-500/10 dark:text-red-400",
      )}
      onClick={onClick}
      role="menuitem"
    >
      {icon}
      {label}
    </button>
  );
}

function NotificationBanners() {
  const os = useOS();
  const [banners, setBanners] = useState<OSNotification[]>([]);
  const lastSeen = useRef<string | null>(null);

  useEffect(() => {
    const latest = os.notifications[0];
    if (!latest || latest.id === lastSeen.current) return;
    lastSeen.current = latest.id;
    if (!os.settings.notificationBanner || os.quick.focusAssist) return;
    setBanners((prev) => [latest, ...prev].slice(0, 3));
    const timer = window.setTimeout(() => {
      setBanners((prev) => prev.filter((banner) => banner.id !== latest.id));
    }, 5600);
    return () => window.clearTimeout(timer);
  }, [os.notifications, os.settings.notificationBanner, os.quick.focusAssist]);

  if (banners.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-3 top-3 z-[100] flex w-[340px] max-w-[calc(100vw-24px)] flex-col gap-2">
      {banners.map((banner) => {
        const app = APP_MAP.get(banner.appId);
        return (
          <div
            key={banner.id}
            className="windos-toast pointer-events-auto flex gap-2.5 rounded-xl border border-border/60 bg-popover/95 p-3 shadow-xl backdrop-blur-2xl"
          >
            {app ? <AppIcon app={app} size="sm" /> : (
              <div className="flex size-7 items-center justify-center rounded-md bg-slate-600 text-white"><Bell className="size-3.5" /></div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11.5px] font-semibold">{banner.title}</p>
              <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-snug text-muted-foreground">{banner.body}</p>
              <div className="mt-1 flex gap-1.5">
                {banner.actions?.slice(0, 2).map((action) => (
                  <button
                    key={action.label}
                    className="rounded border border-border bg-background px-1.5 py-0.5 text-[9.5px] font-medium hover:bg-muted"
                    onClick={() => {
                      os.openApp(action.appId);
                      setBanners((prev) => prev.filter((b) => b.id !== banner.id));
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              className="flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
              onClick={() => setBanners((prev) => prev.filter((b) => b.id !== banner.id))}
              aria-label="Dismiss"
            >
              <X className="size-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function ScreensaverOverlay() {
  const os = useOS();
  const now = useNow(1000);
  const time = new Date(now).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: !os.settings.clock24h,
  });
  if (!os.screensaverActive) return null;

  return (
    <div
      className="fixed inset-0 z-[130] flex flex-col items-center justify-center overflow-hidden bg-slate-950 text-white"
      onClick={() => os.setScreensaverActive(false)}
      onPointerMove={() => os.setScreensaverActive(false)}
      role="dialog"
      aria-label="Screensaver"
    >
      {os.settings.screensaver === "clock" && (
        <div className="text-center">
          <p className="text-[12vw] font-semibold leading-none tracking-tight tabular-nums">{time}</p>
          <p className="mt-4 text-sm text-white/50">Press any key or click to resume</p>
        </div>
      )}
      {os.settings.screensaver === "bubbles" && (
        <div className="absolute inset-0">
          {Array.from({ length: 14 }).map((_, i) => (
            <span
              key={i}
              className="absolute rounded-full border border-white/20 bg-white/5"
              style={{
                width: `${60 + (i * 37) % 220}px`,
                height: `${60 + (i * 37) % 220}px`,
                left: `${(i * 137) % 100}%`,
                top: `${(i * 61) % 100}%`,
                animation: `bubble-float ${12 + (i % 7) * 2}s ease-in-out ${i * 0.4}s infinite alternate`,
              }}
            />
          ))}
        </div>
      )}
      {os.settings.screensaver === "stars" && (
        <div className="absolute inset-0">
          {Array.from({ length: 80 }).map((_, i) => (
            <span
              key={i}
              className="absolute size-0.5 rounded-full bg-white"
              style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%`, opacity: 0.25 + ((i * 7) % 60) / 100 }}
            />
          ))}
        </div>
      )}
      {os.settings.screensaver === "aurora" && (
        <div className="absolute inset-0 opacity-80">
          <div className="absolute -left-40 top-0 size-[60vw] rounded-full bg-teal-400/20 blur-[120px]" style={{ animation: "bubble-float 18s ease-in-out infinite alternate" }} />
          <div className="absolute -right-20 bottom-0 size-[55vw] rounded-full bg-indigo-500/20 blur-[120px]" style={{ animation: "bubble-float 22s ease-in-out infinite alternate-reverse" }} />
        </div>
      )}
      {os.settings.screensaver !== "clock" && (
        <div className="relative z-10 text-center">
          <p className="text-2xl font-medium">{time}</p>
          <p className="mt-2 text-xs text-white/40">Click anywhere to resume WindOS</p>
        </div>
      )}
    </div>
  );
}
