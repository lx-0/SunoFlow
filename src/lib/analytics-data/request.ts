import { z } from "zod";

export const recordPlayRequestSchema = z.object({
  songId: z.string().min(1, "songId is required"),
  durationSec: z.number().int().nonnegative().optional(),
});

export type RecordPlayRequest = z.infer<typeof recordPlayRequestSchema>;
