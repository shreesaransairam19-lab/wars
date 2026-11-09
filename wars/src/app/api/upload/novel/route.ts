import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasAnyRole } from "@/lib/permissions/guards";
import { generateStoragePath, validateNovelFile } from "@/lib/security/file-validation";

// EPUB bytes go directly from the browser to Supabase Storage. Sending them
// through a Vercel function hits Vercel's request body limit for ordinary books.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to manage chapters" }, { status: 401 });
  if (!(await hasAnyRole(user.id, ["owner", "editor"]))) {
    return NextResponse.json({ error: "Your account needs editor or owner permissions" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const chapterId = typeof body?.chapter_id === "string" ? body.chapter_id : "";
  const name = typeof body?.name === "string" ? body.name : "";
  const type = typeof body?.type === "string" ? body.type : "";
  const size = Number(body?.size);
  const validation = validateNovelFile({ name, type, size });
  if (!chapterId || !validation.valid) {
    return NextResponse.json({ error: validation.error ?? "Chapter is required" }, { status: 400 });
  }

  const { data: chapter } = await supabase.from("chapters").select("id").eq("id", chapterId).maybeSingle();
  if (!chapter) return NextResponse.json({ error: "Chapter not found" }, { status: 404 });

  const path = generateStoragePath(chapterId, "epub");
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from("chapter-assets").createSignedUploadUrl(path);
  if (error || !data) {
    return NextResponse.json({ error: `Could not prepare upload: ${error?.message ?? "Storage unavailable"}` }, { status: 500 });
  }

  return NextResponse.json({ path, token: data.token, bucket: "chapter-assets" });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await hasAnyRole(user.id, ["owner", "editor"]))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const chapterId = typeof body?.chapter_id === "string" ? body.chapter_id : "";
  const path = typeof body?.path === "string" ? body.path : "";
  const name = typeof body?.name === "string" ? body.name : "";
  const size = Number(body?.size);
  const mimeType = typeof body?.type === "string" && body.type ? body.type : "application/epub+zip";
  const validation = validateNovelFile({ name, type: mimeType, size });
  if (!chapterId || !validation.valid || !path.startsWith(`${chapterId}/`)) {
    return NextResponse.json({ error: validation.error ?? "Invalid upload details" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: object, error: storageError } = await admin.storage.from("chapter-assets").info(path);
  if (storageError || !object || Number(object.metadata?.size ?? object.size ?? 0) !== size) {
    return NextResponse.json({ error: "Uploaded EPUB could not be verified in storage" }, { status: 400 });
  }

  const { error } = await admin.from("chapter_assets").insert({
    chapter_id: chapterId,
    asset_type: "file",
    storage_path: `chapter-assets/${path}`,
    mime_type: mimeType,
    byte_size: size,
    order_index: 0,
  });
  if (error) return NextResponse.json({ error: "File uploaded but could not be added to the chapter" }, { status: 500 });

  return NextResponse.json({ success: true });
}
