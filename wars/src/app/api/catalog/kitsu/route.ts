import { NextResponse } from "next/server";
import { checkRateLimit, RATE_LIMITS, getClientIp } from "@/lib/security/rate-limit";

type KitsuAnime = {
  id?: string;
  attributes?: {
    slug?: string;
    canonicalTitle?: string;
    titles?: { en?: string | null; en_jp?: string | null; ja_jp?: string | null };
    synopsis?: string | null;
    posterImage?: { small?: string | null; medium?: string | null; large?: string | null; original?: string | null };
    episodeCount?: number | null;
    startDate?: string | null;
    status?: string | null;
    subtype?: string | null;
    averageRating?: string | null;
    ageRating?: string | null;
  };
};

function text(value: unknown): string {
  return typeof value === "string" ? value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : "";
}

function safePoster(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "media.kitsu.app" || url.hostname === "media.kitsu.io" || url.hostname.endsWith(".kitsu.io"))
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim().replace(/\s+/g, " ");
  const rawOffset = url.searchParams.get("offset") ?? "0";
  const offset = Number(rawOffset);

  if (query.length === 1 || query.length > 100) {
    return NextResponse.json({ error: "Search with at least 2 characters, or leave it empty to browse." }, { status: 400 });
  }
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1_000_000 || offset % 20 !== 0) {
    return NextResponse.json({ error: "Invalid catalog page." }, { status: 400 });
  }

  const rate = checkRateLimit(`kitsu-catalog:${getClientIp(request)}`, RATE_LIMITS.metadataSearch.max, RATE_LIMITS.metadataSearch.windowMs);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Catalog is being browsed quickly. Wait a minute and try again." },
      { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000))) } }
    );
  }

  const apiUrl = new URL("https://kitsu.io/api/edge/anime");
  apiUrl.searchParams.set("page[limit]", "20");
  apiUrl.searchParams.set("page[offset]", String(offset));
  
  apiUrl.searchParams.set("sort", "-userCount");
  if (query) apiUrl.searchParams.set("filter[text]", query);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(apiUrl, {
      headers: { Accept: "application/vnd.api+json" },
      cache: "no-store",
      signal: controller.signal,
    });
    if (response.status === 429) {
      return NextResponse.json({ error: "Kitsu is rate-limiting catalog requests. Wait a moment and retry." }, { status: 503 });
    }
    if (!response.ok) {
      return NextResponse.json({ error: "Kitsu catalog is temporarily unavailable." }, { status: 502 });
    }

    const payload = await response.json() as {
      data?: KitsuAnime[];
      links?: { next?: string | null };
      meta?: { count?: number };
    };
    const results = (payload.data ?? []).flatMap((item) => {
      const attributes = item.attributes;
      if (!item.id || !attributes) return [];
      const titles = attributes.titles ?? {};
      const title = text(titles.en || attributes.canonicalTitle || titles.en_jp || titles.ja_jp);
      if (!title) return [];
      const rating = Number(attributes.averageRating);
      const image = safePoster(attributes.posterImage?.large) || safePoster(attributes.posterImage?.medium) || safePoster(attributes.posterImage?.small);
      return [{
        id: item.id,
        title,
        alternateTitle: text(titles.en_jp || titles.ja_jp),
        synopsis: text(attributes.synopsis),
        posterUrl: image,
        subtype: text(attributes.subtype),
        status: text(attributes.status),
        startYear: text(attributes.startDate).slice(0, 4),
        episodeCount: Number.isFinite(attributes.episodeCount) ? attributes.episodeCount : null,
        ageRating: text(attributes.ageRating),
        averageRating: Number.isFinite(rating) ? Math.round(rating) / 10 : null,
        sourceUrl: `https://kitsu.io/anime/${encodeURIComponent(text(attributes.slug) || item.id)}`,
      }];
    });

    return NextResponse.json({
      results,
      offset,
      total: Number.isFinite(payload.meta?.count) ? payload.meta?.count : null,
      hasMore: Boolean(payload.links?.next),
    });
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError"
      ? "Kitsu catalog timed out. Try again."
      : "Could not load the Kitsu catalog. Try again shortly.";
    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
