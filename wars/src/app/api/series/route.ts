import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { seriesSchema } from "@/lib/validation/series";
import { hasRole } from "@/lib/permissions/guards";
import { checkRateLimit, RATE_LIMITS, getClientIp } from "@/lib/security/rate-limit";

// GET /api/series — list published series (public) or all (staff)
export async function GET(request: Request) {
  const supabase = await createClient();
  const url = new URL(request.url);
  const all = url.searchParams.get("all") === "true";

  let query = supabase
    .from("series")
    .select("*, chapters(count)")
    .order("created_at", { ascending: false });

  if (!all) {
    query = query.eq("status", "published");
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Failed to fetch series" }, { status: 500 });
  }

  return NextResponse.json({ series: data });
}

// POST /api/series — create series (editor+)
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
  const rate = checkRateLimit(`series-create:${ip}`, RATE_LIMITS.upload.max, RATE_LIMITS.upload.windowMs);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const body = await request.json();
  const parsed = seriesSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("series")
    .insert({
      ...parsed.data,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create series" }, { status: 500 });
  }

  return NextResponse.json({ series: data }, { status: 201 });
}

// PATCH /api/series — update series (editor+)
export async function PATCH(request: Request) {
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

  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "Series ID required" }, { status: 400 });
  }

  const parsed = seriesSchema.partial().safeParse(updates);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("series")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to update series" }, { status: 500 });
  }

  return NextResponse.json({ series: data });
}

// DELETE /api/series?id=xxx — delete series (admin+)
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = await hasRole(user.id, "admin");
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Series ID required" }, { status: 400 });
  }

  const { error } = await supabase.from("series").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Failed to delete series" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
