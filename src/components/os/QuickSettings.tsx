import { useEffect, useState } from "react";
import { useOS } from "@/lib/os/store";
import {
  BatteryCharging,
  BatteryMedium,
  Bluetooth,
  ChevronRight,
  Moon,
  Monitor,
  Plane,
  Radio,
  Share2,
  Sun,
  Volume2,
  Wifi,
  WifiOff,
  Zap,
  Lock,
  Settings as SettingsIcon,
  ShieldCheck,
  BellOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { useMediaQuery } from "@/lib/os/hooks";

function Toggle({
  active,
  icon: Icon,
  label,
  sublabel,
  onClick,
}: {
  active: boolean;
  icon: typeof Wifi;
  label: string;
  sublabel?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-2 rounded-xl border p-2.5 text-left transition-all",
        active
          ? "border-primary/30 bg-primary/10 text-foreground"
          : "border-border/60 bg-background/40 text-muted-foreground hover:bg-muted/60",
      )}
      aria-pressed={active}
    >
      <span
        className={cn(
          "flex size-7 items-center justify-center rounded-full",
          active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[11.5px] font-medium leading-tight">{label}</span>
        {sublabel && <span className="mt-0.5 block truncate text-[10px] leading-tight opacity-70">{sublabel}</span>}
      </span>
    </button>
  );
}

export function QuickSettings() {
  const os = useOS();
  const { settings, updateSettings, quick, setQuick } = os;
  const isMobile = useMediaQuery("(max-width: 640px)");
  const [battery, setBattery] = useState<{ level: number; charging: boolean } | null>(null);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    type BatteryManager = {
      level: number;
      charging: boolean;
      addEventListener: (type: string, fn: () => void) => void;
      removeEventListener: (type: string, fn: () => void) => void;
    };
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryManager> };
    if (!nav.getBattery) return;
    let manager: BatteryManager | null = null;
    let cancelled = false;
    nav.getBattery().then((b) => {
      if (cancelled) return;
      manager = b;
      const sync = () => setBattery({ level: Math.round(b.level * 100), charging: b.charging });
      sync();
      b.addEventListener("levelchange", sync);
      b.addEventListener("chargingchange", sync);
    }).catch(() => undefined);
    return () => {
      cancelled = true;
      if (manager) {
        manager.removeEventListener("levelchange", () => undefined);
        manager.removeEventListener("chargingchange", () => undefined);
      }
    };
  }, []);

  const brightness = settings.brightness;
  const volume = settings.volume;

  return (
    <div
      className={cn(
        "windos-pop z-[70] overflow-y-auto rounded-2xl border border-border/70 bg-popover/95 text-popover-foreground shadow-2xl backdrop-blur-2xl",
        isMobile ? "fixed inset-x-2 bottom-16 max-h-[70dvh]" : "absolute bottom-14 right-2 w-[360px]",
      )}
      role="dialog"
      aria-label="Quick settings"
    >
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{settings.displayName}</p>
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {online ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
            {online ? "Connected" : "Offline"}
            {battery && (
              <>
                <span className="opacity-40">·</span>
                <span>{battery.level}%{battery.charging ? " charging" : ""}</span>
              </>
            )}
          </p>
        </div>
        <button
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted"
          onClick={os.lock}
          title="Lock"
          aria-label="Lock WindOS"
        >
          <Lock className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1.5 p-3">
        <Toggle active={quick.wifi && !quick.airplane} icon={Wifi} label="Wi-Fi" sublabel={online ? "Home network" : "Offline"} onClick={() => setQuick({ wifi: !quick.wifi })} />
        <Toggle active={quick.bluetooth} icon={Bluetooth} label="Bluetooth" sublabel={quick.bluetooth ? "On" : "Off"} onClick={() => setQuick({ bluetooth: !quick.bluetooth })} />
        <Toggle active={quick.airplane} icon={Plane} label="Airplane" sublabel="Radio off" onClick={() => setQuick({ airplane: !quick.airplane })} />
        <Toggle active={quick.batterySaver} icon={Zap} label="Battery saver" sublabel={`Plan: ${settings.powerPlan}`} onClick={() => {
          const next = !quick.batterySaver;
          setQuick({ batterySaver: next });
          updateSettings({ powerPlan: next ? "saver" : "balanced" });
        }} />
        <Toggle active={quick.focusAssist} icon={BellOff} label="Focus assist" sublabel="Quiet banners" onClick={() => setQuick({ focusAssist: !quick.focusAssist })} />
        <Toggle active={settings.nightLight} icon={Moon} label="Night light" sublabel="Warmer colour" onClick={() => updateSettings({ nightLight: !settings.nightLight })} />
        <Toggle active={quick.mobileHotspot} icon={Radio} label="Hotspot" sublabel="Simulated" onClick={() => setQuick({ mobileHotspot: !quick.mobileHotspot })} />
        <Toggle active={quick.nearbySharing} icon={Share2} label="Nearby" sublabel="Sharing" onClick={() => setQuick({ nearbySharing: !quick.nearbySharing })} />
        <Toggle active={settings.secondDisplay} icon={Monitor} label="Display 2" sublabel="Simulated" onClick={() => updateSettings({ secondDisplay: !settings.secondDisplay })} />
      </div>

      <div className="space-y-4 border-t border-border/50 px-4 py-3">
        <div>
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 font-medium"><Sun className="size-3.5" /> Brightness</span>
            <span className="text-muted-foreground">{brightness}%</span>
          </div>
          <Slider value={[brightness]} min={30} max={100} step={1} onValueChange={([value]) => updateSettings({ brightness: value })} />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 font-medium"><Volume2 className="size-3.5" /> Volume</span>
            <span className="text-muted-foreground">{volume}%</span>
          </div>
          <Slider value={[volume]} min={0} max={100} step={1} onValueChange={([value]) => updateSettings({ volume: value })} />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border/50 px-3 py-2.5">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {battery ? (
            <>
              {battery.charging ? <BatteryCharging className="size-4" /> : <BatteryMedium className="size-4" />}
              {battery.level}%
            </>
          ) : (
            <><BatteryMedium className="size-4" /> Simulated power</>
          )}
          <button
            className="ml-1 rounded-md p-1 hover:bg-muted"
            onClick={() => os.openApp("security")}
            title="Security"
            aria-label="Open WindSecurity"
          >
            <ShieldCheck className="size-3.5" />
          </button>
        </div>
        <button
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          onClick={() => os.openApp("settings", { section: "personalization" })}
        >
          <SettingsIcon className="size-3.5" />
          All settings
          <ChevronRight className="size-3" />
        </button>
      </div>
    </div>
  );
}
