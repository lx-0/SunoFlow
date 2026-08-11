import type { Metadata } from "next";
import { APP_NAME } from "@/lib/branding";

export const metadata: Metadata = {
  title: "Profile",
  description: `View and update your ${APP_NAME} profile and account details.`,
  robots: { index: false },
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
