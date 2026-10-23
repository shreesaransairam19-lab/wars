"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { User, LogOut, Shield } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";

export function UserMenu() {
  const { user, profile, roles, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="h-9 w-24 animate-pulse rounded-[9px] bg-panel2" aria-hidden />
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-[9px] border border-line bg-panel2 px-4 py-2 text-xs font-bold text-foreground transition-colors hover:border-accent hover:text-accent"
      >
        Sign in
      </Link>
    );
  }

  const displayName =
    profile?.display_name || profile?.username || user.email || "User";
  const initials = displayName.slice(0, 2).toUpperCase();
  const isStaff = roles.some((r) =>
    ["owner", "admin", "editor", "moderator"].includes(r)
  );

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-[9px] border border-line bg-panel2 px-3 py-1.5 transition-colors hover:border-accent"
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <div className="grid h-7 w-7 place-items-center rounded-full bg-[#664d83] text-[10px] font-bold text-white">
          {initials}
        </div>
        <span className="hidden max-w-[100px] truncate text-xs font-semibold text-foreground md:block">
          {displayName}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-line bg-panel p-2 shadow-[0_10px_35px_rgba(0,0,0,0.4)]">
          <div className="border-b border-line px-3 py-2">
            <p className="truncate text-sm font-semibold text-foreground">
              {displayName}
            </p>
            <p className="text-[11px] text-muted">@{profile?.username}</p>
            {roles.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {roles.map((role) => (
                  <span
                    key={role}
                    className="rounded-full border border-[#514f5b] bg-[#302f38] px-2 py-0.5 text-[9px] font-bold text-[#d1ced8]"
                  >
                    {role}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-1 flex flex-col">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-panel2 hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              <User className="h-4 w-4" />
              Dashboard
            </Link>

            {isStaff && (
              <Link
                href="/admin"
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-panel2 hover:text-foreground"
                onClick={() => setOpen(false)}
              >
                <Shield className="h-4 w-4" />
                Admin
              </Link>
            )}

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                signOut();
              }}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[#ffb2b2] transition-colors hover:bg-[#332329]"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
