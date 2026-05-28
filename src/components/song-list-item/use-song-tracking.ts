import { useCallback, useEffect, useState } from "react";
import { useTrackPendingSong } from "@/hooks/useTrackPendingSong";
import { useToast } from "../Toast";
import type { Song } from "@prisma/client";

export function useSongTracking(
  initialSong: Song,
  onUpdate: (updated: Song) => void,
) {
  const { toast } = useToast();
  const [song, setSong] = useState(initialSong);

  useEffect(() => {
    setSong(initialSong);
  }, [initialSong]);

  const handleUpdate = useCallback(
    (updated: Song) => {
      if (
        song.generationStatus === "pending" &&
        updated.generationStatus !== "pending"
      ) {
        if (updated.generationStatus === "ready") {
          const vc =
            (updated as Song & { variationCount?: number }).variationCount ?? 0;
          const msg =
            vc > 0
              ? `${vc + 1} versions ready — click to compare`
              : `"${updated.title ?? "Song"}" is ready!`;
          toast(msg, "success");
        } else if (updated.generationStatus === "failed") {
          toast(`"${updated.title ?? "Song"}" generation failed`, "error");
        }
      }
      setSong(updated);
      onUpdate(updated);
    },
    [onUpdate, song.generationStatus, toast],
  );

  useTrackPendingSong(song, handleUpdate);

  const isPending = song.generationStatus === "pending";
  const isFailed = song.generationStatus === "failed";
  const hasAudio = Boolean(song.audioUrl) && !isPending;

  return { song, setSong, isPending, isFailed, hasAudio };
}
