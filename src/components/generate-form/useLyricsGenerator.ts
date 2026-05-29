import { useState } from "react";
import { generateLyricsFromPrompt, autoFillGenerationFields } from "./api";

type ToastFn = (message: string, variant: "success" | "error") => void;

interface UseLyricsGeneratorParams {
  initialLyricsPrompt: string;
  initialAutoPrompt: string;
  onAutoFill: (fields: { title?: string; style?: string; lyricsPrompt?: string }) => void;
  onUseLyrics: (lyrics: string) => void;
  toast: ToastFn;
}

export function useLyricsGenerator({
  initialLyricsPrompt,
  initialAutoPrompt,
  onAutoFill,
  onUseLyrics,
  toast,
}: UseLyricsGeneratorParams) {
  const [showLyricsGenerator, setShowLyricsGenerator] = useState(Boolean(initialLyricsPrompt));
  const [lyricsPrompt, setLyricsPrompt] = useState(initialLyricsPrompt);
  const [generatedLyrics, setGeneratedLyrics] = useState("");
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);

  const [showAutoGenerate, setShowAutoGenerate] = useState(false);
  const [autoPrompt, setAutoPrompt] = useState(initialAutoPrompt);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);

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

  async function handleAutoGenerate() {
    if (isAutoGenerating || !autoPrompt.trim()) return;
    setIsAutoGenerating(true);
    try {
      const data = await autoFillGenerationFields(autoPrompt.trim());
      if (data.ok) {
        const fields: { title?: string; style?: string; lyricsPrompt?: string } = {};
        if (data.title) fields.title = data.title;
        if (data.style) fields.style = data.style;
        if (data.lyricsPrompt) {
          fields.lyricsPrompt = data.lyricsPrompt;
          setLyricsPrompt(data.lyricsPrompt);
          setShowLyricsGenerator(true);
        }
        onAutoFill(fields);
        toast("Fields filled! Generate lyrics next.", "success");
      } else {
        toast(data.error ?? "Auto-generation failed", "error");
      }
    } catch {
      toast("Auto-generation failed", "error");
    } finally {
      setIsAutoGenerating(false);
    }
  }

  return {
    showLyricsGenerator,
    setShowLyricsGenerator,
    lyricsPrompt,
    setLyricsPrompt,
    generatedLyrics,
    setGeneratedLyrics,
    isGeneratingLyrics,
    showAutoGenerate,
    setShowAutoGenerate,
    autoPrompt,
    setAutoPrompt,
    isAutoGenerating,
    handleGenerateLyrics,
    handleUseLyrics,
    handleAutoGenerate,
  };
}
