"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { type ToastFn } from "@/components/Toast";


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

  const [handleArchive, archiving1] = useAsyncAction(async () => {
    const res = await fetch(`/api/songs/${songId}/archive`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast(data.error || "Failed to archive song", "error");
      return;
    }
    setIsArchived(true);
    toast("Song archived", "success");
    router.push("/library");
  });

  const [handleRestore, archiving2] = useAsyncAction(async () => {
    const res = await fetch(`/api/songs/${songId}/restore`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast(data.error || "Failed to restore song", "error");
      return;
    }
    setIsArchived(false);
    toast("Song restored", "success");
  });

  return { isArchived, archiving: archiving1 || archiving2, handleArchive, handleRestore };
}
