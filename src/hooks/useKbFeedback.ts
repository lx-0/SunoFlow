"use client";

import { useState, useCallback, useRef } from "react";

export function useKbFeedback() {
  const [kbFeedback, setKbFeedback] = useState<string | null>(null);
  const kbFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showKbFeedback = useCallback((message: string) => {
    if (kbFeedbackTimerRef.current) clearTimeout(kbFeedbackTimerRef.current);
    setKbFeedback(message);
    kbFeedbackTimerRef.current = setTimeout(() => setKbFeedback(null), 1000);
  }, []);

  return { kbFeedback, showKbFeedback };
}
