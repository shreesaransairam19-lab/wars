const roleStyles: Record<string, string> = {
  owner: "border-cyan-300/60 bg-cyan-400/10 text-cyan-100 shadow-[0_0_10px_rgba(34,211,238,0.24)]",
  editor: "border-emerald-400/50 bg-emerald-500/10 text-emerald-300",
  admin: "border-red-400/50 bg-red-500/10 text-red-300",
  moderator: "border-yellow-300/50 bg-yellow-400/10 text-yellow-200",
  donator: "border-amber-300/60 bg-amber-400/10 text-amber-100 shadow-[0_0_10px_rgba(251,191,36,0.2)]",
  reader: "border-white/30 bg-white/5 text-white",
};

export function RoleBadge({ role }: { role: string }) {
  const normalized = role.toLowerCase();
  const glitter = normalized === "owner" || normalized === "donator";
  const label = normalized === "moderator" ? "Chat/Room Mod" : role;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${roleStyles[normalized] ?? roleStyles.reader} ${glitter ? "role-badge-glitter" : ""}`}
    >
      <span
        className={
          glitter
            ? `role-badge-glitter-text role-badge-glitter-text--${normalized}`
            : ""
        }
      >
        {label}
      </span>
      {glitter && <span className="ml-1 text-[8px]" aria-hidden="true">✦</span>}
    </span>
  );
}
