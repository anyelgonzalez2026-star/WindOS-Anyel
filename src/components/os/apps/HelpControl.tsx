import { useMemo, useState } from "react";
import { useOS } from "@/lib/os/store";
import { HELP_TOPICS, type HelpTopic } from "@/lib/os/help";
import { FEATURE_STATS } from "@/lib/os/features";
import { APPS, APP_MAP } from "@/lib/os/registry";
import { useNow } from "@/lib/os/hooks";
import { cn } from "@/lib/utils";
import { AppShell, AppHeader, AppToolbar, EmptyState, GhostButton, PrimaryButton, SearchInput, Panel, SectionTitle, Pill, Field, inputClass } from "./ui";
import { Accessibility, ArrowLeft, BookOpen, CheckCircle2, ChevronRight, CircleHelp, ClipboardCopy, Clock, Copy, Cpu, Download, ExternalLink, FileText, FolderOpen, HardDrive, Info, Keyboard, Laptop, LayoutGrid, LifeBuoy, ListChecks, Lock, Mail, Monitor, Palette, Power, RefreshCw, RotateCcw, Search, Settings, Shield, Smartphone, Sparkles, Terminal, Timer, Trash2, User, UserRound, Wifi } from "lucide-react";

/* -------------------------------------------------------------------- Help */

export function Help() {
  const os = useOS();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [article, setArticle] = useState<HelpTopic | null>(null);
  const [saved, setSaved] = useState("");
  const categories = ["All", ...Array.from(new Set(HELP_TOPICS.map((topic) => topic.category)))];
  const topics = HELP_TOPICS.filter((topic) => {
    if (category !== "All" && topic.category !== category) return false;
    if (!query) return true;
    return `${topic.title} ${topic.body} ${topic.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase());
  });

  function systemReport() {
    const report = [
      "WindOS 1.0.0 — verification report",
      "Build by Anyel Gonzalez",
      `Generated ${new Date().toISOString()}`,
      "",
      `Registered features: ${FEATURE_STATS.total}`,
      `Implemented: ${FEATURE_STATS.implemented}`,
      `Verified after audit: ${FEATURE_STATS.verified}`,
      `Documented limitations: ${FEATURE_STATS.limited}`,
      `Feature categories: ${FEATURE_STATS.categories}`,
      `Applications in registry: ${APPS.length}`,
      `Installed applications: ${os.installed.length}`,
      `Virtual storage: ${os.fs.usage().files} files, ${os.fs.usage().folders} folders`,
      "",
      "Verification scope:",
      "• First boot and returning-user boot flow.",
      "• Desktop, windows, taskbar, Start, search, widgets, virtual desktops.",
      "• Every application runtime resolves through AppHost and shares OS services.",
      "• Virtual filesystem operations and IndexedDB persistence.",
      "• Permission prompts and grants for sensitive capabilities.",
      "• Store install / uninstall / update integration with Start and search.",
      "• Backup export, restore points and recovery modes.",
      "• Responsive layout and touch controls.",
      "",
      "Known limitations are documented in the registry and Help. Examples:",
      "• Browser tabs cannot launch Microsoft Edge programmatically; WindBrowser attempts an external protocol and explains the fallback.",
      "• Host-level antivirus, firewall and malware protection are not provided.",
      "• Arbitrary Windows EXE files cannot execute inside a browser.",
      "• Network, Wi-Fi, battery and CPU readings are simulated unless explicitly marked as real.",
      "• Offline data persists, but the app shell requires one initial network load because no service worker is registered in this preview environment.",
    ].join("\n");
    const name = `WindOS verification report ${new Date().toISOString().slice(0, 10)}.txt`;
    const node = os.fs.createFile("folder_documents", name, report, "text/plain");
    if (node) { setSaved(`Saved ${name} to Documents.`); os.notify({ appId: "WindOS", title: "Report exported", body: name }); }
    else setSaved("Guest mode is read-only.");
  }

  return (
    <AppShell>
      <AppHeader icon={LifeBuoy} title="WindHelp" subtitle={`${HELP_TOPICS.length} articles · feature registry, verification report and honest limitations`} actions={<><GhostButton onClick={systemReport}><Download className="size-3.5" /> Export report</GhostButton><PrimaryButton onClick={() => os.openApp("about")}><Info className="size-3.5" /> About WindOS</PrimaryButton></>} />
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-44 shrink-0 overflow-y-auto border-r border-border/60 bg-muted/15 p-2 sm:block">
          <p className="px-1 pb-1 text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">Categories</p>
          {categories.map((value) => <button key={value} onClick={() => { setCategory(value); setArticle(null); }} className={cn("mb-0.5 block w-full rounded px-1.5 py-1 text-left text-[9.5px]", category === value && !article ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted")}>{value}</button>)}
          <div className="mt-3 border-t border-border/50 pt-2">
            <p className="px-1 pb-1 text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">System</p>
            {[["about", "About WindOS", Info], ["registry", "Feature registry", ListChecks], ["settings", "Settings", Settings], ["security", "Security", Shield]].map(([appId, label, Icon]) => {
              const AppIcon = Icon as typeof Info;
              return <button key={String(appId)} onClick={() => os.openApp(String(appId))} className="mb-0.5 flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-[9px] text-muted-foreground hover:bg-muted"><AppIcon className="size-3" /> {label as string}</button>;
            })}
          </div>
        </aside>
        <div className="min-w-0 flex-1 overflow-y-auto">
          {article ? (
            <article className="mx-auto max-w-2xl p-4">
              <button className="mb-3 flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground" onClick={() => setArticle(null)}><ArrowLeft className="size-3" /> All articles</button>
              <p className="text-[8.5px] font-semibold uppercase tracking-wider text-primary">{article.category}</p>
              <h1 className="mt-1 text-[19px] font-semibold tracking-tight">{article.title}</h1>
              <p className="mt-3 whitespace-pre-wrap text-[11px] leading-6 text-muted-foreground">{article.body}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">{article.tags.map((tag) => <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[8px] text-muted-foreground">#{tag}</span>)}</div>
              <div className="mt-5 rounded-xl border border-border/60 bg-muted/15 p-3">
                <p className="text-[9.5px] font-medium">Still stuck?</p>
                <p className="text-[8.5px] text-muted-foreground">Open WindMonitor to run diagnostics, or use the security event log to see permission and installation history.</p>
                <div className="mt-1.5 flex gap-1.5"><GhostButton onClick={() => os.openApp("monitor")}><Monitor className="size-3" /> Diagnostics</GhostButton><GhostButton onClick={() => os.openApp("security")}><Shield className="size-3" /> Security log</GhostButton></div>
              </div>
            </article>
          ) : (
            <div className="p-3">
              <div className="mx-auto max-w-3xl">
                <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-primary/8 via-card to-card p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-primary/12 text-primary"><CircleHelp className="size-5" /></div>
                    <div className="min-w-0 flex-1"><h2 className="text-[15px] font-semibold">How can we help?</h2><p className="text-[9.5px] text-muted-foreground">Search guides, or read an honest account of what WindOS can and cannot do.</p></div>
                  </div>
                  <div className="mt-3 flex gap-1.5"><SearchInput value={query} onChange={setQuery} placeholder="Search help — files, permissions, backup…" className="flex-1" /><GhostButton onClick={systemReport}><FileText className="size-3.5" /> Report</GhostButton></div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {[["Getting started", "getting-started"], ["Files", "files"], ["Permissions", "permissions"], ["Backup", "backup"]].map(([label, id]) => {
                    const topic = HELP_TOPICS.find((entry) => entry.id === id);
                    return <button key={id} disabled={!topic} onClick={() => topic && setArticle(topic)} className="rounded-lg border border-border/60 bg-card px-2 py-1.5 text-left text-[9px] font-medium hover:bg-muted disabled:opacity-40">{label}</button>;
                  })}
                </div>
                <div className="mt-3 space-y-1.5">
                  {topics.map((topic) => (
                    <button key={topic.id} className="flex w-full items-center gap-2.5 rounded-xl border border-border/60 bg-card p-2.5 text-left transition hover:border-primary/30 hover:bg-primary/5" onClick={() => setArticle(topic)}>
                      <BookOpen className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1"><span className="block text-[10.5px] font-medium">{topic.title}</span><span className="block truncate text-[8.5px] text-muted-foreground">{topic.body.slice(0, 120)}</span></span>
                      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[7.5px] text-muted-foreground">{topic.category}</span>
                      <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                  {topics.length === 0 && <EmptyState icon={Search} title="No articles found" body="Try a shorter search, or browse a category." />}
                </div>
                <Panel className="mt-3">
                  <SectionTitle>Verification summary</SectionTitle>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[["Registered", FEATURE_STATS.total], ["Implemented", FEATURE_STATS.implemented], ["Verified", FEATURE_STATS.verified], ["Limitations", FEATURE_STATS.limited]].map(([label, value]) => <div key={String(label)} className="rounded-lg border border-border/50 p-2"><p className="text-[8px] text-muted-foreground">{label}</p><p className="text-[17px] font-semibold">{value}</p></div>)}
                  </div>
                  <p className="mt-2 text-[8px] leading-relaxed text-muted-foreground">The registry records each capability with its status and verification. Features marked “limited” are implemented but constrained by browser security, physics or the absence of host access; they are not counted as fully verified. Full details live in WindRegistry.</p>
                  {saved && <p className="mt-1 text-[8.5px] text-emerald-600 dark:text-emerald-400">{saved}</p>}
                </Panel>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

/* ----------------------------------------------------------------- Control */

const CONTROL_LINKS: { id: string; title: string; body: string; icon: typeof Settings; section: string }[] = [
  { id: "system", title: "System", body: "Display, sound, power, storage", icon: Monitor, section: "system" },
  { id: "personal", title: "Personalisation", body: "Wallpaper, accent, lock screen", icon: Palette, section: "personalization" },
  { id: "apps", title: "Apps & features", body: "Installed packages and defaults", icon: LayoutGrid, section: "apps" },
  { id: "accounts", title: "Accounts", body: "Profile, guest and sign-in", icon: UserRound, section: "accounts" },
  { id: "privacy", title: "Privacy & security", body: "Permissions and event log", icon: Shield, section: "privacy" },
  { id: "time", title: "Time & language", body: "Clock format and locale", icon: Clock, section: "time" },
  { id: "network", title: "Network", body: "Wi-Fi and connectivity", icon: Wifi, section: "network" },
  { id: "accessibility", title: "Ease of access", body: "Vision, hearing and input", icon: Accessibility, section: "accessibility" },
];

export function Control() {
  const os = useOS();
  const now = useNow(1000);
  const [name, setName] = useState(os.settings.displayName);
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const startupOptions = APPS.filter((app) => !app.systemCritical).slice(0, 12);
  const usage = os.fs.usage();

  return (
    <AppShell>
      <AppHeader icon={Settings} title="WindControl" subtitle="Control Panel · devices, personalisation, accounts and system preferences" actions={<><GhostButton onClick={() => os.openApp("settings", { section: "system" })}><Settings className="size-3.5" /> All settings</GhostButton><PrimaryButton onClick={() => os.openApp("monitor")}><Cpu className="size-3.5" /> System health</PrimaryButton></>} />
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="mx-auto max-w-3xl space-y-3">
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
            {CONTROL_LINKS.map((link) => (
              <button key={link.id} onClick={() => os.openApp("settings", { section: link.section })} className="rounded-xl border border-border/60 bg-card p-2.5 text-left transition hover:border-primary/30 hover:bg-primary/5">
                <link.icon className="mb-1 size-4 text-primary" /><p className="text-[10px] font-semibold">{link.title}</p><p className="text-[8px] text-muted-foreground">{link.body}</p>
              </button>
            ))}
          </div>

          <div className="grid gap-2.5 md:grid-cols-[1.15fr_0.85fr]">
            <Panel>
              <SectionTitle action={<span className="text-[8px] text-muted-foreground">{new Date(now).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</span>}>Quick controls</SectionTitle>
              <div className="grid grid-cols-2 gap-1.5">
                {([["wifi", "Wi-Fi", Wifi], ["bluetooth", "Bluetooth", Smartphone], ["nightLight", "Night light", Sparkles], ["airplane", "Airplane", Power], ["batterySaver", "Battery saver", Timer], ["focusAssist", "Focus assist", Mail]] as const).map(([key, label, Icon]) => (
                  <button key={key} onClick={() => os.setQuick({ [key]: !os.quick[key] })} className={cn("flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left", os.quick[key] ? "border-primary/30 bg-primary/8 text-primary" : "border-border/60 hover:bg-muted")}><Icon className="size-3.5" /><span className="flex-1 text-[9.5px] font-medium">{label}</span><span className={cn("size-2 rounded-full", os.quick[key] ? "bg-primary" : "bg-muted-foreground/25")} /></button>
                ))}
              </div>
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center gap-2"><span className="w-14 text-[9px] text-muted-foreground">Volume</span><input type="range" min={0} max={100} value={os.settings.volume} onChange={(event) => os.updateSettings({ volume: Number(event.target.value) })} className="flex-1 accent-[var(--os-accent)]" /><span className="w-6 text-right text-[8px]">{os.settings.volume}</span></div>
                <div className="flex items-center gap-2"><span className="w-14 text-[9px] text-muted-foreground">Brightness</span><input type="range" min={30} max={100} value={os.settings.brightness} onChange={(event) => os.updateSettings({ brightness: Number(event.target.value) })} className="flex-1 accent-[var(--os-accent)]" /><span className="w-6 text-right text-[8px]">{os.settings.brightness}</span></div>
              </div>
            </Panel>

            <Panel>
              <SectionTitle>This device</SectionTitle>
              <div className="flex items-center gap-2.5">
                <div className="flex size-10 items-center justify-center rounded-xl text-[14px] font-semibold text-white" style={{ background: os.settings.avatarColor }}>{os.settings.displayName.slice(0, 1).toUpperCase() || "W"}</div>
                <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-semibold">{os.settings.displayName || "WindOS user"}</p><p className="text-[8px] text-muted-foreground">WindOS 1.0.0 · {os.guest ? "guest session" : "local profile"}</p></div>
                <button className="rounded border border-border px-1.5 py-0.5 text-[8px] hover:bg-muted" onClick={() => os.lock()}><Lock className="mr-0.5 inline size-2.5" /> Lock</button>
              </div>
              <div className="mt-2 space-y-1 text-[8.5px]">
                <div className="flex justify-between"><span className="text-muted-foreground">Storage</span><span>{formatPct(os.storage.usage, os.storage.quota)}</span></div>
                <div className="h-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (os.storage.usage / Math.max(1, os.storage.quota)) * 100)}%` }} /></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Virtual files</span><span>{usage.files} files · {usage.folders} folders</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Installed apps</span><span>{os.installed.length} of {APPS.length}</span></div>
              </div>
              <div className="mt-2 flex gap-1"><GhostButton className="h-7 flex-1 text-[9px]" onClick={() => os.openApp("backup")}><Download className="size-3" /> Backup</GhostButton><GhostButton className="h-7 flex-1 text-[9px]" onClick={() => os.openApp("recovery")}><RotateCcw className="size-3" /> Recovery</GhostButton></div>
            </Panel>
          </div>

          <div className="grid gap-2.5 md:grid-cols-2">
            <Panel>
              <SectionTitle>User profile</SectionTitle>
              <Field label="Display name"><input value={name} onChange={(event) => setName(event.target.value)} className={inputClass} maxLength={32} /></Field>
              <div className="mt-1.5 flex items-center gap-1.5"><span className="text-[9px] text-muted-foreground">Avatar colour</span>{["#4f5bd5", "#178f8a", "#c1802a", "#c2557a", "#7a5cd6", "#3b6f9e"].map((color) => <button key={color} onClick={() => os.updateSettings({ avatarColor: color })} className={cn("size-4 rounded-full border-2", os.settings.avatarColor === color ? "border-foreground" : "border-transparent")} style={{ background: color }} aria-label={`Avatar colour ${color}`} />)}</div>
              <div className="mt-2 flex gap-1"><PrimaryButton className="h-7 text-[9.5px]" onClick={() => { os.updateSettings({ displayName: name.trim() || "WindOS user" }); setSaved(true); window.setTimeout(() => setSaved(false), 2000); }}>Save profile</PrimaryButton>{saved && <span className="self-center text-[8.5px] text-emerald-500">Saved.</span>}</div>
              <div className="mt-2 flex flex-wrap gap-1"><GhostButton className="h-6 text-[8px]" onClick={() => os.signOut()}><Power className="size-2.5" /> Sign out</GhostButton><GhostButton className="h-6 text-[8px]" onClick={() => os.startGuest()}><User className="size-2.5" /> Guest session</GhostButton>{os.guest && <GhostButton className="h-6 text-[8px]" onClick={() => os.endGuest()}><ArrowLeft className="size-2.5" /> End guest</GhostButton>}</div>
              <p className="mt-1.5 text-[8px] text-muted-foreground">Signing out returns to the lock screen; data remains local. Guest sessions mount the drive read-only.</p>
            </Panel>

            <Panel>
              <SectionTitle>Taskbar & desktop</SectionTitle>
              <div className="space-y-1">
                <Choice label="Position" value={os.settings.taskbarPosition} options={[["bottom", "Bottom"], ["top", "Top"]]} onChange={(value) => os.updateSettings({ taskbarPosition: value as "bottom" | "top" })} />
                <Choice label="Alignment" value={os.settings.taskbarAlign} options={[["center", "Centre"], ["left", "Left"]]} onChange={(value) => os.updateSettings({ taskbarAlign: value as "center" | "left" })} />
                <Choice label="Icons" value={os.settings.iconSize} options={[["sm", "Small"], ["md", "Medium"], ["lg", "Large"]]} onChange={(value) => os.updateSettings({ iconSize: value as "sm" | "md" | "lg" })} />
                <label className="flex items-center gap-2 rounded border border-border/50 px-2 py-1 text-[9px]"><span className="flex-1">Transparent taskbar</span><input type="checkbox" checked={os.settings.taskbarTransparent} onChange={(event) => os.updateSettings({ taskbarTransparent: event.target.checked })} className="accent-[var(--os-accent)]" /></label>
                <label className="flex items-center gap-2 rounded border border-border/50 px-2 py-1 text-[9px]"><span className="flex-1">Show icon labels</span><input type="checkbox" checked={os.settings.taskbarLabels} onChange={(event) => os.updateSettings({ taskbarLabels: event.target.checked })} className="accent-[var(--os-accent)]" /></label>
                <label className="flex items-center gap-2 rounded border border-border/50 px-2 py-1 text-[9px]"><span className="flex-1">Desktop icons</span><input type="checkbox" checked={os.settings.desktopIcons} onChange={(event) => os.updateSettings({ desktopIcons: event.target.checked })} className="accent-[var(--os-accent)]" /></label>
              </div>
            </Panel>
          </div>

          <div className="grid gap-2.5 md:grid-cols-2">
            <Panel>
              <SectionTitle action={<button className="text-[8px] text-primary" onClick={() => os.openApp("taskmanager")}>Manage</button>}>Startup applications</SectionTitle>
              <div className="max-h-40 space-y-0.5 overflow-y-auto">
                {startupOptions.map((app) => {
                  const enabled = os.settings.startupApps.includes(app.id);
                  return <label key={app.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-muted/40"><input type="checkbox" checked={enabled} onChange={() => os.updateSettings({ startupApps: enabled ? os.settings.startupApps.filter((id) => id !== app.id) : [...os.settings.startupApps, app.id] })} className="accent-[var(--os-accent)]" /><span className="flex-1 truncate text-[9px]">{app.name}</span><span className="text-[7.5px] text-muted-foreground">{APP_MAP.get(app.id)?.category}</span></label>;
                })}
              </div>
              <p className="mt-1 text-[8px] text-muted-foreground">{os.settings.startupApps.length} apps start with WindOS. Startup apps consume simulated resources.</p>
            </Panel>
            <Panel>
              <SectionTitle>Defaults & time</SectionTitle>
              <Field label="Default browser"><select value={os.settings.defaultBrowser} onChange={(event) => os.updateSettings({ defaultBrowser: event.target.value })} className={inputClass}><option value="windbrowser">WindBrowser</option><option value="chrome">Chrome (host fallback)</option><option value="edge">Microsoft Edge (host fallback)</option></select></Field>
              <Field label="Preferred editor"><select value={os.settings.preferredEditor} onChange={(event) => os.updateSettings({ preferredEditor: event.target.value })} className={inputClass}><option value="code">WindCode</option><option value="notes">WindNotes</option></select></Field>
              <div className="mt-1.5 space-y-1">
                <label className="flex items-center gap-2 text-[9px]"><input type="checkbox" checked={os.settings.clock24h} onChange={(event) => os.updateSettings({ clock24h: event.target.checked })} className="accent-[var(--os-accent)]" /> 24-hour clock</label>
                <label className="flex items-center gap-2 text-[9px]"><input type="checkbox" checked={os.settings.showSeconds} onChange={(event) => os.updateSettings({ showSeconds: event.target.checked })} className="accent-[var(--os-accent)]" /> Show seconds</label>
                <label className="flex items-center gap-2 text-[9px]"><input type="checkbox" checked={os.settings.showDate} onChange={(event) => os.updateSettings({ showDate: event.target.checked })} className="accent-[var(--os-accent)]" /> Show date on taskbar</label>
              </div>
              <p className="mt-1 text-[8px] text-muted-foreground">Time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}. The device controls the clock.</p>
            </Panel>
          </div>

          <div className="grid gap-2.5 md:grid-cols-2">
            <Panel>
              <SectionTitle>Power & display</SectionTitle>
              <div className="flex gap-1.5">{[["saver", "Battery saver"], ["balanced", "Balanced"], ["performance", "Performance"]].map(([value, label]) => <button key={value} onClick={() => os.updateSettings({ powerPlan: value as "saver" | "balanced" | "performance" })} className={cn("flex-1 rounded border px-1.5 py-1 text-[8.5px]", os.settings.powerPlan === value ? "border-primary/40 bg-primary/8 text-primary" : "border-border hover:bg-muted")}>{label}</button>)}</div>
              <p className="mt-1 text-[8px] text-muted-foreground">Power plans adjust the simulated resource profile and animation cost. They cannot change host hardware behaviour.</p>
              <div className="mt-2 flex gap-1.5"><GhostButton className="h-6 text-[8px]" onClick={() => os.sleep()}><Power className="size-2.5" /> Sleep</GhostButton><GhostButton className="h-6 text-[8px]" onClick={() => os.restart()}><RefreshCw className="size-2.5" /> Restart</GhostButton><GhostButton className="h-6 text-[8px]" onClick={() => os.shutdown()}><Power className="size-2.5" /> Shut down</GhostButton></div>
              <label className="mt-2 flex items-center gap-2 text-[9px]"><input type="checkbox" checked={os.settings.secondDisplay} onChange={(event) => os.updateSettings({ secondDisplay: event.target.checked })} className="accent-[var(--os-accent)]" /> Simulate a second monitor</label>
              {os.settings.secondDisplay && <Choice label="Layout" value={os.settings.monitorLayout} options={[["extend", "Extend"], ["duplicate", "Duplicate"]]} onChange={(value) => os.updateSettings({ monitorLayout: value as "extend" | "duplicate" })} />}
            </Panel>
            <Panel>
              <SectionTitle>System information</SectionTitle>
              <div className="space-y-1 text-[8.5px]">
                {[["Product", "WindOS"], ["Version", "1.0.0"], ["Creator", "Anyel Gonzalez"], ["Build date", "November 2026"], ["Installed apps", `${os.installed.length}`], ["Feature registry", `${FEATURE_STATS.total} across ${FEATURE_STATS.categories} categories`], ["Uptime", `${Math.floor((now - os.bootedAt) / 60000)} min`], ["Browser", navigator.userAgent.split(") ")[0]?.slice(0, 40) ?? "unknown"]].map(([label, value]) => <div key={label} className="flex gap-2 border-b border-border/30 py-0.5 last:border-0"><span className="w-20 shrink-0 text-muted-foreground">{label}</span><span className="min-w-0 flex-1 truncate font-medium">{value}</span></div>)}
              </div>
              <div className="mt-2 flex gap-1"><GhostButton className="h-6 text-[8px]" onClick={() => os.openApp("about")}>About</GhostButton><GhostButton className="h-6 text-[8px]" onClick={() => os.openApp("registry")}>Registry</GhostButton><GhostButton className="h-6 text-[8px]" onClick={() => os.openApp("update")}>Updates</GhostButton></div>
            </Panel>
          </div>

          <Panel>
            <SectionTitle>Reset this device</SectionTitle>
            <div className="flex flex-wrap items-center gap-2">
              {!confirmReset ? <GhostButton onClick={() => setConfirmReset(true)}><RotateCcw className="size-3.5" /> Reset preferences to defaults</GhostButton> : <><span className="text-[9px] text-muted-foreground">This resets settings but keeps files and apps.</span><PrimaryButton className="h-7 text-[9px]" onClick={() => { os.resetSettings(); setConfirmReset(false); }}>Confirm reset</PrimaryButton><GhostButton className="h-7 text-[9px]" onClick={() => setConfirmReset(false)}>Cancel</GhostButton></>}
              <GhostButton className="ml-auto text-red-500" onClick={() => os.openApp("recovery")}><Trash2 className="size-3.5" /> Advanced recovery</GhostButton>
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}

function Choice({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (value: string) => void }) {
  return <div className="flex items-center gap-1.5 py-0.5"><span className="w-16 text-[9px] text-muted-foreground">{label}</span><div className="flex flex-1 gap-0.5">{options.map(([id, text]) => <button key={id} onClick={() => onChange(id)} className={cn("flex-1 rounded border px-1 py-0.5 text-[8px]", value === id ? "border-primary/40 bg-primary/8 text-primary" : "border-border hover:bg-muted")}>{text}</button>)}</div></div>;
}

function formatPct(usage: number, quota: number) {
  if (!quota) return "not reported";
  return `${Math.round((usage / quota) * 100)}% of ${(quota / 1024 / 1024).toFixed(0)} MB`;
}
