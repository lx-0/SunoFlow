import type { Metadata } from "next";
import localFont from "next/font/local";
import { getSiteUrl } from "@/lib/site-url";
import { PublicProviders } from "./providers";
import "../globals.css";

const geistSans = localFont({
  src: "../fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "../fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
  preload: false,
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
};

export default function PublicSongLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("sunoflow_theme");var d=t==="system"?window.matchMedia("(prefers-color-scheme: dark)").matches:t!=="light";if(d)document.documentElement.classList.add("dark")}catch(e){document.documentElement.classList.add("dark")}})()`,
          }}
        />
      </head>
      <body className="antialiased bg-surface-deep text-primary min-h-screen">
        <PublicProviders>
          {children}
        </PublicProviders>
      </body>
    </html>
  );
}
