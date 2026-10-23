import { z } from "zod";

export const feedbackSchema = z.object({
  name: z.string().max(60).optional(),
  content: z
    .string()
    .min(1, "Feedback cannot be empty")
    .max(2000, "Feedback is too long"),
});

export const reportSchema = z.object({
  target_type: z.enum(["message", "review", "user"]),
  target_id: z.string().uuid(),
  reason: z
    .string()
    .min(1, "Reason is required")
    .max(1000, "Reason is too long"),
});

export const banAppealSchema = z.object({
  content: z
    .string()
    .min(1, "Appeal cannot be empty")
    .max(3000, "Appeal is too long"),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;
export type ReportInput = z.infer<typeof reportSchema>;
export type BanAppealInput = z.infer<typeof banAppealSchema>;
