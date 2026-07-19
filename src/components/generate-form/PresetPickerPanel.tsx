"use client";

import { useState } from "react";
import { Bookmark, Trash2, SlidersHorizontal } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "../Toast";
import { deletePreset, savePreset } from "./api";
import type { GenerationPreset } from "./types";

interface PresetPickerPanelProps {
  presets: GenerationPreset[];
  formState: {
    title: string;
    style: string;
    prompt: string;
    customMode: boolean;
    instrumental: boolean;
  };
  onApplyPreset: (preset: GenerationPreset) => void;
  onPresetsChange: (updater: (prev: GenerationPreset[]) => GenerationPreset[]) => void;
}

export function PresetPickerPanel({
  presets,
  formState,
  onApplyPreset,
  onPresetsChange,
}: PresetPickerPanelProps) {
  const { toast } = useToast();
  const [showPresetPicker, setShowPresetPicker] = useState(false);
  const [showPresetSaveDialog, setShowPresetSaveDialog] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [isSavingPreset, setIsSavingPreset] = useState(false);

  async function handleDeletePreset(presetId: string) {
    const { ok, error } = await deletePreset(presetId);
    if (ok) {
      onPresetsChange((prev) => prev.filter((p) => p.id !== presetId));
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
    if (!formState.style.trim() && !formState.prompt.trim()) {
      toast("Fill in style or lyrics before saving", "error");
      return;
    }

    setIsSavingPreset(true);
    try {
      const result = await savePreset({
        name: presetName.trim(),
        title: formState.title.trim() || null,
        stylePrompt: formState.style.trim() || null,
        lyricsPrompt: formState.customMode ? formState.prompt.trim() || null : null,
        isInstrumental: formState.instrumental,
        customMode: formState.customMode,
      });

      if (result.ok && result.preset) {
        onPresetsChange((prev) => [result.preset!, ...prev]);
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

  return (
    <>
      {/* Preset Picker Buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setShowPresetPicker(!showPresetPicker)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-xl hover:bg-teal-100 dark:hover:bg-teal-900/30 transition-colors"
        >
          <Icon icon={SlidersHorizontal} className="h-4 w-4" />
          Presets{presets.length > 0 ? ` (${presets.length})` : ""}
        </button>
        <button
          type="button"
          onClick={() => setShowPresetSaveDialog(!showPresetSaveDialog)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-secondary bg-surface-raised border border-border rounded-xl hover:bg-surface-hover transition-colors"
        >
          <Icon icon={Bookmark} fill="currentColor" className="h-4 w-4" />
          Save as preset
        </button>
      </div>

      {/* Preset Picker Panel */}
      {showPresetPicker && (
        <div className="bg-surface-raised border border-border rounded-xl p-3 space-y-3">
          <p className="text-xs font-semibold text-secondary uppercase tracking-wide">My Presets</p>
          {presets.length === 0 ? (
            <p className="text-sm text-secondary text-center py-2">
              No presets yet — save your current form state as a preset.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {presets.map((p) => (
                <div key={p.id} className="relative group">
                  <button
                    type="button"
                    onClick={() => onApplyPreset(p)}
                    className="w-full text-left p-3 rounded-xl border border-border hover:border-teal-400 dark:hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/10 transition-colors"
                  >
                    <span className="text-sm font-medium text-primary block pr-6">{p.name}</span>
                    {p.stylePrompt && (
                      <span className="block text-xs text-secondary mt-0.5 truncate">{p.stylePrompt}</span>
                    )}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {p.isInstrumental && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">Instrumental</span>
                      )}
                      {p.customMode && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">Custom lyrics</span>
                      )}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePreset(p.id)}
                    className="absolute top-2 right-2 p-1.5 text-secondary hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    aria-label="Delete preset"
                    title="Delete preset"
                  >
                    <Icon icon={Trash2} fill="currentColor" className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Save Preset Dialog */}
      {showPresetSaveDialog && (
        <div className="bg-surface-raised border border-border rounded-xl p-3 space-y-3">
          <p className="text-sm font-medium text-primary">Save current settings as preset</p>
          <input
            type="text"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveAsPreset(); } }}
            placeholder="Preset name"
            aria-label="Preset name"
            maxLength={100}
            className="w-full bg-surface-raised border border-border rounded-xl px-3 py-2 text-base sm:text-sm text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveAsPreset}
              disabled={isSavingPreset}
              className="flex-1 px-3 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-500 disabled:opacity-50 rounded-xl transition-colors"
            >
              {isSavingPreset ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => { setShowPresetSaveDialog(false); setPresetName(""); }}
              className="px-3 py-2 text-sm font-medium text-secondary bg-surface-raised border border-border rounded-xl hover:bg-surface-hover transition-colors"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-secondary">
            {presets.length} / 20 presets used
          </p>
        </div>
      )}
    </>
  );
}
