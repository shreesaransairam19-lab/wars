"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, CalendarClock, Megaphone, Send, Wrench, X } from "lucide-react";

type AnnouncementKind = "update" | "maintenance";

interface Announcement {
  id: string;
  kind: AnnouncementKind;
  title: string;
  message: string;
  scheduled_for: string | null;
  created_at: string;
  read: boolean;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export function AnnouncementBell({ canPost, isSignedIn }: { canPost: boolean; isSignedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState("");
  const [kind, setKind] = useState<AnnouncementKind>("update");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/announcements", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Could not load announcements.");
      const items = (data.announcements ?? []) as Announcement[];
      setAnnouncements(items);
      setUnreadCount(Number(data.unreadCount) || 0);
      setError("");
      return items;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load announcements.");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  async function openInbox() {
    setOpen(true);
    const items = await refresh();
    const unreadIds = items?.filter((item) => !item.read).map((item) => item.id) ?? [];
    if (!isSignedIn || unreadIds.length === 0) return;

    const response = await fetch("/api/announcements", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ announcementIds: unreadIds }),
    });
    if (response.ok) {
      const readIds = new Set(unreadIds);
      setAnnouncements((current) => current.map((item) => readIds.has(item.id) ? { ...item, read: true } : item));
      setUnreadCount(0);
    }
  }

  async function submitAnnouncement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          title,
          message,
          scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : null,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Could not publish the announcement.");
      setTitle("");
      setMessage("");
      setScheduledFor("");
      setSuccess("Published to everyone.");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not publish the announcement.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="relative grid h-9 w-9 place-items-center rounded-[10px] border border-line bg-panel2 text-sm hover:border-accent"
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => open ? setOpen(false) : void openInbox()}
      >
        <Bell className="h-4 w-4 text-muted" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-pink px-1 text-[9px] font-bold text-[#171116]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section
          role="dialog"
          aria-label="WARS announcements"
          className="absolute right-0 top-[calc(100%+10px)] z-[60] w-[min(92vw,390px)] overflow-hidden rounded-xl border border-line bg-panel shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold">WARS updates</h2>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded p-1 text-muted hover:text-foreground" aria-label="Close announcements">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[55vh] space-y-2 overflow-y-auto p-3">
            {loading && announcements.length === 0 && <p className="p-3 text-sm text-muted">Loading updates…</p>}
            {!loading && !error && announcements.length === 0 && <p className="p-3 text-sm text-muted">No announcements yet.</p>}
            {announcements.map((item) => (
              <article key={item.id} className={`rounded-lg border p-3 ${item.read ? "border-line bg-background/40" : "border-accent/50 bg-accent/5"}`}>
                <div className="flex items-center gap-2">
                  {item.kind === "maintenance" ? <Wrench className="h-3.5 w-3.5 text-gold" /> : <Megaphone className="h-3.5 w-3.5 text-blue" />}
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">{item.kind === "maintenance" ? "Maintenance" : "Update"}</span>
                  {!item.read && <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[9px] font-semibold text-accent">New</span>}
                </div>
                <h3 className="mt-1 text-sm font-semibold">{item.title}</h3>
                <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-muted">{item.message}</p>
                {item.scheduled_for && (
                  <p className="mt-2 flex items-center gap-1.5 text-[11px] text-gold">
                    <CalendarClock className="h-3.5 w-3.5" /> Planned for {formatDate(item.scheduled_for)}
                  </p>
                )}
                <p className="mt-2 text-[10px] text-muted">{formatDate(item.created_at)}</p>
              </article>
            ))}
          </div>

          {canPost && (
            <form onSubmit={submitAnnouncement} className="space-y-2 border-t border-line bg-background/50 p-3">
              <p className="text-xs font-semibold">Send a notice to everyone</p>
              <select value={kind} onChange={(event) => setKind(event.target.value as AnnouncementKind)} className="w-full rounded-md border border-line bg-panel px-2.5 py-2 text-xs">
                <option value="update">Site update</option>
                <option value="maintenance">Upcoming maintenance</option>
              </select>
              <input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={100} placeholder="Short title" className="w-full rounded-md border border-line bg-panel px-2.5 py-2 text-xs outline-none focus:border-accent" />
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} required maxLength={1500} rows={3} placeholder="What should everyone know?" className="w-full resize-y rounded-md border border-line bg-panel px-2.5 py-2 text-xs outline-none focus:border-accent" />
              {kind === "maintenance" && (
                <label className="block text-[10px] text-muted">
                  Planned time (your local time)
                  <input type="datetime-local" value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} className="mt-1 w-full rounded-md border border-line bg-panel px-2.5 py-2 text-xs text-foreground" />
                </label>
              )}
              {success && <p role="status" className="text-xs text-accent">{success}</p>}
              <button type="submit" disabled={sending || !title.trim() || !message.trim()} className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-xs font-bold text-[#171a11] disabled:opacity-50">
                <Send className="h-3.5 w-3.5" /> {sending ? "Publishing…" : "Publish to everyone"}
              </button>
            </form>
          )}

          {error && <p role="alert" className="border-t border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</p>}
          {!isSignedIn && <p className="border-t border-line px-3 py-2 text-[10px] text-muted">Sign in to track which notices you’ve read.</p>}
        </section>
      )}
    </div>
  );
}
