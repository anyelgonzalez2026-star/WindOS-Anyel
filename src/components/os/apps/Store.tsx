import { useEffect, useMemo, useRef, useState } from "react";
import { useOS } from "@/lib/os/store";
import { STORE_CATALOG, APP_CATEGORIES, featuredApps, APP_MAP } from "@/lib/os/registry";
import { usePersisted } from "@/lib/os/hooks";
import { downloadText } from "@/lib/os/zip";
import type { StorePackage } from "@/lib/os/types";
import { cn } from "@/lib/utils";
import { GhostButton, PrimaryButton, Pill, inputClass } from "./ui";
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  ChevronRight,
  Download,
  Heart,
  Package,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Star,
  Store as StoreIcon,
  Upload,
  X,
} from "lucide-react";

type View = "home" | "apps" | "installed" | "updates";

export default function Store({ payload }: { payload?: Record<string, unknown> }) {
  const os = useOS();
  const [view, setView] = useState<View>("home");
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(typeof payload?.appId === "string" ? payload.appId : null);
  const [favorites, setFavorites] = usePersisted<string[]>("store.favorites.v1", []);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [reviewPkg, setReviewPkg] = useState<StorePackage | null>(null);
  const [confirmUninstall, setConfirmUninstall] = useState<StorePackage | null>(null);
  const [createShortcut, setCreateShortcut] = useState(true);
  const [toast, setToast] = useState("");
  const [manifestError, setManifestError] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  const installTimers = useRef<Map<string, { interval: number; finish: number }>>(new Map());

  useEffect(() => () => {
    for (const operation of installTimers.current.values()) {
      window.clearInterval(operation.interval);
      window.clearTimeout(operation.finish);
    }
    installTimers.current.clear();
  }, []);

  const installedIds = useMemo(() => new Set(os.installed.map((entry) => entry.id)), [os.installed]);
  const updates = os.appUpdates;
  const selected = selectedId ? STORE_CATALOG.find((entry) => entry.app.id === selectedId) ?? null : null;

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return STORE_CATALOG.filter((entry) => {
      if (category !== "All" && entry.app.category !== category) return false;
      if (view === "installed" && !installedIds.has(entry.app.id)) return false;
      if (view === "updates" && !updates.some((update) => update.app.id === entry.app.id)) return false;
      if (!search) return true;
      return `${entry.app.name} ${entry.app.tagline} ${entry.app.description} ${entry.app.publisher} ${entry.app.category}`.toLowerCase().includes(search);
    });
  }, [category, query, view, installedIds, updates]);

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }

  function ensureShortcut(pkg: StorePackage) {
    if (!createShortcut) return;
    const clean = pkg.app.name.replace(/[\\/:*?"<>|]/g, "");
    const existing = os.fs.children("folder_desktop").find((node) => node.mime === "application/x-windos-shortcut" && node.content === pkg.app.id);
    if (existing) return;
    os.fs.createFile("folder_desktop", `${clean}.lnk`, pkg.app.id, "application/x-windos-shortcut");
  }

  function beginInstall(pkg: StorePackage) {
    if (installedIds.has(pkg.app.id) || progress[pkg.app.id] !== undefined) return;
    if (os.settings.safeMode) {
      os.notify({ appId: "WindOS", title: "Safe mode is on", body: "WindOS blocks new installs while safe mode is active." });
      return;
    }
    setReviewPkg(null);
    setProgress((prev) => ({ ...prev, [pkg.app.id]: 3 }));
    let amount = 3;
    const timer = window.setInterval(() => {
      amount = Math.min(94, amount + 6 + Math.random() * 13);
      setProgress((prev) => ({ ...prev, [pkg.app.id]: Math.round(amount) }));
    }, 180);
    const finish = window.setTimeout(() => {
      window.clearInterval(timer);
      installTimers.current.delete(pkg.app.id);
      setProgress((prev) => ({ ...prev, [pkg.app.id]: 100 }));
      os.installApp(pkg.app.id);
      ensureShortcut(pkg);
      window.setTimeout(() => {
        setProgress((prev) => {
          const next = { ...prev };
          delete next[pkg.app.id];
          return next;
        });
        flash(`${pkg.app.name} installed. Find it in Start, search and on the desktop.`);
      }, 420);
    }, 1750);
    installTimers.current.set(pkg.app.id, { interval: timer, finish });
  }

  function cancelInstall(pkg: StorePackage) {
    const operation = installTimers.current.get(pkg.app.id);
    if (!operation) return;
    window.clearInterval(operation.interval);
    window.clearTimeout(operation.finish);
    installTimers.current.delete(pkg.app.id);
    setProgress((prev) => {
      const next = { ...prev };
      delete next[pkg.app.id];
      return next;
    });
    flash(`${pkg.app.name} installation cancelled. Nothing was installed.`);
  }

  function uninstall(pkg: StorePackage) {
    const ok = os.uninstallApp(pkg.app.id);
    if (!ok) return;
    for (const node of os.fs.children("folder_desktop")) {
      if (node.mime === "application/x-windos-shortcut" && node.content === pkg.app.id) os.fs.purge(node.id);
    }
    flash(`${pkg.app.name} removed. User files were kept.`);
  }

  function exportManifest(pkg: StorePackage) {
    const manifest = {
      format: "windos.package/1",
      appId: pkg.app.id,
      name: pkg.app.name,
      version: pkg.app.version,
      publisher: pkg.app.publisher,
      permissions: pkg.app.permissions,
      category: pkg.app.category,
      entry: `windos://app/${pkg.app.id}`,
      signature: "local-manifest-no-signature",
    };
    downloadText(JSON.stringify(manifest, null, 2), `${pkg.app.id}.windpkg.json`, "application/json");
    flash("Package manifest exported.");
  }

  function importManifest(file: File | undefined) {
    setManifestError("");
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const manifest = JSON.parse(String(reader.result)) as { format?: string; appId?: string };
        if (manifest.format !== "windos.package/1" || !manifest.appId) {
          setManifestError("That file is not a WindOS package manifest.");
          return;
        }
        const pkg = STORE_CATALOG.find((entry) => entry.app.id === manifest.appId);
        if (!pkg) {
          setManifestError(`No registered host module matches “${manifest.appId}”. WindOS will not execute arbitrary package code.`);
          return;
        }
        setSelectedId(pkg.app.id);
        setReviewPkg(pkg);
      } catch {
        setManifestError("The manifest could not be parsed as JSON.");
      }
    };
    reader.readAsText(file);
  }

  function getButton(pkg: StorePackage, size: "sm" | "lg" = "sm") {
    const installing = progress[pkg.app.id];
    if (installing !== undefined) {
      return (
        <div className={cn("flex items-center gap-1.5", size === "lg" ? "w-44" : "w-28")}>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${installing}%` }} /></div>
          <span className="text-[9px] tabular-nums text-muted-foreground">{installing}%</span>
          {installing < 100 && <button className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-red-500" onClick={() => cancelInstall(pkg)} aria-label={`Cancel installing ${pkg.app.name}`} title="Cancel installation"><X className="size-3" /></button>}
        </div>
      );
    }
    if (installedIds.has(pkg.app.id)) {
      const update = updates.find((entry) => entry.app.id === pkg.app.id);
      if (update) {
        return <button className="rounded-md bg-primary px-2 py-1 text-[9.5px] font-semibold text-primary-foreground" onClick={() => { os.updateApp(pkg.app.id); flash(`${pkg.app.name} updated to ${pkg.app.version}.`); }}>Update</button>;
      }
      return <button className={cn("rounded-md border border-border font-medium hover:bg-muted", size === "lg" ? "px-4 py-1.5 text-[11px]" : "px-2 py-1 text-[9.5px]")} onClick={() => os.openApp(pkg.app.id)}>Open</button>;
    }
    return (
      <button className={cn("rounded-md bg-primary font-semibold text-primary-foreground transition hover:bg-primary/90", size === "lg" ? "px-4 py-1.5 text-[11px]" : "px-2 py-1 text-[9.5px]")} onClick={() => { setReviewPkg(pkg); setCreateShortcut(true); }}>Get</button>
    );
  }

  function AppCard({ pkg }: { pkg: StorePackage }) {
    const favorite = favorites.includes(pkg.app.id);
    return (
      <div className="group relative flex items-start gap-2.5 rounded-xl border border-border/70 bg-card p-2.5 transition hover:border-primary/25 hover:shadow-sm">
        <button className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm" style={{ background: pkg.app.color }} onClick={() => setSelectedId(pkg.app.id)} aria-label={`Open ${pkg.app.name}`}>
          <pkg.app.icon className="size-5" />
        </button>
        <button className="min-w-0 flex-1 text-left" onClick={() => setSelectedId(pkg.app.id)}>
          <p className="truncate text-[11px] font-semibold">{pkg.app.name}</p>
          <p className="line-clamp-1 text-[9px] text-muted-foreground">{pkg.app.tagline}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[8.5px] text-muted-foreground"><Star className="size-2.5 fill-amber-400 text-amber-400" /> {pkg.app.rating} · {pkg.installs} installs</p>
        </button>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {getButton(pkg)}
          <button className={cn("rounded p-0.5 transition", favorite ? "text-rose-500" : "text-muted-foreground/50 hover:text-rose-500")} onClick={() => setFavorites((prev) => favorite ? prev.filter((id) => id !== pkg.app.id) : [...prev, pkg.app.id])} aria-label={favorite ? "Remove from favourites" : "Add to favourites"}>
            <Heart className={cn("size-3", favorite && "fill-current")} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 bg-background text-foreground">
      <aside className="hidden w-[176px] shrink-0 flex-col border-r border-border/60 bg-muted/15 sm:flex">
        <div className="flex items-center gap-2 border-b border-border/60 px-3 py-3">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground"><StoreIcon className="size-4" /></div>
          <div>
            <p className="text-[11.5px] font-semibold">WindStore</p>
            <p className="text-[8.5px] text-muted-foreground">1.0.0 · local catalogue</p>
          </div>
        </div>
        <nav className="p-1.5">
          {([["home", "Discover", Sparkles], ["apps", "All apps", Package], ["installed", "Installed", Check], ["updates", "Updates", RefreshCw]] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => { setView(id); setSelectedId(null); setCategory("All"); }}
              className={cn("mb-0.5 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[10.5px] transition", view === id ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
            >
              <Icon className="size-3.5" /> {label}
              {id === "updates" && updates.length > 0 && <span className="ml-auto rounded-full bg-primary px-1 text-[8px] text-primary-foreground">{updates.length}</span>}
            </button>
          ))}
        </nav>
        <div className="mx-2 h-px bg-border/60" />
        <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
          <p className="px-2 pb-1 pt-1 text-[8px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/70">Categories</p>
          {["All", ...APP_CATEGORIES].map((item) => (
            <button key={item} onClick={() => { setCategory(item); setView("apps"); setSelectedId(null); }} className={cn("mb-0.5 flex w-full items-center gap-1 rounded px-2 py-1 text-left text-[10px]", category === item && view === "apps" ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground")}>
              <ChevronRight className="size-2.5" /> {item}
            </button>
          ))}
        </div>
        <div className="border-t border-border/60 p-2">
          <button className="flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-[9.5px] text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => importRef.current?.click()}><Upload className="size-3" /> Install local package</button>
          <button className="mt-0.5 flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-[9.5px] text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => exportManifest(STORE_CATALOG[0])}><Download className="size-3" /> Export sample manifest</button>
          <p className="px-1 pt-1 text-[8px] leading-snug text-muted-foreground/70">Packages map to registered host modules; arbitrary code is never executed.</p>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border/60 bg-background/85 px-3 py-2 backdrop-blur">
          {selected ? (
            <button className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] text-muted-foreground hover:bg-muted" onClick={() => setSelectedId(null)}><ArrowLeft className="size-3.5" /> Back to store</button>
          ) : (
            <div className="flex items-center gap-1 sm:hidden">
              {(["home", "apps", "installed", "updates"] as const).map((id) => (
                <button key={id} onClick={() => { setView(id); setCategory("All"); }} className={cn("rounded px-1.5 py-0.5 text-[9.5px] capitalize", view === id ? "bg-primary/10 text-primary" : "text-muted-foreground")}>{id}</button>
              ))}
            </div>
          )}
          <div className="ml-auto flex h-7 w-48 items-center gap-1.5 rounded-full border border-border bg-background px-2.5 sm:w-64">
            <Search className="size-3 text-muted-foreground" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search apps, publishers…" className="h-full w-full bg-transparent text-[10px] outline-none" aria-label="Search store" />
            {query && <button onClick={() => setQuery("")} aria-label="Clear search"><X className="size-3 text-muted-foreground" /></button>}
          </div>
          <Pill tone="accent"><BadgeCheck className="size-2.5" /> {installedIds.size} installed</Pill>
        </div>

        <div className="px-3 py-3 pb-10">
          {toast && <div className="mb-2 flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-[10px] text-emerald-700 dark:text-emerald-300"><Check className="size-3" /> {toast}</div>}
          {manifestError && <div className="mb-2 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-[10px] text-red-600 dark:text-red-300">{manifestError}</div>}

          {selected ? (
            <div className="mx-auto max-w-3xl">
              <div className="overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-primary/8 via-card to-card">
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                  <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg" style={{ background: selected.app.color }}>
                    <selected.app.icon className="size-8" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="text-[20px] font-semibold tracking-tight">{selected.app.name}</h1>
                    <p className="text-[11px] text-muted-foreground">{selected.app.tagline}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[9.5px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Star className="size-3 fill-amber-400 text-amber-400" /> {selected.app.rating} ({selected.app.ratingCount.toLocaleString()})</span>
                      <span>·</span><span>{selected.installs} installs</span>
                      <span>·</span><span>{selected.app.category}</span>
                      <span>·</span><span>v{selected.app.version}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {getButton(selected, "lg")}
                    <button className={cn("flex size-8 items-center justify-center rounded-full border border-border", favorites.includes(selected.app.id) ? "text-rose-500" : "text-muted-foreground hover:text-rose-500")} onClick={() => setFavorites((prev) => prev.includes(selected.app.id) ? prev.filter((id) => id !== selected.app.id) : [...prev, selected.app.id])} aria-label="Favourite">
                      <Heart className={cn("size-3.5", favorites.includes(selected.app.id) && "fill-current")} />
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 overflow-x-auto border-t border-border/50 p-2">
                  {selected.screenshots.map((shot) => (
                    <div key={shot.title} className="flex h-28 w-44 shrink-0 flex-col gap-1 rounded-lg border border-border/50 p-2" style={{ background: `linear-gradient(140deg, ${shot.from}, ${shot.to})` }}>
                      <div className="h-2 w-12 rounded bg-black/10" />
                      <div className="flex flex-1 gap-1">
                        <div className="w-6 rounded bg-white/60" />
                        <div className="flex flex-1 flex-col gap-1"><div className="flex-1 rounded bg-white/70" /><div className="h-3 rounded bg-white/50" /></div>
                      </div>
                      <p className="text-[8px] font-medium text-slate-700/80">{shot.title} · illustrative preview</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-[1fr_220px]">
                <div className="space-y-3">
                  <div className="rounded-xl border border-border/70 bg-card p-3.5">
                    <h2 className="mb-1.5 text-[11px] font-semibold">About this app</h2>
                    <p className="text-[10.5px] leading-relaxed text-muted-foreground">{selected.app.description}</p>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-card p-3.5">
                    <h2 className="mb-1.5 text-[11px] font-semibold">What’s new in {selected.app.version}</h2>
                    <ul className="space-y-1">
                      {selected.whatsNew.map((line) => <li key={line} className="flex items-start gap-1.5 text-[10px] text-muted-foreground"><Check className="mt-0.5 size-3 shrink-0 text-emerald-500" /> {line}</li>)}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-card p-3.5">
                    <h2 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold"><Shield className="size-3.5" /> Permissions</h2>
                    {selected.app.permissions.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {selected.app.permissions.map((permission) => (
                          <span key={permission} className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[9px] capitalize">{permission}</span>
                        ))}
                      </div>
                    ) : <p className="text-[10px] text-muted-foreground">No special capabilities requested. Files and settings access only through WindOS APIs.</p>}
                    <p className="mt-1.5 text-[8.5px] text-muted-foreground">Requests are still gated by the WindOS permission prompt; installing does not pre-authorise real host access.</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="rounded-xl border border-border/70 bg-card p-3 text-[10px]">
                    <p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Details</p>
                    <Detail label="Publisher" value={selected.app.publisher} />
                    <Detail label="Version" value={selected.app.version} />
                    <Detail label="Size" value={`${selected.app.sizeMb} MB`} />
                    <Detail label="Category" value={selected.app.category} />
                    <Detail label="Requires" value="WindOS 1.0.0" />
                    <Detail label="Source" value={selected.app.builtin ? "Included" : "WindStore"} />
                  </div>
                  <button className="flex w-full items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[9.5px] text-muted-foreground hover:bg-muted" onClick={() => exportManifest(selected)}><Download className="size-3" /> Export manifest</button>
                  {installedIds.has(selected.app.id) && !selected.app.systemCritical && (
                    <button className="w-full rounded-lg border border-red-500/30 px-2.5 py-1.5 text-[9.5px] text-red-500 hover:bg-red-500/5" onClick={() => setConfirmUninstall(selected)}>Uninstall {selected.app.name}</button>
                  )}
                  {selected.app.systemCritical && <p className="text-center text-[8.5px] text-muted-foreground">System-critical app — protected from removal.</p>}
                </div>
              </div>
            </div>
          ) : (
            <>
              {view === "home" && !query && (
                <>
                  <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-[#101827] via-[#16223a] to-[#0f2d2c] p-5 text-white">
                    <div className="absolute -right-10 -top-10 size-48 rounded-full bg-white/5 blur-2xl" />
                    <div className="absolute -bottom-20 right-24 size-56 rounded-full bg-teal-400/10 blur-3xl" />
                    <div className="relative max-w-lg">
                      <p className="mb-1 flex items-center gap-1 text-[9px] font-medium uppercase tracking-[0.2em] text-teal-300"><Sparkles className="size-3" /> Featured on WindOS</p>
                      <h1 className="text-[24px] font-semibold leading-tight tracking-tight">{featuredApps[0].name}</h1>
                      <p className="mt-1 max-w-md text-[11px] leading-relaxed text-white/65">{featuredApps[0].description}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button className="rounded-md bg-white px-3 py-1.5 text-[10.5px] font-semibold text-slate-900 hover:bg-white/90" onClick={() => setSelectedId(featuredApps[0].id)}>View details</button>
                        <button className="rounded-md border border-white/20 px-3 py-1.5 text-[10.5px] font-medium hover:bg-white/10" onClick={() => os.openApp(featuredApps[0].id)}>Open app</button>
                        <span className="flex items-center gap-1 text-[9px] text-white/50"><Star className="size-3 fill-amber-400 text-amber-400" /> {featuredApps[0].rating} · {featuredApps[0].publisher}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_200px]">
                    <div>
                      <SectionHeading title="Top picks" subtitle="Hand-selected by the WindOS editors" />
                      <div className="grid gap-2 sm:grid-cols-2">
                        {featuredApps.slice(1, 5).map((pkg) => {
                          const storePkg = STORE_CATALOG.find((entry) => entry.app.id === pkg.id)!;
                          return <AppCard key={pkg.id} pkg={storePkg} />;
                        })}
                      </div>
                      <SectionHeading title="Essentials" subtitle="Core tools, installed with WindOS" />
                      <div className="grid gap-2 sm:grid-cols-2">
                        {STORE_CATALOG.filter((entry) => entry.app.builtin && !entry.app.featured).slice(0, 6).map((pkg) => <AppCard key={pkg.app.id} pkg={pkg} />)}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="rounded-xl border border-border/70 bg-card p-3">
                        <p className="mb-2 flex items-center gap-1 text-[10px] font-semibold"><Heart className="size-3 text-rose-500" /> Favourites</p>
                        {favorites.length === 0 ? <p className="text-[9px] text-muted-foreground">Tap the heart on any app.</p> : (
                          <div className="space-y-1.5">
                            {favorites.slice(0, 5).map((id) => {
                              const pkg = STORE_CATALOG.find((entry) => entry.app.id === id);
                              if (!pkg) return null;
                              return <button key={id} className="flex w-full items-center gap-1.5 text-left" onClick={() => setSelectedId(id)}><pkg.app.icon className="size-3.5" style={{ color: pkg.app.color }} /><span className="truncate text-[9.5px]">{pkg.app.name}</span></button>;
                            })}
                          </div>
                        )}
                      </div>
                      <div className="rounded-xl border border-border/70 bg-card p-3">
                        <p className="mb-1 text-[10px] font-semibold">Store policies</p>
                        <ul className="space-y-1 text-[8.5px] leading-snug text-muted-foreground">
                          <li>· Installs register with WindOS and appear in Start and search.</li>
                          <li>· Uninstalling keeps your files.</li>
                          <li>· Local manifests must match a registered module.</li>
                          <li>· No remote code is fetched or executed.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {view !== "home" && (
                <>
                  <SectionHeading
                    title={view === "apps" ? (category === "All" ? "All applications" : category) : view === "installed" ? "Installed apps" : "Updates available"}
                    subtitle={view === "apps" ? `${filtered.length} apps in the local catalogue` : view === "installed" ? `${filtered.length} packages on this device` : `${updates.length} package updates waiting`}
                  />
                  {view === "updates" && updates.length > 0 && (
                    <button className="mb-2 w-full rounded-lg border border-primary/30 bg-primary/8 px-3 py-2 text-left text-[10px] hover:bg-primary/10" onClick={() => { os.applyAllUpdates(); flash("All app updates installed."); }}>
                      <RefreshCw className="mr-1 inline size-3" /> Update all {updates.length} apps
                    </button>
                  )}
                </>
              )}

              {(view !== "home" || query) && (
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {filtered.map((pkg) => <AppCard key={pkg.app.id} pkg={pkg} />)}
                </div>
              )}
              {(view !== "home" || query) && filtered.length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <Package className="mx-auto mb-2 size-6 text-muted-foreground/40" />
                  <p className="text-[11px] font-medium">No apps found</p>
                  <p className="mt-0.5 text-[9.5px] text-muted-foreground">{query ? `Nothing matches “${query}”.` : view === "updates" ? "Everything is up to date." : "Nothing installed in this category yet."}</p>
                </div>
              )}
              {view === "home" && query && <p className="mb-2 text-[9.5px] text-muted-foreground">{filtered.length} search results across the catalogue</p>}
              {view === "home" && query && filtered.length === 0 && <p className="py-4 text-center text-[10px] text-muted-foreground">No matches for “{query}”.</p>}
            </>
          )}
        </div>
      </main>

      <input ref={importRef} type="file" accept=".json,application/json" className="hidden" onChange={(event) => { importManifest(event.target.files?.[0]); event.target.value = ""; }} />

      {reviewPkg && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-popover p-4 shadow-2xl">
            <div className="flex items-start gap-2.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: reviewPkg.app.color }}><reviewPkg.app.icon className="size-5" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-semibold">Install {reviewPkg.app.name}?</p>
                <p className="text-[9.5px] text-muted-foreground">{reviewPkg.app.publisher} · v{reviewPkg.app.version} · {reviewPkg.app.sizeMb} MB</p>
              </div>
              <button className="rounded p-1 text-muted-foreground hover:bg-muted" onClick={() => setReviewPkg(null)} aria-label="Cancel"><X className="size-3.5" /></button>
            </div>
            <div className="mt-3 rounded-lg border border-border/60 bg-muted/25 p-2">
              <p className="mb-1 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground"><Shield className="size-3" /> This app can request</p>
              {reviewPkg.app.permissions.length ? (
                <div className="flex flex-wrap gap-1">{reviewPkg.app.permissions.map((permission) => <span key={permission} className="rounded bg-background px-1.5 py-0.5 text-[8.5px] capitalize">{permission}</span>)}</div>
              ) : <p className="text-[9px] text-muted-foreground">No special permissions.</p>}
            </div>
            <label className="mt-2 flex items-center gap-1.5 text-[9.5px] text-muted-foreground">
              <input type="checkbox" checked={createShortcut} onChange={(event) => setCreateShortcut(event.target.checked)} className="accent-[var(--os-accent)]" /> Add a shortcut to the desktop
            </label>
            <p className="mt-1.5 text-[8.5px] leading-relaxed text-muted-foreground">The package is served from the offline WindOS catalogue. Installing registers its host module; no network download or arbitrary executable code occurs.</p>
            <div className="mt-3 flex justify-end gap-2">
              <GhostButton onClick={() => setReviewPkg(null)}>Cancel</GhostButton>
              <PrimaryButton onClick={() => beginInstall(reviewPkg)}><Download className="size-3.5" /> Install</PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {confirmUninstall && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-popover p-4 shadow-2xl">
            <div className="flex items-start gap-2.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: confirmUninstall.app.color }}><confirmUninstall.app.icon className="size-5" /></div>
              <div className="min-w-0 flex-1"><p className="text-[12.5px] font-semibold">Remove {confirmUninstall.app.name}?</p><p className="text-[9.5px] text-muted-foreground">{confirmUninstall.app.publisher} · v{confirmUninstall.app.version}</p></div>
            </div>
            <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/8 p-2 text-[9px] leading-relaxed text-amber-800 dark:text-amber-200">The app will be removed from Start, search and the desktop. Your virtual files are kept. App-specific local preferences may remain until you clear site data.</div>
            <div className="mt-3 flex justify-end gap-2"><GhostButton onClick={() => setConfirmUninstall(null)}>Cancel</GhostButton><PrimaryButton className="bg-red-600 hover:bg-red-500" onClick={() => { uninstall(confirmUninstall); setConfirmUninstall(null); }}>Remove app</PrimaryButton></div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-2 mt-3 flex items-end justify-between">
      <div>
        <h2 className="text-[12px] font-semibold tracking-tight">{title}</h2>
        <p className="text-[9px] text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-2 py-0.5 text-[9.5px]"><span className="text-muted-foreground">{label}</span><span className="max-w-[120px] break-words text-right font-medium">{value}</span></div>;
}
