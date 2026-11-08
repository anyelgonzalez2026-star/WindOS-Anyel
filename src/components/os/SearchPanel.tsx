import { useEffect, useMemo, useRef, useState } from "react";
import { useOS } from "@/lib/os/store";
import { usePersisted } from "@/lib/os/hooks";
import { APP_MAP } from "@/lib/os/registry";
import { AppIcon } from "./AppIcon";
import { openFileNode } from "@/lib/os/fileActions";
import { cn } from "@/lib/utils";
import { ArrowRight, Boxes, Command, FileText, Search, Settings2, Sparkles, X } from "lucide-react";

export function SearchPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const os = useOS();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [recent, setRecent] = usePersisted<string[]>("search.recent.v1", []);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      window.setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  const results = useMemo(() => os.searchAll(query), [query, os]);
  const items = useMemo(
    () => [
      ...results.apps.map((app) => ({ kind: "app" as const, id: app.id, label: app.name, app })),
      ...results.files.map((file) => ({ kind: "file" as const, id: file.id, label: file.name, file })),
      ...results.settings.map((entry) => ({ kind: "setting" as const, id: entry.id, label: entry.label, entry })),
      ...results.features.map((feature) => ({ kind: "feature" as const, id: feature.id, label: feature.name, feature })),
      ...results.topics.map((topic) => ({ kind: "topic" as const, id: topic.id, label: topic.title, topic })),
      ...results.actions.map((action) => ({ kind: "action" as const, id: action.id, label: action.label, action })),
    ],
    [results],
  );

  function run(index: number) {
    const item = items[index];
    if (!item) return;
    const term = query.trim();
    if (term) {
      setRecent((previous) => [term, ...previous.filter((entry) => entry.toLowerCase() !== term.toLowerCase())].slice(0, 8));
    }
    switch (item.kind) {
      case "app":
        os.openApp(item.app.id);
        break;
      case "file":
        openFileNode(os, item.file.id);
        break;
      case "setting":
        os.openApp("settings", { section: item.entry.section });
        break;
      case "feature":
        os.openApp("registry", { query: item.feature.name });
        break;
      case "topic":
        os.openApp("help", { topic: item.topic.id });
        break;
      case "action":
        item.action.run();
        break;
    }
    onClose();
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[85] bg-slate-950/25 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div className="fixed inset-x-3 top-[8vh] z-[90] mx-auto flex max-h-[74vh] w-auto max-w-[680px] flex-col overflow-hidden rounded-2xl border border-border/70 bg-popover/97 text-popover-foreground shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
          <Search className="size-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelected(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setSelected((s) => (items.length ? (s + 1) % items.length : s));
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setSelected((s) => (items.length ? (s - 1 + items.length) % items.length : s));
              }
              if (event.key === "Enter") {
                event.preventDefault();
                run(selected);
              }
              if (event.key === "Escape") onClose();
            }}
            placeholder="Search apps, files, settings, features and help"
            className="h-8 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Global search"
          />
          <button className="rounded-md p-1 text-muted-foreground hover:bg-muted" onClick={onClose} aria-label="Close search">
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {!query.trim() ? (
            <div className="px-2 py-5">
              {recent.length > 0 && (
                <div className="mb-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">Recent searches</p>
                    <button className="text-[10px] text-muted-foreground hover:text-foreground" onClick={() => setRecent([])}>Clear</button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {recent.map((term) => (
                      <span key={term} className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/30 py-1 pl-2 pr-1 text-[10px]">
                        <button className="max-w-40 truncate hover:text-primary" onClick={() => { setQuery(term); setSelected(0); inputRef.current?.focus(); }}>{term}</button>
                        <button className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => setRecent((previous) => previous.filter((entry) => entry !== term))} aria-label={`Remove ${term} from recent searches`}><X className="size-2.5" /></button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <p className="mb-3 text-xs font-medium text-muted-foreground">Search across WindOS</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { icon: Command, title: "Try an app", body: "Terminal, Files, WindCode…" },
                  { icon: FileText, title: "Try a file", body: "Search names and text inside files" },
                  { icon: Settings2, title: "Try a setting", body: "Dark mode, accent, startup…" },
                  { icon: Sparkles, title: "Try the registry", body: "Find any of the 640 capabilities" },
                ].map((hint) => (
                  <div key={hint.title} className="flex items-start gap-2.5 rounded-xl border border-border/60 p-3">
                    <hint.icon className="mt-0.5 size-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium">{hint.title}</p>
                      <p className="text-[10.5px] text-muted-foreground">{hint.body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[10.5px] text-muted-foreground">
                Tip: press Enter to open the first result, or Escape to close. Ctrl+Space reopens this panel from anywhere.
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-14 text-center">
              <Boxes className="size-6 text-muted-foreground/50" />
              <p className="text-sm font-medium">Nothing matched “{query}”</p>
              <p className="max-w-xs text-[11px] text-muted-foreground">
                WindOS search covers installed apps, virtual files, settings labels, help topics and the feature registry.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.apps.length > 0 && (
                <Group title={`Applications (${results.apps.length})`}>
                  {results.apps.map((app) => (
                    <Row
                      key={app.id}
                      active={items[selected]?.id === app.id}
                      onClick={() => run(items.findIndex((i) => i.id === app.id))}
                    >
                      <AppIcon app={app} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-medium">{app.name}</span>
                        <span className="block truncate text-[10px] text-muted-foreground">{app.tagline}</span>
                      </span>
                      <ArrowRight className="size-3 text-muted-foreground/50" />
                    </Row>
                  ))}
                </Group>
              )}
              {results.files.length > 0 && (
                <Group title={`Files (${results.files.length})`}>
                  {results.files.map((file) => (
                    <Row key={file.id} active={items[selected]?.id === file.id} onClick={() => run(items.findIndex((i) => i.id === file.id))}>
                      <FileText className="size-4 text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium">{file.name}</span>
                        <span className="block truncate text-[10px] text-muted-foreground">{os.fs.pathOf(file.id)}</span>
                      </span>
                    </Row>
                  ))}
                </Group>
              )}
              {results.settings.length > 0 && (
                <Group title={`Settings (${results.settings.length})`}>
                  {results.settings.map((entry) => (
                    <Row key={entry.id} active={false} onClick={() => run(items.findIndex((i) => i.id === entry.id))}>
                      <Settings2 className="size-4 text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-medium">{entry.label}</span>
                        <span className="block text-[10px] text-muted-foreground">{entry.section}</span>
                      </span>
                    </Row>
                  ))}
                </Group>
              )}
              {results.features.length > 0 && (
                <Group title={`Feature registry (${results.features.length})`}>
                  {results.features.map((feature) => (
                    <Row key={feature.id} active={items[selected]?.id === feature.id} onClick={() => run(items.findIndex((i) => i.id === feature.id))}>
                      <Sparkles className="size-4 text-primary/70" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium">{feature.name}</span>
                        <span className="block truncate text-[10px] text-muted-foreground">{feature.category} · {feature.id} · {feature.status}</span>
                      </span>
                    </Row>
                  ))}
                </Group>
              )}
              {results.topics.length > 0 && (
                <Group title={`Help (${results.topics.length})`}>
                  {results.topics.map((topic) => (
                    <Row key={topic.id} active={items[selected]?.id === topic.id} onClick={() => run(items.findIndex((i) => i.id === topic.id))}>
                      <Sparkles className="size-4 text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium">{topic.title}</span>
                        <span className="block text-[10px] text-muted-foreground">{topic.category}</span>
                      </span>
                    </Row>
                  ))}
                </Group>
              )}
              {results.actions.length > 0 && (
                <Group title={`Actions (${results.actions.length})`}>
                  {results.actions.map((action) => (
                    <Row key={action.id} active={items[selected]?.id === action.id} onClick={() => run(items.findIndex((i) => i.id === action.id))}>
                      <Command className="size-4 text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-medium">{action.label}</span>
                        <span className="block text-[10px] text-muted-foreground">{action.description}</span>
                      </span>
                    </Row>
                  ))}
                </Group>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border/60 px-4 py-2 text-[10px] text-muted-foreground">
          <span>↑↓ navigate · Enter open · Esc close</span>
          <span>{items.length} results</span>
        </div>
      </div>
    </>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 px-2 text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Row({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn("flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition", active ? "bg-primary/10" : "hover:bg-muted/70")}
    >
      {children}
    </button>
  );
}
