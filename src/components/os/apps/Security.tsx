import { useMemo, useState } from "react";
import { useOS } from "@/lib/os/store";
import { useNow } from "@/lib/os/hooks";
import { formatBytes } from "@/lib/os/fs";
import { APP_MAP } from "@/lib/os/registry";
import type { PermissionKind } from "@/lib/os/types";
import { downloadText } from "@/lib/os/zip";
import { cn } from "@/lib/utils";
import { AppShell, AppHeader, AppToolbar, GhostButton, Panel, PrimaryButton, SearchInput, SectionTitle, Pill, inputClass } from "./ui";
import { AlertTriangle, Check, CheckCircle2, Database, Download, Eye, FileWarning, Fingerprint, FolderLock, HardDrive, Lock, LogOut, RefreshCw, ScanLine, Shield, ShieldAlert, ShieldCheck, ShieldOff, Trash2, User, X, Zap } from "lucide-react";

const KINDS: PermissionKind[] = ["files", "camera", "microphone", "notifications", "clipboard", "screen", "network", "location", "storage"];
const SUSPICIOUS = ["exe", "msi", "bat", "cmd", "ps1", "scr", "vbs", "appx"];

export default function Security() {
  const os = useOS();
  const now = useNow(1000);
  const [tab, setTab] = useState<"overview" | "permissions" | "downloads" | "events" | "data">("overview");
  const [query, setQuery] = useState("");
  const [scan, setScan] = useState<{ at: number; checks: { label: string; ok: boolean; detail: string }[] } | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [toast, setToast] = useState("");

  const grants = Object.values(os.grants);
  const granted = grants.filter((grant) => grant.granted);
  const downloads = os.fs.children("folder_downloads").filter((node) => node.type === "file");
  const suspicious = downloads.filter((node) => SUSPICIOUS.includes(node.name.split(".").pop()?.toLowerCase() ?? ""));
  const events = os.securityEvents.filter((event) => !query || `${event.title} ${event.detail ?? ""} ${event.appId ?? ""}`.toLowerCase().includes(query.toLowerCase()));

  const grouped = useMemo(() => {
    const map = new Map<string, { kind: PermissionKind; granted: boolean; at: number }[]>();
    for (const grant of grants) {
      const list = map.get(grant.appId) ?? [];
      list.push({ kind: grant.kind, granted: grant.granted, at: grant.at });
      map.set(grant.appId, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [grants]);

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function runScan() {
    const checks = [
      { label: "Virtual drive mounted", ok: Boolean(os.fs.byId("root")), detail: "The persistent virtual filesystem responds to reads." },
      { label: "Browser storage available", ok: os.storage.quota > 0, detail: os.storage.quota > 0 ? `${formatBytes(os.storage.quota)} quota reported.` : "The browser is blocking storage; changes may not persist." },
      { label: "Permission grants reviewed", ok: granted.length < 30, detail: `${granted.length} active grants across ${grouped.length} apps.` },
      { label: "Suspicious downloads", ok: suspicious.length === 0, detail: suspicious.length ? `${suspicious.length} executable package${suspicious.length === 1 ? "" : "s"} in Downloads need review.` : "No executable packages detected in Downloads." },
      { label: "Safe mode", ok: !os.settings.safeMode, detail: os.settings.safeMode ? "Safe mode is active; installations are blocked." : "Normal boot configuration." },
      { label: "Backup recency", ok: Boolean(os.lastBackupAt) && now - os.lastBackupAt < 1000 * 60 * 60 * 24 * 14, detail: os.lastBackupAt ? `Last backup ${new Date(os.lastBackupAt).toLocaleDateString()}.` : "No backup has been created yet." },
      { label: "Guest isolation", ok: !os.guest, detail: os.guest ? "Guest session is read-only." : "Signed in to the local owner profile." },
    ];
    setScan({ at: Date.now(), checks });
    os.logEvent({ level: "info", title: "Integrity scan completed", detail: `${checks.filter((check) => check.ok).length}/${checks.length} checks passed. No host antivirus is claimed.` });
    flash("Local integrity scan complete.");
  }

  function quarantine() {
    const root = os.fs.children(null).find((node) => node.name === "Quarantine") ?? os.fs.createFolder("root", "Quarantine");
    if (!root) return;
    let moved = 0;
    for (const node of suspicious) if (os.fs.move(node.id, root.id)) moved++;
    os.logEvent({ level: "warning", title: "Downloads quarantined", detail: `${moved} executable packages moved to /Quarantine.` });
    flash(`${moved} item${moved === 1 ? "" : "s"} moved to Quarantine.`);
  }

  function exportData() {
    const json = os.buildBackup({ includeSettings: true, includeFiles: true, includeApps: true, includeClipboard: true });
    downloadText(json, `windos-security-export-${new Date().toISOString().slice(0, 10)}.json`, "application/json");
    flash("A full local data archive was downloaded.");
  }

  return (
    <AppShell>
      <AppHeader
        icon={ShieldCheck}
        title="WindSecurity"
        subtitle={`${granted.length} active grants · ${os.securityEvents.length} events · local protection only`}
        actions={
          <>
            <GhostButton onClick={() => { os.lock(); }}><Lock className="size-3.5" /> Lock session</GhostButton>
            <PrimaryButton onClick={runScan}><ScanLine className="size-3.5" /> Scan</PrimaryButton>
          </>
        }
      />
      <AppToolbar>
        {(["overview", "permissions", "downloads", "events", "data"] as const).map((item) => (
          <button key={item} onClick={() => setTab(item)} className={cn("rounded-md px-2.5 py-1 text-[11px] font-medium capitalize transition", tab === item ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
            {item}
            {item === "downloads" && suspicious.length > 0 && <span className="ml-1 rounded-full bg-amber-500/15 px-1 text-[8px] text-amber-700 dark:text-amber-300">{suspicious.length}</span>}
            {item === "permissions" && <span className="ml-1 text-[8px] text-muted-foreground">{granted.length}</span>}
          </button>
        ))}
        {tab === "events" && <div className="ml-auto"><SearchInput value={query} onChange={setQuery} placeholder="Filter events" className="w-40" /></div>}
        {tab !== "events" && <span className="ml-auto flex items-center gap-1 text-[9px] text-muted-foreground"><Fingerprint className="size-3" /> Local session · no telemetry</span>}
      </AppToolbar>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {toast && <div className="mb-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-[10px] text-emerald-700 dark:text-emerald-300">{toast}</div>}

        {tab === "overview" && (
          <div className="space-y-3">
            <div className="grid gap-2.5 sm:grid-cols-3">
              <div className="rounded-xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-transparent p-3.5">
                <div className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"><ShieldCheck className="size-4" /></span>
                  <div><p className="text-[11px] font-semibold">Local protection</p><p className="text-[9px] text-muted-foreground">Permission layer active</p></div>
                </div>
                <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground">Simulated OS capabilities are gated. No claim is made about antivirus, firewall or real malware scanning.</p>
              </div>
              <Panel>
                <SectionTitle>Active grants</SectionTitle>
                <p className="text-[22px] font-semibold tabular-nums">{granted.length}</p>
                <p className="mt-0.5 text-[9.5px] text-muted-foreground">{grouped.length} apps · {KINDS.length} capability types</p>
                <button className="mt-2 text-[9.5px] text-primary hover:underline" onClick={() => setTab("permissions")}>Review permissions →</button>
              </Panel>
              <Panel>
                <SectionTitle>Session</SectionTitle>
                <p className="text-[11px] font-medium">{os.settings.displayName} · local owner</p>
                <p className="mt-0.5 text-[9.5px] text-muted-foreground">Uptime {Math.max(1, Math.round((now - os.bootedAt) / 60000))} min · {os.settings.safeMode ? "safe mode" : "normal mode"}</p>
                <button className="mt-2 text-[9.5px] text-primary hover:underline" onClick={os.signOut}>Sign out →</button>
              </Panel>
            </div>

            {scan && (
              <Panel>
                <SectionTitle action={<span className="text-[8.5px] text-muted-foreground">{new Date(scan.at).toLocaleTimeString()}</span>}>Integrity scan results</SectionTitle>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {scan.checks.map((check) => (
                    <div key={check.label} className="flex items-start gap-2 rounded-lg border border-border/60 p-2">
                      {check.ok ? <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" /> : <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />}
                      <div><p className="text-[10px] font-medium">{check.label}</p><p className="text-[8.5px] leading-snug text-muted-foreground">{check.detail}</p></div>
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            <div className="grid gap-2.5 md:grid-cols-2">
              <Panel>
                <SectionTitle>Session protection</SectionTitle>
                <div className="space-y-1.5">
                  <ActionRow icon={Lock} title="Lock the desktop" body="Requires your profile to sign in again" action="Lock" onClick={os.lock} />
                  <ActionRow icon={User} title="Guest session" body="Read-only drive, temporary preferences" action={os.guest ? "End guest" : "Start guest"} onClick={os.guest ? os.endGuest : os.startGuest} />
                  <ActionRow icon={LogOut} title="Sign out" body="Returns to the lock screen and ends app processes" action="Sign out" onClick={os.signOut} />
                  <ActionRow icon={ShieldOff} title="Safe mode" body="Disables startup apps and new installs" action={os.settings.safeMode ? "Disable" : "Enable"} onClick={() => { os.updateSettings({ safeMode: !os.settings.safeMode }); os.logEvent({ level: "warning", title: `Safe mode ${os.settings.safeMode ? "disabled" : "enabled"}`, detail: "Changed from WindSecurity." }); }} />
                </div>
              </Panel>
              <Panel>
                <SectionTitle>Threat surface</SectionTitle>
                <div className="space-y-1.5">
                  <ActionRow icon={FileWarning} title="Executable downloads" body={`${suspicious.length} flagged in Downloads`} action="Review" onClick={() => setTab("downloads")} />
                  <ActionRow icon={Shield} title="Permission grants" body={`${granted.length} active, ${grants.length - granted.length} denied`} action="Review" onClick={() => setTab("permissions")} />
                  <ActionRow icon={Database} title="Backup integrity" body={os.lastBackupAt ? `Last backup ${new Date(os.lastBackupAt).toLocaleDateString()}` : "No backup on record"} action="Backup" onClick={() => os.openApp("backup")} />
                  <ActionRow icon={Eye} title="Security events" body={`${os.securityEvents.length} entries in the local log`} action="View" onClick={() => setTab("events")} />
                </div>
              </Panel>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-3">
              <SectionTitle>What WindOS does and does not protect</SectionTitle>
              <div className="grid gap-2 text-[9.5px] leading-relaxed text-muted-foreground sm:grid-cols-2">
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5">
                  <p className="mb-1 flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-300"><Check className="size-3" /> In scope</p>
                  Permission prompts, URL scheme validation, sandboxed previews, quarantine of suspicious downloads, backup checksums, restore points, guest isolation and an auditable event log.
                </div>
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
                  <p className="mb-1 flex items-center gap-1 font-medium text-amber-700 dark:text-amber-300"><X className="size-3" /> Out of scope</p>
                  Host antivirus, firewall rules, malware detection in real files, browser sandbox escapes, Microsoft Edge installation and protection outside this tab. A web app cannot truthfully provide these.
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "permissions" && (
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {KINDS.map((kind) => {
                const active = granted.filter((grant) => grant.kind === kind).length;
                const Icon = kind === "camera" ? Eye : kind === "microphone" ? Fingerprint : kind === "screen" ? ScanLine : kind === "clipboard" ? HardDrive : Shield;
                return (
                  <div key={kind} className="rounded-lg border border-border/70 bg-card p-2">
                    <div className="flex items-center gap-1.5"><Icon className="size-3.5 text-muted-foreground" /><span className="text-[10px] font-medium capitalize">{kind}</span></div>
                    <p className="mt-1 text-[9px] text-muted-foreground">{active ? `${active} app${active === 1 ? "" : "s"} allowed` : "Blocked everywhere"}</p>
                  </div>
                );
              })}
            </div>
            <Panel>
              <SectionTitle action={<button className="text-[9px] text-red-500 hover:underline" onClick={() => { for (const grant of grants) os.revokePermission(grant.appId, grant.kind); flash("All permissions revoked."); }}>Revoke all</button>}>Application grants</SectionTitle>
              {grouped.length === 0 ? <p className="py-4 text-center text-[10px] text-muted-foreground">No app has requested a capability yet. Opening the recorder, screen capture or clipboard manager will prompt.</p> : (
                <div className="space-y-1.5">
                  {grouped.map(([appId, list]) => (
                    <div key={appId} className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5">
                      <span className="text-[10.5px] font-medium">{APP_MAP.get(appId)?.name ?? appId}</span>
                      <div className="flex flex-wrap gap-1">
                        {list.map((grant) => (
                          <span key={grant.kind} className={cn("flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[8.5px] capitalize", grant.granted ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-red-500/10 text-red-600 dark:text-red-400")}>
                            {grant.kind}
                            <button onClick={() => os.revokePermission(appId, grant.kind)} aria-label={`Revoke ${grant.kind}`} className="hover:text-red-500"><X className="size-2.5" /></button>
                          </span>
                        ))}
                      </div>
                      <span className="ml-auto text-[8px] text-muted-foreground">{new Date(list[0].at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
            <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 text-[9px] leading-relaxed text-muted-foreground">
              WindOS permission decisions are stored in this browser profile. Camera and microphone recording still requires the browser’s own native prompt and is only available inside apps that use real media capture (WindRecorder, WindScreen).
            </div>
          </div>
        )}

        {tab === "downloads" && (
          <div className="space-y-3">
            <Panel>
              <SectionTitle action={suspicious.length > 0 ? <button className="flex items-center gap-1 rounded bg-amber-500/15 px-2 py-1 text-[9px] font-medium text-amber-700 dark:text-amber-300" onClick={quarantine}><FolderLock className="size-3" /> Quarantine all</button> : undefined}>Downloaded files</SectionTitle>
              <p className="mb-2 text-[9.5px] text-muted-foreground">WindOS flags executable package names. This is a naming heuristic, not malware analysis.</p>
              <div className="space-y-1">
                {downloads.map((node) => {
                  const ext = node.name.split(".").pop()?.toLowerCase() ?? "";
                  const flagged = SUSPICIOUS.includes(ext);
                  return (
                    <div key={node.id} className="flex items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5">
                      <span className={cn("flex size-6 items-center justify-center rounded", flagged ? "bg-amber-500/10 text-amber-600" : "bg-muted text-muted-foreground")}>{flagged ? <AlertTriangle className="size-3" /> : <Check className="size-3" />}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[10.5px] font-medium">{node.name}</p>
                        <p className="text-[8.5px] text-muted-foreground">{formatBytes(node.size)} · {new Date(node.modifiedAt).toLocaleString()}</p>
                      </div>
                      {flagged && <Pill tone="warning">executable package</Pill>}
                      <button className="rounded px-1.5 py-0.5 text-[8.5px] text-muted-foreground hover:bg-muted" onClick={() => os.openApp("files", { openId: node.id })}>Inspect</button>
                      <button className="rounded px-1.5 py-0.5 text-[8.5px] text-red-500 hover:bg-red-500/10" onClick={() => { os.fs.trash(node.id); os.logEvent({ level: "warning", title: "Download removed", detail: `${node.name} was moved to the Recycle Bin.` }); flash(`${node.name} moved to the Recycle Bin.`); }}>Remove</button>
                    </div>
                  );
                })}
                {downloads.length === 0 && <p className="py-4 text-center text-[10px] text-muted-foreground">Downloads is empty.</p>}
              </div>
            </Panel>
            <div className="rounded-xl border border-border/70 bg-card p-3">
              <SectionTitle>URL and popup protection</SectionTitle>
              <div className="space-y-1.5">
                <ActionRow icon={Shield} title="Block javascript: and data: URLs" body="WindBrowser validates every navigation and rejects active-content schemes" action="Open browser" onClick={() => os.openApp("browser")} />
                <ActionRow icon={ScanLine} title="Embedded browsing sandbox" body="External pages render in a frame without popup access by default" action="Open browser" onClick={() => os.openApp("browser")} />
                <ActionRow icon={ShieldCheck} title="Compatibility trust warnings" body="EXE handling explains limits before any action" action="Open manager" onClick={() => os.openApp("compat")} />
              </div>
            </div>
          </div>
        )}

        {tab === "events" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[9.5px] text-muted-foreground">{events.length} local events · stored in this browser</p>
              <button className="text-[9px] text-red-500 hover:underline" onClick={() => { os.clearSecurityEvents(); flash("Security log cleared."); }}>Clear log</button>
            </div>
            <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
              {events.length === 0 && <p className="p-5 text-center text-[10px] text-muted-foreground">No events match.</p>}
              {events.map((event) => {
                const Icon = event.level === "critical" ? ShieldAlert : event.level === "warning" ? AlertTriangle : Check;
                return (
                  <div key={event.id} className="flex items-start gap-2 border-b border-border/40 px-3 py-2 last:border-0">
                    <span className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded", event.level === "critical" ? "bg-red-500/10 text-red-500" : event.level === "warning" ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600")}><Icon className="size-3" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10.5px] font-medium">{event.title}</p>
                      {event.detail && <p className="text-[9px] leading-snug text-muted-foreground">{event.detail}</p>}
                      <p className="mt-0.5 text-[8px] text-muted-foreground/70">{new Date(event.at).toLocaleString()} {event.appId ? `· ${event.appId}` : ""}</p>
                    </div>
                    <Pill tone={event.level === "critical" ? "danger" : event.level === "warning" ? "warning" : "success"}>{event.level}</Pill>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "data" && (
          <div className="space-y-3">
            <div className="grid gap-2.5 sm:grid-cols-2">
              <Panel>
                <SectionTitle>Privacy controls</SectionTitle>
                <div className="space-y-1.5">
                  <ActionRow icon={Download} title="Export all local data" body="Settings, files, installed apps, grants and clipboard in one JSON archive" action="Export" onClick={exportData} />
                  <ActionRow icon={RefreshCw} title="Create restore point" body="Snapshot settings and files with a checksum" action="Create" onClick={() => { os.createRestorePoint("Security checkpoint", "manual"); flash("Restore point created."); }} />
                  <ActionRow icon={Lock} title="Lock session" body="Leaves data on disk but requires sign-in" action="Lock" onClick={os.lock} />
                </div>
              </Panel>
              <Panel className="border-red-500/20">
                <SectionTitle>Data deletion</SectionTitle>
                <p className="text-[9.5px] leading-relaxed text-muted-foreground">Deleting removes every virtual file, app install, permission and local preference from this browser. This cannot be undone without an exported backup.</p>
                {!confirmWipe ? (
                  <button className="mt-2 rounded-md border border-red-500/30 px-2.5 py-1 text-[10px] font-medium text-red-600 hover:bg-red-500/5 dark:text-red-400" onClick={() => setConfirmWipe(true)}>Delete all data…</button>
                ) : (
                  <div className="mt-2 rounded-lg border border-red-500/30 bg-red-500/5 p-2">
                    <p className="text-[9.5px] font-medium text-red-600 dark:text-red-400">This is permanent. Export a backup first if you need one.</p>
                    <div className="mt-1.5 flex gap-1.5">
                      <button className="rounded bg-red-600 px-2 py-1 text-[9.5px] font-semibold text-white" onClick={async () => { await os.wipeAll(); setConfirmWipe(false); }}>Confirm deletion</button>
                      <button className="rounded border border-border px-2 py-1 text-[9.5px]" onClick={() => setConfirmWipe(false)}>Cancel</button>
                    </div>
                  </div>
                )}
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 p-2 text-[8.5px] text-muted-foreground">
                  <HardDrive className="size-3.5 shrink-0" /> Current local data: {formatBytes(os.fs.usage().bytes)} virtual files · {formatBytes(os.storage.usage)} browser usage
                </div>
              </Panel>
            </div>
            <Panel>
              <SectionTitle action={<button className="text-[9px] text-primary hover:underline" onClick={() => os.openApp("backup")}>Open WindBackup</button>}>Restore points</SectionTitle>
              <div className="space-y-1">
                {os.restorePoints.slice(0, 5).map((point) => (
                  <div key={point.id} className="flex items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5 text-[9.5px]">
                    <Database className="size-3.5 text-muted-foreground" />
                    <span className="flex-1 truncate">{point.label}</span>
                    <span className="text-[8px] text-muted-foreground">{new Date(point.at).toLocaleString()}</span>
                    <button className="text-primary hover:underline" onClick={() => { const ok = os.applyRestorePoint(point.id, "full"); flash(ok ? "Restore point applied." : "Could not apply restore point."); }}>Restore</button>
                  </div>
                ))}
                {os.restorePoints.length === 0 && <p className="py-2 text-[10px] text-muted-foreground">No restore points yet.</p>}
              </div>
            </Panel>
            <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 text-[9px] leading-relaxed text-muted-foreground">
              <Zap className="mr-1 inline size-3" /> Data never leaves this browser. WindOS uses IndexedDB for the virtual drive and localStorage for preferences. Clearing site data in your browser will erase WindOS — exactly like formatting a real drive.
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function ActionRow({ icon: Icon, title, body, action, onClick }: { icon: typeof Shield; title: string; body: string; action: string; onClick: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5">
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1"><p className="text-[10px] font-medium">{title}</p><p className="text-[8.5px] leading-snug text-muted-foreground">{body}</p></div>
      <button className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[8.5px] font-medium hover:bg-muted" onClick={onClick}>{action}</button>
    </div>
  );
}
