"use client";

import { XMarkIcon } from "@heroicons/react/24/solid";

interface ModalShellProps {
  title: string;
  titleId?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: "md" | "lg";
  closeOnBackdrop?: boolean;
  dialogRef?: React.RefObject<HTMLDivElement>;
  cardClassName?: string;
}

export function ModalShell({
  title,
  titleId,
  onClose,
  children,
  maxWidth = "md",
  closeOnBackdrop = false,
  dialogRef,
  cardClassName,
}: ModalShellProps) {
  const maxWidthClass = maxWidth === "lg" ? "max-w-lg" : "max-w-md";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl w-full ${maxWidthClass} p-5 space-y-4${cardClassName ? ` ${cardClassName}` : ""}`}
        onClick={closeOnBackdrop ? (e) => e.stopPropagation() : undefined}
      >
        <div className="flex items-center justify-between">
          <h2 id={titleId} className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
