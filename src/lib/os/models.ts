export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  color: string;
  notes?: string;
}

export type TaskPriority = "low" | "medium" | "high";

export interface TaskItem {
  id: string;
  title: string;
  done: boolean;
  due: string;
  priority: TaskPriority;
  list: string;
  notes?: string;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  group: string;
  favorite: boolean;
  notes?: string;
}

export interface MailAttachment {
  name: string;
  size: number;
}

export interface MailMessage {
  id: string;
  folder: "inbox" | "sent" | "drafts" | "trash";
  from: string;
  to: string;
  subject: string;
  body: string;
  at: number;
  read: boolean;
  starred: boolean;
  attachments: MailAttachment[];
}

export const EVENT_COLORS = ["#4f5bd5", "#178f8a", "#c1802a", "#c2557a", "#7a5cd6"];

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
