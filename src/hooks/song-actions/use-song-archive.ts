"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

type ToastFn = (message: string, type?: "success" | "error" | "info") => void;

interface UseSongArchiveParams {
  songId: string;
  initialIsArchived: boolean;
  toast: ToastFn;
}

export function useSongArchive({
  songId,
  initialIsArchived,
  toast,
}: UseSongArchiveParams) {
  const router = useRouter();
  const [isArchived, setIsArchived] = useState(initialIsArchived);
  const [archiving, setArchiving] = useState(false);

  const handleArchive = useCallback(async () => {
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
      router.push("/library");
    } catch {
      toast("Failed to archive song", "error");
    } finally {
      setArchiving(false);
    }
  }, [songId, toast, router]);

  const handleRestore = useCallback(async () => {
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
  }, [songId, toast]);

  return { isArchived, archiving, handleArchive, handleRestore };
}
