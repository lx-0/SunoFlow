"use client";

import {
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  ChatBubbleLeftIcon,
  ArrowUturnLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { useQueue } from "./QueueContext";
import { formatDuration as formatTime } from "@/lib/time-format";
import { useLyricsEditor } from "./lyrics-editor/use-lyrics-editor";
import { useTimestampManager } from "./lyrics-editor/use-timestamp-manager";
import { useAnnotationEditor } from "./lyrics-editor/use-annotation-editor";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LyricsEditorProps {
  songId: string;
  originalLyrics: string | null;
  editedLyrics: string | null;
  /** Set to true when this song is the one currently loaded in the global player */
  isCurrentSong?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseLines(text: string | null): string[] {
  if (!text) return [];
  return text.split("\n");
}

/** Render inline markdown bold/italic as JSX */
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[0].startsWith("**")) {
      parts.push(<strong key={key++}>{m[2]}</strong>);
    } else {
      parts.push(<em key={key++}>{m[3]}</em>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

// ─── LyricsEditor ─────────────────────────────────────────────────────────────

export function LyricsEditor({
  songId,
  originalLyrics,
  editedLyrics: initialEditedLyrics,
  isCurrentSong = false,
}: LyricsEditorProps) {
  const { currentTime, isPlaying } = useQueue();

  const editor = useLyricsEditor(songId, originalLyrics, initialEditedLyrics);
  const ts = useTimestampManager(songId, isCurrentSong, currentTime, isPlaying);
  const ann = useAnnotationEditor(songId);

  const displayLines = parseLines(editor.showOriginal ? originalLyrics : editor.activeLyrics);

  if (!originalLyrics && !editor.savedEdited) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 tracking-wide">Lyrics</h2>
          <button
            onClick={editor.startAddingLyrics}
            className="flex items-center gap-1 text-xs text-violet-500 hover:text-violet-400 transition-colors"
          >
            <PencilIcon className="w-3.5 h-3.5" />
            Add lyrics
          </button>
        </div>
        {editor.isEditing && (
          <EditingView
            draft={editor.editDraft}
            onChange={editor.setEditDraft}
            onSave={editor.handleSaveLyrics}
            onCancel={editor.cancelEditing}
            saving={editor.saving}
            textareaRef={editor.textareaRef}
            onInsertFormat={editor.insertFormat}
          />
        )}
        {!editor.isEditing && (
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">No lyrics yet.</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 tracking-wide">Lyrics</h2>
        <div className="flex items-center gap-2">
          {editor.savedEdited && (
            <button
              onClick={() => editor.setShowOriginal((v) => !v)}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                editor.showOriginal
                  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                  : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400"
              }`}
              title={editor.showOriginal ? "Show edited version" : "Show original"}
            >
              {editor.showOriginal ? "Original" : "Edited"}
            </button>
          )}
          {editor.savedEdited && !editor.showOriginal && !editor.isEditing && (
            <button
              onClick={editor.handleDiscardEdits}
              disabled={editor.saving}
              title="Revert to original"
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <ArrowUturnLeftIcon className="w-4 h-4" />
            </button>
          )}
          {/* Timestamp mode toggle */}
          {!editor.isEditing && (
            <button
              onClick={() => {
                if (ts.isSettingTimestamps) {
                  ts.cancelSettingTimestamps();
                } else {
                  ts.startSettingTimestamps();
                }
              }}
              title={ts.isSettingTimestamps ? "Cancel timestamp setting" : "Set line timestamps"}
              className={`transition-colors ${
                ts.isSettingTimestamps
                  ? "text-violet-500"
                  : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-400"
              }`}
            >
              <ClockIcon className="w-4 h-4" />
            </button>
          )}
          {/* Annotations toggle */}
          {!editor.isEditing && ann.annotations.length > 0 && (
            <button
              onClick={() => ann.setAnnotationsOpen((v) => !v)}
              title="Toggle annotations sidebar"
              className={`transition-colors ${
                ann.annotationsOpen
                  ? "text-violet-500"
                  : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-400"
              }`}
            >
              <ChatBubbleLeftIcon className="w-4 h-4" />
            </button>
          )}
          {/* Edit toggle */}
          {!editor.isEditing && (
            <button
              onClick={() => {
                editor.startEditing();
                ts.cancelSettingTimestamps();
              }}
              title="Edit lyrics"
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
            >
              <PencilIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {editor.isEditing ? (
            <div className="p-4">
              <EditingView
                draft={editor.editDraft}
                onChange={editor.setEditDraft}
                onSave={editor.handleSaveLyrics}
                onCancel={editor.cancelEditing}
                saving={editor.saving}
                textareaRef={editor.textareaRef}
                onInsertFormat={editor.insertFormat}
              />
            </div>
          ) : (
            <div className="px-4 py-4 max-h-[60vh] overflow-y-auto space-y-0.5">
              {ts.isSettingTimestamps && (
                <div className="mb-3 flex items-center gap-2 text-xs text-violet-400 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg px-3 py-2">
                  <ClockIcon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>
                    {isCurrentSong
                      ? "Tap a line while playing to set its start time"
                      : "Play this song, then tap lines to sync timestamps"}
                  </span>
                </div>
              )}
              {displayLines.map((line, i) => {
                const isActive = i === ts.activeLineIndex;
                const lineTs = ts.tsMap.get(i) ?? ts.pendingTimestamps.get(i);
                const hasPending = ts.pendingTimestamps.has(i);
                const lineAnn = ann.annMap.get(i);

                return (
                  <div key={i} ref={isActive ? ts.activeLineRef : undefined}>
                    <div
                      onClick={() => {
                        if (ts.isSettingTimestamps) {
                          ts.handleLineTap(i);
                        } else if (!editor.isEditing) {
                          ann.openAnnotationForLine(i);
                        }
                      }}
                      className={`group flex items-start gap-2 px-2 py-1 rounded-lg transition-colors cursor-pointer select-none ${
                        isActive
                          ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 font-medium"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      } ${ts.isSettingTimestamps ? "hover:bg-violet-50 dark:hover:bg-violet-900/20" : ""}`}
                    >
                      <span className="flex-1 text-sm leading-relaxed">
                        {line === "" ? <span className="opacity-0 select-none">·</span> : renderInline(line)}
                      </span>
                      <span className="flex-shrink-0 flex items-center gap-1">
                        {lineTs !== undefined && (
                          <span
                            className={`text-xs tabular-nums ${
                              hasPending
                                ? "text-violet-500"
                                : "text-gray-400 dark:text-gray-500"
                            }`}
                          >
                            {formatTime(lineTs)}
                          </span>
                        )}
                        {lineAnn && !ann.annotationsOpen && (
                          <ChatBubbleLeftIcon className="w-3 h-3 text-amber-400 flex-shrink-0" />
                        )}
                      </span>
                    </div>

                    {/* Inline annotation editor */}
                    {ann.editingAnnotation === i && (
                      <div className="ml-2 mt-1 mb-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-2 space-y-2">
                        <textarea
                          autoFocus
                          value={ann.annotationDraft}
                          onChange={(e) => ann.setAnnotationDraft(e.target.value)}
                          placeholder="Add a note about this line…"
                          aria-label="Line annotation"
                          rows={2}
                          className="w-full bg-transparent text-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 rounded"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => ann.handleSaveAnnotation(i, ann.annotationDraft)}
                            disabled={ann.savingAnnotation}
                            className="flex items-center gap-1 text-xs px-2 py-1 bg-amber-500 hover:bg-amber-400 text-white rounded-md transition-colors"
                          >
                            <CheckIcon className="w-3 h-3" />
                            Save
                          </button>
                          <button
                            onClick={ann.cancelEditingAnnotation}
                            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                          >
                            Cancel
                          </button>
                          {lineAnn && (
                            <button
                              onClick={() => ann.handleSaveAnnotation(i, "")}
                              className="text-xs text-red-400 hover:text-red-500 transition-colors ml-auto"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {ts.isSettingTimestamps && ts.pendingTimestamps.size > 0 && (
                <div className="pt-3 flex items-center gap-2">
                  <button
                    onClick={ts.handleSaveTimestamps}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors"
                  >
                    <CheckIcon className="w-3.5 h-3.5" />
                    Save {ts.pendingTimestamps.size} timestamp{ts.pendingTimestamps.size !== 1 ? "s" : ""}
                  </button>
                  <button
                    onClick={ts.clearPendingTimestamps}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Annotations sidebar */}
        {ann.annotationsOpen && ann.annotations.length > 0 && !editor.isEditing && (
          <div className="w-48 border-l border-gray-100 dark:border-gray-800 flex-shrink-0">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Annotations</span>
              <button
                onClick={() => ann.setAnnotationsOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[55vh] p-2 space-y-2">
              {ann.annotations.map((a) => (
                <button
                  key={a.lineIndex}
                  onClick={() => ann.openAnnotationForLine(a.lineIndex)}
                  className="w-full text-left p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 hover:border-amber-300 dark:hover:border-amber-600 transition-colors"
                >
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                    Line {a.lineIndex + 1}
                  </p>
                  <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-3">
                    {a.body}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Version history indicator */}
      {editor.savedEdited && !editor.isEditing && (
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {editor.showOriginal ? "Viewing original" : "Showing your edited version"}
          </span>
          <ChevronRightIcon className="w-3 h-3 text-gray-300 dark:text-gray-600" />
          <button
            onClick={() => editor.setShowOriginal((v) => !v)}
            className="text-xs text-violet-500 hover:text-violet-400 transition-colors"
          >
            {editor.showOriginal ? "View edited" : "Compare with original"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── EditingView sub-component ────────────────────────────────────────────────

function EditingView({
  draft,
  onChange,
  onSave,
  onCancel,
  saving,
  textareaRef,
  onInsertFormat,
}: {
  draft: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onInsertFormat: (marker: string) => void;
}) {
  return (
    <div className="space-y-2">
      {/* Formatting toolbar */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); onInsertFormat("**"); }}
          className="px-2 py-1 text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          title="Bold (**text**)"
        >
          B
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); onInsertFormat("*"); }}
          className="px-2 py-1 text-xs italic text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          title="Italic (*text*)"
        >
          I
        </button>
      </div>
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={(e) => onChange(e.target.value)}
        rows={14}
        autoFocus
        placeholder="Enter lyrics…"
        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-colors font-mono leading-relaxed"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-1 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors min-h-[32px]"
        >
          <CheckIcon className="w-3.5 h-3.5" />
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium rounded-lg transition-colors min-h-[32px]"
        >
          <XMarkIcon className="w-3.5 h-3.5" />
          Cancel
        </button>
      </div>
    </div>
  );
}
