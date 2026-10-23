import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
