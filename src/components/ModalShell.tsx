"use client";

import { X } from "lucide-react";
import { Icon } from "@/components/ui/Icon";

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
        className={`bg-surface border border-border rounded-xl w-full ${maxWidthClass} p-5 space-y-4${cardClassName ? ` ${cardClassName}` : ""}`}
        onClick={closeOnBackdrop ? (e) => e.stopPropagation() : undefined}
      >
        <div className="flex items-center justify-between">
          <h2 id={titleId} className="text-lg font-semibold text-primary">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-primary min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <Icon icon={X} className="w-5 h-5" fill="currentColor" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
