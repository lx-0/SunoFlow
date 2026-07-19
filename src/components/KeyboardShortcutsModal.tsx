"use client";

import { useRef } from "react";
import { X } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { SHORTCUTS, type Shortcut } from "./useKeyboardShortcuts";
import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";

function KeyLabel({ keyName }: { keyName: string }) {
  const display =
    keyName === " " ? "Space" :
    keyName === "←" ? "← Left" :
    keyName === "→" ? "→ Right" :
    keyName === "↑" ? "↑ Up" :
    keyName === "↓" ? "↓ Down" :
    keyName;
  return (
    <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded bg-surface-raised border border-border-strong text-xs font-mono font-semibold text-gray-700 dark:text-gray-200">
      {display}
    </kbd>
  );
}

function ShortcutRow({ shortcut }: { shortcut: Shortcut }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-gray-700 dark:text-gray-300">
        {shortcut.label}
      </span>
      <div className="flex items-center gap-1">
        {shortcut.keys.map((k, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && (
              <span className="text-xs text-muted">
                then
              </span>
            )}
            <KeyLabel keyName={k} />
          </span>
        ))}
      </div>
    </div>
  );
}

const categories: { key: Shortcut["category"]; label: string }[] = [
  { key: "navigation", label: "Navigation" },
  { key: "playback", label: "Playback" },
  { key: "app", label: "App" },
];

export function KeyboardShortcutsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocusTrap(dialogRef, open, onClose);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        className="relative w-full max-w-md mx-4 bg-surface rounded-xl shadow-2xl border border-border overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-primary">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-secondary hover:text-primary transition-colors"
          >
            <Icon icon={X} className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-5 max-h-[60vh] overflow-y-auto">
          {categories.map(({ key, label }) => {
            const items = SHORTCUTS.filter((s) => s.category === key);
            if (items.length === 0) return null;
            return (
              <div key={key}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary mb-2">
                  {label}
                </h3>
                <div className="divide-y divide-border">
                  {items.map((s, i) => (
                    <ShortcutRow key={i} shortcut={s} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
