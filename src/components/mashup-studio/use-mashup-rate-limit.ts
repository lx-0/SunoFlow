"use client";

import { useRef, useState } from "react";

interface RateLimitStatus {
  remaining: number;
  limit: number;
  resetAt: string;
}

export function useMashupRateLimit() {
  const [rateLimit, setRateLimit] = useState<RateLimitStatus | null>(null);

  const fetched = useRef(false);
  if (!fetched.current) {
    fetched.current = true;
    fetch("/api/rate-limit/status")
      .then((r) => r.json())
      .then((d) => setRateLimit(d))
      .catch(() => {});
  }

  const rateLimitExhausted = rateLimit != null && rateLimit.remaining <= 0;

  return { rateLimit, setRateLimit, rateLimitExhausted };
}
