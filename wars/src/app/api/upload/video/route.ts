import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageContentType } from "@/lib/permissions/guards";
import { generateStoragePath, validateVideoFile } from "@/lib/security/file-validation";

async function canUploadVideo(userId: string, chapterId: string) {
  if (!(await canManageContentType(userId, "anime"))) return false;
  const admin = createAdminClient();
  const { data: chapter } = await admin
    .from("chapters")
    .select("id, series_id")
    .eq("id", chapterId)
    .maybeSingle();
  if (!chapter) return false;
  const { data: series } = await admin
    .from("series")
    .select("content_type")
    .eq("id", chapter.series_id)
    .maybeSingle();
  return Boolean(series && ["anime", "anime_movie"].includes(series.content_type));
}

// Anime episode videos upload directly to Storage so they do not pass through
// the serverless request body limit.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to manage episodes" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const chapterId = typeof body?.chapter_id === "string" ? body.chapter_id : "";
  const name = typeof body?.name === "string" ? body.name : "";
  const type = typeof body?.type === "string" ? body.type : "";
  const size = Number(body?.size);
  const validation = validateVideoFile({ name, type, size });
  if (!chapterId || !validation.valid) {
    return NextResponse.json({ error: validation.error ?? "Episode is required" }, { status: 400 });
  }
  if (!(await canUploadVideo(user.id, chapterId))) {
    return NextResponse.json({ error: "Anime Editors, Editors, Codesters, or the Owner can add videos to anime episodes" }, { status: 403 });
  }

  const extension = name.toLowerCase().endsWith(".mp4") ? "mp4" : "webm";
  const path = generateStoragePath(chapterId, extension);
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from("chapter-assets").createSignedUploadUrl(path);
  if (error || !data) {
    return NextResponse.json({ error: `Could not prepare video upload: ${error?.message ?? "Storage unavailable"}` }, { status: 500 });
  }
  return NextResponse.json({ path, token: data.token, bucket: "chapter-assets" });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const chapterId = typeof body?.chapter_id === "string" ? body.chapter_id : "";
  const path = typeof body?.path === "string" ? body.path : "";
  const name = typeof body?.name === "string" ? body.name : "";
  const size = Number(body?.size);
  const type = typeof body?.type === "string" ? body.type : "";
  const mimeType = type || (name.toLowerCase().endsWith(".mp4") ? "video/mp4" : "video/webm");
  const validation = validateVideoFile({ name, type: mimeType, size });
  if (!chapterId || !path.startsWith(`${chapterId}/`) || !validation.valid) {
    return NextResponse.json({ error: validation.error ?? "Invalid upload details" }, { status: 400 });
  }
  if (!(await canUploadVideo(user.id, chapterId))) {
    return NextResponse.json({ error: "Videos can only be added to anime episodes by an Owner or Editor" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: object, error: storageError } = await admin.storage.from("chapter-assets").info(path);
  if (storageError || !object || Number(object.metadata?.size ?? object.size ?? 0) !== size) {
    return NextResponse.json({ error: "Uploaded video could not be verified in storage" }, { status: 400 });
  }

  const { error } = await admin.from("chapter_assets").insert({
    chapter_id: chapterId,
    asset_type: "file",
    storage_path: `chapter-assets/${path}`,
    mime_type: mimeType,
    byte_size: size,
    order_index: 0,
  });
  if (error) return NextResponse.json({ error: "Video uploaded but could not be attached to the episode" }, { status: 500 });
  return NextResponse.json({ success: true });
}
