"use client";

import { useState, useRef } from "react";
import type { TrackState, RateLimitStatus } from "./types";
import { buildTrackPayload } from "./types";

function isTrackReady(track: TrackState): boolean {
  return !!(
    (track.sourceType === "library" && track.songId) ||
    (track.sourceType === "upload" && track.file) ||
    (track.sourceType === "url" && track.fileUrl.trim())
  );
}

export function useMashupSubmit(params: {
  trackA: TrackState;
  trackB: TrackState;
  toast: (msg: string, type?: "success" | "error" | "info") => void;
  trackSong: (id: string, title: string | null) => void;
}) {
  const { trackA, trackB, toast, trackSong } = params;

  const [title, setTitle] = useState("");
  const [style, setStyle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [instrumental, setInstrumental] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rateLimit, setRateLimit] = useState<RateLimitStatus | null>(null);

  const rateLimitFetched = useRef(false);
  if (!rateLimitFetched.current) {
    rateLimitFetched.current = true;
    fetch("/api/rate-limit/status")
      .then((r) => r.json())
      .then((d) => setRateLimit(d))
      .catch(() => {});
  }

  const trackAReady = isTrackReady(trackA);
  const trackBReady = isTrackReady(trackB);
  const rateLimitExhausted = rateLimit && rateLimit.remaining <= 0;

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
    rateLimit,
    rateLimitExhausted,
    trackAReady,
    trackBReady,
    handleSubmit,
  };
}
