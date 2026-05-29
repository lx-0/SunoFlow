"use client";

import { useState, useEffect, useCallback } from "react";

export function useSidebarState() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("sidebar-collapsed");
      if (stored === "true") setSidebarCollapsed(true);
    } catch {
      // localStorage unavailable
    }
  }, []);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sidebar-collapsed", String(next));
      } catch {
        // localStorage unavailable
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!sidebarOpen) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setSidebarOpen(false);
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [sidebarOpen]);

  return {
    sidebarOpen,
    sidebarCollapsed,
    openSidebar,
    closeSidebar,
    toggleSidebarCollapsed,
  };
}
