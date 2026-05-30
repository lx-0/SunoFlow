"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StemTrack } from "@/components/StemsPlayer";
import { apiGet, apiPost } from "@/lib/api-client";

interface UseSongStemsOptions {
  songId: string;
  songTitle: string | null;
  toast: (message: string, variant?: "success" | "error" | "info") => void;
}

export function useSongStems({ songId, songTitle, toast }: UseSongStemsOptions) {
  const [stems, setStems] = useState<StemTrack[]>([]);
  const [separateModalOpen, setSeparateModalOpen] = useState(false);
  const [separateSubmitting, setSeparateSubmitting] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const stemPollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (stemPollRef.current) clearTimeout(stemPollRef.current);
    };
  }, []);

  const loadChildStems = useCallback(async (parentStemId: string) => {
    try {
      const data = await apiGet<{ stems: { id: string; title: string | null; audioUrl: string | null; generationStatus: string; duration: number | null }[] }>(
        `/api/songs/${parentStemId}/stems`
      );
      const children: StemTrack[] = (data.stems ?? []).map(
        (s) => ({
          id: s.id,
          title: s.title,
          audioUrl: s.audioUrl,
          generationStatus: s.generationStatus,
          duration: s.duration,
        })
      );
      if (children.length > 0) {
        setStems((prev) => {
          const existingIds = new Set(prev.map((s) => s.id));
          const newOnes = children.filter((c) => !existingIds.has(c.id));
          return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
        });
        children.forEach((c) => {
          if (c.generationStatus !== "ready" && c.generationStatus !== "failed") {
            pollStemStatus(c.id);
          }
        });
      }
    } catch {
      // non-fatal
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pollStemStatus = useCallback((stemId: string) => {
    const poll = async () => {
      try {
        const data = await apiGet<{ song: { generationStatus: string; audioUrl: string | null; duration: number | null } }>(
          `/api/songs/${stemId}/status`
        );
        const updated = data.song;
        setStems((prev) =>
          prev.map((s) =>
            s.id === stemId
              ? { ...s, generationStatus: updated.generationStatus, audioUrl: updated.audioUrl, duration: updated.duration }
              : s
          )
        );
        if (updated.generationStatus === "ready") {
          loadChildStems(stemId);
          return;
        }
        if (updated.generationStatus === "failed") {
          return;
        }
        stemPollRef.current = setTimeout(poll, 5000);
      } catch {
        stemPollRef.current = setTimeout(poll, 10000);
      }
    };
    stemPollRef.current = setTimeout(poll, 3000);
  }, [loadChildStems]);

  const separate = useCallback(async (type: "separate_vocal" | "split_stem") => {
    if (separateSubmitting) return;
    setSeparateSubmitting(true);
    try {
      const result = await apiPost<{ song: { id: string; title: string | null; audioUrl: string | null; generationStatus: string; duration: number | null } }>(
        `/api/songs/${songId}/separate-vocals`,
        { type }
      );
      toast("Vocal separation started!", "success");
      setSeparateModalOpen(false);
      const newStem: StemTrack = {
        id: result.song.id,
        title: result.song.title,
        audioUrl: result.song.audioUrl,
        generationStatus: result.song.generationStatus,
        duration: result.song.duration,
      };
      setStems((prev) => [...prev, newStem]);
      if (newStem.generationStatus === "pending") {
        pollStemStatus(newStem.id);
      }
    } catch {
      toast("Vocal separation failed", "error");
    } finally {
      setSeparateSubmitting(false);
    }
  }, [songId, separateSubmitting, toast, pollStemStatus]);

  const downloadStem = useCallback(async (stem: StemTrack) => {
    if (!stem.audioUrl) return;
    try {
      const a = document.createElement("a");
      a.href = stem.audioUrl;
      a.download = `${stem.title || "stem"}.mp3`;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      toast("Download failed", "error");
    }
  }, [toast]);

  const downloadAllStems = useCallback(async () => {
    const readyStems = stems.filter((s) => s.generationStatus === "ready" && s.audioUrl);
    if (readyStems.length === 0 || downloadingAll) return;
    setDownloadingAll(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      await Promise.all(
        readyStems.map(async (stem, idx) => {
          const res = await fetch(stem.audioUrl!);
          const blob = await res.blob();
          const name = `${stem.title || `stem-${idx + 1}`}.mp3`.replace(/[/\\:*?"<>|]/g, "_");
          zip.file(name, blob);
        })
      );
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${songTitle || "stems"}-stems.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast("Failed to download stems", "error");
    } finally {
      setDownloadingAll(false);
    }
  }, [stems, downloadingAll, songTitle, toast]);

  return {
    stems,
    separateModalOpen,
    separateSubmitting,
    downloadingAll,
    openSeparateModal: () => setSeparateModalOpen(true),
    closeSeparateModal: () => setSeparateModalOpen(false),
    separate,
    downloadStem,
    downloadAllStems,
  };
}
