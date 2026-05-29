import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "../Toast";
import { fetchWithTimeout } from "@/lib/fetch-client";

interface Timestamp {
  lineIndex: number;
  startTime: number;
}

export function useTimestampManager(
  songId: string,
  isCurrentSong: boolean,
  currentTime: number,
  isPlaying: boolean
) {
  const { toast } = useToast();

  const [timestamps, setTimestamps] = useState<Timestamp[]>([]);
  const [isSettingTimestamps, setIsSettingTimestamps] = useState(false);
  const [pendingTimestamps, setPendingTimestamps] = useState<Map<number, number>>(new Map());

  const activeLineRef = useRef<HTMLDivElement>(null);

  const tsMap = useMemo(
    () => new Map<number, number>(timestamps.map((t) => [t.lineIndex, t.startTime])),
    [timestamps]
  );

  const activeLineIndex = (() => {
    if (!isCurrentSong || !isPlaying || timestamps.length === 0) return -1;
    let idx = -1;
    for (const t of timestamps) {
      if (t.startTime <= currentTime) idx = t.lineIndex;
      else break;
    }
    return idx;
  })();

  useEffect(() => {
    fetchWithTimeout(`/api/songs/${songId}/lyrics/timestamps`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setTimestamps(
            (data.timestamps as Timestamp[]).sort((a, b) => a.startTime - b.startTime)
          );
        }
      });
  }, [songId]);

  useEffect(() => {
    if (activeLineRef.current && isPlaying) {
      activeLineRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activeLineIndex, isPlaying]);

  const handleLineTap = useCallback(
    (lineIndex: number) => {
      if (!isSettingTimestamps) return;
      if (!isCurrentSong) {
        toast("Play this song to set timestamps");
        return;
      }
      setPendingTimestamps((prev) => {
        const next = new Map(prev);
        next.set(lineIndex, currentTime);
        return next;
      });
    },
    [isSettingTimestamps, isCurrentSong, currentTime, toast]
  );

  const handleSaveTimestamps = useCallback(async () => {
    const merged = new Map(tsMap);
    pendingTimestamps.forEach((v, k) => merged.set(k, v));
    const entries = Array.from(merged.entries()).map(([lineIndex, startTime]) => ({
      lineIndex,
      startTime,
    }));
    try {
      const res = await fetchWithTimeout(`/api/songs/${songId}/lyrics/timestamps`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timestamps: entries }),
      });
      if (!res.ok) throw new Error("save failed");
      setTimestamps(entries.sort((a, b) => a.startTime - b.startTime));
      setPendingTimestamps(new Map());
      setIsSettingTimestamps(false);
      toast("Timestamps saved");
    } catch {
      toast("Failed to save timestamps");
    }
  }, [songId, tsMap, pendingTimestamps, toast]);

  function startSettingTimestamps() {
    setIsSettingTimestamps(true);
  }

  function cancelSettingTimestamps() {
    setPendingTimestamps(new Map());
    setIsSettingTimestamps(false);
  }

  function clearPendingTimestamps() {
    setPendingTimestamps(new Map());
  }

  return {
    timestamps,
    isSettingTimestamps,
    pendingTimestamps,
    tsMap,
    activeLineIndex,
    activeLineRef,
    handleLineTap,
    handleSaveTimestamps,
    startSettingTimestamps,
    cancelSettingTimestamps,
    clearPendingTimestamps,
  };
}
