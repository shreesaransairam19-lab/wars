import type { ReactNode } from "react";

const roleNameStyles: Record<string, string> = {
  owner: "role-name-glitter role-name-glitter--owner",
  editor: "text-emerald-300",
  admin: "text-red-300",
  moderator: "text-yellow-200",
  donator: "role-name-glitter role-name-glitter--donator",
  reader: "text-white",
};

export function RoleName({
  role,
  children,
  className = "",
}: {
  role?: string | null;
  children: ReactNode;
  className?: string;
}) {
  const normalized = role?.trim().toLowerCase() ?? "";
  const color = roleNameStyles[normalized] ?? "text-foreground";

  return <span className={`${color} ${className}`.trim()}>{children}</span>;
}
