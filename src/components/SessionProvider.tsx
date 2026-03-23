"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { ThemeProvider } from "./ThemeProvider";
import { ToastProvider } from "./Toast";
import { GlobalErrorHandler } from "./GlobalErrorHandler";
import { QueueProvider } from "./QueueContext";
import { OnboardingProvider } from "./OnboardingTour";
import { NotificationProvider, useNotifications } from "./NotificationContext";
import { ApiKeyWizard } from "./ApiKeyWizard";
import { Confetti } from "./Confetti";

function ConfettiBridge() {
  const { showConfetti, dismissConfetti } = useNotifications();
  if (!showConfetti) return null;
  return <Confetti onDone={dismissConfetti} />;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider>
      <ThemeProvider>
        <ToastProvider>
          <QueueProvider>
            <NotificationProvider>
              <GlobalErrorHandler />
              <OnboardingProvider>
                {children}
                <ApiKeyWizard />
                <ConfettiBridge />
              </OnboardingProvider>
            </NotificationProvider>
          </QueueProvider>
        </ToastProvider>
      </ThemeProvider>
    </NextAuthSessionProvider>
  );
}
