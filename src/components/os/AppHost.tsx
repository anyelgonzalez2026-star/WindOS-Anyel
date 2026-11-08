import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from "react";
import type { AppProps } from "@/lib/os/types";
import { APP_MAP } from "@/lib/os/registry";
import { Loader2 } from "lucide-react";

type AppModule = LazyExoticComponent<ComponentType<AppProps>>;

const REGISTRY: Record<string, AppModule> = {
  browser: lazy(() => import("@/components/os/apps/Browser")),
  files: lazy(() => import("@/components/os/apps/Files")),
  taskmanager: lazy(() => import("@/components/os/apps/TaskManager")),
  paint: lazy(() => import("@/components/os/apps/Paint")),
  terminal: lazy(() => import("@/components/os/apps/Terminal")),
  settings: lazy(() => import("@/components/os/apps/Settings")),
  calculator: lazy(() => import("@/components/os/apps/Calculator")),
  code: lazy(() => import("@/components/os/apps/Code")),
  notes: lazy(() => import("@/components/os/apps/Notes")),
  calendar: lazy(() => import("@/components/os/apps/Calendar")),
  clock: lazy(() => import("@/components/os/apps/Clock")),
  photos: lazy(() => import("@/components/os/apps/Photos")),
  media: lazy(() => import("@/components/os/apps/Media")),
  recorder: lazy(() => import("@/components/os/apps/Recorder")),
  zip: lazy(() => import("@/components/os/apps/Zip")),
  pdf: lazy(() => import("@/components/os/apps/Pdf")),
  mail: lazy(() => import("@/components/os/apps/Mail")),
  weather: lazy(() => import("@/components/os/apps/Weather")),
  store: lazy(() => import("@/components/os/apps/Store")),
  help: lazy(() => import("@/components/os/apps/Help")),
  monitor: lazy(() => import("@/components/os/apps/Monitor")),
  backup: lazy(() => import("@/components/os/apps/Backup")),
  security: lazy(() => import("@/components/os/apps/Security")),
  network: lazy(() => import("@/components/os/apps/Network")),
  share: lazy(() => import("@/components/os/apps/Share")),
  remote: lazy(() => import("@/components/os/apps/Remote")),
  clipboard: lazy(() => import("@/components/os/apps/ClipboardApp")),
  tasks: lazy(() => import("@/components/os/apps/Tasks")),
  contacts: lazy(() => import("@/components/os/apps/Contacts")),
  games: lazy(() => import("@/components/os/apps/Games")),
  devtools: lazy(() => import("@/components/os/apps/DevTools")),
  screen: lazy(() => import("@/components/os/apps/Screen")),
  accessibility: lazy(() => import("@/components/os/apps/Accessibility")),
  update: lazy(() => import("@/components/os/apps/Update")),
  recovery: lazy(() => import("@/components/os/apps/Recovery")),
  control: lazy(() => import("@/components/os/apps/Control")),
  compat: lazy(() => import("@/components/os/apps/Compat")),
  registry: lazy(() => import("@/components/os/apps/Registry")),
  about: lazy(() => import("@/components/os/apps/About")),
  windpasswords: lazy(() => import("@/components/os/apps/PasswordGen")),
  windunits: lazy(() => import("@/components/os/apps/UnitConverter")),
  windmarkdown: lazy(() => import("@/components/os/apps/MarkdownStudio")),
  windradio: lazy(() => import("@/components/os/apps/AmbientRadio")),
  windhabits: lazy(() => import("@/components/os/apps/HabitTracker")),
  windpalette: lazy(() => import("@/components/os/apps/PaletteLab")),
  windspark: lazy(() => import("@/components/os/apps/SparkNotes")),
};

export function AppHost({ appId, windowId, payload }: AppProps & { appId: string }) {
  const Component = REGISTRY[appId];
  if (!Component) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
        {APP_MAP.get(appId)?.name ?? "This application"} has no local runtime in this build.
      </div>
    );
  }
  return (
    <Suspense
      fallback={
        <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          <p className="text-xs tracking-wide uppercase">Starting {APP_MAP.get(appId)?.name}</p>
        </div>
      }
    >
      <Component windowId={windowId} payload={payload} />
    </Suspense>
  );
}
