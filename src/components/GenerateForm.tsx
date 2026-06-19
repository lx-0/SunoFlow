"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SparklesIcon } from "@heroicons/react/24/solid";
import { BoltIcon, UserCircleIcon, ExclamationTriangleIcon, QueueListIcon, AdjustmentsHorizontalIcon, DocumentDuplicateIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useToast } from "./Toast";
import { useGenerationPoller } from "@/hooks/useGenerationPoller";
import { useGenerationQueue } from "@/hooks/useGenerationQueue";
import type { GenerationPreset, PromptTemplate } from "./generate-form/types";
import { useGenerateFormData } from "./generate-form/useGenerateFormData";
import { useGenerateSubmit } from "./generate-form/useGenerateSubmit";
import { useGenerationCelebration } from "./generate-form/useGenerationCelebration";
import { useStyleBoost } from "./generate-form/useStyleBoost";
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
// Lazy-load confetti — only shown after generation success, not needed on initial render
const Confetti = dynamic(() => import("./Confetti").then((m) => m.Confetti));
import { UpgradeModal } from "./UpgradeModal";
import { InAppFeedbackWidget } from "./InAppFeedbackWidget";
import { Spinner } from "./Spinner";

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

  const { showConfetti, dismissConfetti, feedbackWidget, dismissFeedback } = useGenerationCelebration({
    trackedSongs,
    onGenerationComplete,
    trackSong,
  });

  const { isBoosting, handleBoostStyle, applySuggestion } = useStyleBoost({
    style,
    setStyle,
    setInstrumental,
    setCustomMode,
    toast,
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

  function applyTemplate(template: PromptTemplate) {
    setStyle(template.style ?? "");
    setPrompt(template.prompt);
    setInstrumental(template.isInstrumental);
    if (template.style) {
      setCustomMode(false);
    } else {
      setCustomMode(true);
    }
    toast(`Loaded "${template.name}" template`, "success");
  }

  function applyPreset(preset: GenerationPreset) {
    if (preset.title !== null) setTitle(preset.title ?? "");
    if (preset.stylePrompt !== null) setStyle(preset.stylePrompt ?? "");
    if (preset.lyricsPrompt !== null) setPrompt(preset.lyricsPrompt ?? "");
    setInstrumental(preset.isInstrumental);
    setCustomMode(preset.customMode);
    toast(`Loaded "${preset.name}" preset`, "success");
  }

  const initialLyricsPrompt = searchParams.get("lyricsprompt") ?? "";
  const initialAutoPrompt = searchParams.get("autoprompt") ?? "";

  return (
    <div className="px-4 py-4 space-y-6">
      {/* First-generation celebration */}
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

      {/* Generation Queue */}
      <GenerationQueue
        items={queueItems}
        onRemove={removeFromQueue}
        onMoveUp={handleQueueMoveUp}
        onMoveDown={handleQueueMoveDown}
      />

      {/* Generation Progress */}
      <GenerationProgress songs={trackedSongs} onDismiss={clearAll} />

      {/* Template Picker */}
      <TemplatePickerPanel
        templates={templates}
        categories={categories}
        customMode={customMode}
        prompt={prompt}
        style={style}
        instrumental={instrumental}
        onApplyTemplate={applyTemplate}
        onTemplatesChange={setTemplates}
        fetchTemplates={fetchTemplates}
      />

      {/* Preset Picker */}
      <PresetPickerPanel
        presets={presets}
        formState={{ title, style, prompt, customMode, instrumental }}
        onApplyPreset={applyPreset}
        onPresetsChange={setPresets}
      />

      {/* Suggestions & Trending */}
      <SuggestionsPanel
        suggestions={suggestions}
        trendingCombos={trendingCombos}
        onApplySuggestion={applySuggestion}
        onApplyTrendingCombo={setStyle}
      />

      {/* Auto-generate panel */}
      <AutoGeneratePanel
        initialPrompt={initialAutoPrompt}
        onFieldsFilled={(fields) => {
          if (fields.title) setTitle(fields.title);
          if (fields.style) setStyle(fields.style);
          if (fields.lyricsPrompt) setPrompt(fields.lyricsPrompt);
        }}
      />

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
        <LyricsGeneratorPanel
          initialPrompt={initialLyricsPrompt}
          onUseLyrics={(lyrics) => {
            setPrompt(lyrics);
            setCustomMode(true);
          }}
          onApplyMeta={({ title: t, style: s }) => {
            // Fill the title + style fields from the LLM, without clobbering
            // anything already entered.
            if (t) setTitle((cur) => (cur.trim() ? cur : t));
            if (s) setStyle((cur) => (cur.trim() ? cur : s));
          }}
        />

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
        {rateLimit && <RateLimitPanel rateLimit={rateLimit} />}

        {/* Batch Generate Variations */}
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
                  <Spinner className="h-5 w-5 text-white" />
                  Generating…
                </>
              ) : (
                <>
                  <SparklesIcon className="h-5 w-5" aria-hidden="true" />
                  Generate
                </>
              )}
            </button>
            {/* Tooltip when limit reached */}
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

      {/* Upgrade modal — shown when user has no credits and tries to generate */}
      {showUpgradeModal && (
        <UpgradeModal trigger="no_credits" onClose={() => setShowUpgradeModal(false)} />
      )}

      {/* In-app feedback widget — shown after song generation completes */}
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
