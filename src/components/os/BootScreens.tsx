import { useEffect, useRef, useState } from "react";
import { useOS } from "@/lib/os/store";
import { ACCENTS, WALLPAPERS, wallpaperById } from "@/lib/os/settings";
import { useNow } from "@/lib/os/hooks";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Files,
  FolderOpen,
  HardDrive,
  Lock,
  Monitor,
  MousePointer2,
  Power,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
  Terminal,
  Volume2,
  Wand2,
} from "lucide-react";

export function WindMark({ size = 72, className }: { size?: number; className?: string }) {
  return (
    <div className={cn("relative", className)} style={{ width: size, height: size }} aria-hidden>
      <div
        className="absolute inset-0 rounded-[26%] shadow-[0_18px_50px_-16px_rgba(30,64,175,0.65)]"
        style={{ background: "linear-gradient(145deg, #1b2a4a 0%, #0d1424 55%, #111c33 100%)" }}
      />
      <div className="absolute inset-0 grid grid-cols-2 place-items-center gap-[9%] p-[24%]">
        <span className="size-full rounded-[22%]" style={{ background: "linear-gradient(140deg, #7c8cf8, #5665e0)" }} />
        <span className="size-full rounded-[22%]" style={{ background: "linear-gradient(140deg, #5eead4, #22a7a0)" }} />
        <span className="size-full rounded-[22%]" style={{ background: "linear-gradient(140deg, #22a7a0, #268ba3)" }} />
        <span className="size-full rounded-[22%]" style={{ background: "linear-gradient(140deg, #f7f9ff, #c7d2fe)" }} />
      </div>
      <span className="pointer-events-none absolute inset-0 rounded-[26%] bg-gradient-to-b from-white/15 to-transparent" />
    </div>
  );
}

export function BootScreen() {
  const os = useOS();
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState(0);
  const finished = useRef(false);
  const fast = os.onboarded && !os.settings.showBootAnimation;
  const phases = ["Initialising firmware", "Loading WindOS core services", "Mounting virtual storage", "Preparing the desktop"];

  useEffect(() => {
    const duration = fast ? 420 : os.onboarded ? 1500 : 2600;
    const started = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - started;
      const next = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(next);
      setPhase(Math.min(phases.length - 1, Math.floor((next / 100) * phases.length)));
      if (next >= 100 && !finished.current) {
        finished.current = true;
        window.clearInterval(timer);
        window.setTimeout(() => os.completeBoot(), 320);
      }
    }, 70);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-[100dvh] w-full flex-col items-center justify-center bg-[#080d16] text-white">
      <div className="windos-boot-mark">
        <WindMark size={92} />
      </div>
      <h1 className="mt-7 text-2xl font-semibold tracking-tight">WindOS</h1>
      <p className="mt-1 text-[11px] uppercase tracking-[0.34em] text-white/35">Version 1.0.0</p>

      <div className="mt-10 h-1 w-56 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-teal-300 transition-[width] duration-150" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-3 h-4 text-[10.5px] tracking-wide text-white/40">{fast ? "Restoring your session" : phases[phase]}</p>
      <div className="mt-12 flex items-center gap-2 text-[10px] text-white/25">
        <span className="size-1.5 rounded-full bg-teal-300/70" />
        WindOS virtual machine · local and private
      </div>
    </div>
  );
}

const STEPS = 4;

export function WelcomeScreen() {
  const os = useOS();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(os.settings.displayName === "User" ? "" : os.settings.displayName);
  const [theme, setTheme] = useState<"light" | "dark">(os.settings.theme);
  const [accent, setAccent] = useState(os.settings.accent);
  const [wallpaper, setWallpaper] = useState(os.settings.wallpaper);
  const [sounds, setSounds] = useState(os.settings.sounds);
  const [animations, setAnimations] = useState(os.settings.animations);
  const [widgets, setWidgets] = useState(os.settings.widgets);
  const [taskbarAlign, setTaskbarAlign] = useState(os.settings.taskbarAlign);

  const canContinue = step !== 1 || name.trim().length > 0;

  function finish() {
    os.completeWelcome({
      displayName: name.trim() || "User",
      theme,
      accent,
      avatarColor: accent,
      wallpaper,
      wallpaperKind: wallpaperById(wallpaper).kind,
      sounds,
      animations,
      widgets,
      taskbarAlign,
    });
  }

  return (
    <div className="relative flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#0a101b] p-4 text-white">
      <div className="absolute inset-0 opacity-70">
        <div className="absolute -left-20 top-[-10%] size-[46vw] rounded-full bg-indigo-500/20 blur-[120px]" />
        <div className="absolute -right-10 bottom-[-20%] size-[52vw] rounded-full bg-teal-400/15 blur-[140px]" />
      </div>

      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-white/[0.055] shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <WindMark size={28} />
            <div>
              <p className="text-xs font-semibold">WindOS setup</p>
              <p className="text-[9.5px] uppercase tracking-[0.2em] text-white/35">First run</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: STEPS + 1 }).map((_, i) => (
              <span key={i} className={cn("h-1 rounded-full transition-all", i <= step ? "w-6 bg-teal-300" : "w-3 bg-white/15")} />
            ))}
          </div>
        </div>

        <div className="px-6 py-7 sm:px-9">
          {step === 0 && (
            <div className="text-center">
              <WindMark size={64} className="mx-auto windos-boot-mark" />
              <p className="mt-5 text-[10px] uppercase tracking-[0.3em] text-teal-300/80">Welcome</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Hello and welcome to WindOS!
              </h1>
              <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed text-white/55">
                A complete desktop operating system, simulated entirely in your browser.
                WindOS gives you a real window manager, a persistent virtual drive, a working
                terminal, a code editor, a security model and 640 registered capabilities —
                with no account and no server.
              </p>
              <div className="mx-auto mt-6 grid max-w-md grid-cols-3 gap-2 text-left">
                {[
                  { icon: Monitor, title: "20 apps", body: "plus the Store" },
                  { icon: HardDrive, title: "Local drive", body: "IndexedDB backed" },
                  { icon: ShieldAlert, title: "Permissions", body: "gated for real" },
                ].map((item) => (
                  <div key={item.title} className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                    <item.icon className="mb-2 size-4 text-teal-300" />
                    <p className="text-[11px] font-medium">{item.title}</p>
                    <p className="text-[9.5px] text-white/40">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <Label>Let's make it yours</Label>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">What should WindOS call you?</h2>
              <p className="mt-1.5 text-[12px] text-white/45">
                Your name stays on this device. No email, password or account is required.
              </p>
              <div className="mt-6 flex items-center gap-4">
                <div
                  className="flex size-16 shrink-0 items-center justify-center rounded-2xl text-xl font-semibold shadow-lg"
                  style={{ background: accent }}
                >
                  {(name.trim() || "U").slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1">
                  <label className="text-[10.5px] font-medium text-white/60" htmlFor="welcome-name">Display name</label>
                  <input
                    id="welcome-name"
                    autoFocus
                    value={name}
                    maxLength={24}
                    onChange={(event) => setName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && name.trim()) setStep(2);
                    }}
                    placeholder="e.g. Alex"
                    className="mt-1 h-11 w-full rounded-xl border border-white/15 bg-black/25 px-3.5 text-sm outline-none placeholder:text-white/25 focus:border-teal-300/60"
                  />
                </div>
              </div>
              <div className="mt-6">
                <p className="text-[10.5px] font-medium text-white/60">Avatar colour</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ACCENTS.map((item) => (
                    <button
                      key={item.id}
                      className={cn("size-8 rounded-full border-2 transition", accent === item.value ? "border-white" : "border-transparent opacity-70 hover:opacity-100")}
                      style={{ background: item.value }}
                      onClick={() => setAccent(item.value)}
                      aria-label={item.name}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <Label>Appearance</Label>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">Choose a look</h2>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {(["light", "dark"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setTheme(mode)}
                    className={cn(
                      "overflow-hidden rounded-xl border p-2 text-left transition",
                      theme === mode ? "border-teal-300/70 bg-white/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]",
                    )}
                  >
                    <div className={cn("mb-2 h-20 rounded-lg p-2", mode === "light" ? "bg-[#f3f5fa]" : "bg-[#101623]")}>
                      <div className={cn("mb-1 h-2 w-8 rounded-full", mode === "light" ? "bg-slate-300" : "bg-white/15")} />
                      <div className="flex gap-1">
                        <div className={cn("h-10 w-12 rounded", mode === "light" ? "bg-white shadow" : "bg-[#1a2233]")} />
                        <div className={cn("h-10 flex-1 rounded", mode === "light" ? "bg-white/80" : "bg-[#151d2b]")} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between px-1 pb-1">
                      <span className="text-xs font-medium capitalize">{mode}</span>
                      {theme === mode && <Check className="size-3.5 text-teal-300" />}
                    </div>
                  </button>
                ))}
              </div>

              <p className="mt-5 text-[10.5px] font-medium text-white/60">Accent</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {ACCENTS.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setAccent(item.value)}
                    className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] transition", accent === item.value ? "border-white/40 bg-white/10" : "border-white/10 text-white/50 hover:text-white")}
                  >
                    <span className="size-2.5 rounded-full" style={{ background: item.value }} />
                    {item.name}
                  </button>
                ))}
              </div>

              <p className="mt-5 text-[10.5px] font-medium text-white/60">Wallpaper</p>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {WALLPAPERS.slice(0, 8).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setWallpaper(item.id)}
                    className={cn("h-12 rounded-lg border-2 transition", wallpaper === item.id ? "border-teal-300" : "border-transparent opacity-80 hover:opacity-100")}
                    style={{ background: item.background }}
                    aria-label={item.name}
                    title={item.name}
                  />
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <Label>Preferences</Label>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">A few final choices</h2>
              <div className="mt-5 space-y-2">
                <PrefRow icon={Volume2} title="Startup and notification sounds" description="Generated tones, no audio downloads" checked={sounds} onChange={setSounds} />
                <PrefRow icon={Sparkles} title="Window and wallpaper animations" description="Turn off for reduced motion" checked={animations} onChange={setAnimations} />
                <PrefRow icon={Monitor} title="Desktop widgets" description="Clock, weather, system and greeting" checked={widgets.length > 0} onChange={(value) => setWidgets(value ? ["greeting", "clock", "weather", "system"] : [])} />
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-[10.5px] text-white/50">Taskbar apps</span>
                <div className="ml-auto flex rounded-lg border border-white/10 p-0.5">
                  {(["center", "left"] as const).map((align) => (
                    <button
                      key={align}
                      onClick={() => setTaskbarAlign(align)}
                      className={cn("rounded-md px-2.5 py-1 text-[10px] capitalize transition", taskbarAlign === align ? "bg-white/15 text-white" : "text-white/40")}
                    >
                      {align}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-teal-400/15 text-teal-300">
                <Check className="size-7" />
              </div>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight">Ready, {name.trim() || "friend"}.</h2>
              <p className="mx-auto mt-2 max-w-md text-[12px] leading-relaxed text-white/50">
                WindOS will now initialise your desktop. In the next step you can follow a short
                interactive tour, or skip straight into the machine.
              </p>
              <div className="mx-auto mt-5 grid max-w-md grid-cols-2 gap-2 text-left text-[10.5px]">
                {[
                  "Virtual drive in IndexedDB",
                  "Window snapping and multiple desktops",
                  "Terminal over the real drive",
                  "Permission-gated camera and microphone",
                ].map((line) => (
                  <div key={line} className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-white/55">
                    <Check className="size-3 text-teal-300" /> {line}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-white/10 px-6 py-3.5">
          <button
            className={cn("flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] text-white/50 transition hover:bg-white/10 hover:text-white", step === 0 && "invisible")}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            <ChevronLeft className="size-3.5" /> Back
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/30">Step {step + 1} of 5</span>
            {step < STEPS ? (
              <button
                disabled={!canContinue}
                onClick={() => setStep((s) => s + 1)}
                className="flex items-center gap-1.5 rounded-lg bg-teal-300 px-4 py-2 text-[11.5px] font-semibold text-slate-950 transition hover:bg-teal-200 disabled:opacity-40"
              >
                Continue <ChevronRight className="size-3.5" />
              </button>
            ) : (
              <button
                onClick={finish}
                className="flex items-center gap-1.5 rounded-lg bg-teal-300 px-4 py-2 text-[11.5px] font-semibold text-slate-950 transition hover:bg-teal-200"
              >
                <Power className="size-3.5" /> Start WindOS
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-teal-300/70">{children}</p>;
}

function PrefRow({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: typeof Volume2;
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <Icon className="size-4 text-white/50" />
      <div className="min-w-0 flex-1">
        <p className="text-[11.5px] font-medium">{title}</p>
        <p className="text-[9.5px] text-white/35">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn("relative h-5 w-9 rounded-full transition", checked ? "bg-teal-300" : "bg-white/15")}
      >
        <span className={cn("absolute top-0.5 size-4 rounded-full bg-white transition-all", checked ? "left-[18px]" : "left-0.5")} />
      </button>
    </div>
  );
}

const TOUR = [
  {
    icon: MousePointer2,
    title: "This is your desktop",
    body: "Drag icons to arrange them. Right-click empty space to change the wallpaper, add widgets or create a folder. Double-click a window title bar to maximise it.",
  },
  {
    icon: Monitor,
    title: "Windows behave like windows",
    body: "Drag a window to the left or right edge to snap it to half the screen, or to the top to maximise. Use the window menu for virtual desktops and the simulated second display.",
  },
  {
    icon: Search,
    title: "Everything is searchable",
    body: "Open Start from the bottom-left corner. Press Ctrl+Space anywhere to search apps, files, settings, help topics and all 640 registered features at once.",
  },
  {
    icon: Terminal,
    title: "Real files, real shell",
    body: "WindFiles, WindCode and WindTerminal all share the same IndexedDB-backed drive. Files persist between visits. Try the terminal command 'ls' or 'help'.",
  },
];

export function TutorialScreen() {
  const os = useOS();
  const [step, setStep] = useState(0);
  const tour = TOUR[step];

  function finish(openAppId?: string) {
    os.completeTutorial();
    if (openAppId) window.setTimeout(() => os.openApp(openAppId), 350);
  }

  return (
    <div className="relative flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#0b1220] p-4 text-white">
      <div className="absolute inset-0">
        <div className="absolute inset-0 opacity-60" style={{ background: wallpaperById(os.settings.lockWallpaper).background }} />
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />
      </div>

      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
          <WindMark size={22} />
          <p className="text-[11px] font-medium">A quick tour of WindOS</p>
          <span className="ml-auto text-[9.5px] uppercase tracking-[0.18em] text-white/35">Tutorial</span>
        </div>
        <div className="px-6 py-7">
          <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-teal-300/15 text-teal-300">
            <tour.icon className="size-6" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">{tour.title}</h2>
          <p className="mt-2 text-[12.5px] leading-relaxed text-white/55">{tour.body}</p>
          <div className="mt-6 flex items-center gap-1.5">
            {TOUR.map((item, index) => (
              <button
                key={item.title}
                onClick={() => setStep(index)}
                className={cn("h-1.5 rounded-full transition-all", index === step ? "w-7 bg-teal-300" : "w-3 bg-white/20 hover:bg-white/40")}
                aria-label={`Tour step ${index + 1}`}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-white/10 px-5 py-3.5">
          <button className="text-[10.5px] text-white/40 transition hover:text-white" onClick={() => finish()}>
            Skip tour
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button className="rounded-lg border border-white/15 px-3 py-1.5 text-[11px] transition hover:bg-white/10" onClick={() => setStep((s) => s - 1)}>
                Back
              </button>
            )}
            {step < TOUR.length - 1 ? (
              <button className="flex items-center gap-1 rounded-lg bg-teal-300 px-3.5 py-1.5 text-[11.5px] font-semibold text-slate-950 transition hover:bg-teal-200" onClick={() => setStep((s) => s + 1)}>
                Next <ChevronRight className="size-3.5" />
              </button>
            ) : (
              <button className="flex items-center gap-1 rounded-lg bg-teal-300 px-3.5 py-1.5 text-[11.5px] font-semibold text-slate-950 transition hover:bg-teal-200" onClick={() => finish("files")}>
                Enter WindOS <ArrowRight className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LockScreen() {
  const os = useOS();
  const now = useNow(1000);
  const [busy, setBusy] = useState(false);
  const date = new Date(now);
  const wallpaper = wallpaperById(os.settings.lockWallpaper);
  const custom = os.settings.lockWallpaper.startsWith("data:");

  const signIn = () => {
    setBusy(true);
    window.setTimeout(() => {
      os.unlock();
      setBusy(false);
    }, 420);
  };

  return (
    <div className="relative flex h-[100dvh] w-full flex-col items-center justify-center overflow-hidden text-white">
      <div
        className="absolute inset-0"
        style={custom ? { backgroundImage: `url(${os.settings.lockWallpaper})`, backgroundSize: "cover", backgroundPosition: "center" } : { background: wallpaper.background }}
      />
      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/30 via-transparent to-slate-950/60" />

      <div className="relative z-10 flex flex-col items-center text-center">
        <p className="text-[72px] font-light leading-none tracking-tight tabular-nums sm:text-[96px]">
          {date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: !os.settings.clock24h })}
        </p>
        <p className="mt-2 text-sm font-medium text-white/75">
          {date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </p>

        <div className="mt-12 w-full max-w-xs rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-xl">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full text-xl font-semibold shadow-lg" style={{ background: os.settings.avatarColor }}>
            {os.settings.displayName.slice(0, 1).toUpperCase()}
          </div>
          <p className="mt-3 text-sm font-semibold">{os.settings.displayName}</p>
          <p className="text-[10px] text-white/45">
            {os.guest ? "Guest session" : "Local account · no password"}
          </p>
          <button
            onClick={signIn}
            disabled={busy}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-[12px] font-semibold text-slate-900 transition hover:bg-white/90 disabled:opacity-60"
          >
            {busy ? <RefreshCw className="size-3.5 animate-spin" /> : <Lock className="size-3.5" />}
            {busy ? "Signing in…" : "Sign in"}
          </button>
          {!os.guest && (
            <button
              onClick={os.startGuest}
              className="mt-2 w-full rounded-xl border border-white/15 py-2 text-[10.5px] text-white/65 transition hover:bg-white/10"
            >
              Continue as guest
            </button>
          )}
        </div>

        <p className="mt-6 text-[10px] text-white/30">
          This is a simulation. No password is required and nothing leaves your browser.
        </p>
      </div>

      <div className="absolute bottom-5 right-5 z-10 flex items-center gap-1">
        <button className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white" onClick={os.sleep} title="Sleep" aria-label="Sleep">
          <Monitor className="size-4" />
        </button>
        <button className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white" onClick={os.restart} title="Restart" aria-label="Restart">
          <RotateCcw className="size-4" />
        </button>
        <button className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white" onClick={os.shutdown} title="Shut down" aria-label="Shut down">
          <Power className="size-4" />
        </button>
      </div>

      <div className="absolute bottom-5 left-5 z-10 text-[9.5px] uppercase tracking-[0.22em] text-white/25">
        WindOS 1.0.0 · Build by Anyel Gonzalez
      </div>
    </div>
  );
}

export function SleepScreen() {
  const os = useOS();
  return (
    <button
      className="flex h-[100dvh] w-full flex-col items-center justify-center gap-5 bg-black text-white"
      onClick={() => {
        os.unlock();
      }}
      aria-label="Wake from sleep"
    >
      <span className="size-2 animate-pulse rounded-full bg-teal-300" />
      <p className="text-[10px] uppercase tracking-[0.3em] text-white/30">Sleeping · click to wake</p>
    </button>
  );
}

export function PowerTransition({ mode }: { mode: "shutting-down" | "restarting" }) {
  return (
    <div className="flex h-[100dvh] w-full flex-col items-center justify-center gap-4 bg-[#080d16] text-white">
      <WindMark size={52} />
      <div className="mt-3 flex items-center gap-2 text-[11px] text-white/45">
        <RefreshCw className="size-3.5 animate-spin" />
        {mode === "restarting" ? "Restarting WindOS…" : "Shutting down…"}
      </div>
      <p className="text-[9.5px] text-white/20">Your files and settings are saved before power changes.</p>
    </div>
  );
}

export function PoweredOff() {
  const os = useOS();
  return (
    <div className="flex h-[100dvh] w-full flex-col items-center justify-center gap-6 bg-black text-white">
      <p className="text-[10px] uppercase tracking-[0.3em] text-white/20">WindOS is powered off</p>
      <button
        onClick={os.powerOn}
        className="flex size-14 items-center justify-center rounded-full border border-white/15 bg-white/5 transition hover:border-teal-300/50 hover:bg-teal-300/10 hover:text-teal-200"
        aria-label="Power on"
      >
        <Power className="size-6" />
      </button>
      <p className="text-[9.5px] text-white/20">Press power to boot again</p>
    </div>
  );
}

export function RecoveryScreen() {
  const os = useOS();
  const [message, setMessage] = useState("");
  return (
    <div className="flex h-[100dvh] w-full items-center justify-center bg-[#0a0f18] p-4 text-white">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
            <ShieldAlert className="size-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-amber-300/70">Recovery environment</p>
            <h1 className="text-lg font-semibold">WindOS needs a hand</h1>
          </div>
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-white/50">
          Boot the machine normally, enter safe mode with startup apps disabled, or review
          recovery tools. Nothing has been deleted.
        </p>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left transition hover:bg-white/[0.07]"
            onClick={() => { os.completeBoot(); }}
          >
            <Power className="size-4 text-teal-300" />
            <span><span className="block text-[11.5px] font-medium">Continue to WindOS</span><span className="block text-[9.5px] text-white/35">Normal boot</span></span>
          </button>
          <button
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left transition hover:bg-white/[0.07]"
            onClick={() => { os.bootSafeMode(); }}
          >
            <ShieldAlert className="size-4 text-amber-300" />
            <span><span className="block text-[11.5px] font-medium">Boot in safe mode</span><span className="block text-[9.5px] text-white/35">Startup apps disabled</span></span>
          </button>
          <button
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left transition hover:bg-white/[0.07]"
            onClick={() => {
              os.createRestorePoint("Recovery snapshot");
              setMessage("Restore point created.");
            }}
          >
            <Wand2 className="size-4 text-indigo-300" />
            <span><span className="block text-[11.5px] font-medium">Create restore point</span><span className="block text-[9.5px] text-white/35">Settings, apps and files</span></span>
          </button>
          <button
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left transition hover:bg-white/[0.07]"
            onClick={() => { os.restart(); }}
          >
            <RefreshCw className="size-4 text-white/60" />
            <span><span className="block text-[11.5px] font-medium">Restart</span><span className="block text-[9.5px] text-white/35">Retry the boot sequence</span></span>
          </button>
        </div>

        <div className="mt-5 rounded-xl border border-white/10 bg-black/25 p-3 font-mono text-[10px] leading-relaxed text-white/40">
          <p>storage: {os.storage.quota ? "IndexedDB available" : "quota unknown"} · restore points: {os.restorePoints.length}</p>
          <p>files: {Object.keys(os.fs.nodes).length} nodes · installed apps: {os.installed.length}</p>
          <p>session: {os.onboarded ? "initialised" : "first run pending"} · safe mode: {os.settings.safeMode ? "on" : "off"}</p>
          {message && <p className="mt-1 text-teal-300">{message}</p>}
        </div>

        <p className="mt-3 text-[9.5px] text-white/25">
          Recovery tools also live in the WindRecovery app, including factory reset and restore points.
        </p>
      </div>
    </div>
  );
}

export function SignedOutScreen() {
  const os = useOS();
  return (
    <div className="flex h-[100dvh] w-full flex-col items-center justify-center gap-4 bg-[#0b1220] text-white">
      <WindMark size={48} />
      <p className="text-sm font-medium">You have signed out of WindOS.</p>
      <p className="text-[11px] text-white/40">Windows were closed. Your files were kept.</p>
      <div className="mt-2 flex gap-2">
        <button className="rounded-lg bg-white px-4 py-2 text-xs font-semibold text-slate-900" onClick={os.unlock}>
          Sign in as {os.settings.displayName}
        </button>
        <button className="rounded-lg border border-white/15 px-4 py-2 text-xs" onClick={os.startGuest}>
          Guest session
        </button>
      </div>
      <button className="mt-4 flex items-center gap-1.5 text-[10px] text-white/30 hover:text-white/60" onClick={os.restoreApp ? () => os.powerOn() : undefined}>
        <Power className="size-3" /> Power options
      </button>
    </div>
  );
}
