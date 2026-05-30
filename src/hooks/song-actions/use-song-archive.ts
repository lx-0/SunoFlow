"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { type ToastFn } from "@/components/Toast";
import { callApi } from "./call-api";


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
    const ok = await callApi(`/api/songs/${songId}/archive`, { method: "POST" }, toast, "Failed to archive song");
    if (!ok) return;
    setIsArchived(true);
    toast("Song archived", "success");
    router.push("/library");
  });

  const [handleRestore, archiving2] = useAsyncAction(async () => {
    const ok = await callApi(`/api/songs/${songId}/restore`, { method: "POST" }, toast, "Failed to restore song");
    if (!ok) return;
    setIsArchived(false);
    toast("Song restored", "success");
  });

  return { isArchived, archiving: archiving1 || archiving2, handleArchive, handleRestore };
}
