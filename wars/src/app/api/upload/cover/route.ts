import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasAnyRole } from "@/lib/permissions/guards";
import { generateStoragePath, validateCoverFile } from "@/lib/security/file-validation";

async function authorizationError(): Promise<NextResponse | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to manage series" }, { status: 401 });
  if (!(await hasAnyRole(user.id, ["owner", "editor"]))) {
    return NextResponse.json({ error: "Owner or Editor permissions are required" }, { status: 403 });
  }
  return null;
}

// Covers upload directly from the browser to Storage, avoiding serverless body limits.
export async function POST(request: Request) {
  const authError = await authorizationError();
  if (authError) return authError;

  const body = await request.json().catch(() => null);
  const seriesId = typeof body?.series_id === "string" ? body.series_id : "";
  const name = typeof body?.name === "string" ? body.name : "";
  const type = typeof body?.type === "string" ? body.type : "";
  const size = Number(body?.size);
  const validation = validateCoverFile({ name, type, size });
  if (!seriesId || !validation.valid) {
    return NextResponse.json({ error: validation.error ?? "Series is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: series } = await admin.from("series").select("id").eq("id", seriesId).maybeSingle();
  if (!series) return NextResponse.json({ error: "Series not found" }, { status: 404 });

  const extension = name.toLowerCase().slice(name.lastIndexOf(".") + 1);
  const path = generateStoragePath(seriesId, extension);
  const { data, error } = await admin.storage.from("covers").createSignedUploadUrl(path);
  if (error || !data) {
    return NextResponse.json({ error: `Could not prepare cover upload: ${error?.message ?? "Storage unavailable"}` }, { status: 500 });
  }

  return NextResponse.json({ path, token: data.token, bucket: "covers" });
}

export async function PUT(request: Request) {
  const authError = await authorizationError();
  if (authError) return authError;

  const body = await request.json().catch(() => null);
  const seriesId = typeof body?.series_id === "string" ? body.series_id : "";
  const path = typeof body?.path === "string" ? body.path : "";
  const name = typeof body?.name === "string" ? body.name : "";
  const type = typeof body?.type === "string" ? body.type : "";
  const size = Number(body?.size);
  const validation = validateCoverFile({ name, type, size });
  if (!seriesId || !path.startsWith(`${seriesId}/`) || !validation.valid) {
    return NextResponse.json({ error: validation.error ?? "Invalid cover upload details" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: object, error: storageError } = await admin.storage.from("covers").info(path);
  if (storageError || !object || Number(object.metadata?.size ?? object.size ?? 0) !== size) {
    return NextResponse.json({ error: "Uploaded cover could not be verified in storage" }, { status: 400 });
  }

  const { data: series, error: updateError } = await admin
    .from("series")
    .select("cover_path")
    .eq("id", seriesId)
    .maybeSingle();
  if (updateError || !series) return NextResponse.json({ error: "Series not found" }, { status: 404 });

  const previousPath = series.cover_path;
  const { error } = await admin.from("series").update({ cover_path: `covers/${path}` }).eq("id", seriesId);
  if (error) return NextResponse.json({ error: "Cover uploaded but could not be attached to the series" }, { status: 500 });

  if (previousPath?.startsWith("covers/")) {
    const oldObjectPath = previousPath.slice("covers/".length);
    if (oldObjectPath && oldObjectPath !== path) await admin.storage.from("covers").remove([oldObjectPath]);
  }

  return NextResponse.json({ success: true });
}
