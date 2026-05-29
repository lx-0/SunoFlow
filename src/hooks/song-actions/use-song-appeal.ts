"use client";

import { useCallback, useState } from "react";

type ToastFn = (message: string, type?: "success" | "error" | "info") => void;

interface UseSongAppealParams {
  songId: string;
  toast: ToastFn;
}

export function useSongAppeal({ songId, toast }: UseSongAppealParams) {
  const [appealOpen, setAppealOpen] = useState(false);
  const [appealReason, setAppealReason] = useState("");
  const [appealSubmitting, setAppealSubmitting] = useState(false);
  const [appealStatus, setAppealStatus] = useState<"none" | "pending" | "approved" | "rejected">("none");

  const handleSubmitAppeal = useCallback(async () => {
    if (appealReason.trim().length < 10) return;
    setAppealSubmitting(true);
    try {
      const res = await fetch("/api/appeals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId, reason: appealReason.trim() }),
      });
      if (res.status === 409) {
        setAppealStatus("pending");
        setAppealOpen(false);
        toast("You already have a pending appeal for this song.");
        return;
      }
      if (res.ok) {
        setAppealStatus("pending");
        setAppealOpen(false);
        toast("Appeal submitted. We'll review it shortly.");
      } else {
        const data = await res.json().catch(() => ({}));
        toast(data.error || "Failed to submit appeal. Please try again.");
      }
    } catch {
      toast("Failed to submit appeal. Please try again.");
    } finally {
      setAppealSubmitting(false);
    }
  }, [appealReason, songId, toast]);

  return {
    appealOpen,
    setAppealOpen,
    appealReason,
    setAppealReason,
    appealSubmitting,
    appealStatus,
    handleSubmitAppeal,
  };
}
