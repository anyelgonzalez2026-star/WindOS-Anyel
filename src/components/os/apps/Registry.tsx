import { useMemo, useState } from "react";
import { FEATURE_CATEGORIES, FEATURE_REGISTRY, FEATURE_STATS } from "@/lib/os/features";
import { downloadText } from "@/lib/os/zip";
import { cn } from "@/lib/utils";
import { AppShell, AppHeader, AppToolbar, GhostButton, SearchInput, Pill, Panel, SectionTitle } from "./ui";
import { Check, ChevronRight, Download, Filter, Layers, Search, ShieldCheck, Sparkles, TriangleAlert } from "lucide-react";

export default function Registry() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<"all" | "implemented" | "limited">("all");
  const [selected, setSelected] = useState<string | null>(FEATURE_CATEGORIES[0]?.id ?? null);

  const filteredCategories = useMemo(() => {
    return FEATURE_CATEGORIES.filter((cat) => category === "all" || cat.id === category)
      .map((cat) => ({
        ...cat,
        matching: cat.features.filter((feature) => {
          if (status !== "all" && feature.status !== status) return false;
          const search = query.trim().toLowerCase();
          if (!search) return true;
          return `${feature.name} ${feature.description} ${feature.app} ${cat.name}`.toLowerCase().includes(search);
        }),
      }))
      .filter((cat) => cat.matching.length > 0);
  }, [category, query, status]);

  const categoryStats = FEATURE_CATEGORIES.map((cat) => ({
    id: cat.id,
    name: cat.name,
    total: cat.features.length,
    limited: cat.features.filter((feature) => feature.status === "limited").length,
  }));

  function exportRegistry() {
    const rows = FEATURE_REGISTRY.map((feature) => ({
      id: feature.id,
      category: feature.category,
      name: feature.name,
      description: feature.description,
      owner: feature.app,
      implementation: feature.status,
      verification: feature.verified ? "verified" : "limited",
      note: feature.note ?? "",
    }));
    downloadText(JSON.stringify({ product: "WindOS", version: "1.0.0", stats: FEATURE_STATS, features: rows }, null, 2), "windos-feature-registry.json", "application/json");
  }

  return (
    <AppShell>
      <AppHeader
        icon={Layers}
        title="WindOS Feature Registry"
        subtitle={`${FEATURE_STATS.total} capabilities · ${FEATURE_STATS.categories} categories · ${FEATURE_STATS.limited} documented limitations`}
        actions={<GhostButton onClick={exportRegistry}><Download className="size-3.5" /> Export JSON</GhostButton>}
      />
      <AppToolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Search 640 capabilities" className="w-56" />
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-8 max-w-[160px] rounded-md border border-border bg-background px-1.5 text-[10.5px] outline-none">
          <option value="all">All categories</option>
          {FEATURE_CATEGORIES.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
        </select>
        <div className="flex items-center gap-0.5 rounded-md border border-border bg-background p-0.5">
          {(["all", "implemented", "limited"] as const).map((value) => (
            <button key={value} onClick={() => setStatus(value)} className={cn("rounded px-2 py-1 text-[9.5px] capitalize transition", status === value ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-muted")}>{value}</button>
          ))}
        </div>
        <span className="ml-auto flex items-center gap-1 text-[9px] text-muted-foreground"><Filter className="size-3" /> {filteredCategories.reduce((sum, cat) => sum + cat.matching.length, 0)} shown</span>
      </AppToolbar>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Registered" value={FEATURE_STATS.total} tone="neutral" />
          <Stat label="Implemented" value={FEATURE_STATS.implemented} tone="success" />
          <Stat label="Limited" value={FEATURE_STATS.limited} tone="warning" />
          <Stat label="Verified" value={FEATURE_STATS.verified} tone="accent" />
        </div>

        <div className="mb-3 rounded-lg border border-border/60 bg-muted/20 p-2.5 text-[9px] leading-relaxed text-muted-foreground">
          <ShieldCheck className="mr-1 inline size-3 text-primary" />
          Each entry maps to a real subsystem. <b>Implemented</b> means the capability is wired to WindOS services; <b>limited</b> means a technical boundary is documented in the entry (for example, arbitrary EXE execution or host antivirus). <b>Verified</b> counts non-limited capabilities that passed the implementation checklist. No host-level protection is claimed.
        </div>

        {filteredCategories.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <Search className="mx-auto mb-2 size-6 text-muted-foreground/40" />
            <p className="text-[11px] font-medium">No capabilities match</p>
            <p className="mt-0.5 text-[9.5px] text-muted-foreground">Try a different search, status or category.</p>
          </div>
        )}

        <div className="grid gap-2.5 lg:grid-cols-[190px_1fr]">
          <aside className="hidden max-h-[calc(100vh-260px)] overflow-y-auto rounded-xl border border-border/70 bg-card p-1.5 lg:block">
            <p className="px-2 py-1 text-[8.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Categories</p>
            {categoryStats.map((cat) => (
              <button key={cat.id} onClick={() => setCategory(category === cat.id ? "all" : cat.id)} className={cn("flex w-full items-center gap-1 rounded-md px-2 py-1 text-left text-[9.5px]", category === cat.id ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                <ChevronRight className="size-2.5" />
                <span className="min-w-0 flex-1 truncate">{cat.name}</span>
                <span className="text-[8px] tabular-nums">{cat.total}</span>
                {cat.limited > 0 && <span className="rounded bg-amber-500/15 px-1 text-[7px] text-amber-700 dark:text-amber-300">{cat.limited}</span>}
              </button>
            ))}
          </aside>

          <div className="space-y-2.5">
            {filteredCategories.map((cat) => {
              const Icon = cat.icon;
              const open = selected === cat.id || Boolean(query);
              const total = cat.features.length;
              const limited = cat.features.filter((feature) => feature.status === "limited").length;
              return (
                <section key={cat.id} className="overflow-hidden rounded-xl border border-border/70 bg-card">
                  <button className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-muted/30" onClick={() => setSelected(open ? null : cat.id)} aria-expanded={open}>
                    <span className="flex size-8 items-center justify-center rounded-lg bg-primary/8 text-primary"><Icon className="size-4" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-semibold">{cat.name}</span>
                        <span className="text-[8.5px] text-muted-foreground">{cat.id.toUpperCase()} · {total} capabilities</span>
                        {limited > 0 && <Pill tone="warning">{limited} limited</Pill>}
                      </div>
                      <p className="truncate text-[9px] text-muted-foreground">{cat.blurb}</p>
                    </div>
                    <ChevronRight className={cn("size-4 text-muted-foreground transition", open && "rotate-90")} />
                  </button>
                  {open && (
                    <div className="border-t border-border/50 px-3 pb-2 pt-1">
                      {cat.matching.length !== cat.features.length && <p className="py-1 text-[8.5px] text-muted-foreground">{cat.matching.length} of {cat.features.length} shown by current filters</p>}
                      {(query || status !== "all" ? cat.matching : cat.features).map((feature) => (
                        <div key={feature.name} className="flex items-start gap-2 border-b border-border/30 py-1.5 last:border-0">
                          <span className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full", feature.status === "limited" ? "bg-amber-500/12 text-amber-600 dark:text-amber-400" : "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400")}>
                            {feature.status === "limited" ? <TriangleAlert className="size-2.5" /> : <Check className="size-2.5" />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="text-[10px] font-medium">{feature.name}</p>
                              <span className="rounded bg-muted/60 px-1 py-0.5 text-[7px] text-muted-foreground">{feature.app}</span>
                              {feature.status === "limited" && <span className="text-[7px] font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">limited</span>}
                            </div>
                            <p className="text-[8.5px] leading-snug text-muted-foreground">{feature.description}</p>
                            {feature.note && <p className="mt-0.5 text-[8px] italic text-muted-foreground/80">Boundary: {feature.note}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "neutral" | "success" | "warning" | "accent" }) {
  return (
    <Panel className="p-3">
      <div className="flex items-center gap-1.5">
        <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
        {tone === "success" && <Check className="size-2.5 text-emerald-500" />}
        {tone === "warning" && <TriangleAlert className="size-2.5 text-amber-500" />}
        {tone === "accent" && <Sparkles className="size-2.5 text-primary" />}
      </div>
      <p className={cn("mt-1 text-[22px] font-semibold tabular-nums", tone === "success" && "text-emerald-600 dark:text-emerald-400", tone === "warning" && "text-amber-600 dark:text-amber-400")}>{value}</p>
    </Panel>
  );
}
