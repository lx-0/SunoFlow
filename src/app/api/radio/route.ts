import { NextResponse } from "next/server";
import { authRoute } from "@/lib/route-handler";
import { curateRadio } from "@/lib/radio";
import { radioQuerySchema, type RadioQueryInput } from "@/lib/radio/request";
import { CacheControl } from "@/lib/cache";

export const GET = authRoute<Record<string, never>, undefined, RadioQueryInput>(async (_request, { auth, query }) => {
  const { mood, genre, tempoMin, tempoMax, excludeIds, seedSongId, limit } = query;

  const result = await curateRadio({
    userId: auth.userId,
    mood: mood || undefined,
    genre: genre || undefined,
    tempoMin: tempoMin && tempoMin > 0 ? tempoMin : undefined,
    tempoMax: tempoMax && tempoMax > 0 ? tempoMax : undefined,
    excludeIds,
    seedSongId: seedSongId || undefined,
    limit,
  });

  return NextResponse.json(result, {
    headers: { "Cache-Control": CacheControl.privateNoCache },
  });
}, { route: "/api/radio", query: radioQuerySchema });
