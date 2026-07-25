// Client-safe jam constants. Kept out of prompt.ts because that module reaches
// prisma → credits → notifications → web-push → node:net, and importing it
// from a "use client" component drags all of that into the browser bundle
// (build-only failure — tsc and vitest do not enforce this boundary).

/** Suno's non-custom description mode caps prompts at 500 chars. */
export const JAM_PROMPT_MAX_LENGTH = 500;
/** Open prompts per guest device; a slot frees when the entry leaves "pending". */
export const JAM_MAX_OPEN_PROMPTS_PER_GUEST = 2;
