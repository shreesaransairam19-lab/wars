const roleStyles: Record<string, string> = {
  owner: "border-cyan-300/60 bg-cyan-400/10 text-cyan-100 shadow-[0_0_10px_rgba(34,211,238,0.24)]",
  codester: "border-amber-300/70 bg-amber-400/10 text-amber-100 shadow-[0_0_12px_rgba(251,191,36,0.32)]",
  editor: "border-emerald-400/50 bg-emerald-500/10 text-emerald-300",
  manga_editor: "border-orange-900/80 bg-slate-950 text-orange-300 shadow-[0_0_12px_rgba(124,45,18,0.55)]",
  anime_editor: "border-purple-400/60 bg-purple-500/10 text-purple-200 shadow-[0_0_10px_rgba(168,85,247,0.3)]",
  admin: "border-red-400/50 bg-red-500/10 text-red-300",
  moderator: "border-yellow-300/50 bg-yellow-400/10 text-yellow-200",
  donator: "border-rose-400/70 bg-rose-500/10 text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.3)]",
  reader: "border-white/30 bg-white/5 text-white",
};

export function RoleBadge({ role }: { role: string }) {
  const normalized = role.toLowerCase();
  const glitter = ["owner", "codester", "donator"].includes(normalized);
  const label = normalized === "moderator" ? "Chat/Room Mod"
    : normalized === "manga_editor" ? "Manga Editor"
      : normalized === "anime_editor" ? "Anime Editor"
        : role;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${roleStyles[normalized] ?? roleStyles.reader} ${glitter ? `role-badge-glitter role-badge-glitter--${normalized}` : ""}`}
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
      {glitter && normalized !== "donator" && <span className="ml-1 text-[8px]" aria-hidden="true">✦</span>}
      {normalized === "donator" && <span className="ml-1 text-[8px]" aria-hidden="true">🔥</span>}
      {!glitter && ["manga_editor", "anime_editor"].includes(normalized) && <span className="ml-1 text-[8px]" aria-hidden="true">🔥</span>}
    </span>
  );
}
