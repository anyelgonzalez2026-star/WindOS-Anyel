import { useOS } from "@/lib/os/store";
import { useNow, usePersisted } from "@/lib/os/hooks";
import { simulatedWeather } from "@/lib/os/weather";
import { todayISO, type CalendarEvent, type TaskItem } from "@/lib/os/models";
import { formatBytes } from "@/lib/os/fs";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  ChevronRight,
  Cloud,
  CloudLightning,
  CloudRain,
  Cpu,
  HardDrive,
  ListChecks,
  Lock,
  Settings,
  Snowflake,
  StickyNote,
  Sun,
  TerminalSquare,
} from "lucide-react";

function WidgetCard({
  children,
  onClick,
  label,
  icon: Icon,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  label: string;
  icon: typeof Sun;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/40 bg-white/65 p-3.5 text-slate-800 shadow-lg shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/55 dark:text-slate-100",
        onClick && "cursor-pointer transition hover:-translate-y-0.5 hover:shadow-xl",
        className,
      )}
      onClick={onClick}
    >
      <div className="mb-2 flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] opacity-55">
        <Icon className="size-3" />
        {label}
        {onClick && <ChevronRight className="ml-auto size-3 opacity-0 transition group-hover:opacity-60" />}
      </div>
      {children}
    </div>
  );
}

export function DesktopWidgets() {
  const os = useOS();
  const now = useNow(1000);
  const [weatherCity] = usePersisted<string>("weather.city", "London");
  const [tasks] = usePersisted<TaskItem[]>("tasks.v1", []);
  const [events] = usePersisted<CalendarEvent[]>("calendar.events.v1", []);
  const widgets = os.settings.widgets;
  const weather = simulatedWeather(weatherCity, new Date(now));
  const current = new Date(now);
  const greeting =
    current.getHours() < 12 ? "Good morning" : current.getHours() < 18 ? "Good afternoon" : "Good evening";
  const notes = os.fs
    .children("folder_documents")
    .filter((node) => node.type === "file" && /\.(md|txt)$/i.test(node.name))
    .sort((a, b) => b.modifiedAt - a.modifiedAt)
    .slice(0, 1);
  const dueTasks = tasks.filter((task) => !task.done).slice(0, 3);
  const todayEvents = events.filter((event) => event.date === todayISO()).slice(0, 3);
  const usage = os.fs.usage();
  const WeatherIcon =
    weather.icon === "sun" ? Sun : weather.icon === "rain" ? CloudRain : weather.icon === "snow" ? Snowflake : weather.icon === "storm" ? CloudLightning : Cloud;

  return (
    <div className="pointer-events-auto absolute right-3 top-3 z-0 hidden w-[286px] flex-col gap-2.5 md:flex">
      {widgets.includes("greeting") && (
        <WidgetCard label="Today" icon={CalendarDays} className="bg-gradient-to-br from-white/80 to-white/50 dark:from-slate-900/70 dark:to-slate-900/40">
          <p className="text-[15px] font-semibold leading-tight">
            {greeting}, {os.settings.displayName}.
          </p>
          <p className="mt-0.5 text-[10.5px] opacity-60">
            {current.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <div className="mt-2.5 flex gap-1.5">
            <button
              className="flex items-center gap-1 rounded-md bg-slate-900/10 px-2 py-1 text-[9.5px] font-medium transition hover:bg-slate-900/20 dark:bg-white/10 dark:hover:bg-white/20"
              onClick={(event) => { event.stopPropagation(); os.lock(); }}
            >
              <Lock className="size-2.5" /> Lock
            </button>
            <button
              className="flex items-center gap-1 rounded-md bg-slate-900/10 px-2 py-1 text-[9.5px] font-medium transition hover:bg-slate-900/20 dark:bg-white/10 dark:hover:bg-white/20"
              onClick={(event) => { event.stopPropagation(); os.openApp("settings"); }}
            >
              <Settings className="size-2.5" /> Settings
            </button>
            <button
              className="flex items-center gap-1 rounded-md bg-slate-900/10 px-2 py-1 text-[9.5px] font-medium transition hover:bg-slate-900/20 dark:bg-white/10 dark:hover:bg-white/20"
              onClick={(event) => { event.stopPropagation(); os.openApp("terminal"); }}
            >
              <TerminalSquare className="size-2.5" /> Shell
            </button>
          </div>
        </WidgetCard>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        {widgets.includes("clock") && (
          <WidgetCard label={os.desktops[os.activeDesktop]?.name ?? "Desktop"} icon={CalendarDays} onClick={() => os.openApp("clock")}>
            <p className="text-[26px] font-semibold leading-none tracking-tight tabular-nums">
              {current.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: !os.settings.clock24h })}
            </p>
            <p className="mt-1 text-[9.5px] opacity-60">
              {current.toLocaleTimeString(undefined, { second: "2-digit" })} · {os.desktops.length} desktops
            </p>
          </WidgetCard>
        )}

        {widgets.includes("weather") && (
          <WidgetCard label="Weather" icon={WeatherIcon} onClick={() => os.openApp("weather")}>
            <div className="flex items-end justify-between">
              <p className="text-[26px] font-semibold leading-none tracking-tight">{weather.temp}°</p>
              <WeatherIcon className="size-7 opacity-60" />
            </div>
            <p className="mt-1 truncate text-[9.5px] opacity-65">{weather.condition} · {weather.city}</p>
          </WidgetCard>
        )}

        {widgets.includes("system") && (
          <WidgetCard label="System" icon={Cpu} onClick={() => os.openApp("monitor")}>
            <div className="space-y-1.5">
              <Bar label="CPU" value={os.stats.cpu} />
              <Bar label="RAM" value={os.stats.memory} />
              <Bar label="Disk" value={Math.min(100, Math.round((usage.bytes / (512 * 1024 * 1024)) * 100))} />
            </div>
            <p className="mt-1.5 text-[9px] opacity-50">Simulated · {formatBytes(usage.bytes)} used</p>
          </WidgetCard>
        )}

        {widgets.includes("notes") && (
          <WidgetCard label="Latest note" icon={StickyNote} onClick={() => os.openApp("notes")}>
            {notes.length ? (
              <>
                <p className="truncate text-[12px] font-medium">{notes[0].name.replace(/\.(md|txt)$/i, "")}</p>
                <p className="mt-1 line-clamp-3 text-[10px] leading-snug opacity-65">
                  {notes[0].content?.replace(/[#*_`>]/g, "").slice(0, 110) || "Empty note"}
                </p>
              </>
            ) : (
              <p className="text-[10.5px] opacity-65">No notes yet. Open WindNotes to write one.</p>
            )}
          </WidgetCard>
        )}
      </div>

      {widgets.includes("tasks") && (
        <WidgetCard label="Tasks" icon={ListChecks} onClick={() => os.openApp("tasks")}>
          {dueTasks.length === 0 ? (
            <p className="text-[10.5px] opacity-65">Nothing open. Add a task to get started.</p>
          ) : (
            <ul className="space-y-1">
              {dueTasks.map((task) => (
                <li key={task.id} className="flex items-center gap-1.5 text-[10.5px]">
                  <span
                    className="size-1.5 rounded-full"
                    style={{ background: task.priority === "high" ? "#dc6b5f" : task.priority === "medium" ? "#d3a02c" : "#5b9a7a" }}
                  />
                  <span className="truncate">{task.title}</span>
                </li>
              ))}
            </ul>
          )}
        </WidgetCard>
      )}

      {widgets.includes("calendar") && (
        <WidgetCard label="Agenda" icon={CalendarDays} onClick={() => os.openApp("calendar")}>
          {todayEvents.length === 0 ? (
            <p className="text-[10.5px] opacity-65">No events today.</p>
          ) : (
            <ul className="space-y-1">
              {todayEvents.map((event) => (
                <li key={event.id} className="flex items-center gap-1.5 text-[10.5px]">
                  <span className="size-1.5 rounded-full" style={{ background: event.color }} />
                  <span className="truncate">{event.title}</span>
                  <span className="ml-auto opacity-50">{event.time || "All day"}</span>
                </li>
              ))}
            </ul>
          )}
        </WidgetCard>
      )}

      {widgets.includes("storage") && (
        <WidgetCard label="Storage" icon={HardDrive} onClick={() => os.openApp("files", { folderId: "root" })}>
          <Bar label="WindOS drive" value={Math.min(100, Math.round((usage.bytes / (512 * 1024 * 1024)) * 100))} />
          <p className="mt-1.5 text-[9px] opacity-55">
            {usage.files} files · {usage.folders} folders · {formatBytes(usage.trashBytes)} in bin
          </p>
        </WidgetCard>
      )}
    </div>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-0.5 flex justify-between text-[8.5px] opacity-55">
        <span>{label}</span>
        <span>{Math.round(value)}%</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${Math.min(100, value)}%`, background: "var(--os-accent)" }}
        />
      </div>
    </div>
  );
}
