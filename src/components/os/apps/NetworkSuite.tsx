import { useEffect, useRef, useState } from "react";
import { useOS } from "@/lib/os/store";
import { usePersisted } from "@/lib/os/hooks";
import { formatBytes } from "@/lib/os/fs";
import { downloadBlob, downloadText } from "@/lib/os/zip";
import { cn } from "@/lib/utils";
import { AppShell, AppHeader, AppToolbar, EmptyState, GhostButton, PrimaryButton, SearchInput, inputClass, Panel, SectionTitle, Pill } from "./ui";
import { Activity, ArrowRight, Camera, Check, ClipboardCopy, Copy, Download, FolderOpen, Globe2, Link2, Lock, Monitor, Network as NetworkIcon, Play, Radio, RefreshCw, ScreenShare, Send, Share2, Shield, Signal, Square, Trash2, Upload, Users, Video, Wifi, WifiOff, X, Zap } from "lucide-react";

/* ----------------------------------------------------------------- Network */

const WIFI = [
  { name: "WindOS-Guest", signal: 92, secure: false, band: "5 GHz" },
  { name: "Northstar-5G", signal: 78, secure: true, band: "5 GHz" },
  { name: "Cafe Meridian", signal: 54, secure: false, band: "2.4 GHz" },
  { name: "Studio-Net", signal: 41, secure: true, band: "2.4 GHz" },
];

interface ConnectionDetails { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean }

export function Network() {
  const os = useOS();
  const [test, setTest] = useState<{ at: number; ok: boolean; ms: number; detail: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [connected, setConnected] = useState("WindOS-Guest");
  const [selected, setSelected] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [hostOnline, setHostOnline] = useState(navigator.onLine);
  const [proxy, setProxy] = usePersisted<string>("network.proxy.v1", "");
  const [firewall, setFirewall] = useState({ inbound: true, outbound: true });
  const [throughput, setThroughput] = useState<number[]>(() => Array.from({ length: 24 }, () => 18 + Math.random() * 62));
  const [simulatedTransferMb, setSimulatedTransferMb] = useState(0);
  const connection = (navigator as Navigator & { connection?: ConnectionDetails }).connection;
  const online = hostOnline && os.quick.wifi && !os.quick.airplane;

  useEffect(() => {
    const update = () => setHostOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      const sample = online ? 18 + Math.random() * 62 : 0;
      setThroughput((previous) => [...previous.slice(1), sample]);
      if (online) setSimulatedTransferMb((previous) => previous + (sample * 0.018));
    }, 1000);
    return () => window.clearInterval(id);
  }, [online]);

  function exportDiagnostics() {
    const report = {
      product: "WindOS",
      version: "1.0.0",
      generatedAt: new Date().toISOString(),
      host: { online: hostOnline, effectiveType: connection?.effectiveType ?? null, downlinkMbps: connection?.downlink ?? null, rttMs: connection?.rtt ?? null, saveData: connection?.saveData ?? false, userAgent: navigator.userAgent },
      windos: { airplane: os.quick.airplane, wifi: os.quick.wifi, connectedNetwork: connected, proxy, firewall, simulatedTransferMb: Number(simulatedTransferMb.toFixed(2)), throughput: throughput.map((value) => Number(value.toFixed(1))) },
      adapters: [
        { name: "Wi-Fi 6 adapter", type: "wireless", state: os.quick.wifi ? (online ? "connected" : "disconnected") : "disabled", simulated: true },
        { name: "Ethernet adapter", type: "wired", state: "not exposed by browser", simulated: true },
        { name: "WindOS loopback", type: "virtual", state: "available", simulated: true },
      ],
      note: "Adapter inventory, throughput and transfer totals are simulated. Online state, effective type and latency are read from the browser where available.",
    };
    downloadText(JSON.stringify(report, null, 2), `windos-network-report-${new Date().toISOString().slice(0, 10)}.json`, "application/json");
    os.logEvent({ level: "info", title: "Network report exported", detail: "A structured connection report was generated locally." });
  }

  async function runTest() {
    if (!online) {
      setTest({
        at: Date.now(),
        ok: false,
        ms: 0,
        detail: os.quick.airplane
          ? "Blocked by WindOS Airplane mode. Turn it off in Quick settings before testing."
          : !os.quick.wifi
            ? "Wi-Fi is disabled in WindOS Quick settings. Enable it before testing."
            : "Your browser reports that the host device is offline. WindOS respects the real online state.",
      });
      return;
    }
    setTesting(true);
    const started = performance.now();
    try {
      const response = await fetch("https://api.open-meteo.com/v1/forecast?latitude=51.5&longitude=-0.12&current=temperature_2m", { cache: "no-store" });
      const ms = Math.round(performance.now() - started);
      setTest({ at: Date.now(), ok: response.ok, ms, detail: response.ok ? "A small HTTPS request to Open-Meteo completed." : `The endpoint returned HTTP ${response.status}.` });
    } catch {
      const ms = Math.round(performance.now() - started);
      setTest({ at: Date.now(), ok: false, ms, detail: "The request failed. Your browser or network may block cross-origin requests." });
    } finally {
      setTesting(false);
    }
  }

  function connect(name: string) {
    const network = WIFI.find((entry) => entry.name === name);
    if (!network) return;
    if (!online) {
      setError(os.quick.airplane ? "Airplane mode blocks network connections." : !os.quick.wifi ? "Wi-Fi is turned off." : "The host device is offline.");
      return;
    }
    if (network.secure) { setSelected(name); setPassword(""); setError(""); return; }
    setConnected(name);
    os.logEvent({ level: "info", title: "Network connected", detail: `Joined simulated network ${name}.` });
  }

  return (
    <AppShell>
      <AppHeader icon={NetworkIcon} title="WindNetwork" subtitle={`${online ? "Connected" : "Offline"} · ${os.quick.wifi ? "Wi-Fi on" : "Wi-Fi off"} · adapter status from your browser`} actions={<><GhostButton onClick={() => os.setQuick({ wifi: !os.quick.wifi })}>{os.quick.wifi ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />} Wi-Fi {os.quick.wifi ? "on" : "off"}</GhostButton><PrimaryButton onClick={() => void runTest()} disabled={testing}><Activity className="size-3.5" /> {testing ? "Testing…" : "Test connection"}</PrimaryButton></>} />
      <AppToolbar>
        <Pill tone={online ? "success" : "warning"}>{online ? "online" : "offline"}</Pill>
        {connection?.effectiveType && <><span className="text-[9px] text-muted-foreground">Effective type</span><span className="text-[9.5px] font-medium">{connection.effectiveType}</span></>}
        {connection?.downlink !== undefined && <span className="text-[9px] text-muted-foreground">~{connection.downlink} Mb/s reported</span>}
        <span className="ml-auto text-[8.5px] text-muted-foreground">Wi-Fi names and signal strengths are simulated</span>
      </AppToolbar>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="mx-auto max-w-2xl space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <Panel><SectionTitle>Status</SectionTitle><p className="text-[18px] font-semibold">{online ? "Connected" : "Offline"}</p><p className="text-[9px] text-muted-foreground">{connected} · simulated network</p></Panel>
            <Panel><SectionTitle>Adapter</SectionTitle><p className="text-[18px] font-semibold">{connection?.effectiveType?.toUpperCase() ?? (online ? "Online" : "—")}</p><p className="text-[9px] text-muted-foreground">{connection?.rtt !== undefined ? `${connection.rtt} ms reported RTT` : "Browser does not expose RTT"}</p></Panel>
            <Panel><SectionTitle>Save-Data</SectionTitle><p className="text-[18px] font-semibold">{connection?.saveData ? "On" : "Off"}</p><p className="text-[9px] text-muted-foreground">As reported by your browser</p></Panel>
          </div>
          <Panel>
            <SectionTitle action={<button className="flex items-center gap-1 text-[8.5px] text-primary" onClick={() => void runTest()}><RefreshCw className={cn("size-3", testing && "animate-spin")} /> Retest</button>}>Connectivity test</SectionTitle>
            {test ? (
              <div className={cn("rounded-lg border p-2.5", test.ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5")}>
                <p className="text-[10px] font-medium">{test.ok ? "Request succeeded" : "Request failed"} · {test.ms} ms</p>
                <p className="text-[8.5px] text-muted-foreground">{test.detail}</p>
                <p className="mt-1 text-[8px] text-muted-foreground">Measured in your browser at {new Date(test.at).toLocaleTimeString()}. This is latency to one endpoint, not a speed test.</p>
              </div>
            ) : <p className="text-[9.5px] text-muted-foreground">Run a real HTTPS request to verify connectivity. WindOS cannot read your router, DNS settings or packet traffic.</p>}
          </Panel>
          <Panel>
            <SectionTitle>Wi-Fi networks</SectionTitle>
            <div className="space-y-1">
              {WIFI.map((network) => (
                <div key={network.name} className="flex items-center gap-2 rounded-lg border border-border/50 px-2 py-1.5">
                  <Wifi className={cn("size-3.5", network.signal > 60 ? "text-emerald-500" : "text-amber-500")} />
                  <div className="min-w-0 flex-1"><p className="text-[10px] font-medium">{network.name}</p><p className="text-[8px] text-muted-foreground">{network.band} · {network.secure ? "secured" : "open"} · {network.signal}% signal</p></div>
                  {connected === network.name ? <Pill tone="success"><Check className="size-2.5" /> connected</Pill> : <button className="rounded border border-border px-2 py-0.5 text-[8.5px] hover:bg-muted" onClick={() => connect(network.name)}>Connect</button>}
                </div>
              ))}
            </div>
            {selected && (
              <div className="mt-2 rounded-lg border border-border/60 bg-muted/20 p-2">
                <p className="text-[9.5px] font-medium">Connect to {selected}</p>
                <div className="mt-1 flex gap-1"><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password (simulated)" className={cn(inputClass, "h-7 text-[10px]")} /><PrimaryButton className="h-7" onClick={() => { if (!online) { setError("Networking is disabled; join is blocked until it is restored."); return; } if (password.length < 4) { setError("Enter at least 4 characters. This is a simulated credential check."); return; } setConnected(selected); setSelected(null); setError(""); }}>Join</PrimaryButton><GhostButton className="h-7" onClick={() => setSelected(null)}>Cancel</GhostButton></div>
                {error && <p className="mt-1 text-[8.5px] text-red-500">{error}</p>}
              </div>
            )}
          </Panel>
          <div className="grid gap-2 sm:grid-cols-2">
            <Panel>
              <SectionTitle action={<Pill>simulated</Pill>}>Adapter inventory</SectionTitle>
              <div className="space-y-1 text-[9px]">
                {[
                  { name: "Wi-Fi 6 adapter", type: "Wireless", state: os.quick.wifi ? (online ? "connected" : "no route") : "disabled" },
                  { name: "Ethernet adapter", type: "Wired", state: "not exposed" },
                  { name: "WindOS loopback", type: "Virtual", state: "available" },
                ].map((adapter) => <div key={adapter.name} className="flex items-center gap-2 rounded border border-border/50 px-2 py-1"><NetworkIcon className="size-3 text-muted-foreground" /><span className="flex-1">{adapter.name}<span className="ml-1 text-[8px] text-muted-foreground">{adapter.type}</span></span><span className={cn("text-[8.5px]", adapter.state === "connected" || adapter.state === "available" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>{adapter.state}</span></div>)}
              </div>
              <p className="mt-1.5 text-[8px] leading-relaxed text-muted-foreground">Browsers do not expose hardware adapter names. This inventory is simulated; the online state and effective connection type above are real.</p>
            </Panel>
            <Panel>
              <SectionTitle>Session tools</SectionTitle>
              <label className="block text-[8.5px] text-muted-foreground">Manual proxy preference<input value={proxy} onChange={(event) => setProxy(event.target.value)} placeholder="e.g. http://proxy.local:8080" className={cn(inputClass, "mt-1 h-6 text-[9px]")} /></label>
              <p className="mt-0.5 text-[7.5px] text-muted-foreground">Stored locally. A web page cannot make the browser use a proxy.</p>
              <div className="mt-2 grid grid-cols-2 gap-1">
                <label className="flex items-center gap-1.5 rounded border border-border/50 px-1.5 py-1 text-[8.5px]"><input type="checkbox" checked={firewall.inbound} onChange={(event) => setFirewall({ ...firewall, inbound: event.target.checked })} className="accent-[var(--os-accent)]" /> Inbound block</label>
                <label className="flex items-center gap-1.5 rounded border border-border/50 px-1.5 py-1 text-[8.5px]"><input type="checkbox" checked={firewall.outbound} onChange={(event) => setFirewall({ ...firewall, outbound: event.target.checked })} className="accent-[var(--os-accent)]" /> Outbound block</label>
              </div>
              <p className="mt-1 text-[7.5px] text-muted-foreground">Firewall rules are simulated and do not affect host traffic.</p>
              <GhostButton className="mt-1.5 h-6 text-[8px]" onClick={exportDiagnostics}><Download className="size-2.5" /> Export diagnostics</GhostButton>
            </Panel>
          </div>
          <Panel>
            <SectionTitle action={<span className="text-[8px] text-muted-foreground">simulated · {simulatedTransferMb.toFixed(1)} MB this session</span>}>Throughput monitor</SectionTitle>
            <div className="flex h-14 items-end gap-0.5 rounded-lg border border-border/50 bg-muted/10 px-2 py-1.5">
              {throughput.map((value, index) => <div key={index} className="min-w-0 flex-1 rounded-t bg-primary/55" style={{ height: `${Math.max(3, value)}%` }} title={`${value.toFixed(1)} Mb/s (simulated)`} />)}
            </div>
            <p className="mt-1 text-[8px] leading-relaxed text-muted-foreground">The graph and transfer estimate update every second while WindNetwork is open. They are simulated and are not measured host traffic.</p>
          </Panel>
          <div className="grid gap-2 sm:grid-cols-2">
            <Panel><SectionTitle>Quick settings</SectionTitle><div className="space-y-1.5">{([["wifi", "Wi-Fi"], ["airplane", "Airplane mode"], ["mobileHotspot", "Mobile hotspot"], ["nearbySharing", "Nearby sharing"]] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 rounded border border-border/50 px-2 py-1 text-[9.5px]"><span className="flex-1">{label}</span><button role="switch" aria-checked={os.quick[key]} onClick={() => os.setQuick({ [key]: !os.quick[key] })} className={cn("relative h-4 w-8 rounded-full transition", os.quick[key] ? "bg-primary" : "bg-muted-foreground/25")}><span className={cn("absolute top-0.5 size-3 rounded-full bg-white transition-all", os.quick[key] ? "left-4" : "left-0.5")} /></button></label>
            ))}</div></Panel>
            <Panel><SectionTitle>What WindOS can see</SectionTitle><div className="space-y-1 text-[8.5px] leading-relaxed text-muted-foreground">
              <p className="flex items-start gap-1"><Check className="mt-0.5 size-2.5 text-emerald-500" /> Online / offline status and browser-reported connection type.</p>
              <p className="flex items-start gap-1"><Check className="mt-0.5 size-2.5 text-emerald-500" /> Latency to a public HTTPS endpoint, measured directly.</p>
              <p className="flex items-start gap-1"><X className="mt-0.5 size-2.5 text-amber-500" /> Cannot inspect local IP, router configuration, DNS cache, firewall or other devices.</p>
              <p className="flex items-start gap-1"><X className="mt-0.5 size-2.5 text-amber-500" /> Wi-Fi list, signal and passwords are simulated for the OS experience.</p>
            </div></Panel>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

/* ------------------------------------------------------------------- Share */

export function Share() {
  const os = useOS();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const [toast, setToast] = useState("");
  const [nearby, setNearby] = useState<string[]>([]);
  const files = os.fs.recent(80).filter((node) => node.type === "file");
  const selected = selectedId ? os.fs.byId(selectedId) : null;

  function flash(message: string) { setToast(message); window.setTimeout(() => setToast(""), 2600); }

  async function webShare() {
    if (!selected) return;
    const text = `WindOS file: ${selected.name}\n${os.fs.pathOf(selected.id)}\n${selected.content?.slice(0, 500) ?? ""}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: selected.name, text });
        flash("Opened the system share sheet.");
      } else {
        await os.copyText(text, "WindShare");
        flash("Share sheet unavailable — copied instead.");
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") flash("The system share sheet was blocked or cancelled.");
    }
  }

  async function shareFile() {
    if (!selected?.content) return;
    try {
      if (!selected.content.startsWith("data:")) {
        if (navigator.share) { await navigator.share({ title: selected.name, text: selected.content.slice(0, 1000) }); return; }
        throw new Error("not-file");
      }
      const blob = await (await fetch(selected.content)).blob();
      const file = new File([blob], selected.name, { type: selected.mime || blob.type });
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title: selected.name });
        flash("Shared through your device.");
      } else {
        downloadBlob(blob, selected.name);
        flash("This browser cannot share files — downloaded instead.");
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") flash("Could not share this file.");
    }
  }

  function createLink() {
    if (!selected) return;
    const payload = btoa(unescape(encodeURIComponent(JSON.stringify({ name: selected.name, path: os.fs.pathOf(selected.id), size: selected.size }))));
    const value = `windos://share/${payload.slice(0, 80)}`;
    setLink(value);
    void os.copyText(value, "WindShare");
    flash("Local share reference copied. It identifies the file; it does not upload it.");
  }

  function addNearby() {
    const names = ["Studio Desktop", "Kitchen Tablet", "Anyel’s Phone", "Living Room Display"];
    const next = names.find((name) => !nearby.includes(name));
    if (!next) { flash("Every simulated device is already listed."); return; }
    setNearby((prev) => [...prev, next]);
  }

  return (
    <AppShell>
      <AppHeader icon={Share2} title="WindShare" subtitle="System share sheet, local references, downloads and simulated nearby devices" actions={<PrimaryButton disabled={!selected} onClick={() => void shareFile()}><Share2 className="size-3.5" /> Share file</PrimaryButton>} />
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="mx-auto max-w-2xl space-y-3">
          <Panel>
            <SectionTitle>Choose a file</SectionTitle>
            <div className="grid max-h-40 gap-1 overflow-y-auto sm:grid-cols-2">
              {files.map((file) => (
                <button key={file.id} className={cn("flex items-center gap-2 rounded border px-2 py-1.5 text-left", selectedId === file.id ? "border-primary/40 bg-primary/5" : "border-border/50 hover:bg-muted")} onClick={() => { setSelectedId(file.id); setLink(""); }}>
                  <FolderOpen className="size-3.5 text-muted-foreground" /><span className="min-w-0 flex-1 truncate text-[9.5px]">{file.name}</span><span className="text-[8px] text-muted-foreground">{formatBytes(file.size)}</span>
                </button>
              ))}
            </div>
          </Panel>
          {selected ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <Panel>
                <SectionTitle>Share “{selected.name}”</SectionTitle>
                <div className="space-y-1.5">
                  <Action icon={Share2} title="System share sheet" body="Uses the native Web Share API when available" onClick={() => void webShare()} />
                  <Action icon={Link2} title="Create local reference" body="Copies a windos:// identifier, not an upload" onClick={createLink} />
                  <Action icon={Copy} title="Copy file content" body={selected.content?.startsWith("data:") ? "Binary content cannot be copied as text" : "Copies text to the WindOS clipboard"} onClick={() => selected.content && !selected.content.startsWith("data:") ? void os.copyText(selected.content, "WindShare") : flash("This file has binary content.")} />
                  <Action icon={Download} title="Download to device" body="Saves the original bytes through the browser" onClick={() => { const link = document.createElement("a"); link.href = selected.content ?? ""; link.download = selected.name; link.click(); }} />
                </div>
                {link && <p className="mt-2 break-all rounded bg-muted/40 p-2 font-mono text-[8px] text-muted-foreground">{link}</p>}
              </Panel>
              <Panel>
                <SectionTitle action={<button className="text-[8.5px] text-primary" onClick={addNearby}>Discover</button>}>Nearby devices · simulated</SectionTitle>
                <div className="space-y-1">
                  {nearby.map((device) => <div key={device} className="flex items-center gap-2 rounded border border-border/50 px-2 py-1.5"><Monitor className="size-3.5 text-muted-foreground" /><span className="flex-1 text-[9.5px]">{device}</span><button className="text-[8.5px] text-primary" onClick={() => flash(`Demo only: ${device} cannot receive files from a browser.`)}>Send</button></div>)}
                  {nearby.length === 0 && <p className="py-2 text-[9px] text-muted-foreground">No simulated devices discovered.</p>}
                </div>
                <p className="mt-2 text-[8px] leading-relaxed text-muted-foreground">A web page cannot discover or push files to real nearby devices without a sharing service. Use the system share sheet or download the file.</p>
              </Panel>
            </div>
          ) : <EmptyState icon={Share2} title="Select a file to share" body="WindShare uses the operating system’s real share sheet where the browser supports it, and falls back to download or clipboard." />}
          <p className="text-[8px] text-muted-foreground">No cloud upload occurs. Share references stay on this device. {toast && <span className="text-primary">{toast}</span>}</p>
        </div>
      </div>
    </AppShell>
  );
}

function Action({ icon: Icon, title, body, onClick }: { icon: typeof Share2; title: string; body: string; onClick: () => void }) {
  return <button className="flex w-full items-center gap-2 rounded-lg border border-border/50 px-2 py-1.5 text-left hover:bg-muted" onClick={onClick}><Icon className="size-3.5 shrink-0 text-muted-foreground" /><span className="min-w-0 flex-1"><span className="block text-[9.5px] font-medium">{title}</span><span className="block text-[8px] leading-snug text-muted-foreground">{body}</span></span><ArrowRight className="size-3 shrink-0 text-muted-foreground" /></button>;
}

/* ------------------------------------------------------------------ Remote */

interface ChatMessage { id: string; from: "host" | "guest"; text: string; at: number }

export function Remote() {
  const os = useOS();
  const [role, setRole] = useState<"host" | "guest" | null>(null);
  const [code, setCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [connected, setConnected] = useState(false);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [frames, setFrames] = useState(0);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState("");
  const [viewer, setViewer] = useState<string | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const captureTimer = useRef<number | null>(null);

  useEffect(() => () => { channelRef.current?.close(); stopSharing(); }, []);

  function openChannel(sessionCode: string) {
    channelRef.current?.close();
    const channel = new BroadcastChannel(`windos.remote.${sessionCode}`);
    channel.onmessage = (event) => {
      const data = event.data as { type: string; from?: "host" | "guest"; text?: string; data?: string; code?: string; at?: number };
      if (data.type === "hello") { setConnected(true); setChat((prev) => [...prev, { id: `sys_${Date.now()}`, from: "guest", text: "A guest joined this local session.", at: Date.now() }]); }
      if (data.type === "chat" && data.text) setChat((prev) => [...prev, { id: `chat_${Date.now()}_${Math.random()}`, from: data.from ?? "guest", text: data.text!, at: Date.now() }]);
      if (data.type === "frame" && data.data) { setViewer(data.data); setFrames((count) => count + 1); setConnected(true); }
      if (data.type === "leave") { setConnected(false); setViewer(null); }
    };
    channelRef.current = channel;
    return channel;
  }

  function host() {
    const generated = Math.floor(100000 + Math.random() * 900000).toString();
    setCode(generated);
    setRole("host");
    setConnected(false);
    setError("");
    openChannel(generated);
    void os.copyText(`Join my WindOS remote session with code ${generated} (local demo, two tabs).`, "WindRemote");
  }

  function join() {
    if (!/^\d{6}$/.test(joinCode)) { setError("Enter the six-digit session code."); return; }
    setRole("guest");
    setCode(joinCode);
    setError("");
    const channel = openChannel(joinCode);
    channel.postMessage({ type: "hello", from: "guest" });
    setConnected(true);
  }

  function sendChat() {
    if (!message.trim() || !channelRef.current) return;
    channelRef.current.postMessage({ type: "chat", from: role ?? "guest", text: message.trim(), at: Date.now() });
    setChat((prev) => [...prev, { id: `chat_${Date.now()}`, from: role ?? "guest", text: message.trim(), at: Date.now() }]);
    setMessage("");
  }

  async function startSharing() {
    if (role !== "host") return;
    const granted = await os.requestPermission("remote", "screen");
    if (!granted) { setError("Screen sharing requires a WindOS screen permission."); return; }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 2 }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; void videoRef.current.play(); }
      setSharing(true);
      captureTimer.current = window.setInterval(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < 2) return;
        canvas.width = 640;
        canvas.height = Math.round(640 * (video.videoHeight / Math.max(1, video.videoWidth)));
        const context = canvas.getContext("2d");
        if (!context) return;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        channelRef.current?.postMessage({ type: "frame", from: "host", data: canvas.toDataURL("image/jpeg", 0.55) });
      }, 1000);
      stream.getVideoTracks()[0]?.addEventListener("ended", () => stopSharing());
    } catch (err) {
      setError(err instanceof Error ? `Screen capture was blocked: ${err.message}` : "Screen capture was blocked.");
    }
  }

  function stopSharing() {
    if (captureTimer.current) window.clearInterval(captureTimer.current);
    captureTimer.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setSharing(false);
  }

  function leave() {
    channelRef.current?.postMessage({ type: "leave" });
    stopSharing();
    channelRef.current?.close();
    channelRef.current = null;
    setRole(null); setConnected(false); setViewer(null); setChat([]); setCode("");
  }

  return (
    <AppShell>
      <AppHeader icon={ScreenShare} title="WindRemote" subtitle="Local screen-sharing assistance between two WindOS tabs · no server, no internet relay" actions={role ? <PrimaryButton className="bg-red-600 hover:bg-red-500" onClick={leave}><X className="size-3.5" /> End session</PrimaryButton> : undefined} />
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="mx-auto max-w-2xl space-y-3">
          {!role ? (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                <Panel>
                  <SectionTitle>Host a session</SectionTitle>
                  <p className="text-[9.5px] leading-relaxed text-muted-foreground">Create a session code and, when ready, share a screen preview with a guest in another tab of this browser.</p>
                  <PrimaryButton className="mt-2" onClick={host}><ScreenShare className="size-3.5" /> Create session code</PrimaryButton>
                </Panel>
                <Panel>
                  <SectionTitle>Join a session</SectionTitle>
                  <p className="text-[9.5px] leading-relaxed text-muted-foreground">Enter the six-digit code shown in the hosting WindOS tab.</p>
                  <div className="mt-2 flex gap-1"><input value={joinCode} onChange={(event) => setJoinCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" className={cn(inputClass, "h-7 font-mono tracking-[0.3em]")} /><PrimaryButton className="h-7" onClick={join}>Join</PrimaryButton></div>
                  {error && <p className="mt-1 text-[8.5px] text-red-500">{error}</p>}
                </Panel>
              </div>
              <Panel>
                <SectionTitle>Scope and limits</SectionTitle>
                <div className="grid gap-1.5 text-[8.5px] leading-relaxed text-muted-foreground sm:grid-cols-2">
                  <p className="flex items-start gap-1"><Check className="mt-0.5 size-2.5 shrink-0 text-emerald-500" /> Real BroadcastChannel pairing between tabs in the same browser; chat and low-rate JPEG frames.</p>
                  <p className="flex items-start gap-1"><Check className="mt-0.5 size-2.5 shrink-0 text-emerald-500" /> Real screen capture with an explicit browser picker.</p>
                  <p className="flex items-start gap-1"><X className="mt-0.5 size-2.5 shrink-0 text-amber-500" /> No remote keyboard or mouse control; browser security forbids it.</p>
                  <p className="flex items-start gap-1"><X className="mt-0.5 size-2.5 shrink-0 text-amber-500" /> No internet relay, NAT traversal or connection to another computer.</p>
                </div>
              </Panel>
            </>
          ) : (
            <>
              <Panel>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Session</span>
                  <span className="font-mono text-[20px] font-semibold tracking-[0.25em]">{code}</span>
                  <Pill tone={connected ? "success" : "warning"}>{connected ? "guest connected" : "waiting for guest"}</Pill>
                  <span className="ml-auto text-[8.5px] text-muted-foreground">{role === "host" ? "Hosting" : "Guest"} · {frames} frames</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <GhostButton onClick={() => void os.copyText(`Join WindOS remote session: ${code}`, "WindRemote")}><ClipboardCopy className="size-3.5" /> Copy invite</GhostButton>
                  {role === "host" && !sharing && <PrimaryButton onClick={() => void startSharing()}><ScreenShare className="size-3.5" /> Share screen</PrimaryButton>}
                  {role === "host" && sharing && <GhostButton onClick={stopSharing}><Square className="size-3.5" /> Stop sharing</GhostButton>}
                  <GhostButton onClick={leave}>End</GhostButton>
                </div>
                <p className="mt-1.5 text-[8px] text-muted-foreground">Open WindOS in a second tab, choose Join, and enter {code}. This pairing stays inside your browser.</p>
              </Panel>
              <div className="grid gap-2.5 md:grid-cols-[1.3fr_0.7fr]">
                <div className="overflow-hidden rounded-xl border border-border/70 bg-[#0d1420]">
                  <div className="flex items-center gap-1.5 border-b border-white/10 px-2 py-1 text-[8.5px] text-white/50"><Monitor className="size-3" /> Remote view · {role === "host" ? "your shared display" : "host display"}</div>
                  <div className="relative flex aspect-video items-center justify-center">
                    {role === "guest" ? (viewer ? <img src={viewer} alt="Remote screen" className="h-full w-full object-contain" /> : <p className="text-[9.5px] text-white/35">Waiting for the host to share a screen…</p>) : (
                      <>
                        <video ref={videoRef} muted playsInline className="h-full w-full object-contain" />
                        {!sharing && <p className="absolute text-[9.5px] text-white/35">Share screen to begin</p>}
                      </>
                    )}
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                </div>
                <div className="flex min-h-[180px] flex-col rounded-xl border border-border/70 bg-card">
                  <div className="border-b border-border/60 px-2 py-1 text-[9px] font-medium">Session chat</div>
                  <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
                    {chat.length === 0 && <p className="py-3 text-center text-[8.5px] text-muted-foreground">No messages yet.</p>}
                    {chat.map((entry) => <div key={entry.id} className={cn("rounded px-1.5 py-1 text-[8.5px]", entry.from === "host" ? "bg-primary/8" : "bg-muted/50")}><p className="text-[7.5px] text-muted-foreground">{entry.from} · {new Date(entry.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>{entry.text}</div>)}
                  </div>
                  <div className="flex gap-1 border-t border-border/60 p-1.5"><input value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => event.key === "Enter" && sendChat()} placeholder="Message the other tab" className="h-6 min-w-0 flex-1 rounded border border-border bg-background px-1 text-[8.5px] outline-none" /><button className="rounded bg-primary px-1.5 text-primary-foreground" onClick={sendChat} aria-label="Send"><Send className="size-3" /></button></div>
                </div>
              </div>
              {error && <p className="rounded border border-red-500/30 bg-red-500/10 p-2 text-[9px] text-red-500">{error}</p>}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ Screen */

export function Screen() {
  const os = useOS();
  const [active, setActive] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const [shots, setShots] = useState(0);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startRef = useRef(0);

  useEffect(() => () => { streamRef.current?.getTracks().forEach((track) => track.stop()); }, []);
  useEffect(() => {
    if (!recording) return;
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 500);
    return () => window.clearInterval(id);
  }, [recording]);

  async function start() {
    setError("");
    const granted = await os.requestPermission("screen", "screen");
    if (!granted) { setError("Screen capture permission was denied."); return; }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; void videoRef.current.play(); }
      setActive(true);
      setStreaming(true);
      stream.getVideoTracks()[0]?.addEventListener("ended", () => { setStreaming(false); setActive(false); });
    } catch (err) {
      setError(err instanceof Error ? `Your browser blocked capture: ${err.message}` : "Screen capture failed.");
    }
  }

  function snapshot() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/png");
    const name = `Screen ${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.png`;
    const node = os.fs.createFile("folder_pictures", name, dataUrl, "image/png");
    if (node) { setShots((count) => count + 1); os.notify({ appId: "WindOS", title: "Screenshot saved", body: `${name} is in Pictures.` }); }
  }

  function startRecording() {
    if (!streamRef.current) return;
    const types = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
    const mime = types.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
    try {
      const recorder = new MediaRecorder(streamRef.current, mime ? { mimeType: mime } : undefined);
      chunks.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: recorder.mimeType || "video/webm" });
        const reader = new FileReader();
        reader.onload = () => {
          const node = os.fs.createFile("folder_videos", `Screen recording ${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.webm`, String(reader.result), "video/webm");
          if (node) os.notify({ appId: "WindOS", title: "Screen recording saved", body: `${node.name} is in Videos.` });
        };
        reader.readAsDataURL(blob);
        setRecording(false);
      };
      recorder.start();
      recorderRef.current = recorder;
      startRef.current = Date.now();
      setElapsed(0);
      setRecording(true);
    } catch {
      setError("This browser cannot record the selected screen.");
    }
  }

  function stopAll() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current?.stop();
    setActive(false);
    setStreaming(false);
    setRecording(false);
  }

  return (
    <AppShell>
      <AppHeader icon={Monitor} title="WindScreen" subtitle={`Screen capture, screenshots and recordings · ${shots} saved this session`} actions={active ? <PrimaryButton className="bg-red-600 hover:bg-red-500" onClick={stopAll}><Square className="size-3.5" /> Stop</PrimaryButton> : <PrimaryButton onClick={() => void start()}><Play className="size-3.5" /> Share screen</PrimaryButton>} />
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="mx-auto max-w-2xl space-y-2.5">
          <div className="overflow-hidden rounded-xl border border-border/70 bg-[#0d1420]">
            <div className="flex items-center gap-1.5 border-b border-white/10 px-2 py-1 text-[8.5px] text-white/50"><Monitor className="size-3" /> {streaming ? "Capturing a selected window or screen" : "No active capture"}{recording && <span className="ml-auto flex items-center gap-1 text-red-300"><span className="size-1.5 animate-pulse rounded-full bg-red-400" /> REC {elapsed}s</span>}</div>
            <div className="relative flex aspect-video items-center justify-center">
              <video ref={videoRef} muted playsInline className="h-full w-full object-contain" />
              {!active && <p className="absolute text-[10px] text-white/30">Your browser will ask which screen or window to share.</p>}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <PrimaryButton onClick={snapshot} disabled={!active}><Camera className="size-3.5" /> Save screenshot</PrimaryButton>
            {!recording ? <GhostButton onClick={startRecording} disabled={!active}><Video className="size-3.5" /> Record screen</GhostButton> : <GhostButton onClick={() => recorderRef.current?.stop()}><Square className="size-3.5" /> Stop recording</GhostButton>}
            <GhostButton onClick={() => os.openApp("photos")}><FolderOpen className="size-3.5" /> Open Pictures</GhostButton>
            <GhostButton onClick={stopAll} disabled={!active}>Release screen</GhostButton>
          </div>
          {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-[9px] text-red-600 dark:text-red-300">{error}</p>}
          <div className="grid gap-2 sm:grid-cols-2">
            <Panel><SectionTitle>Screenshots</SectionTitle><p className="text-[20px] font-semibold">{shots}</p><p className="text-[9px] text-muted-foreground">Saved as PNG files in Pictures. Use WindPhotos to set one as wallpaper.</p></Panel>
            <Panel><SectionTitle>Permissions</SectionTitle><p className="text-[9px] leading-relaxed text-muted-foreground">WindScreen requires a WindOS “screen” grant and your browser’s native screen picker. Capture stops the moment you end sharing or close the browser tab. Recordings go only to the virtual drive.</p></Panel>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
