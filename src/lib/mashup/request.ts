import { z } from "zod";

const trackSourceSchema = z.object({
  base64Data: z.string().min(1).optional(),
  fileUrl: z.string().url().optional(),
  songId: z.string().min(1).optional(),
}).refine(
  (track) => Boolean(track.base64Data || track.fileUrl || track.songId),
  { message: "Each track must include songId, fileUrl, or base64Data" },
);

export const mashupRequestSchema = z.object({
  trackA: trackSourceSchema,
  trackB: trackSourceSchema,
  title: z.string().trim().min(1).optional(),
  prompt: z.string().trim().min(1).optional(),
  style: z.string().trim().min(1).optional(),
  instrumental: z.boolean().optional(),
});

export type MashupRequest = z.infer<typeof mashupRequestSchema>;
