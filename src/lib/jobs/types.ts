export type JobDefinition = {
  name: string;
  cron: string;
  run: () => Promise<unknown> | void;
  /**
   * Staleness threshold for /api/health: the job is flagged stale when its
   * latest persisted JobRun is older than this. Set it comfortably above the
   * cron cadence (e.g. 26h for a daily job) to absorb deploy windows.
   */
  expectedMaxAgeMs?: number;
};

export type RegisterJobFn = (
  name: string,
  cron: string,
  run: () => Promise<unknown> | void,
  options?: { expectedMaxAgeMs?: number }
) => void;
