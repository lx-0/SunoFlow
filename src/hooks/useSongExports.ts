"use client";

import { useEffect, useRef, useState } from "react";

type ExportFormat = "wav" | "midi" | "mp4";
type ExportStatus = "idle" | "converting" | "done" | "error";
type VideoStatus = "idle" | "polling" | "ready" | "error";

interface UseSongExportsOptions {
  songId: string;
  initialVideoUrl: string | null;
  toast: (message: string, variant?: "success" | "error" | "info") => void;
}

export function useSongExports({
  songId,
  initialVideoUrl,
  toast,
}: UseSongExportsOptions) {
  const [exports, setExports] = useState<Record<ExportFormat, { status: ExportStatus; taskId?: string; error?: string }>>({
    wav: { status: "idle" },
    midi: { status: "idle" },
    mp4: { status: "idle" },
  });

  const [videoUrl, setVideoUrl] = useState<string | null>(initialVideoUrl);
  const [videoStatus, setVideoStatus] = useState<VideoStatus>(initialVideoUrl ? "ready" : "idle");
  const [videoError, setVideoError] = useState<string | null>(null);
  const videoPollRef = useRef<NodeJS.Timeout | null>(null);

  function startVideoPolling(taskId: string) {
    if (videoPollRef.current) clearInterval(videoPollRef.current);
    setVideoStatus("polling");
    setVideoError(null);

    const poll = async () => {
      try {
        const res = await fetch(`/api/songs/${songId}/music-video/status?taskId=${encodeURIComponent(taskId)}`);
        const data = await res.json();
        if (!res.ok) {
          if (videoPollRef.current) clearInterval(videoPollRef.current);
          videoPollRef.current = null;
          setVideoStatus("error");
          setVideoError(data.error ?? "Failed to check video status");
          return;
        }
        if (data.status === "SUCCESS" && data.videoUrl) {
          if (videoPollRef.current) clearInterval(videoPollRef.current);
          videoPollRef.current = null;
          setVideoUrl(data.videoUrl);
          setVideoStatus("ready");
          toast("Music video is ready!", "success");
        } else if (data.status === "CREATE_TASK_FAILED" || data.status === "GENERATE_MP4_FAILED" || data.status === "CALLBACK_EXCEPTION") {
          if (videoPollRef.current) clearInterval(videoPollRef.current);
          videoPollRef.current = null;
          setVideoStatus("error");
          setVideoError(data.errorMessage ?? "Video generation failed");
          toast("Music video generation failed", "error");
        }
      } catch {
        if (videoPollRef.current) clearInterval(videoPollRef.current);
        videoPollRef.current = null;
        setVideoStatus("error");
        setVideoError("Network error while checking video status");
      }
    };

    poll();
    videoPollRef.current = setInterval(poll, 7000);
  }

  useEffect(() => {
    return () => {
      if (videoPollRef.current) clearInterval(videoPollRef.current);
    };
  }, []);

  async function handleExport(format: ExportFormat) {
    if (exports[format].status === "converting") return;
    setExports((prev) => ({ ...prev, [format]: { status: "converting" } }));

    const endpoints: Record<ExportFormat, string> = {
      wav: `/api/songs/${songId}/convert-wav`,
      midi: `/api/songs/${songId}/generate-midi`,
      mp4: `/api/songs/${songId}/music-video`,
    };

    const labels: Record<ExportFormat, string> = {
      wav: "WAV conversion",
      midi: "MIDI extraction",
      mp4: "Music video generation",
    };

    try {
      const res = await fetch(endpoints[format], { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setExports((prev) => ({ ...prev, [format]: { status: "error", error: data.error } }));
        toast(data.error ?? `${labels[format]} failed`, "error");
        return;
      }
      setExports((prev) => ({ ...prev, [format]: { status: "done", taskId: data.taskId } }));
      if (format === "mp4" && data.taskId) {
        startVideoPolling(data.taskId);
      } else {
        toast(`${labels[format]} started! Task ID: ${data.taskId}`, "success");
      }
    } catch {
      setExports((prev) => ({ ...prev, [format]: { status: "error", error: `${labels[format]} failed` } }));
      toast(`${labels[format]} failed`, "error");
    }
  }

  return {
    exports,
    videoUrl,
    videoStatus,
    videoError,
    handleExport,
  };
}
