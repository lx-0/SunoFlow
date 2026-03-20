"use client";

import { useEffect } from "react";
import { useToast } from "./Toast";

export function GlobalErrorHandler() {
  const { toast } = useToast();

  useEffect(() => {
    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      console.error("Unhandled promise rejection:", event.reason);
      toast("Something went wrong. Please try again.", "error");
    }

    function handleError(event: ErrorEvent) {
      console.error("Unhandled error:", event.error);
      toast("An unexpected error occurred.", "error");
    }

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleError);
    };
  }, [toast]);

  return null;
}
