import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ratingSchema } from "@/lib/validation/reviews";

// GET /api/ratings?series_id=xxx
export async function GET(request: Request) {
  const supabase = await createClient();
  const url = new URL(request.url);
  const seriesId = url.searchParams.get("series_id");

  if (!seriesId) {
    return NextResponse.json({ error: "series_id required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("ratings")
    .select("rating")
    .eq("series_id", seriesId);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch ratings" }, { status: 500 });
  }

  const ratings = data ?? [];
  const average =
    ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 0;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let myRating: number | null = null;
  if (user) {
    const { data: mine } = await supabase
      .from("ratings")
      .select("rating")
      .eq("series_id", seriesId)
      .eq("user_id", user.id)
      .maybeSingle();
    myRating = mine?.rating ?? null;
  }

  return NextResponse.json({
    average: Math.round(average * 10) / 10,
    count: ratings.length,
    my_rating: myRating,
  });
}

// PUT /api/ratings
export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = ratingSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { error } = await supabase.from("ratings").upsert(
    {
      user_id: user.id,
      series_id: parsed.data.series_id,
      rating: parsed.data.rating,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,series_id" }
  );

  if (error) {
    return NextResponse.json({ error: "Failed to save rating" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
