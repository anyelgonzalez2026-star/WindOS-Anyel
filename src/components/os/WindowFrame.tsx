import {
  Component,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { AppHost } from "./AppHost";
import { useOS } from "@/lib/os/store";
import { APP_MAP } from "@/lib/os/registry";
import { useMediaQuery } from "@/lib/os/hooks";
import type { OSWindow } from "@/lib/os/types";
import {
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Minus,
  Monitor,
  RotateCcw,
  Square,
  TriangleAlert,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

class AppErrorBoundary extends Component<
  { children: ReactNode; appName: string },
  { error: string | null }
> {
  state = { error: null as string | null };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message || "The application stopped unexpectedly." };
  }
  componentDidCatch(error: Error) {
    console.error("[WindOS] App error:", error);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
            <TriangleAlert className="size-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold">{this.props.appName} stopped responding</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">{this.state.error}</p>
          </div>
          <button
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            onClick={() => this.setState({ error: null })}
          >
            Reload this app
          </button>
          <p className="text-xs text-muted-foreground">
            The rest of WindOS keeps running. Your files are safe.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

interface Props {
  win: OSWindow;
  visible: boolean;
}

type Edge = "left" | "right" | "top";

export function WindowFrame({ win, visible }: Props) {
  const os = useOS();
  const app = APP_MAP.get(win.appId);
  const isMobile = useMediaQuery("(max-width: 767px)");
  const frameRef = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState({ x: win.x, y: win.y, w: win.w, h: win.h });
  const [dragging, setDragging] = useState(false);
  const [snapHint, setSnapHint] = useState<Edge | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const active = os.activeWindowId === win.id;

  useEffect(() => {
    setBounds({ x: win.x, y: win.y, w: win.w, h: win.h });
  }, [win.x, win.y, win.w, win.h]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [menuOpen]);

  const paneRect = () => {
    const pane = frameRef.current?.closest("[data-monitor-pane]") as HTMLElement | null;
    return pane?.getBoundingClientRect() ?? { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
  };

  function beginDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (isMobile) return;
    if ((event.target as HTMLElement).closest("button")) return;
    event.preventDefault();
    os.focusWindow(win.id);
    const rect = paneRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const base = { x: win.maximized ? 0 : bounds.x, y: win.maximized ? 0 : bounds.y };
    const size = win.maximized
      ? { w: rect.width, h: rect.height }
      : { w: bounds.w, h: bounds.h };
    let hint: Edge | null = null;
    setDragging(true);

    const move = (e: PointerEvent) => {
      const nx = Math.max(-(size.w - 120), Math.min(rect.width - 80, base.x + e.clientX - startX));
      const ny = Math.max(0, Math.min(rect.height - 48, base.y + e.clientY - startY));
      setBounds({ x: nx, y: ny, w: size.w, h: size.h });
      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;
      hint = localY < 18 ? "top" : localX < 22 ? "left" : localX > rect.width - 22 ? "right" : null;
      setSnapHint(hint);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      setDragging(false);
      setSnapHint(null);
      if (hint === "top") {
        if (!win.maximized) os.toggleMaximize(win.id);
        return;
      }
      if (hint === "left" || hint === "right") {
        const width = Math.floor(rect.width / 2);
        os.setWindowBounds(win.id, {
          x: hint === "left" ? 0 : width,
          y: 0,
          w: width,
          h: rect.height,
        });
        return;
      }
      os.setWindowBounds(win.id, { x: boundsRef.current.x, y: boundsRef.current.y, w: size.w, h: size.h });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
  }

  // Track live bounds for the drag release without re-registering listeners.
  const boundsRef = useRef(bounds);
  boundsRef.current = bounds;

  function beginResize(event: ReactPointerEvent<HTMLDivElement>, direction: string) {
    if (isMobile || win.maximized) return;
    event.preventDefault();
    event.stopPropagation();
    os.focusWindow(win.id);
    const rect = paneRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const start = { ...bounds };
    setDragging(true);
    const move = (e: PointerEvent) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      let { x, y, w, h } = start;
      if (direction.includes("e")) w = Math.max(320, Math.min(rect.width - x, start.w + dx));
      if (direction.includes("s")) h = Math.max(220, Math.min(rect.height - y, start.h + dy));
      if (direction.includes("w")) {
        const nextW = Math.max(320, start.w - dx);
        x = Math.max(0, start.x + (start.w - nextW));
        w = nextW;
      }
      if (direction.includes("n")) {
        const nextH = Math.max(220, start.h - dy);
        y = Math.max(0, start.y + (start.h - nextH));
        h = nextH;
      }
      setBounds({ x, y, w, h });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      setDragging(false);
      setBounds((current) => {
        os.setWindowBounds(win.id, current);
        return current;
      });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
  }

  const style: React.CSSProperties = isMobile
    ? { position: "absolute", inset: 0, zIndex: win.z }
    : win.maximized
      ? { position: "absolute", inset: 4, zIndex: win.z }
      : { position: "absolute", left: bounds.x, top: bounds.y, width: bounds.w, height: bounds.h, zIndex: win.z };

  return (
    <div
      ref={frameRef}
      className={cn(
        "windos-window group flex flex-col overflow-hidden border bg-card text-card-foreground",
        isMobile ? "rounded-none" : "rounded-xl",
        active ? "border-foreground/15 shadow-[0_28px_80px_-24px_rgba(15,23,42,0.55)]" : "border-border/70 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.45)]",
        dragging ? "transition-none" : "transition-[box-shadow,border-color] duration-200",
        !visible && "hidden",
        snapHint && "ring-2 ring-primary/50",
      )}
      style={style}
      onPointerDown={() => os.focusWindow(win.id)}
      data-window-id={win.id}
    >
      <div
        className={cn(
          "flex h-10 shrink-0 items-center gap-2 border-b border-border/60 bg-gradient-to-b from-muted/60 to-muted/20 px-2.5",
          !isMobile && "cursor-default",
        )}
        onPointerDown={beginDrag}
        onDoubleClick={() => !isMobile && os.toggleMaximize(win.id)}
      >
        <div
          className="flex size-6 shrink-0 items-center justify-center rounded-md text-white shadow-sm"
          style={{ background: `linear-gradient(140deg, ${app?.color ?? "#55657a"}, ${app?.color ?? "#55657a"}b0)` }}
        >
          {app ? <app.icon className="size-3.5" /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-medium leading-tight">{win.title}</p>
        </div>
        <div className="flex items-center gap-0.5" onPointerDown={(e) => e.stopPropagation()}>
          <button
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-foreground/10 hover:text-foreground"
            title="Minimise"
            aria-label="Minimise window"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => os.minimizeWindow(win.id)}
          >
            <Minus className="size-3.5" />
          </button>
          <button
            className={cn(
              "hidden size-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-foreground/10 hover:text-foreground md:flex",
            )}
            title={win.maximized ? "Restore" : "Maximise"}
            aria-label={win.maximized ? "Restore window" : "Maximise window"}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => os.toggleMaximize(win.id)}
          >
            {win.maximized ? <RotateCcw className="size-3.5" /> : <Square className="size-3" />}
          </button>
          <div className="relative hidden md:block">
            <button
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-foreground/10 hover:text-foreground"
              title="Window options"
              aria-label="Window options"
              onPointerDown={(e) => {
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
            >
              <ChevronDown className="size-3.5" />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-8 z-[60] w-56 overflow-hidden rounded-lg border bg-popover p-1 text-popover-foreground shadow-xl"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <MenuItem icon={<Square className="size-3.5" />} label={win.maximized ? "Restore" : "Maximise"} onClick={() => { os.toggleMaximize(win.id); setMenuOpen(false); }} />
                <MenuItem icon={<ChevronsLeft className="size-3.5" />} label="Snap left half" onClick={() => {
                  const rect = paneRect();
                  os.setWindowBounds(win.id, { x: 0, y: 0, w: Math.floor(rect.width / 2), h: rect.height });
                  setMenuOpen(false);
                }} />
                <MenuItem icon={<ChevronsRight className="size-3.5" />} label="Snap right half" onClick={() => {
                  const rect = paneRect();
                  os.setWindowBounds(win.id, { x: Math.floor(rect.width / 2), y: 0, w: Math.floor(rect.width / 2), h: rect.height });
                  setMenuOpen(false);
                }} />
                <div className="my-1 h-px bg-border" />
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Move to desktop</p>
                <div className="flex flex-wrap gap-1 px-2 pb-1.5">
                  {os.desktops.map((desktop, index) => (
                    <button
                      key={desktop.id}
                      className={cn(
                        "rounded-md border px-2 py-1 text-[11px] transition hover:bg-muted",
                        win.desktop === index ? "border-primary/40 bg-primary/10 text-primary" : "border-border",
                      )}
                      onClick={() => { os.moveWindowToDesktop(win.id, index); setMenuOpen(false); }}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
                {os.settings.secondDisplay && (
                  <>
                    <div className="my-1 h-px bg-border" />
                    <MenuItem icon={<Monitor className="size-3.5" />} label={win.monitor === 1 ? "Send to display 2" : "Send to display 1"} onClick={() => {
                      os.moveWindowToMonitor(win.id, win.monitor === 1 ? 2 : 1);
                      setMenuOpen(false);
                    }} />
                  </>
                )}
                <div className="my-1 h-px bg-border" />
                <MenuItem icon={<X className="size-3.5" />} label="Close window" onClick={() => { os.closeWindow(win.id); setMenuOpen(false); }} />
              </div>
            )}
          </div>
          <button
            className="ml-0.5 flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-red-500 hover:text-white"
            title="Close"
            aria-label="Close window"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => os.closeWindow(win.id)}
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden bg-background">
        <AppErrorBoundary appName={app?.name ?? "Application"}>
          <div className="h-full w-full overflow-hidden">
            <AppHost appId={win.appId} windowId={win.id} payload={win.payload} />
          </div>
        </AppErrorBoundary>
      </div>

      {!isMobile && !win.maximized && (
        <>
          <div className="absolute inset-x-2 bottom-0 h-1 cursor-s-resize" onPointerDown={(e) => beginResize(e, "s")} />
          <div className="absolute inset-x-2 top-10 h-1 cursor-n-resize" onPointerDown={(e) => beginResize(e, "n")} />
          <div className="absolute inset-y-2 left-0 w-1 cursor-w-resize" onPointerDown={(e) => beginResize(e, "w")} />
          <div className="absolute inset-y-2 right-0 w-1 cursor-e-resize" onPointerDown={(e) => beginResize(e, "e")} />
          <div className="absolute bottom-0 left-0 size-3 cursor-sw-resize" onPointerDown={(e) => beginResize(e, "sw")} />
          <div className="absolute bottom-0 right-0 size-3 cursor-se-resize" onPointerDown={(e) => beginResize(e, "se")} />
          <div className="absolute left-0 top-10 size-3 cursor-nw-resize" onPointerDown={(e) => beginResize(e, "nw")} />
          <div className="absolute right-0 top-10 size-3 cursor-ne-resize" onPointerDown={(e) => beginResize(e, "ne")} />
        </>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition hover:bg-muted"
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}
