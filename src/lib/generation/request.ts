import { sanitizeGenerationInput } from "./params";

// The /api/generate request schema is shared 1:1 with the mobile client and
// lives in @sunoflow/core (single source of truth). Re-exported here so existing
// "@/lib/generation/request" importers keep working.
export {
  generateSongRequestSchema,
  type GenerateSongRequest,
} from "@sunoflow/core";
import type { GenerateSongRequest } from "@sunoflow/core";

export function sanitizeGenerateSongRequest(body: GenerateSongRequest) {
  return sanitizeGenerationInput({
    prompt: body.prompt,
    title: body.title,
    style: body.tags,
    makeInstrumental: body.makeInstrumental,
    personaId: body.personaId,
    parentSongId: body.parentSongId,
  });
}
