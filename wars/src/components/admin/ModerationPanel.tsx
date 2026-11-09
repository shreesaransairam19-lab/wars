"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Room = { id: string; name: string; slug: string; parent_room_id: string | null };
type Mute = { room_id: string; muted_until: string; room?: Room };
type Member = {
  id: string;
  username: string;
  display_name: string | null;
  roles: string[];
  mute_count: number;
  ban: { reason: string; expires_at: string | null } | null;
  mutes: Mute[];
};
type Appeal = { id: string; user_id: string; content: string; created_at: string; profiles: { username: string; display_name: string | null } | { username: string; display_name: string | null }[] | null };

export function ModerationPanel() {
  const [members, setMembers] = useState<Member[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [permissions, setPermissions] = useState({ canMute: false, canBan: false, canReviewAppeals: false });
  const [query, setQuery] = useState("");
  const [roomId, setRoomId] = useState("");
  const [reason, setReason] = useState("");
  const [banDuration, setBanDuration] = useState("permanent");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/moderation", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error ?? "Could not load moderation tools");
      setLoading(false);
      return;
    }
    setMembers(data.members ?? []);
    setRooms(data.rooms ?? []);
    setAppeals(data.appeals ?? []);
    setPermissions(data.permissions ?? { canMute: false, canBan: false, canReviewAppeals: false });
    setRoomId((current) => current || data.rooms?.[0]?.id || "");
    setError("");
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const visibleMembers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return members;
    return members.filter((member) => `${member.username} ${member.display_name ?? ""}`.toLowerCase().includes(normalized));
  }, [members, query]);

  async function act(key: string, payload: Record<string, unknown>) {
    setBusy(key);
    setError("");
    setNotice("");
    const response = await fetch("/api/moderation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error ?? "Moderation action failed");
      setBusy("");
      return;
    }
    setNotice(data.banned ? "Fifth mute reached: the member is now banned." : "Moderation action saved.");
    await load();
    setBusy("");
  }

  return (
    <div className="mt-6 space-y-5">
      <section className="rounded-xl border border-line bg-panel p-4">
        <h2 className="font-heading text-base font-semibold">Chat rules</h2>
        <ul className="mt-2 grid gap-1 text-xs text-muted sm:grid-cols-2">
          <li>Each mute lasts 2 minutes.</li>
          <li>Five recorded mutes trigger a permanent ban.</li>
          <li>Recognized racial slurs trigger an immediate permanent ban.</li>
          <li>Permanent bans can be appealed; Admin or Owner reviews appeals.</li>
        </ul>
      </section>

      {error && <p className="rounded-lg border border-[#704044] bg-[#332329] px-3 py-2 text-sm text-[#ffb2b2]" role="alert">{error}</p>}
      {notice && <p className="rounded-lg border border-[#526d33] bg-[#222a1b] px-3 py-2 text-sm text-[#d5f98c]" role="status">{notice}</p>}

      {permissions.canReviewAppeals && (
        <section className="rounded-xl border border-line bg-panel p-4">
          <h2 className="font-heading text-base font-semibold">Ban appeals ({appeals.length})</h2>
          {appeals.length === 0 ? <p className="mt-2 text-sm text-muted">No pending appeals.</p> : (
            <ul className="mt-3 space-y-3">
              {appeals.map((appeal) => {
                const profile = Array.isArray(appeal.profiles) ? appeal.profiles[0] : appeal.profiles;
                return <li key={appeal.id} className="rounded-lg border border-line bg-background p-3">
                  <p className="text-xs font-semibold">{profile?.display_name || profile?.username || appeal.user_id}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{appeal.content}</p>
                  <div className="mt-3 flex gap-2">
                    <button type="button" disabled={Boolean(busy)} onClick={() => void act(`appeal:${appeal.id}`, { action: "review_appeal", appeal_id: appeal.id, decision: "approved" })} className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-[#171a11] disabled:opacity-50">Approve & unban</button>
                    <button type="button" disabled={Boolean(busy)} onClick={() => void act(`appeal:${appeal.id}`, { action: "review_appeal", appeal_id: appeal.id, decision: "rejected" })} className="rounded-lg border border-line px-3 py-1.5 text-xs disabled:opacity-50">Reject</button>
                  </div>
                </li>;
              })}
            </ul>
          )}
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-line bg-panel">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <div><h2 className="font-heading text-base font-semibold">Members</h2><p className="mt-1 text-xs text-muted">Mute a member in a chat room or ban them from all WARS chat.</p></div>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search members" aria-label="Search members" className="w-full rounded-lg border border-line bg-background px-3 py-2 text-sm sm:w-64" />
        </div>
        {(permissions.canMute || permissions.canBan) && <div className="flex flex-wrap items-center gap-2 border-b border-line bg-panel2 p-3">
          {permissions.canMute && <>
            <label className="text-xs text-muted" htmlFor="moderation-room">Mute room</label>
            <select id="moderation-room" value={roomId} onChange={(event) => setRoomId(event.target.value)} className="min-w-48 rounded-lg border border-line bg-background px-3 py-2 text-sm">
              {rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
            </select>
          </>}
          <input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} placeholder="Reason for action" className="min-w-52 flex-1 rounded-lg border border-line bg-background px-3 py-2 text-sm" />
          {permissions.canBan && <select value={banDuration} onChange={(event) => setBanDuration(event.target.value)} aria-label="Ban duration" className="rounded-lg border border-line bg-background px-3 py-2 text-sm"><option value="permanent">Permanent ban</option><option value="1440">1 day</option><option value="10080">7 days</option><option value="43200">30 days</option></select>}
        </div>}
        {loading ? <p className="p-6 text-sm text-muted">Loading members…</p> : visibleMembers.length === 0 ? <p className="p-6 text-center text-sm text-muted">No members match that search.</p> : (
          <ul className="divide-y divide-line">
            {visibleMembers.map((member) => (
              <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{member.display_name || member.username} <span className="font-normal text-muted">@{member.username}</span></p>
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-muted">{member.roles.join(" · ")} · {member.mute_count}/5 mutes</p>
                  {member.ban && <p className="mt-1 text-xs text-pink">Banned: {member.ban.reason}{member.ban.expires_at ? ` · until ${new Date(member.ban.expires_at).toLocaleString()}` : " · permanent"}</p>}
                  {member.mutes.map((mute) => <p key={mute.room_id} className="mt-1 text-xs text-gold">Muted in {mute.room?.name ?? "room"} until {new Date(mute.muted_until).toLocaleString()}</p>)}
                </div>
                <div className="flex flex-wrap gap-2">
                  {permissions.canMute && <button type="button" disabled={Boolean(busy) || !roomId || Boolean(member.ban)} onClick={() => void act(`mute:${member.id}`, { action: "mute", user_id: member.id, room_id: roomId, reason: reason || "Chat guidelines" })} className="rounded-lg border border-gold/50 px-3 py-2 text-xs font-semibold text-gold disabled:opacity-40">Mute 2 min</button>}
                  {permissions.canBan && (member.ban ? <button type="button" disabled={Boolean(busy)} onClick={() => void act(`unban:${member.id}`, { action: "unban", user_id: member.id, reason: reason || "Ban lifted by staff" })} className="rounded-lg border border-accent/50 px-3 py-2 text-xs font-semibold text-accent disabled:opacity-40">Unban</button> : <button type="button" disabled={Boolean(busy)} onClick={() => void act(`ban:${member.id}`, { action: "ban", user_id: member.id, duration_minutes: banDuration === "permanent" ? null : Number(banDuration), reason: reason || "Chat guidelines" })} className="rounded-lg border border-pink/50 px-3 py-2 text-xs font-semibold text-pink disabled:opacity-40">Ban</button>)}
                  {permissions.canMute && member.mutes.some((mute) => mute.room_id === roomId) && <button type="button" disabled={Boolean(busy) || !roomId} onClick={() => void act(`unmute:${member.id}`, { action: "unmute", user_id: member.id, room_id: roomId, reason: reason || "Mute removed" })} className="rounded-lg border border-line px-3 py-2 text-xs text-muted disabled:opacity-40">Unmute in selected room</button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
