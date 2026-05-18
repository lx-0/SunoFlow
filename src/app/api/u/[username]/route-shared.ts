import { z } from "zod";
import { errorFromResult } from "@/lib/api-error";
import { resolveUserIdByUsername } from "@/lib/profile";
import { zPageParam } from "@/lib/query-params";

export const pageQuery = z.object({ page: zPageParam() });

export async function resolveRouteUsernameOrResponse(username: string) {
  const userResult = await resolveUserIdByUsername(username);
  if (!userResult.ok) return errorFromResult(userResult);
  return { userId: userResult.data.id };
}
