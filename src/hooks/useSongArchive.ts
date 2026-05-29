"use client";

import { useState } from "react";

interface UseSongArchiveOptions {
  songId: string;
  initialIsArchived: boolean;
  toast: (message: string, variant?: "success" | "error" | "info") => void;
  onArchived?: () => void;
}

export function useSongArchive({
  songId,
  initialIsArchived,
  toast,
  onArchived,
}: UseSongArchiveOptions) {
  const [isArchived, setIsArchived] = useState(initialIsArchived);
  const [archiving, setArchiving] = useState(false);
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);

  async function handleArchive() {
    setArchiving(true);
    try {
      const res = await fetch(`/api/songs/${songId}/archive`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast(data.error || "Failed to archive song", "error");
        return;
      }
      setIsArchived(true);
      toast("Song archived", "success");
      onArchived?.();
    } catch {
      toast("Failed to archive song", "error");
    } finally {
      setArchiving(false);
    }
  }

  async function handleRestore() {
    setArchiving(true);
    try {
      const res = await fetch(`/api/songs/${songId}/restore`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast(data.error || "Failed to restore song", "error");
        return;
      }
      setIsArchived(false);
      toast("Song restored", "success");
    } catch {
      toast("Failed to restore song", "error");
    } finally {
      setArchiving(false);
    }
  }

  function openConfirmArchive() {
    setConfirmArchiveOpen(true);
  }

  function closeConfirmArchive() {
    setConfirmArchiveOpen(false);
  }

  function confirmAndArchive() {
    setConfirmArchiveOpen(false);
    handleArchive();
  }

  return {
    isArchived,
    archiving,
    confirmArchiveOpen,
    openConfirmArchive,
    closeConfirmArchive,
    confirmAndArchive,
    handleRestore,
  };
}
