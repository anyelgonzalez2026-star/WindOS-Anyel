import { useEffect, useMemo, useRef, useState } from "react";
import { useOS } from "@/lib/os/store";
import { APP_MAP } from "@/lib/os/registry";
import { AppIcon } from "./AppIcon";
import { useMediaQuery } from "@/lib/os/hooks";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  FileText,
  FolderOpen,
  LogOut,
  Moon,
  Pin,
  PinOff,
  Power,
  RotateCcw,
  Search,
  UserRound,
  UserRoundPlus,
  Lock,
  ChevronRight,
  Clock3,
} from "lucide-react";

export function StartMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const os = useOS();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [powerOpen, setPowerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setPowerOpen(false);
      window.setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  const installedApps = useMemo(
    () =>
      os.installed
        .map((entry) => APP_MAP.get(entry.id))
        .filter((app): app is NonNullable<typeof app> => Boolean(app)),
    [os.installed],
  );

  const results = query.trim() ? os.searchAll(query) : null;
  const flatItems = results
    ? [
        ...results.apps.map((app) => ({ kind: "app" as const, id: app.id, app })),
        ...results.files.map((file) => ({ kind: "file" as const, id: file.id, file })),
        ...results.actions.map((action) => ({ kind: "action" as const, id: action.id, action })),
      ]
    : [];

  function launchFirst() {
    if (query.trim() && flatItems.length) {
      const item = flatItems[Math.min(selected, flatItems.length - 1)];
      if (item.kind === "app") os.openApp(item.app.id);
      if (item.kind === "file") openFile(item.file.id);
      if (item.kind === "action") item.action.run();
      setQuery("");
      onClose();
      return;
    }
    if (installedApps[0]) {
      os.openApp(installedApps[0].id);
      onClose();
    }
  }

  function openFile(id: string) {
    const node = os.fs.byId(id);
    if (!node) return;
    const ext = node.name.split(".").pop()?.toLowerCase();
    if (ext === "md" || ext === "txt") os.openApp("notes", { openId: id });
    else if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext ?? "")) os.openApp("photos", { openId: id });
    else if (ext === "pdf") os.openApp("pdf", { openId: id });
    else if (["js", "ts", "html", "css", "json", "tsx", "jsx"].includes(ext ?? "")) os.openApp("code", { openId: id });
    else os.openApp("files", { openId: id });
    onClose();
  }

  const recent = os.fs.recent(5).filter((node) => node.parentId !== null);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[75]" onClick={onClose} aria-hidden />
      <div
        className={cn(
          "windos-start fixed z-[80] flex flex-col overflow-hidden border border-border/70 bg-popover/97 text-popover-foreground shadow-2xl backdrop-blur-2xl",
          isMobile
            ? "inset-0 rounded-none"
            : cn(
                "w-[600px] max-w-[calc(100vw-24px)] rounded-2xl",
                os.settings.taskbarPosition === "bottom" ? "bottom-[60px] left-2 h-[620px] max-h-[calc(100dvh-80px)]" : "left-2 top-[60px] h-[620px] max-h-[calc(100dvh-80px)]",
              ),
        )}
        role="dialog"
        aria-label="Start menu"
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setSelected((s) => (flatItems.length ? (s + 1) % flatItems.length : s));
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setSelected((s) => (flatItems.length ? (s - 1 + flatItems.length) % flatItems.length : s));
          }
          if (event.key === "Enter") {
            event.preventDefault();
            launchFirst();
          }
          if (event.key === "Escape") onClose();
        }}
      >
        <div className="border-b border-border/50 p-3">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-2.5">
              <div
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white shadow-inner"
                style={{ background: os.settings.avatarColor }}
              >
                {os.settings.displayName.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{os.settings.displayName}</p>
                <p className="text-[10.5px] text-muted-foreground">
                  {os.guest ? "Guest session · read-only" : `WindOS 1.0.0 · ${os.installed.length} apps`}
                </p>
              </div>
            </div>
            <div className="relative">
              <button
                className={cn(
                  "flex size-9 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition hover:bg-muted hover:text-foreground",
                  powerOpen && "bg-muted text-foreground",
                )}
                onClick={() => setPowerOpen((v) => !v)}
                aria-label="Power options"
                aria-expanded={powerOpen}
              >
                <Power className="size-4" />
              </button>
              {powerOpen && (
                <div className="absolute right-0 top-10 z-30 w-48 rounded-xl border bg-popover p-1 shadow-xl">
                  <PowerItem icon={<Lock className="size-3.5" />} label="Lock" onClick={() => { os.lock(); onClose(); }} />
                  <PowerItem icon={<Moon className="size-3.5" />} label="Sleep" onClick={() => { os.sleep(); onClose(); }} />
                  <PowerItem icon={<UserRound className="size-3.5" />} label="Sign out" onClick={() => { os.signOut(); onClose(); }} />
                  <PowerItem icon={<UserRoundPlus className="size-3.5" />} label="Guest session" onClick={() => { os.startGuest(); onClose(); }} />
                  <div className="my-1 h-px bg-border" />
                  <PowerItem icon={<RotateCcw className="size-3.5" />} label="Restart" onClick={() => { os.restart(); onClose(); }} />
                  <PowerItem icon={<LogOut className="size-3.5" />} label="Shut down" danger onClick={() => { os.shutdown(); onClose(); }} />
                </div>
              )}
            </div>
          </div>

          <div className="flex h-9 items-center gap-2 rounded-lg border border-border/70 bg-background/60 px-2.5 focus-within:border-primary/50">
            <Search className="size-4 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelected(0);
              }}
              placeholder="Search apps, files and settings"
              className="h-full flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
              aria-label="Search in Start"
            />
            {query && (
              <button className="text-[10px] text-muted-foreground hover:text-foreground" onClick={() => setQuery("")}>
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {results ? (
            <div className="space-y-4">
              {flatItems.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <Search className="mb-3 size-6 text-muted-foreground/60" />
                  <p className="text-sm font-medium">No results for “{query}”</p>
                  <p className="mt-1 max-w-xs text-[11px] text-muted-foreground">
                    Try an app name, a file, a setting or a feature. Global search also covers the 640-capability registry.
                  </p>
                </div>
              ) : (
                <>
                  {results.apps.length > 0 && (
                    <Section title="Applications">
                      {results.apps.map((app) => (
                        <ResultRow
                          key={app.id}
                          active={flatItems[selected]?.kind === "app" && flatItems[selected]?.id === app.id}
                          onClick={() => { os.openApp(app.id); onClose(); }}
                        >
                          <AppIcon app={app} size="sm" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-medium">{app.name}</span>
                            <span className="block truncate text-[10px] text-muted-foreground">{app.tagline}</span>
                          </span>
                        </ResultRow>
                      ))}
                    </Section>
                  )}
                  {results.files.length > 0 && (
                    <Section title="Files">
                      {results.files.slice(0, 6).map((file) => (
                        <ResultRow
                          key={file.id}
                          active={flatItems[selected]?.kind === "file" && flatItems[selected]?.id === file.id}
                          onClick={() => openFile(file.id)}
                        >
                          {file.type === "folder" ? <FolderOpen className="size-4 text-amber-600" /> : <FileText className="size-4 text-muted-foreground" />}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-medium">{file.name}</span>
                            <span className="block truncate text-[10px] text-muted-foreground">{os.fs.pathOf(file.id)}</span>
                          </span>
                        </ResultRow>
                      ))}
                    </Section>
                  )}
                  {results.actions.length > 0 && (
                    <Section title="Actions">
                      {results.actions.map((action) => (
                        <ResultRow
                          key={action.id}
                          active={flatItems[selected]?.kind === "action" && flatItems[selected]?.id === action.id}
                          onClick={() => { action.run(); onClose(); }}
                        >
                          <ArrowRight className="size-4 text-muted-foreground" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-medium">{action.label}</span>
                            <span className="block truncate text-[10px] text-muted-foreground">{action.description}</span>
                          </span>
                        </ResultRow>
                      ))}
                    </Section>
                  )}
                </>
              )}
            </div>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between px-0.5">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pinned</h3>
                <span className="text-[10px] text-muted-foreground">Right-click a tile to pin or unpin</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
                {installedApps.slice(0, 12).map((app) => {
                  const pinned = os.settings.pinnedApps.includes(app.id);
                  return (
                    <button
                      key={app.id}
                      onClick={() => { os.openApp(app.id); onClose(); }}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        os.togglePinApp(app.id);
                      }}
                      className="group relative flex flex-col items-center gap-1.5 rounded-xl px-1 py-2.5 transition hover:bg-muted/80"
                      title={app.tagline}
                    >
                      <AppIcon app={app} size="lg" />
                      <span className="w-full truncate text-center text-[10.5px] font-medium">{app.name}</span>
                      <span className="absolute right-1 top-1 opacity-0 transition group-hover:opacity-100">
                        {pinned ? <PinOff className="size-3 text-muted-foreground" /> : <Pin className="size-3 text-muted-foreground" />}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between px-0.5">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Recent</h3>
                  <button className="text-[10px] text-muted-foreground hover:text-foreground" onClick={() => { os.openApp("files"); onClose(); }}>
                    Browse files
                  </button>
                </div>
                {recent.length === 0 ? (
                  <p className="px-1 pb-2 text-[11px] text-muted-foreground">Files you edit will appear here.</p>
                ) : (
                  <div className="space-y-0.5">
                    {recent.slice(0, 4).map((file) => (
                      <button
                        key={file.id}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-muted/70"
                        onClick={() => openFile(file.id)}
                      >
                        <FileText className="size-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[11.5px] font-medium">{file.name}</span>
                          <span className="block truncate text-[9.5px] text-muted-foreground">
                            {new Date(file.modifiedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </span>
                        <Clock3 className="size-3 text-muted-foreground/50" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4">
                <h3 className="mb-1.5 px-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">All apps</h3>
                <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
                  {installedApps
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((app) => (
                      <button
                        key={app.id}
                        className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition hover:bg-muted/70"
                        onClick={() => { os.openApp(app.id); onClose(); }}
                      >
                        <AppIcon app={app} size="sm" />
                        <span className="min-w-0 flex-1 truncate text-[11.5px]">{app.name}</span>
                        <ChevronRight className="size-3 text-muted-foreground/40" />
                      </button>
                    ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border/50 px-3 py-2">
          <button
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] transition hover:bg-muted"
            onClick={() => { os.openApp("about"); onClose(); }}
          >
            <span className="flex size-5 items-center justify-center rounded bg-primary text-[9px] font-bold text-primary-foreground">W</span>
            WindOS 1.0.0
          </button>
          <div className="flex items-center gap-1">
            <button className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground" onClick={() => { os.openApp("settings"); onClose(); }} aria-label="Settings">
              <UserRound className="size-4" />
            </button>
            <button
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] text-muted-foreground transition hover:bg-muted hover:text-foreground"
              onClick={() => { os.openApp("recovery"); onClose(); }}
            >
              <Power className="size-3.5" />
              Power
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function ResultRow({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition",
        active ? "bg-primary/10" : "hover:bg-muted/70",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function PowerItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11.5px] transition hover:bg-muted",
        danger && "text-red-600 hover:bg-red-500/10 dark:text-red-400",
      )}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}
