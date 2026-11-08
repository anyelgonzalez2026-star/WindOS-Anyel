import { useEffect, useMemo, useRef, useState } from "react";
import { useOS } from "@/lib/os/store";
import { markdownToHtml } from "@/lib/os/markdown";
import { usePersisted } from "@/lib/os/hooks";
import { downloadText } from "@/lib/os/zip";
import { AppShell, EmptyState, PrimaryButton, GhostButton, SearchInput, Pill } from "./ui";
import { cn } from "@/lib/utils";
import { Check, Code2, Download, Eye, FilePlus2, FileText, Pencil, Pin, PinOff, Plus, Save, Search, Star, Trash2 } from "lucide-react";

export default function Notes({ payload }: { payload?: Record<string, unknown> }) {
  const os = useOS();
  const docs = os.fs.children("folder_documents").filter((node) => node.type === "file" && /\.(md|txt)$/i.test(node.name));
  const [selectedId, setSelectedId] = useState<string | null>(
    typeof payload?.openId === "string" ? payload.openId : docs[0]?.id ?? null,
  );
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [preview, setPreview] = useState(false);
  const [pins, setPins] = usePersisted<string[]>("notes.pins", []);
  const [saved, setSaved] = useState(true);
  const [titleDraft, setTitleDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const selected = selectedId ? os.fs.byId(selectedId) : undefined;

  const notes = useMemo(() => {
    return docs
      .filter((node) => node.name.toLowerCase().includes(query.toLowerCase()) || (node.content ?? "").toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => {
        const pinnedA = pins.includes(a.id) ? 1 : 0;
        const pinnedB = pins.includes(b.id) ? 1 : 0;
        if (pinnedA !== pinnedB) return pinnedB - pinnedA;
        return b.modifiedAt - a.modifiedAt;
      });
  }, [docs, query, pins, os.fsVersion]);

  useEffect(() => {
    if (!selected) {
      setDraft("");
      return;
    }
    setDraft(selected.content ?? "");
    setTitleDraft(selected.name.replace(/\.(md|txt)$/i, ""));
    setSaved(true);
  }, [selectedId]);

  useEffect(() => {
    if (!selected) return;
    if (draft === (selected.content ?? "")) {
      setSaved(true);
      return;
    }
    setSaved(false);
    const timer = window.setTimeout(() => {
      os.fs.write(selected.id, draft);
      // "Filename from title": untouched notes adopt their first heading.
      if (selected.name.startsWith("Untitled note")) {
        const heading = draft.match(/^#\s+(.+)$/m)?.[1]?.trim();
        if (heading) {
          const safe = heading.replace(/[\\/:*?"<>|]/g, "").slice(0, 60);
          if (safe) os.fs.rename(selected.id, `${safe}.md`);
        }
      }
      setSaved(true);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [draft, selectedId]);

  function createNote() {
    const node = os.fs.createFile("folder_documents", `Untitled note ${docs.length + 1}.md`, "# New note\n\n", "text/markdown");
    if (!node) {
      os.notify({ appId: "WindOS", title: "Read-only session", body: "Guest sessions cannot create notes." });
      return;
    }
    setSelectedId(node.id);
    setPreview(false);
    setSaved(true);
  }

  function deleteNote() {
    if (!selected) return;
    os.fs.trash(selected.id);
    const remaining = notes.filter((note) => note.id !== selected.id);
    setSelectedId(remaining[0]?.id ?? null);
    os.notify({ appId: "WindOS", title: "Note moved to Recycle Bin", body: `${selected.name} can be restored from WindFiles.` });
  }

  function togglePin(id: string) {
    setPins((prev) => (prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]));
  }

  function renameFromTitle() {
    if (!selected) return;
    const next = titleDraft.trim();
    if (!next) {
      setTitleDraft(selected.name.replace(/\.(md|txt)$/i, ""));
      return;
    }
    const withExt = /\.(md|txt)$/i.test(next) ? next : `${next}.md`;
    if (withExt !== selected.name) os.fs.rename(selected.id, withExt);
  }

  function insertDate() {
    const stamp = new Date().toISOString().slice(0, 10);
    const el = textareaRef.current;
    if (!el) {
      setDraft((prev) => `${prev}\n${stamp}`);
      return;
    }
    const start = el.selectionStart;
    setDraft((prev) => `${prev.slice(0, start)}${stamp}${prev.slice(el.selectionEnd)}`);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + stamp.length, start + stamp.length);
    });
  }

  const words = draft.trim() ? draft.trim().split(/\s+/).length : 0;

  return (
    <AppShell>
      <div className="flex h-full">
        <aside className="flex w-[236px] shrink-0 flex-col border-r border-border/60 bg-muted/15">
          <div className="border-b border-border/60 p-2.5">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="text-[11.5px] font-semibold">WindNotes</p>
                <p className="text-[9px] text-muted-foreground">{docs.length} notes · Documents</p>
              </div>
              <button className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground transition hover:bg-primary/90" onClick={createNote} title="New note" aria-label="New note">
                <Plus className="size-3.5" />
              </button>
            </div>
            <SearchInput value={query} onChange={setQuery} placeholder="Search notes" />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
            {notes.length === 0 ? (
              <p className="px-2 py-6 text-center text-[10px] text-muted-foreground">
                {query ? "No notes matched." : "No notes yet. Create one to get started."}
              </p>
            ) : notes.map((note) => {
              const pinned = pins.includes(note.id);
              const title = note.name.replace(/\.(md|txt)$/i, "");
              return (
                <button
                  key={note.id}
                  onClick={() => setSelectedId(note.id)}
                  className={cn(
                    "group mb-0.5 flex w-full flex-col gap-0.5 rounded-md px-2 py-1.5 text-left transition",
                    selectedId === note.id ? "bg-primary/10" : "hover:bg-muted/70",
                  )}
                >
                  <span className="flex w-full items-center gap-1.5">
                    {pinned && <Pin className="size-2.5 shrink-0 text-amber-500" fill="currentColor" />}
                    <span className="truncate text-[11px] font-medium">{title}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      className="ml-auto shrink-0 opacity-0 transition group-hover:opacity-100"
                      onClick={(event) => { event.stopPropagation(); togglePin(note.id); }}
                      onKeyDown={(event) => { if (event.key === "Enter") togglePin(note.id); }}
                      aria-label={pinned ? "Unpin note" : "Pin note"}
                    >
                      {pinned ? <PinOff className="size-3 text-muted-foreground" /> : <Pin className="size-3 text-muted-foreground" />}
                    </span>
                  </span>
                  <span className="line-clamp-2 text-[9.5px] leading-snug text-muted-foreground">
                    {(note.content ?? "").replace(/[#*_`>]/g, "").trim().slice(0, 90) || "Empty note"}
                  </span>
                  <span className="text-[8.5px] text-muted-foreground/70">
                    {new Date(note.modifiedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="border-t border-border/60 px-2.5 py-1.5 text-[9px] text-muted-foreground">
            Notes are Markdown files in Documents.
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {selected ? (
            <>
              <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-border/60 px-3 py-2">
                <input
                  value={titleDraft}
                  onChange={(event) => setTitleDraft(event.target.value)}
                  onBlur={renameFromTitle}
                  onKeyDown={(event) => event.key === "Enter" && (event.target as HTMLInputElement).blur()}
                  className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-[13px] font-semibold outline-none hover:border-border focus:border-primary/50"
                  aria-label="Note title"
                />
                <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                  {saved ? <><Check className="size-3 text-emerald-500" /> Saved</> : <><Save className="size-3 animate-pulse" /> Saving…</>}
                </span>
                <button className={cn("flex h-7 items-center gap-1 rounded-md px-2 text-[10px] transition", preview ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-muted")} onClick={() => setPreview((v) => !v)}>
                  {preview ? <Pencil className="size-3" /> : <Eye className="size-3" />}
                  {preview ? "Edit" : "Preview"}
                </button>
                <button className="flex h-7 items-center gap-1 rounded-md px-2 text-[10px] text-muted-foreground transition hover:bg-muted" onClick={insertDate} title="Insert date">
                  <FilePlus2 className="size-3" /> Date
                </button>
                <button className="flex h-7 items-center gap-1 rounded-md px-2 text-[10px] text-muted-foreground transition hover:bg-muted" onClick={() => os.openApp("code", { openId: selected.id })}>
                  <Code2 className="size-3" /> Code
                </button>
                <button className="flex h-7 items-center gap-1 rounded-md px-2 text-[10px] text-muted-foreground transition hover:bg-muted" onClick={() => downloadText(draft, selected.name, "text/markdown")}>
                  <Download className="size-3" /> Export
                </button>
                <button className="flex h-7 items-center gap-1 rounded-md px-2 text-[10px] text-red-600 transition hover:bg-red-500/10 dark:text-red-400" onClick={deleteNote}>
                  <Trash2 className="size-3" /> Delete
                </button>
              </div>

              {preview ? (
                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                  <div className="md-preview mx-auto max-w-2xl" dangerouslySetInnerHTML={{ __html: markdownToHtml(draft) }} />
                </div>
              ) : (
                <textarea
                  ref={textareaRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="# Start writing…"
                  className="min-h-0 flex-1 resize-none bg-transparent px-6 py-5 font-mono text-[12px] leading-relaxed outline-none placeholder:text-muted-foreground/40"
                  spellCheck={false}
                  aria-label="Note content"
                />
              )}

              <div className="flex shrink-0 items-center justify-between border-t border-border/60 px-3 py-1.5 text-[9.5px] text-muted-foreground">
                <span>{words} words · {draft.length} characters · markdown</span>
                <span className="flex items-center gap-2">
                  {pins.includes(selected.id) && <Pill tone="warning">pinned</Pill>}
                  <span>{os.fs.pathOf(selected.id)}</span>
                </span>
              </div>
            </>
          ) : (
            <EmptyState
              icon={FileText}
              title="No note selected"
              body="Notes are real Markdown files stored in Documents. Create one and it will persist across sessions."
              action={<PrimaryButton onClick={createNote}>Create your first note</PrimaryButton>}
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
