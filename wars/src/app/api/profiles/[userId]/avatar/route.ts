import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Profile pictures are visible in public WARS areas; the bucket itself stays private.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  if (!UUID_PATTERN.test(userId)) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const admin = createAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("avatar_path")
    .eq("id", userId)
    .maybeSingle();
  const prefix = `avatars/${userId}/`;
  if (error || !profile?.avatar_path?.startsWith(prefix)) {
    return NextResponse.json({ error: "Profile picture not found" }, { status: 404 });
  }

  const objectPath = profile.avatar_path.slice("avatars/".length);
  const { data, error: signError } = await admin.storage.from("avatars").createSignedUrl(objectPath, 3600);
  if (signError || !data?.signedUrl) {
    return NextResponse.json({ error: "Profile picture not available" }, { status: 404 });
  }

  return NextResponse.redirect(data.signedUrl, {
    headers: { "Cache-Control": "private, max-age=60" },
  });
}
