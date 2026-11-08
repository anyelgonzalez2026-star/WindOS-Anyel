import { useState } from "react";
import { useOS } from "@/lib/os/store";
import { APP_MAP } from "@/lib/os/registry";
import { AppIcon } from "./AppIcon";
import { cn } from "@/lib/utils";
import { Check, LayoutGrid, Plus, Trash2, X } from "lucide-react";

export function TaskView({ open, onClose }: { open: boolean; onClose: () => void }) {
  const os = useOS();
  const [renaming, setRenaming] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");

  if (!open) return null;
  const activeDesktop = os.desktops[os.activeDesktop];
  const desktopWindows = os.windows.filter((w) => w.desktop === os.activeDesktop);
  const allWindows = os.windows;

  return (
    <div className="fixed inset-0 z-[85] flex flex-col bg-slate-950/55 p-4 text-white backdrop-blur-md sm:p-8" role="dialog" aria-label="Task view">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">WindOS</p>
          <h2 className="text-lg font-semibold">Task view</h2>
        </div>
        <button className="flex size-9 items-center justify-center rounded-lg bg-white/10 transition hover:bg-white/20" onClick={onClose} aria-label="Close task view">
          <X className="size-4" />
        </button>
      </div>

      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-white/70">{os.desktops.length} virtual desktops</p>
          <button className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] transition hover:bg-white/20" onClick={os.addDesktop}>
            <Plus className="size-3.5" /> New desktop
          </button>
        </div>
        <div className="flex gap-2.5 overflow-x-auto pb-2">
          {os.desktops.map((desktop, index) => {
            const count = allWindows.filter((w) => w.desktop === index).length;
            return (
              <div
                key={desktop.id}
                className={cn(
                  "relative w-44 shrink-0 overflow-hidden rounded-xl border text-left transition",
                  index === os.activeDesktop ? "border-white/70 bg-white/15" : "border-white/15 bg-white/5 hover:bg-white/10",
                )}
              >
                <button
                  className="block w-full p-3 text-left"
                  onClick={() => {
                    os.setActiveDesktop(index);
                  }}
                  onDoubleClick={() => {
                    setRenaming(desktop.id);
                    setNameDraft(desktop.name);
                  }}
                >
                  <div className="mb-3 flex h-16 items-end gap-1 rounded-lg bg-gradient-to-br from-white/20 to-white/5 p-1.5">
                    {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
                      <span key={i} className="h-4 flex-1 rounded-sm bg-white/30" />
                    ))}
                    {count === 0 && <span className="w-full text-center text-[9px] text-white/50">Empty</span>}
                  </div>
                  {renaming === desktop.id ? (
                    <input
                      autoFocus
                      value={nameDraft}
                      onChange={(event) => setNameDraft(event.target.value)}
                      onClick={(event) => event.stopPropagation()}
                      onBlur={() => {
                        if (nameDraft.trim()) os.renameDesktop(desktop.id, nameDraft.trim());
                        setRenaming(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          if (nameDraft.trim()) os.renameDesktop(desktop.id, nameDraft.trim());
                          setRenaming(null);
                        }
                      }}
                      className="w-full rounded border border-white/30 bg-black/20 px-1 py-0.5 text-[11px] outline-none"
                    />
                  ) : (
                    <p className="truncate text-[11.5px] font-medium">{desktop.name}</p>
                  )}
                  <p className="text-[9.5px] text-white/50">{count} window{count === 1 ? "" : "s"}</p>
                </button>
                {index === os.activeDesktop && (
                  <span className="absolute right-2 top-2 flex size-4 items-center justify-center rounded-full bg-white text-slate-900">
                    <Check className="size-2.5" />
                  </span>
                )}
                {os.desktops.length > 1 && (
                  <button
                    className="absolute bottom-2 right-2 flex size-5 items-center justify-center rounded text-white/50 transition hover:bg-white/20 hover:text-white"
                    onClick={() => os.removeDesktop(desktop.id)}
                    aria-label={`Remove ${desktop.name}`}
                  >
                    <Trash2 className="size-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <p className="mb-2 text-xs font-medium text-white/70">
          {activeDesktop?.name} · {desktopWindows.length} open window{desktopWindows.length === 1 ? "" : "s"}
        </p>
        {desktopWindows.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 py-16 text-center">
            <LayoutGrid className="mb-3 size-6 text-white/40" />
            <p className="text-sm font-medium">No windows on this desktop</p>
            <p className="mt-1 text-[11px] text-white/50">Open an app from the taskbar or Start to see it here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {desktopWindows.map((win) => {
              const app = APP_MAP.get(win.appId);
              return (
                <div key={win.id} className="group overflow-hidden rounded-xl border border-white/15 bg-white/5 text-left transition hover:bg-white/10">
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2.5"
                    onClick={() => {
                      os.focusWindow(win.id);
                      onClose();
                    }}
                  >
                    {app && <AppIcon app={app} size="sm" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11.5px] font-medium">{win.title}</span>
                      <span className="block text-[9.5px] text-white/50">{app?.name} · {win.minimized ? "minimised" : "open"}</span>
                    </span>
                  </button>
                  <div className="flex items-center gap-1 border-t border-white/10 px-2 py-1.5">
                    <button
                      className="rounded px-1.5 py-0.5 text-[9.5px] text-white/60 transition hover:bg-white/10 hover:text-white"
                      onClick={() => os.moveWindowToDesktop(win.id, os.activeDesktop === 0 ? Math.min(os.desktops.length - 1, 1) : 0)}
                    >
                      Move desktop
                    </button>
                    <button
                      className="ml-auto rounded px-1.5 py-0.5 text-[9.5px] text-white/60 transition hover:bg-white/10 hover:text-white"
                      onClick={() => os.closeWindow(win.id)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px] text-white/40">
        <span>Ctrl+Alt+← / → switches desktops · double-click a desktop to rename</span>
        <button className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[10.5px] transition hover:bg-white/20" onClick={os.minimizeAll}>
          Show desktop
        </button>
      </div>
    </div>
  );
}
