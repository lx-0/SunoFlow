// @sunoflow/core — framework-agnostic shared TypeScript for the web (root) and
// mobile (apps/mobile) apps. Pure functions / types only: no React, no Next, no
// Node-only or Expo-only imports, so it is safe to consume from either runtime.
export { formatDuration } from "./time-format";
export {
  parseTags,
  splitTagCsv,
  normalizedTagList,
  firstTag,
  normalizeTagCombo,
  collectSongTokens,
  tagOverlapScore,
  countGenres,
} from "./tags";
export {
  EMOJI_REACTIONS,
  REACTION_DISPLAY_COUNT,
  REACTION_TOP_USED_COUNT,
  shuffleEmojis,
  pickReactionEmojis,
} from "./reactions";
export { downsamplePeaks } from "./peaks";
export {
  createPlaylistBody,
  updatePlaylistBody,
  addPlaylistSongBody,
  reorderPlaylistSongsBody,
  recordHistoryRequestSchema,
  type CreatePlaylistBody,
  type UpdatePlaylistBody,
  type AddPlaylistSongBody,
  type ReorderPlaylistSongsBody,
  type RecordHistoryRequest,
} from "./schemas";
export {
  MILESTONE_TYPES,
  MILESTONE_META,
  MILESTONE_CATALOG,
  type MilestoneType,
  type MilestoneMeta,
} from "./milestones";
export {
  generateSongRequestSchema,
  type GenerateSongRequest,
  GENERATION_PROMPT_MAX_LENGTH,
  GENERATION_TITLE_MAX_LENGTH,
  GENERATION_STYLE_MAX_LENGTH,
  GENERATION_PROMPT_REQUIRED_MESSAGE,
  GENERATION_PROMPT_MAX_MESSAGE,
  GENERATION_TITLE_MAX_MESSAGE,
  GENERATION_STYLE_MAX_MESSAGE,
  GENERATION_TAGS_MAX_MESSAGE,
  MIN_BATCH_SIZE,
  MAX_BATCH_SIZE,
  GENERATION_STATUS,
  GENERATION_TERMINAL_STATUSES,
  type GenerationStatus,
  isTerminalGenerationStatus,
} from "./generation";
export { mashupRequestSchema, type MashupRequest } from "./mashup";
export { changePasswordBody, type ChangePasswordBody } from "./auth";
export { uploadBodySchema, MAX_BASE64_SIZE, type UploadBody } from "./upload";
