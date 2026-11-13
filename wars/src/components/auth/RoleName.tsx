const roleNameStyles: Record<string, string> = {
  owner: "role-name-glitter role-name-glitter--owner",
  codester: "role-name-glitter role-name-glitter--codester",
  editor: "text-emerald-300",
  manga_editor: "role-name-flame role-name-flame--manga",
  anime_editor: "role-name-flame role-name-flame--anime",
  admin: "text-red-300",
  moderator: "text-yellow-200",
  donator: "role-name-glitter role-name-glitter--donator",
  reader: "text-white",
};

const rolePriority = ["owner", "codester", "admin", "editor", "manga_editor", "anime_editor", "moderator", "donator", "reader"];

export function getPrimaryRole(roles: readonly string[]): string | null {
  const normalized = roles.map((role) => role.trim().toLowerCase());
  return rolePriority.find((role) => normalized.includes(role)) ?? normalized[0] ?? null;
}

export function RoleName({
  role,
  children,
  className = "",
}: {
  role?: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  const normalized = role?.trim().toLowerCase() ?? "";
  const color = roleNameStyles[normalized] ?? "text-foreground";

  return <span className={`${color} ${className}`.trim()}>{children}</span>;
}
