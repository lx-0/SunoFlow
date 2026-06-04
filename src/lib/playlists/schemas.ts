import { z } from "zod";

// Playlist request schemas live in @sunoflow/core (shared 1:1 with the mobile
// client). Re-exported here so existing "@/lib/playlists/schemas" importers keep
// working. Web-only schemas (togglePublishBody) stay below.
export {
  createPlaylistBody,
  updatePlaylistBody,
  addPlaylistSongBody,
  reorderPlaylistSongsBody,
  type CreatePlaylistBody,
} from "@sunoflow/core";

export const togglePublishBody = z
  .object({
    genre: z
      .preprocess(
        (value) => {
          if (typeof value !== "string") return value;
          return value.trim();
        },
        z.string().min(1),
      )
      .optional(),
  })
  .strict();
