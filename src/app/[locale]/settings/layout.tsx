import type { Metadata } from "next";
import { APP_NAME } from "@/lib/branding";

export const metadata: Metadata = {
  title: "Settings",
  description: `Manage your ${APP_NAME} account preferences, API keys, and notification settings.`,
  robots: { index: false },
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
