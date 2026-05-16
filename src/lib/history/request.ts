import { z } from "zod";

export const recordHistoryRequestSchema = z.object({
  songId: z.string().min(1, "songId is required"),
});

export type RecordHistoryRequest = z.infer<typeof recordHistoryRequestSchema>;
