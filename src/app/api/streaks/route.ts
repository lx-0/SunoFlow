import { authDataRoute } from "@/lib/route-handler";
import { getUserStreak } from "@/lib/streaks";

export const GET = authDataRoute(async (_request, { auth }) => {
  const streak = await getUserStreak(auth.userId);
  return { streak };
}, { route: "/api/streaks" });
