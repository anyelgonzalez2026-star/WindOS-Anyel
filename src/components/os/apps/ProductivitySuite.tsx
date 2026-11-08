import { useEffect, useMemo, useRef, useState } from "react";
import { useOS } from "@/lib/os/store";
import { usePersisted } from "@/lib/os/hooks";
import { todayISO, type Contact, type MailMessage, type TaskItem } from "@/lib/os/models";
import { downloadText } from "@/lib/os/zip";
import { cn } from "@/lib/utils";
import { AppShell, AppHeader, AppToolbar, EmptyState, GhostButton, PrimaryButton, SearchInput, inputClass, textareaClass, selectClass, Panel, SectionTitle, Pill } from "./ui";
import { Archive, ArrowLeft, Check, ChevronDown, Circle, Clipboard, ClipboardCheck, Copy, FileText, Inbox, ListChecks, Mail, MailOpen, Paperclip, Pencil, Phone, Pin, Plus, Reply, Search, Send, Star, Trash2, User, UserPlus, Users, X } from "lucide-react";

/* ------------------------------------------------------------------- Tasks */

const TASK_LISTS = ["Inbox", "Personal", "Work", "Ideas"];

export function Tasks() {
  const [tasks, setTasks] = usePersisted<TaskItem[]>("tasks.v1", [
    { id: "t1", title: "Try the WindTerminal", done: false, due: todayISO(), priority: "medium", list: "Inbox", notes: "Type help to see every command." },
    { id: "t2", title: "Read the WindOS welcome file", done: false, due: "", priority: "low", list: "Personal", notes: "Desktop → Documents → welcome.md" },
    { id: "t3", title: "Visit the WindStore", done: true, due: todayISO(), priority: "low", list: "Inbox" },
  ]);
  const [filter, setFilter] = useState<"all" | "today" | "open" | "done">("all");
  const [list, setList] = useState("All");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ title: "", due: "", priority: "medium" as TaskItem["priority"], list: "Inbox", notes: "" });
  const [editing, setEditing] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ title: "", due: "", priority: "medium" as TaskItem["priority"], list: "Inbox", notes: "" });

  const filtered = tasks.filter((task) => {
    if (filter === "today" && task.due !== todayISO()) return false;
    if (filter === "open" && task.done) return false;
    if (filter === "done" && !task.done) return false;
    if (list !== "All" && task.list !== list) return false;
    if (query && !`${task.title} ${task.notes ?? ""}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  }).sort((a, b) => Number(a.done) - Number(b.done) || (a.due || "9999").localeCompare(b.due || "9999"));

  function add() {
    if (!draft.title.trim()) return;
    setTasks((prev) => [{ id: `task_${Date.now()}`, title: draft.title.trim(), done: false, due: draft.due, priority: draft.priority, list: draft.list, notes: draft.notes }, ...prev]);
    setDraft({ title: "", due: "", priority: "medium", list: "Inbox", notes: "" });
    setAdding(false);
  }

  function startEdit(task: TaskItem) {
    setEditing(task.id);
    setEditDraft({ title: task.title, due: task.due, priority: task.priority, list: task.list, notes: task.notes ?? "" });
  }

  function saveEdit() {
    if (!editing) return;
    setTasks((prev) => prev.map((task) => task.id === editing ? { ...task, title: editDraft.title.trim() || task.title, due: editDraft.due, priority: editDraft.priority, list: editDraft.list, notes: editDraft.notes } : task));
    setEditing(null);
  }

  const open = tasks.filter((task) => !task.done).length;
  const overdue = tasks.filter((task) => !task.done && task.due && task.due < todayISO()).length;

  return (
    <AppShell>
      <AppHeader icon={ListChecks} title="WindTasks" subtitle={`${open} open · ${tasks.length - open} completed · ${overdue} overdue`} actions={<PrimaryButton onClick={() => setAdding(true)}><Plus className="size-3.5" /> New task</PrimaryButton>} />
      <AppToolbar>
        {(["all", "today", "open", "done"] as const).map((value) => <button key={value} onClick={() => setFilter(value)} className={cn("rounded px-2 py-1 text-[10px] capitalize", filter === value ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>{value === "today" ? "Due today" : value}</button>)}
        <span className="mx-1 h-4 w-px bg-border" />
        {["All", ...TASK_LISTS].map((value) => <button key={value} onClick={() => setList(value)} className={cn("rounded px-2 py-1 text-[10px]", list === value ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/60")}>{value}</button>)}
        <div className="ml-auto"><SearchInput value={query} onChange={setQuery} placeholder="Search tasks" className="w-40" /></div>
      </AppToolbar>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="mx-auto max-w-2xl space-y-1.5">
          {adding && (
            <div className="rounded-xl border border-primary/30 bg-card p-3">
              <input autoFocus value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} onKeyDown={(event) => event.key === "Enter" && add()} placeholder="Task title" className={cn(inputClass, "border-0 border-b px-0 focus:border-primary/50")} />
              <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                <input type="date" value={draft.due} onChange={(event) => setDraft({ ...draft, due: event.target.value })} className={cn(inputClass, "h-7 text-[10px]")} aria-label="Due date" />
                <select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as TaskItem["priority"] })} className={cn(selectClass, "h-7 text-[10px]")}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select>
                <select value={draft.list} onChange={(event) => setDraft({ ...draft, list: event.target.value })} className={cn(selectClass, "h-7 text-[10px]")}>{TASK_LISTS.map((value) => <option key={value}>{value}</option>)}</select>
                <div className="flex gap-1"><PrimaryButton className="h-7 flex-1 text-[10px]" onClick={add}>Add</PrimaryButton><GhostButton className="h-7 px-2" onClick={() => setAdding(false)}><X className="size-3" /></GhostButton></div>
              </div>
              <textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Notes (optional)" rows={2} className={cn(textareaClass, "mt-1.5 text-[10px]")} />
            </div>
          )}
          {filtered.length === 0 && <EmptyState icon={Check} title="Nothing here" body={tasks.length ? "No tasks match these filters." : "Add your first task. It stays in this browser and appears on the desktop task widget."} />}
          {filtered.map((task) => {
            const isOverdue = !task.done && task.due && task.due < todayISO();
            if (editing === task.id) {
              return (
                <div key={task.id} className="rounded-xl border border-primary/30 bg-card p-2.5">
                  <input value={editDraft.title} onChange={(event) => setEditDraft({ ...editDraft, title: event.target.value })} className={cn(inputClass, "h-7 text-[11px]")} autoFocus />
                  <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                    <input type="date" value={editDraft.due} onChange={(event) => setEditDraft({ ...editDraft, due: event.target.value })} className={cn(inputClass, "h-7 text-[9.5px]")} />
                    <select value={editDraft.priority} onChange={(event) => setEditDraft({ ...editDraft, priority: event.target.value as TaskItem["priority"] })} className={cn(selectClass, "h-7 text-[9.5px]")}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select>
                    <select value={editDraft.list} onChange={(event) => setEditDraft({ ...editDraft, list: event.target.value })} className={cn(selectClass, "h-7 text-[9.5px]")}>{TASK_LISTS.map((value) => <option key={value}>{value}</option>)}</select>
                  </div>
                  <textarea value={editDraft.notes} onChange={(event) => setEditDraft({ ...editDraft, notes: event.target.value })} rows={2} className={cn(textareaClass, "mt-1.5 text-[9.5px]")} />
                  <div className="mt-1.5 flex justify-end gap-1"><GhostButton className="h-6" onClick={() => setEditing(null)}>Cancel</GhostButton><PrimaryButton className="h-6" onClick={saveEdit}>Save</PrimaryButton></div>
                </div>
              );
            }
            return (
              <div key={task.id} className={cn("group flex items-start gap-2.5 rounded-xl border border-border/70 bg-card p-2.5 transition hover:border-border", task.done && "opacity-60")}>
                <button className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border transition", task.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground/40 hover:border-primary")} onClick={() => setTasks((prev) => prev.map((entry) => entry.id === task.id ? { ...entry, done: !entry.done } : entry))} aria-label={task.done ? "Mark undone" : "Mark done"}>{task.done && <Check className="size-2.5" />}</button>
                <button className="min-w-0 flex-1 text-left" onClick={() => startEdit(task)}>
                  <p className={cn("text-[11px] font-medium", task.done && "line-through")}>{task.title}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[8.5px] text-muted-foreground">
                    {task.due && <span className={cn(isOverdue && "font-medium text-red-500")}>{new Date(`${task.due}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>}
                    <span>· {task.list}</span>
                    <span className={cn("rounded px-1 capitalize", task.priority === "high" ? "bg-red-500/10 text-red-600 dark:text-red-400" : task.priority === "medium" ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "bg-muted text-muted-foreground")}>{task.priority}</span>
                    {task.notes && <span className="truncate">· {task.notes}</span>}
                  </div>
                </button>
                <button className="rounded p-1 text-muted-foreground opacity-0 hover:bg-muted group-hover:opacity-100" onClick={() => setTasks((prev) => prev.filter((entry) => entry.id !== task.id))} aria-label="Delete task"><Trash2 className="size-3" /></button>
              </div>
            );
          })}
          {tasks.some((task) => task.done) && <button className="mx-auto block pt-2 text-[9px] text-muted-foreground hover:text-red-500" onClick={() => setTasks((prev) => prev.filter((task) => !task.done))}>Clear completed tasks</button>}
        </div>
      </div>
    </AppShell>
  );
}

/* ---------------------------------------------------------------- Contacts */

const SEED_CONTACTS: Contact[] = [
  { id: "c1", name: "Anyel Gonzalez", email: "anyel@windos.local", phone: "", company: "WindOS", group: "Work", favorite: true, notes: "Creator of WindOS." },
  { id: "c2", name: "Ada Lovelace", email: "ada@analytical.local", phone: "", company: "Analytical Engines", group: "Work", favorite: false, notes: "First programmer." },
  { id: "c3", name: "Grace Hopper", email: "grace@navy.local", phone: "", company: "US Navy", group: "Work", favorite: false },
  { id: "c4", name: "Jordan Lee", email: "jordan@example.com", phone: "+1 555 0142", company: "Studio North", group: "Personal", favorite: true },
];

export function Contacts() {
  const os = useOS();
  const [contacts, setContacts] = usePersisted<Contact[]>("contacts.v1", SEED_CONTACTS);
  const [selectedId, setSelectedId] = useState<string | null>(contacts[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("All");
  const [editing, setEditing] = useState<Partial<Contact> | null>(null);
  const selected = contacts.find((contact) => contact.id === selectedId);
  const groups = ["All", ...new Set(contacts.map((contact) => contact.group))];
  const filtered = contacts.filter((contact) => (group === "All" || contact.group === group) && `${contact.name} ${contact.email} ${contact.phone} ${contact.company}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name));

  function save() {
    if (!editing?.name?.trim()) return;
    if (editing.id) {
      setContacts((prev) => prev.map((contact) => contact.id === editing.id ? { ...contact, ...editing, name: editing.name!.trim() } as Contact : contact));
    } else {
      const contact: Contact = { id: `contact_${Date.now()}`, name: editing.name.trim(), email: editing.email ?? "", phone: editing.phone ?? "", company: editing.company ?? "", group: editing.group ?? "Personal", favorite: false, notes: editing.notes };
      setContacts((prev) => [contact, ...prev]);
      setSelectedId(contact.id);
    }
    setEditing(null);
  }

  function exportVcards() {
    const body = contacts.map((contact) => `BEGIN:VCARD\nVERSION:3.0\nFN:${contact.name}\nEMAIL:${contact.email}\nTEL:${contact.phone}\nORG:${contact.company}\nNOTE:${contact.notes ?? ""}\nEND:VCARD`).join("\n");
    downloadText(body, "windos-contacts.vcf", "text/vcard");
  }

  return (
    <AppShell>
      <AppHeader icon={Users} title="WindContacts" subtitle={`${contacts.length} contacts · local address book`} actions={<><GhostButton onClick={exportVcards}><FileText className="size-3.5" /> Export vCard</GhostButton><PrimaryButton onClick={() => setEditing({ group: "Personal" })}><UserPlus className="size-3.5" /> New contact</PrimaryButton></>} />
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[232px] shrink-0 flex-col border-r border-border/60 bg-muted/15">
          <div className="space-y-1.5 p-2"><SearchInput value={query} onChange={setQuery} placeholder="Search contacts" /><select value={group} onChange={(event) => setGroup(event.target.value)} className="h-7 w-full rounded border border-border bg-background px-1 text-[9.5px]">{groups.map((value) => <option key={value}>{value}</option>)}</select></div>
          <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-2">
            {filtered.map((contact) => (
              <button key={contact.id} className={cn("mb-0.5 flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left transition", selectedId === contact.id ? "bg-primary/10" : "hover:bg-muted")} onClick={() => setSelectedId(contact.id)}>
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[9px] font-semibold text-primary">{contact.name.slice(0, 1).toUpperCase()}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-medium">{contact.name}</span><span className="block truncate text-[8px] text-muted-foreground">{contact.company || contact.email}</span></span>
                {contact.favorite && <Star className="size-2.5 shrink-0 fill-amber-400 text-amber-400" />}
              </button>
            ))}
            {filtered.length === 0 && <p className="px-2 py-4 text-[9px] text-muted-foreground">No contacts match.</p>}
          </div>
        </aside>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {editing ? (
            <div className="mx-auto max-w-md space-y-2">
              <p className="text-[12px] font-semibold">{editing.id ? "Edit contact" : "New contact"}</p>
              {([["name", "Full name", "text"], ["email", "Email", "email"], ["phone", "Phone", "tel"], ["company", "Company", "text"], ["group", "Group", "text"]] as const).map(([key, label, type]) => (
                <label key={key} className="block"><span className="text-[9.5px] text-muted-foreground">{label}</span><input type={type} value={(editing[key] as string) ?? ""} onChange={(event) => setEditing({ ...editing, [key]: event.target.value })} className={cn(inputClass, "mt-0.5")} /></label>
              ))}
              <label className="block"><span className="text-[9.5px] text-muted-foreground">Notes</span><textarea value={editing.notes ?? ""} onChange={(event) => setEditing({ ...editing, notes: event.target.value })} rows={3} className={cn(textareaClass, "mt-0.5")} /></label>
              <div className="flex justify-end gap-1.5"><GhostButton onClick={() => setEditing(null)}>Cancel</GhostButton><PrimaryButton onClick={save}>Save contact</PrimaryButton></div>
            </div>
          ) : selected ? (
            <div className="mx-auto max-w-md">
              <div className="flex items-center gap-3">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/12 text-[20px] font-semibold text-primary">{selected.name.slice(0, 1).toUpperCase()}</div>
                <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><p className="truncate text-[16px] font-semibold">{selected.name}</p><button onClick={() => setContacts((prev) => prev.map((contact) => contact.id === selected.id ? { ...contact, favorite: !contact.favorite } : contact))} aria-label="Favourite">{selected.favorite ? <Star className="size-4 fill-amber-400 text-amber-400" /> : <Star className="size-4 text-muted-foreground/40" />}</button></div><p className="text-[10px] text-muted-foreground">{selected.company}{selected.group ? ` · ${selected.group}` : ""}</p></div>
                <button className="rounded border border-border p-1.5 hover:bg-muted" onClick={() => setEditing(selected)} aria-label="Edit contact"><Pencil className="size-3.5" /></button>
              </div>
              <div className="mt-4 space-y-1.5">
                {selected.email && <InfoRow icon={Mail} label="Email" value={selected.email} action={() => os.openApp("mail", { compose: true, to: selected.email })} actionLabel="Compose" />}
                {selected.phone && <InfoRow icon={Phone} label="Phone" value={selected.phone} action={() => void os.copyText(selected.phone, "WindContacts")} actionLabel="Copy" />}
                {selected.company && <InfoRow icon={User} label="Company" value={selected.company} />}
                {selected.notes && <div className="rounded-lg border border-border/60 bg-muted/20 p-2 text-[9.5px] text-muted-foreground">{selected.notes}</div>}
              </div>
              <div className="mt-3 flex gap-1.5">
                <GhostButton onClick={() => os.openApp("mail", { compose: true, to: selected.email })} disabled={!selected.email}><Send className="size-3.5" /> Send email</GhostButton>
                <GhostButton onClick={() => void os.copyText(`${selected.name} <${selected.email}>`, "WindContacts")}><Copy className="size-3.5" /> Copy address</GhostButton>
                <button className="ml-auto rounded p-1.5 text-red-500 hover:bg-red-500/10" onClick={() => { setContacts((prev) => prev.filter((contact) => contact.id !== selected.id)); setSelectedId(contacts.find((contact) => contact.id !== selected.id)?.id ?? null); }} aria-label="Delete contact"><Trash2 className="size-3.5" /></button>
              </div>
              <p className="mt-4 text-[8.5px] text-muted-foreground">Contacts are stored locally. WindMail does not send email over the internet; deliveries are simulated inside WindOS.</p>
            </div>
          ) : (
            <EmptyState icon={Users} title="No contact selected" body="Choose a contact or create a new one." action={<PrimaryButton onClick={() => setEditing({ group: "Personal" })}>New contact</PrimaryButton>} />
          )}
        </div>
      </div>
    </AppShell>
  );
}

function InfoRow({ icon: Icon, label, value, action, actionLabel }: { icon: typeof Mail; label: string; value: string; action?: () => void; actionLabel?: string }) {
  return <div className="flex items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5"><Icon className="size-3.5 text-muted-foreground" /><span className="w-16 text-[8.5px] text-muted-foreground">{label}</span><span className="min-w-0 flex-1 truncate text-[10px]">{value}</span>{action && <button className="text-[8.5px] text-primary hover:underline" onClick={action}>{actionLabel}</button>}</div>;
}

/* -------------------------------------------------------------------- Mail */

const SEED_MAIL: MailMessage[] = [
  { id: "m1", folder: "inbox", from: "WindOS Team", to: "you@windos.local", subject: "Welcome to WindOS 1.0.0", body: "Hello and welcome to WindOS!\n\nYour virtual computer is ready. A few places worth visiting:\n\n• WindFiles — everything lives in the same persistent virtual drive.\n• WindTerminal — type help to see the shell commands.\n• WindStore — install packages from the local catalogue.\n• WindBackup — export a backup before big changes.\n\nThis mailbox is a local simulation. No email leaves your browser.\n\n— The WindOS Team", at: Date.now() - 1000 * 60 * 60 * 3, read: false, starred: true, attachments: [{ name: "welcome.md", size: 1240 }] },
  { id: "m2", folder: "inbox", from: "Anyel Gonzalez", to: "you@windos.local", subject: "A note from the creator", body: "Thanks for trying WindOS.\n\nIt is a complete simulation, not a mockup: files persist, windows are managed, permissions are gated, and the terminal writes to the same disk as WindFiles.\n\nIf something feels unfinished, WindHelp and the feature registry are honest about the boundaries of a browser-based OS.\n\n— Anyel", at: Date.now() - 1000 * 60 * 60 * 26, read: true, starred: false, attachments: [] },
  { id: "m3", folder: "inbox", from: "WindStore", to: "you@windos.local", subject: "Two updates are waiting", body: "WindNotes and WindWeather have newer package versions in the local catalogue.\n\nOpen WindStore → Updates to review, or WindSettings → Installed apps to update individually.", at: Date.now() - 1000 * 60 * 60 * 50, read: true, starred: false, attachments: [] },
  { id: "m4", folder: "sent", from: "you@windos.local", to: "ada@analytical.local", subject: "Notes on the engine", body: "Ada — the virtual filesystem is holding up well. I have been testing copy, move and restore across apps.\n\n— WindOS user", at: Date.now() - 1000 * 60 * 60 * 72, read: true, starred: false, attachments: [] },
];

export function MailApp({ payload }: { payload?: Record<string, unknown> }) {
  const os = useOS();
  const [messages, setMessages] = usePersisted<MailMessage[]>("mail.messages.v1", SEED_MAIL);
  const [folder, setFolder] = useState<"inbox" | "sent" | "drafts" | "trash" | "starred">("inbox");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [compose, setCompose] = useState<{ id?: string; to: string; subject: string; body: string } | null>(
    payload?.compose ? { to: String(payload.to ?? ""), subject: "", body: "" } : null,
  );
  const selected = messages.find((message) => message.id === selectedId) ?? null;
  const unread = messages.filter((message) => message.folder === "inbox" && !message.read).length;

  const list = messages.filter((message) => {
    if (folder === "starred" ? !message.starred : message.folder !== folder) return false;
    if (query && !`${message.subject} ${message.from} ${message.to} ${message.body}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  }).sort((a, b) => b.at - a.at);

  function open(message: MailMessage) {
    setSelectedId(message.id);
    if (!message.read) setMessages((prev) => prev.map((entry) => entry.id === message.id ? { ...entry, read: true } : entry));
  }

  function send() {
    if (!compose || !compose.to.trim()) return;
    if (compose.id) {
      setMessages((prev) => prev.map((message) => message.id === compose.id ? { ...message, to: compose.to, subject: compose.subject, body: compose.body, at: Date.now() } : message));
    } else {
      setMessages((prev) => [{ id: `mail_${Date.now()}`, folder: "sent", from: "you@windos.local", to: compose.to, subject: compose.subject || "(no subject)", body: compose.body, at: Date.now(), read: true, starred: false, attachments: [] }, ...prev]);
    }
    setCompose(null);
    os.notify({ appId: "WindMail", title: "Message saved to Sent", body: "WindMail is a local simulation — nothing was transmitted over the internet." });
  }

  function remove() {
    if (!selected) return;
    if (selected.folder === "trash") {
      setMessages((prev) => prev.filter((message) => message.id !== selected.id));
    } else {
      setMessages((prev) => prev.map((message) => message.id === selected.id ? { ...message, folder: "trash" } : message));
    }
    setSelectedId(null);
  }

  return (
    <AppShell>
      <AppHeader icon={Mail} title="WindMail" subtitle={`${unread} unread · local mailbox simulation · no internet delivery`} actions={<PrimaryButton onClick={() => setCompose({ to: "", subject: "", body: "" })}><Pencil className="size-3.5" /> Compose</PrimaryButton>} />
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[150px] shrink-0 flex-col border-r border-border/60 bg-muted/15">
          <div className="p-1.5">
            {([["inbox", "Inbox", Inbox, unread], ["starred", "Starred", Star, 0], ["sent", "Sent", Send, 0], ["drafts", "Drafts", FileText, 0], ["trash", "Trash", Trash2, 0]] as const).map(([id, label, Icon, badge]) => (
              <button key={id} onClick={() => { setFolder(id); setSelectedId(null); }} className={cn("mb-0.5 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[10.5px]", folder === id ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                <Icon className="size-3.5" /> {label}
                {badge > 0 && <span className="ml-auto rounded-full bg-primary px-1 text-[8px] text-primary-foreground">{badge}</span>}
              </button>
            ))}
          </div>
          <div className="mt-auto border-t border-border/60 px-2 py-2 text-[8px] leading-relaxed text-muted-foreground">Local only. Connect a mail provider for real delivery.</div>
        </aside>
        <div className="flex min-w-0 flex-1">
          <div className="flex w-[250px] shrink-0 flex-col border-r border-border/60">
            <div className="flex items-center gap-1 p-2"><SearchInput value={query} onChange={setQuery} placeholder="Search mail" /><span className="text-[8px] text-muted-foreground">{list.length}</span></div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {list.length === 0 && <p className="p-4 text-center text-[9.5px] text-muted-foreground">No messages in {folder}.</p>}
              {list.map((message) => (
                <button key={message.id} onClick={() => open(message)} className={cn("flex w-full flex-col gap-0.5 border-b border-border/40 px-2.5 py-2 text-left transition", selectedId === message.id ? "bg-primary/8" : "hover:bg-muted/50")}>
                  <div className="flex w-full items-center gap-1.5"><span className={cn("min-w-0 flex-1 truncate text-[9.5px]", !message.read && "font-semibold")}>{folder === "sent" ? `To: ${message.to}` : message.from}</span>{message.starred && <Star className="size-2.5 shrink-0 fill-amber-400 text-amber-400" />}<span className="shrink-0 text-[7.5px] text-muted-foreground">{new Date(message.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span></div>
                  <p className={cn("truncate text-[10px]", !message.read && "font-medium")}>{message.subject}</p>
                  <p className="truncate text-[8.5px] text-muted-foreground">{message.body.slice(0, 70)}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="min-w-0 flex-1 overflow-y-auto">
            {selected ? (
              <div className="p-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h2 className="min-w-0 flex-1 text-[14px] font-semibold">{selected.subject}</h2>
                  <button className={cn("rounded p-1", selected.starred ? "text-amber-500" : "text-muted-foreground hover:text-amber-500")} onClick={() => setMessages((prev) => prev.map((entry) => entry.id === selected.id ? { ...entry, starred: !entry.starred } : entry))} aria-label="Star"><Star className={cn("size-3.5", selected.starred && "fill-current")} /></button>
                  <button className="rounded p-1 text-muted-foreground hover:bg-muted" onClick={() => setCompose({ to: selected.from, subject: `Re: ${selected.subject}`, body: `\n\n---\nOn ${new Date(selected.at).toLocaleString()}, ${selected.from} wrote:\n${selected.body}` })} aria-label="Reply"><Reply className="size-3.5" /></button>
                  <button className="rounded p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-500" onClick={remove} aria-label="Delete"><Trash2 className="size-3.5" /></button>
                </div>
                <p className="mt-1 text-[9px] text-muted-foreground">{selected.from} → {selected.to} · {new Date(selected.at).toLocaleString()}</p>
                <div className="mt-3 whitespace-pre-wrap text-[10.5px] leading-relaxed">{selected.body}</div>
                {selected.attachments.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="flex items-center gap-1 text-[9px] text-muted-foreground"><Paperclip className="size-3" /> {selected.attachments.length} attachment</p>
                    {selected.attachments.map((attachment) => <div key={attachment.name} className="flex items-center gap-2 rounded border border-border/60 px-2 py-1 text-[9.5px]"><FileText className="size-3.5 text-muted-foreground" /><span className="flex-1 truncate">{attachment.name}</span><span className="text-[8px] text-muted-foreground">{attachment.size} B</span></div>)}
                  </div>
                )}
                <div className="mt-3 flex gap-1.5"><GhostButton onClick={() => setCompose({ to: selected.from, subject: `Re: ${selected.subject}`, body: "" })}><Reply className="size-3.5" /> Reply</GhostButton><GhostButton onClick={() => { setFolder("trash"); remove(); }}><Trash2 className="size-3.5" /> Move to trash</GhostButton></div>
                <p className="mt-4 rounded-lg border border-border/50 bg-muted/20 p-2 text-[8px] text-muted-foreground">This message is stored in the local WindMail simulation. Attachments are metadata only and cannot be downloaded from this mailbox.</p>
              </div>
            ) : (
              <EmptyState icon={MailOpen} title={folder === "sent" ? "Sent messages" : "Select a message"} body="WindMail stores everything locally. Compose messages and save drafts — no network request is made." action={<GhostButton onClick={() => setCompose({ to: "", subject: "", body: "" })}><Pencil className="size-3.5" /> Compose</GhostButton>} />
            )}
          </div>
        </div>
      </div>

      {compose && (
        <div className="absolute inset-0 z-[30] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-border bg-popover p-3 shadow-2xl">
            <div className="mb-2 flex items-center justify-between"><p className="text-[12px] font-semibold">{compose.id ? "Edit draft" : "New message"}</p><button className="rounded p-1 text-muted-foreground hover:bg-muted" onClick={() => setCompose(null)} aria-label="Close"><X className="size-4" /></button></div>
            <div className="space-y-1.5">
              <input value={compose.to} onChange={(event) => setCompose({ ...compose, to: event.target.value })} placeholder="To: email address" className={cn(inputClass, "h-7 text-[10px]")} />
              <input value={compose.subject} onChange={(event) => setCompose({ ...compose, subject: event.target.value })} placeholder="Subject" className={cn(inputClass, "h-7 text-[10px]")} />
              <textarea value={compose.body} onChange={(event) => setCompose({ ...compose, body: event.target.value })} rows={8} placeholder="Write a message…" className={cn(textareaClass, "text-[10.5px]")} />
            </div>
            <div className="mt-2 flex items-center justify-between gap-1.5">
              <span className="text-[8px] text-muted-foreground">Saved locally; nothing is transmitted.</span>
              <div className="flex gap-1.5"><GhostButton onClick={() => { if (!compose.to) return; setMessages((prev) => [{ id: `draft_${Date.now()}`, folder: "drafts", from: "you@windos.local", to: compose.to, subject: compose.subject || "(no subject)", body: compose.body, at: Date.now(), read: true, starred: false, attachments: [] }, ...prev]); setCompose(null); }} disabled={!compose.to}>Save draft</GhostButton><PrimaryButton onClick={send} disabled={!compose.to.trim()}><Send className="size-3.5" /> Send locally</PrimaryButton></div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

/* --------------------------------------------------------------- Clipboard */

export function ClipboardApp() {
  const os = useOS();
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const entries = os.clipboard.filter((entry) => !query || entry.text.toLowerCase().includes(query.toLowerCase()));

  function flash(value: string) { setMessage(value); window.setTimeout(() => setMessage(""), 2400); }

  async function pasteFromSystem() {
    setBusy(true);
    try {
      const text = await os.readClipboard("WindClipboard");
      if (text) { setDraft(text); flash("Read from the system clipboard."); }
      else flash("The system clipboard is empty or permission was denied.");
    } catch {
      flash("Clipboard access was blocked by the browser.");
    }
    setBusy(false);
  }

  return (
    <AppShell>
      <AppHeader icon={Clipboard} title="WindClipboard" subtitle={`${os.clipboard.length} captured entries · ${os.clipboard.filter((entry) => entry.pinned).length} pinned · stored locally`} actions={<GhostButton onClick={() => os.clearClipboard(false)}><Trash2 className="size-3.5" /> Clear unpinned</GhostButton>} />
      <AppToolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Search clipboard history" className="w-52" />
        <span className="ml-auto text-[9px] text-muted-foreground">Requires clipboard permission for system reads</span>
      </AppToolbar>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="mx-auto max-w-2xl space-y-2">
          <div className="rounded-xl border border-border/70 bg-card p-2.5">
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={2} placeholder="Type or paste text to keep it in WindOS history…" className={cn(textareaClass, "text-[10px]")} />
            <div className="mt-1.5 flex gap-1.5">
              <PrimaryButton className="h-7" disabled={!draft.trim()} onClick={async () => { const ok = await os.copyText(draft.trim(), "WindClipboard"); if (ok) { setDraft(""); flash("Copied and saved to history."); } }}><ClipboardCheck className="size-3.5" /> Copy & save</PrimaryButton>
              <GhostButton className="h-7" onClick={pasteFromSystem} disabled={busy}><Clipboard className="size-3.5" /> {busy ? "Reading…" : "Read system clipboard"}</GhostButton>
              {message && <span className="ml-auto self-center text-[8.5px] text-primary">{message}</span>}
            </div>
          </div>
          {entries.length === 0 && <EmptyState icon={Clipboard} title="Clipboard history is empty" body="Text copied with WindOS-aware apps is captured here. Use the field above to add an entry manually." />}
          {entries.map((entry) => (
            <div key={entry.id} className="group rounded-xl border border-border/70 bg-card p-2.5">
              <div className="flex items-start gap-2">
                <button className={cn("mt-0.5 rounded p-0.5", entry.pinned ? "text-amber-500" : "text-muted-foreground/40 hover:text-amber-500")} onClick={() => os.togglePinEntry(entry.id)} aria-label={entry.pinned ? "Unpin" : "Pin"}><Pin className={cn("size-3", entry.pinned && "fill-current")} /></button>
                <div className="min-w-0 flex-1">
                  <p className="max-h-20 overflow-hidden whitespace-pre-wrap break-words text-[10px] leading-relaxed">{entry.text}</p>
                  <p className="mt-1 text-[8px] text-muted-foreground">{entry.source} · {new Date(entry.at).toLocaleString()} · {entry.text.length} chars</p>
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <button className="rounded p-1 text-muted-foreground hover:bg-muted" onClick={async () => { const ok = await os.copyText(entry.text, "WindClipboard"); if (ok) flash("Copied."); }} aria-label="Copy entry"><Copy className="size-3" /></button>
                  <button className="rounded p-1 text-red-500 opacity-0 hover:bg-red-500/10 group-hover:opacity-100" onClick={() => os.removeClipboardEntry(entry.id)} aria-label="Delete entry"><Trash2 className="size-3" /></button>
                </div>
              </div>
            </div>
          ))}
          {os.clipboard.length > 0 && <button className="mx-auto block pt-1 text-[9px] text-muted-foreground hover:text-red-500" onClick={() => os.clearClipboard(true)}>Clear everything, including pinned</button>}
          <p className="pt-2 text-[8px] leading-relaxed text-muted-foreground">WindOS clipboard history is kept in local storage. Browser clipboard access is permission-gated and may be blocked in some contexts. Other apps cannot read your history without a clipboard grant.</p>
        </div>
      </div>
    </AppShell>
  );
}
