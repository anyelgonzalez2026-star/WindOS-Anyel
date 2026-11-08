import { useEffect, useRef, useState } from "react";
import { useOS } from "@/lib/os/store";
import { APP_MAP } from "@/lib/os/registry";
import { FEATURE_STATS } from "@/lib/os/features";
import { formatBytes } from "@/lib/os/fs";
import { formatDuration } from "@/lib/os/hooks";
import { cn } from "@/lib/utils";
import { Plus, Terminal as TerminalIcon, X } from "lucide-react";

type Line = { kind: "in" | "out" | "error" | "muted"; text: string };
interface Session {
  id: number;
  cwd: string;
  lines: Line[];
  history: string[];
}

const THEMES = {
  ink: { bg: "#0c1118", fg: "#dbe5f1", dim: "#7d8da3", accent: "#7dd3c7", error: "#f08a8a" },
  slate: { bg: "#f6f7f9", fg: "#1f2937", dim: "#6b7280", accent: "#4f5bd5", error: "#b42318" },
  amber: { bg: "#160f08", fg: "#f3d7a6", dim: "#a88a5c", accent: "#e8b45a", error: "#ef8a6a" },
};

const HELP = [
  "WindOS Shell — supported commands",
  "",
  "  help                     show this reference",
  "  clear                    clear the screen (Ctrl+L)",
  "  version                  WindOS and shell version",
  "  date / time              current date or time",
  "  whoami                   current display name",
  "  sysinfo                  platform and system summary",
  "  uptime                   session uptime",
  "  pwd                      print working directory",
  "  cd <path>                change directory (.. supported)",
  "  ls [path]                list directory contents",
  "  tree [path]              recursive listing",
  "  mkdir <path>             create a folder",
  "  touch <file>             create an empty file",
  "  cat <file>               print a file",
  "  write <file> <text>      create or overwrite a file",
  "  rename <file> <name>     rename a file or folder",
  "  cp <src> <folder>        copy into a folder",
  "  mv <src> <folder>        move into a folder",
  "  rm <path>                move to the Recycle Bin",
  "  find <query>             search names and contents",
  "  open <app|file>          launch an app or open a file",
  "  apps                     list installed applications",
  "  ps                       list processes",
  "  kill <pid>               end a process",
  "  df                       storage usage",
  "  theme <ink|slate|amber>  change terminal theme",
  "  neofetch                 WindOS system card",
  "  features                 feature registry summary",
  "  history                  command history",
  "  echo <text>              print text",
  "",
  "Paths refer to the virtual drive only. Host commands never execute.",
].join("\n");

export default function Terminal() {
  const os = useOS();
  const [sessions, setSessions] = useState<Session[]>([
    { id: 1, cwd: "root", lines: [{ kind: "muted", text: "WindOS Shell 1.0.0 · type 'help' for commands" }], history: [] },
  ]);
  const [activeId, setActiveId] = useState(1);
  const [input, setInput] = useState("");
  const [themeName, setThemeName] = useState<keyof typeof THEMES>("ink");
  const [histIndex, setHistIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const theme = THEMES[themeName];
  const session = sessions.find((s) => s.id === activeId) ?? sessions[0];

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [session.lines.length, activeId]);

  function updateSession(updater: (s: Session) => Session) {
    setSessions((prev) => prev.map((s) => (s.id === activeId ? updater(s) : s)));
  }

  function print(lines: Line[]) {
    updateSession((s) => ({ ...s, lines: [...s.lines, ...lines].slice(-600) }));
  }

  function addSession() {
    const id = Math.max(...sessions.map((s) => s.id)) + 1;
    setSessions((prev) => [...prev, { id, cwd: "root", lines: [{ kind: "muted", text: `Shell session ${id} ready.` }], history: [] }]);
    setActiveId(id);
  }

  function closeSession(id: number) {
    if (sessions.length <= 1) return;
    const remaining = sessions.filter((s) => s.id !== id);
    setSessions(remaining);
    if (activeId === id) setActiveId(remaining[0].id);
  }

  function resolve(target: string) {
    return os.fs.resolvePath(target, session.cwd);
  }

  async function execute(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const args = (trimmed.match(/(?:[^\s"]+|"[^"]*")+/g) ?? []).map((part) => part.replace(/^"|"$/g, ""));
    const command = args[0].toLowerCase();
    const rest = args.slice(1);
    const cwdPath = os.fs.pathOf(session.cwd);
    updateSession((s) => ({
      ...s,
      history: [...s.history, trimmed].slice(-200),
      lines: [...s.lines, { kind: "in" as const, text: `${cwdPath} $ ${trimmed}` }].slice(-600),
    }));
    setHistIndex(null);

    const out = (text: string) => print([{ kind: "out", text }]);
    const err = (text: string) => print([{ kind: "error", text }]);

    switch (command) {
      case "help":
        out(HELP);
        break;
      case "clear":
        updateSession((s) => ({ ...s, lines: [] }));
        break;
      case "version":
      case "ver":
        out("WindOS 1.0.0 · Shell 6.4.1 (virtual) · Build by Anyel Gonzalez");
        break;
      case "date":
        out(new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" }));
        break;
      case "time":
        out(new Date().toLocaleTimeString());
        break;
      case "whoami":
        out(`${os.settings.displayName}${os.guest ? " (guest)" : ""} · local profile`);
        break;
      case "sysinfo": {
        out([
          `WindOS        1.0.0`,
          `Shell         VirtualCommand 6.4.1`,
          `Engine        ${navigator.userAgent.includes("Firefox") ? "Gecko" : navigator.userAgent.includes("Safari") && !navigator.userAgent.includes("Chrome") ? "WebKit" : "Blink"}`,
          `Cores         ${navigator.hardwareConcurrency ?? "unknown"}`,
          `Language      ${navigator.language}`,
          `Timezone      ${Intl.DateTimeFormat().resolvedOptions().timeZone}`,
          `Pixel ratio   ${window.devicePixelRatio}`,
          `Display       ${window.innerWidth}×${window.innerHeight}`,
          `Storage       ${formatBytes(os.storage.usage)} used · ${formatBytes(os.storage.quota)} quota`,
          `Files         ${os.fs.usage().files} files, ${os.fs.usage().folders} folders`,
          `Apps          ${os.installed.length} installed`,
        ].join("\n"));
        break;
      }
      case "uptime":
        out(os.bootedAt ? `up ${formatDuration(Date.now() - os.bootedAt)} · ${os.processes.length} processes · ${os.windows.length} windows` : "not booted");
        break;
      case "pwd":
        out(cwdPath);
        break;
      case "cd": {
        if (!rest[0] || rest[0] === "~") {
          updateSession((s) => ({ ...s, cwd: "root" }));
          break;
        }
        const node = resolve(rest[0]);
        if (!node) err(`cd: no such directory: ${rest[0]}`);
        else if (node.type !== "folder") err(`cd: not a directory: ${rest[0]}`);
        else updateSession((s) => ({ ...s, cwd: node.id }));
        break;
      }
      case "ls":
      case "dir": {
        const target = rest[0] ? resolve(rest[0]) : os.fs.byId(session.cwd);
        if (!target) {
          err(`ls: no such path: ${rest[0]}`);
          break;
        }
        if (target.type === "file") {
          out(`${formatBytes(target.size).padStart(9)}  ${target.name}`);
          break;
        }
        const children = os.fs.children(target.id);
        if (!children.length) {
          out("(empty folder)");
          break;
        }
        out(children
          .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "folder" ? -1 : 1))
          .map((node) => `${node.type === "folder" ? "d" : "-"}  ${formatBytes(node.size).padStart(9)}  ${node.name}${node.favorite ? " *" : ""}`)
          .join("\n"));
        break;
      }
      case "tree": {
        const root = rest[0] ? resolve(rest[0]) : os.fs.byId(session.cwd);
        if (!root || root.type !== "folder") {
          err("tree: folder required");
          break;
        }
        const lines: string[] = [root.name];
        const walk = (id: string, prefix: string, depth: number) => {
          if (depth > 5) return;
          const children = os.fs.children(id);
          children.forEach((node, index) => {
            const last = index === children.length - 1;
            lines.push(`${prefix}${last ? "└─ " : "├─ "}${node.name}`);
            if (node.type === "folder") walk(node.id, `${prefix}${last ? "   " : "│  "}`, depth + 1);
          });
        };
        walk(root.id, "", 0);
        out(lines.slice(0, 220).join("\n"));
        break;
      }
      case "mkdir": {
        if (!rest[0]) {
          err("usage: mkdir <path>");
          break;
        }
        const clean = rest[0].replace(/^\/+/, "");
        const node = os.fs.ensureFolderPath(clean);
        if (node) out(`Created folder ${os.fs.pathOf(node.id)}`);
        else err("mkdir: read-only session");
        break;
      }
      case "touch": {
        if (!rest[0]) {
          err("usage: touch <file>");
          break;
        }
        const existing = resolve(rest[0]);
        if (existing) {
          out(`${existing.name} already exists`);
          break;
        }
        const parts = rest[0].replace(/^\/+/, "").split("/");
        const name = parts.pop() ?? "";
        const parent = parts.length ? os.fs.ensureFolderPath(parts.join("/")) : os.fs.byId(session.cwd);
        if (!parent) {
          err("touch: cannot resolve parent folder");
          break;
        }
        const node = os.fs.createFile(parent.id, name, "", "text/plain");
        if (node) out(`Created ${os.fs.pathOf(node.id)}`);
        else err("touch: read-only session");
        break;
      }
      case "cat": {
        const node = rest[0] ? resolve(rest[0]) : null;
        if (!node || node.type !== "file") {
          err(`cat: file not found: ${rest[0] ?? ""}`);
          break;
        }
        if (node.content?.startsWith("data:")) {
          out(`[binary file · ${formatBytes(node.size)} · ${node.mime ?? "unknown type"}]`);
          break;
        }
        out(node.content || "(empty file)");
        break;
      }
      case "write": {
        if (rest.length < 2) {
          err("usage: write <file> <text>");
          break;
        }
        const target = resolve(rest[0]);
        const content = rest.slice(1).join(" ");
        if (target?.type === "file") {
          if (os.fs.write(target.id, content)) out(`Wrote ${content.length} bytes to ${target.name}`);
          else err("write: read-only session");
          break;
        }
        const parent = os.fs.byId(session.cwd);
        if (!parent) {
          err("write: invalid working directory");
          break;
        }
        const created = os.fs.createFile(parent.id, rest[0], content, "text/plain");
        if (created) out(`Created ${created.name} (${content.length} bytes)`);
        else err("write: read-only session");
        break;
      }
      case "rename": {
        if (rest.length < 2) {
          err("usage: rename <path> <new name>");
          break;
        }
        const node = resolve(rest[0]);
        if (!node) {
          err("rename: not found");
          break;
        }
        if (os.fs.rename(node.id, rest[1])) out(`Renamed to ${rest[1]}`);
        else err("rename: failed (read-only or system item)");
        break;
      }
      case "cp":
      case "mv": {
        if (rest.length < 2) {
          err(`usage: ${command} <source> <destination folder>`);
          break;
        }
        const src = resolve(rest[0]);
        const dest = resolve(rest[1]);
        if (!src || !dest || dest.type !== "folder") {
          err(`${command}: source or destination folder not found`);
          break;
        }
        const ok = command === "cp" ? Boolean(os.fs.copy(src.id, dest.id)) : os.fs.move(src.id, dest.id);
        if (ok) out(`${command === "cp" ? "Copied" : "Moved"} ${src.name} → ${os.fs.pathOf(dest.id)}`);
        else err(`${command}: operation failed`);
        break;
      }
      case "rm":
      case "del": {
        const node = rest[0] ? resolve(rest[0]) : null;
        if (!node) {
          err("rm: path not found");
          break;
        }
        if (os.fs.trash(node.id)) out(`Moved ${node.name} to the Recycle Bin`);
        else err("rm: read-only session");
        break;
      }
      case "find": {
        if (!rest[0]) {
          err("usage: find <query>");
          break;
        }
        const results = os.fs.search(rest.join(" "));
        if (!results.length) out("No matches.");
        else out(results.slice(0, 40).map((node) => `${os.fs.pathOf(node.id)}${node.type === "folder" ? "/" : ""}`).join("\n"));
        break;
      }
      case "open":
      case "launch": {
        if (!rest[0]) {
          err("usage: open <app id | file path>");
          break;
        }
        const app = APP_MAP.get(rest[0]);
        if (app && os.isInstalled(app.id)) {
          os.openApp(app.id);
          out(`Launching ${app.name}…`);
          break;
        }
        const node = resolve(rest[0]);
        if (!node) {
          err(`open: no app or file named '${rest[0]}'`);
          break;
        }
        if (node.type === "folder") {
          os.openApp("files", { folderId: node.id });
          out(`Opening ${node.name} in WindFiles…`);
        } else {
          os.openApp(node.name.endsWith(".md") || node.name.endsWith(".txt") ? "notes" : "code", { openId: node.id });
          out(`Opening ${node.name}…`);
        }
        break;
      }
      case "apps": {
        const list = os.installed
          .map((entry) => APP_MAP.get(entry.id))
          .filter(Boolean)
          .map((app) => `${app!.id.padEnd(18)} ${app!.version.padEnd(8)} ${app!.name}`);
        out(list.join("\n"));
        break;
      }
      case "ps": {
        out(os.processes.map((proc) => `${String(proc.pid).padStart(5)}  ${proc.system ? "sys" : "app"}  ${String(proc.cpu).padStart(3)}%  ${String(proc.memory).padStart(4)}MB  ${proc.name}`).join("\n") || "No processes.");
        break;
      }
      case "kill": {
        const pid = parseInt(rest[0] ?? "", 10);
        if (!pid) {
          err("usage: kill <pid>");
          break;
        }
        const proc = os.processes.find((p) => p.pid === pid);
        if (!proc) {
          err(`kill: no such process ${pid}`);
          break;
        }
        os.killProcess(pid);
        out(proc.system ? `${proc.name} is protected.` : `Sent terminate to ${proc.name} (${pid}).`);
        break;
      }
      case "df": {
        const usage = os.fs.usage();
        out(`Virtual drive   512 MB capacity\nUsed            ${formatBytes(usage.bytes)}\nRecycle Bin     ${formatBytes(usage.trashBytes)}\nFiles           ${usage.files}\nFolders         ${usage.folders}\nIndexedDB       ${formatBytes(os.storage.usage)} real usage`);
        break;
      }
      case "theme": {
        const name = (rest[0] ?? "").toLowerCase();
        if (name in THEMES) {
          setThemeName(name as keyof typeof THEMES);
          out(`Terminal theme set to ${name}.`);
        } else {
          err("usage: theme <ink|slate|amber>");
        }
        break;
      }
      case "neofetch":
        out([
          "        ▄▄▄▄▄▄        " + `${os.settings.displayName}@windos`,
          "     ▄██████████▄     " + "------------------",
          "    ███▀      ▀███    " + "OS: WindOS 1.0.0",
          "   ███   ████   ███   " + "Shell: VirtualCommand 6.4.1",
          "   ███   ████   ███   " + `Uptime: ${os.bootedAt ? formatDuration(Date.now() - os.bootedAt) : "0:00"}`,
          "    ███▄      ▄███    " + `Apps: ${os.installed.length} installed`,
          "     ▀██████████▀     " + `Files: ${os.fs.usage().files}`,
          "        ▀▀▀▀▀▀        " + `Theme: ${os.settings.theme} · ${themeName}`,
        ].join("\n"));
        break;
      case "features":
        out(`${FEATURE_STATS.total} registered capabilities\n${FEATURE_STATS.categories} categories\n${FEATURE_STATS.implemented} implemented\n${FEATURE_STATS.limited} limited (documented)\n${FEATURE_STATS.verified} verified`);
        break;
      case "history":
        out(session.history.length ? session.history.map((item, index) => `${String(index + 1).padStart(3)}  ${item}`).join("\n") : "(no history yet)");
        break;
      case "echo":
        out(rest.join(" "));
        break;
      case "exit":
        out("This is a simulated shell; close the window to end the session.");
        break;
      default:
        err(`Unknown command: ${command}. Type 'help' for the command list.`);
    }
  }

  function autocomplete() {
    const words = input.split(" ");
    const trailing = input.endsWith(" ");
    const commands = ["help", "clear", "version", "date", "time", "whoami", "sysinfo", "uptime", "pwd", "cd", "ls", "tree", "mkdir", "touch", "cat", "write", "rename", "cp", "mv", "rm", "find", "open", "apps", "ps", "kill", "df", "theme", "neofetch", "features", "history", "echo"];
    if (words.length === 1 && !trailing) {
      const match = commands.filter((cmd) => cmd.startsWith(input.toLowerCase())).sort()[0];
      if (match) setInput(match + " ");
      return;
    }
    const partial = trailing ? "" : words[words.length - 1];
    const base = trailing ? input : input.slice(0, input.length - partial.length);
    const parent = os.fs.byId(session.cwd);
    if (!parent) return;
    const match = os.fs
      .children(parent.id)
      .map((node) => node.name + (node.type === "folder" ? "/" : ""))
      .filter((name) => name.toLowerCase().startsWith(partial.toLowerCase()))
      .sort()[0];
    if (match) setInput(base + match);
  }

  return (
    <div className="flex h-full flex-col" style={{ background: theme.bg, color: theme.fg }}>
      <div className="flex items-center gap-1 border-b px-2 py-1.5" style={{ borderColor: `${theme.fg}18` }}>
        <TerminalIcon className="mr-1 size-3.5" style={{ color: theme.accent }} />
        <p className="mr-2 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: theme.dim }}>WindTerminal</p>
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
          {sessions.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveId(item.id)}
              className="group flex shrink-0 items-center gap-1.5 rounded px-2 py-1 text-[10px] transition"
              style={{ background: item.id === activeId ? `${theme.fg}12` : "transparent", color: item.id === activeId ? theme.fg : theme.dim }}
            >
              session {item.id}
              {sessions.length > 1 && (
                <span
                  role="button"
                  tabIndex={0}
                  className="rounded p-0.5 opacity-0 transition group-hover:opacity-100"
                  onClick={(event) => { event.stopPropagation(); closeSession(item.id); }}
                  onKeyDown={(event) => { if (event.key === "Enter") closeSession(item.id); }}
                >
                  <X className="size-2.5" />
                </span>
              )}
            </button>
          ))}
          <button className="rounded p-1 transition hover:opacity-80" onClick={addSession} title="New session" style={{ color: theme.dim }}>
            <Plus className="size-3" />
          </button>
        </div>
        <select
          value={themeName}
          onChange={(event) => setThemeName(event.target.value as keyof typeof THEMES)}
          className="rounded border bg-transparent px-1 py-0.5 text-[9.5px] outline-none"
          style={{ borderColor: `${theme.fg}22`, color: theme.dim }}
          aria-label="Terminal theme"
        >
          <option value="ink">ink</option>
          <option value="slate">slate</option>
          <option value="amber">amber</option>
        </select>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-3 font-mono text-[11.5px] leading-relaxed" onClick={() => inputRef.current?.focus()}>
        {session.lines.map((line, index) => (
          <pre
            key={index}
            className="whitespace-pre-wrap break-words font-mono"
            style={{ color: line.kind === "error" ? theme.error : line.kind === "muted" ? theme.dim : line.kind === "in" ? theme.accent : theme.fg }}
          >
            {line.text}
          </pre>
        ))}
        <div className="mt-1 flex items-center gap-2 font-mono">
          <span style={{ color: theme.accent }}>{os.fs.pathOf(session.cwd)} $</span>
          <input
            ref={inputRef}
            autoFocus
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void execute(input);
                setInput("");
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                const history = session.history;
                if (!history.length) return;
                const next = histIndex === null ? history.length - 1 : Math.max(0, histIndex - 1);
                setHistIndex(next);
                setInput(history[next] ?? "");
              } else if (event.key === "ArrowDown") {
                event.preventDefault();
                if (histIndex === null) return;
                const next = histIndex + 1;
                if (next >= session.history.length) {
                  setHistIndex(null);
                  setInput("");
                } else {
                  setHistIndex(next);
                  setInput(session.history[next] ?? "");
                }
              } else if (event.key === "Tab") {
                event.preventDefault();
                autocomplete();
              } else if (event.key === "l" && event.ctrlKey) {
                event.preventDefault();
                updateSession((s) => ({ ...s, lines: [] }));
              } else if (event.key === "c" && event.ctrlKey) {
                event.preventDefault();
                updateSession((s) => ({ ...s, lines: [...s.lines, { kind: "muted", text: "^C" }] }));
                setInput("");
              }
            }}
            className="flex-1 bg-transparent font-mono text-[11.5px] outline-none"
            style={{ color: theme.fg }}
            aria-label="Terminal command input"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </div>

      <div className="flex items-center justify-between border-t px-3 py-1.5 text-[9px]" style={{ borderColor: `${theme.fg}18`, color: theme.dim }}>
        <span>Virtual drive only · Tab completes · ↑↓ history · Ctrl+L clear</span>
        <span>{session.lines.length} lines · session {session.id}</span>
      </div>
    </div>
  );
}
