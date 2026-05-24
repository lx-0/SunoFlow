import { getCircuitStatus, resetCircuit } from "@/lib/circuit-breaker";
import { authDataRoute, adminDataRoute } from "@/lib/route-handler";

/** GET /api/suno/circuit-breaker — return current circuit state (public to authenticated users). */
export const GET = authDataRoute(async () => {
  return getCircuitStatus();
}, { route: "/api/suno/circuit-breaker" });

/** POST /api/suno/circuit-breaker/reset — admin-only force-reset. */
export const POST = adminDataRoute(async () => {
  resetCircuit();
  return { ok: true, status: getCircuitStatus() };
}, { route: "/api/suno/circuit-breaker" });
