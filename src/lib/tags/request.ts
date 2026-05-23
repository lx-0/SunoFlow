import { z } from "zod";

export const createTagBodySchema = z.object({
  name: z.string().optional(),
  color: z.string().optional(),
});

export const updateTagBodySchema = z.object({
  name: z.string().optional(),
  color: z.string().optional(),
});

export const addSongTagBodySchema = z.object({
  tagId: z.string().optional(),
  name: z.string().optional(),
});

export type CreateTagBody = z.infer<typeof createTagBodySchema>;
export type UpdateTagBody = z.infer<typeof updateTagBodySchema>;
export type AddSongTagBody = z.infer<typeof addSongTagBodySchema>;
