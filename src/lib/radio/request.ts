import { z } from "zod";
import { zCsvParam, zIntParam, zLimitParam, zTrimmedParam } from "@/lib/query-params";

export const radioQuerySchema = z.object({
  mood: zTrimmedParam,
  genre: zTrimmedParam,
  tempoMin: zIntParam,
  tempoMax: zIntParam,
  excludeIds: zCsvParam,
  seedSongId: zTrimmedParam,
  limit: zLimitParam(20, 50),
});

export type RadioQueryInput = z.infer<typeof radioQuerySchema>;
