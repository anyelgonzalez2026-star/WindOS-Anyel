import type { FSNode } from "./types";

const now = () => Date.now();
let seq = 0;
function uid(prefix = "n") {
  seq += 1;
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${random}_${seq}`;
}

export const ROOT_ID = "root";
export const SEED_FOLDERS = {
  desktop: "folder_desktop",
  documents: "folder_documents",
  downloads: "folder_downloads",
  pictures: "folder_pictures",
  music: "folder_music",
  videos: "folder_videos",
  projects: "folder_projects",
  data: "folder_data",
  shared: "folder_shared",
  backups: "folder_backups",
};

const WELCOME = `# Welcome to WindOS 1.0.0

WindOS is a complete desktop operating system simulator that runs entirely in
your browser. Nothing here touches the host computer.

## A quick tour
- Open apps from the Start menu or desktop icons.
- Right-click the desktop for wallpapers, widgets and display tools.
- Drag windows by their title bar; double-click it to maximise.
- Snap windows by dragging them to the left, right or top edge.
- Press Ctrl+Space anywhere to search apps, files and settings.
- Open WindTerminal and type "help" for a real shell over this drive.

## Your data
Files, settings, notes and installed apps are stored locally in this browser.
Use WindBackup to export a portable archive.

Build by Anyel Gonzalez
`;

const FEATURE_OVERVIEW = `# WindOS feature registry

WindOS 1.0.0 registers 640 individually verifiable capabilities across 40
categories. Open the WindRegistry app to browse every feature, filter by
category and see its implementation and verification state.

Registry highlights
-------------------
* 40 feature categories, 16 capabilities each
* Every capability is mapped to the subsystem or app that implements it
* Status is either "implemented" or "limited"; limitations are documented
* The About screen always shows the live verified count

Honesty rules used by this build
--------------------------------
1. Simulated hardware metrics are labelled SIMULATED.
2. WindBrowser cannot force Microsoft Edge to open; it tries edge:// then
   falls back to a normal external tab.
3. Windows .exe files cannot execute in a browser. WindCompat explains the
   supported formats and offers sandboxed demos instead.
4. WindOS never claims host-level antivirus or firewall protection.
`;

const HTML_SAMPLE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Hello WindOS</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <main class="card">
      <p class="eyebrow">WindCode preview</p>
      <h1>Hello, WindOS.</h1>
      <p>Edit the files in WindCode, then press Run to render this page in the
      sandboxed preview.</p>
      <button id="cta">Count the clicks</button>
      <p id="out">0 clicks</p>
    </main>
    <script src="app.js"></script>
  </body>
</html>
`;

const CSS_SAMPLE = `:root {
  color-scheme: light dark;
  --ink: #101828;
  --accent: #4f5bd5;
}
body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  font-family: "Segoe UI", system-ui, sans-serif;
  background: radial-gradient(circle at 20% 20%, #eef1ff, #f7f8fc 55%, #e9edf7);
  color: var(--ink);
}
.card {
  width: min(520px, 88vw);
  padding: 40px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 24px 80px rgba(16, 24, 40, 0.12);
  backdrop-filter: blur(18px);
}
.eyebrow { letter-spacing: .18em; text-transform: uppercase; font-size: 11px; color: #667085; }
h1 { font-size: 40px; margin: 8px 0 12px; letter-spacing: -0.03em; }
p { line-height: 1.65; color: #475467; }
button {
  margin-top: 16px; padding: 12px 20px; border: 0; border-radius: 12px;
  background: var(--accent); color: white; font-weight: 600; cursor: pointer;
}
`;

const JS_SAMPLE = `let clicks = 0;
const button = document.getElementById("cta");
const out = document.getElementById("out");
button.addEventListener("click", () => {
  clicks += 1;
  out.textContent = clicks + (clicks === 1 ? " click" : " clicks");
  console.log("click", clicks);
});
console.log("Hello from the sandboxed WindCode console.");
`;

const SVG_LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4f5bd5"/>
      <stop offset="1" stop-color="#22a7a0"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="128" fill="#0c1220"/>
  <path d="M104 356V156h56l44 104 44-104h56v200h-48V238l-36 84h-32l-36-84v118z" fill="url(#g)"/>
  <circle cx="384" cy="180" r="18" fill="#22a7a0"/>
</svg>
`;

const TASKS_SEED = `# Launch checklist

- [x] Boot WindOS
- [x] Configure display name and theme
- [ ] Open WindFiles and create a folder
- [ ] Build something in WindCode
- [ ] Export a backup from WindBackup
`;

export interface SerializedFS {
  version: 1;
  nodes: FSNode[];
  exportedAt: number;
}

export class VirtualFileSystem {
  nodes: Record<string, FSNode> = {};
  private listeners = new Set<() => void>();
  version = 0;
  readOnly = false;

  constructor(seed = true) {
    if (seed) this.seed();
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getVersion = () => this.version;

  private emit() {
    this.version += 1;
    this.listeners.forEach((fn) => fn());
  }

  /** Replace the whole tree (restore/import) and notify subscribers. */
  replace(serialized: SerializedFS | null) {
    this.nodes = {};
    if (serialized?.nodes?.length) {
      for (const node of serialized.nodes) this.nodes[node.id] = { ...node };
    } else {
      this.seed();
      this.emit();
      return;
    }
    this.emit();
  }

  serialize(): SerializedFS {
    return { version: 1, nodes: Object.values(this.nodes), exportedAt: now() };
  }

  private add(node: Omit<FSNode, "id" | "createdAt" | "modifiedAt"> & { id?: string }): FSNode {
    const t = now();
    const created: FSNode = {
      ...node,
      id: node.id ?? uid(),
      createdAt: t,
      modifiedAt: t,
      size: node.type === "file" ? (node.content?.length ?? 0) : 0,
    };
    this.nodes[created.id] = created;
    return created;
  }

  private seed() {
    this.nodes = {};
    const root = this.add({
      id: ROOT_ID,
      name: "This PC",
      type: "folder",
      parentId: null,
      size: 0,
    });
    void root;
    const folders: [string, string, string, string | null][] = [
      [SEED_FOLDERS.desktop, "Desktop", "collections", ROOT_ID],
      [SEED_FOLDERS.documents, "Documents", "docs", ROOT_ID],
      [SEED_FOLDERS.downloads, "Downloads", "down", ROOT_ID],
      [SEED_FOLDERS.pictures, "Pictures", "img", ROOT_ID],
      [SEED_FOLDERS.music, "Music", "audio", ROOT_ID],
      [SEED_FOLDERS.videos, "Videos", "video", ROOT_ID],
      [SEED_FOLDERS.projects, "Projects", "code", ROOT_ID],
      [SEED_FOLDERS.data, "Data (D:)", "drive", ROOT_ID],
      [SEED_FOLDERS.shared, "Shared", "share", SEED_FOLDERS.data],
      [SEED_FOLDERS.backups, "Backups", "backup", SEED_FOLDERS.data],
    ];
    for (const [id, name, , parentId] of folders) {
      this.add({ id, name, type: "folder", parentId, size: 0 });
    }
    // A couple of nested folders make the file manager feel lived in.
    this.add({
      id: "folder_work",
      name: "Work",
      type: "folder",
      parentId: SEED_FOLDERS.documents,
      size: 0,
    });
    this.add({
      id: "folder_hello",
      name: "hello-wind",
      type: "folder",
      parentId: SEED_FOLDERS.projects,
      size: 0,
    });

    const files: [string, string, string, string, string | null][] = [
      ["file_welcome", "Welcome.md", "text/markdown", WELCOME, SEED_FOLDERS.documents],
      ["file_features", "Feature-Overview.md", "text/markdown", FEATURE_OVERVIEW, SEED_FOLDERS.documents],
      ["file_tasks", "Launch-checklist.md", "text/markdown", TASKS_SEED, SEED_FOLDERS.desktop],
      ["file_index_html", "index.html", "text/html", HTML_SAMPLE, "folder_hello"],
      ["file_styles_css", "styles.css", "text/css", CSS_SAMPLE, "folder_hello"],
      ["file_app_js", "app.js", "text/javascript", JS_SAMPLE, "folder_hello"],
      ["file_logo_svg", "WindOS-mark.svg", "image/svg+xml", SVG_LOGO, SEED_FOLDERS.pictures],
      ["file_release_notes", "WindOS-1.0.0.txt", "text/plain",
        "WindOS 1.0.0\nBuild by Anyel Gonzalez\n\n640 registered capabilities, 40 categories.\nBoot time target: under 2 seconds warm.\n",
        SEED_FOLDERS.downloads],
      ["file_shared_notes", "Team-notes.md", "text/markdown",
        "# Shared space\n\nA second drive for files you want to keep out of the main flow.\n\n- Draft the launch post\n- Export a backup to Data (D:)/Backups\n",
        SEED_FOLDERS.shared],
      ["file_budget", "Budget.csv", "text/csv",
        "Month,Plan,Actual\nJanuary,1200,1140\nFebruary,1200,1290\nMarch,1400,1310\n",
        "folder_work"],
    ];
    for (const [id, name, mime, content, parentId] of files) {
      this.add({ id, name, mime, content, parentId, type: "file", size: content.length });
    }
  }

  byId(id: string | null | undefined): FSNode | undefined {
    if (!id) return undefined;
    return this.nodes[id];
  }

  children(parentId: string | null, opts: { trash?: boolean } = {}): FSNode[] {
    const inTrash = Boolean(opts.trash);
    return Object.values(this.nodes).filter(
      (n) => n.parentId === parentId && Boolean(n.trashed) === inTrash,
    );
  }

  allTrash(): FSNode[] {
    return Object.values(this.nodes).filter((n) => n.trashed && n.type !== "folder");
  }

  private uniqueName(parentId: string, desired: string): string {
    const siblings = this.children(parentId).map((n) => n.name.toLowerCase());
    if (!siblings.includes(desired.toLowerCase())) return desired;
    const dot = desired.lastIndexOf(".");
    const base = dot > 0 ? desired.slice(0, dot) : desired;
    const ext = dot > 0 ? desired.slice(dot) : "";
    let i = 2;
    while (siblings.includes(`${base} (${i})${ext}`.toLowerCase())) i += 1;
    return `${base} (${i})${ext}`;
  }

  createFolder(parentId: string, name: string): FSNode | null {
    if (this.readOnly) return null;
    if (!this.byId(parentId) || !name.trim()) return null;
    const node = this.add({
      name: this.uniqueName(parentId, name.trim()),
      type: "folder",
      parentId,
      size: 0,
    });
    this.emit();
    return node;
  }

  createFile(
    parentId: string,
    name: string,
    content = "",
    mime = "text/plain",
  ): FSNode | null {
    if (this.readOnly) return null;
    if (!this.byId(parentId) || !name.trim()) return null;
    const node = this.add({
      name: this.uniqueName(parentId, name.trim()),
      type: "file",
      parentId,
      content,
      mime,
      size: content.length,
    });
    this.emit();
    return node;
  }

  write(id: string, content: string): boolean {
    if (this.readOnly) return false;
    const node = this.byId(id);
    if (!node || node.type !== "file") return false;
    node.content = content;
    node.size = content.length;
    node.modifiedAt = now();
    this.emit();
    return true;
  }

  setFavorite(id: string, value: boolean): boolean {
    if (this.readOnly) return false;
    const node = this.byId(id);
    if (!node) return false;
    node.favorite = value;
    this.emit();
    return true;
  }

  rename(id: string, name: string): boolean {
    if (this.readOnly) return false;
    const node = this.byId(id);
    if (!node || !name.trim() || id === ROOT_ID) return false;
    if (node.locked) return false;
    node.name = name.trim();
    node.modifiedAt = now();
    this.emit();
    return true;
  }

  move(id: string, parentId: string): boolean {
    if (this.readOnly) return false;
    const node = this.byId(id);
    const parent = this.byId(parentId);
    if (!node || !parent || parent.type !== "folder" || id === ROOT_ID) return false;
    if (this.isDescendant(parentId, id)) return false;
    node.parentId = parentId;
    node.name = this.uniqueName(parentId, node.name);
    node.modifiedAt = now();
    this.emit();
    return true;
  }

  isDescendant(candidateId: string, ancestorId: string): boolean {
    let current = this.byId(candidateId);
    let guard = 0;
    while (current && guard < 200) {
      if (current.parentId === ancestorId) return true;
      current = this.byId(current.parentId);
      guard += 1;
    }
    return false;
  }

  copy(id: string, parentId: string): FSNode | null {
    if (this.readOnly) return null;
    const src = this.byId(id);
    const parent = this.byId(parentId);
    if (!src || !parent || parent.type !== "folder" || this.isDescendant(parentId, id)) return null;
    const cloneInto = (sourceId: string, targetParent: string): FSNode | null => {
      const source = this.byId(sourceId);
      if (!source) return null;
      const clone = this.add({
        name: this.uniqueName(targetParent, source.name),
        type: source.type,
        parentId: targetParent,
        content: source.content,
        mime: source.mime,
        size: source.size,
        favorite: source.favorite,
      });
      if (source.type === "folder") {
        for (const child of this.children(source.id)) cloneInto(child.id, clone.id);
      }
      return clone;
    };
    const result = cloneInto(id, parentId);
    this.emit();
    return result;
  }

  trash(id: string): boolean {
    if (this.readOnly) return false;
    const node = this.byId(id);
    if (!node || id === ROOT_ID) return false;
    node.trashed = true;
    node.originalParentId = node.parentId;
    node.modifiedAt = now();
    // Mark nested items as trashed too so they disappear from search.
    for (const child of this.allChildrenDeep(id)) {
      child.trashed = true;
      child.originalParentId = child.parentId;
    }
    this.emit();
    return true;
  }

  restore(id: string): boolean {
    if (this.readOnly) return false;
    const node = this.byId(id);
    if (!node) return false;
    node.trashed = false;
    node.parentId = this.byId(node.originalParentId) ? node.originalParentId! : ROOT_ID;
    node.originalParentId = null;
    node.modifiedAt = now();
    this.emit();
    return true;
  }

  purge(id: string): boolean {
    if (this.readOnly) return false;
    const node = this.byId(id);
    if (!node) return false;
    for (const child of this.allChildrenDeep(id)) delete this.nodes[child.id];
    delete this.nodes[id];
    this.emit();
    return true;
  }

  emptyTrash(): number {
    if (this.readOnly) return 0;
    const trash = Object.values(this.nodes).filter((n) => n.trashed);
    let count = 0;
    for (const node of trash) {
      if (this.nodes[node.id]) {
        for (const child of this.allChildrenDeep(node.id)) delete this.nodes[child.id];
        delete this.nodes[node.id];
        count += 1;
      }
    }
    this.emit();
    return count;
  }

  private allChildrenDeep(id: string): FSNode[] {
    const out: FSNode[] = [];
    const walk = (parentId: string) => {
      for (const child of Object.values(this.nodes).filter((n) => n.parentId === parentId)) {
        out.push(child);
        if (child.type === "folder") walk(child.id);
      }
    };
    walk(id);
    return out;
  }

  pathOf(id: string): string {
    const parts: string[] = [];
    let node = this.byId(id);
    let guard = 0;
    while (node && node.id !== ROOT_ID && guard < 100) {
      parts.unshift(node.name);
      node = this.byId(node.parentId);
      guard += 1;
    }
    return "/" + parts.join("/");
  }

  resolvePath(input: string, cwd: string = ROOT_ID): FSNode | null {
    const trimmed = (input || "").trim();
    if (!trimmed || trimmed === "/" || trimmed === "~") return this.byId(ROOT_ID) ?? null;
    let current: FSNode | undefined;
    let parts: string[];
    if (trimmed.startsWith("/") || trimmed.startsWith("~")) {
      current = this.byId(ROOT_ID);
      parts = trimmed.replace(/^[~/]+/, "").split("/").filter(Boolean);
    } else {
      current = this.byId(cwd) ?? this.byId(ROOT_ID);
      parts = trimmed.split("/").filter(Boolean);
    }
    for (const part of parts) {
      if (!current) return null;
      if (part === ".") continue;
      if (part === "..") {
        current = this.byId(current.parentId);
        continue;
      }
      const next: FSNode | undefined = this.children(current.id).find(
        (n) => n.name.toLowerCase() === part.toLowerCase(),
      );
      if (!next) return null;
      current = next;
    }
    return current ?? null;
  }

  ensureFolderPath(path: string): FSNode | null {
    const parts = path.split("/").filter(Boolean);
    let current = this.byId(ROOT_ID);
    for (const part of parts) {
      if (!current) return null;
      const found = this.children(current.id).find(
        (n) => n.type === "folder" && n.name.toLowerCase() === part.toLowerCase(),
      );
      if (found) {
        current = found;
      } else {
        const created = this.createFolder(current.id, part);
        if (!created) return null;
        current = created;
      }
    }
    return current ?? null;
  }

  search(query: string, opts: { includeTrash?: boolean } = {}): FSNode[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return Object.values(this.nodes).filter(
      (n) =>
        !n.trashed &&
        n.id !== ROOT_ID &&
        (n.name.toLowerCase().includes(q) ||
          (n.type === "file" && (n.content ?? "").toLowerCase().includes(q))),
    ).slice(0, opts.includeTrash ? 200 : 80);
  }

  recent(limit = 12): FSNode[] {
    return Object.values(this.nodes)
      .filter((n) => n.type === "file" && !n.trashed)
      .sort((a, b) => b.modifiedAt - a.modifiedAt)
      .slice(0, limit);
  }

  usage(): { files: number; folders: number; bytes: number; trashBytes: number } {
    let files = 0;
    let folders = 0;
    let bytes = 0;
    let trashBytes = 0;
    for (const node of Object.values(this.nodes)) {
      if (node.id === ROOT_ID) continue;
      if (node.type === "folder") folders += 1;
      else files += 1;
      if (node.trashed) trashBytes += node.size;
      else bytes += node.size;
    }
    return { files, folders, bytes, trashBytes };
  }

  exportTree(): SerializedFS {
    return this.serialize();
  }

  importTree(data: unknown, mode: "replace" | "merge" = "replace"): number {
    if (this.readOnly) return 0;
    const parsed = data as SerializedFS;
    if (!parsed || !Array.isArray(parsed.nodes)) throw new Error("Invalid WindOS filesystem archive");
    const valid = parsed.nodes.filter((n) => n && typeof n.id === "string" && typeof n.name === "string");
    if (mode === "replace") {
      this.nodes = {};
      for (const node of valid) this.nodes[node.id] = { ...node };
      if (!this.nodes[ROOT_ID]) this.seed();
    } else {
      for (const node of valid) {
        if (node.id === ROOT_ID) continue;
        if (this.nodes[node.id]) {
          const parent = this.byId(node.parentId) ? node.parentId! : ROOT_ID;
          this.add({
            name: this.uniqueName(parent, node.name),
            type: node.type,
            parentId: parent,
            content: node.content,
            mime: node.mime,
            size: node.size,
          });
        } else {
          this.nodes[node.id] = { ...node };
        }
      }
    }
    this.emit();
    return valid.length;
  }
}

export function mimeFromName(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    txt: "text/plain",
    md: "text/markdown",
    html: "text/html",
    htm: "text/html",
    css: "text/css",
    js: "text/javascript",
    ts: "text/typescript",
    tsx: "text/typescript",
    jsx: "text/javascript",
    json: "application/json",
    csv: "text/csv",
    svg: "image/svg+xml",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    mp4: "video/mp4",
    webm: "video/webm",
    pdf: "application/pdf",
    zip: "application/zip",
    exe: "application/x-msdownload",
    msi: "application/x-msi",
    appx: "application/appx",
  };
  return map[ext] ?? "application/octet-stream";
}

export function formatBytes(bytes: number, digits = 1): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : digits)} ${units[i]}`;
}

export function iconForFile(node: FSNode): string {
  if (node.type === "folder") return "folder";
  const ext = node.name.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return "image";
  if (["mp3", "wav", "ogg", "m4a"].includes(ext)) return "audio";
  if (["mp4", "webm", "mov"].includes(ext)) return "video";
  if (ext === "pdf") return "pdf";
  if (["zip", "7z", "rar"].includes(ext)) return "archive";
  if (["js", "ts", "tsx", "jsx", "html", "css", "json"].includes(ext)) return "code";
  if (["exe", "msi", "appx"].includes(ext)) return "executable";
  if (ext === "md" || ext === "txt") return "text";
  return "file";
}
