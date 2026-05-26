"use client";

import { useState } from "react";
import { generateLyricsFromPrompt } from "@/components/generate-form/api";

interface UseLyricsGenerationOptions {
  initialPrompt: string;
  toast: (message: string, type: "success" | "error") => void;
  onUseLyrics: (lyrics: string) => void;
}

export function useLyricsGeneration({ initialPrompt, toast, onUseLyrics }: UseLyricsGenerationOptions) {
  const [showLyricsGenerator, setShowLyricsGenerator] = useState(Boolean(initialPrompt));
  const [lyricsPrompt, setLyricsPrompt] = useState(initialPrompt);
  const [generatedLyrics, setGeneratedLyrics] = useState("");
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);

  async function handleGenerateLyrics() {
    if (isGeneratingLyrics || !lyricsPrompt.trim()) return;
    setIsGeneratingLyrics(true);
    try {
      const data = await generateLyricsFromPrompt(lyricsPrompt.trim());
      if (data.ok && data.lyrics) {
        setGeneratedLyrics(data.lyrics);
        toast("Lyrics generated!", "success");
      } else {
        toast(data.error ?? "Lyrics generation failed", "error");
      }
    } catch {
      toast("Lyrics generation failed", "error");
    } finally {
      setIsGeneratingLyrics(false);
    }
  }

  function handleUseLyrics() {
    if (!generatedLyrics.trim()) return;
    onUseLyrics(generatedLyrics);
    toast("Lyrics applied!", "success");
  }

  return {
    showLyricsGenerator,
    setShowLyricsGenerator,
    lyricsPrompt,
    setLyricsPrompt,
    generatedLyrics,
    setGeneratedLyrics,
    isGeneratingLyrics,
    handleGenerateLyrics,
    handleUseLyrics,
  };
}
