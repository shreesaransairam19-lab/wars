import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/security/rate-limit";
import { z } from "zod";

const reportSchema = z.object({
  target_type: z.enum(["message", "review", "user"]),
  target_id: z.string().uuid(),
  reason: z.string().min(1).max(1000),
});

// POST /api/reports
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = checkRateLimit(
    `report:${user.id}:${getClientIp(request)}`,
    RATE_LIMITS.report.max,
    RATE_LIMITS.report.windowMs
  );
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many reports. Try later." }, { status: 429 });
  }

  const parsed = reportSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: parsed.data.target_type,
    target_id: parsed.data.target_id,
    reason: parsed.data.reason,
  });

  if (error) {
    return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}

// GET /api/reports — moderator queue
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: roles } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", user.id);

  const isMod = (roles ?? []).some(
    (r: { roles: { name: string }[] }) =>
      r.roles.some((role) => ["owner", "admin", "moderator"].includes(role.name))
  );
  if (!isMod) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("reports")
    .select("*, profiles:reporter_id (username)")
    .eq("status", "open")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }

  return NextResponse.json({ reports: data });
}
