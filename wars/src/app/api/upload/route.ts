import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasRole } from "@/lib/permissions/guards";
import {
  validateImageFile,
  validateNovelFile,
  generateStoragePath,
} from "@/lib/security/file-validation";
import { checkRateLimit, RATE_LIMITS, getClientIp } from "@/lib/security/rate-limit";

// POST /api/upload — upload chapter asset or cover
// Body: multipart form data
// Fields: file, chapter_id (for pages), series_id (for covers), asset_type
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canEdit = await hasRole(user.id, "editor");
  if (!canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip = getClientIp(request);
  const rate = checkRateLimit(`upload:${ip}`, RATE_LIMITS.upload.max, RATE_LIMITS.upload.windowMs);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const chapterId = formData.get("chapter_id") as string | null;
  const seriesId = formData.get("series_id") as string | null;
  const assetType = formData.get("asset_type") as string | null;
  const pageNumber = formData.get("page_number") as string | null;
  const orderIndex = formData.get("order_index") as string | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Validate file based on type
  const fileMeta = { name: file.name, type: file.type, size: file.size };

  let validation;
  let bucket: string;
  let storagePath: string;

  if (assetType === "cover") {
    validation = validateImageFile(fileMeta);
    bucket = "covers";
    if (!seriesId) {
      return NextResponse.json({ error: "series_id required for cover" }, { status: 400 });
    }
    storagePath = generateStoragePath(seriesId, file.name.split(".").pop() ?? "jpg");
  } else if (assetType === "novel") {
    validation = validateNovelFile(fileMeta);
    bucket = "chapter-assets";
    if (!chapterId) {
      return NextResponse.json({ error: "chapter_id required for novel file" }, { status: 400 });
    }
    storagePath = generateStoragePath(chapterId, "epub");
  } else if (assetType === "page") {
    validation = validateImageFile(fileMeta);
    bucket = "chapter-assets";
    if (!chapterId) {
      return NextResponse.json({ error: "chapter_id required for page" }, { status: 400 });
    }
    const page = pageNumber ? parseInt(pageNumber, 10) : 0;
    storagePath = generateStoragePath(
      `${chapterId}/pages`,
      file.name.split(".").pop() ?? "webp",
      `page-${String(page).padStart(4, "0")}`
    );
  } else {
    return NextResponse.json({ error: "Invalid asset_type" }, { status: 400 });
  }

  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Upload to Supabase Storage
  const buffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: `Upload failed: ${uploadError.message}` },
      { status: 500 }
    );
  }

  // Record in chapter_assets (for pages and novels)
  if (chapterId && assetType !== "cover") {
    const { error: dbError } = await supabase.from("chapter_assets").insert({
      chapter_id: chapterId,
      asset_type: assetType === "novel" ? "file" : "page",
      storage_path: `${bucket}/${storagePath}`,
      mime_type: file.type,
      byte_size: file.size,
      page_number: pageNumber ? parseInt(pageNumber, 10) : null,
      order_index: orderIndex ? parseInt(orderIndex, 10) : 0,
    });

    if (dbError) {
      return NextResponse.json(
        { error: "Uploaded but failed to record asset" },
        { status: 500 }
      );
    }
  }

  // For covers, update the series cover_path
  if (assetType === "cover" && seriesId) {
    await supabase
      .from("series")
      .update({ cover_path: `${bucket}/${storagePath}` })
      .eq("id", seriesId);
  }

  return NextResponse.json({
    success: true,
    path: `${bucket}/${storagePath}`,
    size: file.size,
    mime_type: file.type,
  });
}

// GET /api/upload/signed-url?path=xxx — get signed URL for private asset
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const path = url.searchParams.get("path");
  const expiresIn = parseInt(url.searchParams.get("expires") ?? "3600", 10);

  if (!path) {
    return NextResponse.json({ error: "path required" }, { status: 400 });
  }

  // Path format: bucket/storage_path
  const slashIndex = path.indexOf("/");
  if (slashIndex === -1) {
    return NextResponse.json({ error: "Invalid path format" }, { status: 400 });
  }

  const bucket = path.slice(0, slashIndex);
  const storagePath = path.slice(slashIndex + 1);

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, expiresIn);

  if (error) {
    return NextResponse.json({ error: "Failed to create signed URL" }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl, expires_in: expiresIn });
}
