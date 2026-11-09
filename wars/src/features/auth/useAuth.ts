"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_path: string | null;
  bio: string | null;
  theme: string;
}

interface UseAuthReturn {
  user: User | null;
  profile: Profile | null;
  roles: string[];
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const router = useRouter();

  const loadUser = useCallback(async (currentUser: User) => {
    const supabase = createClient();

    const [profileRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", currentUser.id).single(),
      supabase
        .from("user_roles")
        .select("roles(name)")
        .eq("user_id", currentUser.id),
    ]);

    setProfile(profileRes.data ?? null);
    const roleRows = (rolesRes.data ?? []) as {
      roles: { name: string } | { name: string }[] | null;
    }[];
    setRoles(
      roleRows.flatMap(({ roles }) =>
        (Array.isArray(roles) ? roles : roles ? [roles] : []).map(
          (role) => role.name
        )
      )
    );
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setRoles([]);
    router.push("/");
    router.refresh();
  }, [router]);

  const refreshProfile = useCallback(async () => {
    if (user) await loadUser(user);
  }, [user, loadUser]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    let mounted = true;

    supabase.auth.getUser().then(async ({ data: { user: initialUser } }) => {
      if (!mounted) return;
      if (initialUser) {
        setUser(initialUser);
        await loadUser(initialUser);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      const newUser = session?.user ?? null;
      setUser(newUser);
      if (newUser) {
        await loadUser(newUser);
      } else {
        setProfile(null);
        setRoles([]);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadUser]);

  return { user, profile, roles, loading, refreshProfile, signOut };
}
