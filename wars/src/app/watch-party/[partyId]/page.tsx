import { redirect, notFound } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { WatchPartyRoom } from "@/components/watch-party/WatchPartyRoom";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Watch Party | WARS", description: "Watch anime together with WARS friends." };

export default async function WatchPartyPage({ params }: { params: Promise<{ partyId: string }> }) {
  const { partyId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(partyId)) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/watch-party/${partyId}`)}`);

  const admin = createAdminClient();
  const [{ data: membership }, { data: party }] = await Promise.all([
    admin.from("watch_party_members").select("status").eq("party_id", partyId).eq("user_id", user.id).maybeSingle(),
    admin.from("watch_parties").select("id,host_id,chapter_id,closed_at").eq("id", partyId).maybeSingle(),
  ]);
  if (!party || party.closed_at || membership?.status !== "accepted") redirect("/watch-parties");

  const { data: chapter } = await admin.from("chapters").select("id,title,chapter_number,series_id,status").eq("id", party.chapter_id).eq("status", "published").maybeSingle();
  if (!chapter) notFound();
  const [{ data: series }, { data: assets }, { data: profile }] = await Promise.all([
    admin.from("series").select("title,content_type,status").eq("id", chapter.series_id).maybeSingle(),
    admin.from("chapter_assets").select("storage_path,mime_type,external_url,created_at").eq("chapter_id", chapter.id).in("mime_type", ["video/mp4", "video/webm"]).order("created_at", { ascending: false }).limit(1),
    admin.from("profiles").select("username").eq("id", user.id).maybeSingle(),
  ]);
  if (!series || !["anime", "anime_movie"].includes(series.content_type) || series.status !== "published") notFound();
  const asset = assets?.[0];
  if (!asset) notFound();
  let videoUrl = asset.external_url;
  if (!videoUrl && asset.storage_path) {
    const { data } = await admin.storage.from("chapter-assets").createSignedUrl(asset.storage_path, 3600);
    videoUrl = data?.signedUrl ?? null;
  }
  if (!videoUrl) notFound();
  const episodeTitle = `${series.title} · Episode ${chapter.chapter_number}${chapter.title ? ` — ${chapter.title}` : ""}`;

  return <><TopBar /><WatchPartyRoom partyId={party.id} hostId={party.host_id} currentUserId={user.id} username={profile?.username ?? "Reader"} episodeTitle={episodeTitle} videoUrl={videoUrl} /></>;
}
