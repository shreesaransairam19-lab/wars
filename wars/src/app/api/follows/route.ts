import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const followSchema = z.object({ targetUserId: z.string().uuid() });

async function readFollowRequest(request: Request) {
  const parsed = followSchema.safeParse(await request.json().catch(() => null));
  return parsed.success ? parsed.data.targetUserId : null;
}

async function followerCount(targetUserId: string) {
  const { count, error } = await createAdminClient()
    .from("user_follows")
    .select("follower_id", { count: "exact", head: true })
    .eq("followed_id", targetUserId);
  return { count: count ?? 0, error };
}

function migrationError() {
  return NextResponse.json(
    { error: "Follow is not set up yet. Apply the WARS profile-follow database migration." },
    { status: 503 }
  );
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to follow members." }, { status: 401 });

  const targetUserId = await readFollowRequest(request);
  if (!targetUserId) return NextResponse.json({ error: "Invalid member." }, { status: 400 });
  if (targetUserId === user.id) return NextResponse.json({ error: "You cannot follow yourself." }, { status: 400 });

  const admin = createAdminClient();
  const { data: target, error: targetError } = await admin.from("profiles").select("id").eq("id", targetUserId).maybeSingle();
  if (targetError) return NextResponse.json({ error: "Could not find this member." }, { status: 500 });
  if (!target) return NextResponse.json({ error: "Member not found." }, { status: 404 });

  const { error } = await admin.from("user_follows").upsert(
    { follower_id: user.id, followed_id: targetUserId },
    { onConflict: "follower_id,followed_id", ignoreDuplicates: true }
  );
  if (error) return error.code === "42P01" || error.code === "PGRST205" ? migrationError() : NextResponse.json({ error: "Could not follow this member." }, { status: 500 });

  const result = await followerCount(targetUserId);
  if (result.error) return result.error.code === "42P01" || result.error.code === "PGRST205" ? migrationError() : NextResponse.json({ error: "Follow saved, but the follower count could not be refreshed." }, { status: 500 });
  return NextResponse.json({ following: true, followerCount: result.count });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to manage follows." }, { status: 401 });

  const targetUserId = await readFollowRequest(request);
  if (!targetUserId) return NextResponse.json({ error: "Invalid member." }, { status: 400 });
  if (targetUserId === user.id) return NextResponse.json({ error: "Invalid member." }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from("user_follows").delete().eq("follower_id", user.id).eq("followed_id", targetUserId);
  if (error) return error.code === "42P01" || error.code === "PGRST205" ? migrationError() : NextResponse.json({ error: "Could not unfollow this member." }, { status: 500 });

  const result = await followerCount(targetUserId);
  if (result.error) return result.error.code === "42P01" || result.error.code === "PGRST205" ? migrationError() : NextResponse.json({ error: "Follow removed, but the follower count could not be refreshed." }, { status: 500 });
  return NextResponse.json({ following: false, followerCount: result.count });
}
