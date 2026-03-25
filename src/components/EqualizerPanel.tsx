"use client";

import { useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/solid";
import {
  useAudioEQ,
  EQ_BANDS,
  EQ_PRESETS,
  EQ_PRESET_LABELS,
  type EQPreset,
} from "./AudioEQContext";

interface EqualizerPanelProps {
  onClose: () => void;
}

const PRESET_ORDER: EQPreset[] = ["flat", "bass_boost", "vocal", "treble"];

export function EqualizerPanel({ onClose }: EqualizerPanelProps) {
  const { settings, setGain, applyPreset, setSpeed, setPitch, resetAll } =
    useAudioEQ();

  // Close on Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function activePreset(): EQPreset | null {
    for (const [key, gains] of Object.entries(EQ_PRESETS) as [EQPreset, number[]][]) {
      if (
        gains.length === settings.gains.length &&
        gains.every((g, i) => g === settings.gains[i])
      ) {
        return key;
      }
    }
    return null;
  }

  const current = activePreset();

  return (
    <div className="bg-gray-900 dark:bg-gray-800 border border-gray-700 dark:border-gray-600 rounded-xl shadow-2xl p-4 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-white">Equalizer &amp; Effects</span>
        <div className="flex items-center gap-2">
          <button
            onClick={resetAll}
            className="text-xs text-gray-400 hover:text-gray-200 transition-colors px-2 py-1 rounded hover:bg-white/5"
          >
            Reset
          </button>
          <button
            onClick={onClose}
            aria-label="Close equalizer"
            className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-200 transition-colors hover:bg-white/10"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preset buttons */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {PRESET_ORDER.map((preset) => (
          <button
            key={preset}
            onClick={() => applyPreset(preset)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              current === preset
                ? "bg-violet-600 border-violet-600 text-white"
                : "border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200"
            }`}
          >
            {EQ_PRESET_LABELS[preset]}
          </button>
        ))}
      </div>

      {/* EQ Bands */}
      <div className="flex gap-3 justify-between mb-5">
        {EQ_BANDS.map((band, i) => (
          <div key={band.label} className="flex flex-col items-center gap-1 flex-1">
            <span
              className="text-[10px] font-medium tabular-nums w-7 text-center"
              style={{ color: settings.gains[i] !== 0 ? "#a78bfa" : "#9ca3af" }}
            >
              {settings.gains[i] > 0 ? `+${settings.gains[i]}` : settings.gains[i]}
            </span>
            <div className="relative h-24 flex items-center justify-center">
              <input
                type="range"
                min={-12}
                max={12}
                step={1}
                value={settings.gains[i]}
                onChange={(e) => setGain(i, Number(e.target.value))}
                aria-label={`${band.label} EQ gain`}
                className="appearance-none cursor-pointer accent-violet-500"
                style={{
                  writingMode: "vertical-lr",
                  direction: "rtl",
                  width: "6px",
                  height: "96px",
                }}
              />
            </div>
            <span className="text-[10px] text-gray-500">{band.label}</span>
            <span className="text-[9px] text-gray-600">
              {band.freq >= 1000 ? `${band.freq / 1000}k` : `${band.freq}`}
            </span>
          </div>
        ))}
      </div>

      {/* Speed & Pitch */}
      <div className="space-y-3 border-t border-gray-700 pt-3">
        {/* Speed */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 w-14 flex-shrink-0">Speed</span>
          <input
            type="range"
            min={50}
            max={200}
            step={5}
            value={Math.round(settings.speed * 100)}
            onChange={(e) => setSpeed(Number(e.target.value) / 100)}
            aria-label="Playback speed"
            className="flex-1 h-1 accent-violet-500 cursor-pointer"
          />
          <span className="text-xs text-gray-300 w-9 text-right tabular-nums">
            {settings.speed.toFixed(2)}x
          </span>
        </div>

        {/* Pitch */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 w-14 flex-shrink-0">Pitch</span>
          <input
            type="range"
            min={-6}
            max={6}
            step={1}
            value={settings.pitch}
            onChange={(e) => setPitch(Number(e.target.value))}
            aria-label="Pitch shift in semitones"
            className="flex-1 h-1 accent-violet-500 cursor-pointer"
          />
          <span
            className="text-xs w-9 text-right tabular-nums"
            style={{ color: settings.pitch !== 0 ? "#a78bfa" : "#d1d5db" }}
          >
            {settings.pitch > 0 ? `+${settings.pitch}` : settings.pitch}st
          </span>
        </div>
      </div>
    </div>
  );
}
