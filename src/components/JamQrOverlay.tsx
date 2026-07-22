"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Icon } from "@/components/ui/Icon";

/**
 * Fullscreen join-QR for the party screen. Deliberately light-on-dark-proof:
 * a white panel behind the code keeps scan contrast in a dark room. The
 * `qrcode` module is dynamically imported so it never enters shared bundles.
 */
export function JamQrOverlay({
  joinUrl,
  sessionName,
  onClose,
}: {
  joinUrl: string;
  sessionName: string;
  onClose: () => void;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import("qrcode")
      .then((qr) =>
        qr.toDataURL(joinUrl, { width: 640, margin: 2, errorCorrectionLevel: "M" }),
      )
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [joinUrl]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Join QR code"
      className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center gap-6 p-6"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        aria-label="Close QR overlay"
        className="absolute top-4 right-4 w-11 h-11 flex items-center justify-center rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
      >
        <Icon icon={X} className="w-6 h-6" />
      </button>

      <h2 className="text-2xl md:text-4xl font-bold text-white text-center max-w-3xl truncate">
        {sessionName}
      </h2>
      <p className="text-base md:text-xl text-gray-300">Scan to request a song</p>

      <div
        className="bg-white rounded-3xl p-4 md:p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {failed ? (
          <p className="text-sm text-gray-900 px-6 py-10">
            QR could not be rendered — use the link below.
          </p>
        ) : dataUrl ? (
          // Data-URL QR — plain img on purpose (next/image adds nothing here).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dataUrl}
            alt={`QR code linking to ${joinUrl}`}
            className="w-[min(70vw,70vh,520px)] h-[min(70vw,70vh,520px)]"
          />
        ) : (
          <div
            className="w-[min(70vw,70vh,520px)] h-[min(70vw,70vh,520px)] animate-pulse bg-gray-200 rounded-xl"
            aria-hidden="true"
          />
        )}
      </div>

      <p className="text-sm md:text-lg text-violet-300 break-all text-center max-w-2xl select-all">
        {joinUrl}
      </p>
    </div>
  );
}
