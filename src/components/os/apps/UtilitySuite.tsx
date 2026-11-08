import { useEffect, useMemo, useRef, useState } from "react";
import { useOS } from "@/lib/os/store";
import { usePersisted } from "@/lib/os/hooks";
import { markdownToHtml } from "@/lib/os/markdown";
import { downloadText } from "@/lib/os/zip";
import { cn } from "@/lib/utils";
import { AppShell, AppHeader, AppToolbar, GhostButton, PrimaryButton, SearchInput, inputClass, textareaClass, selectClass, Panel, SectionTitle, Pill, EmptyState } from "./ui";
import { ArrowLeftRight, Check, ClipboardCopy, Code2, Copy, Download, Eye, FileCode2, Gamepad2, Hash, KeyRound, Pencil, Palette, Play, Plus, RefreshCw, Save, Search, Sparkles, Square, Trash2, Trophy, Volume2, VolumeX, Wand2, X } from "lucide-react";

/* ------------------------------------------------------------------ Password */

const CHARSETS = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  numbers: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.?/",
};

export function PasswordGen() {
  const os = useOS();
  const [length, setLength] = useState(20);
  const [sets, setSets] = useState({ lower: true, upper: true, numbers: true, symbols: true });
  const [noAmbiguous, setNoAmbiguous] = useState(true);
  const [password, setPassword] = useState("");
  const [history, setHistory] = useState<string[]>([]);

  function generate() {
    let pool = Object.entries(sets).filter(([, on]) => on).map(([key]) => CHARSETS[key as keyof typeof CHARSETS]).join("");
    if (!pool) pool = CHARSETS.lower;
    if (noAmbiguous) pool = pool.replace(/[Il1O0o]/g, "");
    const values = new Uint32Array(length);
    crypto.getRandomValues(values);
    const next = Array.from(values, (value) => pool[value % pool.length]).join("");
    setPassword(next);
    setHistory((prev) => [next, ...prev].slice(0, 8));
  }
  useEffect(() => { generate(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [length, sets, noAmbiguous]);

  const pool = Object.entries(sets).filter(([, on]) => on).reduce((sum, [key]) => sum + CHARSETS[key as keyof typeof CHARSETS].length, 0);
  const entropy = password ? Math.round(password.length * Math.log2(Math.max(2, pool))) : 0;
  const strength = entropy > 110 ? "Very strong" : entropy > 80 ? "Strong" : entropy > 50 ? "Reasonable" : "Weak";

  return (
    <AppShell>
      <AppHeader icon={KeyRound} title="WindPasswords" subtitle="Cryptographically random · generated locally · never stored remotely" actions={<PrimaryButton onClick={generate}><RefreshCw className="size-3.5" /> Generate</PrimaryButton>} />
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-xl space-y-3">
          <div className="rounded-xl border border-border/70 bg-gradient-to-br from-primary/8 to-card p-4">
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 break-all rounded-lg border border-border/60 bg-background px-3 py-2.5 font-mono text-[15px] tracking-wide">{password || "—"}</code>
              <button className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground" onClick={() => { void os.copyText(password, "WindPasswords"); }} aria-label="Copy password"><Copy className="size-4" /></button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full", entropy > 110 ? "bg-emerald-500" : entropy > 80 ? "bg-teal-500" : entropy > 50 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${Math.min(100, entropy)}%` }} /></div>
              <span className="text-[9px] text-muted-foreground">{entropy} bits · {strength}</span>
            </div>
          </div>
          <Panel>
            <div className="flex items-center justify-between text-[10px]"><span>Length</span><span className="tabular-nums text-muted-foreground">{length} characters</span></div>
            <input type="range" min={8} max={64} value={length} onChange={(event) => setLength(Number(event.target.value))} className="mt-1 w-full accent-[var(--os-accent)]" />
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {(Object.keys(CHARSETS) as (keyof typeof CHARSETS)[]).map((key) => (
                <label key={key} className="flex items-center gap-1.5 rounded border border-border/60 px-2 py-1 text-[10px] capitalize">
                  <input type="checkbox" checked={sets[key]} onChange={(event) => setSets({ ...sets, [key]: event.target.checked })} className="accent-[var(--os-accent)]" /> {key}
                </label>
              ))}
            </div>
            <label className="mt-2 flex items-center gap-1.5 text-[9.5px] text-muted-foreground"><input type="checkbox" checked={noAmbiguous} onChange={(event) => setNoAmbiguous(event.target.checked)} className="accent-[var(--os-accent)]" /> Avoid ambiguous characters (I, l, 1, O, 0)</label>
          </Panel>
          {history.length > 0 && (
            <Panel>
              <SectionTitle>Session history</SectionTitle>
              <div className="space-y-1">
                {history.map((entry, index) => (
                  <div key={index} className="flex items-center gap-1 rounded border border-border/50 px-1.5 py-1">
                    <code className="min-w-0 flex-1 truncate font-mono text-[9.5px] text-muted-foreground">{entry}</code>
                    <button className="rounded p-0.5 hover:bg-muted" onClick={() => void os.copyText(entry, "WindPasswords")} aria-label="Copy"><Copy className="size-2.5" /></button>
                  </div>
                ))}
              </div>
              <p className="mt-1 text-[8px] text-muted-foreground">History is kept in memory for this window only; it is not persisted.</p>
            </Panel>
          )}
          <p className="text-[8.5px] leading-relaxed text-muted-foreground">Uses `crypto.getRandomValues` in your browser. WindOS cannot access your password manager or password fields outside this app. Generate unique passwords and store them in a trusted manager.</p>
        </div>
      </div>
    </AppShell>
  );
}

/* ------------------------------------------------------------ UnitConverter */

const UNITS: Record<string, Record<string, number>> = {
  Length: { Metres: 1, Kilometres: 1000, Centimetres: 0.01, Millimetres: 0.001, Miles: 1609.344, Yards: 0.9144, Feet: 0.3048, Inches: 0.0254 },
  Weight: { Kilograms: 1, Grams: 0.001, Tonnes: 1000, Pounds: 0.45359237, Ounces: 0.0283495, Stones: 6.35029 },
  Data: { Bytes: 1, Kilobytes: 1024, Megabytes: 1024 ** 2, Gigabytes: 1024 ** 3, Terabytes: 1024 ** 4 },
  Time: { Seconds: 1, Minutes: 60, Hours: 3600, Days: 86400, Weeks: 604800, Years: 31557600 },
  Speed: { "m/s": 1, "km/h": 0.277778, mph: 0.44704, Knots: 0.514444 },
};

export function UnitConverter() {
  const [category, setCategory] = useState("Length");
  const [from, setFrom] = useState("Metres");
  const [to, setTo] = useState("Kilometres");
  const [value, setValue] = useState("1");
  const [temp, setTemp] = useState({ from: "Celsius", to: "Fahrenheit" });

  const units = category === "Temperature" ? { Celsius: 1, Fahrenheit: 1, Kelvin: 1 } : UNITS[category];
  const names = Object.keys(units);
  const numeric = Number(value);
  let result: number | null = null;
  if (Number.isFinite(numeric)) {
    if (category === "Temperature") {
      const c = temp.from === "Celsius" ? numeric : temp.from === "Fahrenheit" ? (numeric - 32) * 5 / 9 : numeric - 273.15;
      result = temp.to === "Celsius" ? c : temp.to === "Fahrenheit" ? c * 9 / 5 + 32 : c + 273.15;
    } else {
      result = (numeric * units[from]) / units[to];
    }
  }

  function switchCategory(next: string) {
    setCategory(next);
    const pool = next === "Temperature" ? ["Celsius", "Fahrenheit", "Kelvin"] : Object.keys(UNITS[next]);
    setFrom(pool[0]);
    setTo(pool[1] ?? pool[0]);
  }

  const activeFrom = category === "Temperature" ? temp.from : from;
  const activeTo = category === "Temperature" ? temp.to : to;

  return (
    <AppShell>
      <AppHeader icon={ArrowLeftRight} title="Unit Converter" subtitle="Precise conversions across length, weight, data, time, speed and temperature" />
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-lg space-y-3">
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
            {[...Object.keys(UNITS), "Temperature"].map((item) => (
              <button key={item} onClick={() => switchCategory(item)} className={cn("rounded-md border px-1.5 py-1 text-[9.5px]", category === item ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")}>{item}</button>
            ))}
          </div>
          <Panel>
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
              <div>
                <p className="mb-1 text-[9px] text-muted-foreground">From</p>
                <select value={activeFrom} onChange={(event) => category === "Temperature" ? setTemp({ ...temp, from: event.target.value }) : setFrom(event.target.value)} className={cn(selectClass, "mb-1.5")}>{names.map((name) => <option key={name}>{name}</option>)}</select>
                <input value={value} onChange={(event) => setValue(event.target.value)} inputMode="decimal" className={cn(inputClass, "text-[15px]")} aria-label="Value to convert" />
              </div>
              <button className="mb-3 flex size-7 items-center justify-center rounded-full border border-border hover:bg-muted" onClick={() => { if (category === "Temperature") setTemp({ from: temp.to, to: temp.from }); else { setFrom(to); setTo(from); } }} aria-label="Swap units"><ArrowLeftRight className="size-3.5" /></button>
              <div>
                <p className="mb-1 text-[9px] text-muted-foreground">To</p>
                <select value={activeTo} onChange={(event) => category === "Temperature" ? setTemp({ ...temp, to: event.target.value }) : setTo(event.target.value)} className={cn(selectClass, "mb-1.5")}>{names.map((name) => <option key={name}>{name}</option>)}</select>
                <div className="flex h-8 items-center rounded-md border border-primary/30 bg-primary/5 px-2.5 text-[15px] font-semibold tabular-nums">{result === null ? "—" : parseFloat(result.toPrecision(10))}</div>
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-muted/30 px-2 py-1.5 text-center text-[9.5px] text-muted-foreground">{result === null ? "Enter a number" : `${value || 0} ${activeFrom} = ${parseFloat(result.toPrecision(10))} ${activeTo}`}</div>
          </Panel>
          <p className="text-[8.5px] text-muted-foreground">Conversions use standard SI factors. Temperature uses exact offset formulas. Data units use binary multiples (1024).</p>
        </div>
      </div>
    </AppShell>
  );
}

/* ----------------------------------------------------------- MarkdownStudio */

export function MarkdownStudio({ payload }: { payload?: Record<string, unknown> }) {
  const os = useOS();
  const initial = typeof payload?.openId === "string" ? os.fs.byId(payload.openId) : undefined;
  const [text, setText] = useState(initial?.content ?? "# Markdown Studio\n\nWrite **Markdown** on the left and see the rendered document on the right.\n\n## Features\n\n- Live preview\n- Save to the virtual drive\n- Export as `.md`\n- Word and character counts\n\n> Everything stays in this browser.\n");
  const [name, setName] = useState(initial?.name.replace(/\.(md|txt)$/i, "") ?? "markdown-studio");
  const [split, setSplit] = useState(true);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  function save() {
    const filename = `${name.trim().replace(/[\\/:*?"<>|]/g, "") || "markdown-studio"}.md`;
    const node = os.fs.createFile("folder_documents", filename, text, "text/markdown");
    if (node) os.notify({ appId: "WindOS", title: "Markdown saved", body: `${node.name} is in Documents.` });
    else os.notify({ appId: "WindOS", title: "Read-only session", body: "Guest mode cannot write files." });
  }

  return (
    <AppShell>
      <AppHeader icon={Wand2} title="Markdown Studio" subtitle={`${words} words · ${text.length} characters · live preview`} actions={<><GhostButton onClick={() => downloadText(text, `${name}.md`, "text/markdown")}><Download className="size-3.5" /> Export</GhostButton><PrimaryButton onClick={save}><Save className="size-3.5" /> Save to Documents</PrimaryButton></>} />
      <AppToolbar>
        <input value={name} onChange={(event) => setName(event.target.value)} className={cn(inputClass, "h-7 w-44 font-mono text-[10px]")} aria-label="Filename" />
        <span className="text-[9.5px] text-muted-foreground">.md</span>
        <button className={cn("ml-auto flex h-7 items-center gap-1 rounded px-2 text-[10px]", split ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")} onClick={() => setSplit((v) => !v)}><Eye className="size-3" /> {split ? "Editor + preview" : "Preview"}</button>
      </AppToolbar>
      <div className="flex min-h-0 flex-1">
        {!split && <div className="min-h-0 flex-1 overflow-y-auto p-6"><div className="md-preview mx-auto max-w-2xl" dangerouslySetInnerHTML={{ __html: markdownToHtml(text) }} /></div>}
        {split && (
          <>
            <textarea value={text} onChange={(event) => setText(event.target.value)} className="min-h-0 w-1/2 flex-1 resize-none border-r border-border/60 bg-transparent p-4 font-mono text-[11px] leading-relaxed outline-none" spellCheck={false} aria-label="Markdown source" />
            <div className="min-h-0 w-1/2 flex-1 overflow-y-auto p-4"><div className="md-preview" dangerouslySetInnerHTML={{ __html: markdownToHtml(text) }} /></div>
          </>
        )}
      </div>
    </AppShell>
  );
}

/* -------------------------------------------------------------- AmbientRadio */

const AMBIENCE = [
  { id: "rain", name: "Rain on glass", note: "Filtered white noise", freq: 1400, q: 0.4 },
  { id: "ocean", name: "Slow ocean", note: "Low-passed surf", freq: 420, q: 0.6 },
  { id: "wind", name: "High wind", note: "Band-passed gusts", freq: 780, q: 1.2 },
  { id: "hearth", name: "Quiet hearth", note: "Warm low rumble", freq: 180, q: 0.8 },
];

export function AmbientRadio() {
  const os = useOS();
  const [playing, setPlaying] = useState<string | null>(null);
  const [volume, setVolume] = useState(35);
  const [timer, setTimer] = useState(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<{ source: AudioBufferSourceNode; gain: GainNode; filter: BiquadFilterNode } | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (remaining === null) return;
    if (remaining <= 0) { stop(); setRemaining(null); return; }
    const timeout = window.setTimeout(() => setRemaining((value) => (value === null ? null : value - 1)), 1000);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  useEffect(() => () => stop(), []);

  function stop() {
    nodesRef.current?.source.stop();
    nodesRef.current = null;
    setPlaying(null);
  }

  function play(id: string) {
    stop();
    const preset = AMBIENCE.find((entry) => entry.id === id);
    if (!preset) return;
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) { os.notify({ appId: "AmbientRadio", title: "Audio unavailable", body: "This browser does not expose the Web Audio API." }); return; }
    const ctx = ctxRef.current ?? new AudioCtx();
    ctxRef.current = ctx;
    void ctx.resume();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = preset.freq;
    filter.Q.value = preset.q;
    const gain = ctx.createGain();
    gain.gain.value = volume / 100;
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();
    nodesRef.current = { source, gain, filter };
    setPlaying(id);
    if (timer > 0) setRemaining(timer * 60);
    os.logEvent({ level: "info", title: "Ambient audio started", detail: `${preset.name}, generated locally with Web Audio.` });
  }

  useEffect(() => {
    if (nodesRef.current) nodesRef.current.gain.gain.value = volume / 100;
  }, [volume]);

  return (
    <AppShell>
      <AppHeader icon={Volume2} title="Ambient Radio" subtitle="Procedural soundscapes generated in your browser · nothing streamed or downloaded" />
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-xl space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {AMBIENCE.map((entry) => (
              <button key={entry.id} className={cn("rounded-xl border p-3 text-left transition", playing === entry.id ? "border-primary bg-primary/8" : "border-border/70 bg-card hover:border-primary/25")} onClick={() => playing === entry.id ? stop() : play(entry.id)}>
                <div className="flex items-center justify-between">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">{playing === entry.id ? <Volume2 className="size-4" /> : <Play className="size-4" />}</span>
                  {playing === entry.id && <span className="flex items-center gap-1 text-[8px] text-primary"><span className="size-1.5 animate-pulse rounded-full bg-primary" /> playing</span>}
                </div>
                <p className="mt-2 text-[11px] font-medium">{entry.name}</p>
                <p className="text-[8.5px] text-muted-foreground">{entry.note}</p>
              </button>
            ))}
          </div>
          <Panel>
            <div className="flex items-center gap-2 text-[10px]">
              {playing ? <Volume2 className="size-4 text-primary" /> : <VolumeX className="size-4 text-muted-foreground" />}
              <span className="flex-1">{playing ? AMBIENCE.find((entry) => entry.id === playing)?.name : "Stopped"}</span>
              <button className="flex items-center gap-1 rounded border border-border px-2 py-1 text-[9px]" onClick={() => playing && stop()} disabled={!playing}><Square className="size-2.5" /> Stop</button>
            </div>
            <div className="mt-2 flex items-center gap-2 text-[9.5px] text-muted-foreground"><span>Volume</span><input type="range" min={0} max={100} value={volume} onChange={(event) => setVolume(Number(event.target.value))} className="flex-1 accent-[var(--os-accent)]" /><span className="w-7 text-right">{volume}%</span></div>
            <div className="mt-2 flex items-center gap-2 text-[9.5px] text-muted-foreground">
              <span>Sleep timer</span>
              <select value={timer} onChange={(event) => { const value = Number(event.target.value); setTimer(value); setRemaining(value ? value * 60 : null); }} className="h-7 rounded border border-border bg-background px-1 text-[9.5px]">
                <option value={0}>Off</option><option value={5}>5 min</option><option value={15}>15 min</option><option value={30}>30 min</option><option value={60}>60 min</option>
              </select>
              {remaining !== null && <span className="text-primary">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")} left</span>}
            </div>
          </Panel>
          <p className="text-[8.5px] leading-relaxed text-muted-foreground">Ambient Radio synthesises filtered noise with the Web Audio API. It cannot stream external radio stations or play copyrighted music. Audio stops when you close the window.</p>
        </div>
      </div>
    </AppShell>
  );
}

/* ------------------------------------------------------------- HabitTracker */

interface Habit { id: string; name: string; color: string; history: string[] }

export function HabitTracker() {
  const [habits, setHabits] = usePersisted<Habit[]>("habits.v1", [
    { id: "h1", name: "Read 20 pages", color: "#4f5bd5", history: [] },
    { id: "h2", name: "Walk outside", color: "#178f8a", history: [] },
  ]);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#4f5bd5");
  const today = new Date().toISOString().slice(0, 10);
  const days = Array.from({ length: 28 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (27 - index));
    return date.toISOString().slice(0, 10);
  });

  function toggle(id: string, date: string) {
    setHabits((prev) => prev.map((habit) => habit.id === id ? { ...habit, history: habit.history.includes(date) ? habit.history.filter((entry) => entry !== date) : [...habit.history, date] } : habit));
  }

  function streak(habit: Habit): number {
    let count = 0;
    const cursor = new Date();
    if (!habit.history.includes(cursor.toISOString().slice(0, 10))) cursor.setDate(cursor.getDate() - 1);
    while (habit.history.includes(cursor.toISOString().slice(0, 10))) { count++; cursor.setDate(cursor.getDate() - 1); }
    return count;
  }

  return (
    <AppShell>
      <AppHeader icon={Trophy} title="WindHabits" subtitle={`${habits.length} habits · ${habits.reduce((sum, habit) => sum + habit.history.length, 0)} check-ins recorded locally`} />
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-2xl space-y-3">
          <div className="flex gap-1.5">
            <input value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && name.trim()) { setHabits((prev) => [...prev, { id: `h_${Date.now()}`, name: name.trim(), color, history: [] }]); setName(""); } }} placeholder="Add a habit…" className={inputClass} />
            <input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-8 w-9 cursor-pointer rounded border border-border" aria-label="Habit colour" />
            <PrimaryButton disabled={!name.trim()} onClick={() => { setHabits((prev) => [...prev, { id: `h_${Date.now()}`, name: name.trim(), color, history: [] }]); setName(""); }}><Plus className="size-3.5" /> Add</PrimaryButton>
          </div>
          {habits.length === 0 && <EmptyState icon={Trophy} title="No habits yet" body="Add a small daily habit. Consistency appears as a heatmap over the last four weeks." />}
          {habits.map((habit) => (
            <Panel key={habit.id}>
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full" style={{ background: habit.color }} />
                <p className="min-w-0 flex-1 truncate text-[11px] font-medium">{habit.name}</p>
                <Pill tone="accent">{streak(habit)}-day streak</Pill>
                <button className={cn("rounded px-2 py-0.5 text-[9px] font-medium", habit.history.includes(today) ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "border border-border hover:bg-muted")} onClick={() => toggle(habit.id, today)}>{habit.history.includes(today) ? "Done today" : "Check in"}</button>
                <button className="rounded p-1 text-muted-foreground hover:text-red-500" onClick={() => setHabits((prev) => prev.filter((entry) => entry.id !== habit.id))} aria-label="Delete habit"><Trash2 className="size-3" /></button>
              </div>
              <div className="mt-2 flex gap-[3px]">
                {days.map((date) => (
                  <button key={date} className="h-5 flex-1 rounded-[3px] transition hover:opacity-80" style={{ background: habit.history.includes(date) ? habit.color : "var(--muted)" }} title={`${date}${habit.history.includes(date) ? " · done" : ""}`} onClick={() => toggle(habit.id, date)} aria-label={`${habit.name} on ${date}`} />
                ))}
              </div>
              <div className="mt-1 flex justify-between text-[7.5px] text-muted-foreground"><span>4 weeks ago</span><span>{new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span></div>
            </Panel>
          ))}
          <p className="text-[8.5px] text-muted-foreground">Stored in this browser. Tapping any square toggles that day. No account, reminders or cloud sync.</p>
        </div>
      </div>
    </AppShell>
  );
}

/* --------------------------------------------------------------- PaletteLab */

function hexToHsl(hex: string) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16) / 255, g = parseInt(value.slice(2, 4), 16) / 255, b = parseInt(value.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0; const l = (max + min) / 2; const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return { h, s: s * 100, l: l * 100 };
}
function hslToHex(h: number, s: number, l: number) {
  const sat = s / 100, light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;
  let [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}
function luminance(hex: string) {
  const value = hex.replace("#", "");
  const channels = [0, 2, 4].map((index) => {
    const v = parseInt(value.slice(index, index + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}
function contrast(a: string, b = "#ffffff") {
  const l1 = luminance(a), l2 = luminance(b);
  return ((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toFixed(2);
}

export function PaletteLab() {
  const os = useOS();
  const [base, setBase] = useState("#4f5bd5");
  const [locked, setLocked] = useState<boolean[]>([true, false, false, false, false]);
  const [seed, setSeed] = useState(0);
  const { h, s, l } = hexToHsl(base);
  const colors = useMemo(() => [base, ...[1, 2, 3, 4].map((index) => locked[index] ? undefined : hslToHex((h + index * 38 + seed * 17) % 360, Math.max(35, s - index * 6), Math.min(82, Math.max(24, l + index * 4 - 6))))].map((value, index) => value ?? hslToHex((h + index * 38) % 360, s, l)), [base, h, s, l, seed, locked]);

  function regenerate() { setSeed((value) => value + 1); }
  function exportCss() { os.copyText(colors.map((color, index) => `  --palette-${index + 1}: ${color};`).join("\n"), "PaletteLab"); }

  return (
    <AppShell>
      <AppHeader icon={Palette} title="Palette Lab" subtitle="Accessible colour palettes with WCAG contrast checks" actions={<><GhostButton onClick={exportCss}><ClipboardCopy className="size-3.5" /> Copy CSS tokens</GhostButton><PrimaryButton onClick={regenerate}><RefreshCw className="size-3.5" /> Regenerate</PrimaryButton></>} />
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-2xl space-y-3">
          <div className="flex items-center gap-2">
            <input type="color" value={base} onChange={(event) => { setBase(event.target.value); setLocked([true, false, false, false, false]); }} className="size-9 cursor-pointer rounded-lg border border-border" aria-label="Base colour" />
            <input value={base} onChange={(event) => { if (/^#[0-9a-f]{6}$/i.test(event.target.value)) setBase(event.target.value); }} className={cn(inputClass, "w-24 font-mono")} aria-label="Hex" />
            <p className="text-[9.5px] text-muted-foreground">Lock swatches to keep them while regenerating.</p>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {colors.map((color, index) => (
              <div key={index} className="overflow-hidden rounded-xl border border-border/60">
                <div className="flex h-28 flex-col justify-between p-2" style={{ background: color }}>
                  <button className="self-end rounded bg-black/20 p-1 text-white/90 backdrop-blur" onClick={() => setLocked((prev) => prev.map((value, i) => i === index ? !value : value))} aria-label={locked[index] ? "Unlock swatch" : "Lock swatch"}>{locked[index] ? <KeyRound className="size-3" /> : <Sparkles className="size-3" />}</button>
                  <p className="font-mono text-[9px] font-medium" style={{ color: luminance(color) > 0.45 ? "#111827" : "#ffffff" }}>{color.toUpperCase()}</p>
                </div>
                <div className="space-y-0.5 bg-card p-1.5 text-[8px] text-muted-foreground">
                  <p>on white <b className={Number(contrast(color)) >= 4.5 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}>{contrast(color)}:1</b></p>
                  <p>on black <b className={Number(contrast(color, "#000000")) >= 4.5 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}>{contrast(color, "#000000")}:1</b></p>
                  <button className="mt-0.5 flex w-full items-center justify-center gap-1 rounded bg-muted py-0.5 text-[8px] hover:bg-muted/70" onClick={() => void os.copyText(color, "PaletteLab")}><Copy className="size-2" /> Copy</button>
                </div>
              </div>
            ))}
          </div>
          <Panel>
            <SectionTitle>Accessibility summary</SectionTitle>
            <div className="space-y-1 text-[9.5px] text-muted-foreground">
              <p className="flex items-center gap-1.5"><Check className="size-3 text-emerald-500" /> Pairs at 4.5:1 or higher meet WCAG AA for normal text on white or black backgrounds.</p>
              <p className="flex items-center gap-1.5"><Check className="size-3 text-emerald-500" /> Hex values update live; CSS custom properties copy to the WindOS clipboard.</p>
              <p className="flex items-start gap-1.5">Palette generation is deterministic from the base hue and seed. Locked swatches survive regeneration.</p>
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}

/* --------------------------------------------------------------- SparkNotes */

const PROMPTS = [
  "Design a tiny room with one perfect object in it.",
  "Write a sentence that could start a very long story.",
  "What would you build if the only limit were attention?",
  "Describe a colour to someone who has never seen it.",
  "Invent a holiday and explain one ritual.",
  "What is a small system you use every day? Improve it.",
  "Write a six-word memoir for a fictional inventor.",
  "Choose a sound and describe its shape.",
  "What would a museum of ordinary moments contain?",
  "Name three things worth doing slowly.",
  "Sketch an interface for a machine that only says no.",
  "What is the opposite of a busy desk?",
];

export function SparkNotes() {
  const os = useOS();
  const [index, setIndex] = useState(() => Math.floor(Math.random() * PROMPTS.length));
  const [favorites, setFavorites] = usePersisted<number[]>("spark.favorites.v1", []);
  const prompt = PROMPTS[index];
  const favorite = favorites.includes(index);

  function saveToNotes() {
    const node = os.fs.createFile("folder_documents", `Spark ${new Date().toISOString().slice(0, 10)}.md`, `# ${prompt}\n\n`, "text/markdown");
    if (node) {
      os.notify({ appId: "WindOS", title: "Spark saved", body: `${node.name} is in Documents. Open it in WindNotes to respond.`, actions: [{ label: "Open in Notes", appId: "notes" }] });
    } else {
      os.notify({ appId: "WindOS", title: "Read-only session", body: "Guest mode cannot write to the drive." });
    }
  }

  return (
    <AppShell>
      <AppHeader icon={Sparkles} title="WindSpark" subtitle="One small creative prompt at a time" actions={<GhostButton onClick={() => setIndex((value) => (value + 1) % PROMPTS.length)}><RefreshCw className="size-3.5" /> Another</GhostButton>} />
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-primary/10 via-card to-card p-6 text-center shadow-sm">
            <p className="mb-3 text-[8px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Today’s spark</p>
            <p className="text-[20px] font-medium leading-snug tracking-tight">{prompt}</p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <button className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px]", favorite ? "border-rose-400/50 bg-rose-500/10 text-rose-600 dark:text-rose-300" : "border-border text-muted-foreground hover:bg-muted")} onClick={() => setFavorites((prev) => favorite ? prev.filter((value) => value !== index) : [...prev, index])}>
                <Sparkles className="size-3" /> {favorite ? "Saved" : "Save spark"}
              </button>
              <PrimaryButton onClick={saveToNotes}><FileCode2 className="size-3.5" /> Write in Notes</PrimaryButton>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {PROMPTS.map((_, value) => (
              <button key={value} className={cn("size-1.5 rounded-full", value === index ? "bg-primary" : favorites.includes(value) ? "bg-rose-400" : "bg-muted-foreground/20")} onClick={() => setIndex(value)} aria-label={`Prompt ${value + 1}`} />
            ))}
          </div>
          <p className="mt-4 text-center text-[8.5px] text-muted-foreground">Prompts are stored in WindOS. Favourites persist in this browser; nothing is sent anywhere.</p>
        </div>
      </div>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ DevTools */

export function DevTools() {
  const os = useOS();
  const [tab, setTab] = useState<"json" | "base64" | "hash" | "uuid" | "regex" | "time" | "text" | "color">("json");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [hash, setHash] = useState("");
  const [uuids, setUuids] = useState<string[]>([]);
  const [pattern, setPattern] = useState("\\b\\w+@\\w+\\.\\w+\\b");
  const [flags, setFlags] = useState("gi");
  const [regexInput, setRegexInput] = useState("Contact hello@windos.dev or support@windos.dev");
  const [timestamp, setTimestamp] = useState(String(Date.now()));
  const [colorHex, setColorHex] = useState("#4f5bd5");
  const colorRgb = hexToRgb(colorHex);
  const textStats = { words: input.trim() ? input.trim().split(/\s+/).length : 0, characters: input.length, lines: input ? input.split(/\n/).length : 0 };

  async function computeHash() {
    try {
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
      setHash(Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join(""));
      setError("");
    } catch { setError("Hashing is unavailable in this browser context."); }
  }

  let regexResult: { text: string; index: number }[] = [];
  let regexError = "";
  try {
    if (pattern) {
      const regex = new RegExp(pattern, flags.includes("g") ? flags : `${flags}g`);
      regexResult = Array.from(regexInput.matchAll(regex)).slice(0, 50).map((match) => ({ text: match[0], index: match.index ?? 0 }));
    }
  } catch (err) { regexError = err instanceof Error ? err.message : "Invalid expression"; }

  return (
    <AppShell>
      <AppHeader icon={Code2} title="WindDevTools" subtitle="Developer utilities · all processing happens locally" />
      <AppToolbar>
        {(["json", "base64", "hash", "uuid", "regex", "time", "text", "color"] as const).map((item) => (
          <button key={item} onClick={() => setTab(item)} className={cn("rounded px-2 py-1 text-[10px] capitalize", tab === item ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>{item === "base64" ? "Base64" : item === "uuid" ? "UUID" : item === "time" ? "Timestamp" : item}</button>
        ))}
      </AppToolbar>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {tab === "json" && (
          <div className="space-y-2">
            <textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder='{"hello":"windos"}' className={cn(textareaClass, "h-40 font-mono text-[10px]")} />
            <div className="flex gap-1.5">
              <PrimaryButton onClick={() => { try { setOutput(JSON.stringify(JSON.parse(input), null, 2)); setError(""); } catch (err) { setError(err instanceof Error ? err.message : "Invalid JSON"); } }}>Format</PrimaryButton>
              <GhostButton onClick={() => { try { setOutput(JSON.stringify(JSON.parse(input))); setError(""); } catch (err) { setError(err instanceof Error ? err.message : "Invalid JSON"); } }}>Minify</GhostButton>
              <GhostButton onClick={() => { try { const parsed = JSON.parse(input); const rows = Array.isArray(parsed) ? parsed : [parsed]; if (!rows.every((row) => row && typeof row === "object")) throw new Error("Rows must be objects"); setOutput(rows.map((row) => Object.keys(row).join(",")).join("\n") + "\n" + rows.map((row) => Object.values(row).map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n")); setError(""); } catch (err) { setError(err instanceof Error ? err.message : "Cannot convert"); } }}>To CSV</GhostButton>
              <GhostButton onClick={() => { if (output) void os.copyText(output, "WindDevTools"); }}><Copy className="size-3.5" /> Copy</GhostButton>
            </div>
            {error && <p className="text-[9.5px] text-red-500">{error}</p>}
            {output && <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-muted/25 p-2 font-mono text-[10px]">{output}</pre>}
          </div>
        )}
        {tab === "base64" && (
          <div className="space-y-2">
            <textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="Text to encode or Base64 to decode" className={cn(textareaClass, "h-32 font-mono text-[10px]")} />
            <div className="flex gap-1.5">
              <PrimaryButton onClick={() => { try { setOutput(btoa(unescape(encodeURIComponent(input)))); setError(""); } catch { setError("Could not encode input."); } }}>Encode</PrimaryButton>
              <GhostButton onClick={() => { try { setOutput(decodeURIComponent(escape(atob(input.trim())))); setError(""); } catch { setError("That is not valid Base64."); } }}>Decode</GhostButton>
              <GhostButton onClick={() => void os.copyText(output, "WindDevTools")} disabled={!output}>Copy result</GhostButton>
            </div>
            {error && <p className="text-[9.5px] text-red-500">{error}</p>}
            {output && <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-muted/25 p-2 font-mono text-[10px] whitespace-pre-wrap">{output}</pre>}
          </div>
        )}
        {tab === "hash" && (
          <div className="space-y-2">
            <textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="Text to hash with SHA-256" className={cn(textareaClass, "h-28 font-mono text-[10px]")} />
            <PrimaryButton onClick={computeHash}><Hash className="size-3.5" /> Compute SHA-256</PrimaryButton>
            {error && <p className="text-[9.5px] text-red-500">{error}</p>}
            {hash && <div className="rounded-lg border border-border bg-muted/25 p-2"><p className="break-all font-mono text-[10px]">{hash}</p><button className="mt-1 text-[9px] text-primary" onClick={() => void os.copyText(hash, "WindDevTools")}><Copy className="mr-1 inline size-2.5" />Copy digest</button></div>}
            <p className="text-[8.5px] text-muted-foreground">SHA-256 via the Web Crypto API. Useful for checking file or text integrity; not a password hash.</p>
          </div>
        )}
        {tab === "uuid" && (
          <div className="space-y-2">
            <div className="flex gap-1.5"><PrimaryButton onClick={() => setUuids((prev) => [crypto.randomUUID(), ...prev].slice(0, 20))}>Generate UUID v4</PrimaryButton><GhostButton onClick={() => setUuids([])} disabled={!uuids.length}>Clear</GhostButton><GhostButton onClick={() => uuids[0] && void os.copyText(uuids[0], "WindDevTools")} disabled={!uuids.length}><Copy className="size-3.5" /> Copy first</GhostButton></div>
            <div className="space-y-1">{uuids.map((id, index) => <div key={index} className="flex items-center gap-2 rounded border border-border/50 px-2 py-1 font-mono text-[9.5px]"><span className="flex-1">{id}</span><button onClick={() => void os.copyText(id, "WindDevTools")} className="text-muted-foreground hover:text-foreground"><Copy className="size-3" /></button></div>)}</div>
            <p className="text-[8.5px] text-muted-foreground">Uses `crypto.randomUUID`, available in secure contexts. UUIDs are random, not sequential.</p>
          </div>
        )}
        {tab === "regex" && (
          <div className="space-y-2">
            <div className="flex gap-1.5"><input value={pattern} onChange={(event) => setPattern(event.target.value)} className={cn(inputClass, "flex-1 font-mono")} aria-label="Regular expression" /><input value={flags} onChange={(event) => setFlags(event.target.value)} className={cn(inputClass, "w-16 font-mono")} aria-label="Flags" /></div>
            <textarea value={regexInput} onChange={(event) => setRegexInput(event.target.value)} className={cn(textareaClass, "h-24 font-mono text-[10px]")} />
            {regexError && <p className="text-[9.5px] text-red-500">{regexError}</p>}
            <p className="text-[9.5px] text-muted-foreground">{regexResult.length} match{regexResult.length === 1 ? "" : "es"}</p>
            <div className="flex flex-wrap gap-1">{regexResult.map((match, index) => <span key={index} className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] text-primary">{match.text} <span className="text-muted-foreground">@{match.index}</span></span>)}</div>
          </div>
        )}
        {tab === "text" && (
          <div className="space-y-2">
            <textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="Paste text to transform, count or sort" className={cn(textareaClass, "h-32 text-[10.5px]")} />
            <div className="flex flex-wrap gap-1.5">
              <PrimaryButton onClick={() => setOutput(input.toUpperCase())}>UPPER</PrimaryButton>
              <GhostButton onClick={() => setOutput(input.toLowerCase())}>lower</GhostButton>
              <GhostButton onClick={() => setOutput(input.replace(/\b\w/g, (character) => character.toUpperCase()))}>Title Case</GhostButton>
              <GhostButton onClick={() => setOutput(input.split(/\n/).sort((a, b) => a.localeCompare(b)).join("\n"))}>Sort lines</GhostButton>
              <GhostButton onClick={() => setOutput(input.split(/\n/).reverse().join("\n"))}>Reverse lines</GhostButton>
              <GhostButton onClick={() => setOutput(`Words: ${textStats.words}\nCharacters: ${textStats.characters}\nLines: ${textStats.lines}`)}>Statistics</GhostButton>
              <GhostButton onClick={() => setOutput("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante venenatis dapibus posuere velit aliquet. Donec ullamcorper nulla non metus auctor fringilla.")}>Lorem ipsum</GhostButton>
              <GhostButton onClick={() => { const value = new Uint32Array(1); crypto.getRandomValues(value); setOutput(String(value[0] % 1000000)); }}>Random number</GhostButton>
              <GhostButton onClick={() => void os.copyText(output, "WindDevTools")} disabled={!output}><Copy className="size-3" /> Copy</GhostButton>
            </div>
            <p className="text-[8.5px] text-muted-foreground">{textStats.words} words · {textStats.characters} characters · {textStats.lines} lines</p>
            {output && <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/25 p-2 font-mono text-[10px]">{output}</pre>}
          </div>
        )}
        {tab === "color" && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <input type="color" value={colorHex} onChange={(event) => setColorHex(event.target.value)} className="size-10 cursor-pointer rounded-lg border border-border" aria-label="Pick colour" />
              <input value={colorHex} onChange={(event) => { if (/^#[0-9a-f]{6}$/i.test(event.target.value)) setColorHex(event.target.value); }} className={cn(inputClass, "w-28 font-mono")} aria-label="Hex colour" />
              <span className="h-10 flex-1 rounded-lg border border-border" style={{ background: colorHex }} />
            </div>
            {colorRgb && (
              <div className="grid gap-1 sm:grid-cols-2">
                {[`HEX ${colorHex.toUpperCase()}`, `RGB rgb(${colorRgb.r}, ${colorRgb.g}, ${colorRgb.b})`, `HSL ${rgbToHsl(colorRgb.r, colorRgb.g, colorRgb.b)}`].map((value) => <div key={value} className="flex items-center gap-2 rounded border border-border/50 px-2 py-1.5 text-[9.5px]"><span className="flex-1 font-mono">{value}</span><button onClick={() => void os.copyText(value.slice(value.indexOf(" ") + 1), "WindDevTools")} className="text-muted-foreground hover:text-foreground" aria-label={`Copy ${value}`}><Copy className="size-3" /></button></div>)}
              </div>
            )}
            <p className="text-[8.5px] text-muted-foreground">Conversions happen locally in the browser. The CSS colour is shown in the preview swatch.</p>
          </div>
        )}
        {tab === "time" && (
          <div className="space-y-2">
            <input value={timestamp} onChange={(event) => setTimestamp(event.target.value)} className={cn(inputClass, "font-mono")} placeholder="Unix seconds or milliseconds" />
            <div className="flex gap-1.5">
              <PrimaryButton onClick={() => setTimestamp(String(Date.now()))}>Now (ms)</PrimaryButton>
              <GhostButton onClick={() => setTimestamp(String(Math.floor(Date.now() / 1000)))}>Now (s)</GhostButton>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 text-[10px]">
              {(() => { const numeric = Number(timestamp); if (!Number.isFinite(numeric)) return <p>Enter a number.</p>; const date = new Date(numeric > 1e12 ? numeric : numeric * 1000); return (<div className="space-y-1"><p><span className="text-muted-foreground">ISO:</span> <span className="font-mono">{date.toISOString()}</span></p><p><span className="text-muted-foreground">Local:</span> {date.toLocaleString()}</p><p><span className="text-muted-foreground">UTC:</span> {date.toUTCString()}</p><p><span className="text-muted-foreground">Relative:</span> {formatRelative(date.getTime())}</p></div>); })()}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  return match ? { r: parseInt(match[1], 16), g: parseInt(match[2], 16), b: parseInt(match[3], 16) } : null;
}

function rgbToHsl(r: number, g: number, b: number): string {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  let hue = 0;
  let saturation = 0;
  if (max !== min) {
    const delta = max - min;
    saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    hue = max === red ? ((green - blue) / delta + (green < blue ? 6 : 0)) : max === green ? (blue - red) / delta + 2 : (red - green) / delta + 4;
    hue *= 60;
  }
  return `hsl(${Math.round(hue)}, ${Math.round(saturation * 100)}%, ${Math.round(lightness * 100)}%)`;
}

function formatRelative(time: number) {
  const diff = time - Date.now();
  const units: [Intl.RelativeTimeFormatUnit, number][] = [["year", 31536000000], ["month", 2592000000], ["day", 86400000], ["hour", 3600000], ["minute", 60000], ["second", 1000]];
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [unit, ms] of units) if (Math.abs(diff) >= ms) return formatter.format(Math.round(diff / ms), unit);
  return "now";
}

/* ------------------------------------------------------------------- Games */

type Board = number[][];

function emptyBoard(): Board { return Array.from({ length: 4 }, () => Array(4).fill(0)); }
function addTile(board: Board): Board {
  const empty: [number, number][] = [];
  board.forEach((row, y) => row.forEach((value, x) => { if (!value) empty.push([y, x]); }));
  if (!empty.length) return board;
  const [y, x] = empty[Math.floor(Math.random() * empty.length)];
  const next = board.map((row) => [...row]);
  next[y][x] = Math.random() > 0.9 ? 4 : 2;
  return next;
}
function slide(values: number[]): { row: number[]; score: number } {
  const filtered = values.filter(Boolean);
  const row: number[] = [];
  let score = 0;
  for (let index = 0; index < filtered.length; index++) {
    if (filtered[index] === filtered[index + 1]) { row.push(filtered[index] * 2); score += filtered[index] * 2; index++; }
    else row.push(filtered[index]);
  }
  while (row.length < 4) row.push(0);
  return { row, score };
}
function moveBoard(board: Board, direction: "left" | "right" | "up" | "down"): { board: Board; score: number; moved: boolean } {
  let moved = false;
  let score = 0;
  const transpose = (matrix: Board) => matrix[0].map((_, index) => matrix.map((row) => row[index]));
  let next = board.map((row) => [...row]);
  const reverse = (matrix: Board) => matrix.map((row) => [...row].reverse());
  if (direction === "up" || direction === "down") next = transpose(next);
  if (direction === "right" || direction === "down") next = reverse(next);
  next = next.map((row) => {
    const result = slide(row);
    score += result.score;
    if (result.row.join() !== row.join()) moved = true;
    return result.row;
  });
  if (direction === "right" || direction === "down") next = reverse(next);
  if (direction === "up" || direction === "down") next = transpose(next);
  return { board: moved ? addTile(next) : next, score, moved };
}

export function Games({ windowId }: { windowId?: string }) {
  const os = useOS();
  const isActive = windowId ? os.activeWindowId === windowId : true;
  const [board, setBoard] = usePersisted<Board>("games.2048.board.v1", addTile(addTile(emptyBoard())));
  const [score, setScore] = usePersisted<number>("games.2048.score.v1", 0);
  const [best, setBest] = usePersisted<number>("games.2048.best.v1", 0);
  const [tab, setTab] = useState<"2048" | "memory" | "snake">("2048");
  const [memory, setMemory] = useState(() => shuffleCards());
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [snake, setSnake] = useState<{ x: number; y: number }[]>(() => [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }]);
  const [food, setFood] = useState({ x: 12, y: 8 });
  const [direction, setDirection] = useState<"up" | "down" | "left" | "right">("right");
  const [snakeScore, setSnakeScore] = useState(0);
  const [snakeBest, setSnakeBest] = usePersisted<number>("games.snake.best.v1", 0);
  const [snakeRunning, setSnakeRunning] = useState(false);
  const [snakeOver, setSnakeOver] = useState(false);
  const [snakeSpeed, setSnakeSpeed] = useState(150);

  function shuffleCards() {
    const symbols = ["W", "i", "n", "d", "O", "S", "★", "◆"];
    return [...symbols, ...symbols].sort(() => Math.random() - 0.5).map((symbol, index) => ({ id: index, symbol }));
  }

  function doMove(direction: "left" | "right" | "up" | "down") {
    const result = moveBoard(board, direction);
    if (!result.moved) return;
    setBoard(result.board);
    setScore((value) => { const next = value + result.score; setBest((current) => Math.max(current, next)); return next; });
  }

  useEffect(() => {
    if (!isActive) return;
    const handler = (event: KeyboardEvent) => {
      if (tab !== "2048") return;
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT") return;
      const map: Record<string, "left" | "right" | "up" | "down"> = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down", a: "left", d: "right", w: "up", s: "down" };
      if (map[event.key]) { event.preventDefault(); doMove(map[event.key]); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, tab, isActive]);

  useEffect(() => {
    if (!isActive || tab !== "snake" || !snakeRunning) return;
    const tick = window.setInterval(() => {
      setSnake((current) => {
        const head = current[0];
        const next = {
          up: { x: head.x, y: head.y - 1 },
          down: { x: head.x, y: head.y + 1 },
          left: { x: head.x - 1, y: head.y },
          right: { x: head.x + 1, y: head.y },
        }[direction];
        const hitWall = next.x < 0 || next.y < 0 || next.x >= 16 || next.y >= 16;
        const hitSelf = current.some((segment) => segment.x === next.x && segment.y === next.y);
        if (hitWall || hitSelf) {
          setSnakeRunning(false);
          setSnakeOver(true);
          setSnakeBest((value) => Math.max(value, snakeScore));
          return current;
        }
        const ate = next.x === food.x && next.y === food.y;
        const moved = [next, ...current];
        if (!ate) moved.pop();
        if (ate) {
          setSnakeScore((value) => value + 10);
          const open: { x: number; y: number }[] = [];
          for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (!moved.some((segment) => segment.x === x && segment.y === y)) open.push({ x, y });
          setFood(open[Math.floor(Math.random() * open.length)] ?? { x: 0, y: 0 });
        }
        return moved;
      });
    }, snakeSpeed);
    return () => window.clearInterval(tick);
  }, [tab, snakeRunning, direction, food, snakeSpeed, snakeScore, setSnakeBest, isActive]);

  useEffect(() => {
    if (!isActive || tab !== "snake") return;
    const keys: Record<string, "up" | "down" | "left" | "right"> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right" };
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT") return;
      const next = keys[event.key];
      if (!next) return;
      event.preventDefault();
      setDirection((current) => (current === "up" && next === "down") || (current === "down" && next === "up") || (current === "left" && next === "right") || (current === "right" && next === "left") ? current : next);
      setSnakeRunning(true);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [tab, isActive]);

  function resetSnake() {
    setSnake([{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }]);
    setFood({ x: 12, y: 8 });
    setDirection("right");
    setSnakeScore(0);
    setSnakeOver(false);
    setSnakeRunning(false);
  }

  function flip(index: number) {
    if (flipped.length >= 2 || flipped.includes(index) || matched.includes(index)) return;
    const next = [...flipped, index];
    setFlipped(next);
    if (next.length === 2) {
      setMoves((value) => value + 1);
      if (memory[next[0]].symbol === memory[next[1]].symbol) {
        setMatched((prev) => [...prev, ...next]);
        setFlipped([]);
      } else {
        window.setTimeout(() => setFlipped([]), 750);
      }
    }
  }

  const won = matched.length === memory.length;
  const bestTile = Math.max(...board.flat());
  const movesAvailable = (["left", "right", "up", "down"] as const).some((direction) => moveBoard(board, direction).moved);
  const game2048Over = !movesAvailable;
  const reached2048 = bestTile >= 2048;

  return (
    <AppShell>
      <AppHeader icon={Gamepad2} title="WindGames" subtitle="2048, memory match and Snake · scores persist in this browser" actions={<GhostButton onClick={() => { setBoard(addTile(addTile(emptyBoard()))); setScore(0); if (tab === "snake") resetSnake(); }}><RefreshCw className="size-3.5" /> New game</GhostButton>} />
      <AppToolbar>
        <button onClick={() => setTab("2048")} className={cn("rounded px-2 py-1 text-[10px]", tab === "2048" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>2048</button>
        <button onClick={() => setTab("memory")} className={cn("rounded px-2 py-1 text-[10px]", tab === "memory" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>Memory match</button>
        <button onClick={() => setTab("snake")} className={cn("rounded px-2 py-1 text-[10px]", tab === "snake" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>Snake</button>
        {tab === "2048" ? <div className="ml-auto flex items-center gap-3 text-[10px]"><span>Score <b className="tabular-nums">{score}</b></span><span className="text-muted-foreground">Best {best}</span><span className="text-muted-foreground">Top tile {bestTile}</span></div> : tab === "memory" ? <div className="ml-auto text-[10px] text-muted-foreground">Moves {moves} · pairs {matched.length / 2}/{memory.length / 2}</div> : <div className="ml-auto flex items-center gap-2 text-[10px]"><span>Score <b className="tabular-nums">{snakeScore}</b></span><span className="text-muted-foreground">Best {snakeBest}</span><select value={snakeSpeed} onChange={(event) => setSnakeSpeed(Number(event.target.value))} className="h-6 rounded border border-border bg-background px-1 text-[9px]"><option value={210}>Relaxed</option><option value={150}>Normal</option><option value={95}>Fast</option></select></div>}
      </AppToolbar>
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-4">
        {tab === "snake" ? (
          <div className="flex flex-col items-center">
            <div className="relative rounded-xl border border-border/60 bg-[#101b17] p-1.5 shadow-lg">
              <div className="grid grid-cols-16" style={{ gridTemplateColumns: "repeat(16, 17px)" }}>
                {Array.from({ length: 256 }, (_, index) => {
                  const x = index % 16;
                  const y = Math.floor(index / 16);
                  const head = snake[0]?.x === x && snake[0]?.y === y;
                  const body = snake.slice(1).some((segment) => segment.x === x && segment.y === y);
                  const isFood = food.x === x && food.y === y;
                  return <div key={index} className={cn("size-[17px] rounded-[3px] border border-black/10", head ? "bg-emerald-300" : body ? "bg-emerald-500/80" : isFood ? "bg-amber-400" : (x + y) % 2 ? "bg-white/[0.025]" : "bg-white/[0.05]")} />;
                })}
              </div>
              {(snakeOver || !snakeRunning) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-[#08110d]/80 text-center text-white backdrop-blur-[2px]">
                  <p className="text-[14px] font-semibold">{snakeOver ? "Game over" : snakeScore ? "Paused" : "Snake"}</p>
                  <p className="text-[9px] text-white/55">{snakeOver ? `Final score ${snakeScore} · best ${Math.max(snakeBest, snakeScore)}` : "Arrow keys / WASD · eat the amber blocks"}</p>
                  <button className="rounded-full bg-emerald-300 px-3 py-1 text-[9.5px] font-semibold text-emerald-950" onClick={() => { if (snakeOver) resetSnake(); setSnakeRunning(true); }}>{snakeOver ? "Play again" : snakeScore ? "Resume" : "Start"}</button>
                </div>
              )}
            </div>
            <div className="mt-2 flex gap-1.5">
              <button className="rounded border border-border px-2 py-1 text-[9.5px]" onClick={() => setSnakeRunning((value) => !value)}>{snakeRunning ? "Pause" : "Play"}</button>
              <button className="rounded border border-border px-2 py-1 text-[9.5px]" onClick={resetSnake}>Reset</button>
            </div>
            <p className="mt-2 text-center text-[8.5px] text-muted-foreground">16 × 16 board · ten points per block · speed adjustable above.</p>
          </div>
        ) : tab === "2048" ? (
          <div>
            <div className="grid grid-cols-4 gap-1.5 rounded-xl bg-[#efe9df] p-2 dark:bg-[#2a2f3a]">
              {board.flat().map((value, index) => (
                <div key={index} className="flex size-[62px] items-center justify-center rounded-lg text-[18px] font-bold tabular-nums transition-all sm:size-[72px] sm:text-[22px]" style={{ background: tileColor(value), color: value >= 8 ? "#f8fafc" : "#3f3a33" }}>{value || ""}</div>
              ))}
            </div>
            <div className="mt-2 flex justify-center gap-1.5 sm:hidden">
              {(["up", "left", "down", "right"] as const).map((direction) => <button key={direction} className="rounded border border-border px-3 py-1.5 text-[10px] capitalize" onClick={() => doMove(direction)}>{direction}</button>)}
            </div>
            {(reached2048 || game2048Over) && <p className={cn("mt-2 rounded-lg px-2 py-1 text-center text-[9.5px] font-medium", reached2048 ? "bg-amber-500/12 text-amber-700 dark:text-amber-300" : "bg-red-500/10 text-red-600 dark:text-red-300")}>{reached2048 ? "2048 reached — keep playing for a higher tile." : "No moves left — start a new game."}</p>}
            <p className="mt-2 text-center text-[8.5px] text-muted-foreground">Use arrow keys or WASD. Join equal tiles; reach 2048.</p>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-4 gap-2">
              {memory.map((card, index) => {
                const open = flipped.includes(index) || matched.includes(index);
                return <button key={card.id} onClick={() => flip(index)} className={cn("flex size-14 items-center justify-center rounded-xl border text-[18px] font-semibold transition-all sm:size-16", open ? "border-primary/30 bg-primary/8 text-primary" : "border-border bg-muted text-transparent hover:bg-muted/70")}>{open ? card.symbol : "?"}</button>;
              })}
            </div>
            {won && <p className="mt-3 text-center text-[11px] font-semibold text-emerald-600 dark:text-emerald-400"><Trophy className="mr-1 inline size-4" /> All pairs found in {moves} moves.</p>}
            <button className="mx-auto mt-3 flex items-center gap-1 rounded border border-border px-2 py-1 text-[9.5px]" onClick={() => { setMemory(shuffleCards()); setFlipped([]); setMatched([]); setMoves(0); }}><RefreshCw className="size-3" /> Shuffle</button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function tileColor(value: number): string {
  const colors: Record<number, string> = { 0: "rgba(127,127,127,0.10)", 2: "#efe6d8", 4: "#ebdcc4", 8: "#e8b47e", 16: "#e39a63", 32: "#df8355", 64: "#d66a44", 128: "#c9a94b", 256: "#c19a3d", 512: "#b58a32", 1024: "#a87a2a", 2048: "#8f6522" };
  return colors[value] ?? "#6b4c1e";
}
