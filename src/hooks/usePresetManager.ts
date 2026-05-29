"use client";

import { useState } from "react";
import type { GenerationPreset } from "@/components/generate-form/types";
import { deletePreset, savePreset } from "@/components/generate-form/api";

interface UsePresetManagerOptions {
  setPresets: React.Dispatch<React.SetStateAction<GenerationPreset[]>>;
  toast: (message: string, type: "success" | "error") => void;
  getFormState: () => {
    title: string;
    style: string;
    prompt: string;
    customMode: boolean;
    instrumental: boolean;
  };
  onApply: (fields: {
    title: string | null;
    style: string | null;
    prompt: string | null;
    instrumental: boolean;
    customMode: boolean;
  }) => void;
}

export function usePresetManager({
  setPresets,
  toast,
  getFormState,
  onApply,
}: UsePresetManagerOptions) {
  const [showPresetPicker, setShowPresetPicker] = useState(false);
  const [showPresetSaveDialog, setShowPresetSaveDialog] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [isSavingPreset, setIsSavingPreset] = useState(false);

  function applyPreset(preset: GenerationPreset) {
    onApply({
      title: preset.title,
      style: preset.stylePrompt,
      prompt: preset.lyricsPrompt,
      instrumental: preset.isInstrumental,
      customMode: preset.customMode,
    });
    setShowPresetPicker(false);
    toast(`Loaded "${preset.name}" preset`, "success");
  }

  async function handleDeletePreset(presetId: string) {
    const { ok, error } = await deletePreset(presetId);
    if (ok) {
      setPresets((prev) => prev.filter((p) => p.id !== presetId));
      toast("Preset deleted", "success");
      return;
    }
    toast(error ?? "Failed to delete preset", "error");
  }

  async function saveAsPreset() {
    if (!presetName.trim()) {
      toast("Please enter a preset name", "error");
      return;
    }
    const { title, style, prompt, customMode, instrumental } = getFormState();
    if (!style.trim() && !prompt.trim()) {
      toast("Fill in style or lyrics before saving", "error");
      return;
    }

    setIsSavingPreset(true);
    try {
      const result = await savePreset({
        name: presetName.trim(),
        title: title.trim() || null,
        stylePrompt: style.trim() || null,
        lyricsPrompt: customMode ? prompt.trim() || null : null,
        isInstrumental: instrumental,
        customMode,
      });

      if (result.ok && result.preset) {
        setPresets((prev) => [result.preset!, ...prev]);
        setShowPresetSaveDialog(false);
        setPresetName("");
        toast(`Preset "${result.preset.name}" saved!`, "success");
      } else {
        toast(result.error ?? "Failed to save preset", "error");
      }
    } catch {
      toast("Failed to save preset", "error");
    } finally {
      setIsSavingPreset(false);
    }
  }

  return {
    showPresetPicker,
    setShowPresetPicker,
    showPresetSaveDialog,
    setShowPresetSaveDialog,
    presetName,
    setPresetName,
    isSavingPreset,
    applyPreset,
    handleDeletePreset,
    saveAsPreset,
  };
}
