import { useMemo, useRef, useState } from "react";
import { useOS } from "@/lib/os/store";
import { downloadBlob, downloadText } from "@/lib/os/zip";
import { formatBytes, iconForFile, mimeFromName } from "@/lib/os/fs";
import type { FSNode } from "@/lib/os/types";
import { AppHeader, AppShell, AppToolbar, EmptyState, Field, GhostButton, inputClass, PrimaryButton, SearchInput, ToolButton, Meter } from "./ui";
import { cn } from "@/lib/utils";
import {
  Archive,
  ArrowDownAZ,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronRight,
  Copy,
  Download,
  File,
  FileCode2,
  FileImage,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Grid2x2,
  Heart,
  Info,
  List,
  Music,
  Pencil,
  RefreshCw,
  RotateCcw,
  Scissors,
  Star,
  Trash2,
  Upload,
  Video,
  X,
  MoreHorizontal,
  HardDrive,
  Clock3,
} from "lucide-react";

type Location = "root" | "trash" | "recent" | "favorites" | string;

const FILE_ICONS: Record<string, typeof File> = {
  folder: Folder,
  image: FileImage,
  audio: Music,
  video: Video,
  archive: Archive,
  code: FileCode2,
  text: FileText,
  pdf: FileText,
  executable: FileCode2,
  file: File,
};

const LOCATIONS = [
  { id: "root", name: "This PC", icon: HardDrive },
  { id: "folder_desktop", name: "Desktop", icon: FolderOpen },
  { id: "folder_documents", name: "Documents", icon: FileText },
  { id: "folder_downloads", name: "Downloads", icon: Download },
  { id: "folder_pictures", name: "Pictures", icon: FileImage },
  { id: "folder_music", name: "Music", icon: Music },
  { id: "folder_videos", name: "Videos", icon: Video },
  { id: "folder_projects", name: "Projects", icon: FileCode2 },
  { id: "folder_data", name: "Data (D:)", icon: HardDrive },
];

const TYPE_FILTERS = ["all", "documents", "images", "media", "code", "archives"] as const;

function extOf(node: FSNode) {
  return node.name.split(".").pop()?.toLowerCase() ?? "";
}

function isTextFile(node: FSNode) {
  return Boolean(node.mime?.startsWith("text/")) || ["md", "txt", "json", "csv", "js", "ts", "tsx", "css", "html", "svg", "log", "xml"].includes(extOf(node));
}

export default function Files({ payload }: { payload?: Record<string, unknown> }) {
  const os = useOS();
  const payloadFolder = typeof payload?.folderId === "string" ? payload.folderId : null;
  const payloadOpen = typeof payload?.openId === "string" ? payload.openId : null;
  const initialFolder = payloadFolder ?? (payloadOpen ? os.fs.byId(payloadOpen)?.parentId ?? "folder_documents" : "folder_documents");
  const [location, setLocation] = useState<Location>(initialFolder);
  const [back, setBack] = useState<Location[]>([]);
  const [forward, setForward] = useState<Location[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(payloadOpen);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"name" | "size" | "type" | "modified">("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [filter, setFilter] = useState<(typeof TYPE_FILTERS)[number]>("all");
  const [showPreview, setShowPreview] = useState(true);
  const [clipboard, setClipboard] = useState<{ mode: "copy" | "cut"; id: string } | null>(null);
  const [ctx, setCtx] = useState<{ x: number; y: number; node?: FSNode } | null>(null);
  const [dialog, setDialog] = useState<
    | { kind: "new"; type: "folder" | "file" }
    | { kind: "rename"; node: FSNode }
    | { kind: "props"; node: FSNode }
    | { kind: "confirm"; title: string; body: string; action: () => void }
    | null
  >(null);
  const [draft, setDraft] = useState("");
  const [refresh, setRefresh] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);

  const readOnly = os.fs.readOnly;
  const isVirtual = ["root", "trash", "recent", "favorites"].includes(location);
  const trashView = location === "trash";
  const recentView = location === "recent";
  const favoritesView = location === "favorites";
  const current = isVirtual ? null : os.fs.byId(location);

  const entries = useMemo(() => {
    void refresh;
    let list: FSNode[];
    if (query.trim()) {
      list = os.fs.search(query);
    } else if (trashView) {
      list = Object.values(os.fs.nodes).filter((node) => node.trashed);
    } else if (recentView) {
      list = os.fs.recent(40);
    } else if (favoritesView) {
      list = Object.values(os.fs.nodes).filter((node) => node.favorite && !node.trashed);
    } else if (location === "root") {
      list = os.fs.children("root");
    } else {
      list = os.fs.children(location);
    }
    if (filter !== "all") {
      const matches = (node: FSNode) => {
        const ext = extOf(node);
        if (node.type === "folder") return true;
        if (filter === "documents") return ["md", "txt", "pdf", "csv", "doc", "docx", "json"].includes(ext) || node.mime?.startsWith("text/");
        if (filter === "images") return ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext);
        if (filter === "media") return ["mp3", "wav", "ogg", "mp4", "webm", "m4a"].includes(ext);
        if (filter === "code") return ["js", "ts", "tsx", "jsx", "html", "css", "json", "md"].includes(ext);
        if (filter === "archives") return ["zip", "7z", "rar"].includes(ext);
        return true;
      };
      list = list.filter(matches);
    }
    return list.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      let result = 0;
      if (sort === "name") result = a.name.localeCompare(b.name);
      if (sort === "size") result = a.size - b.size;
      if (sort === "type") result = extOf(a).localeCompare(extOf(b));
      if (sort === "modified") result = a.modifiedAt - b.modifiedAt;
      return sortAsc ? result : -result;
    });
  }, [os.fs, os.fsVersion, location, query, filter, sort, sortAsc, trashView, recentView, favoritesView, refresh]);

  const selected = selectedId ? os.fs.byId(selectedId) : undefined;
  const usage = os.fs.usage();
  const crumbs = useMemo(() => {
    if (isVirtual) return [];
    const chain: FSNode[] = [];
    let node = current;
    let guard = 0;
    while (node && node.id !== "root" && guard < 40) {
      chain.unshift(node);
      node = os.fs.byId(node.parentId);
      guard += 1;
    }
    return chain;
  }, [current, os.fs]);

  function navigate(next: Location) {
    if (next === location) return;
    setBack((prev) => [...prev, location]);
    setForward([]);
    setLocation(next);
    setSelectedId(null);
    setQuery("");
  }

  function goBack() {
    if (!back.length) return;
    const prev = back[back.length - 1];
    setBack((list) => list.slice(0, -1));
    setForward((list) => [location, ...list]);
    setLocation(prev);
    setSelectedId(null);
  }

  function goForward() {
    if (!forward.length) return;
    const next = forward[0];
    setForward((list) => list.slice(1));
    setBack((list) => [...list, location]);
    setLocation(next);
    setSelectedId(null);
  }

  function goUp() {
    if (isVirtual) return;
    const node = os.fs.byId(location);
    if (node) navigate(node.parentId ?? "root");
  }

  function openNode(node: FSNode) {
    if (node.type === "folder") {
      if (node.trashed) return;
      navigate(node.id);
      return;
    }
    const ext = extOf(node);
    if (["md", "txt"].includes(ext)) os.openApp("notes", { openId: node.id });
    else if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) os.openApp("photos", { openId: node.id });
    else if (ext === "pdf") os.openApp("pdf", { openId: node.id });
    else if (["js", "ts", "tsx", "jsx", "html", "css", "json"].includes(ext)) os.openApp("code", { openId: node.id });
    else if (["mp3", "wav", "ogg", "mp4", "webm"].includes(ext)) os.openApp("media", { openId: node.id });
    else if (ext === "zip") os.openApp("zip", { openId: node.id });
    else if (["exe", "msi", "appx"].includes(ext)) os.openApp("compat", { openId: node.id });
    else os.openApp("notes", { openId: node.id });
  }

  async function exportNode(node: FSNode) {
    if (node.type === "folder") return;
    if (["exe", "msi", "appx"].includes(extOf(node))) {
      os.logEvent({ level: "warning", title: "Executable exported", detail: `${node.name} was downloaded from WindOS. Binaries are untrusted.`, });
      os.notify({ appId: "WindOS", title: "Unverified executable", body: `${node.name} is an executable. WindOS does not scan it. Only run files you trust.` });
    }
    if (node.content?.startsWith("data:")) {
      try {
        const response = await fetch(node.content);
        downloadBlob(await response.blob(), node.name);
      } catch {
        os.notify({ appId: "WindOS", title: "Export failed", body: "The file data could not be read." });
      }
    } else {
      downloadText(node.content ?? "", node.name, node.mime ?? "text/plain");
    }
  }

  async function importFiles(files: FileList | null) {
    if (!files || !files.length) return;
    if (isVirtual || trashView) {
      os.notify({ appId: "WindOS", title: "Choose a folder", body: "Open a real folder before importing files." });
      return;
    }
    for (const file of Array.from(files)) {
      const text = file.type.startsWith("text/") || /\.(md|txt|json|csv|js|ts|tsx|css|html|svg|xml|log)$/i.test(file.name);
      const content = text
        ? await file.text()
        : await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result ?? ""));
            reader.readAsDataURL(file);
          });
      os.fs.createFile(location, file.name, content, file.type || mimeFromName(file.name));
    }
    setRefresh((n) => n + 1);
    os.notify({ appId: "WindOS", title: "Files imported", body: `${files.length} file${files.length === 1 ? "" : "s"} added to ${current?.name ?? "the drive"}.` });
  }

  function createNode() {
    if (!draft.trim() || isVirtual) return;
    if (dialog?.kind === "new") {
      const node = dialog.type === "folder"
        ? os.fs.createFolder(location, draft.trim())
        : os.fs.createFile(location, draft.trim(), "", mimeFromName(draft.trim()));
      if (!node) os.notify({ appId: "WindOS", title: "Could not create file", body: "This session is read-only." });
      else setSelectedId(node.id);
    }
    setDialog(null);
    setDraft("");
  }

  function renameNode() {
    if (dialog?.kind === "rename" && draft.trim()) {
      const ok = os.fs.rename(dialog.node.id, draft.trim());
      if (!ok) os.notify({ appId: "WindOS", title: "Rename failed", body: "This item cannot be renamed." });
    }
    setDialog(null);
  }

  function doDelete(node: FSNode) {
    if (trashView) {
      setDialog({
        kind: "confirm",
        title: "Delete permanently?",
        body: `${node.name} cannot be restored after this.`,
        action: () => {
          os.fs.purge(node.id);
          setSelectedId(null);
          os.notify({ appId: "WindOS", title: "Deleted permanently", body: `${node.name} was removed from the Recycle Bin.` });
        },
      });
      return;
    }
    if (os.fs.trash(node.id)) {
      setSelectedId(null);
      os.notify({ appId: "WindOS", title: "Moved to Recycle Bin", body: `${node.name} can be restored from WindFiles → Recycle Bin.` });
    } else {
      os.notify({ appId: "WindOS", title: "Delete blocked", body: "The guest session is read-only." });
    }
  }

  function paste() {
    if (!clipboard || isVirtual) return;
    if (clipboard.mode === "copy") os.fs.copy(clipboard.id, location);
    else if (os.fs.move(clipboard.id, location)) setClipboard(null);
    setRefresh((n) => n + 1);
  }

  function toggleFavorite(node: FSNode) {
    os.fs.setFavorite(node.id, !node.favorite);
  }

  const previewNode = selected ?? undefined;

  return (
    <AppShell>
      <AppHeader
        icon={FolderOpen}
        title={query.trim() ? `Search: ${query}` : trashView ? "Recycle Bin" : recentView ? "Recent files" : favoritesView ? "Favourites" : current?.name ?? "This PC"}
        subtitle={`${entries.length} item${entries.length === 1 ? "" : "s"} · ${readOnly ? "read-only guest drive" : `${formatBytes(usage.bytes)} on WindOS drive`}`}
        actions={
          <>
            <ToolButton icon={Grid2x2} active={view === "grid"} onClick={() => setView("grid")} title="Grid view" />
            <ToolButton icon={List} active={view === "list"} onClick={() => setView("list")} title="List view" />
            <ToolButton icon={showPreview ? X : Info} label={showPreview ? "Close preview" : "Preview"} onClick={() => setShowPreview((v) => !v)} />
          </>
        }
      />

      <AppToolbar>
        <ToolButton icon={ArrowLeft} onClick={goBack} disabled={!back.length} title="Back" />
        <ToolButton icon={ArrowRight} onClick={goForward} disabled={!forward.length} title="Forward" />
        <ToolButton icon={ArrowUp} onClick={goUp} disabled={isVirtual} title="Up one level" />
        <div className="mx-1 h-4 w-px bg-border" />
        <ToolButton icon={FolderPlus} label="New folder" disabled={isVirtual || readOnly} onClick={() => { setDraft("New folder"); setDialog({ kind: "new", type: "folder" }); }} />
        <ToolButton icon={FileText} label="New file" disabled={isVirtual || readOnly} onClick={() => { setDraft("New file.txt"); setDialog({ kind: "new", type: "file" }); }} />
        <ToolButton icon={Upload} label="Import" disabled={isVirtual} onClick={() => fileInput.current?.click()} />
        <ToolButton icon={Download} label="Export" disabled={!previewNode || previewNode.type === "folder"} onClick={() => previewNode && void exportNode(previewNode)} />
        <div className="mx-1 h-4 w-px bg-border" />
        <ToolButton icon={Copy} label="Copy" disabled={!previewNode} onClick={() => previewNode && setClipboard({ mode: "copy", id: previewNode.id })} />
        <ToolButton icon={Scissors} label="Cut" disabled={!previewNode || readOnly} onClick={() => previewNode && setClipboard({ mode: "cut", id: previewNode.id })} />
        <ToolButton icon={Copy} label="Paste" disabled={!clipboard || isVirtual} onClick={paste} />
        <ToolButton icon={Pencil} label="Rename" disabled={!previewNode || readOnly} onClick={() => {
          if (!previewNode) return;
          setDraft(previewNode.name);
          setDialog({ kind: "rename", node: previewNode });
        }} />
        <ToolButton icon={Trash2} label="Delete" danger disabled={!previewNode} onClick={() => previewNode && doDelete(previewNode)} />
        <div className="ml-auto flex items-center gap-1.5">
          <SearchInput value={query} onChange={setQuery} placeholder="Search this drive" className="w-44" />
          <select
            value={`${sort}:${sortAsc ? "asc" : "desc"}`}
            onChange={(event) => {
              const [field, dir] = event.target.value.split(":");
              setSort(field as typeof sort);
              setSortAsc(dir === "asc");
            }}
            className="h-8 rounded-md border border-border bg-background px-2 text-[10.5px] outline-none"
            aria-label="Sort files"
          >
            <option value="name:asc">Name A–Z</option>
            <option value="name:desc">Name Z–A</option>
            <option value="modified:desc">Newest first</option>
            <option value="modified:asc">Oldest first</option>
            <option value="size:desc">Largest first</option>
            <option value="type:asc">Type</option>
          </select>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value as (typeof TYPE_FILTERS)[number])}
            className="h-8 rounded-md border border-border bg-background px-2 text-[10.5px] capitalize outline-none"
            aria-label="Filter by type"
          >
            {TYPE_FILTERS.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
      </AppToolbar>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[178px] shrink-0 flex-col border-r border-border/60 bg-muted/20 p-2 sm:flex">
          <p className="px-2 pb-1 pt-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Locations</p>
          <div className="space-y-0.5">
            {LOCATIONS.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] transition",
                  location === item.id ? "bg-primary/12 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon className="size-3.5" />
                <span className="truncate">{item.name}</span>
              </button>
            ))}
          </div>
          <div className="my-2 h-px bg-border/60" />
          <div className="space-y-0.5">
            <SideButton icon={Clock3} label="Recent" active={recentView} onClick={() => navigate("recent")} />
            <SideButton icon={Star} label="Favourites" active={favoritesView} onClick={() => navigate("favorites")} />
            <SideButton icon={Trash2} label="Recycle Bin" active={trashView} onClick={() => navigate("trash")} badge={Object.values(os.fs.nodes).filter((n) => n.trashed).length} />
          </div>
          <div className="mt-auto rounded-lg border border-border/60 bg-background/60 p-2">
            <div className="mb-1 flex items-center justify-between text-[9px] text-muted-foreground">
              <span>WindOS drive</span>
              <span>{formatBytes(usage.bytes)}</span>
            </div>
            <Meter value={(usage.bytes / (512 * 1024 * 1024)) * 100} />
            <p className="mt-1 text-[8.5px] text-muted-foreground">{usage.files} files · {usage.folders} folders</p>
            <p className="mt-0.5 text-[8.5px] text-muted-foreground">{formatBytes(usage.trashBytes)} in Recycle Bin</p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-1 border-b border-border/50 px-3 py-1.5 text-[10.5px]">
            {trashView ? (
              <>
                <Trash2 className="size-3 text-muted-foreground" />
                <span>Recycle Bin</span>
                <span className="ml-auto text-muted-foreground">{formatBytes(usage.trashBytes)}</span>
                <button
                  className="ml-2 rounded border border-border px-1.5 py-0.5 text-[9.5px] transition hover:bg-muted disabled:opacity-40"
                  disabled={readOnly || !entries.length}
                  onClick={() => setDialog({
                    kind: "confirm",
                    title: "Empty the Recycle Bin?",
                    body: "Every item in the bin will be deleted permanently. This cannot be undone.",
                    action: () => {
                      const count = os.fs.emptyTrash();
                      os.notify({ appId: "WindOS", title: "Recycle Bin emptied", body: `${count} item${count === 1 ? "" : "s"} removed permanently.` });
                    },
                  })}
                >
                  Empty bin
                </button>
              </>
            ) : recentView || favoritesView ? (
              <span className="capitalize">{recentView ? "Recent files" : "Favourites"}</span>
            ) : (
              <>
                <button className="rounded px-1 py-0.5 hover:bg-muted" onClick={() => navigate("root")}>This PC</button>
                {crumbs.map((crumb) => (
                  <span key={crumb.id} className="flex min-w-0 items-center">
                    <ChevronRight className="size-3 text-muted-foreground/50" />
                    <button className="max-w-[140px] truncate rounded px-1 py-0.5 hover:bg-muted" onClick={() => navigate(crumb.id)}>{crumb.name}</button>
                  </span>
                ))}
                <span className="ml-auto flex items-center gap-1 text-[9.5px] text-muted-foreground">
                  {query ? `Searching all folders` : `${entries.length} items`}
                </span>
              </>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-3">
            {entries.length === 0 ? (
              <EmptyState
                icon={FolderOpen}
                title={query ? "No files matched" : trashView ? "Recycle Bin is empty" : "This folder is empty"}
                body={query ? "Try a shorter search term. WindFiles searches names and text content." : "Create a folder, import a file, or drag work in from another app."}
                action={!query && !trashView ? (
                  <div className="flex gap-2">
                    <PrimaryButton onClick={() => { setDraft("New folder"); setDialog({ kind: "new", type: "folder" }); }}>New folder</PrimaryButton>
                    <GhostButton onClick={() => fileInput.current?.click()}>Import files</GhostButton>
                  </div>
                ) : undefined}
              />
            ) : view === "grid" ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-1.5">
                {entries.map((node) => {
                  const FileIcon = FILE_ICONS[iconForFile(node)] ?? File;
                  return (
                    <button
                      key={node.id}
                      onClick={() => setSelectedId(node.id)}
                      onDoubleClick={() => openNode(node)}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        setSelectedId(node.id);
                        setCtx({ x: event.clientX, y: event.clientY, node });
                      }}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-lg border border-transparent p-2.5 text-center transition hover:bg-muted/60",
                        selectedId === node.id && "border-primary/30 bg-primary/8",
                      )}
                      title={`${node.name} — ${node.type === "folder" ? "Folder" : formatBytes(node.size)}`}
                    >
                      <FileIcon className={cn("size-8", node.type === "folder" ? "text-amber-500" : "text-muted-foreground")} strokeWidth={1.5} />
                      <span className="line-clamp-2 w-full break-all text-[10.5px] font-medium leading-tight">{node.name}</span>
                      <span className="text-[9px] text-muted-foreground">{node.type === "folder" ? "Folder" : formatBytes(node.size)}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border/60">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-muted/50 text-[9.5px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-1.5 font-medium">Name</th>
                      <th className="hidden px-3 py-1.5 font-medium sm:table-cell">Type</th>
                      <th className="hidden px-3 py-1.5 text-right font-medium md:table-cell">Size</th>
                      <th className="hidden px-3 py-1.5 text-right font-medium md:table-cell">Modified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((node) => {
                      const FileIcon = FILE_ICONS[iconForFile(node)] ?? File;
                      return (
                        <tr
                          key={node.id}
                          className={cn("cursor-default border-t border-border/50 transition hover:bg-muted/50", selectedId === node.id && "bg-primary/8")}
                          onClick={() => setSelectedId(node.id)}
                          onDoubleClick={() => openNode(node)}
                          onContextMenu={(event) => {
                            event.preventDefault();
                            setSelectedId(node.id);
                            setCtx({ x: event.clientX, y: event.clientY, node });
                          }}
                        >
                          <td className="px-3 py-1.5">
                            <span className="flex items-center gap-2">
                              <FileIcon className={cn("size-3.5 shrink-0", node.type === "folder" ? "text-amber-500" : "text-muted-foreground")} />
                              <span className="truncate">{node.name}</span>
                              {node.favorite && <Star className="size-3 shrink-0 text-amber-500" fill="currentColor" />}
                            </span>
                          </td>
                          <td className="hidden px-3 py-1.5 text-muted-foreground sm:table-cell">{node.type === "folder" ? "Folder" : extOf(node).toUpperCase() || "File"}</td>
                          <td className="hidden px-3 py-1.5 text-right text-muted-foreground md:table-cell">{node.type === "folder" ? "—" : formatBytes(node.size)}</td>
                          <td className="hidden px-3 py-1.5 text-right text-muted-foreground md:table-cell">{new Date(node.modifiedAt).toLocaleDateString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {showPreview && (
          <aside className="hidden w-[238px] shrink-0 overflow-y-auto border-l border-border/60 bg-muted/15 p-3 lg:block">
            {previewNode ? (
              <div>
                <div className="mb-3 flex flex-col items-center gap-2 rounded-lg border border-border/60 bg-card p-3 text-center">
                  {previewNode.type === "file" && previewNode.content?.startsWith("data:image") ? (
                    <img src={previewNode.content} alt={previewNode.name} className="max-h-32 w-full rounded object-contain" />
                  ) : previewNode.type === "file" && previewNode.mime === "image/svg+xml" ? (
                    <img src={`data:image/svg+xml;utf8,${encodeURIComponent(previewNode.content ?? "")}`} alt={previewNode.name} className="max-h-32 w-full rounded object-contain" />
                  ) : (
                    <div className="flex h-20 w-full items-center justify-center rounded bg-muted/60">
                      {previewNode.type === "folder" ? <Folder className="size-8 text-amber-500" /> : <FileText className="size-8 text-muted-foreground" />}
                    </div>
                  )}
                  <p className="line-clamp-2 break-all text-[11px] font-medium">{previewNode.name}</p>
                  <p className="text-[9.5px] text-muted-foreground">{previewNode.type === "folder" ? "Folder" : `${extOf(previewNode).toUpperCase() || "File"} · ${formatBytes(previewNode.size)}`}</p>
                </div>

                {previewNode.type === "file" && isTextFile(previewNode) && previewNode.content && (
                  <div className="mb-3">
                    <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Preview</p>
                    <pre className="max-h-40 overflow-hidden whitespace-pre-wrap break-words rounded border border-border/60 bg-card p-2 text-[9.5px] leading-relaxed text-muted-foreground">
                      {previewNode.content.slice(0, 700)}
                    </pre>
                  </div>
                )}

                <div className="space-y-1.5 text-[10px]">
                  <Row label="Path" value={os.fs.pathOf(previewNode.id)} />
                  <Row label="Created" value={new Date(previewNode.createdAt).toLocaleString()} />
                  <Row label="Modified" value={new Date(previewNode.modifiedAt).toLocaleString()} />
                  {previewNode.type === "file" && <Row label="MIME" value={previewNode.mime ?? "unknown"} />}
                  {previewNode.trashed && <Row label="Location" value="Recycle Bin" />}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  <GhostButton onClick={() => openNode(previewNode)}>Open</GhostButton>
                  <GhostButton onClick={() => toggleFavorite(previewNode)}>
                    {previewNode.favorite ? <Star className="size-3 text-amber-500" fill="currentColor" /> : <Heart className="size-3" />}
                    {previewNode.favorite ? "Starred" : "Favourite"}
                  </GhostButton>
                  {previewNode.trashed ? (
                    <GhostButton onClick={() => { os.fs.restore(previewNode.id); setSelectedId(null); }}>Restore</GhostButton>
                  ) : (
                    <GhostButton onClick={() => setClipboard({ mode: "copy", id: previewNode.id })}>Copy</GhostButton>
                  )}
                  <GhostButton onClick={() => os.openApp("zip", { ids: [previewNode.id] })}>Zip</GhostButton>
                  <GhostButton className="col-span-2" onClick={() => setDialog({ kind: "props", node: previewNode })}>
                    <Info className="size-3" /> Properties
                  </GhostButton>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <Info className="mb-2 size-5 text-muted-foreground/50" />
                <p className="text-[11px] font-medium">Select a file</p>
                <p className="mt-1 text-[9.5px] text-muted-foreground">Details and a live preview appear here.</p>
              </div>
            )}
          </aside>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-border/60 px-3 py-1.5 text-[9.5px] text-muted-foreground">
        <span>{readOnly ? "Guest session · drive is read-only" : "IndexedDB persistence active · changes save automatically"}</span>
        <span>{filter !== "all" ? `Filter: ${filter} · ` : ""}{usage.files} files · {formatBytes(usage.bytes)}</span>
      </div>

      <input ref={fileInput} type="file" multiple className="hidden" onChange={(event) => void importFiles(event.target.files)} />

      {ctx && (
        <>
          <div className="fixed inset-0 z-[140]" onClick={() => setCtx(null)} onContextMenu={(event) => { event.preventDefault(); setCtx(null); }} />
          <div className="fixed z-[141] w-52 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-xl" style={{ left: Math.min(ctx.x, window.innerWidth - 220), top: Math.min(ctx.y, window.innerHeight - 300) }}>
            {ctx.node ? (
              <>
                <CtxItem label="Open" onClick={() => { openNode(ctx.node!); setCtx(null); }} />
                {ctx.node.type === "folder" && <CtxItem label="Open in new path" onClick={() => { navigate(ctx.node!.id); setCtx(null); }} />}
                <CtxItem label={ctx.node.trashed ? "Restore" : "Rename"} onClick={() => {
                  if (ctx.node!.trashed) { os.fs.restore(ctx.node!.id); setSelectedId(null); }
                  else { setDraft(ctx.node!.name); setDialog({ kind: "rename", node: ctx.node! }); }
                  setCtx(null);
                }} />
                {!ctx.node.trashed && <CtxItem label="Copy" onClick={() => { setClipboard({ mode: "copy", id: ctx.node!.id }); setCtx(null); }} />}
                {!ctx.node.trashed && !readOnly && <CtxItem label="Cut" onClick={() => { setClipboard({ mode: "cut", id: ctx.node!.id }); setCtx(null); }} />}
                {ctx.node.type === "file" && <CtxItem label="Download" onClick={() => { void exportNode(ctx.node!); setCtx(null); }} />}
                <CtxItem label={ctx.node.favorite ? "Remove favourite" : "Add to favourites"} onClick={() => { toggleFavorite(ctx.node!); setCtx(null); }} />
                <CtxItem label="Properties" onClick={() => { setDialog({ kind: "props", node: ctx.node! }); setCtx(null); }} />
                <div className="my-1 h-px bg-border" />
                <CtxItem label={ctx.node.trashed ? "Delete permanently" : "Move to Recycle Bin"} danger onClick={() => { doDelete(ctx.node!); setCtx(null); }} />
              </>
            ) : (
              <>
                <CtxItem label="New folder" onClick={() => { setDraft("New folder"); setDialog({ kind: "new", type: "folder" }); setCtx(null); }} />
                <CtxItem label="New text file" onClick={() => { setDraft("New file.txt"); setDialog({ kind: "new", type: "file" }); setCtx(null); }} />
                <CtxItem label="Import files" onClick={() => { fileInput.current?.click(); setCtx(null); }} />
                <CtxItem label="Refresh" onClick={() => { setRefresh((n) => n + 1); setCtx(null); }} />
              </>
            )}
          </div>
        </>
      )}

      {dialog && (
        <div className="fixed inset-0 z-[145] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-popover p-4 shadow-2xl">
            {dialog.kind === "new" && (
              <>
                <h3 className="text-[13px] font-semibold">New {dialog.type}</h3>
                <p className="mt-1 text-[10.5px] text-muted-foreground">Created inside {current?.name ?? "this folder"} on the WindOS drive.</p>
                <Field label="Name"><input autoFocus className={inputClass} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => event.key === "Enter" && createNode()} /></Field>
                <div className="mt-3 flex justify-end gap-2"><GhostButton onClick={() => setDialog(null)}>Cancel</GhostButton><PrimaryButton onClick={createNode}>Create</PrimaryButton></div>
              </>
            )}
            {dialog.kind === "rename" && (
              <>
                <h3 className="text-[13px] font-semibold">Rename item</h3>
                <Field label="New name"><input autoFocus className={inputClass} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => event.key === "Enter" && renameNode()} /></Field>
                <div className="mt-3 flex justify-end gap-2"><GhostButton onClick={() => setDialog(null)}>Cancel</GhostButton><PrimaryButton onClick={renameNode}>Rename</PrimaryButton></div>
              </>
            )}
            {dialog.kind === "props" && (
              <>
                <div className="flex items-center gap-2">
                  {dialog.node.type === "folder" ? <Folder className="size-5 text-amber-500" /> : <FileText className="size-5 text-muted-foreground" />}
                  <h3 className="truncate text-[13px] font-semibold">{dialog.node.name}</h3>
                </div>
                <div className="mt-3 space-y-2 text-[11px]">
                  <Row label="Type" value={dialog.node.type === "folder" ? "Folder" : dialog.node.mime ?? "File"} />
                  <Row label="Size" value={formatBytes(dialog.node.size)} />
                  <Row label="Path" value={os.fs.pathOf(dialog.node.id)} />
                  <Row label="Created" value={new Date(dialog.node.createdAt).toLocaleString()} />
                  <Row label="Modified" value={new Date(dialog.node.modifiedAt).toLocaleString()} />
                  <Row label="Favourite" value={dialog.node.favorite ? "Yes" : "No"} />
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <GhostButton onClick={() => { toggleFavorite(dialog.node); setDialog(null); }}>
                    {dialog.node.favorite ? "Remove favourite" : "Add to favourites"}
                  </GhostButton>
                  <PrimaryButton onClick={() => setDialog(null)}>Close</PrimaryButton>
                </div>
              </>
            )}
            {dialog.kind === "confirm" && (
              <>
                <h3 className="text-[13px] font-semibold">{dialog.title}</h3>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{dialog.body}</p>
                <div className="mt-4 flex justify-end gap-2">
                  <GhostButton onClick={() => setDialog(null)}>Cancel</GhostButton>
                  <button
                    className="h-8 rounded-md bg-red-600 px-3 text-[11.5px] font-semibold text-white transition hover:bg-red-500"
                    onClick={() => { dialog.action(); setDialog(null); }}
                  >
                    Continue
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}


function SideButton({ icon: Icon, label, active, onClick, badge }: { icon: typeof Star; label: string; active: boolean; onClick: () => void; badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] transition",
        active ? "bg-primary/12 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="size-3.5" />
      <span className="truncate">{label}</span>
      {badge ? <span className="ml-auto rounded-full bg-muted px-1.5 text-[9px] text-muted-foreground">{badge}</span> : null}
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 break-all text-right">{value}</span>
    </div>
  );
}

function CtxItem({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn("flex w-full items-center rounded-md px-2 py-1.5 text-left text-[11px] transition hover:bg-muted", danger && "text-red-600 hover:bg-red-500/10 dark:text-red-400")}
    >
      {label}
    </button>
  );
}
