export interface HelpTopic {
  id: string;
  title: string;
  category: string;
  body: string;
  tags: string[];
}

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: "getting-started",
    title: "Getting started with WindOS",
    category: "Basics",
    body: "Click Start (or press the meta key) to see every installed app. Open apps from the desktop, taskbar or with Ctrl+Space search. Windows can be dragged by the title bar, resized from any edge, snapped to the left or right half, and maximised by double-clicking the title bar. Everything you create is stored locally in this browser.",
    tags: ["start", "windows", "desktop", "first steps"],
  },
  {
    id: "files",
    title: "Working with WindFiles",
    category: "Basics",
    body: "WindFiles shows the whole virtual drive. Right-click or use the toolbar to create folders and files, rename, copy, cut and paste. Deleted items go to the Recycle Bin and can be restored. The sidebar exposes favourites, recent files, the Recycle Bin and the Data (D:) drive. Use Export to download a file to your real computer and Import to bring one in.",
    tags: ["files", "drive", "copy", "recycle"],
  },
  {
    id: "filesystem",
    title: "How the virtual filesystem works",
    category: "Storage",
    body: "The filesystem is stored in IndexedDB under the windos-store database. Every app that reads or writes files uses the same tree, so a Markdown note opened in WindNotes is the same file WindCode sees. Writes are debounced and saved automatically. If IndexedDB is blocked (some private windows), WindOS keeps the tree in memory and warns you that the session is not persistent.",
    tags: ["indexeddb", "storage", "persistence"],
  },
  {
    id: "backup",
    title: "Backing up and restoring",
    category: "Storage",
    body: "WindBackup builds a JSON archive containing settings, the virtual drive, installed packages, permissions and clipboard history. Download it, then import it later in replace or merge mode. Restore points in WindRecovery capture the same data locally without downloading anything. Archives carry a checksum so you can verify integrity.",
    tags: ["backup", "restore", "import", "export"],
  },
  {
    id: "permissions",
    title: "Permissions and privacy",
    category: "Security",
    body: "Camera, microphone, notifications, clipboard, screen capture and storage are gated by the WindOS permission system. The first sensitive request opens an in-OS prompt that names the app and capability. You can review and revoke grants in WindSecurity or Settings. WindOS never claims antivirus, firewall or host-level malware protection — it is a browser application.",
    tags: ["permissions", "camera", "microphone", "privacy"],
  },
  {
    id: "browser",
    title: "Browsing safely with WindBrowser",
    category: "Internet",
    body: "WindBrowser validates URLs and blocks javascript: and data: navigation. Many sites refuse to load in an iframe, so WindBrowser shows a clear blocked-embed card with an external-tab fallback. There is no way for a web page to force Microsoft Edge to launch; WindBrowser attempts an edge:// hand-off and then tells you what the browser allowed.",
    tags: ["browser", "edge", "iframe", "url"],
  },
  {
    id: "terminal",
    title: "WindTerminal commands",
    category: "Power user",
    body: "Type help for the full list. Useful commands: ls, cd, mkdir, touch, write, cat, cp, mv, rm, find, open, ps, kill, df, theme, history, sysinfo. Paths use the virtual drive, for example /Documents/Welcome.md. Commands never execute host operating system processes.",
    tags: ["terminal", "commands", "shell"],
  },
  {
    id: "code",
    title: "Running code in the sandbox",
    category: "Power user",
    body: "WindCode compiles the open project's HTML, CSS and JavaScript and injects it into a sandboxed iframe without allow-same-origin. Console output and errors stream back through postMessage. The preview can render a page, but it cannot access WindOS or the host browser's cookies.",
    tags: ["code", "sandbox", "preview"],
  },
  {
    id: "exe",
    title: "Why .exe files cannot run here",
    category: "Compatibility",
    body: "A browser tab cannot execute Win32 binaries. WindCompat inspects the MZ/PE headers of uploaded executables, reports their metadata, warns you that they are untrusted, and explains which formats do run (HTML, JavaScript, CSS, JSON, Markdown, images, audio, video, PDF and ZIP). MSI and APPX installers are likewise identified but not executed.",
    tags: ["exe", "compatibility", "msi", "appx"],
  },
  {
    id: "shortcuts",
    title: "Keyboard shortcuts",
    category: "Power user",
    body: "Ctrl+Space global search · Meta or Ctrl+Escape Start menu · Alt+Tab cycle windows · Ctrl+Alt+Left/Right switch virtual desktops · Ctrl+Shift+L lock · Escape close overlays. In apps: Ctrl+S saves in WindCode and WindNotes, Space plays media, arrows navigate galleries and games.",
    tags: ["keyboard", "shortcuts"],
  },
  {
    id: "mobile",
    title: "Using WindOS on a phone",
    category: "Basics",
    body: "On narrow screens windows open full-screen with a compact title bar, the taskbar becomes a dock, the Start menu fills the screen, and touch targets grow. Swipe or tap the task view to switch virtual desktops. Pinch and long-press gestures follow the browser's native behaviour.",
    tags: ["mobile", "iphone", "touch"],
  },
  {
    id: "offline",
    title: "Offline behaviour",
    category: "Internet",
    body: "WindOS stores all your data locally and most apps work with no connection. The app shell itself must be loaded once per browser session; this preview build does not register a service worker, so a hard refresh while offline will not boot. Weather and update checks degrade to local fallbacks when offline.",
    tags: ["offline", "service worker", "network"],
  },
  {
    id: "store",
    title: "Installing and removing apps",
    category: "Apps",
    body: "WindStore lists every package. Installing registers the app with Start, search and the desktop. Uninstalling asks for confirmation and never deletes your files. Critical system apps (Files, Settings, Store, Security, Help, Registry, About, Accessibility) are protected. You can also import a local JSON manifest to register a package.",
    tags: ["store", "install", "uninstall", "apps"],
  },
  {
    id: "profile",
    title: "Your profile and guest mode",
    category: "Accounts",
    body: "WindOS works without an account. Your display name and avatar colour are stored locally. A guest session starts with default preferences and a read-only drive; ending it restores your profile. An optional email sign-in exists for the landing experience but is never required to use the OS.",
    tags: ["profile", "guest", "account"],
  },
  {
    id: "recovery",
    title: "Restoring a healthy system",
    category: "Troubleshooting",
    body: "Open WindRecovery to create a restore point, verify storage health, or boot safe mode (which disables startup apps and Store installs). Factory reset requires typing RESET and removes all WindOS data from this browser. Export a backup first if you want the option to come back.",
    tags: ["recovery", "reset", "safe mode"],
  },
  {
    id: "performance",
    title: "Why metrics are simulated",
    category: "Performance",
    body: "A web page cannot read host CPU or memory usage. The values in WindTask Manager, WindMonitor and the system widget are generated from the app lifecycle and are labelled SIMULATED. Real measurements shown include session uptime, IndexedDB quota, display resolution, device pixel ratio, battery state where exposed, and network online status.",
    tags: ["cpu", "memory", "performance", "metrics"],
  },
  {
    id: "storage-full",
    title: "When storage is full",
    category: "Troubleshooting",
    body: "Browser quota is finite. If a write fails, WindOS reports it instead of silently losing data. Empty the Recycle Bin, remove large images or recordings, or export and delete old files. The About screen shows real IndexedDB usage alongside the simulated drive capacity.",
    tags: ["quota", "storage", "error"],
  },
  {
    id: "wallpaper",
    title: "Personalising the desktop",
    category: "Personalisation",
    body: "Right-click the desktop to change the wallpaper, dim or blur it, toggle widgets and icons, or open display settings. WindSettings adds light and dark themes, seven accents (plus any custom colour), animated wallpapers, taskbar placement, font scaling, sounds and screensavers.",
    tags: ["wallpaper", "theme", "accent", "widgets"],
  },
  {
    id: "errors",
    title: "If an app stops responding",
    category: "Troubleshooting",
    body: "Each app runs inside an error boundary, so a failed app shows a recovery card instead of blanking the desktop. Use WindTask Manager to end the process and relaunch from Start. If the whole shell fails, reload the page; your files and settings are persisted.",
    tags: ["crash", "error", "task manager"],
  },
  {
    id: "credit",
    title: "About this build",
    category: "About",
    body: "WindOS 1.0.0 — Build by Anyel Gonzalez. 640 registered capabilities across 40 categories, all implemented in this release, with limitations documented in WindRegistry. Built with React, TypeScript, Tailwind CSS and IndexedDB for the Freebuff environment.",
    tags: ["about", "creator", "version"],
  },
];

export function searchHelp(query: string): HelpTopic[] {
  const q = query.trim().toLowerCase();
  if (!q) return HELP_TOPICS;
  return HELP_TOPICS.filter(
    (t) =>
      t.title.toLowerCase().includes(q) ||
      t.body.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.includes(q)),
  );
}
