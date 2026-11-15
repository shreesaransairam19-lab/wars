import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, MessageCircle, Star, Trophy, Users } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { FollowButton } from "@/components/profile/FollowButton";
import { FriendRequestButton } from "@/components/profile/FriendRequestButton";
import { MessageMemberButton } from "@/components/profile/MessageMemberButton";
import { ProfileAvatar } from "@/components/auth/ProfileAvatar";
import { RoleBadge } from "@/components/auth/RoleBadge";
import { getPrimaryRole } from "@/components/auth/RoleName";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getUserRoles } from "@/lib/permissions/guards";
import { getLevelProgress, getRank, getXpForLevel, XP_REWARDS } from "@/lib/xp/calculate";

const XP_PAGE_SIZE = 1000;

async function readXp(userId: string) {
  const admin = createAdminClient();
  const rows: { amount: number; reason: string }[] = [];
  for (let offset = 0; ; offset += XP_PAGE_SIZE) {
    const { data, error } = await admin
      .from("xp_ledger")
      .select("amount,reason")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + XP_PAGE_SIZE - 1);
    if (error) return null;
    rows.push(...(data ?? []));
    if ((data ?? []).length < XP_PAGE_SIZE) break;
  }
  return rows;
}

export default async function MemberDashboardPage({ params }: { params: Promise<{ username: string }> }) {
  const { username: rawUsername } = await params;
  if (!/^[a-zA-Z0-9_-]{3,30}$/.test(rawUsername)) notFound();

  const supabase = await createClient();
  const { data: { user: viewer } } = await supabase.auth.getUser();
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id,username,display_name,avatar_path,bio,created_at")
    .ilike("username", rawUsername)
    .maybeSingle();
  if (!profile) notFound();

  const [roles, equipped, followerResult, followingResult, ownFollowResult, chaptersResult, reviewsResult, chatResult, xpRows] = await Promise.all([
    getUserRoles(profile.id),
    admin.from("profile_frame_equipped").select("frame_id").eq("user_id", profile.id).maybeSingle(),
    admin.from("user_follows").select("follower_id", { count: "exact", head: true }).eq("followed_id", profile.id),
    admin.from("user_follows").select("followed_id", { count: "exact", head: true }).eq("follower_id", profile.id),
    viewer && viewer.id !== profile.id
      ? admin.from("user_follows").select("follower_id").eq("follower_id", viewer.id).eq("followed_id", profile.id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    admin.from("reading_progress").select("chapter_id", { count: "exact", head: true }).eq("user_id", profile.id).eq("completed", true),
    admin.from("reviews").select("id", { count: "exact", head: true }).eq("user_id", profile.id).neq("status", "removed"),
    admin.from("chat_messages").select("id", { count: "exact", head: true }).eq("sender_id", profile.id).eq("is_deleted", false),
    readXp(profile.id),
  ]);

  const roleNames = roles as string[];
  const primaryRole = getPrimaryRole(roleNames);
  const chaptersRead = chaptersResult.count ?? 0;
  const xpTotal = xpRows
    ? xpRows.filter((row) => row.reason !== "read_chapter").reduce((sum, row) => sum + (row.amount ?? 0), 0)
      + Math.max(
        xpRows.filter((row) => row.reason === "read_chapter").reduce((sum, row) => sum + (row.amount ?? 0), 0),
        chaptersRead * XP_REWARDS.read_chapter
      )
    : 0;
  const totalXp = roleNames.includes("owner") ? Math.max(xpTotal, getXpForLevel(100)) : xpTotal;
  const levelInfo = getLevelProgress(totalXp);
  const stats = [
    { label: "Chapters read", value: chaptersResult.count ?? 0, icon: BookOpen },
    { label: "Reviews posted", value: reviewsResult.count ?? 0, icon: Star },
    { label: "Chat messages", value: chatResult.count ?? 0, icon: MessageCircle },
    { label: "Followers", value: followerResult.count ?? 0, icon: Users },
  ];
  const followAvailable = !followerResult.error && !followingResult.error && !ownFollowResult.error;
  const displayName = profile.display_name || profile.username;
  const isOwnProfile = viewer?.id === profile.id;

  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6 lg:px-10">
        <Link href="/chat" className="mb-6 inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to chat</Link>
        <section className="rounded-2xl border border-line bg-panel p-5 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex min-w-0 items-center gap-5">
              <ProfileAvatar userId={profile.id} avatarPath={profile.avatar_path} name={displayName} role={primaryRole} frameId={equipped.data?.frame_id} size={72} />
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[1.5px] text-accent">WARS member dashboard</p>
                <h1 className="mt-1 truncate font-heading text-2xl font-semibold">{displayName}</h1>
                <p className="text-sm text-muted">@{profile.username}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">{roleNames.map((role) => <RoleBadge key={role} role={role} />)}</div>
              </div>
            </div>
            <div className="flex flex-wrap items-start gap-3">
              <MessageMemberButton
                username={profile.username}
                canReceivePrivateMessages={!roleNames.some((role) => ["owner", "codester", "admin", "editor", "manga_editor", "anime_editor"].includes(role))}
                isSignedIn={Boolean(viewer)}
                isOwnProfile={isOwnProfile}
              />
              <FollowButton
                targetUserId={profile.id}
                username={profile.username}
                isSignedIn={Boolean(viewer)}
                isOwnProfile={isOwnProfile}
                initialFollowing={Boolean(ownFollowResult.data)}
                initialFollowerCount={followerResult.count ?? 0}
                available={followAvailable}
              />
              <FriendRequestButton
                targetUserId={profile.id}
                username={profile.username}
                isSignedIn={Boolean(viewer)}
                isOwnProfile={isOwnProfile}
              />
            </div>
          </div>
          {profile.bio && <p className="mt-6 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-muted">{profile.bio}</p>}
        </section>

        <section className="mt-6 rounded-2xl border border-line bg-panel p-5 md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[1.5px] text-accent">Level {levelInfo.currentLevel}</p>
              <h2 className="mt-1 font-heading text-xl font-semibold">{getRank(levelInfo.currentLevel)}</h2>
              <p className="mt-1 text-xs text-muted">{totalXp.toLocaleString()} total XP</p>
            </div>
            <Trophy className="h-8 w-8 text-gold" />
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#38383f]"><div className="h-full rounded-full bg-accent" style={{ width: `${levelInfo.progress * 100}%` }} /></div>
          <p className="mt-2 text-xs text-muted">{levelInfo.currentLevel >= 100 ? "Level cap reached" : `${levelInfo.currentLevelXp} / ${levelInfo.nextLevelXp} XP to next level`}</p>
        </section>

        <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center gap-3 rounded-xl border border-line bg-panel p-4">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-panel2"><Icon className="h-4 w-4 text-accent" /></div>
              <div><p className="text-lg font-semibold">{value.toLocaleString()}</p><p className="text-[11px] text-muted">{label}</p></div>
            </div>
          ))}
        </section>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-line bg-panel p-4"><p className="text-lg font-semibold">{followingResult.count ?? 0}</p><p className="text-[11px] text-muted">Following</p></div>
          <div className="rounded-xl border border-line bg-panel p-4"><p className="text-lg font-semibold">{new Date(profile.created_at).toLocaleDateString()}</p><p className="text-[11px] text-muted">Member since</p></div>
        </div>
      </main>
    </>
  );
}
