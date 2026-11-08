import { useEffect, useMemo, useRef, useState } from "react";
import { useOS } from "@/lib/os/store";
import { formatBytes } from "@/lib/os/fs";
import { buildPdf, pdfDataUrl } from "@/lib/os/pdf";
import { cn } from "@/lib/utils";
import { AppShell, AppHeader, AppToolbar, EmptyState, GhostButton, PrimaryButton, Panel, SectionTitle, Pill, Field, inputClass, textareaClass, selectClass } from "./ui";
import { Download, FilePlus2, FileText, FolderOpen, Info, Pencil, Plus, Printer, RefreshCw, Save, ShieldAlert, Sparkles, Trash2, Upload, X } from "lucide-react";

export default function Pdf({ payload }: { payload?: Record<string, unknown> }) {
  const os = useOS();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(typeof payload?.openId === "string" ? payload.openId : null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [title, setTitle] = useState("Untitled document");
  const [author, setAuthor] = useState(os.settings.displayName || "WindOS user");
  const [body, setBody] = useState("");
  const [sourceId, setSourceId] = useState("");
  const pdfs = os.fs.recent(150).filter((node) => node.type === "file" && /\.pdf$/i.test(node.name));
  const texts = os.fs.recent(150).filter((node) => node.type === "file" && /\.(txt|md|log|csv|json)$/i.test(node.name));
  const selected = selectedId ? os.fs.byId(selectedId) : pdfs[0];

  useEffect(() => {
    if (typeof payload?.openId === "string") setSelectedId(payload.openId);
  }, [payload?.openId]);

  useEffect(() => () => setToast(""), []);

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }

  function importPdf(file: File | undefined) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) { setError("Choose a .pdf file."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("For local storage safety, PDFs larger than 5 MB are not imported."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const node = os.fs.createFile("folder_documents", file.name, String(reader.result), "application/pdf");
      if (node) {
        setSelectedId(node.id);
        setError("");
        setGenerating(false);
        os.notify({ appId: "WindPDF", title: "PDF imported", body: `${file.name} is in Documents.` });
      } else setError("Guest mode is read-only.");
    };
    reader.readAsDataURL(file);
  }

  function loadSource(id: string) {
    setSourceId(id);
    const node = os.fs.byId(id);
    if (!node?.content) return;
    setBody(node.content.slice(0, 200000));
    setTitle(node.name.replace(/\.[^.]+$/, "") + ".pdf");
    setGenerating(true);
  }

  async function generate() {
    if (!body.trim()) { setError("Write or load some text before generating a PDF."); return; }
    if (body.length > 200000) { setError("Keep generated documents under 200,000 characters so the browser stays responsive."); return; }
    setError("");
    try {
      const blob = buildPdf({ title: title.trim() || "Untitled document", text: body, author: author.trim() || "WindOS user" });
      const dataUrl = await pdfDataUrl(blob);
      const name = (title.trim() || "Untitled document").replace(/[\\/:*?"<>|]/g, "-").replace(/\.pdf$/i, "") + ".pdf";
      const node = os.fs.createFile("folder_documents", name, dataUrl, "application/pdf");
      if (!node) { setError("Guest mode is read-only; the PDF could not be saved to Documents."); return; }
      setSelectedId(node.id);
      setSourceId("");
      flash(`${name} saved to Documents (${formatBytes(blob.size)}).`);
      os.notify({ appId: "WindPDF", title: "PDF generated", body: `${name} · ${formatBytes(blob.size)} · ${body.split(/\n/).length} source lines.` });
      os.logEvent({ level: "info", title: "PDF generated", detail: `${name} was generated locally with WindPDF.` });
    } catch (err) {
      setError(err instanceof Error ? err.message : "The PDF could not be generated.");
    }
  }

  function download() {
    if (!selected?.content) return;
    const link = document.createElement("a");
    link.href = selected.content;
    link.download = selected.name;
    link.click();
    os.logEvent({ level: "info", title: "PDF exported", detail: `${selected.name} was downloaded.` });
  }

  function print() {
    if (!selected?.content) return;
    const frame = document.createElement("iframe");
    frame.style.position = "fixed";
    frame.style.width = "1px";
    frame.style.height = "1px";
    frame.style.opacity = "0";
    frame.src = selected.content;
    document.body.appendChild(frame);
    const cleanup = () => window.setTimeout(() => frame.remove(), 30000);
    frame.onload = () => {
      try {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
        flash("Print dialogue requested. Your browser may block PDF printing inside this preview.");
      } catch {
        setError("The browser blocked printing. Open the PDF in a new tab or download it and print from your PDF viewer.");
      }
      cleanup();
    };
  }

  const metadata = useMemo(() => {
    if (!selected) return null;
    return {
      size: selected.size,
      created: selected.createdAt,
      modified: selected.modifiedAt,
      mime: selected.mime ?? "application/pdf",
      path: os.fs.pathOf(selected.id),
      generated: selected.content?.startsWith("data:application/pdf"),
    };
  }, [selected, os.fs]);

  return (
    <AppShell>
      <AppHeader icon={FileText} title="WindPDF" subtitle="Read, generate and print PDFs in the browser · local only" actions={<><GhostButton onClick={() => inputRef.current?.click()}><Upload className="size-3.5" /> Import</GhostButton><PrimaryButton onClick={() => setGenerating(true)}><FilePlus2 className="size-3.5" /> Create PDF</PrimaryButton></>} />
      <AppToolbar>
        <button onClick={() => setGenerating(false)} className={cn("rounded px-2 py-1 text-[9.5px]", !generating ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted")}>Library · {pdfs.length}</button>
        <button onClick={() => setGenerating(true)} className={cn("rounded px-2 py-1 text-[9.5px]", generating ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted")}>Create from text</button>
        <span className="ml-auto flex items-center gap-1 text-[8.5px] text-muted-foreground"><ShieldAlert className="size-2.5" /> PDFs are rendered by your browser</span>
      </AppToolbar>
      <div className="flex min-h-0 flex-1">
        <aside className="w-44 shrink-0 overflow-y-auto border-r border-border/60 bg-muted/15 p-2">
          <p className="mb-1.5 text-[8.5px] font-semibold uppercase tracking-wider text-muted-foreground">Documents</p>
          {pdfs.map((node) => (
            <button key={node.id} className={cn("mb-0.5 flex w-full items-center gap-1.5 rounded px-1.5 py-1.5 text-left", (selected?.id ?? "") === node.id && !generating ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")} onClick={() => { setSelectedId(node.id); setGenerating(false); }}>
              <FileText className="size-3.5 shrink-0" /><span className="min-w-0 flex-1 truncate text-[9.5px]">{node.name}</span>
            </button>
          ))}
          {pdfs.length === 0 && <p className="px-2 py-3 text-[9px] text-muted-foreground">No PDFs yet. Import one or generate a document.</p>}
          <div className="mt-2 border-t border-border/50 pt-2 text-[8px] leading-relaxed text-muted-foreground">Imports are limited to 5 MB so the virtual drive stays healthy.</div>
        </aside>

        {generating ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <div className="mx-auto max-w-2xl space-y-2.5">
              <Panel>
                <SectionTitle action={<Pill tone="accent">A4 · Helvetica</Pill>}>Generate a PDF from text</SectionTitle>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  <Field label="Document title"><input value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} maxLength={120} /></Field>
                  <Field label="Author"><input value={author} onChange={(event) => setAuthor(event.target.value)} className={inputClass} maxLength={80} /></Field>
                </div>
                <Field label="Load text from the drive">
                  <div className="flex gap-1"><select value={sourceId} onChange={(event) => loadSource(event.target.value)} className={selectClass}><option value="">Choose a text file…</option>{texts.map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}</select><GhostButton onClick={() => sourceId && loadSource(sourceId)} disabled={!sourceId}><RefreshCw className="size-3" /> Reload</GhostButton></div>
                </Field>
                <div className="mt-1.5"><Field label="Content"><textarea value={body} onChange={(event) => setBody(event.target.value)} rows={12} placeholder="Write the document. Line breaks are preserved; long lines wrap automatically and new pages start at the bottom of each A4 page." className={cn(textareaClass, "min-h-40 text-[10.5px]")} /></Field></div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <PrimaryButton onClick={() => void generate()}><Sparkles className="size-3.5" /> Generate & save</PrimaryButton>
                  <GhostButton onClick={() => { setBody(""); setTitle("Untitled document"); setSourceId(""); setError(""); }}>Clear</GhostButton>
                  <span className="ml-auto text-[8.5px] text-muted-foreground">{body.length.toLocaleString()} characters · {body.split(/\n/).length} lines</span>
                </div>
                {error && <p className="mt-2 rounded border border-red-500/30 bg-red-500/8 p-2 text-[9px] text-red-600 dark:text-red-300">{error}</p>}
              </Panel>
              <div className="rounded-xl border border-border/60 bg-muted/15 p-2.5 text-[8.5px] leading-relaxed text-muted-foreground">
                <p><strong className="text-foreground">How generation works:</strong> WindPDF writes a valid PDF 1.4 file locally with embedded Helvetica text, A4 pages and metadata. Latin text is preserved; unsupported glyphs are replaced with “?”. Multi-page pagination is automatic.</p>
                <p className="mt-1"><strong className="text-foreground">Not supported:</strong> images, rich layout, embedded fonts, forms, encryption, PDF editing and text extraction from imported PDFs. Printing depends on the browser’s PDF viewer.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 flex-col">
            {selected ? (
              <>
                <div className="flex flex-wrap items-center gap-1.5 border-b border-border/60 px-2 py-1.5">
                  <FileText className="size-3.5 text-primary" />
                  <span className="min-w-0 flex-1 truncate text-[10px] font-medium">{selected.name}</span>
                  <span className="text-[8px] text-muted-foreground">{formatBytes(selected.size)} · PDF</span>
                  <GhostButton className="h-6 text-[8.5px]" onClick={download}><Download className="size-2.5" /> Export</GhostButton>
                  <GhostButton className="h-6 text-[8.5px]" onClick={print}><Printer className="size-2.5" /> Print</GhostButton>
                  <GhostButton className="h-6 text-[8.5px]" onClick={() => os.openApp("files", { openId: selected.id })}><Info className="size-2.5" /> Properties</GhostButton>
                  <button className="rounded px-1.5 py-0.5 text-[8.5px] text-red-500 hover:bg-red-500/10" onClick={() => { os.fs.trash(selected.id); setSelectedId(pdfs.find((node) => node.id !== selected.id)?.id ?? null); }}><Trash2 className="size-2.5" /></button>
                </div>
                <div className="min-h-0 flex-1 bg-slate-200 dark:bg-slate-800">
                  {selected.content ? <iframe src={selected.content} title={selected.name} className="h-full w-full border-0" /> : <p className="p-6 text-center text-[10px] text-muted-foreground">This PDF has no readable payload.</p>}
                </div>
                <div className="grid shrink-0 gap-x-4 border-t border-border/60 px-3 py-2 text-[8.5px] text-muted-foreground sm:grid-cols-2">
                  <p>Path: {metadata?.path}</p>
                  <p>MIME: {metadata?.mime}</p>
                  <p>Created: {metadata ? new Date(metadata.created).toLocaleString() : "—"}</p>
                  <p>Modified: {metadata ? new Date(metadata.modified).toLocaleString() : "—"}</p>
                  <p className="sm:col-span-2">Rendering depends on your browser’s built-in PDF viewer. WindPDF does not edit, extract or OCR PDF text.</p>
                </div>
              </>
            ) : (
              <EmptyState icon={FileText} title="No PDF selected" body="Import a PDF from your device, or generate one from text. Everything stays in the WindOS virtual drive." action={<div className="flex gap-1.5"><PrimaryButton onClick={() => inputRef.current?.click()}><Upload className="size-3.5" /> Import</PrimaryButton><PrimaryButton onClick={() => setGenerating(true)}><FilePlus2 className="size-3.5" /> Create</PrimaryButton></div>} />
            )}
            {error && <p className="p-2 text-center text-[9px] text-red-500">{error}</p>}
          </div>
        )}
      </div>
      {toast && <div className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full bg-foreground px-3 py-1 text-[9px] text-background shadow-lg">{toast}</div>}
      <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(event) => { importPdf(event.target.files?.[0]); event.target.value = ""; }} />
    </AppShell>
  );
}
