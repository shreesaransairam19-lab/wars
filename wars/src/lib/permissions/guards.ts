import { createAdminClient } from "@/lib/supabase/admin";

export type RoleName =
  | "owner"
  | "codester"
  | "admin"
  | "editor"
  | "manga_editor"
  | "anime_editor"
  | "moderator"
  | "reader"
  | "donator";

const ROLE_HIERARCHY: Record<RoleName, number> = {
  owner: 100,
  codester: 100,
  admin: 80,
  editor: 60,
  manga_editor: 60,
  anime_editor: 60,
  moderator: 40,
  reader: 20,
  donator: 10,
};

export async function getUserRoles(userId: string): Promise<RoleName[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", userId);

  if (!data) return [];
  const roleRows = data as {
    roles: { name: string } | { name: string }[] | null;
  }[];
  return roleRows.flatMap(({ roles }) =>
    (Array.isArray(roles) ? roles : roles ? [roles] : []).map(
      (role) => role.name as RoleName
    )
  );
}

export async function hasRole(
  userId: string,
  requiredRole: RoleName
): Promise<boolean> {
  const roles = await getUserRoles(userId);
  const minPriority = ROLE_HIERARCHY[requiredRole];
  return roles.some((role) => {
    if (requiredRole === "moderator" && ["manga_editor", "anime_editor"].includes(role)) return false;
    return ROLE_HIERARCHY[role] >= minPriority;
  });
}

// Exact role membership for features that should not inherit higher roles.
export async function hasAnyRole(
  userId: string,
  allowedRoles: readonly RoleName[]
): Promise<boolean> {
  const roles = await getUserRoles(userId);
  return roles.some((role) =>
    allowedRoles.includes(role) || (role === "codester" && allowedRoles.includes("owner"))
  );
}

const MANGA_CONTENT_TYPES = ["manga", "light_novel"] as const;
const ANIME_CONTENT_TYPES = ["anime", "anime_movie"] as const;
const ALL_CONTENT_TYPES = [...MANGA_CONTENT_TYPES, ...ANIME_CONTENT_TYPES] as const;

export async function getManageableContentTypes(userId: string): Promise<string[]> {
  const roles = await getUserRoles(userId);
  if (roles.some((role) => ["owner", "codester", "editor"].includes(role))) {
    return [...ALL_CONTENT_TYPES];
  }
  const types = new Set<string>();
  if (roles.includes("manga_editor")) MANGA_CONTENT_TYPES.forEach((type) => types.add(type));
  if (roles.includes("anime_editor")) ANIME_CONTENT_TYPES.forEach((type) => types.add(type));
  return [...types];
}

export async function canManageContentType(userId: string, contentType: string): Promise<boolean> {
  return (await getManageableContentTypes(userId)).includes(contentType);
}

export async function getSeriesContentType(seriesId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("series").select("content_type").eq("id", seriesId).maybeSingle();
  return data?.content_type ?? null;
}

export async function canManageSeries(userId: string, seriesId: string): Promise<boolean> {
  const contentType = await getSeriesContentType(seriesId);
  return Boolean(contentType && await canManageContentType(userId, contentType));
}

export async function getChapterContentType(chapterId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data: chapter } = await admin.from("chapters").select("series_id").eq("id", chapterId).maybeSingle();
  return chapter ? getSeriesContentType(chapter.series_id) : null;
}

export async function canManageChapter(userId: string, chapterId: string): Promise<boolean> {
  const contentType = await getChapterContentType(chapterId);
  return Boolean(contentType && await canManageContentType(userId, contentType));
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
