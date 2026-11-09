import { createAdminClient } from "@/lib/supabase/admin";
import { createSignedStorageUrl } from "@/lib/storage/signed-url";

export interface CatalogSeries {
  id: string;
  title: string;
  slug: string;
  description: string;
  content_type: string;
  cover_url: string | null;
  chapter_count: number;
  avg_rating: number;
  rating_count: number;
}

export async function loadCatalog(contentTypes: string[]): Promise<CatalogSeries[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("series")
    .select("id,title,slug,description,content_type,cover_path")
    .eq("status", "published")
    .in("content_type", contentTypes)
    .order("created_at", { ascending: false });
  if (error || !data) return [];

  const ids = data.map((item) => item.id);
  const [{ data: chapterRows }, { data: ratings }] = await Promise.all([
    supabase.from("chapters").select("series_id").in("series_id", ids).eq("status", "published"),
    supabase.from("ratings").select("series_id,rating").in("series_id", ids),
  ]);

  const chapterCounts = new Map<string, number>();
  for (const chapter of chapterRows ?? []) chapterCounts.set(chapter.series_id, (chapterCounts.get(chapter.series_id) ?? 0) + 1);
  const ratingsBySeries = new Map<string, number[]>();
  for (const row of ratings ?? []) ratingsBySeries.set(row.series_id, [...(ratingsBySeries.get(row.series_id) ?? []), row.rating]);

  return Promise.all(data.map(async (series) => {
    const values = ratingsBySeries.get(series.id) ?? [];
    const average = values.length ? values.reduce((sum, rating) => sum + rating, 0) / values.length : 0;
    return {
      id: series.id,
      title: series.title,
      slug: series.slug,
      description: series.description ?? "",
      content_type: series.content_type,
      cover_url: await createSignedStorageUrl(series.cover_path),
      chapter_count: chapterCounts.get(series.id) ?? 0,
      avg_rating: Math.round(average * 10) / 10,
      rating_count: values.length,
    };
  }));
}
