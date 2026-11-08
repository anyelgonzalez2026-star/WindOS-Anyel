import type { AppDefinition } from "@/lib/os/types";
import { cn } from "@/lib/utils";

const SIZES = {
  xs: "size-5 rounded-[5px] [&_svg]:size-3",
  sm: "size-7 rounded-md [&_svg]:size-3.5",
  md: "size-9 rounded-lg [&_svg]:size-4",
  lg: "size-11 rounded-[10px] [&_svg]:size-5",
  xl: "size-14 rounded-xl [&_svg]:size-6",
  hero: "size-16 rounded-2xl [&_svg]:size-7",
};

export function AppIcon({
  app,
  size = "md",
  className,
}: {
  app: AppDefinition;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center text-white shadow-sm ring-1 ring-black/5",
        SIZES[size],
        className,
      )}
      style={{
        background: `linear-gradient(145deg, ${app.color} 0%, ${app.color}cc 55%, ${app.color}99 100%)`,
      }}
      aria-hidden
    >
      <app.icon strokeWidth={1.9} />
      <span className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-b from-white/20 to-transparent opacity-60" />
    </div>
  );
}
