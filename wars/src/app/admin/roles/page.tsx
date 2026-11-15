"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { useAuth } from "@/features/auth/useAuth";
import { RoleBadge } from "@/components/auth/RoleBadge";

type Member = {
  id: string;
  username: string;
  display_name: string | null;
  roles: string[];
};

const assignableRoles = ["reader", "pre_member", "moderator", "manga_editor", "anime_editor", "editor", "admin", "codester", "donator"] as const;
type AssignableRole = (typeof assignableRoles)[number];

function roleLabel(role: AssignableRole) {
  if (role === "manga_editor") return "Manga Editor";
  if (role === "anime_editor") return "Anime Editor";
  if (role === "pre_member") return "Pre-Member";
  return role[0].toUpperCase() + role.slice(1);
}

export default function AdminRolesPage() {
  const { user, roles, loading: authLoading } = useAuth();
  const isOwner = roles.some((role) => ["owner", "codester"].includes(role));
  const [members, setMembers] = useState<Member[]>([]);
  const [selections, setSelections] = useState<Record<string, AssignableRole[]>>({});
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const loadMembers = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/admin/roles", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(data.error ?? "Could not load members");
      setLoading(false);
      return;
    }
    const nextMembers = (data.members ?? []) as Member[];
    setMembers(nextMembers);
    setSelections((current) => {
      const next = { ...current };
      for (const member of nextMembers) {
        const currentRoles = assignableRoles.filter((role) => member.roles.includes(role)).slice(0, 2);
        next[member.id] = currentRoles.length ? currentRoles : ["reader"];
      }
      return next;
    });
    setMessage("");
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user && isOwner) void loadMembers();
    else if (!authLoading) setLoading(false);
  }, [user, isOwner, authLoading, loadMembers]);

  const visibleMembers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return members;
    return members.filter((member) =>
      `${member.username} ${member.display_name ?? ""}`.toLowerCase().includes(normalized)
    );
  }, [members, query]);

  async function saveRole(memberId: string) {
    setSaving(memberId);
    setMessage("");
    const response = await fetch("/api/admin/roles", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: memberId, roles: selections[memberId] ?? ["reader"] }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(data.error ?? "Could not update this member");
      setSaving(null);
      return;
    }
    await loadMembers();
    setMessage("Member roles updated.");
    setSaving(null);
  }

  function selectRole(memberId: string, slot: 0 | 1, value: string) {
    setSelections((current) => {
      const selected = current[memberId] ?? ["reader"];
      const next = [...selected];
      if (slot === 0) {
        const primary = value as AssignableRole;
        if (next[1] === primary) next[1] = next[0];
        next[0] = primary;
      } else if (!value) {
        next.splice(1);
      } else {
        if (next[0] === value) return current;
        next[1] = value as AssignableRole;
      }
      return { ...current, [memberId]: next.slice(0, 2) as AssignableRole[] };
    });
  }

  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[1.5px] text-purple">Admin</span>
            <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight">Role Management</h1>
            <p className="mt-1 text-sm text-muted">Promote or demote members. The Owner and Codester can change member roles.</p>
          </div>
          <Link href="/admin/content" className="rounded-lg border border-line bg-panel px-3 py-2 text-sm text-muted hover:text-foreground">
            Content Management
          </Link>
        </div>

        {authLoading ? (
          <div className="mt-8 h-32 animate-pulse rounded-xl bg-panel2" />
        ) : !user || !isOwner ? (
          <div className="mt-8 rounded-xl border border-line bg-panel p-6 text-center">
            <h2 className="font-heading text-lg font-semibold">Owner access required</h2>
            <p className="mt-2 text-sm text-muted">Sign in with an Owner or Codester account to manage member roles.</p>
          </div>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-panel p-4">
              <div className="max-w-xl space-y-2 text-sm text-muted">
                <p>Assign up to two roles to one member. Codester has site-wide editing access like Owner, but moderation is view-only. Manga Editor manages manga and light novels; Anime Editor manages anime series and movies.</p>
                <p>Direct UPI payments cannot be verified automatically. Assign Donator only after checking the member’s cumulative payment confirmations reach $50 USD equivalent.</p>
              </div>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search username or display name"
                aria-label="Search members"
                className="w-full rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent sm:w-72"
              />
            </div>

            {message && <p className="mt-4 text-sm text-accent" role="status">{message}</p>}

            <section className="mt-4 overflow-hidden rounded-xl border border-line bg-panel" aria-label="Members">
              {loading ? (
                <div className="space-y-2 p-4">{[1, 2, 3].map((item) => <div key={item} className="h-14 animate-pulse rounded-lg bg-panel2" />)}</div>
              ) : visibleMembers.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted">No members found.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {visibleMembers.map((member) => {
                    const protectedOwner = member.roles.includes("owner");
                    return (
                    <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{member.display_name || member.username}</p>
                        <p className="truncate text-xs text-muted">@{member.username}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {member.roles.map((role) => <RoleBadge key={role} role={role} />)}
                        </div>
                      </div>
                      <div className="flex flex-1 flex-wrap items-end justify-end gap-2">
                        <label className="flex flex-col gap-1 text-[10px] font-semibold text-muted">
                          Primary role
                          <select
                            value={(selections[member.id] ?? ["reader"])[0] ?? "reader"}
                            onChange={(event) => selectRole(member.id, 0, event.target.value)}
                            disabled={protectedOwner}
                            className="min-w-36 rounded-lg border border-line bg-background px-3 py-2 text-sm text-foreground disabled:opacity-50"
                          >
                            {assignableRoles.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}
                          </select>
                        </label>
                        <label className="flex flex-col gap-1 text-[10px] font-semibold text-muted">
                          Second role
                          <select
                            value={(selections[member.id] ?? ["reader"])[1] ?? ""}
                            onChange={(event) => selectRole(member.id, 1, event.target.value)}
                            disabled={protectedOwner}
                            className="min-w-36 rounded-lg border border-line bg-background px-3 py-2 text-sm text-foreground disabled:opacity-50"
                          >
                            <option value="">No second role</option>
                            {assignableRoles.map((role) => <option key={role} value={role} disabled={role === (selections[member.id] ?? ["reader"])[0]}>{roleLabel(role)}</option>)}
                          </select>
                        </label>
                        <button
                          type="button"
                          onClick={() => void saveRole(member.id)}
                          disabled={saving === member.id || protectedOwner}
                          className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-[#171a11] disabled:opacity-50"
                        >
                          {protectedOwner ? "Protected" : saving === member.id ? "Saving…" : "Save"}
                        </button>
                      </div>
                    </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}
