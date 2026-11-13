import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageContentType, getChapterContentType } from "@/lib/permissions/guards";
import { generateStoragePath, validateDocumentFile } from "@/lib/security/file-validation";

// Chapter documents go directly from the browser to Storage to avoid the
// serverless function request body limit for larger files.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to manage chapters" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const chapterId = typeof body?.chapter_id === "string" ? body.chapter_id : "";
  const name = typeof body?.name === "string" ? body.name : "";
  const type = typeof body?.type === "string" ? body.type : "";
  const size = Number(body?.size);
  const validation = validateDocumentFile({ name, type, size });
  if (!chapterId || !validation.valid) {
    return NextResponse.json({ error: validation.error ?? "Chapter is required" }, { status: 400 });
  }

  // Staff authorization above is the gate. Use the service client for this
  // existence check so production RLS cannot hide a valid chapter from its
  // owner/editor during a direct-to-Storage upload.
  const admin = createAdminClient();
  const { data: chapter } = await admin.from("chapters").select("id").eq("id", chapterId).maybeSingle();
  if (!chapter) return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  const contentType = await getChapterContentType(chapterId);
  if (!contentType || !["manga", "light_novel"].includes(contentType) || !(await canManageContentType(user.id, contentType))) {
    return NextResponse.json({ error: "Novel files can only be added to manga library chapters by a permitted editor" }, { status: 403 });
  }

  const extension = name.toLowerCase().endsWith(".pdf") ? "pdf" : "epub";
  const path = generateStoragePath(chapterId, extension);
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
  const body = await request.json().catch(() => null);
  const chapterId = typeof body?.chapter_id === "string" ? body.chapter_id : "";
  const path = typeof body?.path === "string" ? body.path : "";
  const name = typeof body?.name === "string" ? body.name : "";
  const size = Number(body?.size);
  const fallbackType = name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/epub+zip";
  const mimeType = typeof body?.type === "string" && body.type ? body.type : fallbackType;
  const validation = validateDocumentFile({ name, type: mimeType, size });
  if (!chapterId || !validation.valid || !path.startsWith(`${chapterId}/`)) {
    return NextResponse.json({ error: validation.error ?? "Invalid upload details" }, { status: 400 });
  }

  const admin = createAdminClient();
  const contentType = await getChapterContentType(chapterId);
  if (!contentType || !["manga", "light_novel"].includes(contentType) || !(await canManageContentType(user.id, contentType))) {
    return NextResponse.json({ error: "Novel files can only be added to manga library chapters by a permitted editor" }, { status: 403 });
  }
  const { data: object, error: storageError } = await admin.storage.from("chapter-assets").info(path);
  if (storageError || !object || Number(object.metadata?.size ?? object.size ?? 0) !== size) {
    return NextResponse.json({ error: "Uploaded document could not be verified in storage" }, { status: 400 });
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
