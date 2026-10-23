import { z } from "zod";

export const seriesSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  description: z.string().max(5000).optional(),
  content_type: z.enum(["manga", "light_novel"]),
  cover_path: z.string().optional(),
  status: z.enum(["draft", "published", "archived"]).default("published"),
});

export const chapterSchema = z.object({
  series_id: z.string().uuid(),
  title: z.string().min(1, "Title is required").max(200),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/),
  chapter_number: z.number().positive(),
  volume_number: z.number().positive().optional(),
  status: z.enum(["draft", "published", "archived"]).default("published"),
});

export type SeriesInput = z.infer<typeof seriesSchema>;
export type ChapterInput = z.infer<typeof chapterSchema>;
