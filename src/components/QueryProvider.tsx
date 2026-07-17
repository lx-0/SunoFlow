"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HttpError } from "@sunoflow/core";
import { useState } from "react";

// Re-exported so existing `import { HttpError } from "@/components/QueryProvider"`
// call sites keep the SAME class identity as the @sunoflow/core http-client —
// the instanceof check in the retry logic below must match errors thrown by
// src/lib/api-client.ts.
export { HttpError };

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: "always",
        refetchOnReconnect: "always",
        networkMode: "offlineFirst",
        retry: (failureCount, error) => {
          if (error instanceof HttpError && error.status >= 400 && error.status < 500) {
            return false;
          }
          return failureCount < 2;
        },
      },
      mutations: {
        networkMode: "offlineFirst",
        retry: false,
      },
    },
  });
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(makeClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
