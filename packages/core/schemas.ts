import { z } from "zod";

// Shared request-body schemas — the single definition of these API contracts,
// used by the web routes (server-side validation) AND the mobile client (request
// typing + optional pre-send validation). Pure zod, no platform deps.

export const createPlaylistBody = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  description: z.string().max(1000, "Description must be 1000 characters or less").optional(),
});
export type CreatePlaylistBody = z.infer<typeof createPlaylistBody>;

export const updatePlaylistBody = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().max(1000).nullable().optional(),
  })
  .strict()
  .refine((value) => value.name !== undefined || value.description !== undefined, {
    message: "At least one of name or description is required",
  });
export type UpdatePlaylistBody = z.infer<typeof updatePlaylistBody>;

export const addPlaylistSongBody = z.object({ songId: z.string().min(1) }).strict();
export type AddPlaylistSongBody = z.infer<typeof addPlaylistSongBody>;

export const reorderPlaylistSongsBody = z.object({ songIds: z.array(z.string().min(1)) }).strict();
export type ReorderPlaylistSongsBody = z.infer<typeof reorderPlaylistSongsBody>;

export const recordHistoryRequestSchema = z.object({
  songId: z.string().min(1, "songId is required"),
});
export type RecordHistoryRequest = z.infer<typeof recordHistoryRequestSchema>;
