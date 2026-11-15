import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasAnyRole } from "@/lib/permissions/guards";

const MANAGED_ROLES = ["reader", "pre_member", "moderator", "manga_editor", "anime_editor", "editor", "admin", "codester", "donator"] as const;
type ManagedRole = (typeof MANAGED_ROLES)[number];

const NEW_ROLE_DEFAULTS: Partial<Record<ManagedRole, { description: string; priority: number }>> = {
  codester: { description: "Owner-equivalent access across the WARS website", priority: 100 },
  manga_editor: { description: "Create and manage manga and light novel content only", priority: 60 },
  anime_editor: { description: "Create and manage anime series and movie content only", priority: 60 },
  pre_member: { description: "Pre-member community status with reader-level access", priority: 20 },
};

async function getOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: "Sign in required" }, { status: 401 }),
    };
  }
  if (!(await hasAnyRole(user.id, ["owner"]))) {
    return {
      user: null,
      response: NextResponse.json({ error: "Owner permissions required" }, { status: 403 }),
    };
  }
  return { user, response: null };
}

export async function GET() {
  const { user, response } = await getOwner();
  if (response) return response;
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const admin = createAdminClient();
  const [{ data: profiles, error: profilesError }, { data: assignments, error: rolesError }] = await Promise.all([
    admin.from("profiles").select("id, username, display_name").order("username").limit(1000),
    admin.from("user_roles").select("user_id, roles(name)").limit(5000),
  ]);

  if (profilesError || rolesError) {
    return NextResponse.json({ error: "Could not load members" }, { status: 500 });
  }

  const rolesByUser = new Map<string, string[]>();
  for (const assignment of assignments ?? []) {
    const relation = assignment.roles;
    const related = Array.isArray(relation) ? relation : relation ? [relation] : [];
    const userRoles = rolesByUser.get(assignment.user_id) ?? [];
    userRoles.push(...related.map((role) => role.name.toLowerCase()));
    rolesByUser.set(assignment.user_id, userRoles);
  }

  return NextResponse.json({
    members: (profiles ?? []).map((profile) => ({
      ...profile,
      roles: rolesByUser.get(profile.id) ?? [],
    })),
    manageableRoles: MANAGED_ROLES,
  }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PUT(request: Request) {
  const { user, response } = await getOwner();
  if (response) return response;
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { userId, roles: requestedRoles, role: legacyRole } = body as {
    userId?: unknown;
    roles?: unknown;
    role?: unknown;
  };
  if (typeof userId !== "string" || !/^[0-9a-f-]{36}$/i.test(userId)) {
    return NextResponse.json({ error: "Select a valid member" }, { status: 400 });
  }
  const selectedRoles = [...new Set(
    Array.isArray(requestedRoles) ? requestedRoles : typeof legacyRole === "string" ? [legacyRole] : []
  )] as string[];
  if (
    selectedRoles.length < 1 ||
    selectedRoles.length > 2 ||
    selectedRoles.some((role) => typeof role !== "string" || !MANAGED_ROLES.includes(role as ManagedRole))
  ) return NextResponse.json({ error: "Choose one or more valid roles" }, { status: 400 });
  const validRoles = selectedRoles as ManagedRole[];

  const admin = createAdminClient();
  const { data: targetRoles, error: targetError } = await admin
    .from("user_roles")
    .select("role_id, roles(name)")
    .eq("user_id", userId);
  if (targetError) return NextResponse.json({ error: "Could not load member roles" }, { status: 500 });

  const isTargetOwner = (targetRoles ?? []).some((assignment) => {
    const relation = assignment.roles;
    const related = Array.isArray(relation) ? relation : relation ? [relation] : [];
    return related.some((item) => item.name.toLowerCase() === "owner");
  });
  if (isTargetOwner) {
    return NextResponse.json({ error: "Owner accounts cannot be changed on this page" }, { status: 400 });
  }

  const selectedRoleIds = new Set<string>();
  for (const role of validRoles) {
    const roleDefaults = NEW_ROLE_DEFAULTS[role];
    const roleQuery = roleDefaults
      ? admin.from("roles").upsert({ name: role, ...roleDefaults }, { onConflict: "name" }).select("id").single()
      : admin.from("roles").select("id").eq("name", role).single();
    const { data: selectedRole, error: selectedError } = await roleQuery;
    if (selectedError || !selectedRole) {
      return NextResponse.json({ error: `Role ${role} is not configured` }, { status: 500 });
    }
    selectedRoleIds.add(selectedRole.id);
    const { error: assignError } = await admin.from("user_roles").upsert({
      user_id: userId,
      role_id: selectedRole.id,
      assigned_by: user.id,
    }, { onConflict: "user_id,role_id", ignoreDuplicates: true });
    if (assignError) return NextResponse.json({ error: "Could not assign all selected roles" }, { status: 500 });
  }

  const currentRoleIds = (targetRoles ?? []).flatMap((assignment) => {
    const relation = assignment.roles;
    const related = Array.isArray(relation) ? relation : relation ? [relation] : [];
    return related.some((item) => MANAGED_ROLES.includes(item.name.toLowerCase() as ManagedRole))
      ? [assignment.role_id]
      : [];
  });
  const obsoleteRoleIds = [...new Set(currentRoleIds)].filter((id) => !selectedRoleIds.has(id));
  if (obsoleteRoleIds.length) {
    const { error: removeError } = await admin.from("user_roles").delete().eq("user_id", userId).in("role_id", obsoleteRoleIds);
    if (removeError) return NextResponse.json({ error: "Selected roles were assigned but previous roles could not be removed" }, { status: 500 });
  }

  return NextResponse.json({ success: true, roles: validRoles });
}
