import { z } from "zod";

export const chatMessageSchema = z.object({
  room_id: z.string().uuid(),
  content: z
    .string()
    .min(1, "Message cannot be empty")
    .max(4000, "Message is too long"),
  message_type: z.enum(["text", "image"]).default("text"),
  reply_to: z.string().uuid().optional(),
});

export const reactionSchema = z.object({
  message_id: z.string().uuid(),
  reaction: z
    .string()
    .min(1)
    .max(8)
    .regex(/^[\p{Emoji}]+$/u, "Must be a valid emoji"),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type ReactionInput = z.infer<typeof reactionSchema>;
