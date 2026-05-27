"use client";

import { useRef, useState } from "react";
import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";

type AppealStatus = "none" | "pending" | "approved" | "rejected";

interface UseSongAppealOptions {
  songId: string;
  toast: (message: string, variant?: "success" | "error" | "info") => void;
}

export function useSongAppeal({ songId, toast }: UseSongAppealOptions) {
  const [appealOpen, setAppealOpen] = useState(false);
  const [appealReason, setAppealReason] = useState("");
  const [appealSubmitting, setAppealSubmitting] = useState(false);
  const [appealStatus, setAppealStatus] = useState<AppealStatus>("none");
  const appealDialogRef = useRef<HTMLDivElement>(null);
  useDialogFocusTrap(appealDialogRef, appealOpen, () => setAppealOpen(false));

  async function handleSubmitAppeal() {
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
  }

  return {
    appealOpen,
    setAppealOpen,
    appealReason,
    setAppealReason,
    appealSubmitting,
    appealStatus,
    appealDialogRef,
    handleSubmitAppeal,
  };
}
