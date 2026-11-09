import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasAnyRole } from "@/lib/permissions/guards";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to manage chapters" }, { status: 401 });
  if (!(await hasAnyRole(user.id, ["owner", "editor"]))) {
    return NextResponse.json({ error: "Your account needs editor or owner permissions" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const rawUrl = typeof body?.url === "string" ? body.url.trim() : "";
  let externalUrl: URL;
  try {
    externalUrl = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: "Enter a valid public PDF URL" }, { status: 400 });
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
    .select("id")
    .eq("id", chapterId)
    .maybeSingle();
  if (!chapter) return NextResponse.json({ error: "Chapter not found" }, { status: 404 });

  const { data: latestFile } = await admin
    .from("chapter_assets")
    .select("order_index")
    .eq("chapter_id", chapterId)
    .eq("asset_type", "file")
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await admin.from("chapter_assets").insert({
    chapter_id: chapterId,
    asset_type: "file",
    storage_path: "",
    external_url: externalUrl.toString(),
    mime_type: "application/pdf",
    byte_size: null,
    order_index: (latestFile?.order_index ?? -1) + 1,
  });
  if (error) return NextResponse.json({ error: "Could not save the external PDF link" }, { status: 500 });

  return NextResponse.json({ success: true }, { status: 201 });
}
