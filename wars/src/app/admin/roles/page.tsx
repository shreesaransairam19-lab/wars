"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { useAuth } from "@/features/auth/useAuth";

type Member = {
  id: string;
  username: string;
  display_name: string | null;
  roles: string[];
};

const assignableRoles = ["reader", "moderator", "editor", "admin", "donator"] as const;
type AssignableRole = (typeof assignableRoles)[number];

export default function AdminRolesPage() {
  const { user, roles, loading: authLoading } = useAuth();
  const isOwner = roles.includes("owner");
  const [members, setMembers] = useState<Member[]>([]);
  const [selections, setSelections] = useState<Record<string, AssignableRole>>({});
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
        const currentRole = assignableRoles.find((role) => member.roles.includes(role));
        next[member.id] = currentRole ?? "reader";
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
      body: JSON.stringify({ userId: memberId, role: selections[memberId] ?? "reader" }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(data.error ?? "Could not update this member");
      setSaving(null);
      return;
    }
    await loadMembers();
    setMessage("Member role updated.");
    setSaving(null);
  }

  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[1.5px] text-purple">Admin</span>
            <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight">Role Management</h1>
            <p className="mt-1 text-sm text-muted">Promote or demote members. Only the Owner can change roles.</p>
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
            <p className="mt-2 text-sm text-muted">Sign in with an Owner account to manage member roles.</p>
          </div>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-panel p-4">
              <p className="max-w-xl text-sm text-muted">Direct UPI payments cannot be verified automatically. Assign Donator only after checking the member’s cumulative payment confirmations reach $50 USD equivalent.</p>
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
                          {member.roles.map((role) => (
                            <span key={role} className="rounded-full border border-line px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">{role}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="sr-only" htmlFor={`role-${member.id}`}>Role for {member.username}</label>
                        <select
                          id={`role-${member.id}`}
                          value={selections[member.id] ?? "reader"}
                          onChange={(event) => setSelections((current) => ({ ...current, [member.id]: event.target.value as AssignableRole }))}
                          disabled={protectedOwner}
                          className="rounded-lg border border-line bg-background px-3 py-2 text-sm"
                        >
                          {assignableRoles.map((role) => <option key={role} value={role}>{role[0].toUpperCase() + role.slice(1)}</option>)}
                        </select>
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
