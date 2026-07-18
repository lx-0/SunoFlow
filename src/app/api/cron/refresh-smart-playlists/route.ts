import { NextResponse } from "next/server";
import { cronRoute } from "@/lib/route-handler";
import { refreshStalePlaylists } from "@/lib/smart-playlists";
import { withJobRun } from "@/lib/jobs/job-run";
import { logger } from "@/lib/logger";

// Manual-trigger backstop for the in-process `smart-playlist-refresh` job
// (src/lib/jobs/job-definitions.ts). Recorded under the job's name so both
// trigger paths share one JobRun history.
export const POST = cronRoute(async () => {
  const { refreshed, skipped } = await withJobRun("smart-playlist-refresh", () =>
    refreshStalePlaylists()
  );

  logger.info(
    { refreshed, skipped },
    "refresh-smart-playlists: cron run complete"
  );

  return NextResponse.json({ refreshed, skipped });
});
