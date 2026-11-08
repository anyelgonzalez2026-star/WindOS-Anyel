import { OSProvider, useOS } from "@/lib/os/store";
import { Desktop } from "@/components/os/Desktop";
import {
  BootScreen,
  LockScreen,
  PoweredOff,
  PowerTransition,
  RecoveryScreen,
  SignedOutScreen,
  SleepScreen,
  TutorialScreen,
  WelcomeScreen,
  WindMark,
} from "@/components/os/BootScreens";

function Session() {
  const os = useOS();

  if (!os.ready || !os.fsReady) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-[#0b1019] text-white">
        <WindMark size={56} />
        <div className="h-1 w-40 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 animate-[loadingbar_1.4s_ease-in-out_infinite] rounded-full bg-teal-400" />
        </div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">Starting WindOS</p>
      </div>
    );
  }

  switch (os.power) {
    case "boot":
      return <BootScreen />;
    case "welcome":
      return <WelcomeScreen />;
    case "tutorial":
      return <TutorialScreen />;
    case "locked":
      return <LockScreen />;
    case "sleep":
      return <SleepScreen />;
    case "shutting-down":
    case "restarting":
      return <PowerTransition mode={os.power} />;
    case "signed-out":
      return <SignedOutScreen />;
    case "recovery":
      return <RecoveryScreen />;
    case "off":
      return <PoweredOff />;
    case "desktop":
    default:
      return <Desktop />;
  }
}

export default function WindOS() {
  return (
    <OSProvider>
      <Session />
    </OSProvider>
  );
}
