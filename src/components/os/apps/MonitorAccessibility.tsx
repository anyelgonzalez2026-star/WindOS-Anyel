import { useMemo, useState } from "react";
import { useOS } from "@/lib/os/store";
import { formatBytes } from "@/lib/os/fs";
import { formatDuration, useNow } from "@/lib/os/hooks";
import { cn } from "@/lib/utils";
import { AppShell, AppHeader, AppToolbar, GhostButton, PrimaryButton, Panel, SectionTitle, Pill, Field } from "./ui";
import { Activity, Bug, CheckCircle2, Cpu, Eye, Gauge, HardDrive, Info, Keyboard, MemoryStick, RefreshCw, Sparkles, Type, Volume2, Waves, XCircle, ZoomIn } from "lucide-react";

/* ------------------------------------------------------------------ Monitor */

function Spark({ values, color = "var(--os-accent)" }: { values: number[]; color?: string }) {
  const data = values.length ? values : [0];
  const max = Math.max(10, ...data);
  const points = data.map((value, index) => `${(index / Math.max(1, data.length - 1)) * 100},${30 - (value / max) * 28}`).join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-10 w-full overflow-visible">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <polyline points={`0,30 ${points} 100,30`} fill={color} opacity="0.07" stroke="none" />
    </svg>
  );
}

export function Monitor() {
  const os = useOS();
  const now = useNow(1000);
  const [running, setRunning] = useState(false);
  const [diag, setDiag] = useState<{ label: string; ok: boolean; detail: string }[] | null>(null);
  const [report, setReport] = useState("");
  const [saved, setSaved] = useState("");
  const usage = useMemo(() => os.fs.usage(), [os.fs, os.fsVersion]);
  const uptime = now - os.bootedAt;
  const memory = (performance as Performance & { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
  const processes = [...os.processes].sort((a, b) => b.cpu - a.cpu);

  async function runDiagnostics() {
    setRunning(true);
    const results: { label: string; ok: boolean; detail: string }[] = [];
    try {
      results.push({ label: "IndexedDB", ok: typeof indexedDB !== "undefined", detail: typeof indexedDB !== "undefined" ? "Persistent virtual storage is available." : "IndexedDB is unavailable; files will not persist." });
      try {
        localStorage.setItem("windos.diag.test", String(Date.now()));
        localStorage.removeItem("windos.diag.test");
        results.push({ label: "Local preferences", ok: true, detail: "Preferences storage accepted a write and delete." });
      } catch {
        results.push({ label: "Local preferences", ok: false, detail: "localStorage is blocked or full." });
      }
      try {
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("windos"));
        results.push({ label: "Web Crypto", ok: digest.byteLength === 32, detail: "SHA-256 integrity checks are available." });
      } catch {
        results.push({ label: "Web Crypto", ok: false, detail: "SubtleCrypto is unavailable in this context." });
      }
      results.push({ label: "BroadcastChannel", ok: typeof BroadcastChannel !== "undefined", detail: typeof BroadcastChannel !== "undefined" ? "Local cross-tab features can operate." : "Cross-tab remote assistance is unavailable." });
      results.push({ label: "Canvas rendering", ok: Boolean(document.createElement("canvas").getContext("2d")), detail: "2D canvas is used by Paint, screenshots and charts." });
      results.push({ label: "File System storage", ok: usage.bytes >= 0, detail: `${usage.files} files and ${usage.folders} folders are indexed (${formatBytes(usage.bytes + usage.trashBytes)}).` });
      results.push({ label: "Storage quota", ok: os.storage.quota > 0, detail: `${formatBytes(os.storage.usage)} of ${formatBytes(os.storage.quota)} used by this site.` });
      setDiag(results);
      os.logEvent({ level: "info", title: "System diagnostics completed", detail: `${results.filter((result) => result.ok).length}/${results.length} checks passed.` });
    } finally {
      setRunning(false);
    }
  }

  function exportReport() {
    const body = report.trim() || "No description provided.";
    const content = `WindOS error report\nVersion 1.0.0\nGenerated ${new Date().toISOString()}\nUptime ${formatDuration(uptime)}\nUser agent ${navigator.userAgent}\nProcesses ${os.processes.length}\nStorage ${formatBytes(usage.bytes)} / ${formatBytes(os.storage.quota)}\n\nDescription:\n${body}\n\nThis report was generated locally. It has not been transmitted anywhere.`;
    const name = `WindOS report ${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.txt`;
    const node = os.fs.createFile("folder_documents", name, content, "text/plain");
    if (node) {
      os.logEvent({ level: "info", title: "Diagnostic report saved", detail: name });
      setSaved(`Saved to Documents as ${name}`);
      setReport("");
    } else setSaved("Guest mode is read-only; the report could not be saved.");
  }

  return (
    <AppShell>
      <AppHeader icon={Gauge} title="WindMonitor" subtitle={`System resource monitor and diagnostics · simulated hardware metrics labelled`} actions={<><GhostButton onClick={() => void runDiagnostics()} disabled={running}><Activity className={cn("size-3.5", running && "animate-pulse")} /> {running ? "Running…" : "Run diagnostics"}</GhostButton><PrimaryButton onClick={() => os.openApp("taskmanager")}><Cpu className="size-3.5" /> Task manager</PrimaryButton></>} />
      <AppToolbar>
        <Pill tone="warning">Simulated CPU / memory / network</Pill>
        <span className="text-[8.5px] text-muted-foreground">Real: storage quota, uptime, cores, online state and browser API results</span>
        <span className="ml-auto flex items-center gap-1 text-[9px] text-muted-foreground"><span className="size-1.5 animate-pulse rounded-full bg-emerald-500" /> live · {formatDuration(uptime)}</span>
      </AppToolbar>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="mx-auto max-w-3xl space-y-2.5">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="CPU" value={`${os.stats.cpu}%`} icon={Cpu} history={os.stats.history.cpu} detail="simulated utilisation" />
            <Metric label="Memory" value={`${os.stats.memory}%`} icon={MemoryStick} history={os.stats.history.memory} detail={`${processes.length} tracked processes`} />
            <Metric label="Disk activity" value={`${os.stats.disk}%`} icon={HardDrive} history={os.stats.history.disk} detail={`${formatBytes(usage.bytes)} virtual data`} />
            <Metric label="Network" value={`${os.stats.network}%`} icon={Waves} history={os.stats.history.network} detail={navigator.onLine ? "host reports online" : "host reports offline"} />
          </div>

          <Panel>
            <SectionTitle action={<span className="text-[8px] text-muted-foreground">{processes.length} processes · updating live</span>}>Process activity</SectionTitle>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[9.5px]">
                <thead><tr className="border-b border-border/60 text-[8px] uppercase tracking-wider text-muted-foreground"><th className="py-1 pr-2 font-medium">Process</th><th className="px-1 py-1 font-medium">PID</th><th className="px-1 py-1 font-medium">State</th><th className="px-1 py-1 text-right font-medium">CPU</th><th className="px-1 py-1 text-right font-medium">Memory</th><th className="px-1 py-1 text-right font-medium">Response</th><th className="py-1 pl-2" /></tr></thead>
                <tbody>
                  {processes.slice(0, 14).map((process) => (
                    <tr key={process.pid} className="border-b border-border/30 last:border-0">
                      <td className="max-w-32 truncate py-1 pr-2"><span className="flex items-center gap-1.5"><span className={cn("size-1.5 rounded-full", process.state === "running" ? "bg-emerald-500" : process.state === "idle" ? "bg-amber-500" : "bg-muted-foreground")} />{process.name}</span></td>
                      <td className="px-1 py-1 font-mono text-[8.5px] text-muted-foreground">{process.pid}</td>
                      <td className="px-1 py-1 capitalize text-muted-foreground">{process.state}</td>
                      <td className="px-1 py-1 text-right">{process.cpu}%</td>
                      <td className="px-1 py-1 text-right">{process.memory} MB</td>
                      <td className="px-1 py-1 text-right">{process.responsiveness}%</td>
                      <td className="py-1 pl-2 text-right"><button className="text-[8px] text-red-500 hover:underline" onClick={() => os.killProcess(process.pid)}>End</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-1 text-[8px] text-muted-foreground">Resource values are generated by the WindOS simulator to make activity legible. They are not measurements of your computer’s hardware. Ending a process closes its window.</p>
          </Panel>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <Panel>
              <SectionTitle>Real device information</SectionTitle>
              <div className="space-y-1 text-[9px]">
                <Row label="Logical cores" value={String(navigator.hardwareConcurrency || "not exposed")} />
                <Row label="Device memory" value={(navigator as Navigator & { deviceMemory?: number }).deviceMemory ? `${(navigator as Navigator & { deviceMemory?: number }).deviceMemory} GB` : "not exposed"} />
                <Row label="JS heap" value={memory ? `${formatBytes(memory.usedJSHeapSize)} / ${formatBytes(memory.jsHeapSizeLimit)}` : "not exposed"} />
                <Row label="Storage quota" value={`${formatBytes(os.storage.usage)} / ${formatBytes(os.storage.quota)}`} />
                <Row label="Virtual drive" value={`${formatBytes(usage.bytes)} · ${usage.files} files · ${usage.folders} folders`} />
                <Row label="Platform" value={navigator.platform || "not exposed"} />
                <Row label="Online" value={navigator.onLine ? "yes" : "no"} />
                <Row label="Uptime" value={formatDuration(uptime)} />
              </div>
            </Panel>
            <Panel>
              <SectionTitle action={<button className="flex items-center gap-1 text-[8.5px] text-primary" onClick={exportReport}><Bug className="size-3" /> Save report</button>}>Report an issue</SectionTitle>
              <p className="text-[8.5px] leading-relaxed text-muted-foreground">Describe a problem. WindOS collects local diagnostics and saves a report in Documents. Nothing is sent over the network.</p>
              <textarea value={report} onChange={(event) => setReport(event.target.value)} rows={4} placeholder="What happened?" className="mt-1.5 w-full rounded-md border border-border bg-background px-2 py-1.5 text-[9.5px] outline-none focus:border-primary/60" />
              {saved && <p className="mt-1 text-[8.5px] text-emerald-600 dark:text-emerald-400">{saved}</p>}
            </Panel>
          </div>

          {diag && (
            <Panel>
              <SectionTitle action={<span className="text-[8px] text-muted-foreground">{diag.filter((item) => item.ok).length}/{diag.length} passed</span>}>Diagnostic results</SectionTitle>
              <div className="space-y-1">
                {diag.map((item) => <div key={item.label} className="flex items-start gap-1.5 rounded border border-border/50 px-2 py-1">{item.ok ? <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-emerald-500" /> : <XCircle className="mt-0.5 size-3 shrink-0 text-red-500" />}<div><p className="text-[9.5px] font-medium">{item.label}</p><p className="text-[8px] text-muted-foreground">{item.detail}</p></div></div>)}
              </div>
              <p className="mt-1.5 text-[8px] text-muted-foreground">These checks use real browser APIs. A passed check means the API is available here, not that WindOS can guarantee host-level performance or health.</p>
            </Panel>
          )}

          <div className="grid gap-2 sm:grid-cols-3">
            <QuickLink title="Task manager" body="Apps, startup and detail" onClick={() => os.openApp("taskmanager")} />
            <QuickLink title="System settings" body="Display, sound and power" onClick={() => os.openApp("settings", { section: "system" })} />
            <QuickLink title="Security centre" body="Permissions and event log" onClick={() => os.openApp("security")} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Metric({ label, value, icon: Icon, history, detail }: { label: string; value: string; icon: typeof Cpu; history: number[]; detail: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-2.5 shadow-sm">
      <div className="flex items-center gap-1.5 text-[8.5px] font-medium uppercase tracking-wider text-muted-foreground"><Icon className="size-3" /> {label}</div>
      <p className="mt-1 text-[22px] font-semibold leading-none tracking-tight">{value}</p>
      <Spark values={history} />
      <p className="text-[7.5px] text-muted-foreground">{detail}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex gap-2 border-b border-border/30 py-0.5 last:border-0"><span className="w-24 shrink-0 text-muted-foreground">{label}</span><span className="min-w-0 flex-1 truncate font-medium">{value}</span></div>;
}

function QuickLink({ title, body, onClick }: { title: string; body: string; onClick: () => void }) {
  return <button className="rounded-xl border border-border/70 bg-card p-2.5 text-left transition hover:border-primary/30 hover:bg-primary/5" onClick={onClick}><p className="text-[10px] font-semibold">{title}</p><p className="text-[8.5px] text-muted-foreground">{body}</p></button>;
}

/* -------------------------------------------------------------- Accessibility */

export function Accessibility() {
  const os = useOS();
  const s = os.settings;
  const [testFocus, setTestFocus] = useState(false);
  const [rate, setRate] = useState(1);
  const [spoken, setSpoken] = useState(false);
  const [fg, setFg] = useState("#17202b");
  const [bg, setBg] = useState("#f4f1ea");
  const ratio = contrast(fg, bg);

  function readSummary() {
    if (!("speechSynthesis" in window)) { setSpoken(false); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(`WindOS accessibility. Text size ${s.fontScale} percent. Interface scale ${s.uiScale} percent. ${s.highContrast ? "High contrast is on." : "High contrast is off."} ${s.reducedMotion ? "Reduced motion is on." : ""} Use Tab to move between controls and Enter to activate them.`);
    utterance.rate = rate;
    utterance.onend = () => setSpoken(false);
    setSpoken(true);
    window.speechSynthesis.speak(utterance);
  }

  function stopReading() {
    window.speechSynthesis?.cancel();
    setSpoken(false);
  }

  function toggle<K extends keyof typeof s>(key: K, value: (typeof s)[K]) {
    os.updateSettings({ [key]: value } as Partial<typeof s>);
  }

  function reset() {
    os.updateSettings({ reducedMotion: false, highContrast: false, largeCursor: false, fontScale: 100, uiScale: 100, animations: true, compactMode: false, notificationBanner: true });
  }

  return (
    <AppShell>
      <AppHeader icon={Eye} title="WindAccessibility" subtitle="Make WindOS easier to see, hear and operate · changes apply instantly" actions={<GhostButton onClick={reset}><RefreshCw className="size-3.5" /> Reset accessibility</GhostButton>} />
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="mx-auto max-w-3xl space-y-2.5">
          <div className="grid gap-2 sm:grid-cols-3">
            <Preset title="Comfort" body="Soft motion, default contrast" active={!s.highContrast && !s.reducedMotion} onClick={reset} icon={Sparkles} />
            <Preset title="High contrast" body="Stronger borders and text" active={s.highContrast} onClick={() => os.updateSettings({ highContrast: true, reducedMotion: true })} icon={Eye} />
            <Preset title="Reduced motion" body="No decorative animation" active={s.reducedMotion && !s.highContrast} onClick={() => os.updateSettings({ reducedMotion: true, animations: false })} icon={Waves} />
          </div>

          <div className="grid gap-2.5 md:grid-cols-2">
            <Panel>
              <SectionTitle>Vision</SectionTitle>
              <div className="space-y-1.5">
                <Toggle label="High contrast" hint="Stronger borders, darker muted text" checked={s.highContrast} onChange={(value) => toggle("highContrast", value)} />
                <Toggle label="Reduce motion" hint="Turns off window and boot transitions" checked={s.reducedMotion} onChange={(value) => toggle("reducedMotion", value)} />
                <Toggle label="Large cursor" hint="A larger pointer where CSS supports it" checked={s.largeCursor} onChange={(value) => toggle("largeCursor", value)} />
                <Toggle label="Compact spacing" hint="Denser lists and controls" checked={s.compactMode} onChange={(value) => toggle("compactMode", value)} />
                <Toggle label="Interface transparency" hint="Uses translucent surfaces where supported" checked={s.transparency} onChange={(value) => toggle("transparency", value)} />
                <Field label={`Text size · ${s.fontScale}%`}><input type="range" min={85} max={135} step={5} value={s.fontScale} onChange={(event) => toggle("fontScale", Number(event.target.value))} className="w-full accent-[var(--os-accent)]" /></Field>
                <Field label={`Interface scale · ${s.uiScale}%`}><input type="range" min={85} max={125} step={5} value={s.uiScale} onChange={(event) => toggle("uiScale", Number(event.target.value))} className="w-full accent-[var(--os-accent)]" /></Field>
              </div>
            </Panel>
            <Panel>
              <SectionTitle>Hearing & feedback</SectionTitle>
              <div className="space-y-1.5">
                <Toggle label="Interface sounds" hint="Boot chime, install and error cues" checked={s.sounds} onChange={(value) => toggle("sounds", value)} />
                <Toggle label="Notification sounds" hint="A quiet chime for notifications" checked={s.notificationSounds} onChange={(value) => toggle("notificationSounds", value)} />
                <Toggle label="Visual notification banners" hint="Show a banner even when sound is off" checked={s.notificationBanner} onChange={(value) => toggle("notificationBanner", value)} />
                <div className="rounded-lg border border-border/60 bg-muted/20 p-2">
                  <p className="text-[9px] font-medium">Visual alternative</p>
                  <p className="text-[8px] leading-relaxed text-muted-foreground">Notifications always appear in Notification Center and the taskbar counter. WindOS does not flash the screen.</p>
                </div>
                <div className="flex items-center gap-2"><Volume2 className="size-3.5 text-muted-foreground" /><span className="flex-1 text-[9px]">Volume</span><input type="range" min={0} max={100} value={s.volume} onChange={(event) => toggle("volume", Number(event.target.value))} className="w-24 accent-[var(--os-accent)]" /><span className="w-6 text-right text-[8px] text-muted-foreground">{s.volume}</span></div>
              </div>
            </Panel>
          </div>

          <div className="grid gap-2.5 md:grid-cols-2">
            <Panel>
              <SectionTitle action={<Pill tone={s.uiScale > 100 || s.fontScale > 100 ? "accent" : "neutral"}>{Math.round(s.uiScale)}% UI</Pill>}>Magnifier & reading</SectionTitle>
              <p className="text-[8.5px] leading-relaxed text-muted-foreground">Magnify the whole WindOS surface using interface scale, or read a spoken summary with your browser’s speech engine.</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                <GhostButton className="h-6 text-[8.5px]" onClick={() => toggle("uiScale", Math.min(125, s.uiScale + 5))}><ZoomIn className="size-2.5" /> Magnify</GhostButton>
                <GhostButton className="h-6 text-[8.5px]" onClick={() => { toggle("uiScale", 100); toggle("fontScale", 100); }}>Reset 100%</GhostButton>
                <GhostButton className="h-6 text-[8.5px]" onClick={() => toggle("fontScale", Math.min(135, s.fontScale + 5))}><Type className="size-2.5" /> Larger text</GhostButton>
              </div>
              <div className="mt-2 flex items-center gap-1.5"><span className="text-[9px] text-muted-foreground">Speech rate</span><input type="range" min={0.6} max={1.8} step={0.1} value={rate} onChange={(event) => setRate(Number(event.target.value))} className="flex-1 accent-[var(--os-accent)]" /><span className="w-7 text-right text-[8px]">{rate.toFixed(1)}×</span></div>
              <div className="mt-1.5 flex gap-1"><PrimaryButton className="h-6 text-[8.5px]" onClick={readSummary}><Volume2 className="size-2.5" /> Read summary</PrimaryButton>{spoken && <GhostButton className="h-6 text-[8.5px]" onClick={stopReading}>Stop</GhostButton>}</div>
              {!("speechSynthesis" in window) && <p className="mt-1 text-[8px] text-amber-600">Speech synthesis is not available in this browser.</p>}
            </Panel>
            <Panel>
              <SectionTitle action={<button className={cn("rounded border px-1.5 py-0.5 text-[8.5px]", testFocus ? "border-primary text-primary" : "border-border")} onClick={() => setTestFocus((value) => !value)}>Test focus ring</button>}>Keyboard & interaction</SectionTitle>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Toggle label="Animations" hint="Interface polish and panel motion" checked={s.animations} onChange={(value) => toggle("animations", value)} />
                <Toggle label="Double-click to open" hint="Matches classic desktop behaviour" checked={s.doubleClickOpen} onChange={(value) => toggle("doubleClickOpen", value)} />
                <Toggle label="Grid snap" hint="Snaps desktop icons to a grid" checked={s.gridSnap} onChange={(value) => toggle("gridSnap", value)} />
                <button className="mt-1 flex items-center gap-1.5 rounded border border-border px-2 py-1 text-[9px] hover:bg-muted"><Keyboard className="size-3" /> Keyboard shortcuts</button>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/15 p-2">
                <p className="text-[9px] font-medium">Try keyboard navigation</p>
                <p className="text-[8px] leading-relaxed text-muted-foreground">Press Tab to move through controls. The focused control has a visible ring. Enter or Space activates it. Ctrl + Space opens WindOS search anywhere.</p>
                {testFocus && <button autoFocus className="mt-2 rounded-md bg-primary px-2 py-1 text-[9px] font-medium text-primary-foreground outline-none ring-2 ring-primary ring-offset-2 ring-offset-background">I have keyboard focus</button>}
                <p className="mt-2 text-[8px] text-muted-foreground">Focus is never trapped in a panel. Escape closes menus.</p>
              </div>
            </div>
          </Panel>
          </div>

          <div className="grid gap-2.5 md:grid-cols-2">
            <Panel>
              <SectionTitle>Contrast checker</SectionTitle>
              <p className="text-[8.5px] text-muted-foreground">Check two colours against WCAG 2.1 contrast thresholds. This is a guide, not a certification.</p>
              <div className="mt-2 flex gap-2">
                <label className="flex items-center gap-1 text-[8.5px]">Text <input type="color" value={fg} onChange={(event) => setFg(event.target.value)} className="size-7 rounded border border-border bg-transparent p-0" /></label>
                <label className="flex items-center gap-1 text-[8.5px]">Background <input type="color" value={bg} onChange={(event) => setBg(event.target.value)} className="size-7 rounded border border-border bg-transparent p-0" /></label>
              </div>
              <div className="mt-2 rounded-lg p-4" style={{ background: bg, color: fg }}><p className="text-[14px] font-semibold">Readable text</p><p className="text-[10px]">Smaller sample copy at body size.</p></div>
              <div className="mt-2 flex items-center gap-2"><span className={cn("rounded px-1.5 py-0.5 text-[9px] font-semibold", ratio >= 4.5 ? "bg-emerald-500/10 text-emerald-600" : ratio >= 3 ? "bg-amber-500/10 text-amber-600" : "bg-red-500/10 text-red-500")}>{ratio.toFixed(2)}:1</span><span className="text-[8.5px] text-muted-foreground">{ratio >= 7 ? "AAA normal text" : ratio >= 4.5 ? "AA normal text" : ratio >= 3 ? "AA large text only" : "below AA"}</span></div>
            </Panel>
            <Panel>
              <SectionTitle>Known boundaries</SectionTitle>
              <div className="space-y-1 text-[8.5px] leading-relaxed text-muted-foreground">
                <p className="flex gap-1"><Info className="mt-0.5 size-2.5 shrink-0" /> WindOS cannot control your operating system’s screen reader, cursor size, or system-level zoom. It provides semantic HTML, ARIA labels and in-app scaling.</p>
                <p className="flex gap-1"><Info className="mt-0.5 size-2.5 shrink-0" /> Large cursor changes the pointer inside the WindOS surface where the browser allows custom cursors.</p>
                <p className="flex gap-1"><Info className="mt-0.5 size-2.5 shrink-0" /> Reduced motion respects both the WindOS toggle and the device’s prefers-reduced-motion setting.</p>
                <p className="flex gap-1"><CheckCircle2 className="mt-0.5 size-2.5 shrink-0 text-emerald-500" /> All primary controls are native buttons, inputs and links reachable by keyboard.</p>
              </div>
            </Panel>
          </div>

          <Panel>
            <SectionTitle>Keyboard reference</SectionTitle>
            <div className="grid gap-1 text-[8.5px] sm:grid-cols-2">
              {[["Ctrl + Space", "Search everything"], ["Alt + Tab", "Task view"], ["Ctrl + Alt + T", "Terminal"], ["Ctrl + Shift + S", "Screen capture"], ["Escape", "Close menu or dialog"], ["Ctrl + S", "Save in editors"], ["Ctrl + Enter", "Run preview in Code"], ["Tab / Shift+Tab", "Move focus"]].map(([keys, action]) => <div key={keys} className="flex items-center gap-2"><kbd className="rounded border border-border bg-muted px-1 py-0.5 font-sans text-[8px]">{keys}</kbd><span className="text-muted-foreground">{action}</span></div>)}
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded border border-border/50 px-2 py-1.5">
      <span className="min-w-0 flex-1"><span className="block text-[9.5px] font-medium">{label}</span>{hint && <span className="block text-[8px] leading-snug text-muted-foreground">{hint}</span>}</span>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={cn("relative mt-0.5 h-4 w-8 shrink-0 rounded-full transition", checked ? "bg-primary" : "bg-muted-foreground/25")}><span className={cn("absolute top-0.5 size-3 rounded-full bg-white transition-all", checked ? "left-4" : "left-0.5")} /></button>
    </label>
  );
}

function Preset({ title, body, active, onClick, icon: Icon }: { title: string; body: string; active: boolean; onClick: () => void; icon: typeof Eye }) {
  return <button onClick={onClick} className={cn("rounded-xl border p-2.5 text-left transition", active ? "border-primary/40 bg-primary/5" : "border-border/70 bg-card hover:bg-muted/40")}><Icon className={cn("mb-1 size-4", active ? "text-primary" : "text-muted-foreground")} /><p className="text-[10px] font-semibold">{title}</p><p className="text-[8px] text-muted-foreground">{body}</p></button>;
}

function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const channels = hex.replace("#", "").match(/.{2}/g)?.map((value) => parseInt(value, 16) / 255) ?? [0, 0, 0];
    const linear = channels.map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
