import { NextResponse } from "next/server";
import { cronRoute } from "@/lib/route-handler";
import { generateSongEmbeddings } from "@/lib/jobs/generate-embeddings";
import { withJobRun } from "@/lib/jobs/job-run";

// Manual-trigger backstop — the scheduled run happens in-process via the
// `generate-embeddings` job in src/lib/jobs/job-definitions.ts. Same JobRun
// name so both trigger paths share one history.
export const POST = cronRoute(async () => {
  const result = await withJobRun("generate-embeddings", () =>
    generateSongEmbeddings()
  );
  return NextResponse.json(result);
});
