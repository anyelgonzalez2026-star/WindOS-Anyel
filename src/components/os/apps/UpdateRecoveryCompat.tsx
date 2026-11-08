import { useEffect, useMemo, useState } from "react";
import { useOS } from "@/lib/os/store";
import { usePersisted } from "@/lib/os/hooks";
import { APPS, APP_MAP } from "@/lib/os/registry";
import { formatBytes } from "@/lib/os/fs";
import { downloadText } from "@/lib/os/zip";
import { cn } from "@/lib/utils";
import { AppShell, AppHeader, AppToolbar, EmptyState, GhostButton, PrimaryButton, Panel, SectionTitle, Pill, Field, inputClass } from "./ui";
import { AlertTriangle, ArchiveRestore, ArrowRight, Check, CheckCircle2, Clock, Cpu, Database, Download, FileArchive, FileWarning, FolderOpen, HardDrive, History, Info, Lock, PackageCheck, Play, RefreshCw, RotateCcw, Save, ShieldAlert, ShieldCheck, Sparkles, Trash2, Upload, Wand2, XCircle } from "lucide-react";

/* ------------------------------------------------------------------ Update */

export function Update() {
  const os = useOS();
  const [checking, setChecking] = useState(false);
  const [checkedAt, setCheckedAt] = useState(0);
  const [restoreLabel, setRestoreLabel] = useState("");
  const [created, setCreated] = useState("");
  const updates = os.appUpdates;
  const updateHistory = os.securityEvents.filter((event) => /update/i.test(event.title));
  const installed = [...os.installed].sort((a, b) => (APP_MAP.get(a.id)?.name ?? a.id).localeCompare(APP_MAP.get(b.id)?.name ?? b.id));

  async function check() {
    setChecking(true);
    await new Promise((resolve) => window.setTimeout(resolve, 600));
    setCheckedAt(Date.now());
    setChecking(false);
    os.notify({ appId: "WindOS", title: updates.length ? `${updates.length} app updates available` : "No app updates available", body: updates.length ? "Review them below. Packages are local and no download is required." : "All installed packages match the local catalogue versions." });
    os.logEvent({ level: "info", title: "Update check", detail: updates.length ? `${updates.length} package updates found in the local catalogue.` : "No package updates found." });
  }

  return (
    <AppShell>
      <AppHeader icon={RefreshCw} title="WindUpdate" subtitle="Package updates, channels and update history · local catalogue only" actions={<><GhostButton onClick={() => os.openApp("backup")}><Download className="size-3.5" /> Backup first</GhostButton><PrimaryButton onClick={() => void check()} disabled={checking}><RefreshCw className={cn("size-3.5", checking && "animate-spin")} /> {checking ? "Checking…" : "Check for updates"}</PrimaryButton></>} />
      <AppToolbar>
        <Pill tone={updates.length ? "warning" : "success"}>{updates.length ? `${updates.length} available` : "up to date"}</Pill>
        <span className="text-[9px] text-muted-foreground">WindOS 1.0.0 · build stable</span>
        {checkedAt > 0 && <span className="ml-auto text-[8.5px] text-muted-foreground">Checked {new Date(checkedAt).toLocaleTimeString()}</span>}
      </AppToolbar>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="mx-auto max-w-3xl space-y-2.5">
          <div className="grid gap-2 sm:grid-cols-3">
            <Panel><SectionTitle>Operating system</SectionTitle><p className="text-[18px] font-semibold">1.0.0</p><p className="text-[8.5px] text-muted-foreground">Latest local build · no remote OS update server</p></Panel>
            <Panel><SectionTitle>Package updates</SectionTitle><p className="text-[18px] font-semibold">{updates.length}</p><p className="text-[8.5px] text-muted-foreground">{installed.length} packages installed</p></Panel>
            <Panel><SectionTitle>Last backup</SectionTitle><p className="text-[18px] font-semibold">{os.lastBackupAt ? new Date(os.lastBackupAt).toLocaleDateString() : "Never"}</p><button className="text-[8.5px] text-primary hover:underline" onClick={() => os.openApp("backup")}>Open WindBackup</button></Panel>
          </div>

          <Panel>
            <SectionTitle action={updates.length > 0 ? <PrimaryButton className="h-6 text-[9px]" onClick={() => { os.applyAllUpdates(); setCreated("Updates applied. A restore point was created automatically."); }}><Wand2 className="size-3" /> Install all</PrimaryButton> : undefined}>Available package updates</SectionTitle>
            {updates.length === 0 ? (
              <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-2.5 py-2"><p className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="size-3.5" /> Everything is current</p><p className="mt-0.5 text-[8.5px] text-muted-foreground">Every installed package matches the version in the built-in catalogue.</p></div>
            ) : (
              <div className="space-y-1">
                {updates.map(({ app, from }) => (
                  <div key={app.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5">
                    <app.icon className="size-4 shrink-0" style={{ color: app.color }} />
                    <div className="min-w-0 flex-1"><p className="text-[9.5px] font-medium">{app.name}</p><p className="text-[8px] text-muted-foreground">{from} → {app.version} · publisher {app.publisher}</p></div>
                    <button className="rounded border border-primary/30 bg-primary/8 px-2 py-0.5 text-[8.5px] font-medium text-primary hover:bg-primary/15" onClick={() => { os.updateApp(app.id); setCreated(`${app.name} updated to ${app.version}.`); }}>Update</button>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-1.5 text-[8px] leading-relaxed text-muted-foreground">The update catalogue ships with WindOS. “Checking” compares installed versions with the local registry; it does not download executable code. Installing all updates creates a restore point first.</p>
          </Panel>

          <div className="grid gap-2.5 md:grid-cols-2">
            <Panel>
              <SectionTitle>Update settings</SectionTitle>
              <Field label="Channel"><select value={os.settings.updateChannel} onChange={(event) => os.updateSettings({ updateChannel: event.target.value as "stable" | "fast" | "developer" })} className={inputClass}><option value="stable">Stable — recommended</option><option value="fast">Fast — earlier builds</option><option value="developer">Developer — experimental</option></select></Field>
              <p className="mt-1 text-[8px] text-muted-foreground">{os.settings.updateChannel === "stable" ? "Stable packages only." : os.settings.updateChannel === "fast" ? "Fast channel preference is recorded; this build still uses the local stable catalogue." : "Developer channel enables developer settings. Updates remain local packages."}</p>
              <label className="mt-2 flex items-center gap-2 text-[9px]"><input type="checkbox" checked={os.settings.autoUpdates} onChange={(event) => os.updateSettings({ autoUpdates: event.target.checked })} className="accent-[var(--os-accent)]" /> Install app updates automatically</label>
              <p className="mt-0.5 text-[8px] text-muted-foreground">Auto-update stores the preference; applying updates always requires the actions above in this build.</p>
            </Panel>
            <Panel>
              <SectionTitle>Create a checkpoint</SectionTitle>
              <p className="text-[8.5px] leading-relaxed text-muted-foreground">Take a restore point before changing packages. It captures settings, files, grants and app state locally.</p>
              <div className="mt-1.5 flex gap-1"><input value={restoreLabel} onChange={(event) => setRestoreLabel(event.target.value)} placeholder="Before update" className={cn(inputClass, "h-7 text-[9.5px]")} /><PrimaryButton className="h-7" onClick={() => { const point = os.createRestorePoint(restoreLabel.trim() || "Before updates"); setRestoreLabel(""); setCreated(`${point.label} created.`); }}><Save className="size-3" /> Create</PrimaryButton></div>
              {created && <p className="mt-1 text-[8.5px] text-primary">{created}</p>}
              <button className="mt-1 text-[8.5px] text-primary hover:underline" onClick={() => os.openApp("recovery")}>Open WindRecovery</button>
            </Panel>
          </div>

          <Panel>
            <SectionTitle>Installed packages</SectionTitle>
            <div className="max-h-56 overflow-y-auto">
              <table className="w-full text-left text-[9px]"><thead><tr className="border-b border-border/50 text-[7.5px] uppercase tracking-wider text-muted-foreground"><th className="py-1 font-medium">Application</th><th className="font-medium">Version</th><th className="font-medium">Source</th><th className="font-medium">Installed</th></tr></thead><tbody>
                {installed.map((entry) => { const app = APP_MAP.get(entry.id); return <tr key={entry.id} className="border-b border-border/30 last:border-0"><td className="py-1">{app?.name ?? entry.id}</td><td className="font-mono text-[8px]">{entry.version}</td><td className="capitalize text-muted-foreground">{entry.source}</td><td className="text-muted-foreground">{new Date(entry.installedAt).toLocaleDateString()}</td></tr>; })}
              </tbody></table>
            </div>
          </Panel>

          <Panel>
            <SectionTitle>Update history</SectionTitle>
            {updateHistory.length === 0 ? <p className="text-[8.5px] text-muted-foreground">No update events yet.</p> : <div className="space-y-1">{updateHistory.slice(0, 6).map((event) => <div key={event.id} className="flex items-start gap-1.5 text-[8.5px]"><Check className="mt-0.5 size-2.5 text-emerald-500" /><div className="flex-1"><p className="font-medium">{event.title}</p><p className="text-[8px] text-muted-foreground">{event.detail} · {new Date(event.at).toLocaleString()}</p></div></div>)}</div>}
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}

/* ---------------------------------------------------------------- Recovery */

export function Recovery() {
  const os = useOS();
  const [label, setLabel] = useState("");
  const [mode, setMode] = useState<"settings" | "files" | "full">("full");
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmWipe, setConfirmWipe] = useState("");
  const [wipeArmed, setWipeArmed] = useState(false);
  const [scan, setScan] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [recoveryConfirm, setRecoveryConfirm] = useState(false);
  const usage = os.fs.usage();

  function runScan() {
    const issues: string[] = [];
    let nodes = 0;
    let files = 0;
    const seen = new Set<string>();
    function walk(parentId: string | null, depth: number) {
      if (depth > 40) { issues.push("Folder nesting exceeded 40 levels."); return; }
      for (const child of os.fs.children(parentId)) {
        nodes++;
        if (seen.has(child.id)) issues.push(`Duplicate node id: ${child.id}`);
        seen.add(child.id);
        if (child.type === "file") {
          files++;
          if (child.size < 0) issues.push(`Negative size: ${child.name}`);
          if (!child.content && child.size > 0 && !child.mime?.startsWith("image/")) issues.push(`File has size but no content: ${child.name}`);
        } else walk(child.id, depth + 1);
      }
    }
    walk(null, 0);
    const trash = os.fs.allTrash();
    const result = [`WindOS integrity scan`, `Run ${new Date().toISOString()}`, `Nodes checked: ${nodes}`, `Files: ${files}`, `Folders: ${nodes - files}`, `Trash items: ${trash.length}`, `Reclaimed space available: ${formatBytes(usage.trashBytes)}`, "", issues.length ? `Issues (${issues.length}):` : "No structural issues found.", ...issues.slice(0, 40)].join("\n");
    setScan(result);
    os.logEvent({ level: issues.length ? "warning" : "info", title: "Filesystem integrity scan", detail: issues.length ? `${issues.length} issue(s) detected.` : `${nodes} nodes verified with no structural issues.` });
  }

  function choose(id: string) { setSelected(selected === id ? null : id); }

  return (
    <AppShell>
      <AppHeader icon={RotateCcw} title="WindRecovery" subtitle="Restore points, safe mode, startup repair and factory reset" actions={<><GhostButton onClick={() => os.openApp("backup")}><Download className="size-3.5" /> Backup / import</GhostButton><PrimaryButton onClick={() => { const point = os.createRestorePoint(label.trim() || "Manual restore point"); setLabel(""); setNotice(`${point.label} created with ${point.fileCount} files.`); }}><Save className="size-3.5" /> Create restore point</PrimaryButton></>} />
      <AppToolbar>
        <Pill tone="success">drive healthy</Pill>
        <span className="text-[9px] text-muted-foreground">{usage.files} files · {usage.folders} folders · {formatBytes(usage.bytes)} · {os.restorePoints.length} restore points</span>
        <span className="ml-auto flex items-center gap-1 text-[8.5px] text-muted-foreground"><ShieldCheck className="size-3 text-emerald-500" /> checksums verified on restore</span>
      </AppToolbar>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="mx-auto max-w-3xl space-y-2.5">
          <div className="rounded-xl border border-border/60 bg-card p-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Restore point name" className={cn(inputClass, "h-7 max-w-56 text-[9.5px]")} />
              <PrimaryButton className="h-7" onClick={() => { const point = os.createRestorePoint(label.trim() || "Manual restore point"); setLabel(""); setNotice(`${point.label} created with ${point.fileCount} files.`); }}>Capture now</PrimaryButton>
              <GhostButton className="h-7" onClick={runScan}><Cpu className="size-3" /> Scan drive</GhostButton>
              <GhostButton className="h-7" onClick={() => os.openApp("backup")}><ArchiveRestore className="size-3" /> Export backup</GhostButton>
              {notice && <span className="text-[8.5px] text-emerald-600 dark:text-emerald-400">{notice}</span>}
            </div>
          </div>

          <Panel>
            <SectionTitle action={<span className="text-[8px] text-muted-foreground">{os.restorePoints.length} available</span>}>Restore points</SectionTitle>
            {os.restorePoints.length === 0 ? <EmptyState icon={Clock} title="No restore points yet" body="Create one before installing apps or changing settings. Snapshots are stored locally in this browser." /> : (
              <div className="space-y-1">
                {[...os.restorePoints].sort((a, b) => b.at - a.at).map((point) => (
                  <div key={point.id} className={cn("rounded-lg border p-2", selected === point.id ? "border-primary/40 bg-primary/5" : "border-border/60")}>
                    <button className="flex w-full flex-wrap items-center gap-1.5 text-left" onClick={() => choose(point.id)}>
                      <History className="size-3.5 text-primary" />
                      <span className="min-w-0 flex-1"><span className="block truncate text-[9.5px] font-medium">{point.label}</span><span className="block text-[8px] text-muted-foreground">{new Date(point.at).toLocaleString()} · {point.kind} · {point.fileCount} files · {point.appCount} apps</span></span>
                      <span className="font-mono text-[7.5px] text-muted-foreground">{point.checksum.slice(0, 10)}…</span>
                    </button>
                    {selected === point.id && (
                      <div className="mt-2 border-t border-border/40 pt-2">
                        <p className="mb-1 text-[8.5px] text-muted-foreground">Choose what to restore. Full restore replaces settings, files, permissions and packages. Current data is replaced; export a backup first if needed.</p>
                        <div className="flex flex-wrap gap-1">{([["settings", "Settings only"], ["files", "Files only"], ["full", "Full restore"]] as const).map(([id, text]) => <button key={id} className={cn("rounded border px-1.5 py-0.5 text-[8.5px]", mode === id ? "border-primary/40 bg-primary/10 text-primary" : "border-border hover:bg-muted")} onClick={() => setMode(id)}>{text}</button>)}
                          <PrimaryButton className="h-6 text-[8.5px]" onClick={() => { const ok = os.applyRestorePoint(point.id, mode); setNotice(ok ? `Restored ${point.label} (${mode}).` : "Restore failed: checksum mismatch or missing snapshot."); if (!ok) setScan("The selected restore point could not be applied. Integrity verification failed."); }}><RotateCcw className="size-2.5" /> Restore</PrimaryButton>
                          <GhostButton className="h-6 text-[8.5px] text-red-500" onClick={() => { os.deleteRestorePoint(point.id); setSelected(null); setNotice("Restore point deleted."); }}><Trash2 className="size-2.5" /> Delete</GhostButton>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {scan && <Panel><SectionTitle action={<button className="text-[8px] text-primary" onClick={() => { const name = `Integrity scan ${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.txt`; os.fs.createFile("folder_documents", name, scan, "text/plain"); setNotice(`Saved ${name}.`); }}>Save report</button>}>Scan result</SectionTitle><pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded bg-muted/30 p-2 text-[8px] leading-relaxed">{scan}</pre></Panel>}

          <div className="grid gap-2.5 md:grid-cols-2">
            <Panel>
              <SectionTitle>Startup & recovery modes</SectionTitle>
              <p className="text-[8.5px] leading-relaxed text-muted-foreground">Safe mode disables optional startup apps and store installations. Recovery environment suspends the desktop, preserving data.</p>
              <label className="mt-1.5 flex items-center gap-2 text-[9px]"><input type="checkbox" checked={os.settings.safeMode} onChange={(event) => os.updateSettings({ safeMode: event.target.checked })} className="accent-[var(--os-accent)]" /> Safe mode</label>
              <div className="mt-2 flex flex-wrap gap-1"><GhostButton className="h-6 text-[8px]" onClick={() => os.bootSafeMode()}><ShieldCheck className="size-2.5" /> Boot in safe mode</GhostButton><GhostButton className="h-6 text-[8px]" onClick={() => setRecoveryConfirm(true)}><AlertTriangle className="size-2.5" /> Enter recovery</GhostButton><GhostButton className="h-6 text-[8px]" onClick={() => os.restart()}><RefreshCw className="size-2.5" /> Restart</GhostButton></div>
              {recoveryConfirm && <div className="mt-2 rounded border border-amber-500/30 bg-amber-500/10 p-2"><p className="text-[8.5px]">Open the recovery environment? The desktop will close; your data remains saved.</p><div className="mt-1 flex gap-1"><PrimaryButton className="h-6 text-[8.5px]" onClick={() => { os.enterRecovery(); setRecoveryConfirm(false); }}>Enter recovery</PrimaryButton><GhostButton className="h-6 text-[8.5px]" onClick={() => setRecoveryConfirm(false)}>Cancel</GhostButton></div></div>}
            </Panel>
            <Panel>
              <SectionTitle>Factory reset</SectionTitle>
              <div className="rounded-lg border border-red-500/25 bg-red-500/5 p-2">
                <p className="flex items-center gap-1 text-[9px] font-medium text-red-600 dark:text-red-400"><AlertTriangle className="size-3" /> This cannot be undone</p>
                <p className="mt-0.5 text-[8px] leading-relaxed text-muted-foreground">Deletes the virtual drive, restore points, installed package records, permissions and preferences from this browser. Export a backup first.</p>
                {!wipeArmed ? <GhostButton className="mt-1.5 h-6 text-[8px] text-red-500" onClick={() => setWipeArmed(true)}><Trash2 className="size-2.5" /> Begin reset</GhostButton> : <div className="mt-1.5"><input value={confirmWipe} onChange={(event) => setConfirmWipe(event.target.value)} placeholder="Type WIPE to confirm" className={cn(inputClass, "h-6 text-[8.5px]")} /><div className="mt-1 flex gap-1"><PrimaryButton className="h-6 bg-red-600 text-[8.5px] hover:bg-red-500" disabled={confirmWipe !== "WIPE"} onClick={() => void os.wipeAll()}><Trash2 className="size-2.5" /> Erase everything</PrimaryButton><GhostButton className="h-6 text-[8.5px]" onClick={() => { setWipeArmed(false); setConfirmWipe(""); }}>Cancel</GhostButton></div></div>}
              </div>
              <div className="mt-2 space-y-1 text-[8px] text-muted-foreground"><p className="flex items-start gap-1"><Info className="mt-0.5 size-2.5 shrink-0" /> WindRecovery operates entirely on the virtual drive. It cannot repair your real computer or recover files outside this browser.</p><p className="flex items-start gap-1"><Check className="mt-0.5 size-2.5 shrink-0 text-emerald-500" /> Restore points are checksummed and refused if corrupted.</p></div>
            </Panel>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ Compat */

interface PeInfo {
  name: string;
  size: number;
  mz: boolean;
  pe: boolean;
  machine?: string;
  machineCode?: string;
  sections?: number;
  subsystem?: string;
  type?: string;
  timestamp?: string;
  entryPoint?: string;
  dll?: boolean;
  sha256?: string;
  error?: string;
}

const MACHINES: Record<number, string> = { 0x14c: "x86 (32-bit)", 0x8664: "x64 (64-bit)", 0xaa64: "ARM64", 0x1c0: "ARM", 0x1c4: "ARM Thumb", 0x200: "Itanium", 0x5032: "RISC-V 32", 0x5064: "RISC-V 64" };
const SUBSYSTEMS: Record<number, string> = { 1: "Native", 2: "Windows GUI", 3: "Windows console", 5: "OS/2 console", 7: "POSIX console", 9: "Windows CE GUI", 10: "EFI application", 16: "Windows boot application" };

const FORMATS: { ext: string; name: string; status: "inspect" | "no" | "open"; detail: string }[] = [
  { ext: ".exe", name: "Windows executable", status: "inspect", detail: "PE header and metadata inspection only. Never executed." },
  { ext: ".dll", name: "Windows library", status: "inspect", detail: "Header inspection; cannot be loaded by a browser." },
  { ext: ".msi", name: "Windows installer", status: "inspect", detail: "File properties only; installation is not possible." },
  { ext: ".appx / .msix", name: "Windows package", status: "inspect", detail: "Metadata only; no host package manager access." },
  { ext: ".bat / .cmd", name: "Windows script", status: "no", detail: "Can be viewed as text in WindCode; never run." },
  { ext: ".ps1", name: "PowerShell script", status: "no", detail: "Can be viewed as text; no PowerShell host." },
  { ext: ".sh", name: "Shell script", status: "no", detail: "Can be viewed as text; WindTerminal is not a host shell." },
  { ext: ".zip", name: "ZIP archive", status: "open", detail: "Opens in WindZip for entry listing and text extraction." },
  { ext: ".pdf", name: "PDF document", status: "open", detail: "Opens in WindPDF with the browser’s viewer." },
  { ext: ".js / .html", name: "Web project", status: "open", detail: "Opens in WindCode and can be previewed in a sandboxed iframe." },
];

export function Compat({ payload }: { payload?: Record<string, unknown> }) {
  const os = useOS();
  const [info, setInfo] = useState<PeInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [handlers, setHandlers] = usePersisted<Record<string, string>>("compat.handlers.v1", { exe: "compat", msi: "compat", appx: "compat" });
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<"inspect" | "formats" | "handlers">("inspect");
  const [trust, setTrust] = useState(false);
  const ext = info?.name.split(".").pop()?.toLowerCase() ?? "";

  useEffect(() => {
    const openId = typeof payload?.openId === "string" ? payload.openId : "";
    if (!openId) return;
    const node = os.fs.byId(openId);
    if (!node?.content) return;
    void inspectDataUrl(node.name, node.content);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function inspectDataUrl(name: string, dataUrl: string) {
    try {
      setBusy(true);
      const blob = await (await fetch(dataUrl)).blob();
      await inspectBlob(new File([blob], name, { type: "application/octet-stream" }), false);
    } catch {
      setInfo({ name, size: 0, mz: false, pe: false, error: "The file payload could not be read from the virtual drive." });
    } finally { setBusy(false); }
  }

  async function inspectBlob(file: File, save: boolean) {
    if (file.size > 24 * 1024 * 1024) { setInfo({ name: file.name, size: file.size, mz: false, pe: false, error: "Files larger than 24 MB are not inspected in the browser." }); return; }
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    const next: PeInfo = { name: file.name, size: file.size, mz: bytes[0] === 0x4d && bytes[1] === 0x5a, pe: false };
    if (next.mz && bytes.length > 0x40) {
      const peOffset = view.getUint32(0x3c, true);
      if (peOffset > 0 && peOffset + 24 < bytes.length && view.getUint32(peOffset, true) === 0x00004550) {
        next.pe = true;
        const machine = view.getUint16(peOffset + 4, true);
        next.machine = MACHINES[machine] ?? `Unknown (0x${machine.toString(16)})`;
        next.machineCode = `0x${machine.toString(16)}`;
        next.sections = view.getUint16(peOffset + 6, true);
        const timestamp = view.getUint32(peOffset + 8, true);
        next.timestamp = timestamp ? new Date(timestamp * 1000).toLocaleString() : "not set";
        const optionalMagic = view.getUint16(peOffset + 24, true);
        next.type = optionalMagic === 0x20b ? "PE32+ (64-bit)" : optionalMagic === 0x10b ? "PE32 (32-bit)" : `Unknown optional header (0x${optionalMagic.toString(16)})`;
        const subsystemAddress = peOffset + 24 + 68;
        if (subsystemAddress + 2 <= bytes.length) {
          const subsystem = view.getUint16(subsystemAddress, true);
          next.subsystem = SUBSYSTEMS[subsystem] ?? `Unknown (${subsystem})`;
          next.dll = (view.getUint16(subsystemAddress + 2, true) & 0x2000) !== 0;
        }
        if (peOffset + 24 + 16 <= bytes.length) next.entryPoint = `0x${view.getUint32(peOffset + 24 + 16, true).toString(16)}`;
        try {
          const digest = await crypto.subtle.digest("SHA-256", buffer);
          next.sha256 = Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("");
        } catch { /* crypto may be unavailable */ }
      }
    }
    if (!next.pe) next.error = next.mz ? "The file begins with an MZ header but no valid PE signature was found." : "This is not a Windows PE executable (no MZ header). WindCompat can still describe the file, but cannot inspect executable metadata.";
    setInfo(next);
    setTrust(false);
    if (save && file.size <= 5 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = () => {
        const node = os.fs.createFile("folder_downloads", file.name, String(reader.result), "application/octet-stream");
        if (node) setNotice(`A copy of ${file.name} was saved to Downloads. Double-clicking it opens WindCompat, not Windows.`);
      };
      reader.readAsDataURL(file);
    }
  }

  async function inspectFile(file: File | undefined) {
    if (!file) return;
    setNotice("");
    setBusy(true);
    try { await inspectBlob(file, true); } finally { setBusy(false); }
  }

  function report() {
    if (!info) return;
    const body = JSON.stringify({ product: "WindOS", version: "1.0.0", inspectedAt: new Date().toISOString(), executable: info, executionSupported: false, note: "Metadata inspection only. A browser cannot execute Windows PE binaries. No code was run." }, null, 2);
    downloadText(body, `${info.name}.compat.json`, "application/json");
    os.logEvent({ level: "info", title: "Compatibility report exported", detail: `${info.name} metadata exported. No executable code was run.` });
    setNotice("Compatibility report exported as JSON.");
  }

  return (
    <AppShell>
      <AppHeader icon={FileWarning} title="WindCompat" subtitle="Executable metadata inspector and compatibility manager · no code execution" actions={<><input id="compat-file" type="file" className="hidden" onChange={(event) => { void inspectFile(event.target.files?.[0]); event.target.value = ""; }} /><PrimaryButton onClick={() => document.getElementById("compat-file")?.click()}><Upload className="size-3.5" /> Inspect executable</PrimaryButton></>} />
      <AppToolbar>
        {([["inspect", "Inspector"], ["formats", "Compatibility"], ["handlers", "File handlers"]] as const).map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={cn("rounded px-2 py-1 text-[9.5px]", tab === id ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted")}>{label}</button>)}
        <span className="ml-auto flex items-center gap-1 text-[8.5px] text-muted-foreground"><Lock className="size-2.5" /> sandboxed · metadata only</span>
      </AppToolbar>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="mx-auto max-w-3xl">
          {tab === "inspect" && (
            <div className="space-y-2.5">
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 p-2.5">
                <p className="flex items-center gap-1.5 text-[9.5px] font-semibold text-amber-800 dark:text-amber-200"><AlertTriangle className="size-3.5" /> Windows executables cannot run inside a browser</p>
                <p className="mt-0.5 text-[8.5px] leading-relaxed text-amber-800/80 dark:text-amber-100/70">WindCompat reads PE headers and file metadata locally. It never executes, unpacks or uploads a Windows binary. There is no host filesystem, registry, Win32 API, antivirus or installer access. Non-executable scripts can be inspected as text in WindCode.</p>
              </div>
              {busy ? <Panel><p className="text-center text-[9.5px] text-muted-foreground">Reading local file header…</p></Panel> : info ? (
                <>
                  <Panel>
                    <div className="flex flex-wrap items-start gap-2">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted"><FileWarning className="size-5 text-muted-foreground" /></div>
                      <div className="min-w-0 flex-1"><p className="truncate text-[12px] font-semibold">{info.name}</p><p className="text-[8.5px] text-muted-foreground">{formatBytes(info.size)} · {info.pe ? "Windows PE binary" : info.mz ? "Malformed PE" : "Not a PE executable"}</p></div>
                      <Pill tone={info.pe ? "warning" : info.mz ? "danger" : "neutral"}>{info.pe ? "unsupported runtime" : info.mz ? "invalid" : "unknown format"}</Pill>
                    </div>
                    {info.error && <p className="mt-2 flex items-start gap-1.5 rounded border border-amber-500/30 bg-amber-500/8 p-2 text-[8.5px] text-amber-800 dark:text-amber-200"><ShieldAlert className="mt-0.5 size-3 shrink-0" /> {info.error}</p>}
                    <div className="mt-2 grid gap-1 text-[9px] sm:grid-cols-2">
                      <Detail label="MZ / DOS header" value={info.mz ? "present" : "absent"} />
                      <Detail label="PE signature" value={info.pe ? "valid PE\\0\\0" : "not found"} />
                      <Detail label="Architecture" value={info.machine ?? "—"} />
                      <Detail label="Optional header" value={info.type ?? "—"} />
                      <Detail label="Subsystem" value={info.subsystem ?? "—"} />
                      <Detail label="Section count" value={info.sections !== undefined ? String(info.sections) : "—"} />
                      <Detail label="Entry point RVA" value={info.entryPoint ?? "—"} />
                      <Detail label="DLL flag" value={info.dll === undefined ? "—" : info.dll ? "yes" : "no"} />
                      <Detail label="PE timestamp" value={info.timestamp ?? "—"} />
                      <Detail label="File extension" value={ext ? `.${ext}` : "none"} />
                    </div>
                    {info.sha256 && <div className="mt-2"><p className="text-[8px] text-muted-foreground">SHA-256 (computed locally)</p><p className="break-all rounded bg-muted/40 p-1.5 font-mono text-[7.5px]">{info.sha256}</p></div>}
                  </Panel>

                  <Panel>
                    <SectionTitle>Compatibility status</SectionTitle>
                    <div className="space-y-1">
                      <CompatRow ok={false} label="Native Windows execution" detail="Impossible: browsers cannot load PE binaries or call Win32 APIs." />
                      <CompatRow ok={false} label="Host install / registry" detail="Not available. WindCompat never touches your real OS." />
                      <CompatRow ok={true} label="Metadata inspection" detail={info.pe ? "PE header parsed successfully." : "Basic file properties are available."} />
                      <CompatRow ok={true} label="Hash verification" detail={info.sha256 ? "SHA-256 computed with Web Crypto." : "Hash unavailable in this browser context."} />
                      <CompatRow ok={true} label="Text script review" detail="Use WindCode for .bat, .cmd, .ps1, .sh and text formats." />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1"><PrimaryButton className="h-7 text-[9px]" onClick={report}><Download className="size-3" /> Export report</PrimaryButton><GhostButton className="h-7 text-[9px]" onClick={() => os.openApp("help")}><Info className="size-3" /> Help</GhostButton><GhostButton className="h-7 text-[9px]" onClick={() => setTrust((value) => !value)}><ShieldAlert className="size-3" /> {trust ? "Hide trust details" : "Trust details"}</GhostButton></div>
                    {trust && <div className="mt-2 rounded border border-border/60 bg-muted/20 p-2 text-[8px] leading-relaxed text-muted-foreground"><p>Publisher: <strong>Unknown in this simulation.</strong> No Authenticode signature is validated. A Windows binary’s presence on your disk does not make it trustworthy.</p><p className="mt-1">Do not run files from untrusted sources on your real computer. WindOS can only inspect headers inside the browser sandbox.</p></div>}
                  </Panel>
                  {notice && <p className="text-[8.5px] text-emerald-600 dark:text-emerald-400">{notice}</p>}
                </>
              ) : (
                <Panel><EmptyState icon={FileWarning} title="Inspect an executable" body="Choose a Windows .exe or .dll from your device. WindCompat reads its PE header in the browser, computes a SHA-256 hash and explains why it cannot run here. Nothing is uploaded." action={<PrimaryButton onClick={() => document.getElementById("compat-file")?.click()}><Upload className="size-3.5" /> Choose file</PrimaryButton>} /></Panel>
              )}
            </div>
          )}

          {tab === "formats" && (
            <div className="space-y-2.5">
              <Panel>
                <SectionTitle>Supported formats and honest boundaries</SectionTitle>
                <div className="space-y-1">
                  {FORMATS.map((format) => (
                    <div key={format.ext} className="flex items-start gap-2 rounded border border-border/50 px-2 py-1.5">
                      <span className="mt-0.5 w-20 shrink-0 font-mono text-[8.5px] text-muted-foreground">{format.ext}</span>
                      <div className="min-w-0 flex-1"><p className="text-[9.5px] font-medium">{format.name}</p><p className="text-[8px] leading-snug text-muted-foreground">{format.detail}</p></div>
                      <Pill tone={format.status === "open" ? "success" : format.status === "inspect" ? "warning" : "neutral"}>{format.status === "open" ? "opens" : format.status === "inspect" ? "inspect" : "no runtime"}</Pill>
                    </div>
                  ))}
                </div>
              </Panel>
              <Panel><SectionTitle>Why can’t WindOS run EXE files?</SectionTitle><p className="text-[9px] leading-relaxed text-muted-foreground">A Windows executable needs the Windows kernel, Win32 subsystem, registry, DLL loader and hardware drivers. A web page runs in a sandbox with no access to those interfaces. Emulating them in JavaScript would be an enormous research project and would still not be Windows. WindCompat therefore inspects metadata and points you to a native app or the original Windows environment. Claiming otherwise would be unsafe and false.</p></Panel>
              <Panel><SectionTitle>Local package installation</SectionTitle><p className="text-[9px] leading-relaxed text-muted-foreground">WindOS installs packages from its built-in WindStore catalogue. Local ZIP archives can be inspected and extracted with WindZip. Arbitrary third-party MSI/EXE installers are not supported. Installing code that can run in the OS page would bypass the security model, so the only supported package path is the reviewed store catalogue.</p></Panel>
            </div>
          )}

          {tab === "handlers" && (
            <div className="space-y-2.5">
              <Panel>
                <SectionTitle>Application handler selection</SectionTitle>
                <p className="text-[8.5px] leading-relaxed text-muted-foreground">These associations are used when an executable or installer is opened from WindFiles. “WindCompat inspector” is the only safe default; raw text opens the binary payload in WindCode and is not recommended.</p>
                <div className="mt-2 space-y-1.5">
                  {[["exe", "Windows executable"], ["msi", "Windows installer"], ["appx", "Windows app package"]].map(([key, label]) => (
                    <div key={key} className="flex flex-wrap items-center gap-2 rounded border border-border/50 px-2 py-1.5"><span className="w-28 text-[9px] font-medium">.{key}</span><span className="flex-1 text-[8.5px] text-muted-foreground">{label}</span><select value={handlers[key] ?? "compat"} onChange={(event) => setHandlers({ ...handlers, [key]: event.target.value })} className="h-6 rounded border border-border bg-background px-1 text-[8.5px]"><option value="compat">WindCompat inspector</option><option value="code">WindCode raw text</option></select></div>
                  ))}
                </div>
                <p className="mt-2 text-[8px] text-muted-foreground">Handlers never execute the file. Changing a handler only changes which WindOS app receives the file reference.</p>
              </Panel>
              <Panel><SectionTitle>Compatibility report</SectionTitle><p className="text-[8.5px] text-muted-foreground">Inspect a file to generate a JSON report with header fields, hash, compatibility status and a clear execution warning. Reports stay local unless you download them.</p></Panel>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function CompatRow({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return <div className="flex items-start gap-1.5 rounded border border-border/50 px-2 py-1">{ok ? <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-emerald-500" /> : <XCircle className="mt-0.5 size-3 shrink-0 text-red-500" />}<div><p className="text-[9px] font-medium">{label}</p><p className="text-[8px] text-muted-foreground">{detail}</p></div></div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="flex gap-1.5 rounded bg-muted/25 px-1.5 py-1"><span className="w-24 shrink-0 text-[8px] text-muted-foreground">{label}</span><span className="min-w-0 flex-1 truncate font-medium">{value}</span></div>;
}
