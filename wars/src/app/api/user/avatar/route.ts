import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateStoragePath, getImageMimeType, validateCoverFile } from "@/lib/security/file-validation";

const AVATAR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

function parseFile(body: Record<string, unknown> | null) {
  const name = typeof body?.name === "string" ? body.name : "";
  const type = getImageMimeType({
    name,
    type: typeof body?.type === "string" ? body.type : "",
  });
  const size = Number(body?.size);
  const validation = !Number.isFinite(size) || size <= 0 || size > AVATAR_MAX_BYTES
    ? { valid: false, error: "Choose a non-empty image smaller than 5 MB." }
    : validateCoverFile({ name, type, size });
  return { name, type, size, validation };
}

async function ensureAvatarBucket(admin: ReturnType<typeof createAdminClient>) {
  const { data: buckets, error: listError } = await admin.storage.listBuckets();
  if (listError) return listError;
  if ((buckets ?? []).some((bucket) => bucket.id === "avatars" || bucket.name === "avatars")) {
    return null;
  }
  const { error } = await admin.storage.createBucket("avatars", {
    public: false,
    fileSizeLimit: AVATAR_MAX_BYTES,
    allowedMimeTypes: AVATAR_MIME_TYPES,
  });
  if (error && !/already exists|duplicate/i.test(error.message)) return error;
  return null;
}

// POST creates a single-use upload token for the signed-in user's own avatar.
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in to upload a profile picture" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const { name, type, size, validation } = parseFile(body);
  if (!validation.valid) return NextResponse.json({ error: validation.error ?? "Invalid image" }, { status: 400 });

  const extension = name.toLowerCase().slice(name.lastIndexOf(".") + 1);
  const path = generateStoragePath(user.id, extension);
  const admin = createAdminClient();
  const bucketError = await ensureAvatarBucket(admin);
  if (bucketError) return NextResponse.json({ error: "Avatar storage is not available" }, { status: 500 });

  const { data, error } = await admin.storage.from("avatars").createSignedUploadUrl(path);
  if (error || !data) return NextResponse.json({ error: "Could not prepare the profile picture upload" }, { status: 500 });

  return NextResponse.json({ path, token: data.token, type, size });
}

// PUT verifies the stored object and attaches it to the signed-in profile.
export async function PUT(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in to update your profile picture" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const path = typeof body?.path === "string" ? body.path : "";
  const { name, type, size, validation } = parseFile(body);
  const extension = name.toLowerCase().slice(name.lastIndexOf(".") + 1);
  const objectName = path.startsWith(`${user.id}/`) ? path.slice(user.id.length + 1) : "";
  const validObjectName = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|gif)$/i.test(objectName);
  if (!validation.valid || !validObjectName || !objectName.endsWith(`.${extension}`)) {
    return NextResponse.json({ error: validation.error ?? "Invalid profile picture upload" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: object, error: storageError } = await admin.storage.from("avatars").info(path);
  const storedSize = Number(object?.metadata?.size ?? object?.size ?? 0);
  if (storageError || !object || storedSize !== size || size > AVATAR_MAX_BYTES) {
    return NextResponse.json({ error: "Uploaded profile picture could not be verified" }, { status: 400 });
  }

  const { data: profile, error: readError } = await admin
    .from("profiles")
    .select("avatar_path")
    .eq("id", user.id)
    .maybeSingle();
  if (readError || !profile) return NextResponse.json({ error: "Could not find your profile" }, { status: 404 });

  const avatarPath = `avatars/${path}`;
  const { data: updated, error: updateError } = await admin
    .from("profiles")
    .update({ avatar_path: avatarPath })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();
  if (updateError || !updated) {
    await admin.storage.from("avatars").remove([path]);
    return NextResponse.json({ error: "Could not save the profile picture" }, { status: 500 });
  }

  const ownPrefix = `avatars/${user.id}/`;
  const previousPath = profile.avatar_path;
  if (previousPath?.startsWith(ownPrefix) && previousPath !== avatarPath) {
    const oldObjectPath = previousPath.slice("avatars/".length);
    const { error: cleanupError } = await admin.storage.from("avatars").remove([oldObjectPath]);
    if (cleanupError) console.error("Could not remove previous profile picture", cleanupError);
  }

  return NextResponse.json({ success: true, avatar_path: avatarPath });
}

export async function DELETE() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in to update your profile picture" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile, error: readError } = await admin
    .from("profiles")
    .select("avatar_path")
    .eq("id", user.id)
    .maybeSingle();
  if (readError || !profile) return NextResponse.json({ error: "Could not find your profile" }, { status: 404 });

  const { error: updateError } = await admin
    .from("profiles")
    .update({ avatar_path: null })
    .eq("id", user.id);
  if (updateError) return NextResponse.json({ error: "Could not remove the profile picture" }, { status: 500 });

  const ownPrefix = `avatars/${user.id}/`;
  if (profile.avatar_path?.startsWith(ownPrefix)) {
    const path = profile.avatar_path.slice("avatars/".length);
    const { error } = await admin.storage.from("avatars").remove([path]);
    if (error) console.error("Could not delete removed profile picture", error);
  }

  return NextResponse.json({ success: true });
}
