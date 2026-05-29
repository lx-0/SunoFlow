"use client";

import { useMemo, useRef, useState } from "react";
import type { Song } from "@prisma/client";
import { exportAsZip, exportAsM3U, type ExportableSong } from "@/lib/export";
import { useToast } from "@/components/Toast";
import { useOutsideClick } from "@/hooks/useOutsideClick";

export function useLibraryExport(songs: Song[]) {
  const { toast } = useToast();

  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ completed: number; total: number } | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useOutsideClick(exportMenuRef, () => setExportMenuOpen(false), exportMenuOpen);

  const exportableSongs = useMemo<ExportableSong[]>(() => {
    return songs
      .filter((s) => s.audioUrl && s.generationStatus === "ready")
      .map((s) => ({
        id: s.id,
        title: s.title,
        audioUrl: s.audioUrl!,
        tags: s.tags,
        duration: s.duration,
        createdAt: s.createdAt,
      }));
  }, [songs]);

  async function handleExportZip() {
    setExportMenuOpen(false);
    if (exportableSongs.length === 0) {
      toast("No songs available to export", "info");
      return;
    }
    if (exportableSongs.length > 50) {
      toast(`Exporting ${exportableSongs.length} songs — this may take a while`, "info");
    }
    setExporting(true);
    setExportProgress({ completed: 0, total: exportableSongs.length });
    try {
      await exportAsZip(exportableSongs, (completed, total) => {
        setExportProgress({ completed, total });
      });
      toast("ZIP export complete!", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Export failed", "error");
    } finally {
      setExporting(false);
      setExportProgress(null);
    }
  }

  function handleExportM3U() {
    setExportMenuOpen(false);
    if (exportableSongs.length === 0) {
      toast("No songs available to export", "info");
      return;
    }
    try {
      exportAsM3U(exportableSongs);
      toast("M3U playlist exported!", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Export failed", "error");
    }
  }

  return {
    exportMenuOpen,
    setExportMenuOpen,
    exporting,
    exportProgress,
    exportMenuRef,
    handleExportZip,
    handleExportM3U,
  };
}
