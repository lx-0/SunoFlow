"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { ThemeProvider } from "./ThemeProvider";
import { ToastProvider } from "./Toast";
import { GlobalErrorHandler } from "./GlobalErrorHandler";
import { QueueProvider } from "./QueueContext";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider>
      <ThemeProvider>
        <ToastProvider>
          <QueueProvider>
            <GlobalErrorHandler />
            {children}
          </QueueProvider>
        </ToastProvider>
      </ThemeProvider>
    </NextAuthSessionProvider>
  );
}
