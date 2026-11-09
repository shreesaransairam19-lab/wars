import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasAnyRole } from "@/lib/permissions/guards";

// GET /api/chapters/[id]/assets — list assets with signed URLs
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  // Allow anonymous read of assets for published chapters? No — require auth for private content
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify chapter exists and is published
  const { data: chapter } = await supabase
    .from("chapters")
    .select("id, series_id")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (!chapter) {
    return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  }

  // Fetch assets
  const { data: assets, error } = await supabase
    .from("chapter_assets")
    .select("*")
    .eq("chapter_id", id)
    .order("order_index", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch assets" }, { status: 500 });
  }

  // Generate signed URLs (1 hour expiry)
  const expiresIn = 3600;
  const signedAssets = await Promise.all(
    (assets ?? []).map(async (asset) => {
      const slashIndex = asset.storage_path.indexOf("/");
      const bucket = asset.storage_path.slice(0, slashIndex);
      const path = asset.storage_path.slice(slashIndex + 1);

      const { data: signed } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

      return {
        ...asset,
        signed_url: signed?.signedUrl ?? null,
        expires_in: expiresIn,
      };
    })
  );

  return NextResponse.json({ assets: signedAssets });
}

// DELETE /api/chapters/[id]/assets — remove one page/novel file from a chapter
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await hasAnyRole(user.id, ["owner", "editor"]))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: chapterId } = await params;
  const body = await request.json().catch(() => null);
  const assetId = typeof body?.asset_id === "string" ? body.asset_id : "";
  if (!assetId) return NextResponse.json({ error: "Asset ID required" }, { status: 400 });

  const admin = createAdminClient();
  const { data: asset, error: findError } = await admin
    .from("chapter_assets")
    .select("id, storage_path")
    .eq("id", assetId)
    .eq("chapter_id", chapterId)
    .maybeSingle();
  if (findError || !asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

  const slash = asset.storage_path.indexOf("/");
  if (slash < 1) return NextResponse.json({ error: "Invalid stored asset path" }, { status: 500 });
  const bucket = asset.storage_path.slice(0, slash);
  const path = asset.storage_path.slice(slash + 1);
  const { error: storageError } = await admin.storage.from(bucket).remove([path]);
  if (storageError) return NextResponse.json({ error: `Could not remove stored file: ${storageError.message}` }, { status: 500 });

  const { error: deleteError } = await admin.from("chapter_assets").delete().eq("id", assetId);
  if (deleteError) return NextResponse.json({ error: "File removed, but its chapter record could not be deleted" }, { status: 500 });
  return NextResponse.json({ success: true });
}
