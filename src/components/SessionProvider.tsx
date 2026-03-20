"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { ToastProvider } from "./Toast";
import { GlobalErrorHandler } from "./GlobalErrorHandler";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider>
      <ToastProvider>
        <GlobalErrorHandler />
        {children}
      </ToastProvider>
    </NextAuthSessionProvider>
  );
}
