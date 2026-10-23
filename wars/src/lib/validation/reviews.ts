import { z } from "zod";

export const reviewSchema = z.object({
  series_id: z.string().uuid(),
  chapter_id: z.string().uuid().optional(),
  content: z
    .string()
    .min(1, "Review cannot be empty")
    .max(5000, "Review is too long"),
});

export const ratingSchema = z.object({
  series_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
});

export type ReviewInput = z.infer<typeof reviewSchema>;
export type RatingInput = z.infer<typeof ratingSchema>;
