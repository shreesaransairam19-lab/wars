import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasAnyRole } from "@/lib/permissions/guards";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  const admin = createAdminClient();
  const user = await getCurrentUser();
  const { data: rows, error } = await admin
    .from("site_announcements")
    .select("id, kind, title, message, scheduled_for, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) return NextResponse.json({ error: "Could not load announcements" }, { status: 500 });

  const ids = (rows ?? []).map((row) => row.id);
  let readIds = new Set<string>();
  if (user && ids.length > 0) {
    const { data: receipts, error: readError } = await admin
      .from("site_announcement_reads")
      .select("announcement_id")
      .eq("user_id", user.id)
      .in("announcement_id", ids);
    if (readError) return NextResponse.json({ error: "Could not load read status" }, { status: 500 });
    readIds = new Set((receipts ?? []).map((receipt) => receipt.announcement_id));
  }

  const announcements = (rows ?? []).map((row) => ({ ...row, read: user ? readIds.has(row.id) : true }));
  return NextResponse.json(
    { announcements, unreadCount: announcements.filter((item) => !item.read).length },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } }
  );
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!(await hasAnyRole(user.id, ["owner"]))) {
    return NextResponse.json({ error: "Owner permissions required" }, { status: 403 });
  }

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid announcement" }, { status: 400 });
  const data = body as { kind?: unknown; title?: unknown; message?: unknown; scheduledFor?: unknown };
  if (data.kind !== "update" && data.kind !== "maintenance") {
    return NextResponse.json({ error: "Choose an update or maintenance notice" }, { status: 400 });
  }
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const message = typeof data.message === "string" ? data.message.trim() : "";
  if (!title || title.length > 100 || !message || message.length > 1500) {
    return NextResponse.json({ error: "Enter a title up to 100 characters and a message up to 1,500 characters" }, { status: 400 });
  }

  let scheduledFor: string | null = null;
  if (data.scheduledFor !== null && data.scheduledFor !== undefined && data.scheduledFor !== "") {
    if (typeof data.scheduledFor !== "string" || !Number.isFinite(Date.parse(data.scheduledFor))) {
      return NextResponse.json({ error: "Choose a valid maintenance time" }, { status: 400 });
    }
    scheduledFor = new Date(data.scheduledFor).toISOString();
  }
  if (data.kind === "update" && scheduledFor) {
    return NextResponse.json({ error: "Only maintenance notices can have a planned time" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: announcement, error } = await admin
    .from("site_announcements")
    .insert({ kind: data.kind, title, message, scheduled_for: scheduledFor, created_by: user.id })
    .select("id, kind, title, message, scheduled_for, created_at")
    .single();
  if (error || !announcement) return NextResponse.json({ error: "Could not publish the announcement" }, { status: 500 });

  return NextResponse.json({ success: true, announcement }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body: unknown = await request.json().catch(() => null);
  const ids = body && typeof body === "object" ? (body as { announcementIds?: unknown }).announcementIds : null;
  if (!Array.isArray(ids) || ids.length > 30 || ids.some((id) => typeof id !== "string" || !UUID.test(id))) {
    return NextResponse.json({ error: "Invalid announcement list" }, { status: 400 });
  }
  if (ids.length === 0) return NextResponse.json({ success: true });

  const admin = createAdminClient();
  const { error } = await admin.from("site_announcement_reads").upsert(
    ids.map((announcementId) => ({ user_id: user.id, announcement_id: announcementId })),
    { onConflict: "announcement_id,user_id", ignoreDuplicates: true }
  );
  if (error) return NextResponse.json({ error: "Could not save read status" }, { status: 500 });
  return NextResponse.json({ success: true });
}
