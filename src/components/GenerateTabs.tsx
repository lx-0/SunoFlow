"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { GenerateForm } from "./GenerateForm";
// Lazy-load upload tab — only rendered when user switches to the upload tab
const AudioUploadForm = dynamic(() => import("./AudioUploadForm").then((m) => m.AudioUploadForm));
import { Sparkles, Upload } from "lucide-react";
import { Icon } from "@/components/ui/Icon";

type Tab = "create" | "upload";

export function GenerateTabs() {
  const searchParams = useSearchParams();
  const initialTab: Tab = searchParams.get("tab") === "upload" ? "upload" : "create";
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  return (
    <div className="space-y-0">
      {/* Tab navigation */}
      <div
        className="flex border-b border-border px-4 pt-4"
        role="tablist"
        aria-label="Creation mode"
        onKeyDown={(e) => {
          if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
          e.preventDefault();
          setActiveTab((current) => (current === "create" ? "upload" : "create"));
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("create")}
          role="tab"
          aria-selected={activeTab === "create"}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === "create"
              ? "border-violet-600 text-violet-600 dark:text-violet-400 dark:border-violet-400"
              : "border-transparent text-secondary hover:text-primary hover:border-border-strong"
          }`}
        >
          <Icon icon={Sparkles} className="h-4 w-4" />
          Create
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("upload")}
          role="tab"
          aria-selected={activeTab === "upload"}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === "upload"
              ? "border-violet-600 text-violet-600 dark:text-violet-400 dark:border-violet-400"
              : "border-transparent text-secondary hover:text-primary hover:border-border-strong"
          }`}
        >
          <Icon icon={Upload} className="h-4 w-4" />
          Upload
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "create" ? (
        <GenerateForm />
      ) : (
        <div className="px-4 py-4 space-y-6">
          <div>
            <h1 className="text-xl font-bold text-primary">Upload &amp; Generate</h1>
            <p className="text-secondary text-sm mt-0.5">Upload audio to create a cover or extend it with AI</p>
          </div>
          <AudioUploadForm />
        </div>
      )}
    </div>
  );
}
