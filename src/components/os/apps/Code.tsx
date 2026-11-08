import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOS } from "@/lib/os/store";
import { iconForFile } from "@/lib/os/fs";
import { cn } from "@/lib/utils";
import { AppShell, EmptyState, GhostButton, PrimaryButton, inputClass } from "./ui";
import {
  Braces,
  ChevronDown,
  ChevronRight,
  Circle,
  Code2,
  FileCode2,
  FilePlus2,
  FolderOpen,
  Moon,
  Play,
  Save,
  Search,
  Sun,
  Terminal as TerminalIcon,
  X,
} from "lucide-react";

interface Tab {
  id: string;
  name: string;
  content: string;
  dirty: boolean;
}

const LANG: Record<string, string> = { html: "html", htm: "html", css: "css", js: "javascript", ts: "typescript", tsx: "typescript", jsx: "javascript", json: "json", md: "markdown", svg: "html" };

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function highlight(code: string, language: string, marks: number[] = []): string {
  let text = code;
  if (marks.length) {
    const sorted = [...new Set(marks)].sort((a, b) => b - a);
    for (const position of sorted) {
      if (position < 0 || position >= text.length) continue;
      text = `${text.slice(0, position)}\u0001${text[position]}\u0002${text.slice(position + 1)}`;
    }
  }
  let html = escapeHtml(text);
  const keywords = /\b(const|let|var|function|return|if|else|for|while|new|class|extends|import|export|from|default|async|await|try|catch|finally|throw|typeof|instanceof|this|super|null|undefined|true|false|interface|type|enum|public|private|static|void)\b/g;
  html = html
    .replace(/(&lt;!--[\s\S]*?--&gt;|\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g, '<span class="tok-comment">$1</span>')
    .replace(/(&quot;[^&\n]*?&quot;|&#39;[^&\n]*?&#39;|`[^`]*`)/g, '<span class="tok-string">$1</span>')
    .replace(/\b(\d+(\.\d+)?)\b/g, '<span class="tok-number">$1</span>')
    .replace(keywords, '<span class="tok-keyword">$1</span>')
    .replace(/(\.[a-zA-Z_][\w-]*)/g, '<span class="tok-prop">$1</span>');
  if (language === "html") html = html.replace(/(&lt;\/?)([a-zA-Z][\w-]*)/g, '$1<span class="tok-tag">$2</span>');
  if (language === "css") html = html.replace(/(^|\n)([^{}\n]+)(\{)/g, '$1<span class="tok-selector">$2</span>$3');
  return html.replace(/\u0001/g, '<span class="tok-bracket-match">').replace(/\u0002/g, "</span>");
}

function findMatch(source: string, caret: number): { open: number; close: number } | null {
  const pairs: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
  const reverse: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  const candidates = [caret - 1, caret];
  for (const index of candidates) {
    const char = source[index];
    if (!char) continue;
    if (pairs[char]) {
      let depth = 0;
      for (let i = index; i < source.length; i++) {
        if (source[i] === char) depth++;
        else if (source[i] === pairs[char]) {
          depth--;
          if (depth === 0) return { open: index, close: i };
        }
      }
    }
    if (reverse[char]) {
      let depth = 0;
      for (let i = index; i >= 0; i--) {
        if (source[i] === char) depth++;
        else if (source[i] === reverse[char]) {
          depth--;
          if (depth === 0) return { open: i, close: index };
        }
      }
    }
  }
  return null;
}

function blockRange(lines: string[], start: number): number {
  let depth = 0;
  let seen = false;
  for (let index = start; index < lines.length; index++) {
    for (const char of lines[index]) {
      if (char === "{") { depth++; seen = true; }
      if (char === "}") depth--;
    }
    if (seen && depth <= 0) return index;
  }
  return start;
}

function buildPreview(fs: ReturnType<typeof useOS>["fs"], folderId: string, activeId: string): string {
  const htmlNode = fs.children(folderId).find((node) => node.name === "index.html");
  const fallback = fs.byId(activeId);
  const html = htmlNode?.content ?? (fallback && fallback.name.endsWith(".html") ? fallback.content : null);
  if (!html) {
    const active = fallback;
    if (active && active.name.endsWith(".css")) {
      return `<!doctype html><html><head><style>${active.content ?? ""}</style></head><body><h1>CSS preview</h1><p>Styles from ${active.name} are applied.</p></body></html>`;
    }
    if (active && active.name.endsWith(".js")) {
      return `<!doctype html><html><head><style>body{font-family:system-ui;padding:24px;background:#0f172a;color:#e2e8f0}</style></head><body><h3>Console output</h3><pre id="out"></pre><script>const out=document.getElementById("out");console.log=((orig)=>function(...args){out.textContent+=args.map(String).join(" ")+"\\n";orig(...args)})(console.log);try{eval(${JSON.stringify(active.content ?? "")})}catch(e){out.textContent+="Error: "+e.message}</script></body></html>`;
    }
    return "<!doctype html><html><body style='font-family:system-ui;padding:32px;color:#64748b'><h2>Nothing to preview</h2><p>Open an HTML file or add index.html to this project folder.</p></body></html>";
  }
  const replaced = html
    .replace(/<link[^>]*href=["']([^"']+\.css)["'][^>]*>/gi, (match, href: string) => {
      const node = fs.children(folderId).find((n) => n.name === href || n.name === href.replace("./", ""));
      return node?.content ? `<style>${node.content}</style>` : match;
    })
    .replace(/<script[^>]*src=["']([^"']+\.(?:js|jsx|ts))["'][^>]*><\/script>/gi, (match, src: string) => {
      const node = fs.children(folderId).find((n) => n.name === src || n.name === src.replace("./", ""));
      return node?.content ? `<script>${node.content.replace(/<\/script>/gi, "<\\/script>")}</script>` : match;
    });
  const consoleHook = `<script>
    (function(){
      var send=function(level,args){try{parent.postMessage({__windcode:true,level:level,args:Array.prototype.map.call(args,function(a){try{return typeof a==='object'?JSON.stringify(a):String(a)}catch(e){return String(a)}})},'*')}catch(e){}};
      ['log','warn','error','info'].forEach(function(level){var original=console[level];console[level]=function(){send(level,arguments);original.apply(console,arguments)}});
      window.addEventListener('error',function(event){parent.postMessage({__windcode:true,level:'error',args:[event.message+' (line '+(event.lineno||'?')+')']},'*')});
    })();
  </script>`;
  return replaced.replace("<head>", `<head>${consoleHook}`).replace("<HEAD>", `<HEAD>${consoleHook}`);
}

export default function Code({ payload }: { payload?: Record<string, unknown> }) {
  const os = useOS();
  const payloadId = typeof payload?.openId === "string" ? payload.openId : null;
  const initialNode = payloadId ? os.fs.byId(payloadId) : undefined;
  const initialFolder = initialNode?.parentId && os.fs.byId(initialNode.parentId)?.type === "folder" ? initialNode.parentId : "folder_hello";
  const projects = os.fs.children("folder_projects").filter((node) => node.type === "folder");
  const [folderId, setFolderId] = useState(initialFolder);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [showPreview, setShowPreview] = useState(true);
  const [showConsole, setShowConsole] = useState(true);
  const [logs, setLogs] = useState<{ level: string; text: string }[]>([]);
  const [previewKey, setPreviewKey] = useState(0);
  const [editorTheme, setEditorTheme] = useState<"light" | "dark">(os.settings.theme);
  const [newName, setNewName] = useState("");
  const [fold, setFold] = useState<{ start: number; end: number } | null>(null);
  const [bracket, setBracket] = useState<{ open: number; close: number } | null>(null);
  const [caret, setCaret] = useState({ line: 1, column: 1 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const active = tabs.find((tab) => tab.id === activeId) ?? null;

  const openFile = useCallback((id: string) => {
    const node = os.fs.byId(id);
    if (!node || node.type !== "file") return;
    setTabs((prev) => {
      if (prev.some((tab) => tab.id === id)) return prev;
      return [...prev, { id, name: node.name, content: node.content ?? "", dirty: false }];
    });
    setActiveId(id);
  }, [os.fs]);

  useEffect(() => {
    if (initialNode?.type === "file") {
      openFile(initialNode.id);
    } else {
      const first = os.fs.children(initialFolder).find((node) => node.name === "index.html") ?? os.fs.children(initialFolder).find((node) => node.type === "file");
      if (first) openFile(first.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data as { __windcode?: boolean; level?: string; args?: string[] };
      if (!data || !data.__windcode) return;
      setLogs((prev) => [...prev.slice(-80), { level: data.level ?? "log", text: (data.args ?? []).join(" ") }]);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const folderFiles = os.fs.children(folderId).filter((node) => node.type === "file" && /\.(html|css|js|ts|tsx|jsx|json|md|svg)$/i.test(node.name));
  const isMarkup = active?.name.match(/\.(html|htm)$/i);

  const previewDoc = useMemo(() => {
    if (!active) return "";
    return buildPreview(os.fs, folderId, active.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id, active?.content, folderId, previewKey, os.fsVersion]);

  function updateActive(content: string) {
    if (!activeId) return;
    setTabs((prev) => prev.map((tab) => (tab.id === activeId ? { ...tab, content, dirty: tab.content !== content } : tab)));
  }

  function save() {
    if (!active) return;
    if (os.fs.write(active.id, active.content)) {
      setTabs((prev) => prev.map((tab) => (tab.id === active.id ? { ...tab, dirty: false } : tab)));
      os.notify({ appId: "WindOS", title: "File saved", body: `${active.name} was written to the virtual drive.` });
    } else {
      os.notify({ appId: "WindOS", title: "Save failed", body: "The drive is read-only in guest mode." });
    }
  }

  function createFile() {
    const name = newName.trim();
    if (!name) return;
    const node = os.fs.createFile(folderId, name, "", "text/plain");
    if (node) {
      openFile(node.id);
      setNewName("");
    }
  }

  function replaceAll() {
    if (!active || !query) return;
    const next = active.content.split(query).join(replacement);
    updateActive(next);
    os.notify({ appId: "WindCode", title: "Replaced", body: `${active.content.split(query).length - 1} occurrences replaced.` });
  }

  const language = active ? LANG[active.name.split(".").pop()?.toLowerCase() ?? ""] ?? "text" : "text";
  const lines = active?.content.split("\n") ?? [];
  const match = active ? findMatch(active.content, textareaRef.current?.selectionStart ?? 0) : null;
  const bracketMarks = match ? [match.open, match.close] : [];
  const highlighted = active ? highlight(active.content, language, bracketMarks) : "";
  const lineHeight = 20;

  function handleCaret() {
    const textarea = textareaRef.current;
    if (!textarea || !active) return;
    const position = textarea.selectionStart;
    const before = active.content.slice(0, position);
    const line = before.split("\n").length;
    const column = position - before.lastIndexOf("\n");
    setCaret({ line, column });
    setBracket(findMatch(active.content, position));
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    const textarea = textareaRef.current;
    if (!textarea || !active) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      save();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
      event.preventDefault();
      setShowSearch(true);
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      runPreview();
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      const position = textarea.selectionStart;
      const next = `${active.content.slice(0, position)}  ${active.content.slice(textarea.selectionEnd)}`;
      updateActive(next);
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = position + 2;
        handleCaret();
      });
      return;
    }
    if (event.key === "Enter") {
      const position = textarea.selectionStart;
      const currentLine = active.content.slice(active.content.lastIndexOf("\n", position - 1) + 1, position);
      const indent = currentLine.match(/^\s*/)?.[0] ?? "";
      const extra = /[{[(]$/.test(currentLine.trim()) ? "  " : "";
      if (indent || extra) {
        event.preventDefault();
        const insert = `\n${indent}${extra}`;
        const next = active.content.slice(0, position) + insert + active.content.slice(position);
        updateActive(next);
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = position + insert.length;
          handleCaret();
        });
      }
    }
  }

  function runPreview() {
    setLogs([]);
    setPreviewKey((key) => key + 1);
    setShowPreview(true);
    setShowConsole(true);
    setLogs([{ level: "info", text: `Running ${active?.name ?? "project"} in a sandboxed iframe…` }]);
  }

  const editorBg = editorTheme === "dark" ? "bg-[#0d1420]" : "bg-[#fbfcfe]";
  const editorText = editorTheme === "dark" ? "text-[#dbe5f1]" : "text-[#1f2937]";

  return (
    <AppShell>
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border/60 px-3 py-2">
        <Code2 className="size-4 text-primary" />
        <p className="mr-2 text-[12px] font-semibold">WindCode</p>
        <select
          value={folderId}
          onChange={(event) => {
            setFolderId(event.target.value);
            setTabs([]);
            setActiveId(null);
          }}
          className="h-7 max-w-[180px] rounded-md border border-border bg-background px-1.5 text-[10.5px] outline-none"
          aria-label="Project folder"
        >
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          {!projects.some((project) => project.id === folderId) && <option value={folderId}>{os.fs.byId(folderId)?.name ?? "Project"}</option>}
        </select>
        <span className="text-[9px] text-muted-foreground">{folderFiles.length} files</span>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          <button className={cn("flex h-7 items-center gap-1 rounded-md px-2 text-[10px]", showSearch ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-muted")} onClick={() => setShowSearch((v) => !v)}><Search className="size-3" /> Find</button>
          <button className={cn("flex h-7 items-center gap-1 rounded-md px-2 text-[10px]", showPreview ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-muted")} onClick={() => setShowPreview((v) => !v)}><Play className="size-3" /> Preview</button>
          <button className={cn("flex h-7 items-center gap-1 rounded-md px-2 text-[10px]", showConsole ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-muted")} onClick={() => setShowConsole((v) => !v)}><TerminalIcon className="size-3" /> Console</button>
          <button className="flex h-7 items-center gap-1 rounded-md px-2 text-[10px] text-muted-foreground hover:bg-muted" onClick={() => setEditorTheme((theme) => (theme === "dark" ? "light" : "dark"))}>
            {editorTheme === "dark" ? <Sun className="size-3" /> : <Moon className="size-3" />} Theme
          </button>
          <PrimaryButton onClick={runPreview}><Play className="size-3.5" /> Run</PrimaryButton>
          <GhostButton onClick={save} disabled={!active?.dirty}><Save className="size-3.5" /> Save</GhostButton>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[168px] shrink-0 flex-col border-r border-border/60 bg-muted/15 sm:flex">
          <div className="flex items-center gap-1.5 border-b border-border/60 px-2 py-1.5">
            <FolderOpen className="size-3.5 text-amber-500" />
            <span className="truncate text-[10px] font-semibold">{os.fs.byId(folderId)?.name ?? "Project"}</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-1">
            {folderFiles.map((node) => (
              <button
                key={node.id}
                onClick={() => openFile(node.id)}
                className={cn(
                  "flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-[10.5px] transition",
                  activeId === node.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <FileCode2 className="size-3 shrink-0" />
                <span className="truncate">{node.name}</span>
                {tabs.find((tab) => tab.id === node.id)?.dirty && <Circle className="ml-auto size-1.5 fill-current" />}
              </button>
            ))}
            {folderFiles.length === 0 && <p className="px-2 py-3 text-[9.5px] text-muted-foreground">No editable files in this folder.</p>}
          </div>
          <div className="border-t border-border/60 p-1.5">
            <div className="flex items-center gap-1">
              <input value={newName} onChange={(event) => setNewName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && createFile()} placeholder="new-file.js" className="h-6 min-w-0 flex-1 rounded border border-border bg-background px-1 text-[9.5px] outline-none" />
              <button className="flex size-6 items-center justify-center rounded border border-border hover:bg-muted" onClick={createFile} aria-label="Create file"><FilePlus2 className="size-3" /></button>
            </div>
            <p className="mt-1.5 text-[8.5px] text-muted-foreground">Files save to the virtual drive.</p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-stretch overflow-x-auto border-b border-border/60 bg-muted/20">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={cn(
                  "group flex max-w-[190px] shrink-0 items-center gap-1.5 border-r border-border/50 px-2 py-1.5 text-[10.5px] transition",
                  activeId === tab.id ? "bg-background font-medium" : "text-muted-foreground hover:bg-background/50",
                )}
              >
                <button className="flex min-w-0 items-center gap-1.5" onClick={() => setActiveId(tab.id)}>
                  <FileCode2 className="size-3 shrink-0" />
                  <span className="truncate">{tab.name}</span>
                  {tab.dirty && <Circle className="size-1.5 shrink-0 fill-current text-amber-500" />}
                </button>
                <button
                  className="rounded p-0.5 opacity-0 transition group-hover:opacity-100"
                  onClick={() => {
                    setTabs((prev) => prev.filter((item) => item.id !== tab.id));
                    if (activeId === tab.id) setActiveId(tabs.filter((item) => item.id !== tab.id)[0]?.id ?? null);
                  }}
                  aria-label={`Close ${tab.name}`}
                >
                  <X className="size-2.5" />
                </button>
              </div>
            ))}
            {tabs.length === 0 && <span className="px-3 py-2 text-[10px] text-muted-foreground">Open a file from the explorer</span>}
          </div>

          {showSearch && (
            <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-border/60 bg-muted/30 px-2 py-1.5">
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find" className="h-6 w-36 rounded border border-border bg-background px-1.5 text-[10px] outline-none" />
              <input value={replacement} onChange={(event) => setReplacement(event.target.value)} placeholder="Replace with" className="h-6 w-36 rounded border border-border bg-background px-1.5 text-[10px] outline-none" />
              <span className="text-[9px] text-muted-foreground">{query && active ? `${active.content.split(query).length - 1} matches` : "case-sensitive"}</span>
              <button className="rounded border border-border px-1.5 py-0.5 text-[9.5px] hover:bg-muted" disabled={!query} onClick={replaceAll}>Replace all</button>
              <button className="ml-auto rounded p-1 text-muted-foreground hover:bg-muted" onClick={() => setShowSearch(false)}><X className="size-3" /></button>
            </div>
          )}

          <div className={cn("relative flex min-h-0 flex-1", editorBg, editorText)}>
            {active ? (
              <>
                <div ref={gutterRef} className={cn("w-11 shrink-0 overflow-hidden border-r border-border/30 py-2 text-right font-mono text-[10px] leading-[20px]", editorTheme === "dark" ? "text-white/25" : "text-black/25")}>
                  {lines.map((_, index) => {
                    const canFold = lines[index].includes("{") && blockRange(lines, index) > index;
                    const end = canFold ? blockRange(lines, index) : index;
                    const folded = fold?.start === index;
                    return (
                      <div key={index} className="flex items-center justify-end gap-0.5 pr-1.5">
                        {canFold ? (
                          <button
                            className="rounded-sm p-[1px] opacity-60 hover:bg-white/10 hover:opacity-100"
                            onClick={() => setFold(folded ? null : { start: index, end })}
                            aria-label={folded ? "Unfold block" : "Fold block"}
                          >
                            {folded ? <ChevronRight className="size-2.5" /> : <ChevronDown className="size-2.5" />}
                          </button>
                        ) : <span className="size-2.5" />}
                        <span>{index + 1}</span>
                      </div>
                    );
                  })}
                </div>

                {fold ? (
                  <div className="min-h-0 flex-1 overflow-auto">
                    <pre className="whitespace-pre px-3 py-2 font-mono text-[12px] leading-[20px]" dangerouslySetInnerHTML={{ __html: lines.slice(0, fold.start + 1).map((line) => highlight(line, language)).join("\n") }} />
                    <button
                      className="mx-3 my-1 flex w-[calc(100%-24px)] items-center gap-2 rounded border border-dashed border-primary/40 bg-primary/5 px-2 py-1 text-left text-[10px] text-primary"
                      onClick={() => setFold(null)}
                    >
                      <Braces className="size-3" /> {fold.end - fold.start} lines folded · click to unfold
                    </button>
                    <pre className="whitespace-pre px-3 font-mono text-[12px] leading-[20px]" dangerouslySetInnerHTML={{ __html: lines.slice(fold.end + 1).map((line) => highlight(line, language)).join("\n") }} />
                  </div>
                ) : (
                  <div className="relative min-h-0 flex-1">
                    <pre
                      ref={preRef}
                      aria-hidden
                      className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre px-3 py-2 font-mono text-[12px] leading-[20px]"
                      dangerouslySetInnerHTML={{ __html: `${highlighted}\n` }}
                    />
                    <textarea
                      ref={textareaRef}
                      value={active.content}
                      onChange={(event) => updateActive(event.target.value)}
                      onKeyDown={onKeyDown}
                      onKeyUp={handleCaret}
                      onClick={handleCaret}
                      onScroll={(event) => {
                        if (preRef.current) {
                          preRef.current.scrollTop = event.currentTarget.scrollTop;
                          preRef.current.scrollLeft = event.currentTarget.scrollLeft;
                        }
                        if (gutterRef.current) gutterRef.current.scrollTop = event.currentTarget.scrollTop;
                      }}
                      wrap="off"
                      spellCheck={false}
                      className="code-textarea absolute inset-0 h-full w-full resize-none overflow-auto whitespace-pre bg-transparent px-3 py-2 font-mono text-[12px] leading-[20px] outline-none"
                      style={{ caretColor: editorTheme === "dark" ? "#7dd3c7" : "#1f2937" }}
                      aria-label="Code editor"
                    />
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                icon={Code2}
                title="No file open"
                body="Choose a file from the explorer, or create a new one in the current project folder."
                action={<GhostButton onClick={() => openFile(folderFiles[0]?.id ?? "")} disabled={!folderFiles[0]}>Open {folderFiles[0]?.name ?? "a file"}</GhostButton>}
              />
            )}
          </div>

          {active && (
            <div className="flex shrink-0 items-center justify-between border-t border-border/60 bg-muted/20 px-3 py-1 text-[9px] text-muted-foreground">
              <span>{language} · {lines.length} lines · Ln {caret.line}, Col {caret.column} · {active.dirty ? "unsaved changes" : "saved"}</span>
              <span className={cn("flex items-center gap-1", bracket ? "text-primary" : "")}>
                <Braces className="size-2.5" />
                {bracket ? `matching bracket at ${active.content.slice(0, bracket.open).split("\n").length}:${bracket.open - active.content.lastIndexOf("\n", bracket.open)}` : "no bracket at caret"}
              </span>
            </div>
          )}

          {(showPreview || showConsole) && active && (
            <div className="flex h-[240px] shrink-0 border-t border-border/60">
              {showPreview && (
                <div className="flex min-w-0 flex-1 flex-col border-r border-border/60">
                  <div className="flex items-center gap-2 border-b border-border/60 bg-muted/30 px-2 py-1">
                    <Play className="size-3 text-emerald-500" />
                    <span className="text-[9.5px] font-medium">Sandboxed preview</span>
                    <span className="rounded bg-muted px-1 py-0.5 text-[8px] text-muted-foreground">allow-scripts · no same-origin</span>
                    <button className="ml-auto rounded px-1.5 py-0.5 text-[9px] text-muted-foreground hover:bg-muted" onClick={runPreview}>Reload</button>
                    <button className="rounded px-1 py-0.5 text-[9px] text-muted-foreground hover:bg-muted" onClick={() => setShowPreview(false)}><X className="size-3" /></button>
                  </div>
                  <iframe
                    key={previewKey}
                    title="WindCode preview"
                    sandbox="allow-scripts allow-forms allow-popups"
                    srcDoc={previewDoc}
                    className="min-h-0 flex-1 bg-white"
                  />
                </div>
              )}
              {showConsole && (
                <div className="flex w-[42%] min-w-[180px] flex-col bg-[#0d1420] text-[#dbe5f1]">
                  <div className="flex items-center gap-2 border-b border-white/10 px-2 py-1">
                    <TerminalIcon className="size-3 text-teal-300" />
                    <span className="text-[9.5px] font-medium">Preview console</span>
                    <button className="ml-auto rounded px-1 py-0.5 text-[9px] text-white/40 hover:bg-white/10" onClick={() => setLogs([])}>Clear</button>
                    <button className="rounded px-1 py-0.5 text-[9px] text-white/40 hover:bg-white/10" onClick={() => setShowConsole(false)}><X className="size-3" /></button>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto px-2 py-1.5 font-mono text-[10px] leading-relaxed">
                    {logs.length === 0 ? (
                      <p className="text-white/30">Console output from the sandbox appears here. Try console.log("hello").</p>
                    ) : logs.map((log, index) => (
                      <p key={index} className={cn(log.level === "error" ? "text-red-300" : log.level === "warn" ? "text-amber-300" : log.level === "info" ? "text-teal-300" : "text-white/80")}>
                        <span className="mr-1 text-white/25">{log.level}</span>{log.text}
                      </p>
                    ))}
                  </div>
                  <div className="border-t border-white/10 px-2 py-1 text-[8.5px] text-white/30">Errors arrive via window.onerror. Scripts run sandboxed.</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-border/60 px-3 py-1 text-[9px] text-muted-foreground">
        <span>Ctrl+S save · Ctrl+Enter run · Ctrl+F find · Tab indent</span>
        <span>{isMarkup ? "HTML project" : "Sandbox execution"} · {tabs.length} open tab{tabs.length === 1 ? "" : "s"}</span>
      </div>
    </AppShell>
  );
}
