import { motion } from "framer-motion";
import { Link } from "react-router";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CloudOff,
  Command,
  Cpu,
  FolderOpen,
  HardDrive,
  Layers,
  Lock,
  Monitor,
  Palette,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  Terminal,
  Zap,
} from "lucide-react";
import { APPS } from "@/lib/os/registry";
import { WALLPAPERS } from "@/lib/os/settings";

const FEATURES = [
  {
    icon: HardDrive,
    title: "A real, persistent drive",
    body: "Every file lives in IndexedDB. Create documents, drag folders, import images, and find them again after closing the tab.",
  },
  {
    icon: Layers,
    title: "Windows that behave",
    body: "Drag, resize, snap, minimise, restore and run several apps at once. Crashes stay inside their own window.",
  },
  {
    icon: Terminal,
    title: "A shell against the virtual disk",
    body: "Navigate directories, read and write files, launch apps and inspect processes — never your host machine.",
  },
  {
    icon: ShieldCheck,
    title: "Permissions, not promises",
    body: "Camera, microphone, clipboard and files are gated behind a WindOS prompt, with a complete security event log.",
  },
  {
    icon: Store,
    title: "A store that registers",
    body: "Install packages from an offline catalogue. They appear in Start, search and on the desktop, with progress and permissions.",
  },
  {
    icon: CloudOff,
    title: "Local-first by design",
    body: "No account, no server round-trips, no analytics. Your virtual computer lives in this browser profile.",
  },
];

const SHOWCASE = ["browser", "files", "terminal", "code", "store", "paint", "notes", "security", "backup", "photos", "taskmanager", "settings"];

export default function Landing() {
  const showcase = SHOWCASE.map((id) => APPS.find((app) => app.id === id)).filter(Boolean);

  return (
    <div className="min-h-screen bg-[#f5f3ee] text-[#131720] antialiased selection:bg-[#4f5bd5]/20">
      <header className="sticky top-0 z-30 border-b border-[#131720]/8 bg-[#f5f3ee]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-5">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-[9px] bg-[#131720] text-[13px] font-bold text-[#f5f3ee] shadow-sm">W</span>
            <span className="text-[13px] font-semibold tracking-tight">WindOS</span>
            <span className="rounded-full border border-[#131720]/12 px-1.5 py-0.5 text-[8.5px] font-medium text-[#131720]/50">1.0.0</span>
          </Link>
          <nav className="ml-auto hidden items-center gap-5 text-[11px] font-medium text-[#131720]/58 md:flex">
            <a href="#system" className="transition hover:text-[#131720]">System</a>
            <a href="#apps" className="transition hover:text-[#131720]">Apps</a>
            <a href="#security" className="transition hover:text-[#131720]">Security</a>
            <a href="#creator" className="transition hover:text-[#131720]">Creator</a>
          </nav>
          <Link
            to="/os"
            className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-full bg-[#131720] px-3.5 text-[10.5px] font-semibold text-[#f5f3ee] transition hover:bg-[#242b38] md:ml-0"
          >
            Launch WindOS <ArrowRight className="size-3" />
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-5 pb-10 pt-12 sm:pt-16">
          <div className="grid items-center gap-10 lg:grid-cols-[1.02fr_1.12fr]">
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
              <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[#131720]/10 bg-white/60 px-2.5 py-1 text-[9.5px] font-medium text-[#131720]/60">
                <span className="size-1.5 rounded-full bg-teal-500" />
                WindOS 1.0.0 · complete virtual desktop
              </div>
              <h1 className="max-w-xl text-[38px] font-semibold leading-[1.04] tracking-[-0.035em] sm:text-[52px]">
                The desktop you remember, rebuilt for the browser.
              </h1>
              <p className="mt-4 max-w-md text-[13px] leading-relaxed text-[#131720]/58">
                A working operating-system simulator with windows, a persistent filesystem, a terminal, forty apps, a store and a security centre. Nothing to install. No account required.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-2.5">
                <Link to="/os" className="inline-flex h-10 items-center gap-2 rounded-full bg-[#4f5bd5] px-5 text-[12px] font-semibold text-white shadow-[0_10px_30px_-12px_rgba(79,91,213,0.8)] transition hover:bg-[#4350c4]">
                  Enter WindOS <ArrowRight className="size-3.5" />
                </Link>
                <a href="#system" className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#131720]/12 bg-white/50 px-4 text-[11.5px] font-medium text-[#131720]/70 transition hover:bg-white">
                  See what’s inside <ArrowUpRight className="size-3.5" />
                </a>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[9.5px] text-[#131720]/45">
                <span className="flex items-center gap-1"><Check className="size-3 text-teal-600" /> Runs locally</span>
                <span className="flex items-center gap-1"><Check className="size-3 text-teal-600" /> Data persists</span>
                <span className="flex items-center gap-1"><Check className="size-3 text-teal-600" /> Works on iPhone</span>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.65, delay: 0.1 }} className="relative">
              <div className="absolute -inset-6 -z-10 rounded-[36px] bg-gradient-to-br from-[#4f5bd5]/10 via-transparent to-teal-500/10 blur-2xl" />
              <div className="overflow-hidden rounded-[18px] border border-[#131720]/12 bg-[#0f1724] p-1.5 shadow-[0_35px_80px_-35px_rgba(19,23,32,0.6)]">
                <div className="overflow-hidden rounded-[13px]" style={{ background: "linear-gradient(140deg,#eef2fb 0%,#dde6f6 45%,#cfddf1 100%)" }}>
                  <div className="flex items-center gap-1.5 border-b border-black/8 px-3 py-2">
                    <span className="size-1.5 rounded-full bg-[#f26d5f]" /><span className="size-1.5 rounded-full bg-[#e7b24b]" /><span className="size-1.5 rounded-full bg-[#5fb86f]" />
                    <div className="ml-2 flex-1 rounded-md bg-white/60 px-2 py-0.5 text-[7px] text-[#131720]/45">windos.local · Home</div>
                  </div>
                  <div className="flex h-[280px] sm:h-[320px]">
                    <div className="hidden w-[76px] shrink-0 flex-col gap-2 border-r border-black/6 bg-white/35 p-2 sm:flex">
                      <div className="flex items-center gap-1"><span className="flex size-4 items-center justify-center rounded bg-[#4f5bd5] text-[7px] font-bold text-white">W</span><span className="text-[6.5px] font-semibold">WindOS</span></div>
                      {[["Home", true], ["Documents", false], ["Pictures", false], ["Projects", false], ["Downloads", false]].map(([label, active]) => (
                        <div key={label as string} className={`flex items-center gap-1 rounded px-1 py-0.5 text-[6.5px] ${active ? "bg-[#4f5bd5]/10 font-medium text-[#4f5bd5]" : "text-[#131720]/50"}`}>
                          <FolderOpen className="size-2" /> {label}
                        </div>
                      ))}
                      <div className="mt-auto rounded-md bg-white/55 p-1.5">
                        <div className="mb-1 h-1 w-7 rounded bg-black/20" />
                        <div className="h-1 rounded bg-black/10" />
                        <div className="mt-1 h-1 w-2/3 rounded bg-black/10" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 p-3">
                      <div className="mb-2 flex items-center gap-1.5">
                        <div className="flex size-5 items-center justify-center rounded-md bg-[#4f5bd5]/10 text-[#4f5bd5]"><FolderOpen className="size-3" /></div>
                        <div>
                          <p className="text-[7.5px] font-semibold">Documents</p>
                          <p className="text-[6px] text-[#131720]/40">6 items · 84.2 KB</p>
                        </div>
                        <div className="ml-auto flex items-center gap-1">
                          <div className="h-4 w-20 rounded border border-black/8 bg-white/60" />
                          <div className="h-4 w-4 rounded bg-[#4f5bd5]" />
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[["welcome.md", "#4f5bd5"], ["roadmap.md", "#178f8a"], ["notes.txt", "#c1802a"], ["design.md", "#c2557a"], ["team.txt", "#2f7fbf"], ["changelog.md", "#7a5cd6"], ["archive.zip", "#6b7280"], ["readme.md", "#3f8f7a"]].map(([name, color]) => (
                          <div key={name} className="rounded-md bg-white/70 p-1.5 shadow-sm">
                            <div className="mb-1 flex size-5 items-center justify-center rounded" style={{ background: `${color}18` }}>
                              <span className="text-[7px] font-bold" style={{ color }}>M</span>
                            </div>
                            <p className="truncate text-[5.5px] text-[#131720]/60">{name}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2.5 rounded-lg border border-white/70 bg-white/55 p-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[7px] font-semibold">Welcome to WindOS</p>
                            <p className="mt-0.5 text-[5.5px] text-[#131720]/45">Your virtual computer is ready. Everything you create is stored locally and waits for you.</p>
                          </div>
                          <div className="ml-2 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#131720] text-[5px] font-bold text-white">W</div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-1">
                        <span className="h-1 w-10 rounded-full bg-[#4f5bd5]/55" /><span className="h-1 w-4 rounded-full bg-black/12" /><span className="h-1 w-4 rounded-full bg-black/12" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 border-t border-black/8 bg-white/55 px-2 py-1.5 backdrop-blur">
                    <span className="flex size-4 items-center justify-center rounded bg-[#131720] text-[6px] font-bold text-white">W</span>
                    <div className="flex gap-1">
                      {[Terminal, FolderOpen, Store, Palette, Monitor, ShieldCheck].map((Icon, index) => (
                        <span key={index} className={`flex size-4 items-center justify-center rounded ${index === 1 ? "bg-[#4f5bd5]/12 text-[#4f5bd5]" : "text-[#131720]/40"}`}><Icon className="size-2.5" /></span>
                      ))}
                    </div>
                    <div className="ml-auto flex items-center gap-1.5">
                      <div className="rounded border border-black/8 bg-white/60 px-1.5 py-0.5 text-[5.5px]">Tue 8 Nov · 09:41</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-5 -left-3 hidden rounded-xl border border-[#131720]/10 bg-white/95 p-2.5 shadow-xl backdrop-blur sm:block">
                <div className="flex items-center gap-1.5">
                  <span className="flex size-6 items-center justify-center rounded-lg bg-teal-500/12 text-teal-600"><ShieldCheck className="size-3.5" /></span>
                  <div>
                    <p className="text-[7.5px] font-semibold">Permission prompt</p>
                    <p className="text-[6px] text-[#131720]/45">WindFiles requests clipboard</p>
                  </div>
                  <span className="ml-2 rounded bg-[#131720] px-1.5 py-0.5 text-[6px] text-white">Allow</span>
                </div>
              </div>
              <div className="absolute -right-2 -top-3 hidden rotate-2 rounded-lg border border-[#131720]/10 bg-[#131720] px-2.5 py-1.5 text-white shadow-xl sm:block">
                <p className="text-[6px] uppercase tracking-[0.18em] text-white/40">Stored locally</p>
                <p className="text-[8px] font-medium">318 KB · IndexedDB</p>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="border-y border-[#131720]/8 bg-[#eeebe4]/60">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-5 py-6 sm:grid-cols-4">
            {[["640", "registered features"], ["40", "capability categories"], ["40+", "working applications"], ["0", "accounts required"]].map(([value, label]) => (
              <div key={label} className="px-2 py-1.5 text-center sm:text-left">
                <p className="text-[24px] font-semibold tracking-tight">{value}</p>
                <p className="text-[9px] uppercase tracking-[0.16em] text-[#131720]/45">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="system" className="mx-auto max-w-6xl px-5 py-16">
          <div className="mb-8 max-w-lg">
            <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#4f5bd5]">The system</p>
            <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.025em] sm:text-[34px]">Not a demo. A little computer.</h2>
            <p className="mt-2 text-[12px] leading-relaxed text-[#131720]/55">Each subsystem is wired to the same OS services — files, windows, permissions and process state. Open two apps and they agree on the same disk.</p>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.35, delay: index * 0.04 }}
                className="rounded-2xl border border-[#131720]/8 bg-white/55 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_18px_40px_-30px_rgba(19,23,32,0.5)]"
              >
                <span className="mb-3 flex size-8 items-center justify-center rounded-xl bg-[#131720]/5 text-[#131720]/70"><feature.icon className="size-4" /></span>
                <h3 className="text-[12px] font-semibold">{feature.title}</h3>
                <p className="mt-1 text-[10.5px] leading-relaxed text-[#131720]/52">{feature.body}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="apps" className="border-y border-[#131720]/8 bg-[#131720] text-[#f5f3ee]">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-md">
                <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-teal-300/80">The applications</p>
                <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.025em] sm:text-[34px]">Everything is an app. Every app is real.</h2>
                <p className="mt-2 text-[12px] leading-relaxed text-white/45">No decorative buttons. The terminal writes the same files that WindFiles shows. The store installs from a local catalogue. The task manager inspects the processes this tab is actually running.</p>
              </div>
              <Link to="/os" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/15 px-4 text-[10.5px] font-medium text-white/80 transition hover:bg-white/10">
                Open the Start menu <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {showcase.map((app) => app && (
                <div key={app.id} className="flex flex-col items-center gap-2 rounded-xl border border-white/8 bg-white/[0.035] p-3 transition hover:border-white/15 hover:bg-white/[0.06]">
                  <span className="flex size-9 items-center justify-center rounded-xl text-white shadow-inner" style={{ background: app.color }}>
                    <app.icon className="size-4" />
                  </span>
                  <span className="text-center text-[9px] leading-tight text-white/65">{app.name}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 grid gap-2.5 sm:grid-cols-3">
              {[
                { icon: Command, title: "Keyboard-first", body: "Alt+Tab task view, Ctrl+Space search, terminal completion and window shortcuts." },
                { icon: Cpu, title: "Real process registry", body: "PIDs, uptime and window state are real. CPU and memory say simulated, because they are." },
                { icon: Smartphone, title: "Touch-ready", body: "Windows become full-screen sheets on phones. Start, files and settings adapt." },
              ].map(({ icon: Icon, title, body }) => (
                <div key={title} className="rounded-xl border border-white/8 bg-white/[0.03] p-3.5">
                  <Icon className="mb-2 size-4 text-teal-300/80" />
                  <p className="text-[11px] font-medium">{title}</p>
                  <p className="mt-0.5 text-[9.5px] leading-relaxed text-white/40">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="security" className="mx-auto max-w-6xl px-5 py-16">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#178f8a]">Security & trust</p>
              <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.025em] sm:text-[34px]">Gated by default. Honest by design.</h2>
              <p className="mt-2 text-[12px] leading-relaxed text-[#131720]/55">WindOS cannot scan your real computer, block real malware, or install Microsoft Edge. What it can do is make every simulated capability explicit, permission-gated and logged.</p>
              <div className="mt-5 space-y-2">
                {[
                  "Per-app permission prompts for camera, microphone, screen, clipboard, files, notifications and location",
                  "Security event history, download warnings and safe mode",
                  "Local-only storage with export, backup integrity checks and restore points",
                  "`javascript:` and `data:` URLs rejected; embedded pages sandboxed",
                ].map((line) => (
                  <div key={line} className="flex items-start gap-2 text-[10.5px] leading-relaxed text-[#131720]/62">
                    <Check className="mt-0.5 size-3 shrink-0 text-[#178f8a]" /> {line}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-[#131720]/8 bg-white/55 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-[#178f8a]/10 text-[#178f8a]"><ShieldCheck className="size-4" /></span>
                  <div><p className="text-[11px] font-semibold">Security centre</p><p className="text-[8.5px] text-[#131720]/40">Every decision leaves a trail</p></div>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[8px] font-medium text-emerald-700">Local session</span>
              </div>
              <div className="space-y-1.5">
                {[
                  ["WindBrowser", "clipboard", "Allowed", "emerald"],
                  ["WindRecorder", "camera", "Prompt", "amber"],
                  ["WindScreen", "screen", "Revoked", "red"],
                  ["WindNotes", "notifications", "Allowed", "emerald"],
                ].map(([app, kind, state, tone]) => (
                  <div key={app + kind} className="flex items-center gap-2 rounded-lg border border-[#131720]/6 bg-white/60 px-2 py-1.5">
                    <span className="flex size-5 items-center justify-center rounded bg-[#131720]/5"><Lock className="size-2.5 text-[#131720]/45" /></span>
                    <span className="text-[9.5px] font-medium">{app}</span>
                    <span className="text-[8.5px] text-[#131720]/40">{kind}</span>
                    <span className={`ml-auto rounded-full px-1.5 py-0.5 text-[7.5px] font-medium ${tone === "emerald" ? "bg-emerald-500/10 text-emerald-700" : tone === "amber" ? "bg-amber-500/10 text-amber-700" : "bg-red-500/10 text-red-600"}`}>{state}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2.5 text-[8px] leading-relaxed text-[#131720]/35">Illustrative of the in-OS permission log. WindOS does not provide host antivirus or firewall protection.</p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-16">
          <div className="grid items-center gap-8 rounded-[24px] border border-[#131720]/8 bg-[#ebe7df] p-5 sm:p-8 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#c1802a]">Personalisation</p>
              <h2 className="text-[26px] font-semibold leading-tight tracking-[-0.025em]">Quiet neutrals. Seven accents. Your wallpaper.</h2>
              <p className="mt-2 max-w-sm text-[11.5px] leading-relaxed text-[#131720]/55">Light and dark modes, three animated wallpapers, gradients, custom image uploads, font scaling, icon sizing, taskbar placement, sounds, screensavers and accessibility controls.</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {["Light", "Dark", "Animated", "Custom image", "Font scale", "High contrast", "Reduced motion"].map((chip) => (
                  <span key={chip} className="rounded-full border border-[#131720]/10 bg-white/50 px-2 py-0.5 text-[8.5px] text-[#131720]/55">{chip}</span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {WALLPAPERS.filter((item) => ["meridian", "slate", "aurora"].includes(item.id)).map((wallpaper, index) => (
                <div key={wallpaper.id} className={`overflow-hidden rounded-xl border border-white/50 shadow-sm ${index === 1 ? "translate-y-3" : ""}`}>
                  <div className={`h-24 ${wallpaper.className ?? ""}`} style={{ background: wallpaper.background }} />
                  <div className="bg-white/70 px-2 py-1.5 backdrop-blur"><p className="text-[7.5px] font-medium text-[#131720]/65">{wallpaper.name}</p></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="creator" className="border-t border-[#131720]/8 bg-[#eeebe4]/50">
          <div className="mx-auto max-w-6xl px-5 py-12">
            <div className="grid gap-8 md:grid-cols-[1fr_1.1fr]">
              <div>
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-[#131720] text-[16px] font-bold text-[#f5f3ee]">W</span>
                  <div>
                    <p className="text-[13px] font-semibold">WindOS 1.0.0</p>
                    <p className="text-[10px] text-[#131720]/45">Build by Anyel Gonzalez</p>
                  </div>
                </div>
                <p className="mt-3 max-w-sm text-[10.5px] leading-relaxed text-[#131720]/50">An original operating-system simulator inspired by desktop conventions, not affiliated with Microsoft. Built to be opened, explored, and broken — then restored from a backup.</p>
                <div className="mt-4 flex flex-wrap gap-1.5 text-[8.5px] text-[#131720]/45">
                  {["React 19", "TypeScript", "IndexedDB", "Tailwind CSS", "No account", "Offline data"].map((tech) => (
                    <span key={tech} className="rounded border border-[#131720]/8 bg-white/40 px-1.5 py-0.5">{tech}</span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {[
                  ["Version", "1.0.0"],
                  ["Creator", "Anyel Gonzalez"],
                  ["Apps", "40 registered"],
                  ["Features", "640 entries"],
                  ["Storage", "IndexedDB"],
                  ["Platform", "Browser"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-[#131720]/8 bg-white/45 px-3 py-2">
                    <p className="text-[8px] uppercase tracking-[0.14em] text-[#131720]/35">{label}</p>
                    <p className="mt-0.5 text-[10.5px] font-medium">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="relative overflow-hidden rounded-[26px] bg-[#131720] px-6 py-10 text-center text-[#f5f3ee] sm:px-12">
            <div className="absolute inset-0 opacity-50" style={{ background: "radial-gradient(60% 120% at 50% 0%, rgba(79,91,213,0.5), transparent 70%)" }} />
            <div className="relative">
              <Zap className="mx-auto mb-3 size-5 text-teal-300" />
              <h2 className="mx-auto max-w-lg text-[28px] font-semibold leading-tight tracking-[-0.03em] sm:text-[36px]">Your virtual computer is one click away.</h2>
              <p className="mx-auto mt-2 max-w-md text-[11px] leading-relaxed text-white/45">First boot takes a few seconds. Your name, theme, files and installed apps stay in this browser.</p>
              <Link to="/os" className="mt-5 inline-flex h-10 items-center gap-2 rounded-full bg-[#f5f3ee] px-5 text-[11.5px] font-semibold text-[#131720] transition hover:bg-white">
                Launch WindOS <ArrowRight className="size-3.5" />
              </Link>
              <p className="mt-3 flex items-center justify-center gap-1 text-[8.5px] text-white/30"><Sparkles className="size-2.5" /> No sign-up. No download. Everything stays local.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#131720]/8">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-5 py-6 text-[9px] text-[#131720]/40 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded-md bg-[#131720] text-[8px] font-bold text-[#f5f3ee]">W</span>
            <span>WindOS 1.0.0 — a browser-based operating system simulator by Anyel Gonzalez.</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/os" className="hover:text-[#131720]">Launch</Link>
            <Link to="/auth" className="hover:text-[#131720]">Account</Link>
            <span>© 2026 WindOS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
