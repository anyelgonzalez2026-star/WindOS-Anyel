import { useEffect, useMemo, useRef, useState } from "react";
import { useOS } from "@/lib/os/store";
import { usePersisted } from "@/lib/os/hooks";
import { EVENT_COLORS, todayISO, type CalendarEvent } from "@/lib/os/models";
import { cn } from "@/lib/utils";
import { AppShell, AppHeader, GhostButton, PrimaryButton, SearchInput, inputClass, selectClass, textareaClass, Field, Pill } from "./ui";
import { Bell, BellOff, CalendarDays, ChevronLeft, ChevronRight, Clock3, Pencil, Plus, Trash2, X } from "lucide-react";

export default function Calendar() {
  const os = useOS();
  const [events, setEvents] = usePersisted<CalendarEvent[]>("calendar.events.v1", []);
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<{ id?: string; title: string; date: string; time: string; color: string; notes: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CalendarEvent | null>(null);
  const [error, setError] = useState("");
  const remindersSent = useRef(false);
  const hasNotifications = os.hasPermission("calendar", "notifications");

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthName = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const isoFor = (day: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const todayEvents = useMemo(() => events.filter((event) => event.date === todayISO()), [events]);
  useEffect(() => {
    if (!hasNotifications || remindersSent.current || todayEvents.length === 0) return;
    remindersSent.current = true;
    os.notify({
      appId: "WindCalendar",
      title: `${todayEvents.length} event${todayEvents.length === 1 ? "" : "s"} today`,
      body: todayEvents.map((event) => `${event.time || "All day"} · ${event.title}`).slice(0, 3).join("  |  "),
      actions: [{ label: "Open calendar", appId: "calendar" }],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasNotifications, todayEvents.length]);

  const selectedEvents = events
    .filter((event) => event.date === selectedDate && (!query || event.title.toLowerCase().includes(query.toLowerCase()) || (event.notes ?? "").toLowerCase().includes(query.toLowerCase())))
    .sort((a, b) => (a.time || "zz").localeCompare(b.time || "zz"));

  const searchResults = query.trim()
    ? events.filter((event) => event.title.toLowerCase().includes(query.toLowerCase()) || (event.notes ?? "").toLowerCase().includes(query.toLowerCase()))
    : [];

  function openNew(date = selectedDate) {
    setError("");
    setEditor({ date, title: "", time: "", color: EVENT_COLORS[0], notes: "" });
  }

  function openEdit(event: CalendarEvent) {
    setError("");
    setEditor({ id: event.id, title: event.title, date: event.date, time: event.time, color: event.color, notes: event.notes ?? "" });
  }

  function saveEvent() {
    if (!editor) return;
    if (!editor.title.trim()) {
      setError("Give the event a title.");
      return;
    }
    if (!editor.date) {
      setError("Choose a date.");
      return;
    }
    if (editor.id) {
      setEvents((prev) => prev.map((event) => (event.id === editor.id ? { ...event, title: editor.title.trim(), date: editor.date, time: editor.time, color: editor.color, notes: editor.notes } : event)));
      os.notify({ appId: "WindOS", title: "Event updated", body: `${editor.title} was updated in WindCalendar.` });
    } else {
      setEvents((prev) => [...prev, { id: `evt_${Date.now()}`, title: editor.title.trim(), date: editor.date, time: editor.time, color: editor.color, notes: editor.notes }]);
      os.notify({ appId: "WindOS", title: "Event created", body: `${editor.title} is scheduled for ${editor.date}.` });
    }
    setSelectedDate(editor.date);
    setCursor(new Date(Number(editor.date.slice(0, 4)), Number(editor.date.slice(5, 7)) - 1, 1));
    setEditor(null);
  }

  function deleteEvent(id: string) {
    setEvents((prev) => prev.filter((event) => event.id !== id));
    os.notify({ appId: "WindOS", title: "Event removed", body: "The event was deleted from WindCalendar." });
  }

  function shiftMonth(delta: number) {
    setCursor(new Date(year, month + delta, 1));
  }

  return (
    <AppShell
      onKeyDown={(event) => {
        if (editor || pendingDelete) return;
        const tag = (event.target as HTMLElement | null)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        if (event.key === "ArrowLeft" && !event.metaKey && !event.ctrlKey && !event.altKey) {
          event.preventDefault();
          shiftMonth(-1);
        }
        if (event.key === "ArrowRight" && !event.metaKey && !event.ctrlKey && !event.altKey) {
          event.preventDefault();
          shiftMonth(1);
        }
      }}
    >
      <AppHeader
        icon={CalendarDays}
        title="WindCalendar"
        subtitle={`${events.length} events · ${monthName}${query ? " · filtered" : ""}`}
        actions={
          <>
            {!hasNotifications && (
              <GhostButton onClick={() => void os.requestPermission("calendar", "notifications")} title="Enable event reminders">
                <BellOff className="size-3.5" /> Enable reminders
              </GhostButton>
            )}
            {hasNotifications && <Pill tone="success"><Bell className="size-2.5" /> reminders on</Pill>}
            <GhostButton onClick={() => { setCursor(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDate(todayISO()); }}>Today</GhostButton>
            <PrimaryButton onClick={() => openNew()}><Plus className="size-3.5" /> New event</PrimaryButton>
          </>
        }
      />

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border/60 px-3 py-2">
        <button className="flex size-7 items-center justify-center rounded-md border border-border hover:bg-muted" onClick={() => shiftMonth(-1)} aria-label="Previous month"><ChevronLeft className="size-3.5" /></button>
        <button className="flex size-7 items-center justify-center rounded-md border border-border hover:bg-muted" onClick={() => shiftMonth(1)} aria-label="Next month"><ChevronRight className="size-3.5" /></button>
        <p className="ml-1 text-[13px] font-semibold">{monthName}</p>
        <div className="ml-auto flex items-center gap-2">
          <SearchInput value={query} onChange={setQuery} placeholder="Search events" className="w-40" />
          {query && <button className="text-[9.5px] text-muted-foreground hover:text-foreground" onClick={() => setQuery("")}><X className="size-3" /></button>}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col p-2">
          <div className="grid grid-cols-7 gap-1 px-1 pb-1 text-center text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-7 gap-1">
            {cells.map((day, index) => {
              if (!day) return <div key={index} className="rounded-lg bg-muted/20" />;
              const iso = isoFor(day);
              const dayEvents = events.filter((event) => event.date === iso);
              const isToday = iso === todayISO();
              const isSelected = iso === selectedDate;
              const isWeekend = [5, 6].includes((new Date(year, month, day).getDay() + 6) % 7);
              return (
                <button
                  key={index}
                  onClick={() => setSelectedDate(iso)}
                  onDoubleClick={() => openNew(iso)}
                  className={cn(
                    "group flex min-h-[46px] flex-col items-stretch gap-0.5 rounded-lg border p-1 text-left transition",
                    isSelected ? "border-primary/50 bg-primary/8" : "border-border/50 hover:bg-muted/50",
                    isWeekend && !isSelected && "bg-muted/25",
                  )}
                  aria-label={`${day} ${monthName}, ${dayEvents.length} events`}
                >
                  <span className={cn("flex size-5 items-center justify-center rounded-full text-[10px] tabular-nums", isToday ? "bg-primary font-semibold text-primary-foreground" : "text-foreground/80")}>{day}</span>
                  <span className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
                    {dayEvents.slice(0, 2).map((event) => (
                      <span key={event.id} className="truncate rounded px-1 py-0.5 text-[8px] leading-tight text-white" style={{ background: event.color }}>
                        {event.time ? `${event.time} ` : ""}{event.title}
                      </span>
                    ))}
                    {dayEvents.length > 2 && <span className="px-1 text-[8px] text-muted-foreground">+{dayEvents.length - 2} more</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="hidden w-[276px] shrink-0 flex-col border-l border-border/60 bg-muted/15 md:flex">
          <div className="border-b border-border/60 px-3 py-2.5">
            <p className="text-[11.5px] font-semibold">
              {new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <p className="text-[9.5px] text-muted-foreground">{query ? `${searchResults.length} search results` : `${selectedEvents.length} event${selectedEvents.length === 1 ? "" : "s"}`}</p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {(query ? searchResults : selectedEvents).length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-center">
                <Clock3 className="mx-auto mb-2 size-5 text-muted-foreground/40" />
                <p className="text-[10.5px] text-muted-foreground">{query ? "No matching events." : "Nothing scheduled. Double-click a day to add an event."}</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {(query ? searchResults : selectedEvents).map((event) => (
                  <div key={event.id} className="group rounded-lg border border-border/60 bg-card p-2">
                    <div className="flex items-start gap-1.5">
                      <span className="mt-1 size-2 shrink-0 rounded-full" style={{ background: event.color }} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-medium">{event.title}</p>
                        <p className="text-[9.5px] text-muted-foreground">{event.date} · {event.time || "All day"}</p>
                        {event.notes && <p className="mt-0.5 line-clamp-2 text-[9px] text-muted-foreground">{event.notes}</p>}
                      </div>
                      <div className="flex shrink-0 gap-0.5 opacity-0 transition group-hover:opacity-100">
                        <button className="rounded p-1 hover:bg-muted" onClick={() => openEdit(event)} aria-label="Edit event"><Pencil className="size-3" /></button>
                        <button className="rounded p-1 text-red-500 hover:bg-red-500/10" onClick={() => setPendingDelete(event)} aria-label="Delete event"><Trash2 className="size-3" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="border-t border-border/60 p-2">
            <PrimaryButton className="w-full" onClick={() => openNew()}><Plus className="size-3.5" /> Add event on this day</PrimaryButton>
          </div>
        </aside>
      </div>

      {pendingDelete && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-popover p-4 shadow-2xl">
            <h3 className="text-[13px] font-semibold">Delete “{pendingDelete.title}”?</h3>
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">This removes the event from WindCalendar. The action cannot be undone.</p>
            <div className="mt-4 flex justify-end gap-2">
              <GhostButton onClick={() => setPendingDelete(null)}>Cancel</GhostButton>
              <PrimaryButton className="bg-red-600 hover:bg-red-500" onClick={() => { deleteEvent(pendingDelete.id); setPendingDelete(null); }}><Trash2 className="size-3.5" /> Delete event</PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {editor && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-popover p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold">{editor.id ? "Edit event" : "New event"}</h3>
              <button className="rounded p-1 text-muted-foreground hover:bg-muted" onClick={() => setEditor(null)} aria-label="Close"><X className="size-4" /></button>
            </div>
            <div className="mt-3 space-y-2.5">
              <Field label="Title"><input className={inputClass} autoFocus value={editor.title} onChange={(event) => setEditor({ ...editor, title: event.target.value })} placeholder="Team review" /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Date"><input type="date" className={inputClass} value={editor.date} onChange={(event) => setEditor({ ...editor, date: event.target.value })} /></Field>
                <Field label="Time" hint="optional"><input type="time" className={inputClass} value={editor.time} onChange={(event) => setEditor({ ...editor, time: event.target.value })} /></Field>
              </div>
              <Field label="Colour">
                <div className="flex gap-2">
                  {EVENT_COLORS.map((color) => (
                    <button key={color} className={cn("size-6 rounded-full border-2 transition", editor.color === color ? "border-foreground" : "border-transparent")} style={{ background: color }} onClick={() => setEditor({ ...editor, color })} aria-label={`Colour ${color}`} />
                  ))}
                </div>
              </Field>
              <Field label="Notes" hint="optional"><textarea className={textareaClass} rows={3} value={editor.notes} onChange={(event) => setEditor({ ...editor, notes: event.target.value })} /></Field>
              {error && <p className="text-[10px] text-red-600 dark:text-red-400">{error}</p>}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <GhostButton onClick={() => setEditor(null)}>Cancel</GhostButton>
              <PrimaryButton onClick={saveEvent}>{editor.id ? "Save changes" : "Create event"}</PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
