import { useState } from "react";
import { useOS } from "@/lib/os/store";
import { usePersisted, useNow } from "@/lib/os/hooks";
import { cn } from "@/lib/utils";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  color: string;
  notes?: string;
}

export function CalendarFlyout() {
  const os = useOS();
  const now = useNow(30000);
  const today = new Date(now);
  const [visible, setVisible] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [events] = usePersisted<CalendarEvent[]>("calendar.events.v1", []);

  const year = visible.getFullYear();
  const month = visible.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const iso = (day: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const todayEvents = events.filter((event) => event.date === iso(today.getDate()) && month === today.getMonth() && year === today.getFullYear());

  return (
    <div className="windos-pop absolute bottom-14 right-2 z-[70] w-[330px] overflow-hidden rounded-2xl border border-border/70 bg-popover/95 text-popover-foreground shadow-2xl backdrop-blur-2xl">
      <div className="flex items-center justify-between bg-gradient-to-br from-primary/95 to-primary/70 px-4 py-3 text-primary-foreground">
        <div>
          <p className="text-2xl font-semibold tabular-nums">
            {today.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
          </p>
          <p className="text-[11px] opacity-85">
            {today.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <button className="rounded-lg bg-white/15 p-2 transition hover:bg-white/25" onClick={() => os.openApp("calendar")} aria-label="Open WindCalendar">
          <CalendarDays className="size-4" />
        </button>
      </div>

      <div className="p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold">
            {visible.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </p>
          <div className="flex gap-1">
            <button className="rounded-md p-1 text-muted-foreground hover:bg-muted" onClick={() => setVisible(new Date(year, month - 1, 1))} aria-label="Previous month">
              <ChevronLeft className="size-3.5" />
            </button>
            <button className="rounded-md p-1 text-muted-foreground hover:bg-muted" onClick={() => setVisible(new Date(year, month + 1, 1))} aria-label="Next month">
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-center text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
          {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
            <span key={`${day}-${i}`} className="py-1">{day}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, index) => {
            if (!day) return <span key={index} />;
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const dayEvents = events.filter((event) => event.date === iso(day));
            return (
              <button
                key={index}
                className={cn(
                  "relative flex aspect-square items-center justify-center rounded-md text-[11px] tabular-nums transition hover:bg-muted",
                  isToday && "bg-primary font-semibold text-primary-foreground hover:bg-primary/90",
                )}
                onClick={() => os.openApp("calendar")}
              >
                {day}
                {dayEvents.length > 0 && !isToday && (
                  <span className="absolute bottom-1 size-1 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-3 border-t border-border/60 pt-2">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Today</p>
          {todayEvents.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">Nothing scheduled. Open WindCalendar to plan your day.</p>
          ) : (
            <ul className="space-y-1">
              {todayEvents.slice(0, 3).map((event) => (
                <li key={event.id} className="flex items-center gap-2 text-[11px]">
                  <span className="size-1.5 rounded-full" style={{ background: event.color }} />
                  <span className="truncate">{event.title}</span>
                  <span className="ml-auto text-muted-foreground">{event.time || "All day"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
