import { useEffect, useState } from "react";
import { useOS } from "@/lib/os/store";
import { APP_MAP } from "@/lib/os/registry";
import { AppIcon } from "./AppIcon";
import { QuickSettings } from "./QuickSettings";
import { NotificationCenter } from "./NotificationCenter";
import { CalendarFlyout } from "./CalendarFlyout";
import { useMediaQuery, useNow } from "@/lib/os/hooks";
import { cn } from "@/lib/utils";
import {
  BatteryMedium,
  Bell,
  ChevronUp,
  LayoutGrid,
  Search,
  ShieldCheck,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
} from "lucide-react";

interface Props {
  onToggleStart: () => void;
  onOpenSearch: () => void;
  onOpenTaskView: () => void;
  startOpen: boolean;
  searchOpen: boolean;
}

type Popover = "quick" | "notifications" | "calendar" | null;

export function Taskbar({ onToggleStart, onOpenSearch, onOpenTaskView, startOpen, searchOpen }: Props) {
  const os = useOS();
  const { settings, windows, installed, activeDesktop, quick, activeWindowId } = os;
  const [popover, setPopover] = useState<Popover>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const now = useNow(1000);
  const isMobile = useMediaQuery("(max-width: 767px)");
  const clock = new Date(now);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    setPopover(null);
  }, [startOpen, searchOpen]);

  const desktopWindows = windows.filter((w) => w.desktop === activeDesktop);
  const runningApps = Array.from(new Set(desktopWindows.map((w) => w.appId)));
  const pinned = settings.pinnedApps.filter((id) => installed.some((a) => a.id === id));
  const taskbarApps = [...pinned, ...runningApps.filter((id) => !pinned.includes(id))];
  const activeApp = desktopWindows.find((w) => w.id === activeWindowId)?.appId;

  function handleAppClick(appId: string) {
    const appWindows = desktopWindows.filter((w) => w.appId === appId);
    if (appWindows.length === 0) {
      os.openApp(appId);
      return;
    }
    const focused = appWindows.find((w) => w.id === activeWindowId);
    if (focused) {
      os.minimizeWindow(focused.id);
      return;
    }
    const minimized = appWindows.every((w) => w.minimized);
    if (minimized) os.restoreApp(appId);
    else os.restoreApp(appId);
  }

  const time = clock.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    ...(settings.showSeconds ? { second: "2-digit" } : {}),
    hour12: !settings.clock24h,
  });
  const date = clock.toLocaleDateString(undefined, { month: "numeric", day: "numeric", year: "numeric" });

  return (
    <div
      className={cn(
        "relative z-[60] flex h-[54px] shrink-0 items-center gap-1 border-border/60 px-1.5 sm:px-2",
        settings.taskbarPosition === "bottom" ? "border-t" : "border-b",
        settings.taskbarTransparent ? "bg-[color:var(--os-taskbar)] backdrop-blur-2xl" : "bg-card",
      )}
      role="toolbar"
      aria-label="Taskbar"
    >
      <button
        onClick={onToggleStart}
        aria-label="Open Start menu"
        aria-expanded={startOpen}
        className={cn(
          "group flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-foreground/[0.06]",
          startOpen && "bg-foreground/[0.08]",
        )}
      >
        <span className="grid grid-cols-2 gap-[2.5px]" aria-hidden>
          <span className="size-[8px] rounded-[2px]" style={{ background: settings.accent }} />
          <span className="size-[8px] rounded-[2px] bg-current opacity-80" />
          <span className="size-[8px] rounded-[2px] bg-current opacity-80" />
          <span className="size-[8px] rounded-[2px]" style={{ background: settings.accent }} />
        </span>
      </button>

      {!isMobile && (
        <button
          onClick={onOpenSearch}
          aria-label="Search WindOS"
          className={cn(
            "flex h-9 w-[178px] items-center gap-2 rounded-lg border border-border/70 bg-background/50 px-2.5 text-left text-[11.5px] text-muted-foreground transition hover:border-border hover:bg-background/80",
            searchOpen && "border-primary/40 bg-background/90",
          )}
        >
          <Search className="size-3.5" />
          <span className="flex-1 truncate">Search apps, files…</span>
          <kbd className="rounded border border-border/70 bg-muted px-1 py-0.5 font-sans text-[9px] text-muted-foreground">Ctrl ␣</kbd>
        </button>
      )}

      <div
        className={cn(
          "flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto scrollbar-none",
          settings.taskbarAlign === "center" ? "justify-center" : "justify-start",
        )}
      >
        {taskbarApps.slice(0, 10).map((appId) => {
          const app = APP_MAP.get(appId);
          if (!app) return null;
          const appWindows = desktopWindows.filter((w) => w.appId === appId);
          const isRunning = appWindows.length > 0;
          const isActive = activeApp === appId;
          return (
            <div key={appId} className="relative">
              <button
                onClick={() => handleAppClick(appId)}
                onMouseEnter={() => setPreview(appId)}
                onMouseLeave={() => setPreview((current) => (current === appId ? null : current))}
                aria-label={app.name}
                className={cn(
                  "group relative flex h-10 items-center gap-1.5 rounded-lg px-1.5 transition-colors hover:bg-foreground/[0.06]",
                  isActive && "bg-foreground/[0.08]",
                  settings.taskbarLabels && "pr-2.5",
                )}
              >
                <AppIcon app={app} size="sm" />
                {settings.taskbarLabels && !isMobile && (
                  <span className="max-w-[110px] truncate text-[11px] font-medium">{app.name}</span>
                )}
                <span
                  className={cn(
                    "absolute -bottom-[1px] left-1/2 h-[3px] -translate-x-1/2 rounded-full transition-all",
                    isActive ? "w-4 bg-foreground/60" : isRunning ? "w-2 bg-foreground/30" : "w-0",
                  )}
                />
              </button>
              {preview === appId && (
                <div className="absolute bottom-12 left-1/2 z-[80] w-60 -translate-x-1/2 rounded-xl border border-border/70 bg-popover/95 p-2 shadow-2xl backdrop-blur-xl">
                  <div className="mb-1.5 flex items-center gap-2 px-1">
                    <AppIcon app={app} size="xs" />
                    <p className="text-xs font-semibold">{app.name}</p>
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {isRunning ? `${appWindows.length} open` : "Not running"}
                    </span>
                  </div>
                  {appWindows.length === 0 ? (
                    <button
                      className="w-full rounded-md px-2 py-1.5 text-left text-[11px] text-muted-foreground transition hover:bg-muted"
                      onClick={() => os.openApp(appId)}
                    >
                      Open {app.name}
                    </button>
                  ) : (
                    appWindows.map((win) => (
                      <button
                        key={win.id}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] transition hover:bg-muted"
                        onClick={() => os.focusWindow(win.id)}
                      >
                        <span className="size-1.5 rounded-full bg-primary/60" />
                        <span className="truncate">{win.title}</span>
                        <span className="ml-auto text-[9px] text-muted-foreground">{win.minimized ? "minimised" : "open"}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <button
          onClick={onOpenTaskView}
          title="Task view (virtual desktops)"
          aria-label="Open task view"
          className="hidden size-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-foreground/[0.06] hover:text-foreground sm:flex"
        >
          <LayoutGrid className="size-4" />
        </button>

        <div className="relative hidden items-center gap-1.5 px-1.5 sm:flex">
          <button
            className="rounded-md p-1 text-muted-foreground hover:bg-foreground/[0.06]"
            onClick={() => setPopover(popover === "quick" ? null : "quick")}
            title="Quick settings"
            aria-label="Quick settings"
          >
            {online && quick.wifi && !quick.airplane ? <Wifi className="size-4" /> : <WifiOff className="size-4" />}
            {settings.volume === 0 ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            <BatteryMedium className="size-4" />
          </button>
          <button
            onClick={() => os.openApp("security")}
            className="rounded-md p-1 text-muted-foreground hover:bg-foreground/[0.06]"
            title="WindSecurity"
            aria-label="Open WindSecurity"
          >
            <ShieldCheck className="size-4" />
          </button>
        </div>

        <button
          onClick={() => setPopover(popover === "notifications" ? null : "notifications")}
          className="relative flex size-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-foreground/[0.06] hover:text-foreground"
          title="Notifications"
          aria-label={`Notifications${os.unreadCount ? `, ${os.unreadCount} unread` : ""}`}
        >
          <Bell className="size-4" />
          {os.unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex min-w-3.5 items-center justify-center rounded-full bg-primary px-1 text-[8.5px] font-bold leading-[14px] text-primary-foreground">
              {os.unreadCount > 9 ? "9+" : os.unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setPopover(popover === "calendar" ? null : "calendar")}
          className="flex h-10 flex-col items-end justify-center rounded-lg px-2 text-right transition hover:bg-foreground/[0.06]"
          aria-label={`${time}, ${date}. Open calendar`}
          title={clock.toLocaleString()}
        >
          <span className="text-[11.5px] font-medium leading-tight tabular-nums">{time}</span>
          {(settings.showDate || !isMobile) && (
            <span className="text-[9.5px] leading-tight text-muted-foreground">{date}</span>
          )}
        </button>
      </div>

      {popover && (
        <>
          <div className="fixed inset-0 z-[65]" onClick={() => setPopover(null)} aria-hidden />
          {popover === "quick" && <QuickSettings />}
          {popover === "notifications" && <NotificationCenter />}
          {popover === "calendar" && <CalendarFlyout />}
        </>
      )}

      {settings.taskbarPosition === "bottom" && (
        <div className="pointer-events-none absolute inset-x-0 -top-8 flex justify-end px-3" aria-hidden>
          <ChevronUp className="size-3 text-transparent" />
        </div>
      )}
    </div>
  );
}
