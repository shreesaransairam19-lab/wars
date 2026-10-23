"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loginSchema, registerSchema } from "@/lib/validation/auth";
import {
  checkRateLimit,
  RATE_LIMITS,
  getClientIp,
} from "@/lib/security/rate-limit";

export type AuthActionResult = {
  success: boolean;
  error?: string;
};

export async function login(
  _prev: AuthActionResult,
  formData: FormData
): Promise<AuthActionResult> {
  const ip = getClientIp(new Request("http://localhost"));
  const rateKey = `login:${ip}`;
  const rate = checkRateLimit(
    rateKey,
    RATE_LIMITS.login.max,
    RATE_LIMITS.login.windowMs
  );
  if (!rate.allowed) {
    return { success: false, error: "Too many attempts. Try again shortly." };
  }

  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const supabase = await createClient();

  // Username/password: Supabase Auth uses email. We'll use a synthetic email.
  const email = `${parsed.data.username}@wars.local`;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });

  if (error) {
    return { success: false, error: "Invalid username or password" };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function register(
  _prev: AuthActionResult,
  formData: FormData
): Promise<AuthActionResult> {
  const ip = getClientIp(new Request("http://localhost"));
  const rateKey = `register:${ip}`;
  const rate = checkRateLimit(
    rateKey,
    RATE_LIMITS.register.max,
    RATE_LIMITS.register.windowMs
  );
  if (!rate.allowed) {
    return { success: false, error: "Too many attempts. Try again shortly." };
  }

  const parsed = registerSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
    display_name: formData.get("display_name") || undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  // Check username uniqueness using admin client (bypasses RLS for lookup)
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("username", parsed.data.username)
    .maybeSingle();

  if (existing) {
    return { success: false, error: "Username already taken" };
  }

  const supabase = await createClient();
  const email = `${parsed.data.username}@wars.local`;

  const { error } = await supabase.auth.signUp({
    email,
    password: parsed.data.password,
    options: {
      data: {
        username: parsed.data.username,
        display_name: parsed.data.display_name ?? parsed.data.username,
      },
    },
  });

  if (error) {
    if (error.message.includes("already registered")) {
      return { success: false, error: "Username already taken" };
    }
    return { success: false, error: "Could not create account" };
  }

  // Assign default reader role
  const { data: userId } = await admin
    .from("profiles")
    .select("id")
    .eq("username", parsed.data.username)
    .single();

  if (userId) {
    const { data: readerRole } = await admin
      .from("roles")
      .select("id")
      .eq("name", "reader")
      .single();

    if (readerRole) {
      await admin.from("user_roles").insert({
        user_id: userId.id,
        role_id: readerRole.id,
      });
    }
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile() {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data;
}

export async function getProfileRoles(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", userId);

  if (!data) return [];
  return data.flatMap(
    (ur: { roles: { name: string }[] }) => ur.roles.map((r) => r.name)
  );
}
