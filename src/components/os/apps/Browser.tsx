import { useEffect, useMemo, useRef, useState } from "react";
import { useOS } from "@/lib/os/store";
import { usePersisted } from "@/lib/os/hooks";
import { cn } from "@/lib/utils";
import { ToolButton } from "./ui";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookmarkPlus,
  Camera,
  Download,
  ExternalLink,
  Globe2,
  History,
  Home,
  Info,
  Lock,
  Menu,
  Mic,
  MoreHorizontal,
  Plus,
  RotateCw,
  Search,
  Settings2,
  Shield,
  ShieldAlert,
  Star,
  Trash2,
  X,
} from "lucide-react";

interface BrowserTab {
  id: string;
  url: string;
  input: string;
  stack: string[];
  index: number;
  private: boolean;
  bump: number;
}
interface HistoryEntry { id: string; url: string; title: string; at: number }
interface BookmarkEntry { id: string; url: string; title: string; at: number }
interface DownloadEntry { id: string; name: string; url: string; at: number; fileId?: string }

type Panel = "history" | "bookmarks" | "downloads" | "settings" | "permissions" | null;

const QUICK_LINKS = [
  { name: "Wikipedia", url: "https://en.wikipedia.org/wiki/Operating_system", note: "Reference" },
  { name: "MDN Web Docs", url: "https://developer.mozilla.org", note: "Developer" },
  { name: "Hacker News", url: "https://news.ycombinator.com", note: "Community" },
  { name: "Example", url: "https://example.com", note: "Test page" },
];

function newTab(privateMode = false): BrowserTab {
  return { id: `tab_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, url: "", input: "", stack: [], index: -1, private: privateMode, bump: 0 };
}

function hostOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "New tab"; }
}

export default function Browser({ payload }: { payload?: Record<string, unknown> }) {
  const os = useOS();
  const [initialTab] = useState(() => newTab());
  const [tabs, setTabs] = useState<BrowserTab[]>(() => [initialTab]);
  const [activeId, setActiveId] = useState<string>(initialTab.id);
  const [history, setHistory] = usePersisted<HistoryEntry[]>("browser.history.v1", []);
  const [bookmarks, setBookmarks] = usePersisted<BookmarkEntry[]>("browser.bookmarks.v1", []);
  const [downloads, setDownloads] = usePersisted<DownloadEntry[]>("browser.downloads.v1", []);
  const [panel, setPanel] = useState<Panel>(null);
  const [error, setError] = useState("");
  const [edgeNotice, setEdgeNotice] = useState<string | null>(null);
  const [popupProtection, setPopupProtection] = useState(true);
  const [searchEngine, setSearchEngine] = useState<"duckduckgo" | "bing" | "google">("duckduckgo");
  const [siteGrants, setSiteGrants] = usePersisted<Record<string, string[]>>("browser.sitePermissions.v1", {});
  const [loading, setLoading] = useState(false);
  const [bookmarkQuery, setBookmarkQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const desired = typeof payload?.url === "string" ? payload.url : typeof payload?.query === "string" ? payload.query : null;
    if (desired) navigate(desired);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];
  const isPrivateActive = Boolean(active?.private);

  const searchUrl = useMemo(() => {
    const engines = {
      duckduckgo: "https://duckduckgo.com/?q=",
      bing: "https://www.bing.com/search?q=",
      google: "https://www.google.com/search?q=",
    };
    return engines[searchEngine];
  }, [searchEngine]);

  function updateTab(id: string, patch: Partial<BrowserTab>) {
    setTabs((prev) => prev.map((tab) => (tab.id === id ? { ...tab, ...patch } : tab)));
  }

  function normalize(raw: string): { url?: string; error?: string } {
    const value = raw.trim();
    if (!value) return { error: "Type a web address or search term." };
    const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(value);
    if (scheme) {
      const protocol = scheme[1].toLowerCase();
      if (!["http", "https"].includes(protocol)) {
        return { error: `For safety, WindBrowser blocks "${protocol}:" addresses. Only http and https are allowed.` };
      }
      try {
        new URL(value);
        return { url: value };
      } catch {
        return { error: "That address could not be parsed." };
      }
    }
    if (/^(localhost|\d{1,3}(\.\d{1,3}){3})(:\d+)?(\/|$)/.test(value)) return { url: `http://${value}` };
    if (/^[\w-]+(\.[\w-]+)+(\/|$|\?)/.test(value) && !value.includes(" ")) return { url: `https://${value}` };
    return { url: `${searchUrl}${encodeURIComponent(value)}` };
  }

  function attemptEdge(url: string) {
    try {
      const anchor = document.createElement("a");
      anchor.href = `microsoft-edge:${url}`;
      anchor.rel = "noopener noreferrer";
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setEdgeNotice("WindOS attempted to hand this address to Microsoft Edge with the microsoft-edge: protocol. A web page cannot detect whether Edge is installed, see the browser block the launch, or control your host browser. Use Open externally if nothing happened.");
    } catch {
      setEdgeNotice("The browser blocked the microsoft-edge: handoff. This is expected — a web page cannot launch or control host applications. Use Open externally to continue.");
    }
  }

  function navigate(raw: string, options: { edge?: boolean; tabId?: string; replace?: boolean } = {}) {
    const id = options.tabId ?? activeId;
    const tab = tabs.find((entry) => entry.id === id);
    if (!tab) return;
    const result = normalize(raw);
    if (result.error) {
      setError(result.error);
      return;
    }
    setError("");
    if (options.edge) attemptEdge(result.url!);
    setTabs((prev) => prev.map((entry) => {
      if (entry.id !== id) return entry;
      const stack = options.replace && entry.index >= 0 ? [...entry.stack.slice(0, entry.index), result.url!] : [...entry.stack.slice(0, entry.index + 1), result.url!];
      return { ...entry, url: result.url!, input: result.url!, stack, index: stack.length - 1, bump: entry.bump + 1 };
    }));
    if (!tab.private) {
      setHistory((prev) => [{ id: `hist_${Date.now()}`, url: result.url!, title: hostOf(result.url!), at: Date.now() }, ...prev].slice(0, 250));
    }
    setLoading(true);
    setPanel(null);
  }

  function go(raw: string) {
    navigate(raw, { edge: true });
    inputRef.current?.blur();
  }

  function back() {
    if (!active || active.index <= 0) return;
    const index = active.index - 1;
    setTabs((prev) => prev.map((tab) => (tab.id === active.id ? { ...tab, index, url: tab.stack[index], input: tab.stack[index], bump: tab.bump + 1 } : tab)));
    setLoading(true);
  }

  function forward() {
    if (!active || active.index >= active.stack.length - 1) return;
    const index = active.index + 1;
    setTabs((prev) => prev.map((tab) => (tab.id === active.id ? { ...tab, index, url: tab.stack[index], input: tab.stack[index], bump: tab.bump + 1 } : tab)));
    setLoading(true);
  }

  function reload() {
    if (!active) return;
    if (active.url) updateTab(active.id, { bump: active.bump + 1 });
    setLoading(true);
  }

  function addTab(withPrivate = false) {
    const tab = newTab(withPrivate);
    setTabs((prev) => [...prev, tab]);
    setActiveId(tab.id);
    setPanel(null);
    setError("");
    setLoading(false);
  }

  function closeTab(id: string) {
    setTabs((prev) => {
      const next = prev.filter((tab) => tab.id !== id);
      if (next.length === 0) {
        const tab = newTab();
        setActiveId(tab.id);
        return [tab];
      }
      if (id === activeId) setActiveId(next[Math.max(0, prev.findIndex((tab) => tab.id === id) - 1)]?.id ?? next[0].id);
      return next;
    });
  }

  function openExternal() {
    if (!active?.url) return;
    let opened: Window | null = null;
    try { opened = window.open(active.url, "_blank", "noopener,noreferrer"); } catch { opened = null; }
    if (!opened) {
      os.notify({ appId: "WindBrowser", title: "Pop-up blocked", body: "Your browser blocked the new tab. Allow pop-ups for this site or copy the URL from the address bar." });
    }
  }

  function bookmarkCurrent() {
    if (!active?.url) return;
    if (bookmarks.some((entry) => entry.url === active.url)) {
      setBookmarks((prev) => prev.filter((entry) => entry.url !== active.url));
      return;
    }
    setBookmarks((prev) => [{ id: `bm_${Date.now()}`, url: active.url, title: hostOf(active.url), at: Date.now() }, ...prev]);
    os.notify({ appId: "WindBrowser", title: "Bookmark saved", body: hostOf(active.url) });
  }

  function downloadCurrent() {
    if (!active?.url) return;
    const host = hostOf(active.url);
    const name = `${host}-${new Date().toISOString().slice(0, 10)}.url`;
    const node = os.fs.createFile("folder_downloads", name, `[InternetShortcut]\nURL=${active.url}\n`, "text/uri-list");
    const entry: DownloadEntry = { id: `dl_${Date.now()}`, name, url: active.url, at: Date.now(), fileId: node?.id };
    setDownloads((prev) => [entry, ...prev]);
    os.notify({
      appId: "WindBrowser",
      title: "Download complete",
      body: `${name} was saved to Downloads. WindBrowser saves a .url shortcut because cross-origin page contents cannot be fetched from the sandbox.`,
    });
    setPanel("downloads");
  }

  async function toggleSitePermission(kind: "camera" | "microphone") {
    if (!active?.url) return;
    const origin = new URL(active.url).origin;
    const current = siteGrants[origin] ?? [];
    if (current.includes(kind)) {
      setSiteGrants({ ...siteGrants, [origin]: current.filter((entry) => entry !== kind) });
      return;
    }
    const ok = await os.requestPermission("browser", kind);
    if (ok) setSiteGrants({ ...siteGrants, [origin]: [...current, kind] });
  }

  const currentOrigin = active?.url ? (() => { try { return new URL(active.url).origin; } catch { return ""; } })() : "";
  const currentGrants = currentOrigin ? siteGrants[currentOrigin] ?? [] : [];
  const secure = active?.url.startsWith("https://");
  const filteredBookmarks = bookmarks.filter((entry) => entry.title.toLowerCase().includes(bookmarkQuery.toLowerCase()) || entry.url.toLowerCase().includes(bookmarkQuery.toLowerCase()));

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <div className="flex items-center gap-1 border-b border-border/60 px-2 py-1.5">
        <div className="flex items-center gap-0.5">
          <button className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted disabled:opacity-30" disabled={!active || active.index <= 0} onClick={back} aria-label="Back"><ArrowLeft className="size-3.5" /></button>
          <button className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted disabled:opacity-30" disabled={!active || active.index >= active.stack.length - 1} onClick={forward} aria-label="Forward"><ArrowRight className="size-3.5" /></button>
          <button className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted" onClick={reload} aria-label="Reload"><RotateCw className={cn("size-3.5", loading && "animate-spin")} /></button>
          <button className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted" onClick={() => { if (active) updateTab(active.id, { url: "", input: "", stack: [], index: -1 }); setError(""); }} aria-label="Home"><Home className="size-3.5" /></button>
        </div>

        <div className={cn("flex h-8 min-w-0 flex-1 items-center gap-1.5 rounded-full border px-2.5 transition focus-within:border-primary/50", isPrivateActive ? "border-violet-400/40 bg-violet-500/5" : "border-border bg-muted/40")}>
          {isPrivateActive ? <Shield className="size-3.5 shrink-0 text-violet-500" /> : secure ? <Lock className="size-3 shrink-0 text-emerald-600 dark:text-emerald-400" /> : active?.url ? <ShieldAlert className="size-3.5 shrink-0 text-amber-500" /> : <Search className="size-3.5 shrink-0 text-muted-foreground" />}
          <input
            ref={inputRef}
            value={active?.input ?? ""}
            onChange={(event) => active && updateTab(active.id, { input: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === "Enter") go(active.input);
            }}
            placeholder="Search or enter an address"
            className="h-full min-w-0 flex-1 bg-transparent text-[11.5px] outline-none placeholder:text-muted-foreground/70"
            aria-label="Address bar"
          />
          {active?.url && <span className="hidden shrink-0 text-[8.5px] text-muted-foreground sm:block">{secure ? "HTTPS" : "HTTP"}</span>}
        </div>

        <button className="flex h-8 items-center gap-1 rounded-full bg-primary px-2.5 text-[10px] font-semibold text-primary-foreground transition hover:bg-primary/90" onClick={() => go(active?.input ?? "")}>Go</button>
        <div className="hidden items-center gap-0.5 sm:flex">
          <button className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted" onClick={bookmarkCurrent} title="Bookmark this page" aria-label="Bookmark"><Star className={cn("size-3.5", bookmarkQuery && "hidden", bookmarks.some((entry) => entry.url === active?.url) && "fill-amber-400 text-amber-400")} /></button>
          <button className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted" onClick={() => setPanel(panel === "history" ? null : "history")} title="History" aria-label="History"><History className="size-3.5" /></button>
          <button className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted" onClick={() => setPanel(panel === "bookmarks" ? null : "bookmarks")} title="Bookmarks" aria-label="Bookmarks"><Bookmark className="size-3.5" /></button>
          <button className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted" onClick={() => setPanel(panel === "downloads" ? null : "downloads")} title="Downloads" aria-label="Downloads"><Download className="size-3.5" /></button>
          <button className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted" onClick={() => setPanel(panel === "settings" ? null : "settings")} title="Browser settings" aria-label="Settings"><Settings2 className="size-3.5" /></button>
        </div>
        <button className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted sm:hidden" onClick={() => setPanel(panel ? null : "settings")} aria-label="Browser menu"><Menu className="size-4" /></button>
      </div>

      <div className="flex items-center gap-1 border-b border-border/50 bg-muted/15 px-2 py-1">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={cn(
              "group flex h-7 max-w-[180px] shrink-0 items-center gap-1.5 rounded-t-md border-b-2 px-2 text-[10.5px] transition",
              tab.id === active?.id ? "border-primary bg-background" : "border-transparent text-muted-foreground hover:bg-background/60",
            )}
          >
            <button className="flex min-w-0 items-center gap-1.5" onClick={() => setActiveId(tab.id)}>
              {tab.private ? <Shield className="size-3 shrink-0 text-violet-500" /> : <Globe2 className="size-3 shrink-0" />}
              <span className="truncate">{tab.url ? hostOf(tab.url) : "New tab"}</span>
            </button>
            <button className="rounded p-0.5 opacity-0 transition group-hover:opacity-100" onClick={() => closeTab(tab.id)} aria-label="Close tab"><X className="size-2.5" /></button>
          </div>
        ))}
        <button className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted" onClick={() => addTab()} aria-label="New tab"><Plus className="size-3.5" /></button>
        <button className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted" onClick={() => addTab(true)} title="New private tab" aria-label="New private tab"><Shield className="size-3.5" /></button>
        {isPrivateActive && <span className="ml-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-[8.5px] font-medium text-violet-600 dark:text-violet-300">Private · history and bookmarks are not recorded</span>}
        <span className="ml-auto hidden text-[8.5px] text-muted-foreground md:block">{tabs.length} tab{tabs.length === 1 ? "" : "s"}</span>
      </div>

      {bookmarks.length > 0 && (
        <div className="flex shrink-0 items-center gap-2 border-b border-border/40 px-2 py-1">
          <span className="text-[8.5px] uppercase tracking-wider text-muted-foreground">Bookmarks</span>
          <div className="flex flex-1 gap-1 overflow-x-auto scrollbar-none">
            {bookmarks.slice(0, 8).map((entry) => (
              <button key={entry.id} className="flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[9.5px] text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => navigate(entry.url)}>
                <Globe2 className="size-2.5" /> {entry.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <div className="relative flex min-w-0 flex-1 flex-col">
          {active?.url && (
            <div className="flex shrink-0 items-center gap-2 border-b border-border/50 bg-muted/20 px-2 py-1 text-[9px] text-muted-foreground">
              <ExternalLink className="size-3" />
              <span className="truncate">Embedded view. Sites that send X-Frame-Options or CSP frame-ancestors cannot render inside WindBrowser.</span>
              <button className="ml-auto shrink-0 rounded border border-border bg-background px-1.5 py-0.5 font-medium text-foreground hover:bg-muted" onClick={openExternal}>Open externally</button>
              <button className="shrink-0 rounded border border-border bg-background px-1.5 py-0.5 font-medium text-foreground hover:bg-muted" onClick={() => attemptEdge(active.url)}>Try Edge</button>
            </div>
          )}
          {edgeNotice && (
            <div className="flex shrink-0 items-start gap-2 border-b border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[9.5px] text-amber-800 dark:text-amber-200">
              <Info className="mt-0.5 size-3 shrink-0" />
              <p className="flex-1">{edgeNotice}</p>
              <button className="rounded p-0.5 hover:bg-amber-500/20" onClick={() => setEdgeNotice(null)} aria-label="Dismiss"><X className="size-3" /></button>
            </div>
          )}
          {error && (
            <div className="m-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-[10.5px] text-red-700 dark:text-red-300">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-semibold">Navigation blocked</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {!active?.url ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8">
              <div className="mx-auto max-w-xl">
                <div className="mb-6 flex items-center gap-2">
                  <div className={cn("flex size-10 items-center justify-center rounded-xl", isPrivateActive ? "bg-violet-500/10 text-violet-500" : "bg-primary/10 text-primary")}>
                    {isPrivateActive ? <Shield className="size-5" /> : <Globe2 className="size-5" />}
                  </div>
                  <div>
                    <h2 className="text-[18px] font-semibold tracking-tight">{isPrivateActive ? "Private browsing" : "New tab"}</h2>
                    <p className="text-[10.5px] text-muted-foreground">{isPrivateActive ? "Pages you visit in this tab are not added to WindBrowser history." : "Search the web or open a site. Pages load in a sandboxed frame."}</p>
                  </div>
                </div>
                <form className="mb-6" onSubmit={(event) => { event.preventDefault(); go(active?.input ?? ""); }}>
                  <div className="flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 shadow-sm transition focus-within:border-primary/50">
                    <Search className="size-4 text-muted-foreground" />
                    <input
                      value={active?.input ?? ""}
                      onChange={(event) => active && updateTab(active.id, { input: event.target.value })}
                      placeholder="Search the web or type a URL"
                      className="h-full flex-1 bg-transparent text-[12px] outline-none placeholder:text-muted-foreground/60"
                      aria-label="Search or URL"
                    />
                    <button type="submit" className="rounded-full bg-primary px-3 py-1 text-[10px] font-semibold text-primary-foreground">Go</button>
                  </div>
                </form>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Quick links</p>
                  <span className="text-[9px] text-muted-foreground">{searchEngine}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_LINKS.map((link) => (
                    <button key={link.url} onClick={() => navigate(link.url)} className="group flex items-start gap-2.5 rounded-xl border border-border/70 bg-card p-3 text-left transition hover:border-primary/30 hover:bg-muted/40">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground transition group-hover:bg-primary/10 group-hover:text-primary"><Globe2 className="size-4" /></div>
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-medium">{link.name}</p>
                        <p className="text-[9px] text-muted-foreground">{link.note}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-6 grid gap-2 sm:grid-cols-2">
                  <button onClick={() => setPanel("history")} className="flex items-center gap-2 rounded-lg border border-border/60 p-2.5 text-left text-[10px] hover:bg-muted/40"><History className="size-3.5 text-muted-foreground" /> <span className="flex-1">Recent history</span><span className="text-muted-foreground">{history.length}</span></button>
                  <button onClick={() => setPanel("permissions")} className="flex items-center gap-2 rounded-lg border border-border/60 p-2.5 text-left text-[10px] hover:bg-muted/40"><Camera className="size-3.5 text-muted-foreground" /> <span className="flex-1">Website permissions</span></button>
                </div>
                <p className="mt-6 rounded-lg border border-border/50 bg-muted/20 p-2.5 text-[9px] leading-relaxed text-muted-foreground">
                  WindBrowser cannot control your host browser or guarantee Microsoft Edge is installed. Pressing Go attempts an external <code className="rounded bg-muted px-1">microsoft-edge:</code> handoff and always offers a normal external tab fallback. Only http and https addresses are permitted; <code className="rounded bg-muted px-1">javascript:</code> and <code className="rounded bg-muted px-1">data:</code> URLs are rejected.
                </p>
              </div>
            </div>
          ) : (
            <div className="relative min-h-0 flex-1 bg-white">
              <iframe
                key={`${active.id}-${active.bump}`}
                title={`WindBrowser: ${hostOf(active.url)}`}
                src={active.url}
                onLoad={() => setLoading(false)}
                referrerPolicy="no-referrer"
                sandbox={popupProtection ? "allow-scripts allow-forms allow-same-origin" : "allow-scripts allow-forms allow-same-origin allow-popups"}
                className="h-full w-full border-0"
              />
              {loading && <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-primary/20"><div className="h-full w-1/3 animate-[loadingbar_1.2s_ease-in-out_infinite] bg-primary" /></div>}
            </div>
          )}
        </div>

        {panel && (
          <aside className="flex w-[280px] shrink-0 flex-col border-l border-border/60 bg-muted/10">
            <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
              <p className="text-[11px] font-semibold capitalize">{panel === "settings" ? "Browser settings" : panel}</p>
              <button className="rounded p-1 text-muted-foreground hover:bg-muted" onClick={() => setPanel(null)} aria-label="Close panel"><X className="size-3.5" /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
              {panel === "history" && (
                <>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[9px] text-muted-foreground">{history.length} entries · not recorded in private tabs</span>
                    <button className="text-[9px] text-red-500 hover:underline" onClick={() => setHistory([])}>Clear all</button>
                  </div>
                  <div className="space-y-1">
                    {history.map((entry) => (
                      <div key={entry.id} className="group flex items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-muted">
                        <button className="min-w-0 flex-1 text-left" onClick={() => navigate(entry.url)}>
                          <p className="truncate text-[10.5px]">{entry.title}</p>
                          <p className="truncate text-[8.5px] text-muted-foreground">{entry.url}</p>
                        </button>
                        <span className="shrink-0 text-[8px] text-muted-foreground">{new Date(entry.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        <button className="rounded p-0.5 opacity-0 hover:bg-background group-hover:opacity-100" onClick={() => setHistory((prev) => prev.filter((item) => item.id !== entry.id))} aria-label="Remove history entry"><X className="size-2.5" /></button>
                      </div>
                    ))}
                    {history.length === 0 && <p className="py-4 text-center text-[10px] text-muted-foreground">No browsing history yet.</p>}
                  </div>
                </>
              )}

              {panel === "bookmarks" && (
                <>
                  <div className="mb-2 flex items-center gap-1 rounded-md border border-border bg-background px-2">
                    <Search className="size-3 text-muted-foreground" />
                    <input value={bookmarkQuery} onChange={(event) => setBookmarkQuery(event.target.value)} placeholder="Search bookmarks" className="h-7 flex-1 bg-transparent text-[10px] outline-none" />
                  </div>
                  <div className="mb-2 flex justify-end">
                    <button className="flex items-center gap-1 text-[9px] text-primary hover:underline" onClick={bookmarkCurrent}><BookmarkPlus className="size-3" /> Bookmark current page</button>
                  </div>
                  <div className="space-y-1">
                    {filteredBookmarks.map((entry) => (
                      <div key={entry.id} className="group flex items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-muted">
                        <button className="min-w-0 flex-1 text-left" onClick={() => navigate(entry.url)}>
                          <p className="truncate text-[10.5px]">{entry.title}</p>
                          <p className="truncate text-[8.5px] text-muted-foreground">{entry.url}</p>
                        </button>
                        <button className="rounded p-0.5 opacity-0 hover:bg-background group-hover:opacity-100" onClick={() => setBookmarks((prev) => prev.filter((item) => item.id !== entry.id))} aria-label="Delete bookmark"><Trash2 className="size-2.5" /></button>
                      </div>
                    ))}
                    {filteredBookmarks.length === 0 && <p className="py-4 text-center text-[10px] text-muted-foreground">No bookmarks match.</p>}
                  </div>
                </>
              )}

              {panel === "downloads" && (
                <>
                  <p className="mb-2 text-[9px] text-muted-foreground">Saved as .url shortcuts in Downloads. Cross-origin pages cannot be read by WindOS, so page contents are not copied.</p>
                  <div className="space-y-1">
                    {downloads.map((entry) => (
                      <div key={entry.id} className="rounded-md border border-border/60 p-1.5">
                        <p className="truncate text-[10px] font-medium">{entry.name}</p>
                        <p className="truncate text-[8.5px] text-muted-foreground">{entry.url}</p>
                        <div className="mt-1 flex gap-2">
                          <button className="text-[8.5px] text-primary hover:underline" onClick={() => navigate(entry.url)}>Open page</button>
                          <button className="text-[8.5px] text-muted-foreground hover:underline" onClick={() => os.openApp("files")}>Show Downloads</button>
                          <button className="ml-auto text-[8.5px] text-red-500 hover:underline" onClick={() => setDownloads((prev) => prev.filter((item) => item.id !== entry.id))}>Remove</button>
                        </div>
                      </div>
                    ))}
                    {downloads.length === 0 && <p className="py-4 text-center text-[10px] text-muted-foreground">No downloads yet.</p>}
                  </div>
                  {active?.url && <button className="mt-2 w-full rounded border border-border py-1 text-[9.5px] hover:bg-muted" onClick={downloadCurrent}>Download current page shortcut</button>}
                </>
              )}

              {panel === "permissions" && (
                <>
                  <p className="mb-2 text-[9px] text-muted-foreground">Per-site grants are stored locally. Enabling a capability triggers a WindOS permission prompt so the request is logged and auditable.</p>
                  <p className="mb-2 truncate rounded bg-muted px-2 py-1 font-mono text-[8.5px]">{currentOrigin || "No site open"}</p>
                  {(["camera", "microphone"] as const).map((kind) => {
                    const granted = currentGrants.includes(kind);
                    return (
                      <div key={kind} className="mb-1.5 flex items-center gap-2 rounded-lg border border-border/60 p-2">
                        {kind === "camera" ? <Camera className="size-3.5 text-muted-foreground" /> : <Mic className="size-3.5 text-muted-foreground" />}
                        <div className="flex-1">
                          <p className="text-[10px] font-medium capitalize">{kind}</p>
                          <p className="text-[8.5px] text-muted-foreground">{granted ? "Allowed for this site" : "Blocked"}</p>
                        </div>
                        <button
                          disabled={!currentOrigin}
                          className={cn("rounded px-1.5 py-0.5 text-[8.5px] font-medium", granted ? "bg-red-500/10 text-red-600" : "bg-primary/10 text-primary")}
                          onClick={() => void toggleSitePermission(kind)}
                        >
                          {granted ? "Revoke" : "Allow"}
                        </button>
                      </div>
                    );
                  })}
                  <div className="mt-2 rounded-lg border border-border/60 p-2 text-[8.5px] text-muted-foreground">
                    WindBrowser never returns real camera or microphone streams to embedded sites. Grants authorize the WindOS permission layer only; dedicated apps such as WindRecorder request actual media access.
                  </div>
                </>
              )}

              {panel === "settings" && (
                <div className="space-y-3">
                  <div>
                    <p className="mb-1 text-[10px] font-medium">Search engine</p>
                    <select value={searchEngine} onChange={(event) => setSearchEngine(event.target.value as typeof searchEngine)} className="h-7 w-full rounded border border-border bg-background px-1.5 text-[10px] outline-none">
                      <option value="duckduckgo">DuckDuckGo</option>
                      <option value="bing">Bing</option>
                      <option value="google">Google</option>
                    </select>
                  </div>
                  <label className="flex items-start gap-2 rounded-lg border border-border/60 p-2">
                    <input type="checkbox" checked={popupProtection} onChange={(event) => setPopupProtection(event.target.checked)} className="mt-0.5 accent-[var(--os-accent)]" />
                    <span>
                      <span className="block text-[10px] font-medium">Pop-up protection</span>
                      <span className="block text-[8.5px] text-muted-foreground">Removes allow-popups from the iframe sandbox, so embedded pages cannot open host windows.</span>
                    </span>
                  </label>
                  <div className="rounded-lg border border-border/60 p-2">
                    <p className="text-[10px] font-medium">Private mode</p>
                    <p className="mb-1.5 text-[8.5px] text-muted-foreground">Private tabs stay out of history and skip bookmark suggestions.</p>
                    <button className="w-full rounded bg-muted py-1 text-[9.5px] hover:bg-muted/70" onClick={() => addTab(true)}>Open private tab</button>
                  </div>
                  <button className="flex w-full items-center justify-between rounded-lg border border-border/60 p-2 text-[10px]" onClick={() => { void os.copyText(active?.url ?? "", "browser"); }}>
                    <span>Copy current URL</span><span className="text-muted-foreground">clipboard</span>
                  </button>
                  <button className="flex w-full items-center justify-between rounded-lg border border-border/60 p-2 text-[10px]" onClick={() => setHistory([])}>
                    <span>Clear browsing history</span><span className="text-red-500">{history.length}</span>
                  </button>
                  <button className="flex w-full items-center justify-between rounded-lg border border-border/60 p-2 text-[10px]" onClick={() => setDownloads([])}>
                    <span>Clear download records</span><span className="text-red-500">{downloads.length}</span>
                  </button>
                  <p className="text-[8.5px] leading-relaxed text-muted-foreground">WindBrowser is a sandboxed viewer, not a system browser. It cannot install Edge, read Edge data, or bypass a website's embedding policy.</p>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
