import { useRef, useState } from "react";
import { useOS } from "@/lib/os/store";
import { formatBytes } from "@/lib/os/fs";
import { downloadText } from "@/lib/os/zip";
import { cn } from "@/lib/utils";
import { AppShell, AppHeader, AppToolbar, GhostButton, Panel, PrimaryButton, SectionTitle, Pill } from "./ui";
import { AlertTriangle, Archive, Check, CheckCircle2, Clock3, Database, DatabaseBackup, Download, FileJson, FolderOpen, HardDrive, RefreshCw, RotateCcw, ShieldCheck, Trash2, Upload, X } from "lucide-react";

export default function Backup() {
  const os = useOS();
  const [tab, setTab] = useState<"export" | "import" | "restore">("export");
  const [options, setOptions] = useState({ settings: true, files: true, apps: true, clipboard: false });
  const [lastExport, setLastExport] = useState<{ at: number; bytes: number; name: string } | null>(null);
  const [preview, setPreview] = useState<{ name: string; json: string; product?: string; version?: string; createdAt?: number; files?: number; checksum?: string; error?: string } | null>(null);
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [label, setLabel] = useState("");
  const [toast, setToast] = useState("");
  const [confirmImport, setConfirmImport] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const usage = os.fs.usage();

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }

  function createBackup() {
    const json = os.buildBackup({
      includeSettings: options.settings,
      includeFiles: options.files,
      includeApps: options.apps,
      includeClipboard: options.clipboard,
    });
    const name = `windos-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
    downloadText(json, name, "application/json");
    setLastExport({ at: Date.now(), bytes: new Blob([json]).size, name });
    os.logEvent({ level: "info", title: "Backup created", detail: `Manual backup ${name} (${formatBytes(new Blob([json]).size)}).` });
    flash("Backup downloaded and recorded.");
  }

  function readFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const json = String(reader.result ?? "");
      try {
        const parsed = JSON.parse(json) as { product?: string; version?: string; createdAt?: number; checksum?: string; data?: { fs?: { nodes?: unknown[] } } };
        if (parsed.product !== "WindOS") {
          setPreview({ name: file.name, json, error: "This file is not a WindOS backup archive." });
          return;
        }
        setPreview({
          name: file.name,
          json,
          product: parsed.product,
          version: parsed.version,
          createdAt: parsed.createdAt,
          files: parsed.data?.fs?.nodes?.length,
          checksum: parsed.checksum,
        });
        setMode("merge");
        setConfirmImport(false);
      } catch {
        setPreview({ name: file.name, json, error: "The archive could not be parsed as JSON." });
      }
    };
    reader.readAsText(file);
  }

  function applyImport() {
    if (!preview || preview.error) return;
    try {
      const result = os.importBackup(preview.json, mode);
      os.notify({ appId: "WindOS", title: "Backup restored", body: `${result.files} file records imported with checksum verification.` });
      flash(`Restore complete — ${result.files} file records processed.`);
      setPreview(null);
      setConfirmImport(false);
    } catch (error) {
      setPreview({ ...preview, error: error instanceof Error ? error.message : "Import failed." });
    }
  }

  return (
    <AppShell>
      <AppHeader
        icon={DatabaseBackup}
        title="WindBackup"
        subtitle={`${formatBytes(usage.bytes)} virtual data · ${os.restorePoints.length} restore points · last backup ${os.lastBackupAt ? new Date(os.lastBackupAt).toLocaleDateString() : "never"}`}
        actions={<GhostButton onClick={() => inputRef.current?.click()}><Upload className="size-3.5" /> Restore file</GhostButton>}
      />
      <AppToolbar>
        {(["export", "import", "restore"] as const).map((item) => (
          <button key={item} onClick={() => setTab(item)} className={cn("rounded-md px-2.5 py-1 text-[11px] font-medium capitalize transition", tab === item ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
            {item === "import" ? "Restore from file" : item === "restore" ? "Restore points" : "Create backup"}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-1 text-[9px] text-muted-foreground"><ShieldCheck className="size-3" /> checksum verified archives</span>
      </AppToolbar>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {toast && <div className="mb-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-[10px] text-emerald-700 dark:text-emerald-300">{toast}</div>}

        {tab === "export" && (
          <div className="mx-auto max-w-2xl space-y-3">
            <div className="rounded-xl border border-border/70 bg-gradient-to-br from-primary/8 to-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary"><Archive className="size-5" /></div>
                <div>
                  <p className="text-[13px] font-semibold">Create a portable backup</p>
                  <p className="text-[9.5px] text-muted-foreground">A signed-structure JSON archive with a checksum over all included data.</p>
                </div>
              </div>
              <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                {([
                  ["settings", "Settings", "Theme, wallpaper, taskbar, accessibility and preferences"],
                  ["files", "Virtual files", `${usage.files} files across ${usage.folders} folders`],
                  ["apps", "Installed apps", `${os.installed.length} applications and their versions`],
                  ["clipboard", "Clipboard history", "Clipboard entries, including pinned items"],
                ] as const).map(([key, title, body]) => (
                  <label key={key} className="flex cursor-pointer items-start gap-2 rounded-lg border border-border/60 bg-card/60 p-2">
                    <input type="checkbox" checked={options[key]} onChange={(event) => setOptions({ ...options, [key]: event.target.checked })} className="mt-0.5 accent-[var(--os-accent)]" />
                    <span><span className="block text-[10px] font-medium">{title}</span><span className="block text-[8.5px] leading-snug text-muted-foreground">{body}</span></span>
                  </label>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-[9px] text-muted-foreground">Permissions, quick settings and desktops are always included.</span>
                <PrimaryButton onClick={createBackup}><Download className="size-3.5" /> Download backup</PrimaryButton>
              </div>
            </div>
            {lastExport && (
              <Panel>
                <SectionTitle>Last export</SectionTitle>
                <div className="flex items-center gap-2 text-[10px]">
                  <FileJson className="size-4 text-primary" />
                  <span className="flex-1 truncate font-medium">{lastExport.name}</span>
                  <span className="text-muted-foreground">{formatBytes(lastExport.bytes)}</span>
                  <Pill tone="success">verified</Pill>
                </div>
                <p className="mt-1 text-[9px] text-muted-foreground">Downloaded {new Date(lastExport.at).toLocaleString()}. Keep this file somewhere other than the WindOS drive.</p>
              </Panel>
            )}
            <Panel>
              <SectionTitle>Backup integrity</SectionTitle>
              <div className="space-y-1 text-[9.5px] text-muted-foreground">
                <p className="flex items-start gap-1.5"><Check className="mt-0.5 size-3 shrink-0 text-emerald-500" /> Archives embed the product, version, creation time and a checksum over the data body.</p>
                <p className="flex items-start gap-1.5"><Check className="mt-0.5 size-3 shrink-0 text-emerald-500" /> Restoring recomputes the checksum and refuses mismatched or edited archives.</p>
                <p className="flex items-start gap-1.5"><AlertTriangle className="mt-0.5 size-3 shrink-0 text-amber-500" /> The checksum detects accidental corruption, not a malicious replacement. Only restore archives you created.</p>
              </div>
            </Panel>
          </div>
        )}

        {tab === "import" && (
          <div className="mx-auto max-w-2xl space-y-3">
            {!preview ? (
              <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
                <Upload className="mx-auto mb-2 size-7 text-muted-foreground/40" />
                <p className="text-[12px] font-semibold">Restore from a backup file</p>
                <p className="mx-auto mt-1 max-w-sm text-[9.5px] leading-relaxed text-muted-foreground">Choose a WindOS JSON archive. WindOS validates the product marker and checksum before touching your files.</p>
                <PrimaryButton className="mx-auto mt-3" onClick={() => inputRef.current?.click()}><FolderOpen className="size-3.5" /> Choose archive</PrimaryButton>
              </div>
            ) : (
              <>
                <Panel>
                  <div className="flex items-start gap-2">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-muted"><FileJson className="size-4" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-semibold">{preview.name}</p>
                      <p className="text-[9px] text-muted-foreground">{formatBytes(new Blob([preview.json]).size)} · {preview.product ?? "unknown format"} {preview.version ?? ""}</p>
                    </div>
                    <button className="rounded p-1 text-muted-foreground hover:bg-muted" onClick={() => setPreview(null)} aria-label="Remove"><X className="size-3.5" /></button>
                  </div>
                  {preview.error ? (
                    <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-[9.5px] text-red-600 dark:text-red-300"><AlertTriangle className="mt-0.5 size-3 shrink-0" /> {preview.error}</div>
                  ) : (
                    <>
                      <div className="mt-2 grid grid-cols-2 gap-1 text-[9px] sm:grid-cols-4">
                        <InfoBlock label="Created" value={preview.createdAt ? new Date(preview.createdAt).toLocaleDateString() : "unknown"} />
                        <InfoBlock label="File records" value={String(preview.files ?? "—")} />
                        <InfoBlock label="Checksum" value={preview.checksum?.slice(0, 12) ?? "—"} />
                        <InfoBlock label="Product" value={preview.product ?? "—"} />
                      </div>
                      <div className="mt-3">
                        <p className="mb-1 text-[9.5px] font-medium">Restore mode</p>
                        <div className="grid gap-1.5 sm:grid-cols-2">
                          <button className={cn("rounded-lg border p-2 text-left", mode === "merge" ? "border-primary/50 bg-primary/5" : "border-border")} onClick={() => setMode("merge")}>
                            <p className="text-[10px] font-medium">Merge</p><p className="text-[8.5px] text-muted-foreground">Keep current data and add archive records. Collisions are resolved in favour of the archive.</p>
                          </button>
                          <button className={cn("rounded-lg border p-2 text-left", mode === "replace" ? "border-primary/50 bg-primary/5" : "border-border")} onClick={() => setMode("replace")}>
                            <p className="text-[10px] font-medium">Replace</p><p className="text-[8.5px] text-muted-foreground">Wipe the virtual drive, then import the archive tree. Settings and apps are applied too.</p>
                          </button>
                        </div>
                      </div>
                      {!confirmImport ? (
                        <div className="mt-3 flex justify-end gap-2">
                          <GhostButton onClick={() => setPreview(null)}>Cancel</GhostButton>
                          <PrimaryButton onClick={() => setConfirmImport(true)}><RotateCcw className="size-3.5" /> Review restore</PrimaryButton>
                        </div>
                      ) : (
                        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2">
                          <p className="flex items-center gap-1 text-[9.5px] font-medium text-amber-700 dark:text-amber-300"><AlertTriangle className="size-3" /> This will modify your WindOS drive.</p>
                          <p className="mt-0.5 text-[8.5px] text-muted-foreground">{mode === "replace" ? "Current files are removed before the archive is imported." : "Current files are kept; matching paths may be overwritten."} A restore point will be attempted first by the system.</p>
                          <div className="mt-2 flex justify-end gap-2">
                            <GhostButton onClick={() => setConfirmImport(false)}>Back</GhostButton>
                            <PrimaryButton onClick={applyImport}><Check className="size-3.5" /> Restore now</PrimaryButton>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </Panel>
                <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 text-[9px] leading-relaxed text-muted-foreground">The archive’s embedded checksum is verified during restore. If verification fails, WindOS leaves your data untouched.</div>
              </>
            )}
          </div>
        )}

        {tab === "restore" && (
          <div className="mx-auto max-w-2xl space-y-3">
            <Panel>
              <SectionTitle>Create a restore point</SectionTitle>
              <div className="flex gap-1.5">
                <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="e.g. Before installing new apps" className="h-8 flex-1 rounded-md border border-border bg-background px-2 text-[10.5px] outline-none" />
                <PrimaryButton disabled={!label.trim()} onClick={() => { os.createRestorePoint(label.trim(), "manual"); setLabel(""); flash("Restore point created."); }}>Create</PrimaryButton>
              </div>
              <p className="mt-1 text-[8.5px] text-muted-foreground">Snapshots include files, settings, installed apps and permissions with a checksum. Up to 12 are kept locally.</p>
            </Panel>
            <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
              {os.restorePoints.length === 0 && <p className="p-5 text-center text-[10px] text-muted-foreground">No restore points. Create one before big changes.</p>}
              {os.restorePoints.map((point) => (
                <div key={point.id} className="border-b border-border/50 p-2.5 last:border-0">
                  <div className="flex items-start gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-muted"><Database className="size-3.5" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5"><p className="truncate text-[10.5px] font-medium">{point.label}</p><Pill>{point.kind}</Pill></div>
                      <p className="text-[8.5px] text-muted-foreground">{new Date(point.at).toLocaleString()} · {point.fileCount} files · {point.appCount} apps · checksum {point.checksum.slice(0, 10)}</p>
                    </div>
                    <button className="rounded p-1 text-red-500 hover:bg-red-500/10" onClick={() => { os.deleteRestorePoint(point.id); flash("Restore point deleted."); }} aria-label="Delete restore point"><Trash2 className="size-3" /></button>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5 pl-9">
                    <button className="rounded border border-border px-1.5 py-0.5 text-[8.5px] hover:bg-muted" onClick={() => { const ok = os.applyRestorePoint(point.id, "settings"); flash(ok ? "Settings restored." : "Restore failed."); }}>Settings</button>
                    <button className="rounded border border-border px-1.5 py-0.5 text-[8.5px] hover:bg-muted" onClick={() => { const ok = os.applyRestorePoint(point.id, "files"); flash(ok ? "Files restored." : "Restore failed."); }}>Files</button>
                    <button className="rounded bg-primary/10 px-1.5 py-0.5 text-[8.5px] font-medium text-primary" onClick={() => { const ok = os.applyRestorePoint(point.id, "full"); flash(ok ? "Full restore complete." : "Restore failed."); }}>Full restore</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 p-2.5 text-[8.5px] text-muted-foreground">
              <Clock3 className="size-3.5 shrink-0" /> Restore points are stored in this browser. They protect against mistakes inside WindOS, not against clearing browser site data.
            </div>
          </div>
        )}
      </div>

      <input ref={inputRef} type="file" accept=".json,application/json" className="hidden" onChange={(event) => { readFile(event.target.files?.[0]); event.target.value = ""; }} />
    </AppShell>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return <div className="rounded bg-muted/40 px-1.5 py-1"><p className="text-[7.5px] uppercase tracking-wider text-muted-foreground">{label}</p><p className="truncate text-[9px] font-medium">{value}</p></div>;
}
