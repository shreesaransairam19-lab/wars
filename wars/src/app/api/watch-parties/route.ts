import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const createSchema = z.object({ action: z.literal("create"), chapterId: z.string().uuid(), friendIds: z.array(z.string().uuid()).min(1).max(10) });
const respondSchema = z.object({ action: z.literal("accept").or(z.literal("decline")), partyId: z.string().uuid() });
const closeSchema = z.object({ action: z.literal("close"), partyId: z.string().uuid() });

async function signedInUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

function missingMigration(error: { code?: string } | null) {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

function migrationError() {
  return NextResponse.json({ error: "Watch parties need the latest WARS social-features database migration." }, { status: 503 });
}

async function episodeCatalog(admin: ReturnType<typeof createAdminClient>) {
  const { data: series, error: seriesError } = await admin.from("series").select("id,title,slug").in("content_type", ["anime", "anime_movie"]).eq("status", "published");
  if (seriesError || !series?.length) return { episodes: [], error: seriesError };
  const seriesById = new Map(series.map((row) => [row.id, row]));
  const { data: episodes, error: episodeError } = await admin.from("chapters").select("id,title,slug,chapter_number,series_id").in("series_id", [...seriesById.keys()]).eq("status", "published").order("chapter_number");
  if (episodeError || !episodes?.length) return { episodes: [], error: episodeError };
  const episodeIds = episodes.map((episode) => episode.id);
  const { data: assets, error: assetError } = await admin.from("chapter_assets").select("chapter_id,storage_path,mime_type,external_url").in("chapter_id", episodeIds).in("mime_type", ["video/mp4", "video/webm"]);
  if (assetError) return { episodes: [], error: assetError };
  const assetByEpisode = new Map((assets ?? []).map((asset) => [asset.chapter_id, asset]));
  const playable = episodes.flatMap((episode) => {
    const asset = assetByEpisode.get(episode.id);
    if (!asset) return [];
    if (!asset.external_url && !asset.storage_path) return [];
    return [{ ...episode, series: seriesById.get(episode.series_id) ?? null }];
  });
  return { episodes: playable, error: null };
}

async function partySummaries(admin: ReturnType<typeof createAdminClient>, partyIds: string[], membershipByParty: Map<string, string>) {
  if (!partyIds.length) return [];
  const { data: parties, error } = await admin.from("watch_parties").select("id,host_id,chapter_id,created_at,closed_at").in("id", partyIds).is("closed_at", null).order("created_at", { ascending: false });
  if (error || !parties?.length) return [];
  const chapterIds = [...new Set(parties.map((party) => party.chapter_id))];
  const hostIds = [...new Set(parties.map((party) => party.host_id))];
  const [{ data: chapters }, { data: profiles }] = await Promise.all([
    admin.from("chapters").select("id,title,slug,chapter_number,series_id").in("id", chapterIds),
    admin.from("profiles").select("id,username,display_name").in("id", hostIds),
  ]);
  const seriesIds = [...new Set((chapters ?? []).map((chapter) => chapter.series_id))];
  const { data: series } = seriesIds.length ? await admin.from("series").select("id,title,slug").in("id", seriesIds) : { data: [], error: null };
  const episodeById = new Map((chapters ?? []).map((chapter) => [chapter.id, { ...chapter, series: (series ?? []).find((item) => item.id === chapter.series_id) ?? null }]));
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  return parties.map((party) => ({ ...party, membershipStatus: membershipByParty.get(party.id) ?? "accepted", episode: episodeById.get(party.chapter_id) ?? null, host: profileById.get(party.host_id) ?? null }));
}

export async function GET() {
  const user = await signedInUser();
  if (!user) return NextResponse.json({ error: "Sign in to use Watch Parties." }, { status: 401 });
  const admin = createAdminClient();
  const [friendResult, memberResult, catalogResult] = await Promise.all([
    admin.from("friend_requests").select("requester_id,addressee_id").or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`).eq("status", "accepted"),
    admin.from("watch_party_members").select("party_id,status").eq("user_id", user.id),
    episodeCatalog(admin),
  ]);
  if (missingMigration(friendResult.error) || missingMigration(memberResult.error)) return migrationError();
  if (friendResult.error || memberResult.error || catalogResult.error) return NextResponse.json({ error: "Could not load Watch Parties." }, { status: 500 });
  const friendIds = [...new Set((friendResult.data ?? []).map((row) => row.requester_id === user.id ? row.addressee_id : row.requester_id))];
  const { data: friends, error: friendsError } = friendIds.length
    ? await admin.from("profiles").select("id,username,display_name,avatar_path").in("id", friendIds).order("username")
    : { data: [], error: null };
  if (friendsError) return NextResponse.json({ error: "Could not load friends." }, { status: 500 });
  const membershipByParty = new Map((memberResult.data ?? []).map((row) => [row.party_id, row.status]));
  const partyIds = [...membershipByParty.keys()];
  const summaries = await partySummaries(admin, partyIds, membershipByParty);
  return NextResponse.json({ friends: friends ?? [], episodes: catalogResult.episodes, invitations: summaries.filter((party) => party.membershipStatus === "invited"), parties: summaries.filter((party) => party.membershipStatus === "accepted") }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

export async function POST(request: Request) {
  const user = await signedInUser();
  if (!user) return NextResponse.json({ error: "Sign in to create a Watch Party." }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  const admin = createAdminClient();
  const create = createSchema.safeParse(body);
  if (create.success) {
    const friendIds = [...new Set(create.data.friendIds)].filter((id) => id !== user.id);
    if (!friendIds.length) return NextResponse.json({ error: "Choose at least one friend to invite." }, { status: 400 });
    const { data: friendships, error: friendError } = await admin.from("friend_requests").select("requester_id,addressee_id").or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`).eq("status", "accepted");
    if (missingMigration(friendError)) return migrationError();
    if (friendError) return NextResponse.json({ error: "Could not verify your friends." }, { status: 500 });
    const acceptedIds = new Set((friendships ?? []).map((row) => row.requester_id === user.id ? row.addressee_id : row.requester_id));
    if (friendIds.some((id) => !acceptedIds.has(id))) return NextResponse.json({ error: "Watch Party invites can only go to accepted friends." }, { status: 403 });

    const { data: chapter, error: chapterError } = await admin.from("chapters").select("id,series_id,status").eq("id", create.data.chapterId).eq("status", "published").maybeSingle();
    if (chapterError) return NextResponse.json({ error: "Could not load this anime episode." }, { status: 500 });
    if (!chapter) return NextResponse.json({ error: "Choose a published WARS episode." }, { status: 404 });
    const { data: series, error: seriesError } = await admin.from("series").select("content_type").eq("id", chapter.series_id).maybeSingle();
    if (seriesError || !series || !["anime", "anime_movie"].includes(series.content_type)) return NextResponse.json({ error: "Watch Parties are for Anime Library episodes and movies." }, { status: 400 });
    const { data: video, error: videoError } = await admin.from("chapter_assets").select("id").eq("chapter_id", chapter.id).in("mime_type", ["video/mp4", "video/webm"]).limit(1).maybeSingle();
    if (videoError || !video) return NextResponse.json({ error: "This episode needs a directly playable MP4/WebM video for synchronized playback." }, { status: 400 });

    const { data: party, error: partyError } = await admin.from("watch_parties").insert({ host_id: user.id, chapter_id: chapter.id }).select("id").single();
    if (partyError || !party) return NextResponse.json({ error: "Could not create Watch Party." }, { status: 500 });
    const members = [{ party_id: party.id, user_id: user.id, status: "accepted" }, ...friendIds.map((friendId) => ({ party_id: party.id, user_id: friendId, status: "invited" }))];
    const { error: memberError } = await admin.from("watch_party_members").insert(members);
    if (memberError) {
      await admin.from("watch_parties").delete().eq("id", party.id);
      return NextResponse.json({ error: "Could not invite friends to this Watch Party." }, { status: 500 });
    }
    return NextResponse.json({ partyId: party.id }, { status: 201 });
  }

  const close = closeSchema.safeParse(body);
  if (close.success) {
    const { data, error } = await admin.from("watch_parties").update({ closed_at: new Date().toISOString() }).eq("id", close.data.partyId).eq("host_id", user.id).is("closed_at", null).select("id").maybeSingle();
    if (error) return NextResponse.json({ error: "Could not close Watch Party." }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Only the host can close an active Watch Party." }, { status: 403 });
    return NextResponse.json({ success: true });
  }

  const response = respondSchema.safeParse(body);
  if (!response.success) return NextResponse.json({ error: "Choose a valid Watch Party action." }, { status: 400 });
  const { data, error } = await admin.from("watch_party_members").update({ status: response.data.action === "accept" ? "accepted" : "declined", responded_at: new Date().toISOString() }).eq("party_id", response.data.partyId).eq("user_id", user.id).eq("status", "invited").select("party_id").maybeSingle();
  if (error) return NextResponse.json({ error: "Could not update Watch Party invitation." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Invitation not found or no longer active." }, { status: 404 });
  return NextResponse.json({ success: true, status: response.data.action === "accept" ? "accepted" : "declined" });
}
