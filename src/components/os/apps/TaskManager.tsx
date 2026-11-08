import { useMemo, useState } from "react";
import { useOS } from "@/lib/os/store";
import { useNow } from "@/lib/os/hooks";
import { formatDuration } from "@/lib/os/hooks";
import { formatBytes } from "@/lib/os/fs";
import { AppShell, AppHeader, AppToolbar, ToolButton, Meter, Pill, Panel, SectionTitle } from "./ui";
import { cn } from "@/lib/utils";
import { Activity, Cpu, Gauge, HardDrive, ListChecks, MemoryStick, Play, Power, RefreshCw, ShieldAlert, Square, X } from "lucide-react";

function Sparkline({ values, color = "var(--os-accent)" }: { values: number[]; color?: string }) {
  const width = 260;
  const height = 48;
  const points = values.length ? values : [0];
  const max = Math.max(60, ...points);
  const path = points
    .map((value, index) => `${(index / Math.max(1, points.length - 1)) * width},${height - (value / max) * (height - 4) - 2}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-12 w-full" preserveAspectRatio="none" aria-hidden>
      <polyline points={path} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={`0,${height} ${path} ${width},${height}`} fill={color} opacity="0.08" stroke="none" />
    </svg>
  );
}

export default function TaskManager() {
  const os = useOS();
  const now = useNow(1000);
  const [tab, setTab] = useState<"processes" | "performance" | "startup">("processes");
  const [selectedPid, setSelectedPid] = useState<number | null>(null);
  const [sort, setSort] = useState<"cpu" | "memory" | "name">("memory");

  const processes = useMemo(() => {
    return [...os.processes].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "cpu") return b.cpu - a.cpu;
      return b.memory - a.memory;
    });
  }, [os.processes, sort]);

  const selected = processes.find((proc) => proc.pid === selectedPid) ?? null;
  const totalMemory = processes.reduce((sum, proc) => sum + proc.memory, 0);
  const appProcesses = processes.filter((proc) => !proc.system);
  const uptime = os.bootedAt ? now - os.bootedAt : 0;
  const storage = os.fs.usage();

  return (
    <AppShell>
      <AppHeader
        icon={Activity}
        title="Task Manager"
        subtitle={`${processes.length} processes · uptime ${formatDuration(uptime)} · metrics are simulated`}
        actions={<ToolButton icon={RefreshCw} label="Refresh" onClick={() => setTab((current) => current)} />}
      />
      <AppToolbar>
        {(["processes", "performance", "startup"] as const).map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={cn(
              "rounded-md px-2.5 py-1 text-[11px] font-medium capitalize transition",
              tab === item ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item === "startup" ? "Startup apps" : item}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-1 text-[9.5px] text-muted-foreground">
          <ShieldAlert className="size-3" /> CPU and memory are simulated, not host measurements
        </span>
      </AppToolbar>

      {tab === "processes" && (
        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-2 border-b border-border/50 px-3 py-1.5 text-[9.5px] text-muted-foreground">
              <span>{appProcesses.length} apps · {processes.length - appProcesses.length} system services</span>
              <div className="ml-auto flex items-center gap-1">
                <span>Sort</span>
                <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="h-6 rounded border border-border bg-background px-1 text-[9.5px] outline-none">
                  <option value="memory">Memory</option>
                  <option value="cpu">CPU</option>
                  <option value="name">Name</option>
                </select>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-2">
              <table className="w-full text-left text-[11px]">
                <thead className="sticky top-0 bg-background text-[9px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5 font-medium">Process</th>
                    <th className="px-2 py-1.5 text-right font-medium">PID</th>
                    <th className="hidden px-2 py-1.5 font-medium sm:table-cell">State</th>
                    <th className="px-2 py-1.5 text-right font-medium">CPU</th>
                    <th className="px-2 py-1.5 text-right font-medium">Memory</th>
                    <th className="hidden px-2 py-1.5 text-right font-medium md:table-cell">Started</th>
                    <th className="px-2 py-1.5" />
                  </tr>
                </thead>
                <tbody>
                  {processes.map((proc) => (
                    <tr
                      key={proc.pid}
                      onClick={() => setSelectedPid(proc.pid)}
                      className={cn("cursor-default border-t border-border/40 transition hover:bg-muted/50", selectedPid === proc.pid && "bg-primary/8")}
                    >
                      <td className="px-2 py-1.5">
                        <span className="flex items-center gap-2">
                          <span className={cn("size-1.5 rounded-full", proc.system ? "bg-indigo-400" : "bg-emerald-500")} />
                          <span className="truncate font-medium">{proc.name}</span>
                          {proc.system && <Pill>system</Pill>}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-[10px] text-muted-foreground">{proc.pid}</td>
                      <td className="hidden px-2 py-1.5 capitalize text-muted-foreground sm:table-cell">{proc.state}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{proc.cpu}%</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{proc.memory} MB</td>
                      <td className="hidden px-2 py-1.5 text-right text-[10px] text-muted-foreground md:table-cell">
                        {new Date(proc.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <button
                          className="rounded p-1 text-muted-foreground transition hover:bg-red-500/10 hover:text-red-500 disabled:opacity-30"
                          disabled={proc.system}
                          onClick={(event) => { event.stopPropagation(); os.killProcess(proc.pid); }}
                          title={proc.system ? "Protected system process" : "End task"}
                          aria-label={`End ${proc.name}`}
                        >
                          <X className="size-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex shrink-0 items-center justify-between border-t border-border/60 bg-muted/20 px-3 py-1.5 text-[10px] text-muted-foreground">
              <span>Memory total displayed: {totalMemory} MB (simulated)</span>
              <span>{os.windows.length} windows · {os.processes.filter((p) => p.system).length} services</span>
            </div>
          </div>

          <aside className="hidden w-[248px] shrink-0 border-l border-border/60 bg-muted/15 p-3 lg:block">
            <SectionTitle>Details</SectionTitle>
            {selected ? (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Cpu className="size-4" /></div>
                  <div className="min-w-0">
                    <p className="truncate text-[11.5px] font-semibold">{selected.name}</p>
                    <p className="text-[9.5px] text-muted-foreground">PID {selected.pid} · {selected.system ? "system service" : "application"}</p>
                  </div>
                </div>
                <DetailRow label="State" value={selected.state} />
                <DetailRow label="Started" value={new Date(selected.startedAt).toLocaleString()} />
                <DetailRow label="Runtime" value={formatDuration(now - selected.startedAt)} />
                <DetailRow label="CPU" value={`${selected.cpu}% (simulated)`} />
                <DetailRow label="Memory" value={`${selected.memory} MB (simulated)`} />
                <DetailRow label="Responsiveness" value={selected.system || selected.responsiveness > 80 ? "Responsive" : "Not responding"} />
                <div>
                  <p className="mb-1 text-[9px] uppercase tracking-wider text-muted-foreground">Memory share</p>
                  <Meter value={(selected.memory / Math.max(1, totalMemory)) * 100} />
                </div>
                <button
                  disabled={selected.system}
                  onClick={() => os.killProcess(selected.pid)}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md bg-red-600 px-2 py-1.5 text-[10.5px] font-semibold text-white transition hover:bg-red-500 disabled:opacity-40"
                >
                  <Square className="size-3" /> End task
                </button>
                {selected.system && <p className="text-[9px] text-muted-foreground">Core WindOS services are protected from termination.</p>}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-4 text-center">
                <Gauge className="mx-auto mb-2 size-5 text-muted-foreground/50" />
                <p className="text-[10.5px] text-muted-foreground">Select a process to inspect its runtime and resource estimates.</p>
              </div>
            )}
          </aside>
        </div>
      )}

      {tab === "performance" && (
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <div className="mb-3 grid gap-2.5 md:grid-cols-2">
            <Panel>
              <div className="mb-1 flex items-center justify-between">
                <SectionTitle>CPU · simulated</SectionTitle>
                <span className="text-[18px] font-semibold tabular-nums">{os.stats.cpu}%</span>
              </div>
              <Sparkline values={os.stats.history.cpu} />
              <p className="mt-1 text-[9.5px] text-muted-foreground">Derived from open windows and process activity. A browser cannot read host CPU usage.</p>
            </Panel>
            <Panel>
              <div className="mb-1 flex items-center justify-between">
                <SectionTitle>Memory · simulated</SectionTitle>
                <span className="text-[18px] font-semibold tabular-nums">{os.stats.memory}%</span>
              </div>
              <Sparkline values={os.stats.history.memory} color="#178f8a" />
              <p className="mt-1 text-[9.5px] text-muted-foreground">{totalMemory} MB attributed to {processes.length} processes (estimates).</p>
            </Panel>
          </div>

          <div className="grid gap-2.5 md:grid-cols-3">
            <Panel>
              <SectionTitle>Uptime</SectionTitle>
              <p className="text-[22px] font-semibold tabular-nums">{formatDuration(uptime)}</p>
              <p className="mt-1 text-[9.5px] text-muted-foreground">Since this session booted. This value is real.</p>
            </Panel>
            <Panel>
              <SectionTitle>Virtual drive</SectionTitle>
              <p className="text-[22px] font-semibold">{formatBytes(storage.bytes)}</p>
              <Meter value={(storage.bytes / (512 * 1024 * 1024)) * 100} />
              <p className="mt-1 text-[9.5px] text-muted-foreground">{storage.files} files · {formatBytes(os.storage.usage)} real browser usage</p>
            </Panel>
            <Panel>
              <SectionTitle>Network · simulated</SectionTitle>
              <p className="text-[22px] font-semibold tabular-nums">{os.stats.network}%</p>
              <Sparkline values={os.stats.history.network} color="#2f7fbf" />
              <p className="mt-1 text-[9.5px] text-muted-foreground">Online status is real; throughput is simulated.</p>
            </Panel>
          </div>

          <Panel className="mt-2.5">
            <SectionTitle>Windows and applications</SectionTitle>
            <div className="space-y-1.5">
              {os.windows.length === 0 && <p className="text-[10.5px] text-muted-foreground">No application windows open.</p>}
              {os.windows.map((win) => {
                const proc = os.processes.find((p) => p.windowId === win.id);
                return (
                  <div key={win.id} className="flex items-center gap-2 rounded-md border border-border/60 px-2 py-1.5 text-[10.5px]">
                    <Play className="size-3 text-emerald-500" />
                    <span className="min-w-0 flex-1 truncate">{win.title}</span>
                    <span className="text-muted-foreground">PID {proc?.pid ?? "—"}</span>
                    <span className="w-12 text-right tabular-nums">{proc?.cpu ?? 0}%</span>
                    <span className="w-16 text-right tabular-nums">{proc?.memory ?? 0} MB</span>
                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400">{proc?.responsiveness ?? 100}%</span>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      )}

      {tab === "startup" && (
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <Panel className="mb-2.5">
            <SectionTitle>Startup applications</SectionTitle>
            <p className="mb-3 text-[10.5px] text-muted-foreground">
              Apps enabled here launch once after WindOS boots. Safe mode ignores this list.
            </p>
            <div className="space-y-1.5">
              {os.installed.map((entry) => {
                const app = os.installed.map((a) => a.id).includes(entry.id) ? entry : null;
                if (!app) return null;
                const definition = APP_MAP.get(entry.id);
                if (!definition) return null;
                const enabled = os.settings.startupApps.includes(entry.id);
                return (
                  <div key={entry.id} className="flex items-center gap-2.5 rounded-lg border border-border/60 px-2.5 py-2">
                    <definition.icon className="size-3.5 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-medium">{definition.name}</p>
                      <p className="truncate text-[9px] text-muted-foreground">{definition.publisher} · {definition.category}</p>
                    </div>
                    <span className={cn("text-[9px]", enabled ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>{enabled ? "Enabled" : "Disabled"}</span>
                    <button
                      role="switch"
                      aria-checked={enabled}
                      onClick={() => {
                        os.updateSettings({
                          startupApps: enabled ? os.settings.startupApps.filter((id) => id !== entry.id) : [...os.settings.startupApps, entry.id],
                        });
                      }}
                      className={cn("relative h-5 w-9 shrink-0 rounded-full transition", enabled ? "bg-primary" : "bg-muted")}
                    >
                      <span className={cn("absolute top-0.5 size-4 rounded-full bg-white shadow transition-all", enabled ? "left-[18px]" : "left-0.5")} />
                    </button>
                  </div>
                );
              })}
            </div>
          </Panel>
          <Panel>
            <SectionTitle>Background services</SectionTitle>
            <div className="space-y-1.5">
              {os.processes.filter((proc) => proc.system).map((proc) => (
                <div key={proc.pid} className="flex items-center gap-2 rounded-md bg-muted/30 px-2 py-1.5 text-[10.5px]">
                  <Power className="size-3 text-indigo-500" />
                  <span className="flex-1">{proc.name}</span>
                  <span className="text-muted-foreground">PID {proc.pid}</span>
                  <span className="tabular-nums">{proc.memory} MB</span>
                  <Pill tone="warning">protected</Pill>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-border/60 bg-muted/25 p-2 text-[9.5px] text-muted-foreground">
              <HardDrive className="size-3.5 shrink-0" />
              <span>WindOS runs entirely in this tab. Simulated hardware counters never touch system APIs.</span>
            </div>
          </Panel>
        </div>
      )}
    </AppShell>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-2 text-[10px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[140px] break-words text-right">{value}</span>
    </div>
  );
}

import { APP_MAP } from "@/lib/os/registry";
