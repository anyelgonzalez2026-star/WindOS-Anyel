import { useEffect } from "react";
import { useOS } from "@/lib/os/store";
import { APP_MAP } from "@/lib/os/registry";
import { AppIcon } from "./AppIcon";
import { BellOff, CheckCheck, Inbox, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/lib/os/hooks";

function timeAgo(at: number): string {
  const diff = Math.max(0, Date.now() - at);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function NotificationCenter() {
  const os = useOS();
  const isMobile = useMediaQuery("(max-width: 640px)");

  useEffect(() => {
    const timer = window.setTimeout(() => os.markNotificationsRead(), 300);
    return () => window.clearTimeout(timer);
  }, [os.notifications.length]);

  return (
    <div
      className={cn(
        "windos-pop z-[70] flex flex-col rounded-2xl border border-border/70 bg-popover/95 text-popover-foreground shadow-2xl backdrop-blur-2xl",
        isMobile ? "fixed inset-x-2 bottom-16 max-h-[70dvh]" : "absolute bottom-14 right-2 h-[460px] w-[380px]",
      )}
      role="dialog"
      aria-label="Notification centre"
    >
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <Inbox className="size-4 text-muted-foreground" />
          <p className="text-sm font-semibold">Notifications</p>
          {os.unreadCount > 0 && (
            <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
              {os.unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            title="Mark all read"
            aria-label="Mark all notifications read"
            onClick={os.markNotificationsRead}
          >
            <CheckCheck className="size-4" />
          </button>
          <button
            className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            title="Clear all"
            aria-label="Clear all notifications"
            onClick={os.clearNotifications}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {os.notifications.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <BellOff className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">You're all caught up</p>
            <p className="text-xs text-muted-foreground">
              App notifications appear here. Focus assist is {os.quick.focusAssist ? "on" : "off"}.
            </p>
            <button
              className="rounded-lg border px-3 py-1.5 text-xs transition hover:bg-muted"
              onClick={() => os.notify({ appId: "WindOS", title: "Test notification", body: "This is what a WindOS notification looks like." })}
            >
              Send test notification
            </button>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {os.notifications.map((notification) => {
              const app = APP_MAP.get(notification.appId);
              return (
                <li
                  key={notification.id}
                  className={cn(
                    "group relative rounded-xl border border-transparent p-2.5 transition hover:border-border/60 hover:bg-muted/50",
                    !notification.read && "bg-primary/[0.06]",
                  )}
                >
                  <div className="flex gap-2.5">
                    {app ? (
                      <AppIcon app={app} size="sm" />
                    ) : (
                      <div className="flex size-7 items-center justify-center rounded-md bg-slate-500 text-[10px] font-semibold text-white">W</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-xs font-semibold">{notification.title}</p>
                        <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(notification.at)}</span>
                      </div>
                      <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">{notification.body}</p>
                      {notification.actions?.length ? (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {notification.actions.map((action) => (
                            <button
                              key={action.label}
                              className="rounded-md border border-border bg-background px-2 py-1 text-[10.5px] font-medium transition hover:bg-muted"
                              onClick={() => {
                                os.openApp(action.appId);
                                os.dismissNotification(notification.id);
                              }}
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <button
                    className="absolute right-1.5 top-1.5 hidden size-5 items-center justify-center rounded-full bg-background text-muted-foreground shadow group-hover:flex"
                    onClick={() => os.dismissNotification(notification.id)}
                    aria-label="Dismiss notification"
                  >
                    <X className="size-3" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-border/60 px-4 py-2 text-[10.5px] text-muted-foreground">
        Notifications never leave this device.
      </div>
    </div>
  );
}
