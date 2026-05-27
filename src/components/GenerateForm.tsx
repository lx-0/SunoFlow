"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SparklesIcon } from "@heroicons/react/24/solid";
import { ClockIcon, BoltIcon, UserCircleIcon, PencilSquareIcon, ChevronDownIcon, ExclamationTriangleIcon, QueueListIcon, AdjustmentsHorizontalIcon, DocumentDuplicateIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useToast } from "./Toast";
import { useGenerationPoller } from "@/hooks/useGenerationPoller";
import { useGenerationQueue } from "@/hooks/useGenerationQueue";
import { useStyleBoost } from "@/hooks/useStyleBoost";
import { useLyricsGeneration } from "@/hooks/useLyricsGeneration";
import { useAutoGenerate } from "@/hooks/useAutoGenerate";
import { useTemplateManager } from "@/hooks/useTemplateManager";
import { usePresetManager } from "@/hooks/usePresetManager";
import { getRateLimitMeta } from "./generate-form/helpers";
import type { PromptSuggestion } from "./generate-form/types";
import { useGenerateFormData } from "./generate-form/useGenerateFormData";
import { useGenerateSubmit } from "./generate-form/useGenerateSubmit";
import { useGenerationCelebration } from "./generate-form/useGenerationCelebration";
import { TemplatePickerPanel } from "./generate-form/TemplatePickerPanel";
import { PresetPickerPanel } from "./generate-form/PresetPickerPanel";
import { GenerationProgress } from "./GenerationProgress";
import { GenerationQueue } from "./GenerationQueue";
import { BatchGeneratePanel } from "./BatchGeneratePanel";
import { TemplatePickerPanel } from "./generate-form/TemplatePickerPanel";
import { PresetPickerPanel } from "./generate-form/PresetPickerPanel";
import { LyricsGeneratorPanel } from "./generate-form/LyricsGeneratorPanel";
import { AutoGeneratePanel } from "./generate-form/AutoGeneratePanel";
import { SuggestionsPanel } from "./generate-form/SuggestionsPanel";
import { RateLimitPanel } from "./generate-form/RateLimitPanel";
import dynamic from "next/dynamic";
const Confetti = dynamic(() => import("./Confetti").then((m) => m.Confetti));
import { UpgradeModal } from "./UpgradeModal";
import { InAppFeedbackWidget } from "./InAppFeedbackWidget";

export function GenerateForm() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { songs: trackedSongs, trackSong, clearAll } = useGenerationPoller();
  const {
    items: queueItems,
    addToQueue,
    removeFromQueue,
    reorderQueue,
    processNext,
    onGenerationComplete,
    totalActive: queueTotalActive,
    isProcessing: queueIsProcessing,
  } = useGenerationQueue();

  const sourceSongId = searchParams.get("sourceSongId") ?? null;
  const sourceSongTitle = searchParams.get("sourceSongTitle") ?? null;

  const [title, setTitle] = useState(searchParams.get("title") ?? "");
  const [style, setStyle] = useState(searchParams.get("tags") ?? "");
  const [customMode, setCustomMode] = useState(Boolean(searchParams.get("prompt") && !searchParams.get("tags")));
  const [prompt, setPrompt] = useState(searchParams.get("prompt") ?? "");
  const [instrumental, setInstrumental] = useState(searchParams.get("instrumental") === "1");
  const [selectedPersonaId, setSelectedPersonaId] = useState("");

  const {
    rateLimit,
    setRateLimit,
    templates,
    setTemplates,
    categories,
    presets,
    setPresets,
    suggestions,
    trendingCombos,
    personas,
    styleTemplates,
    creditInfo,
    fetchCredits,
    fetchTemplates,
  } = useGenerateFormData({ toast });

  const getFormState = useCallback(() => ({
    title, style, prompt, customMode, instrumental,
  }), [title, style, prompt, customMode, instrumental]);

  const { isBoosting, handleBoostStyle } = useStyleBoost({
    style,
    onStyleChange: setStyle,
    toast,
  });

  const lyrics = useLyricsGeneration({
    initialPrompt: searchParams.get("lyricsprompt") ?? "",
    toast,
    onUseLyrics: (lyricsText) => {
      setPrompt(lyricsText);
      setCustomMode(true);
    },
  });

  const autoGen = useAutoGenerate({
    initialPrompt: searchParams.get("autoprompt") ?? "",
    toast,
    onResult: (result) => {
      if (result.title) setTitle(result.title);
      if (result.style) setStyle(result.style);
      if (result.lyricsPrompt) {
        lyrics.setLyricsPrompt(result.lyricsPrompt);
        lyrics.setShowLyricsGenerator(true);
      }
    },
  });

  const templateMgr = useTemplateManager({
    templates,
    setTemplates,
    categories,
    fetchTemplates,
    toast,
    getFormState,
    onApply: (fields) => {
      setStyle(fields.style);
      setPrompt(fields.prompt);
      setInstrumental(fields.instrumental);
      setCustomMode(fields.customMode);
    },
  });

  const presetMgr = usePresetManager({
    setPresets,
    toast,
    getFormState,
    onApply: (fields) => {
      if (fields.title !== null) setTitle(fields.title ?? "");
      if (fields.style !== null) setStyle(fields.style ?? "");
      if (fields.prompt !== null) setPrompt(fields.prompt ?? "");
      setInstrumental(fields.instrumental);
      setCustomMode(fields.customMode);
    },
  });

  const {
    showConfetti,
    dismissConfetti,
    feedbackWidget,
    dismissFeedback,
  } = useGenerationCelebration({
    trackedSongs,
    onGenerationComplete,
    trackSong,
  });

  const {
    isSubmitting,
    promptError,
    setPromptError,
    submitError,
    showUpgradeModal,
    setShowUpgradeModal,
    handleSubmit,
    handleAddToQueue,
    handleQueueMoveUp,
    handleQueueMoveDown,
  } = useGenerateSubmit({
    toast,
    customMode,
    prompt,
    style,
    title,
    instrumental,
    selectedPersonaId,
    sourceSongId,
    creditInfo,
    personas,
    rateLimit,
    setRateLimit,
    trackSong,
    fetchCredits,
    queueItems,
    addToQueue,
    reorderQueue,
    processNext,
    queueIsProcessing,
  });

  function applySuggestion(suggestion: PromptSuggestion) {
    setStyle(suggestion.stylePrompt);
    setInstrumental(suggestion.isInstrumental);
    setCustomMode(false);
    toast("Applied suggestion", "success");
  }

  return (
    <div className="px-4 py-4 space-y-6">
      {showConfetti && <Confetti onDone={dismissConfetti} />}

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Generate</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Create a new song with AI</p>
      </div>

      {/* Low Credit Warning Banner */}
      {creditInfo?.isLow && (
        <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Low Credits
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              You have {creditInfo.creditsRemaining} of {creditInfo.budget} credits remaining this month ({creditInfo.usagePercent}% used).
              Check your <Link href="/analytics" className="underline font-medium hover:text-amber-900 dark:hover:text-amber-200">usage dashboard</Link> for details.
            </p>
          </div>
        </div>
      )}

      {/* Source song banner (pre-filled from duplication) */}
      {sourceSongId && (
        <div className="flex items-center gap-3 p-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl">
          <DocumentDuplicateIcon className="w-5 h-5 text-violet-600 dark:text-violet-400 flex-shrink-0" aria-hidden="true" />
          <div className="flex-1 min-w-0 text-sm text-violet-800 dark:text-violet-300">
            Based on{" "}
            <Link href={`/library/${sourceSongId}`} className="font-medium underline hover:text-violet-900 dark:hover:text-violet-200">
              {sourceSongTitle ?? "original song"}
            </Link>
          </div>
          <button
            type="button"
            onClick={() => {
              setTitle("");
              setStyle("");
              setPrompt("");
              setInstrumental(false);
            }}
            className="text-violet-500 hover:text-violet-700 dark:hover:text-violet-300 transition-colors flex-shrink-0"
            title="Reset to defaults"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      <GenerationQueue
        items={queueItems}
        onRemove={removeFromQueue}
        onMoveUp={handleQueueMoveUp}
        onMoveDown={handleQueueMoveDown}
      />

      <GenerationProgress songs={trackedSongs} onDismiss={clearAll} />

      <TemplatePickerPanel templateMgr={templateMgr} categories={categories} />
      <PresetPickerPanel presetMgr={presetMgr} presets={presets} />

      {/* Suggested for you */}
      {suggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Suggested for you
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => applySuggestion(s)}
                title={s.stylePrompt}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-full hover:border-violet-400 dark:hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/10 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
              >
                {s.source === "personal" && (
                  <span className="text-amber-500" aria-hidden="true">★</span>
                )}
                {s.label}
                {s.isInstrumental && (
                  <span className="text-[10px] font-medium px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 ml-0.5">
                    Instr
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Trending combos */}
      {trendingCombos.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Trending Combos
          </p>
          <div className="flex flex-wrap gap-2">
            {trendingCombos.map((combo) => (
              <button
                key={combo.id}
                type="button"
                onClick={() => setStyle(combo.stylePrompt)}
                title={`${combo.combo} — rated ${combo.displayScore}`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 rounded-full hover:border-violet-400 dark:hover:border-violet-500 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
              >
                <span aria-hidden="true">🔥</span>
                {combo.label}
                <span className="text-[10px] font-semibold text-violet-500 dark:text-violet-400 ml-0.5">
                  {combo.displayScore}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Auto-generate panel */}
      <div className="space-y-0 mb-4">
        <button
          type="button"
          onClick={() => autoGen.setShowAutoGenerate((v) => !v)}
          aria-expanded={autoGen.showAutoGenerate}
          className="w-full flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-300">
            <SparklesIcon className="h-4 w-4" />
            Auto-generate from description
          </span>
          <ChevronDownIcon
            className={`h-4 w-4 text-amber-500 dark:text-amber-400 transition-transform ${
              autoGen.showAutoGenerate ? "rotate-180" : ""
            }`}
          />
        </button>

        {autoGen.showAutoGenerate && (
          <div className="mt-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Describe what you want and we&apos;ll suggest a title, style, and prompt prompt all at once.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={autoGen.autoPrompt}
                onChange={(e) => autoGen.setAutoPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); autoGen.handleAutoGenerate(); } }}
                placeholder="e.g. a nostalgic road trip song, summer vibes, indie feel…"
                aria-label="Auto-generation description"
                maxLength={500}
                disabled={autoGen.isAutoGenerating}
                className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 text-base sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50"
              />
              <button
                type="button"
                onClick={autoGen.handleAutoGenerate}
                disabled={autoGen.isAutoGenerating || !autoGen.autoPrompt.trim()}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded-xl transition-colors whitespace-nowrap"
              >
                {autoGen.isAutoGenerating ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Generating…
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-4 w-4" />
                    Fill fields
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" data-tour="generate-prompt">
        {/* Title */}
        <div className="space-y-1">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Song title <span className="text-gray-500 dark:text-gray-400">(optional)</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My awesome song"
            disabled={isSubmitting}
            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-base sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50"
          />
        </div>

        {/* Style / Genre prompt */}
        <div className="space-y-1">
          <label htmlFor="stylePrompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Style / genre
          </label>
          <div className="flex gap-2">
            <input
              id="stylePrompt"
              type="text"
              value={style}
              onChange={(e) => { setStyle(e.target.value); if (promptError && !customMode) setPromptError(null); }}
              placeholder="e.g. upbeat lo-fi hip-hop, melancholic indie folk…"
              required={!customMode}
              disabled={isSubmitting}
              aria-invalid={!customMode && !!promptError}
              aria-describedby={!customMode && promptError ? "prompt-error" : undefined}
              className={`flex-1 bg-white dark:bg-gray-800 border rounded-xl px-4 py-3 text-base sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50 ${
                !customMode && promptError
                  ? "border-red-400 dark:border-red-600 focus:ring-red-500"
                  : "border-gray-300 dark:border-gray-700 focus:ring-violet-500"
              }`}
            />
            <button
              type="button"
              onClick={handleBoostStyle}
              disabled={isBoosting || !style.trim() || isSubmitting}
              aria-label={isBoosting ? "Enhancing style description with AI" : "Enhance style description with AI"}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/30 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              <BoltIcon className="h-4 w-4" aria-hidden="true" />
              {isBoosting ? "..." : "Enhance"}
            </button>
          </div>
          {!customMode && promptError && (
            <p id="prompt-error" role="alert" className="text-sm text-red-600 dark:text-red-400">
              {promptError}
            </p>
          )}
          <div className="mt-2 p-3 bg-violet-50 dark:bg-violet-900/10 border border-violet-200 dark:border-violet-800 rounded-xl">
            <label htmlFor="styleTemplateSelect" className="block text-xs font-semibold text-violet-700 dark:text-violet-300 uppercase tracking-wide mb-1.5">
              Apply Saved Style
            </label>
            {styleTemplates.length > 0 ? (
              <div className="flex items-center gap-2">
                <AdjustmentsHorizontalIcon className="h-4 w-4 text-violet-400 dark:text-violet-500 flex-shrink-0" />
                <select
                  id="styleTemplateSelect"
                  value=""
                  onChange={(e) => {
                    const tmpl = styleTemplates.find((t) => t.id === e.target.value);
                    if (tmpl) {
                      setStyle(tmpl.tags);
                      if (promptError && !customMode) setPromptError(null);
                    }
                  }}
                  disabled={isSubmitting}
                  className="flex-1 bg-white dark:bg-gray-800 border border-violet-300 dark:border-violet-700 rounded-lg px-2 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50"
                >
                  <option value="">Choose a style template…</option>
                  {styleTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {t.tags.length > 40 ? t.tags.slice(0, 40) + "…" : t.tags}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-sm text-violet-600 dark:text-violet-400">
                No style templates yet.{" "}
                <Link href="/templates?tab=styles" className="underline font-medium hover:text-violet-800 dark:hover:text-violet-200">
                  Create one
                </Link>{" "}
                to quickly apply your favorite styles.
              </p>
            )}
          </div>
        </div>

        {/* Persona picker */}
        {personas.length > 0 && (
          <div className="space-y-1">
            <label htmlFor="persona" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Voice persona <span className="text-gray-500 dark:text-gray-400">(optional)</span>
            </label>
            <div className="flex items-center gap-2">
              <UserCircleIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <select
                id="persona"
                value={selectedPersonaId}
                onChange={(e) => setSelectedPersonaId(e.target.value)}
                disabled={isSubmitting}
                className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-base sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50"
              >
                <option value="">No persona</option>
                {personas.map((p) => (
                  <option key={p.personaId} value={p.personaId}>
                    {p.name}{p.style ? ` — ${p.style}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Generate Lyrics panel */}
        <div className="space-y-0">
          <button
            type="button"
            onClick={() => lyrics.setShowLyricsGenerator((v) => !v)}
            aria-expanded={lyrics.showLyricsGenerator}
            className="w-full flex items-center justify-between bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl px-4 py-3 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-violet-700 dark:text-violet-300">
              <PencilSquareIcon className="h-4 w-4" />
              Generate Lyrics
            </span>
            <ChevronDownIcon
              className={`h-4 w-4 text-violet-500 dark:text-violet-400 transition-transform ${
                lyrics.showLyricsGenerator ? "rotate-180" : ""
              }`}
            />
          </button>

          {lyrics.showLyricsGenerator && (
            <div className="mt-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
              <div className="flex gap-2">
                <textarea
                  value={lyrics.lyricsPrompt}
                  onChange={(e) => lyrics.setLyricsPrompt(e.target.value)}
                  placeholder="Describe your song theme, mood, or topic..."
                  aria-label="Lyrics generation prompt"
                  maxLength={2000}
                  rows={3}
                  disabled={lyrics.isGeneratingLyrics}
                  className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 text-base sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50 resize-none"
                />
                <button
                  type="button"
                  onClick={lyrics.handleGenerateLyrics}
                  disabled={lyrics.isGeneratingLyrics || !lyrics.lyricsPrompt.trim()}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-xl transition-colors whitespace-nowrap"
                >
                  {lyrics.isGeneratingLyrics ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Generating…
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="h-4 w-4" />
                      Generate
                    </>
                  )}
                </button>
              </div>

              {lyrics.generatedLyrics && (
                <div className="space-y-2">
                  <textarea
                    value={lyrics.generatedLyrics}
                    onChange={(e) => lyrics.setGeneratedLyrics(e.target.value)}
                    aria-label="Generated lyrics"
                    rows={8}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-base sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                  />
                  <button
                    type="button"
                    onClick={lyrics.handleUseLyrics}
                    className="w-full px-4 py-2.5 text-sm font-medium text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-900/30 border border-violet-300 dark:border-violet-700 rounded-xl hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors"
                  >
                    Use these prompt
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Custom prompt toggle */}
        <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3">
          <span id="custom-lyrics-label" className="text-sm font-medium text-gray-700 dark:text-gray-300">Custom lyrics</span>
          <button
            type="button"
            role="switch"
            aria-checked={customMode}
            aria-labelledby="custom-lyrics-label"
            onClick={() => setCustomMode((v) => !v)}
            disabled={isSubmitting}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 disabled:opacity-50 ${
              customMode ? "bg-violet-600" : "bg-gray-400 dark:bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                customMode ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Lyrics textarea — shown only in custom mode */}
        {customMode && (
          <div className="space-y-1">
            <label htmlFor="lyrics" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Lyrics
            </label>
            <textarea
              id="lyrics"
              value={prompt}
              onChange={(e) => { setPrompt(e.target.value); if (promptError && customMode) setPromptError(null); }}
              placeholder="[Verse 1]&#10;Your lyrics here…&#10;&#10;[Chorus]&#10;…"
              rows={8}
              required={customMode}
              disabled={isSubmitting}
              aria-invalid={customMode && !!promptError}
              aria-describedby={customMode && promptError ? "prompt-error" : undefined}
              className={`w-full bg-white dark:bg-gray-800 border rounded-xl px-4 py-3 text-base sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent resize-none disabled:opacity-50 ${
                customMode && promptError
                  ? "border-red-400 dark:border-red-600 focus:ring-red-500"
                  : "border-gray-300 dark:border-gray-700 focus:ring-violet-500"
              }`}
            />
            {customMode && promptError && (
              <p id="prompt-error" role="alert" className="text-sm text-red-600 dark:text-red-400">
                {promptError}
              </p>
            )}
          </div>
        )}

        {/* Instrumental toggle */}
        <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3">
          <span id="instrumental-label" className="text-sm font-medium text-gray-700 dark:text-gray-300">Instrumental only</span>
          <button
            type="button"
            role="switch"
            aria-checked={instrumental}
            aria-labelledby="instrumental-label"
            onClick={() => setInstrumental((v) => !v)}
            disabled={isSubmitting}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 disabled:opacity-50 ${
              instrumental ? "bg-violet-600" : "bg-gray-400 dark:bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                instrumental ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Rate limit info panel */}
        {rateLimit && (() => {
          const { used, pct, barColor, minsLeft, isAtLimit, isNearLimit } = getRateLimitMeta(rateLimit);

          return (
            <div className="space-y-2">
              {isNearLimit && (
                <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300">
                  <span className="font-medium">{rateLimit.remaining} generation{rateLimit.remaining === 1 ? "" : "s"} remaining</span>
                </div>
              )}

              <div className={`rounded-xl px-4 py-3 text-sm border ${
                isAtLimit
                  ? "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-800"
                  : "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700"
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={isAtLimit ? "text-red-700 dark:text-red-300 font-medium" : "text-gray-600 dark:text-gray-400"}>
                    {isAtLimit ? "Rate limit reached" : "Generation quota"}
                  </span>
                  <span className={`font-semibold ${isAtLimit ? "text-red-700 dark:text-red-300" : "text-gray-900 dark:text-white"}`}>
                    {used} / {rateLimit.limit} used
                  </span>
                </div>

                <div
                  role="progressbar"
                  aria-valuenow={used}
                  aria-valuemin={0}
                  aria-valuemax={rateLimit.limit}
                  aria-label={`Generation quota: ${used} of ${rateLimit.limit} used`}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
                >
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                    aria-hidden="true"
                  />
                </div>

                <div className="flex items-center gap-1 mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <ClockIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Resets in {minsLeft} minute{minsLeft === 1 ? "" : "s"}</span>
                </div>
              </div>
            </div>
          );
        })()}

        <BatchGeneratePanel
          basePrompt={customMode ? prompt : style}
          baseTitle={title}
          baseStyle={style}
          isInstrumental={instrumental}
          onBatchStarted={(batchId, songIds) => {
            for (const songId of songIds) {
              trackSong(songId, null);
            }
            fetchCredits();
          }}
          creditInfo={creditInfo}
        />

        {/* Submit */}
        <div className="flex gap-2">
          <div className="relative group flex-1">
            <button
              type="submit"
              disabled={isSubmitting || rateLimit?.remaining === 0}
              className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl px-4 py-3 transition-colors min-h-[52px]"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Generating…
                </>
              ) : (
                <>
                  <SparklesIcon className="h-5 w-5" aria-hidden="true" />
                  Generate
                </>
              )}
            </button>
            {rateLimit?.remaining === 0 && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                Rate limit reached — resets in {Math.max(0, Math.ceil((new Date(rateLimit.resetAt).getTime() - Date.now()) / 60000))} min
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleAddToQueue}
            disabled={isSubmitting || queueTotalActive >= 10}
            aria-label={queueTotalActive >= 10 ? "Queue is full (max 10)" : `Add to generation queue${queueTotalActive > 0 ? ` (${queueTotalActive} active)` : ""}`}
            className="flex items-center justify-center gap-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 font-semibold rounded-xl px-4 py-3 transition-colors min-h-[52px] whitespace-nowrap"
          >
            <QueueListIcon className="h-5 w-5" aria-hidden="true" />
            Queue{queueTotalActive > 0 ? ` (${queueTotalActive})` : ""}
          </button>
        </div>
        {submitError && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {submitError}
          </p>
        )}
      </form>

      {showUpgradeModal && (
        <UpgradeModal trigger="no_credits" onClose={() => setShowUpgradeModal(false)} />
      )}

      {feedbackWidget && (
        <InAppFeedbackWidget
          source="song_generation"
          entityId={feedbackWidget.songId}
          onClose={dismissFeedback}
        />
      )}
    </div>
  );
}
