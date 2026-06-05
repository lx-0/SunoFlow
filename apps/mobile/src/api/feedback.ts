import { apiPost } from "./client";

// User feedback. Mirrors the web POST /api/feedback contract: bug reports
// require a comment (server returns 400 otherwise), pageUrl identifies the
// origin so feedback from the native app is distinguishable from the web UI.

export type FeedbackCategory = "bug_report" | "feature_request" | "general";

export async function sendFeedback(input: {
  category: FeedbackCategory;
  comment?: string;
  score?: number;
}): Promise<void> {
  const { category, comment, score } = input;
  await apiPost("/api/feedback", {
    category,
    pageUrl: "mobile:feedback",
    ...(comment?.trim() ? { comment: comment.trim() } : {}),
    ...(score ? { score } : {}),
  });
}
