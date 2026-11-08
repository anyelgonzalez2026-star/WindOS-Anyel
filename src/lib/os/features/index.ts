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

export const FEATURE_CATEGORIES: FeatureCategory[] = RAW.map((cat) => ({
  id: cat.id,
  name: cat.name,
  icon: ICONS[cat.icon] ?? Layers,
  blurb: cat.blurb,
  features: cat.features.map(([name, description, app, status, note]) => ({
    name,
    description,
    app,
    status: status ?? "implemented",
    verified: status !== "limited",
    note,
  })),
}));

export const FEATURE_REGISTRY: FeatureEntry[] = FEATURE_CATEGORIES.flatMap((cat) =>
  cat.features.map((feature, index) => ({
    ...feature,
    id: `${cat.id.toUpperCase()}-${String(index + 1).padStart(2, "0")}`,
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
