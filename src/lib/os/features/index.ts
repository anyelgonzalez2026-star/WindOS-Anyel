import {
  Accessibility,
  Activity,
  AppWindow,
  Archive,
  Bell,
  Braces,
  Calculator,
  CalendarDays,
  Clipboard,
  Clock,
  Code2,
  Compass,
  DatabaseBackup,
  FileText,
  FolderOpen,
  Gamepad2,
  HardDrive,
  Images,
  LayoutDashboard,
  LayoutGrid,
  Layers,
  Lock,
  Monitor,
  Network,
  PackageCheck,
  Paintbrush,
  Palette,
  PanelBottom,
  Play,
  Power,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  StickyNote,
  Store,
  Terminal,
  Undo2,
  UserRound,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { FeatureCategory, FeatureEntry } from "../types";
import { PART_ONE } from "./part1";
import { PART_TWO } from "./part2";
import { PART_THREE } from "./part3";
import { PART_FOUR } from "./part4";
import { PART_FIVE } from "./part5";
import type { RawFeatureCategory } from "./types";

const ICONS: Record<string, LucideIcon> = {
  monitor: Monitor,
  appwindow: AppWindow,
  panelbottom: PanelBottom,
  layoutgrid: LayoutGrid,
  power: Power,
  folder: FolderOpen,
  activity: Activity,
  compass: Compass,
  terminal: Terminal,
  settings: Settings,
  calculator: Calculator,
  code: Code2,
  paintbrush: Paintbrush,
  store: Store,
  shield: ShieldCheck,
  lock: Lock,
  network: Network,
  bell: Bell,
  palette: Palette,
  accessibility: Accessibility,
  refresh: RefreshCw,
  undo: Undo2,
  backup: DatabaseBackup,
  play: Play,
  images: Images,
  note: StickyNote,
  calendar: CalendarDays,
  clock: Clock,
  pdf: FileText,
  archive: Archive,
  games: Gamepad2,
  braces: Braces,
  user: UserRound,
  drive: HardDrive,
  search: Search,
  clipboard: Clipboard,
  widgets: LayoutDashboard,
  dashboard: LayoutDashboard,
  wrench: Wrench,
  compat: PackageCheck,
};

const RAW: RawFeatureCategory[] = [
  ...PART_ONE,
  ...PART_TWO,
  ...PART_THREE,
  ...PART_FOUR,
  ...PART_FIVE,
];

// These claims are deliberately downgraded after the implementation audit.
// Keeping the notes in one place prevents the registry from overstating what a
// browser-hosted operating system can actually do.
const LIMITED_OVERRIDES: Record<string, string> = {
  "NET-06": "Browsers do not expose the host's configured DNS resolvers. WindNetwork can report only the connection data the Web APIs expose.",
  "BROWSER-10": "Search provider and popup-sandbox preferences are editable, but the Home button always returns to the built-in new-tab page rather than a configurable homepage URL.",
  "PRIVACY-13": "WindWeather never requests host geolocation; city selection and search are explicit. The location-consent prompt described here is not implemented.",
  "NOTIF-14": "Tasks store due dates locally, but no background scheduler sends task reminders through the shell.",
  "UPDATES-03": "Package updates apply atomically after a short staging state; there is no byte-level download progress or resumable transfer.",
  "UPDATES-04": "The stable, fast and developer channel preference is stored, but this offline build uses the same local package catalogue for every channel.",
  "UPDATES-07": "Pausing or deferring updates is not implemented. Available packages remain listed until the user applies them.",
  "UPDATES-09": "The local package catalogue does not include per-version release notes.",
  "UPDATES-10": "WindOS has no remote core-update path, so there is no operating-system restart prompt after a package update.",
  "UPDATES-14": "Packages are trusted local registry entries; installed files are not independently checksum-verified after install.",
  "UPDATES-16": "Quiet-hours and scheduled update windows are not implemented.",
  "MEDIA-06": "WindMedia plays one file at a time from a filtered library; there is no saved multi-track playlist editor.",
  "MEDIA-09": "WindMedia does not include a Web Audio analyser visualiser.",
  "COMPAT-09": "WindCode provides sandboxed web previews, but WindCompat itself does not bundle a native executable demo.",
  "COMPAT-13": "Package installation is registry-based and grants the app's file access through WindOS; there is no separate storage-permission prompt.",
};

const featureId = (categoryId: string, index: number) => `${categoryId.toUpperCase()}-${String(index + 1).padStart(2, "0")}`;

export const FEATURE_CATEGORIES: FeatureCategory[] = RAW.map((cat) => ({
  id: cat.id,
  name: cat.name,
  icon: ICONS[cat.icon] ?? Layers,
  blurb: cat.blurb,
  features: cat.features.map(([name, description, app, status, note], index) => {
    const override = LIMITED_OVERRIDES[featureId(cat.id, index)];
    const resolvedStatus = override ? "limited" : status ?? "implemented";
    return {
      name,
      description,
      app,
      status: resolvedStatus,
      verified: resolvedStatus !== "limited",
      note: override ?? note,
    };
  }),
}));

export const FEATURE_REGISTRY: FeatureEntry[] = FEATURE_CATEGORIES.flatMap((cat) =>
  cat.features.map((feature, index) => ({
    ...feature,
    id: featureId(cat.id, index),
    category: cat.name,
  })),
);

export const FEATURE_STATS = {
  total: FEATURE_REGISTRY.length,
  implemented: FEATURE_REGISTRY.filter((f) => f.status === "implemented").length,
  limited: FEATURE_REGISTRY.filter((f) => f.status === "limited").length,
  verified: FEATURE_REGISTRY.filter((f) => f.verified).length,
  categories: FEATURE_CATEGORIES.length,
};

export function searchFeatures(query: string): FeatureEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return FEATURE_REGISTRY;
  return FEATURE_REGISTRY.filter(
    (f) =>
      f.name.toLowerCase().includes(q) ||
      f.description.toLowerCase().includes(q) ||
      f.category.toLowerCase().includes(q) ||
      f.app.toLowerCase().includes(q) ||
      f.id.toLowerCase().includes(q),
  );
}
