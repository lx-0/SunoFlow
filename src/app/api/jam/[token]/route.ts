import { anonRoute, resultResponse } from "@/lib/route-handler";
import { getJamSessionState } from "@/lib/jam";

// The whole party polls from ONE NAT'd Wi-Fi IP (15 guests × ~12 polls/min),
// so the IP limit is a generous abuse backstop, not a throttle.
export const GET = anonRoute<{ token: string }>(
  async (_request, { params }) =>
    resultResponse(await getJamSessionState(params.token)),
  {
    route: "/api/jam/[token]",
    rateLimit: { action: "jam-state", limit: 600, windowMs: 60_000 },
  },
);
