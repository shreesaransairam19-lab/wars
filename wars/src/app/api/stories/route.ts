import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { containsHarmfulContent, sanitizeChatMessage } from "@/lib/security/sanitize";
import { containsProfanity, containsRacistSlur } from "@/lib/security/profanity";

const MAX_STORY_BYTES = 25 * 1024 * 1024;
const STORY_MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
  "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov",
};
const publishSchema = z.object({ action: z.literal("publish"), path: z.string().min(10).max(300), caption: z.string().trim().max(300).default("") });
const prepareSchema = z.object({ action: z.literal("prepare-upload"), name: z.string().min(1).max(200), mimeType: z.string(), size: z.number().int().positive().max(MAX_STORY_BYTES) });
const textSchema = z.object({ action: z.literal("text"), caption: z.string().trim().min(1).max(300) });
const deleteSchema = z.object({ action: z.literal("delete"), storyId: z.string().uuid() });

async function signedInUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

function migrationError() {
  return NextResponse.json({ error: "Stories need the latest WARS social-features database migration." }, { status: 503 });
}

async function purgeExpiredStories(admin: ReturnType<typeof createAdminClient>) {
  const now = new Date().toISOString();
  const { data: expired, error } = await admin.from("user_stories").select("id,storage_path").lt("expires_at", now).limit(500);
  if (error || !expired?.length) return;
  const paths = expired.flatMap((story) => story.storage_path ? [story.storage_path] : []);
  if (paths.length) {
    const { error: removeError } = await admin.storage.from("user-stories").remove(paths);
    if (removeError) {
      console.error("Could not purge expired story media", removeError);
      return;
    }
  }
  const { error: deleteError } = await admin.from("user_stories").delete().in("id", expired.map((story) => story.id));
  if (deleteError) console.error("Could not purge expired stories", deleteError);
}

async function getFriends(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { data, error } = await admin.from("friend_requests").select("requester_id,addressee_id")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`).eq("status", "accepted");
  return { friendIds: (data ?? []).map((row) => row.requester_id === userId ? row.addressee_id : row.requester_id), error };
}

async function enforceStoryCaption(admin: ReturnType<typeof createAdminClient>, userId: string, rawCaption: string) {
  const caption = sanitizeChatMessage(rawCaption);
  if (containsHarmfulContent(caption)) return { caption: "", response: NextResponse.json({ error: "Story text rejected." }, { status: 400 }) };
  if (containsRacistSlur(caption)) {
    const reason = "Immediate ban: racist hate speech in Story";
    const { error } = await admin.from("user_bans").upsert({ user_id: userId, banned_by: null, reason, expires_at: null }, { onConflict: "user_id" });
    if (error) return { caption: "", response: NextResponse.json({ error: "Racist slurs are blocked. Automatic ban needs the latest database migration." }, { status: 503 }) };
    await admin.from("moderation_actions").insert({ actor_id: null, target_type: "user", target_id: userId, action: "ban", reason });
    return { caption: "", response: NextResponse.json({ error: "Your account was banned from WARS for racist hate speech. You can submit an appeal." }, { status: 403 }) };
  }
  if (containsProfanity(caption)) return { caption: "", response: NextResponse.json({ error: "That Story contains language blocked by the WARS filter." }, { status: 400 }) };
  return { caption, response: null };
}

async function activeStoryCount(admin: ReturnType<typeof createAdminClient>, userId: string) {
  return admin.from("user_stories").select("id", { count: "exact", head: true }).eq("user_id", userId).gt("expires_at", new Date().toISOString());
}

export async function GET() {
  const user = await signedInUser();
  if (!user) return NextResponse.json({ error: "Sign in to view Stories." }, { status: 401 });
  const admin = createAdminClient();
  await purgeExpiredStories(admin);
  const { friendIds, error: friendError } = await getFriends(admin, user.id);
  if (friendError) return friendError.code === "42P01" || friendError.code === "PGRST205" ? migrationError() : NextResponse.json({ error: "Could not load your friends' Stories." }, { status: 500 });
  const visibleIds = [...new Set([user.id, ...friendIds])];
  const { data: stories, error } = await admin.from("user_stories")
    .select("id,user_id,storage_path,mime_type,caption,created_at,expires_at")
    .in("user_id", visibleIds).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(300);
  if (error) return error.code === "42P01" || error.code === "PGRST205" ? migrationError() : NextResponse.json({ error: "Could not load Stories." }, { status: 500 });

  const userIds = [...new Set((stories ?? []).map((story) => story.user_id))];
  const { data: profiles, error: profileError } = userIds.length
    ? await admin.from("profiles").select("id,username,display_name,avatar_path").in("id", userIds)
    : { data: [], error: null };
  if (profileError) return NextResponse.json({ error: "Could not load Story profiles." }, { status: 500 });
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const decorated = await Promise.all((stories ?? []).map(async (story) => {
    let mediaUrl: string | null = null;
    if (story.storage_path) {
      const remainingSeconds = Math.max(1, Math.ceil((new Date(story.expires_at).getTime() - Date.now()) / 1000));
      const { data, error: signError } = await admin.storage.from("user-stories").createSignedUrl(story.storage_path, remainingSeconds);
      if (!signError) mediaUrl = data.signedUrl;
    }
    return { ...story, media_url: mediaUrl, profile: profileById.get(story.user_id) ?? null };
  }));
  return NextResponse.json({ stories: decorated }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

export async function POST(request: Request) {
  const user = await signedInUser();
  if (!user) return NextResponse.json({ error: "Sign in to post a Story." }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  const admin = createAdminClient();
  await purgeExpiredStories(admin);

  const text = textSchema.safeParse(body);
  if (text.success) {
    const moderated = await enforceStoryCaption(admin, user.id, text.data.caption);
    if (moderated.response) return moderated.response;
    if (!moderated.caption) return NextResponse.json({ error: "Enter some text for your Story." }, { status: 400 });
    const count = await activeStoryCount(admin, user.id);
    if (count.error) return count.error.code === "42P01" || count.error.code === "PGRST205" ? migrationError() : NextResponse.json({ error: "Could not publish Story." }, { status: 500 });
    if ((count.count ?? 0) >= 20) return NextResponse.json({ error: "You can have up to 20 active Stories. Wait for one to expire before posting another." }, { status: 429 });
    const { data, error } = await admin.from("user_stories").insert({ user_id: user.id, caption: moderated.caption, expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }).select("id").single();
    if (error) return error.code === "42P01" || error.code === "PGRST205" ? migrationError() : NextResponse.json({ error: "Could not publish Story." }, { status: 500 });
    return NextResponse.json({ storyId: data.id }, { status: 201 });
  }

  const prepare = prepareSchema.safeParse(body);
  if (prepare.success) {
    const extension = STORY_MIME_EXTENSIONS[prepare.data.mimeType];
    if (!extension) return NextResponse.json({ error: "Choose a JPG, PNG, WebP, GIF, MP4, WebM, or MOV file." }, { status: 400 });
    const adminStories = await activeStoryCount(admin, user.id);
    if (adminStories.error) return adminStories.error.code === "42P01" || adminStories.error.code === "PGRST205" ? migrationError() : NextResponse.json({ error: "Could not prepare Story upload." }, { status: 500 });
    if ((adminStories.count ?? 0) >= 20) return NextResponse.json({ error: "You can have up to 20 active Stories. Wait for one to expire before posting another." }, { status: 429 });
    const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const { data, error } = await admin.storage.from("user-stories").createSignedUploadUrl(path);
    if (error || !data) return NextResponse.json({ error: "Could not prepare the Story upload." }, { status: 500 });
    return NextResponse.json({ path: data.path, token: data.token }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  }

  const publish = publishSchema.safeParse(body);
  if (publish.success) {
    const moderated = await enforceStoryCaption(admin, user.id, publish.data.caption);
    if (moderated.response) return moderated.response;
    const ownPrefix = `${user.id}/`;
    if (!publish.data.path.startsWith(ownPrefix) || publish.data.path.includes("..")) return NextResponse.json({ error: "Invalid Story media path." }, { status: 400 });
    const { data: uploaded, error: listError } = await admin.storage.from("user-stories").info(publish.data.path);
    if (listError) return NextResponse.json({ error: "Could not verify the uploaded Story media." }, { status: 500 });
    if (!uploaded) return NextResponse.json({ error: "Upload the selected file before publishing." }, { status: 400 });
    const metadata = uploaded.metadata as { mimetype?: string; size?: number } | null;
    const mimeType = metadata?.mimetype ?? "";
    const storedSize = Number(metadata?.size ?? uploaded.size ?? 0);
    if (!STORY_MIME_EXTENSIONS[mimeType] || storedSize <= 0 || storedSize > MAX_STORY_BYTES) {
      await admin.storage.from("user-stories").remove([publish.data.path]);
      return NextResponse.json({ error: "The uploaded Story file type or size is not allowed." }, { status: 400 });
    }
    const count = await activeStoryCount(admin, user.id);
    if (count.error) { await admin.storage.from("user-stories").remove([publish.data.path]); return count.error.code === "42P01" || count.error.code === "PGRST205" ? migrationError() : NextResponse.json({ error: "Could not publish Story." }, { status: 500 }); }
    if ((count.count ?? 0) >= 20) { await admin.storage.from("user-stories").remove([publish.data.path]); return NextResponse.json({ error: "You can have up to 20 active Stories. Wait for one to expire before posting another." }, { status: 429 }); }
    const { data, error } = await admin.from("user_stories").insert({ user_id: user.id, storage_path: publish.data.path, mime_type: mimeType, caption: moderated.caption, expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }).select("id").single();
    if (error) {
      await admin.storage.from("user-stories").remove([publish.data.path]);
      return error.code === "42P01" || error.code === "PGRST205" ? migrationError() : NextResponse.json({ error: "Could not publish Story." }, { status: 500 });
    }
    return NextResponse.json({ storyId: data.id }, { status: 201 });
  }
  return NextResponse.json({ error: "Enter a short text status or upload supported photo/video media." }, { status: 400 });
}

export async function DELETE(request: Request) {
  const user = await signedInUser();
  if (!user) return NextResponse.json({ error: "Sign in to remove a Story." }, { status: 401 });
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid Story." }, { status: 400 });
  const admin = createAdminClient();
  const { data: story, error: readError } = await admin.from("user_stories").select("id,storage_path").eq("id", parsed.data.storyId).eq("user_id", user.id).maybeSingle();
  if (readError) return readError.code === "42P01" || readError.code === "PGRST205" ? migrationError() : NextResponse.json({ error: "Could not find this Story." }, { status: 500 });
  if (!story) return NextResponse.json({ error: "Story not found." }, { status: 404 });
  const { error } = await admin.from("user_stories").delete().eq("id", story.id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "Could not remove Story." }, { status: 500 });
  if (story.storage_path) {
    const { error: storageError } = await admin.storage.from("user-stories").remove([story.storage_path]);
    if (storageError) console.error("Could not remove Story media", storageError);
  }
  return NextResponse.json({ success: true });
}
