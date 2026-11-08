import { useMemo, useRef, useState } from "react";
import { useOS } from "@/lib/os/store";
import { formatBytes } from "@/lib/os/fs";
import { bytesToDataUrl, createZip, dataUrlToBytes, downloadBlob, readZip, textToBytes, type ReadZipResult } from "@/lib/os/zip";
import { cn } from "@/lib/utils";
import { AppShell, AppHeader, AppToolbar, EmptyState, GhostButton, PrimaryButton, Panel, SectionTitle, Pill, inputClass } from "./ui";
import { Archive, ArrowLeft, Check, Download, FileArchive, FileText, FolderOpen, Lock, Plus, ShieldAlert, Trash2, Upload, X } from "lucide-react";

/* --------------------------------------------------------------------- Zip */

export function Zip() {
  const os = useOS();
  const inputRef = useRef<HTMLInputElement>(null);
  const [folderId, setFolderId] = useState("folder_documents");
  const [selected, setSelected] = useState<string[]>([]);
  const [archive, setArchive] = useState<ReadZipResult | null>(null);
  const [archiveName, setArchiveName] = useState("");
  const [entries, setEntries] = useState<{ name: string; size: number; preview?: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const folders = os.fs.children(null).filter((node) => node.type === "folder");
  const files = os.fs.children(folderId).filter((node) => node.type === "file");
  const archives = os.fs.recent(120).filter((node) => node.type === "file" && /\.zip$/i.test(node.name));

  function flash(message: string) { setToast(message); window.setTimeout(() => setToast(""), 2600); }

  async function createFromSelection() {
    const chosen = files.filter((file) => selected.includes(file.id));
    if (!chosen.length) { setError("Select at least one file."); return; }
    setBusy(true);
    setError("");
    try {
      const zipEntries: { name: string; data: Uint8Array }[] = [];
      for (const file of chosen) {
        if (!file.content) continue;
        const data = file.content.startsWith("data:") ? await dataUrlToBytes(file.content) : textToBytes(file.content);
        zipEntries.push({ name: file.name, data });
      }
      const blob = createZip(zipEntries);
      const name = `Archive ${new Date().toISOString().slice(0, 10)}.zip`;
      downloadBlob(blob, name);
      const dataUrl = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(blob); });
      os.fs.createFile("folder_downloads", name, dataUrl, "application/zip");
      os.notify({ appId: "WindOS", title: "ZIP created", body: `${chosen.length} files archived as ${name}.` });
      flash("ZIP downloaded and saved to Downloads.");
      setSelected([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create archive.");
    } finally {
      setBusy(false);
    }
  }

  async function createFolderArchive() {
    const root = os.fs.byId(folderId);
    if (!root) return;
    setBusy(true);
    setError("");
    try {
      const zipEntries: { name: string; data: Uint8Array }[] = [];
      const walk = async (parentId: string, prefix: string, depth: number) => {
        if (depth > 12) return;
        for (const child of os.fs.children(parentId)) {
          if (child.trashed) continue;
          const path = `${prefix}${child.name}`;
          if (child.type === "folder") await walk(child.id, `${path}/`, depth + 1);
          else if (child.content) {
            const data = child.content.startsWith("data:") ? await dataUrlToBytes(child.content) : textToBytes(child.content);
            zipEntries.push({ name: path, data });
          }
        }
      };
      await walk(folderId, "", 0);
      if (!zipEntries.length) { setError("This folder has no files to archive."); return; }
      const blob = createZip(zipEntries);
      const name = `${root.name} ${new Date().toISOString().slice(0, 10)}.zip`;
      downloadBlob(blob, name);
      const dataUrl = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(blob); });
      os.fs.createFile("folder_downloads", name, dataUrl, "application/zip");
      os.notify({ appId: "WindZip", title: "Folder archived", body: `${zipEntries.length} files from ${root.name}, including nested folders, were archived.` });
      flash(`Archived ${zipEntries.length} files recursively.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not archive this folder.");
    } finally {
      setBusy(false);
    }
  }

  async function openArchive(result: ReadZipResult, name: string) {
    setArchive(result);
    setArchiveName(name);
    setEntries(result.entries.map((entry) => ({ name: entry.name, size: entry.size })));
    setError("");
  }

  async function openFromFile(file: File | undefined) {
    if (!file) return;
    try {
      setBusy(true);
      const result = await readZip(file);
      await openArchive(result, file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That file is not a readable ZIP archive.");
    } finally {
      setBusy(false);
    }
  }

  async function openExisting(nodeId: string) {
    const node = os.fs.byId(nodeId);
    if (!node?.content) return;
    try {
      setBusy(true);
      const blob = await (await fetch(node.content)).blob();
      const result = await readZip(blob);
      await openArchive(result, node.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Archive could not be opened.");
    } finally {
      setBusy(false);
    }
  }

  async function extractAll() {
    if (!archive) return;
    const folderName = archiveName.replace(/\.zip$/i, "") || "Extracted archive";
    const target = os.fs.createFolder(folderId, folderName);
    if (!target) { setError("Cannot create a folder in this location."); return; }
    let count = 0;
    for (const entry of archive.entries) {
      if (entry.name.endsWith("/")) continue;
      try {
        const text = await archive.extract(entry.name);
        os.fs.createFile(target.id, entry.name.split("/").pop() ?? entry.name, text, "text/plain");
        count++;
      } catch {
        /* binary or unsupported compression */
      }
    }
    os.notify({ appId: "WindOS", title: "Archive extracted", body: `${count} text entries extracted to ${folderName}. Binary entries are reported below.` });
    flash(`${count} files extracted.`);
  }

  return (
    <AppShell>
      <AppHeader icon={Archive} title="WindZip" subtitle="Create ZIP archives, inspect entries and extract text · stored in the virtual drive" actions={<><GhostButton onClick={() => inputRef.current?.click()}><Upload className="size-3.5" /> Open archive</GhostButton><GhostButton disabled={busy} onClick={() => void createFolderArchive()}><FolderOpen className="size-3.5" /> Archive folder</GhostButton><PrimaryButton disabled={!selected.length || busy} onClick={createFromSelection}><Archive className="size-3.5" /> Create ZIP</PrimaryButton></>} />
      <AppToolbar>
        <FolderOpen className="size-3.5 text-amber-500" />
        <select value={folderId} onChange={(event) => { setFolderId(event.target.value); setSelected([]); }} className="h-7 rounded border border-border bg-background px-1 text-[10px]">
          {folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
        </select>
        <span className="text-[9px] text-muted-foreground">{files.length} files · {selected.length} selected</span>
        {busy && <span className="ml-auto text-[9px] text-primary">working…</span>}
      </AppToolbar>
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {!archive ? (
              <>
                {files.length === 0 && <EmptyState icon={FileArchive} title="No files here" body="Choose another folder. ZIP creation archives the selected files from the virtual drive." />}
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {files.map((file) => (
                    <label key={file.id} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border p-2", selected.includes(file.id) ? "border-primary/40 bg-primary/5" : "border-border/60 hover:bg-muted/40")}>
                      <input type="checkbox" checked={selected.includes(file.id)} onChange={() => setSelected((prev) => prev.includes(file.id) ? prev.filter((id) => id !== file.id) : [...prev, file.id])} className="accent-[var(--os-accent)]" />
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-medium">{file.name}</span><span className="text-[8px] text-muted-foreground">{formatBytes(file.size)}</span></span>
                    </label>
                  ))}
                </div>
                <div className="mt-3">
                  <SectionTitle>Archives on the drive</SectionTitle>
                  <div className="space-y-1">
                    {archives.map((node) => (
                      <button key={node.id} className="flex w-full items-center gap-2 rounded border border-border/60 px-2 py-1.5 text-left hover:bg-muted" onClick={() => void openExisting(node.id)}>
                        <Archive className="size-3.5 text-primary" /><span className="flex-1 truncate text-[9.5px]">{node.name}</span><span className="text-[8px] text-muted-foreground">{formatBytes(node.size)}</span>
                      </button>
                    ))}
                    {archives.length === 0 && <p className="rounded border border-dashed border-border p-2 text-center text-[9px] text-muted-foreground">No ZIP archives yet.</p>}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="mb-2 flex items-center gap-2">
                  <button className="flex items-center gap-1 rounded border border-border px-1.5 py-1 text-[9px] hover:bg-muted" onClick={() => { setArchive(null); setEntries([]); }}><ArrowLeft className="size-3" /> Back</button>
                  <div className="min-w-0 flex-1"><p className="truncate text-[10.5px] font-medium">{archiveName}</p><p className="text-[8px] text-muted-foreground">{archive.entries.length} entries</p></div>
                  <PrimaryButton onClick={() => void extractAll()}><Download className="size-3.5" /> Extract all</PrimaryButton>
                </div>
                <div className="overflow-hidden rounded-lg border border-border/60">
                  {archive.entries.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2 border-b border-border/40 px-2 py-1.5 last:border-0 text-[9.5px]">
                      <FileArchive className="size-3.5 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{entry.name}</span>
                      <span className="text-[8px] text-muted-foreground">{entry.method === 0 ? "stored" : "deflate"} · {formatBytes(entry.size)}</span>
                      <button className="text-[8.5px] text-primary hover:underline" onClick={async () => { try { const text = await archive.extract(entry.name); setEntries((prev) => prev.map((item) => item.name === entry.name ? { ...item, preview: text.slice(0, 400) } : item)); } catch (err) { setError(err instanceof Error ? err.message : "Cannot extract this entry."); } }}>Preview</button>
                    </div>
                  ))}
                </div>
                {entries.filter((entry) => entry.preview).map((entry) => (
                  <pre key={entry.name} className="mt-1.5 max-h-28 overflow-auto rounded border border-border bg-muted/20 p-2 text-[8.5px]">{entry.preview}</pre>
                ))}
              </>
            )}
            {error && <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-[9px] text-red-600 dark:text-red-300"><ShieldAlert className="mt-0.5 size-3 shrink-0" /> {error}</div>}
          </div>
          <div className="flex shrink-0 items-center justify-between border-t border-border/60 px-2 py-1.5 text-[8px] text-muted-foreground">
            <span>ZIP reader supports stored and deflate entries (via DecompressionStream).</span>
            <span className="flex items-center gap-1"><Lock className="size-2.5" /> local only</span>
          </div>
        </div>
        <aside className="hidden w-52 shrink-0 overflow-y-auto border-l border-border/60 bg-muted/15 p-2.5 lg:block">
          <SectionTitle>Archive notes</SectionTitle>
          <p className="text-[8.5px] leading-relaxed text-muted-foreground">WindZip writes uncompressed ZIP archives from virtual files and reads stored or deflate-compressed archives.</p>
          <p className="mt-2 text-[8.5px] leading-relaxed text-muted-foreground">Extraction converts entries to text. Binary files such as images can be previewed as text only — a browser-side ZIP reader cannot reliably recreate a binary file from this UI. Original binary data remains inside the archive.</p>
          <div className="mt-3 rounded-lg border border-border/60 bg-card p-2 text-[8px] text-muted-foreground"><Check className="mr-1 inline size-2.5 text-emerald-500" /> CRC32 validated<br /><Check className="mr-1 inline size-2.5 text-emerald-500" /> Never uploaded<br /><Check className="mr-1 inline size-2.5 text-emerald-500" /> Saved in virtual drive</div>
        </aside>
      </div>
      {toast && <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-foreground px-3 py-1 text-[9px] text-background shadow-lg">{toast}</div>}
      <input ref={inputRef} type="file" accept=".zip,application/zip" className="hidden" onChange={(event) => { void openFromFile(event.target.files?.[0]); event.target.value = ""; }} />
    </AppShell>
  );
}

/* --------------------------------------------------------------------- PDF */

export function Pdf() {
  const os = useOS();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const pdfs = os.fs.recent(150).filter((node) => node.type === "file" && /\.pdf$/i.test(node.name));
  const selected = selectedId ? os.fs.byId(selectedId) : pdfs[0];

  function importPdf(file: File | undefined) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) { setError("Choose a .pdf file."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("For local storage safety, PDFs larger than 5 MB are not imported."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const node = os.fs.createFile("folder_documents", file.name, String(reader.result), "application/pdf");
      if (node) { setSelectedId(node.id); setError(""); os.notify({ appId: "WindOS", title: "PDF imported", body: `${file.name} is in Documents.` }); }
      else setError("Guest mode is read-only.");
    };
    reader.readAsDataURL(file);
  }

  return (
    <AppShell>
      <AppHeader icon={FileText} title="WindPDF" subtitle="View PDFs stored in the virtual drive · text extraction is not available" actions={<PrimaryButton onClick={() => inputRef.current?.click()}><Plus className="size-3.5" /> Import PDF</PrimaryButton>} />
      <div className="flex min-h-0 flex-1">
        <aside className="w-52 shrink-0 overflow-y-auto border-r border-border/60 bg-muted/15 p-2">
          <p className="mb-1.5 text-[8.5px] font-semibold uppercase tracking-wider text-muted-foreground">Documents</p>
          {pdfs.map((node) => (
            <button key={node.id} className={cn("mb-0.5 flex w-full items-center gap-1.5 rounded px-1.5 py-1.5 text-left", (selected?.id ?? "") === node.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")} onClick={() => setSelectedId(node.id)}>
              <FileText className="size-3.5 shrink-0" /><span className="min-w-0 flex-1 truncate text-[9.5px]">{node.name}</span>
            </button>
          ))}
          {pdfs.length === 0 && <p className="px-2 py-3 text-[9px] text-muted-foreground">No PDFs yet. Import one to view it here.</p>}
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          {selected ? (
            <>
              <div className="flex flex-wrap items-center gap-1.5 border-b border-border/60 px-2 py-1.5">
                <FileText className="size-3.5 text-primary" />
                <span className="min-w-0 flex-1 truncate text-[10px] font-medium">{selected.name}</span>
                <span className="text-[8px] text-muted-foreground">{formatBytes(selected.size)} · PDF</span>
                <button className="rounded border border-border px-1.5 py-0.5 text-[8.5px] hover:bg-muted" onClick={() => { const link = document.createElement("a"); link.href = selected.content ?? ""; link.download = selected.name; link.click(); }}>Export</button>
                <button className="rounded border border-border px-1.5 py-0.5 text-[8.5px] hover:bg-muted" onClick={() => os.openApp("files", { openId: selected.id })}>Properties</button>
                <button className="rounded px-1.5 py-0.5 text-[8.5px] text-red-500 hover:bg-red-500/10" onClick={() => { os.fs.trash(selected.id); setSelectedId(pdfs.find((node) => node.id !== selected.id)?.id ?? null); }}>Delete</button>
              </div>
              <div className="min-h-0 flex-1 bg-slate-200 dark:bg-slate-800">
                {selected.content ? (
                  <iframe src={selected.content} title={selected.name} className="h-full w-full border-0" />
                ) : <p className="p-6 text-center text-[10px] text-muted-foreground">This PDF has no readable payload.</p>}
              </div>
              <p className="shrink-0 border-t border-border/60 px-2 py-1 text-[8px] text-muted-foreground">Rendering depends on your browser’s built-in PDF viewer. WindPDF does not parse, edit or extract PDF text in the browser.</p>
            </>
          ) : (
            <EmptyState icon={FileText} title="No PDF selected" body="Import a PDF from your device. It is stored locally and opened with the browser’s built-in PDF renderer. Text extraction and editing are documented limitations." action={<PrimaryButton onClick={() => inputRef.current?.click()}>Import PDF</PrimaryButton>} />
          )}
          {error && <p className="p-2 text-center text-[9px] text-red-500">{error}</p>}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(event) => { importPdf(event.target.files?.[0]); event.target.value = ""; }} />
    </AppShell>
  );
}
