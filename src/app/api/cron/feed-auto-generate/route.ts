import { NextResponse } from "next/server";
import { cronRoute } from "@/lib/route-handler";
import { processAutoGenerateFeeds } from "@/lib/rss/auto-generate";
import { withJobRun } from "@/lib/jobs/job-run";

// Manual-trigger backstop — the scheduled run happens in-process via the
// `feed-auto-generate` job in src/lib/jobs/job-definitions.ts. Same JobRun
// name so both trigger paths share one history.
export const POST = cronRoute(async () => {
  const result = await withJobRun("feed-auto-generate", () =>
    processAutoGenerateFeeds()
  );
  return NextResponse.json(result);
});
