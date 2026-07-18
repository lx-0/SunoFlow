"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";
import { apiGet } from "@/lib/api-client";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<object | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<object>("/api/v1/openapi.json")
      .then(setSpec)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load API spec"));
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-gray-50">
        <p>Error loading API docs: {error}</p>
      </div>
    );
  }

  if (!spec) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-gray-50">
        <p>Loading API documentation...</p>
      </div>
    );
  }

  return (
    // SwaggerUI ships light-only CSS (swagger-ui.css), so this surface stays
    // deliberately light in both modes — bg-gray-50 is the tinted near-white
    // (DESIGN.md bans pure #fff), not a missing dark: variant.
    <div className="min-h-screen bg-gray-50">
      <SwaggerUI spec={spec} />
    </div>
  );
}
