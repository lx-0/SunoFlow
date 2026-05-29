import { z } from "zod";
import { zLimitParam } from "@/lib/query-params";

export const recommendationQuerySchema = z.object({
  limit: zLimitParam(8, 8),
});

export type RecommendationQuery = z.infer<typeof recommendationQuerySchema>;
