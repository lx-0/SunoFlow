"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { ThemeProvider } from "./ThemeProvider";
import { ToastProvider } from "./Toast";
import { GlobalErrorHandler } from "./GlobalErrorHandler";
import { QueueProvider } from "./QueueContext";
import { OnboardingProvider } from "./OnboardingTour";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider>
      <ThemeProvider>
        <ToastProvider>
          <QueueProvider>
            <GlobalErrorHandler />
            <OnboardingProvider>
              {children}
            </OnboardingProvider>
          </QueueProvider>
        </ToastProvider>
      </ThemeProvider>
    </NextAuthSessionProvider>
  );
}
