import type { KeyboardEventHandler, ReactNode, Ref } from "react";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function AppShell({ children, className, containerRef, onKeyDown }: { children: ReactNode; className?: string; containerRef?: Ref<HTMLDivElement>; onKeyDown?: KeyboardEventHandler<HTMLDivElement> }) {
  return <div ref={containerRef} onKeyDown={onKeyDown} className={cn("flex h-full min-h-0 flex-col bg-background text-foreground", className)}>{children}</div>;
}

export function AppHeader({
  icon: Icon,
  title,
  subtitle,
  actions,
  compact,
}: {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex shrink-0 items-center gap-3 border-b border-border/60 px-4", compact ? "py-2" : "py-3")}>
      {Icon && (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-[13px] font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="truncate text-[10.5px] text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
    </div>
  );
}

export function AppToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex shrink-0 flex-wrap items-center gap-1.5 border-b border-border/60 bg-muted/25 px-3 py-2", className)}>
      {children}
    </div>
  );
}

export function ToolButton({
  icon: Icon,
  label,
  onClick,
  active,
  disabled,
  danger,
  title,
}: {
  icon?: LucideIcon;
  label?: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  danger?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      className={cn(
        "flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium transition disabled:opacity-35",
        active ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        danger && "hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400",
      )}
    >
      {Icon && <Icon className="size-3.5" />}
      {label}
    </button>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex h-8 items-center gap-1.5 rounded-md border border-border/70 bg-background px-2 focus-within:border-primary/50", className)}>
      <Search className="size-3.5 shrink-0 text-muted-foreground" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? "Search"}
        className="h-full w-full bg-transparent text-[11px] outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border/70 bg-card p-3.5 shadow-sm", className)}>{children}</div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{children}</h3>
      {action}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10.5px] font-medium text-muted-foreground">{label}</span>
      {hint && <span className="ml-1 text-[9.5px] text-muted-foreground/70">{hint}</span>}
      <div className="mt-1">{children}</div>
    </label>
  );
}

export const inputClass =
  "h-8 w-full rounded-md border border-border bg-background px-2.5 text-[11.5px] outline-none transition focus:border-primary/60 placeholder:text-muted-foreground/60";

export const textareaClass =
  "w-full rounded-md border border-border bg-background px-2.5 py-2 text-[11.5px] leading-relaxed outline-none transition focus:border-primary/60 placeholder:text-muted-foreground/60";

export const selectClass =
  "h-8 w-full rounded-md border border-border bg-background px-2 text-[11px] outline-none transition focus:border-primary/60";

export function PrimaryButton({
  children,
  onClick,
  disabled,
  className,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-[11.5px] font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-40",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  disabled,
  active,
  className,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-[11px] font-medium transition hover:bg-muted disabled:opacity-40",
        active && "border-primary/40 bg-primary/10 text-primary",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      {Icon && (
        <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Icon className="size-5" />
        </div>
      )}
      <div>
        <p className="text-[13px] font-semibold">{title}</p>
        {body && <p className="mx-auto mt-1 max-w-sm text-[11px] leading-relaxed text-muted-foreground">{body}</p>}
      </div>
      {action}
    </div>
  );
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" | "accent" }) {
  const tones = {
    neutral: "bg-muted text-muted-foreground",
    success: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
    warning: "bg-amber-500/12 text-amber-700 dark:text-amber-400",
    danger: "bg-red-500/12 text-red-600 dark:text-red-400",
    accent: "bg-primary/12 text-primary",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide", tones[tone])}>{children}</span>;
}

export function StatusDot({ tone = "success" }: { tone?: "success" | "warning" | "danger" | "muted" }) {
  const colors = { success: "bg-emerald-500", warning: "bg-amber-500", danger: "bg-red-500", muted: "bg-muted-foreground" };
  return <span className={cn("inline-block size-1.5 rounded-full", colors[tone])} />;
}

export function KeyHint({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-sans text-[9px] text-muted-foreground">{children}</kbd>;
}

export function Meter({ value, tone }: { value: number; tone?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full transition-[width] duration-300"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: tone ?? "var(--os-accent, #4f5bd5)" }}
      />
    </div>
  );
}
