import { useState } from "react";
import { useOS } from "@/lib/os/store";
import { useNow } from "@/lib/os/hooks";
import { formatBytes } from "@/lib/os/fs";
import { formatDuration } from "@/lib/os/hooks";
import { FEATURE_STATS } from "@/lib/os/features";
import { APPS } from "@/lib/os/registry";
import { cn } from "@/lib/utils";
import { AppShell } from "./ui";
import { openFileNode } from "@/lib/os/fileActions";
import { Accessibility, ChevronRight, Cpu, Database, FileText, Github, Globe2, HardDrive, Heart, HelpCircle, Info, Keyboard, Layers, Lock, Mail, Monitor, Palette, Shield, Smartphone, Sparkles, Terminal, Wifi, X } from "lucide-react";

const SHORTCUTS: [string, string][] = [
  ["Ctrl + Space", "Search apps, files, settings and help"],
  ["Alt + Tab", "Open task view"],
  ["Ctrl + Alt + T", "Launch WindTerminal"],
  ["Ctrl + Shift + S", "Open WindScreen capture"],
  ["Esc", "Close menus and dialogs"],
  ["Ctrl + S", "Save in WindCode and WindNotes"],
  ["Ctrl + Enter", "Run preview in WindCode"],
  ["Double-click title bar", "Maximise or restore a window"],
];

export default function About() {
  const os = useOS();
  const now = useNow(1000);
  const [legal, setLegal] = useState(false);
  const storage = os.fs.usage();
  const brand = { name: "WindOS", version: "1.0.0", creator: "Anyel Gonzalez", buildDate: "2026" };
  const real = {
    cores: navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} logical cores` : "Not exposed",
    memory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory ? `${(navigator as Navigator & { deviceMemory?: number }).deviceMemory} GB (approx.)` : "Not exposed",
    platform: navigator.platform || "Unknown",
    language: navigator.language,
    online: navigator.onLine,
    screen: `${window.screen.width} × ${window.screen.height}`,
    dpr: window.devicePixelRatio,
    browser: navigator.userAgent.split(") ").pop() ?? navigator.userAgent,
  };

  return (
    <AppShell>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="border-b border-border/60 bg-gradient-to-br from-primary/10 via-card to-card p-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-[26px] font-bold text-primary-foreground shadow-lg">W</div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[24px] font-semibold tracking-tight">WindOS</h1>
                <span className="rounded-full border border-primary/25 bg-primary/8 px-2 py-0.5 text-[9px] font-medium text-primary">Version {brand.version}</span>
                <span className="rounded-full border border-border px-2 py-0.5 text-[9px] text-muted-foreground">Complete OS simulator</span>
              </div>
              <p className="mt-1 text-[12px] font-medium text-foreground/80">Build by {brand.creator}</p>
              <p className="text-[9.5px] text-muted-foreground">A browser-based virtual desktop · local-first · no account required</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button className="flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-[9.5px] hover:bg-muted" onClick={() => os.openApp("registry")}><Layers className="size-3" /> Feature registry</button>
              <button className="flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-[9.5px] hover:bg-muted" onClick={() => os.openApp("help")}><HelpCircle className="size-3" /> Help</button>
              <button className="flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-[9.5px] hover:bg-muted" onClick={() => os.openApp("update")}><Sparkles className="size-3" /> Updates</button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-4xl space-y-3 p-4 pb-10">
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon={Layers} label="Registered features" value={String(FEATURE_STATS.total)} detail={`${FEATURE_STATS.categories} categories`} />
            <Stat icon={Sparkles} label="Implemented" value={String(FEATURE_STATS.implemented)} detail={`${FEATURE_STATS.limited} documented limits`} />
            <Stat icon={Monitor} label="Installed apps" value={String(os.installed.length)} detail={`${APPS.length} in registry`} />
            <Stat icon={HardDrive} label="Virtual storage" value={formatBytes(storage.bytes)} detail={`${storage.files} files · ${storage.folders} folders`} />
          </div>

          <Section title="Product" icon={Info}>
            <Row label="Product name" value="WindOS" />
            <Row label="Version" value={brand.version} />
            <Row label="Creator" value={<span className="font-semibold">Anyel Gonzalez</span>} />
            <Row label="Build date" value={brand.buildDate} />
            <Row label="Product type" value="Browser-based virtual desktop operating system" />
            <Row label="Development environment" value="Freebuff" />
            <Row label="License" value="Local personal use · simulator" />
          </Section>

          <Section title="System information" icon={Cpu}>
            <Row label="WindOS kernel" value="Vector 1.0.0 (simulated)" />
            <Row label="Architecture" value="x86-64 (simulated)" />
            <Row label="Uptime this session" value={os.bootedAt ? formatDuration(now - os.bootedAt) : "—"} />
            <Row label="Processes" value={`${os.processes.length} (${os.processes.filter((proc) => proc.system).length} system services)`} />
            <Row label="Windows open" value={String(os.windows.length)} />
            <Row label="Desktop" value={`${os.desktops.length} virtual desktops · ${os.settings.secondDisplay ? "2 simulated displays" : "1 display"}`} />
            <Row label="Theme" value={`${os.settings.theme} · accent ${os.settings.accent}`} />
            <Row label="Guest session" value={os.guest ? "Active (read-only)" : "No"} />
          </Section>

          <Section title="Real device & browser" icon={Globe2}>
            <Row label="Online" value={<span className={cn("flex items-center gap-1", real.online ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600")}><Wifi className="size-3" /> {real.online ? "Yes" : "No"}</span>} />
            <Row label="Logical CPU cores" value={real.cores} />
            <Row label="Device memory" value={real.memory} />
            <Row label="Screen" value={`${real.screen} @ ${real.dpr}×`} />
            <Row label="Language" value={real.language} />
            <Row label="Platform" value={real.platform} />
            <Row label="Browser engine" value={real.browser} />
            <Row label="Storage quota" value={`${formatBytes(os.storage.usage)} of ${formatBytes(os.storage.quota)}`} />
          </Section>

          <Section title="Feature registry" icon={Layers}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <MiniStat label="Total" value={FEATURE_STATS.total} />
              <MiniStat label="Implemented" value={FEATURE_STATS.implemented} />
              <MiniStat label="Limited" value={FEATURE_STATS.limited} />
              <MiniStat label="Verified" value={FEATURE_STATS.verified} />
            </div>
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 p-2 text-[8.5px] leading-relaxed text-muted-foreground">
              <Shield className="size-4 shrink-0 text-primary" />
              <span>The registry records unique IDs, descriptions, implementation and verification state and the owning subsystem for all 640 capabilities. Limited entries document honest technical boundaries rather than unimplemented features.</span>
              <button className="ml-auto shrink-0 text-[9px] text-primary hover:underline" onClick={() => os.openApp("registry")}>Open</button>
            </div>
          </Section>

          <Section title="Keyboard" icon={Keyboard}>
            <div className="grid gap-1 sm:grid-cols-2">
              {SHORTCUTS.map(([keys, description]) => (
                <div key={keys} className="flex items-center justify-between gap-2 rounded border border-border/50 px-2 py-1">
                  <span className="text-[9px] text-muted-foreground">{description}</span>
                  <kbd className="shrink-0 rounded border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[8px]">{keys}</kbd>
                </div>
              ))}
            </div>
          </Section>

          <div className="rounded-xl border border-border/70 bg-card p-3.5">
            <div className="flex items-center gap-2">
              <Heart className="size-4 text-rose-500" />
              <h2 className="text-[11px] font-semibold">Built with care, by a person</h2>
            </div>
            <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
              WindOS is an original simulation inspired by desktop operating-system conventions. It is not affiliated with, endorsed by, or connected to Microsoft or Windows. The virtual computer, files, apps, processes and hardware readings are simulated inside this browser tab. Nothing you do here affects your real operating system.
            </p>
            <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
              WindOS cannot install Microsoft Edge, execute arbitrary Windows EXE files, scan your host for malware, or guarantee that external websites allow embedding. Where a browser boundary exists, WindOS documents it and offers the safest working alternative.
            </p>
            <button className="mt-2 rounded border border-border px-2 py-1 text-[9px] text-muted-foreground hover:bg-muted" onClick={() => setLegal(true)}>Read the full product notice</button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[8.5px] text-muted-foreground">
            <span>© 2026 WindOS · Build by Anyel Gonzalez · Version 1.0.0</span>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-1 hover:text-foreground" onClick={() => os.openApp("help")}><HelpCircle className="size-3" /> Help</button>
              <button className="flex items-center gap-1 hover:text-foreground" onClick={() => os.openApp("security")}><Shield className="size-3" /> Security</button>
              <button className="flex items-center gap-1 hover:text-foreground" onClick={() => os.openApp("recovery")}><Info className="size-3" /> Recovery</button>
            </div>
          </div>
        </div>
      </div>

      {legal && (
        <div className="absolute inset-0 z-[120] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="max-h-[85%] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-popover p-4 shadow-2xl">
            <div className="flex items-start gap-2">
              <Shield className="mt-0.5 size-4 text-primary" />
              <div className="flex-1">
                <h2 className="text-[13px] font-semibold">Product notice</h2>
                <p className="text-[9px] text-muted-foreground">WindOS 1.0.0 · Build by Anyel Gonzalez</p>
              </div>
              <button className="rounded p-1 text-muted-foreground hover:bg-muted" onClick={() => setLegal(false)} aria-label="Close"><X className="size-4" /></button>
            </div>
            <div className="mt-3 space-y-2 text-[10px] leading-relaxed text-muted-foreground">
              <p>WindOS is a standalone browser application that simulates a desktop operating system. It uses original branding and interface design and is not a Microsoft product.</p>
              <p>The virtual drive is stored in your browser using IndexedDB, and settings are stored in localStorage. Clearing this site’s storage deletes the virtual computer. WindOS cannot recover data that the browser has removed.</p>
              <p>Simulated CPU, memory and network throughput are labelled as estimates and are derived from UI activity. Real values that the browser exposes (storage quota, logical core count, online status, uptime, screen size) are displayed separately in WindMonitor and About.</p>
              <p>External browsing is subject to website embedding policies and browser security. Edge handoff uses the <code className="rounded bg-muted px-1">microsoft-edge:</code> URI scheme; a web page cannot verify installation or control the host browser. Arbitrary EXE execution is not supported and no host antivirus, firewall or malware protection is provided.</p>
              <p>Camera, microphone and screen capture require both a WindOS permission grant and your browser’s native permission. Media never leaves your device and is stored only if you save a recording into the virtual drive.</p>
              <p>Feature registry entries describe implemented or explicitly limited capabilities. Verification reflects the WindOS implementation checklist; it is not an independent security certification.</p>
            </div>
            <button className="mt-3 w-full rounded-md bg-primary py-1.5 text-[10.5px] font-semibold text-primary-foreground" onClick={() => setLegal(false)}>Close</button>
          </div>
        </div>
      )}
    </AppShell>
  );
}


function Section({ title, icon: Icon, children }: { title: string; icon: typeof Info; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-border/70 bg-card">
      <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2">
        <Icon className="size-3.5 text-muted-foreground" />
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{title}</h2>
      </div>
      <div className="px-3 py-2">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex items-start justify-between gap-4 border-b border-border/30 py-1 text-[10px] last:border-0"><span className="text-muted-foreground">{label}</span><span className="max-w-[62%] text-right">{value}</span></div>;
}

function Stat({ icon: Icon, label, value, detail }: { icon: typeof Info; label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground"><Icon className="size-3.5" /><span className="text-[8.5px] font-semibold uppercase tracking-[0.1em]">{label}</span></div>
      <p className="mt-1 truncate text-[18px] font-semibold tabular-nums">{value}</p>
      <p className="text-[8.5px] text-muted-foreground">{detail}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg bg-muted/30 px-2 py-1.5"><p className="text-[8px] uppercase tracking-wider text-muted-foreground">{label}</p><p className="text-[15px] font-semibold tabular-nums">{value}</p></div>;
}
