"use client";

import { useState } from "react";
import { useToast } from "../Toast";

type TrackSourceType = "library" | "upload" | "url";

interface TrackState {
  sourceType: TrackSourceType;
  songId: string | null;
  songTitle: string | null;
  songImageUrl: string | null;
  file: File | null;
  previewUrl: string | null;
  duration: number | null;
  fileUrl: string;
}

interface RateLimitStatus {
  remaining: number;
  limit: number;
  resetAt: string;
}

function fileToBase64(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(f);
  });
}

async function buildTrackPayload(track: TrackState) {
  if (track.sourceType === "library" && track.songId) {
    return { songId: track.songId };
  }
  if (track.sourceType === "upload" && track.file) {
    const base64Data = await fileToBase64(track.file);
    return { base64Data };
  }
  if (track.sourceType === "url" && track.fileUrl.trim()) {
    return { fileUrl: track.fileUrl.trim() };
  }
  return null;
}

function isTrackReady(track: TrackState): boolean {
  return !!(
    (track.sourceType === "library" && track.songId) ||
    (track.sourceType === "upload" && track.file) ||
    (track.sourceType === "url" && track.fileUrl.trim())
  );
}

export function useMashupSubmission(
  trackA: TrackState,
  trackB: TrackState,
  trackSong: (id: string, title: string) => void,
  setRateLimit: (rl: RateLimitStatus) => void
) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [style, setStyle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [instrumental, setInstrumental] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const trackAReady = isTrackReady(trackA);
  const trackBReady = isTrackReady(trackB);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!trackAReady || !trackBReady) {
      toast("Please select two tracks for the mashup.", "error");
      return;
    }

    setSubmitting(true);

    try {
      const [payloadA, payloadB] = await Promise.all([
        buildTrackPayload(trackA),
        buildTrackPayload(trackB),
      ]);

      if (!payloadA || !payloadB) {
        toast("Could not prepare track data. Please try again.", "error");
        setSubmitting(false);
        return;
      }

      const res = await fetch("/api/mashup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackA: payloadA,
          trackB: payloadB,
          title: title.trim() || undefined,
          prompt: prompt.trim() || undefined,
          style: style.trim() || undefined,
          instrumental,
        }),
      });

      const data = await res.json();

      if (data.rateLimit) setRateLimit(data.rateLimit);

      if (!res.ok && res.status !== 201) {
        toast(data.error || "Mashup generation failed", "error");
        setSubmitting(false);
        return;
      }

      if (data.error) {
        toast(data.error, "error");
      } else {
        toast("Mashup generation started!", "success");
      }

      if (data.songs?.length) {
        for (const song of data.songs) {
          trackSong(song.id, song.title);
        }
      }

      setSubmitting(false);
    } catch {
      toast("Failed to start mashup. Please try again.", "error");
      setSubmitting(false);
    }
  };

  return {
    title,
    setTitle,
    style,
    setStyle,
    prompt,
    setPrompt,
    instrumental,
    setInstrumental,
    submitting,
    trackAReady,
    trackBReady,
    handleSubmit,
  };
}
