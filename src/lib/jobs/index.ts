import { registerJob } from "@/lib/scheduler";
import { JOB_DEFINITIONS } from "@/lib/jobs/job-definitions";

export function registerAllJobs() {
  for (const { name, cron, run } of JOB_DEFINITIONS) {
    registerJob(name, cron, run);
  }
}
