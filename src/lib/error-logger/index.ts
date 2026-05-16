/**
 * Barrel re-export for backwards compatibility with the prior
 * single-file `@/lib/error-logger` module. Prefer importing from the
 * specific submodule when the runtime context is known:
 *
 *   - server code → `@/lib/error-logger/server` (logServerError)
 *   - client code → `@/lib/error-logger/client` (logError)
 *
 * Both names are also re-exported here so the dozens of existing
 * `import { logServerError } from "@/lib/error-logger"` call sites
 * keep working unchanged.
 */
export { logServerError } from "./server";
export { logError } from "./client";
