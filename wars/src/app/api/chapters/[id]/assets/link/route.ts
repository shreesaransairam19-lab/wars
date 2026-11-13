import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageChapter, getChapterContentType } from "@/lib/permissions/guards";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to manage chapters" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const rawUrl = typeof body?.url === "string" ? body.url.trim() : "";
  const mediaType = body?.media_type === "video" ? "video" : "pdf";
  let externalUrl: URL;
  try {
    externalUrl = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: `Enter a valid public ${mediaType === "video" ? "video" : "PDF"} URL` }, { status: 400 });
  }
  if (
    rawUrl.length > 2048 ||
    externalUrl.protocol !== "https:" ||
    externalUrl.username ||
    externalUrl.password ||
    ["localhost", "127.0.0.1", "::1"].includes(externalUrl.hostname.toLowerCase())
  ) {
    return NextResponse.json({ error: "Use a public HTTPS link without login credentials" }, { status: 400 });
  }

  const { id: chapterId } = await params;
  const admin = createAdminClient();
  const { data: chapter } = await admin
    .from("chapters")
    .select("id, series_id")
    .eq("id", chapterId)
    .maybeSingle();
  if (!chapter) return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  const chapterType = await getChapterContentType(chapterId);
  if (!(await canManageChapter(user.id, chapterId))) {
    return NextResponse.json({ error: "Your role cannot edit this library" }, { status: 403 });
  }
  if (mediaType === "video" ? !chapterType?.startsWith("anime") : !chapterType || !["manga", "light_novel"].includes(chapterType)) {
    return NextResponse.json({ error: "Video links belong in anime episodes; PDF links belong in manga library chapters" }, { status: 400 });
  }

  let mimeType = "application/pdf";
  if (mediaType === "video") {
    const hostname = externalUrl.hostname.toLowerCase();
    const path = externalUrl.pathname;
    const youtubeHost = ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"].includes(hostname);
    const vimeoHost = ["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(hostname);
    const youtubeId = hostname === "youtu.be"
      ? path.split("/").filter(Boolean)[0]
      : externalUrl.searchParams.get("v") ?? path.match(/^\/(?:embed|shorts)\/([\w-]{11})/)?.[1];
    const vimeoId = path.match(/^\/(?:video\/)?(\d+)(?:\/|$)/)?.[1];

    if (/\.mp4$/i.test(path)) mimeType = "video/mp4";
    else if (/\.webm$/i.test(path)) mimeType = "video/webm";
    else if (youtubeHost && youtubeId && /^[\w-]{11}$/.test(youtubeId)) mimeType = "video/youtube";
    else if (vimeoHost && vimeoId) mimeType = "video/vimeo";
    else {
      return NextResponse.json({ error: "Use a direct MP4/WebM, YouTube, or Vimeo video link" }, { status: 400 });
    }

    const { data: series } = await admin
      .from("series")
      .select("content_type")
      .eq("id", chapter.series_id)
      .maybeSingle();
    if (!series || !["anime", "anime_movie"].includes(series.content_type)) {
      return NextResponse.json({ error: "Video links can only be added to anime episodes" }, { status: 400 });
    }
  }

  let latestFileQuery = admin
    .from("chapter_assets")
    .select("order_index")
    .eq("chapter_id", chapterId)
    .order("order_index", { ascending: false })
    .limit(1);
  latestFileQuery = mediaType === "video"
    ? latestFileQuery.like("mime_type", "video/%")
    : latestFileQuery.eq("asset_type", "file");
  const { data: latestFile } = await latestFileQuery.maybeSingle();

  const { error } = await admin.from("chapter_assets").insert({
    chapter_id: chapterId,
    asset_type: "file",
    storage_path: "",
    external_url: externalUrl.toString(),
    mime_type: mimeType,
    byte_size: null,
    order_index: (latestFile?.order_index ?? -1) + 1,
  });
  if (error) return NextResponse.json({ error: `Could not save the external ${mediaType} link` }, { status: 500 });

  return NextResponse.json({ success: true }, { status: 201 });
}
