"use client";

import { useState } from "react";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { type ToastFn } from "@/components/Toast";
import { apiPost } from "@/lib/api-client";
import { HttpError } from "@/components/QueryProvider";


interface UseSongAppealParams {
  songId: string;
  toast: ToastFn;
}

export function useSongAppeal({ songId, toast }: UseSongAppealParams) {
  const [appealOpen, setAppealOpen] = useState(false);
  const [appealReason, setAppealReason] = useState("");
  const [appealStatus, setAppealStatus] = useState<"none" | "pending" | "approved" | "rejected">("none");

  const [handleSubmitAppeal, appealSubmitting] = useAsyncAction(async () => {
    if (appealReason.trim().length < 10) return;
    try {
      await apiPost("/api/appeals", { songId, reason: appealReason.trim() });
      setAppealStatus("pending");
      setAppealOpen(false);
      toast("Appeal submitted. We'll review it shortly.");
    } catch (e) {
      if (e instanceof HttpError && e.status === 409) {
        setAppealStatus("pending");
        setAppealOpen(false);
        toast("You already have a pending appeal for this song.");
      } else {
        toast("Failed to submit appeal. Please try again.");
      }
    }
  });

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
