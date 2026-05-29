"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useOutsideClick } from "@/hooks/useOutsideClick";

interface SongLike {
  id: string;
  lyrics?: string | null;
}

export function usePlayerPanels(currentSong: SongLike | null) {
  const [showUpNext, setShowUpNext] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showEQ, setShowEQ] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const optionsMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname?.includes("/library/")) {
      setShowLyrics(false);
    }
  }, [pathname]);

  useEffect(() => {
    if (!currentSong?.lyrics) {
      setShowLyrics(false);
    }
  }, [currentSong?.id, currentSong?.lyrics]);

  useOutsideClick(
    optionsMenuRef,
    () => setShowOptionsMenu(false),
    showOptionsMenu
  );

  const handleCoverClick = useCallback(() => {
    if (!currentSong) return;
    const isDesktop =
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 768px)").matches;
    if (isDesktop) {
      router.push(`/library/${currentSong.id}`);
    } else {
      setIsDrawerOpen(true);
    }
  }, [currentSong, router]);

  return {
    showUpNext,
    setShowUpNext,
    showLyrics,
    setShowLyrics,
    showEQ,
    setShowEQ,
    showOptionsMenu,
    setShowOptionsMenu,
    isDrawerOpen,
    setIsDrawerOpen,
    optionsMenuRef,
    handleCoverClick,
  };
}
