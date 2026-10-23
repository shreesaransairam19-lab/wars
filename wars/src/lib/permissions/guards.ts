import { createClient } from "@/lib/supabase/server";

export type RoleName =
  | "owner"
  | "admin"
  | "editor"
  | "moderator"
  | "reader"
  | "donator";

const ROLE_HIERARCHY: Record<RoleName, number> = {
  owner: 100,
  admin: 80,
  editor: 60,
  moderator: 40,
  reader: 20,
  donator: 10,
};

export async function getUserRoles(userId: string): Promise<RoleName[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", userId);

  if (!data) return [];
  return data.flatMap(
    (ur: { roles: { name: string }[] }) =>
      ur.roles.map((r) => r.name as RoleName)
  );
}

export async function hasRole(
  userId: string,
  requiredRole: RoleName
): Promise<boolean> {
  const roles = await getUserRoles(userId);
  const minPriority = ROLE_HIERARCHY[requiredRole];
  return roles.some((role) => ROLE_HIERARCHY[role] >= minPriority);
}

export async function getUserHighestRole(
  userId: string
): Promise<RoleName | null> {
  const roles = await getUserRoles(userId);
  if (roles.length === 0) return null;
  return roles.reduce((highest, role) =>
    ROLE_HIERARCHY[role] > ROLE_HIERARCHY[highest] ? role : highest
  );
}

export function roleAtLeast(actual: RoleName, required: RoleName): boolean {
  return ROLE_HIERARCHY[actual] >= ROLE_HIERARCHY[required];
}

export { ROLE_HIERARCHY };
