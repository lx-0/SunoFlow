"use client";

import { useState } from "react";
import { APP_NAME, APP_URL } from "@/lib/branding";
import { useToast } from "@/components/Toast";

interface UsePublicSongEmbedOptions {
  songId: string;
  title: string;
}

export function usePublicSongEmbed({ songId, title }: UsePublicSongEmbedOptions) {
  const [embedOpen, setEmbedOpen] = useState(false);
  const [embedTheme, setEmbedTheme] = useState<"dark" | "light">("dark");
  const [embedWidth, setEmbedWidth] = useState("100%");
  const [embedCopied, setEmbedCopied] = useState(false);
  const { toast } = useToast();

  function getEmbedCode() {
    const origin = typeof window !== "undefined" ? window.location.origin : APP_URL;
    const src = `${origin}/embed/${songId}?theme=${embedTheme}`;
    const widthAttr = embedWidth === "100%" ? `width="100%"` : `width="${embedWidth}"`;
    return `<iframe src="${src}" ${widthAttr} height="96" style="border:none;border-radius:12px;overflow:hidden;" allow="autoplay" title="${title} — ${APP_NAME}"></iframe>`;
  }

  async function handleCopyEmbed() {
    try {
      await navigator.clipboard.writeText(getEmbedCode());
      setEmbedCopied(true);
      setTimeout(() => setEmbedCopied(false), 2000);
    } catch {
      toast("Could not copy embed code.", "error");
    }
  }

  return {
    embedOpen,
    setEmbedOpen,
    embedTheme,
    setEmbedTheme,
    embedWidth,
    setEmbedWidth,
    embedCopied,
    getEmbedCode,
    handleCopyEmbed,
  };
}
