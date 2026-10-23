import { NextResponse } from "next/server";

// GET /api/gifs?q=xxx — Giphy search proxy (keeps API key server-side)
export async function GET(request: Request) {
  const key = process.env.GIPHY_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "GIF search not configured" }, { status: 503 });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const endpoint = q ? "search" : "trending";

  const params = new URLSearchParams({
    api_key: key,
    limit: "24",
    rating: "pg-13",
  });
  if (q) params.set("q", q);

  const res = await fetch(`https://api.giphy.com/v1/gifs/${endpoint}?${params}`, {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "GIF search failed" }, { status: 502 });
  }

  const json = await res.json();
  const gifs = (json.data ?? []).map(
    (g: {
      id: string;
      title: string;
      images: {
        fixed_width: { url: string; width: string; height: string };
        original: { url: string };
      };
    }) => ({
      id: g.id,
      title: g.title,
      preview: g.images.fixed_width.url,
      url: g.images.original.url,
      width: Number(g.images.fixed_width.width),
      height: Number(g.images.fixed_width.height),
    })
  );

  return NextResponse.json({ gifs });
}
