import { useEffect, useRef, useState } from "react";
import { useOS } from "@/lib/os/store";
import { useNow, usePersisted, formatDuration, formatTime } from "@/lib/os/hooks";
import { formatBytes } from "@/lib/os/fs";
import { downloadBlob } from "@/lib/os/zip";
import { playSound } from "@/lib/os/sound";
import { cn } from "@/lib/utils";
import { AppShell, AppHeader, AppToolbar, EmptyState, GhostButton, PrimaryButton, SearchInput, inputClass, Panel, SectionTitle, Pill } from "./ui";
import { AlarmClock, Bell, Camera, Check, ChevronLeft, ChevronRight, Clock3, Download, Globe2, Image as ImageIcon, Images, Maximize2, Mic, Music, Pause, Play, Plus, Repeat, RotateCw, Shuffle, Square, Star, TimerReset, Trash2, Upload, Video, Volume2, VolumeX, X, ZoomIn, ZoomOut } from "lucide-react";

/* ------------------------------------------------------------------- Clock */

const ZONES = [
  ["Local", Intl.DateTimeFormat().resolvedOptions().timeZone],
  ["UTC", "UTC"],
  ["New York", "America/New_York"],
  ["London", "Europe/London"],
  ["Berlin", "Europe/Berlin"],
  ["Tokyo", "Asia/Tokyo"],
  ["Sydney", "Australia/Sydney"],
  ["Dubai", "Asia/Dubai"],
  ["Los Angeles", "America/Los_Angeles"],
];

interface Alarm { id: string; time: string; label: string; enabled: boolean; lastFired?: string }

export function Clock() {
  const os = useOS();
  const now = useNow(1000);
  const [tab, setTab] = useState<"clock" | "alarm" | "timer" | "stopwatch">("clock");
  const [zones, setZones] = usePersisted<string[]>("clock.zones.v1", ["UTC", "America/New_York", "Europe/London", "Asia/Tokyo"]);
  const [zonePick, setZonePick] = useState("Europe/Berlin");
  const [alarms, setAlarms] = usePersisted<Alarm[]>("clock.alarms.v1", []);
  const [alarmTime, setAlarmTime] = useState("07:30");
  const [alarmLabel, setAlarmLabel] = useState("Wake up");
  const [fired, setFired] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(300);
  const [timerLeft, setTimerLeft] = useState(300);
  const [timerRunning, setTimerRunning] = useState(false);
  const [swRunning, setSwRunning] = useState(false);
  const [swElapsed, setSwElapsed] = useState(0);
  const [laps, setLaps] = useState<number[]>([]);
  const swStart = useRef(0);
  const timerEnd = useRef(0);

  const date = new Date(now);
  const secondAngle = date.getSeconds() * 6;
  const minuteAngle = date.getMinutes() * 6 + date.getSeconds() * 0.1;
  const hourAngle = (date.getHours() % 12) * 30 + date.getMinutes() * 0.5;

  useEffect(() => {
    if (!swRunning) return;
    swStart.current = Date.now() - swElapsed;
    const id = window.setInterval(() => setSwElapsed(Date.now() - swStart.current), 37);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swRunning]);

  useEffect(() => {
    if (!timerRunning) return;
    timerEnd.current = Date.now() + timerLeft * 1000;
    const id = window.setInterval(() => {
      const left = Math.max(0, Math.round((timerEnd.current - Date.now()) / 1000));
      setTimerLeft(left);
      if (left === 0) {
        window.clearInterval(id);
        setTimerRunning(false);
        playSound("notify", os.settings.sounds);
        os.notify({ appId: "WindClock", title: "Timer finished", body: "Your WindClock timer reached zero." });
        setFired("Timer complete");
      }
    }, 250);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerRunning]);

  useEffect(() => {
    const current = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    const today = date.toISOString().slice(0, 10);
    const due = alarms.find((alarm) => alarm.enabled && alarm.time === current && alarm.lastFired !== `${today}${alarm.time}`);
    if (!due) return;
    setAlarms((prev) => prev.map((alarm) => alarm.id === due.id ? { ...alarm, lastFired: `${today}${alarm.time}` } : alarm));
    playSound("notify", os.settings.sounds);
    os.notify({ appId: "WindClock", title: `Alarm · ${due.label}`, body: `It is ${due.time}. This alarm fired inside WindOS.` });
    setFired(`Alarm: ${due.label}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Math.floor(now / 1000)]);

  function addZone() {
    if (!zones.includes(zonePick)) setZones([...zones, zonePick]);
  }

  function addAlarm() {
    setAlarms((prev) => [...prev, { id: `alarm_${Date.now()}`, time: alarmTime, label: alarmLabel.trim() || "Alarm", enabled: true }]);
    if (!os.hasPermission("clock", "notifications")) void os.requestPermission("clock", "notifications");
  }

  function startTimer() {
    if (timerLeft <= 0) setTimerLeft(timerSeconds);
    setTimerRunning(true);
    setFired(null);
  }

  return (
    <AppShell>
      <AppHeader icon={Clock3} title="WindClock" subtitle="Local time, world clocks, alarms, timer and stopwatch" actions={<span className="font-mono text-[11px] text-muted-foreground">{formatTime(date, os.settings.clock24h, os.settings.showSeconds)}</span>} />
      <AppToolbar>
        {(["clock", "alarm", "timer", "stopwatch"] as const).map((item) => <button key={item} onClick={() => setTab(item)} className={cn("rounded px-2.5 py-1 text-[10.5px] font-medium capitalize", tab === item ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>{item}</button>)}
        {fired && <span className="ml-auto flex items-center gap-1 text-[9.5px] text-primary"><Bell className="size-3" /> {fired}</span>}
      </AppToolbar>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === "clock" && (
          <div className="mx-auto max-w-lg space-y-3">
            <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-primary/10 via-card to-card p-6 text-center">
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
              <p className="mt-1 text-[46px] font-semibold leading-none tracking-tight tabular-nums">{formatTime(date, os.settings.clock24h, os.settings.showSeconds)}</p>
              <p className="mt-2 text-[9px] text-muted-foreground">{Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
              <svg viewBox="0 0 200 200" className="mx-auto mt-4 size-36" role="img" aria-label={`Analog clock showing ${formatTime(date, os.settings.clock24h, true)}`}>
                <circle cx="100" cy="100" r="94" fill="none" stroke="currentColor" strokeOpacity="0.14" strokeWidth="2" />
                {Array.from({ length: 12 }, (_, index) => {
                  const angle = (index * 30 * Math.PI) / 180;
                  const outer = 82;
                  const inner = index % 3 === 0 ? 72 : 77;
                  return <line key={index} x1={100 + Math.sin(angle) * inner} y1={100 - Math.cos(angle) * inner} x2={100 + Math.sin(angle) * outer} y2={100 - Math.cos(angle) * outer} stroke="currentColor" strokeOpacity={index % 3 === 0 ? 0.55 : 0.22} strokeWidth={index % 3 === 0 ? 3 : 1.5} strokeLinecap="round" />;
                })}
                <line x1="100" y1="100" x2={100 + Math.sin((hourAngle * Math.PI) / 180) * 44} y2={100 - Math.cos((hourAngle * Math.PI) / 180) * 44} stroke="var(--os-accent, #4f5bd5)" strokeWidth="6" strokeLinecap="round" />
                <line x1="100" y1="100" x2={100 + Math.sin((minuteAngle * Math.PI) / 180) * 66} y2={100 - Math.cos((minuteAngle * Math.PI) / 180) * 66} stroke="currentColor" strokeOpacity="0.72" strokeWidth="3.5" strokeLinecap="round" />
                <line x1="100" y1="100" x2={100 + Math.sin((secondAngle * Math.PI) / 180) * 72} y2={100 - Math.cos((secondAngle * Math.PI) / 180) * 72} stroke="#e16b5a" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="100" cy="100" r="4" fill="var(--os-accent, #4f5bd5)" />
              </svg>
            </div>
            <Panel>
              <SectionTitle>World clocks</SectionTitle>
              <div className="space-y-1">
                {zones.map((zone) => {
                  const label = ZONES.find(([, value]) => value === zone)?.[0] ?? zone.split("/").pop()?.replace(/_/g, " ") ?? zone;
                  return (
                    <div key={zone} className="flex items-center gap-2 rounded border border-border/50 px-2 py-1.5">
                      <Globe2 className="size-3.5 text-muted-foreground" />
                      <span className="flex-1 text-[10px] font-medium">{label}</span>
                      <span className="font-mono text-[12px] tabular-nums">{date.toLocaleTimeString(undefined, { timeZone: zone, hour: "2-digit", minute: "2-digit", hour12: !os.settings.clock24h })}</span>
                      <span className="w-24 text-right text-[8px] text-muted-foreground">{date.toLocaleDateString(undefined, { timeZone: zone, weekday: "short", month: "short", day: "numeric" })}</span>
                      {zone === "UTC" ? <span className="rounded bg-muted px-1 py-0.5 text-[7.5px] text-muted-foreground">reference</span> : <button className="rounded p-0.5 text-muted-foreground hover:text-red-500" onClick={() => setZones((prev) => prev.filter((value) => value !== zone))} aria-label={`Remove ${label}`}><X className="size-3" /></button>}
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex gap-1.5">
                <select value={zonePick} onChange={(event) => setZonePick(event.target.value)} className="h-7 flex-1 rounded border border-border bg-background px-1 text-[10px]">
                  {ZONES.map(([label, value]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <GhostButton className="h-7" onClick={addZone}><Plus className="size-3" /> Add</GhostButton>
              </div>
            </Panel>
          </div>
        )}

        {tab === "alarm" && (
          <div className="mx-auto max-w-lg space-y-3">
            <Panel>
              <div className="flex items-end gap-1.5">
                <input type="time" value={alarmTime} onChange={(event) => setAlarmTime(event.target.value)} className={cn(inputClass, "w-28 text-[13px]")} aria-label="Alarm time" />
                <input value={alarmLabel} onChange={(event) => setAlarmLabel(event.target.value)} placeholder="Label" className={inputClass} />
                <PrimaryButton onClick={addAlarm}><Plus className="size-3.5" /> Add</PrimaryButton>
                <GhostButton onClick={() => playSound("notify", true)}><Bell className="size-3.5" /> Test tone</GhostButton>
              </div>
              <p className="mt-1 text-[8.5px] text-muted-foreground">Alarms fire while WindOS is open. Notifications require the notifications permission. Test tone previews the generated chime even when notification sounds are disabled.</p>
            </Panel>
            <div className="space-y-1.5">
              {alarms.length === 0 && <EmptyState icon={AlarmClock} title="No alarms" body="Add an alarm for a gentle nudge inside WindOS." />}
              {alarms.map((alarm) => (
                <div key={alarm.id} className="flex items-center gap-2 rounded-xl border border-border/70 bg-card p-3">
                  <div className="flex-1">
                    <p className="text-[20px] font-semibold leading-none tabular-nums">{alarm.time}</p>
                    <p className="mt-1 text-[9px] text-muted-foreground">{alarm.label}</p>
                  </div>
                  <button role="switch" aria-checked={alarm.enabled} aria-label={`Toggle ${alarm.label}`} onClick={() => setAlarms((prev) => prev.map((entry) => entry.id === alarm.id ? { ...entry, enabled: !entry.enabled } : entry))} className={cn("relative h-5 w-9 rounded-full transition", alarm.enabled ? "bg-primary" : "bg-muted-foreground/25")}><span className={cn("absolute top-0.5 size-4 rounded-full bg-white shadow transition-all", alarm.enabled ? "left-[18px]" : "left-0.5")} /></button>
                  <button className="rounded p-1 text-muted-foreground hover:text-red-500" onClick={() => setAlarms((prev) => prev.filter((entry) => entry.id !== alarm.id))} aria-label="Delete alarm"><Trash2 className="size-3.5" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "timer" && (
          <div className="mx-auto max-w-sm text-center">
            <div className="rounded-2xl border border-border/70 bg-card p-6">
              <p className="text-[42px] font-semibold tabular-nums">{Math.floor(timerLeft / 60)}:{String(timerLeft % 60).padStart(2, "0")}</p>
              <div className="mt-3 flex justify-center gap-2">
                {[60, 300, 600, 1500].map((seconds) => <button key={seconds} className={cn("rounded-full border px-2.5 py-0.5 text-[9px]", timerSeconds === seconds ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")} onClick={() => { setTimerSeconds(seconds); setTimerLeft(seconds); setTimerRunning(false); }}>{seconds / 60} min</button>)}
              </div>
              <input type="number" min={1} value={Math.round(timerSeconds / 60)} onChange={(event) => { const seconds = Math.max(1, Number(event.target.value) || 1) * 60; setTimerSeconds(seconds); setTimerLeft(seconds); setTimerRunning(false); }} className={cn(inputClass, "mx-auto mt-2 w-20 text-center")} aria-label="Minutes" />
              <div className="mt-3 flex justify-center gap-2">
                <PrimaryButton onClick={startTimer}><Play className="size-3.5" /> Start</PrimaryButton>
                <GhostButton onClick={() => setTimerRunning(false)}><Pause className="size-3.5" /> Pause</GhostButton>
                <GhostButton onClick={() => { setTimerRunning(false); setTimerLeft(timerSeconds); }}><TimerReset className="size-3.5" /> Reset</GhostButton>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${timerSeconds ? ((timerSeconds - timerLeft) / timerSeconds) * 100 : 0}%` }} /></div>
            </div>
          </div>
        )}

        {tab === "stopwatch" && (
          <div className="mx-auto max-w-sm text-center">
            <div className="rounded-2xl border border-border/70 bg-card p-6">
              <p className="font-mono text-[38px] font-semibold tabular-nums">{String(Math.floor(swElapsed / 3600000)).padStart(2, "0")}:{String(Math.floor((swElapsed % 3600000) / 60000)).padStart(2, "0")}:{String(Math.floor((swElapsed % 60000) / 1000)).padStart(2, "0")}.{String(Math.floor((swElapsed % 1000) / 10)).padStart(2, "0")}</p>
              <div className="mt-3 flex justify-center gap-2">
                <PrimaryButton onClick={() => setSwRunning((value) => !value)}>{swRunning ? <><Pause className="size-3.5" /> Pause</> : <><Play className="size-3.5" /> Start</>}</PrimaryButton>
                <GhostButton onClick={() => setLaps((prev) => [swElapsed, ...prev].slice(0, 20))} disabled={!swRunning}><Plus className="size-3.5" /> Lap</GhostButton>
                <GhostButton onClick={() => { setSwRunning(false); setSwElapsed(0); setLaps([]); }}><TimerReset className="size-3.5" /> Reset</GhostButton>
              </div>
            </div>
            {laps.length > 0 && <div className="mt-2 space-y-1 text-left">{laps.map((lap, index) => <div key={index} className="flex justify-between rounded border border-border/50 px-2 py-1 text-[10px]"><span className="text-muted-foreground">Lap {laps.length - index}</span><span className="font-mono">{formatDuration(lap)}</span></div>)}</div>}
          </div>
        )}
      </div>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ Photos */

async function imageToDataUrl(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("read failed")); reader.readAsDataURL(file); });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => { const element = new Image(); element.onload = () => resolve(element); element.onerror = () => reject(new Error("decode failed")); element.src = dataUrl; });
  const scale = Math.min(1, 1800 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext("2d");
  if (!context) return dataUrl;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export function Photos({ windowId }: { windowId?: string }) {
  const os = useOS();
  const isActive = windowId ? os.activeWindowId === windowId : true;
  const images = os.fs.children("folder_pictures").filter((node) => node.type === "file" && ((node.mime ?? "").startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/i.test(node.name)));
  const [selectedId, setSelectedId] = useState<string | null>(images[0]?.id ?? null);
  const [dimensions, setDimensions] = useState("");
  const [query, setQuery] = useState("");
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [slideshow, setSlideshow] = useState(false);
  const [sort, setSort] = useState<"newest" | "name" | "favourites">("newest");
  const [toast, setToast] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setDimensions(""), [selectedId]);
  const selected = selectedId ? os.fs.byId(selectedId) : images[0];
  const filtered = images.filter((node) => node.name.toLowerCase().includes(query.toLowerCase())).sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "favourites" ? Number(b.favorite) - Number(a.favorite) || b.modifiedAt - a.modifiedAt : b.modifiedAt - a.modifiedAt);

  useEffect(() => {
    if (!slideshow) return;
    const id = window.setInterval(() => {
      setSelectedId((current) => {
        const index = images.findIndex((node) => node.id === current);
        return images[(index + 1) % images.length]?.id ?? current;
      });
      setRotation(0); setZoom(1);
    }, 3200);
    return () => window.clearInterval(id);
  }, [slideshow, images.length]);

  useEffect(() => setZoom(1), [selectedId]);

  useEffect(() => {
    if (!isActive) return;
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const index = filtered.findIndex((node) => node.id === selectedId);
      const next = filtered[(index + (event.key === "ArrowRight" ? 1 : -1) + filtered.length) % filtered.length];
      if (next) setSelectedId(next.id);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [filtered, selectedId, isActive]);

  function flash(message: string) { setToast(message); window.setTimeout(() => setToast(""), 2600); }

  async function importImages(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const dataUrl = await imageToDataUrl(file).catch(() => null);
      if (dataUrl) os.fs.createFile("folder_pictures", file.name.replace(/\.[^.]+$/, "") + ".jpg", dataUrl, "image/jpeg");
    }
    flash("Images imported into Pictures.");
  }

  return (
    <AppShell>
      <AppHeader icon={Images} title="WindPhotos" subtitle={`${images.length} images in Pictures · ${formatBytes(images.reduce((sum, node) => sum + node.size, 0))}`} actions={<><GhostButton onClick={() => inputRef.current?.click()}><Upload className="size-3.5" /> Import</GhostButton><PrimaryButton onClick={() => setSlideshow((value) => !value)}>{slideshow ? <><Pause className="size-3.5" /> Stop slideshow</> : <><Play className="size-3.5" /> Slideshow</>}</PrimaryButton></>} />
      <AppToolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Find a photo" className="w-44" />
        <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="h-7 rounded border border-border bg-background px-1 text-[9px]" aria-label="Sort photos"><option value="newest">Newest first</option><option value="name">Name A–Z</option><option value="favourites">Favourites first</option></select>
        {selected && <span className="ml-auto truncate text-[9.5px] text-muted-foreground">{selected.name} · {formatBytes(selected.size)}{dimensions ? ` · ${dimensions}` : ""}</span>}
      </AppToolbar>
      <div className="flex min-h-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#0e1420]">
          {selected && selected.content ? (
            <>
              <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3">
                <img src={selected.content} alt={selected.name} onLoad={(event) => setDimensions(`${event.currentTarget.naturalWidth}×${event.currentTarget.naturalHeight}`)} className="max-h-full max-w-full rounded-md object-contain shadow-2xl transition-transform" style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }} />
              </div>
              <div className="flex flex-wrap items-center justify-center gap-1.5 border-t border-white/10 px-3 py-2">
                <button className="rounded p-1.5 text-white/60 hover:bg-white/10" onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))} aria-label="Zoom out"><ZoomOut className="size-4" /></button>
                <span className="w-10 text-center text-[9px] text-white/50">{Math.round(zoom * 100)}%</span>
                <button className="rounded p-1.5 text-white/60 hover:bg-white/10" onClick={() => setZoom((z) => Math.min(4, z + 0.25))} aria-label="Zoom in"><ZoomIn className="size-4" /></button>
                <button className="rounded p-1.5 text-white/60 hover:bg-white/10" onClick={() => setRotation((r) => r + 90)} aria-label="Rotate"><RotateCw className="size-4" /></button>
                <div className="mx-1 h-4 w-px bg-white/15" />
                <button className="flex items-center gap-1 rounded px-2 py-1 text-[9.5px] text-white/70 hover:bg-white/10" onClick={() => { os.updateSettings({ wallpaper: selected.content!, wallpaperKind: "custom" }); flash("Wallpaper applied."); }}><ImageIcon className="size-3" /> Set wallpaper</button>
                <button className="flex items-center gap-1 rounded px-2 py-1 text-[9.5px] text-white/70 hover:bg-white/10" onClick={() => { const link = document.createElement("a"); link.href = selected.content!; link.download = selected.name; link.click(); }}><Download className="size-3" /> Download</button>
                <button className="flex items-center gap-1 rounded px-2 py-1 text-[9.5px] text-red-300/80 hover:bg-red-500/15" onClick={() => { os.fs.trash(selected.id); setSelectedId(images.find((node) => node.id !== selected.id)?.id ?? null); flash("Photo moved to the Recycle Bin."); }}><Trash2 className="size-3" /> Delete</button>
                <button className={`flex items-center gap-1 rounded px-2 py-1 text-[9.5px] ${selected.favorite ? "text-amber-300" : "text-white/70"} hover:bg-white/10`} onClick={() => os.fs.setFavorite(selected.id, !selected.favorite)}><Star className={`size-3 ${selected.favorite ? "fill-current" : ""}`} /> {selected.favorite ? "Favourite" : "Favourite"}</button>
                <button className="flex items-center gap-1 rounded px-2 py-1 text-[9.5px] text-white/70 hover:bg-white/10" onClick={() => os.openApp("files", { openId: selected.id })}><Maximize2 className="size-3" /> Properties</button>
              </div>
            </>
          ) : (
            <EmptyState icon={Images} title="No photos yet" body="Import images from your device, or save a painting from WindPaint. Everything is stored in the virtual Pictures folder." action={<GhostButton onClick={() => inputRef.current?.click()}>Import photos</GhostButton>} />
          )}
        </div>
        <aside className="hidden w-[190px] shrink-0 overflow-y-auto border-l border-border/60 bg-muted/15 p-2 sm:block">
          <p className="mb-1.5 text-[8.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Pictures</p>
          <div className="grid grid-cols-2 gap-1.5">
            {filtered.map((node) => (
              <button key={node.id} className={cn("overflow-hidden rounded-lg border-2 bg-black/5 transition", selectedId === node.id ? "border-primary" : "border-transparent hover:border-border")} onClick={() => { setSelectedId(node.id); setRotation(0); setSlideshow(false); }} title={node.name}>
                <img src={node.content} alt={node.name} className="h-16 w-full object-cover" loading="lazy" />
                <p className="truncate px-1 py-0.5 text-left text-[7.5px] text-muted-foreground">{node.name}</p>
              </button>
            ))}
          </div>
          {filtered.length === 0 && <p className="py-3 text-center text-[9px] text-muted-foreground">No matches.</p>}
        </aside>
      </div>
      {toast && <div className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-foreground px-3 py-1 text-[9.5px] text-background shadow-lg">{toast}</div>}
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => { void importImages(event.target.files); event.target.value = ""; }} />
    </AppShell>
  );
}

/* ------------------------------------------------------------------- Media */

export function Media({ payload }: { payload?: Record<string, unknown> }) {
  const os = useOS();
  const media = os.fs.recent(60).filter((node) => node.type === "file" && ((node.mime ?? "").startsWith("audio/") || (node.mime ?? "").startsWith("video/")));
  const startId = typeof payload?.openId === "string" ? payload.openId : media[0]?.id ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(startId);
  const [volume, setVolume] = useState(0.75);
  const [playing, setPlaying] = useState(false);
  const [query, setQuery] = useState("");
  const [loop, setLoop] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [muted, setMuted] = useState(false);
  const [codecError, setCodecError] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = selectedId ? os.fs.byId(selectedId) : media[0];
  const isVideo = selected?.mime?.startsWith("video/") || /\.(mp4|webm|mov)$/i.test(selected?.name ?? "");
  const filtered = media.filter((node) => node.name.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    if (!mediaRef.current) return;
    mediaRef.current.volume = volume;
    mediaRef.current.muted = muted;
    mediaRef.current.loop = loop;
    mediaRef.current.playbackRate = speed;
  }, [volume, muted, loop, speed, selectedId]);

  useEffect(() => {
    setCodecError("");
    setCurrentTime(0);
    setDuration(0);
    setPlaying(false);
  }, [selectedId]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target || !shellRef.current?.contains(target)) return;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;
      if (event.code === "Space") { event.preventDefault(); const element = mediaRef.current; if (element) { if (element.paused) void element.play(); else element.pause(); } }
      if (event.key === "ArrowRight" && mediaRef.current) mediaRef.current.currentTime = Math.min(mediaRef.current.duration || 0, mediaRef.current.currentTime + 10);
      if (event.key === "ArrowLeft" && mediaRef.current) mediaRef.current.currentTime = Math.max(0, mediaRef.current.currentTime - 10);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  async function importMedia(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("audio/") && !file.type.startsWith("video/")) continue;
      if (file.size > 8 * 1024 * 1024) {
        os.notify({ appId: "WindMedia", title: "File too large", body: `${file.name} exceeds the 8 MB local demo limit.` });
        continue;
      }
      const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
      const folder = file.type.startsWith("video/") ? "folder_videos" : "folder_music";
      const node = os.fs.createFile(folder, file.name, dataUrl, file.type);
      if (node) setSelectedId(node.id);
    }
  }

  function next(direction: 1 | -1) {
    if (shuffle && media.length > 1) {
      const options = media.filter((node) => node.id !== selectedId);
      const target = options[Math.floor(Math.random() * options.length)];
      if (target) setSelectedId(target.id);
      return;
    }
    const index = media.findIndex((node) => node.id === selectedId);
    const target = media[(index + direction + media.length) % media.length];
    if (target) setSelectedId(target.id);
  }

  function formatTime(value: number) {
    if (!Number.isFinite(value) || value < 0) return "0:00";
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60);
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  return (
    <AppShell containerRef={shellRef}>
      <AppHeader icon={Music} title="WindMedia" subtitle="Audio and video from the virtual drive · local files only" actions={<GhostButton onClick={() => inputRef.current?.click()}><Upload className="size-3.5" /> Import media</GhostButton>} />
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[210px] shrink-0 flex-col border-r border-border/60 bg-muted/15">
          <div className="p-2"><SearchInput value={query} onChange={setQuery} placeholder="Search media" /></div>
          <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-2">
            {filtered.map((node) => (
              <button key={node.id} className={cn("mb-0.5 flex w-full items-center gap-1.5 rounded px-1.5 py-1.5 text-left", selectedId === node.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")} onClick={() => { setSelectedId(node.id); setPlaying(false); }}>
                {node.mime?.startsWith("video/") ? <Video className="size-3 shrink-0" /> : <Music className="size-3 shrink-0" />}
                <span className="min-w-0 flex-1 truncate text-[9.5px]">{node.name}</span>
              </button>
            ))}
            {filtered.length === 0 && <p className="px-2 py-3 text-[9px] text-muted-foreground">No media in Music or Videos.</p>}
          </div>
          <div className="border-t border-border/60 p-2 text-[8px] text-muted-foreground">Imported files are stored locally and count toward virtual storage.</div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col bg-[#0d1420]">
          {selected?.content ? (
            <>
              {codecError && <div className="flex items-start gap-2 border-b border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[9px] text-amber-200"><VolumeX className="mt-0.5 size-3.5 shrink-0" /><span>{codecError} Try a different file or open it in an external player. WindOS can only play codecs supported by this browser.</span></div>}
              <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3">
                {isVideo ? (
                  <video ref={(element) => { mediaRef.current = element; }} src={selected.content} controls loop={loop} className="max-h-full max-w-full rounded-lg bg-black shadow-2xl" onPlay={() => { setPlaying(true); setCodecError(""); }} onPause={() => setPlaying(false)} onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)} onLoadedMetadata={(event) => { setDuration(event.currentTarget.duration); setCodecError(""); }} onError={() => setCodecError(`“${selected.name}” could not be decoded by this browser.`)} onEnded={() => { if (!loop && media.length > 1) next(1); }} />
                ) : (
                  <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center">
                    <div className="mx-auto flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400/20 to-indigo-500/20 text-teal-300"><Music className="size-9" /></div>
                    <p className="mt-3 truncate text-[12px] font-medium text-white">{selected.name}</p>
                    <p className="text-[9px] text-white/40">{formatBytes(selected.size)} · {selected.mime ?? "audio"}</p>
                    <audio ref={(element) => { mediaRef.current = element; }} src={selected.content} controls loop={loop} className="mt-4 w-full" onPlay={() => { setPlaying(true); setCodecError(""); }} onPause={() => setPlaying(false)} onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)} onLoadedMetadata={(event) => { setDuration(event.currentTarget.duration); setCodecError(""); }} onError={() => setCodecError(`“${selected.name}” could not be decoded by this browser.`)} onEnded={() => { if (!loop && media.length > 1) next(1); }} />
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 border-t border-white/10 px-3 py-2">
                <button className="rounded p-1 text-white/60 hover:bg-white/10" onClick={() => next(-1)} aria-label="Previous"><ChevronLeft className="size-4" /></button>
                <button className="flex size-8 items-center justify-center rounded-full bg-white text-slate-900" onClick={() => { const element = mediaRef.current; if (!element) return; if (element.paused) void element.play(); else element.pause(); }} aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause className="size-4" /> : <Play className="size-4" />}</button>
                <button className="rounded p-1 text-white/60 hover:bg-white/10" onClick={() => next(1)} aria-label="Next"><ChevronRight className="size-4" /></button>
                <button className={`rounded p-1 hover:bg-white/10 ${shuffle ? "text-teal-300" : "text-white/60"}`} onClick={() => setShuffle((value) => !value)} aria-label="Shuffle" title="Shuffle"><Shuffle className="size-3.5" /></button>
                <button className={`rounded p-1 hover:bg-white/10 ${loop ? "text-teal-300" : "text-white/60"}`} onClick={() => setLoop((value) => !value)} aria-label="Loop" title="Loop"><Repeat className="size-3.5" /></button>
                <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))} className="h-6 rounded border border-white/15 bg-[#182131] px-1 text-[8.5px] text-white/70" aria-label="Playback speed"><option value={0.5}>0.5×</option><option value={0.75}>0.75×</option><option value={1}>1×</option><option value={1.25}>1.25×</option><option value={1.5}>1.5×</option><option value={2}>2×</option></select>
                <span className="text-[8.5px] tabular-nums text-white/45">{formatTime(currentTime)} / {formatTime(duration)}</span>
                <div className="ml-2 flex items-center gap-1.5 text-white/50"><button className="rounded p-0.5 hover:bg-white/10" onClick={() => setMuted((value) => !value)} aria-label={muted ? "Unmute" : "Mute"} title={muted ? "Unmute" : "Mute"}>{muted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}</button><input type="range" min={0} max={100} value={muted ? 0 : volume * 100} onChange={(event) => { setMuted(false); setVolume(Number(event.target.value) / 100); }} className="w-20 accent-white" aria-label="Volume" /></div>
                <span className="ml-auto text-[8.5px] text-white/30">Virtual files · no streaming</span>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-white/50">
              <Music className="size-8" />
              <p className="text-[11px] font-medium text-white/80">Nothing selected</p>
              <p className="max-w-xs text-[9px]">Import an audio or video file to play it from the virtual drive. WindOS never uploads media.</p>
              <GhostButton onClick={() => inputRef.current?.click()}><Upload className="size-3.5" /> Import</GhostButton>
            </div>
          )}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="audio/*,video/*" multiple className="hidden" onChange={(event) => { void importMedia(event.target.files); event.target.value = ""; }} />
    </AppShell>
  );
}

/* ---------------------------------------------------------------- Recorder */

export function Recorder() {
  const os = useOS();
  const now = useNow(1000);
  const [mode, setMode] = useState<"video" | "audio">("video");
  const [active, setActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [withMic, setWithMic] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startRef = useRef(0);
  const recordings = [...os.fs.children("folder_videos"), ...os.fs.children("folder_music")].filter((node) => node.type === "file" && /\.(webm|mp4|ogg|wav|m4a)$/i.test(node.name));

  useEffect(() => () => { streamRef.current?.getTracks().forEach((track) => track.stop()); }, []);

  async function start() {
    setError("");
    const granted = await os.requestPermission("recorder", mode === "video" ? "camera" : "microphone");
    if (!granted) { setError("WindOS permission was denied. Enable it in WindSecurity → Permissions."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia(mode === "video" ? { video: { width: 1280, height: 720 }, audio: withMic } : { audio: true });
      streamRef.current = stream;
      if (videoRef.current && mode === "video") { videoRef.current.srcObject = stream; void videoRef.current.play(); }
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || (mode === "video" ? "video/webm" : "audio/webm") });
        const reader = new FileReader();
        reader.onload = () => {
          const name = `Recording ${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.webm`;
          const node = os.fs.createFile(mode === "video" ? "folder_videos" : "folder_music", name, String(reader.result), blob.type);
          if (node) {
            setSaved(node.id);
            os.notify({ appId: "WindOS", title: "Recording saved", body: `${name} is in ${mode === "video" ? "Videos" : "Music"}.`, actions: [{ label: "Open in WindMedia", appId: "media" }] });
          }
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setRecording(false);
        setActive(false);
      };
      recorder.start();
      recorderRef.current = recorder;
      startRef.current = Date.now();
      setElapsed(0);
      setActive(true);
      setRecording(true);
      setSaved(null);
    } catch (err) {
      setError(err instanceof Error ? `The browser blocked capture: ${err.message}` : "Could not access a capture device.");
    }
  }

  function stop() {
    recorderRef.current?.stop();
    recorderRef.current = null;
  }

  useEffect(() => {
    if (!recording) return;
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 500);
    return () => window.clearInterval(id);
  }, [recording]);

  return (
    <AppShell>
      <AppHeader icon={Mic} title="WindRecorder" subtitle={`${mode === "video" ? "Camera + microphone" : "Microphone"} · saved into the virtual drive · ${formatDuration(elapsed)}`} actions={recording ? <PrimaryButton className="bg-red-600 hover:bg-red-500" onClick={stop}><Square className="size-3.5" /> Stop</PrimaryButton> : <PrimaryButton onClick={() => void start()}><Play className="size-3.5" /> Start recording</PrimaryButton>} />
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-2xl space-y-3">
          <div className="overflow-hidden rounded-xl border border-border/70 bg-[#0d1420]">
            <div className="relative flex aspect-video items-center justify-center">
              {mode === "video" ? (
                <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
              ) : (
                <div className="text-center text-white/50"><div className="mx-auto flex size-20 items-center justify-center rounded-full bg-white/5"><Mic className="size-8" /></div><p className="mt-2 text-[10px]">Audio-only recording</p></div>
              )}
              {recording && <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-red-600 px-2 py-0.5 text-[9px] font-medium text-white"><span className="size-1.5 animate-pulse rounded-full bg-white" /> REC {formatDuration(elapsed)}</div>}
              {!active && <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 text-[10px] text-white/60">Camera preview appears after permission</div>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-md border border-border bg-background p-0.5">
              <button className={cn("rounded px-2 py-1 text-[9.5px]", mode === "video" ? "bg-primary/10 text-primary" : "text-muted-foreground")} onClick={() => setMode("video")} disabled={recording}>Video</button>
              <button className={cn("rounded px-2 py-1 text-[9.5px]", mode === "audio" ? "bg-primary/10 text-primary" : "text-muted-foreground")} onClick={() => setMode("audio")} disabled={recording}>Audio</button>
            </div>
            {mode === "video" && <label className="flex items-center gap-1 text-[9.5px] text-muted-foreground"><input type="checkbox" checked={withMic} onChange={(event) => setWithMic(event.target.checked)} disabled={recording} className="accent-[var(--os-accent)]" /> Include microphone</label>}
            <span className="ml-auto text-[8.5px] text-muted-foreground">Media stays on this device.</span>
          </div>
          {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-[9.5px] text-red-600 dark:text-red-300">{error}</div>}
          <Panel>
            <SectionTitle>Recordings</SectionTitle>
            <div className="space-y-1">
              {recordings.map((node) => (
                <div key={node.id} className="flex items-center gap-2 rounded border border-border/50 px-2 py-1.5">
                  {node.mime?.startsWith("video/") ? <Video className="size-3.5 text-muted-foreground" /> : <Mic className="size-3.5 text-muted-foreground" />}
                  <span className="min-w-0 flex-1 truncate text-[9.5px]">{node.name}</span>
                  <span className="text-[8px] text-muted-foreground">{formatBytes(node.size)}</span>
                  <button className="text-[8.5px] text-primary hover:underline" onClick={() => os.openApp("media", { openId: node.id })}>Play</button>
                  <a className="text-[8.5px] text-muted-foreground hover:underline" href={node.content} download={node.name}>Download</a>
                  <button className="rounded p-0.5 text-red-500 hover:bg-red-500/10" onClick={() => os.fs.trash(node.id)} aria-label="Delete recording"><Trash2 className="size-3" /></button>
                </div>
              ))}
              {recordings.length === 0 && <p className="py-3 text-center text-[9.5px] text-muted-foreground">No recordings yet.</p>}
            </div>
          </Panel>
          <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-2.5 text-[8.5px] leading-relaxed text-amber-800 dark:text-amber-200">
            Camera and microphone access requires both a WindOS permission prompt and your browser’s native permission. WindOS cannot access devices secretly, bypass a denial, or record other tabs. Recordings are stored as data in the virtual drive and can be large.
          </div>
          {saved && <p className="text-[9px] text-emerald-600 dark:text-emerald-400"><Check className="mr-1 inline size-3" /> Saved to the virtual drive.</p>}
        </div>
      </div>
    </AppShell>
  );
}
