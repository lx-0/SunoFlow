import type {
  GenerateSongOptions,
  GenerateResult,
  ExtendMusicOptions,
  UploadCoverOptions,
  UploadExtendOptions,
  AddVocalsOptions,
  AddInstrumentalOptions,
  MashupOptions,
  ReplaceSectionOptions,
} from "./types";
import {
  BASE_URL,
  NOOP_CALLBACK_URL,
  DEFAULT_MODEL,
  fetchWithRetry,
  buildHeaders,
  extractTaskId,
  applyStyleTuning,
} from "./http";

/**
 * Generate songs from a text prompt.
 * Returns a taskId — songs are generated asynchronously (2 songs per request).
 * Poll with getTaskStatus() to get the completed songs.
 */
export async function generateSong(
  prompt: string,
  options: GenerateSongOptions = {},
  apiKey?: string
): Promise<GenerateResult> {
  const instrumental = options.instrumental ?? false;
  const customMode = !!(options.title || options.style);

  const body: Record<string, unknown> = {
    prompt,
    instrumental,
    customMode,
    model: options.model ?? DEFAULT_MODEL,
    callBackUrl: NOOP_CALLBACK_URL,
  };

  if (options.style) body.style = options.style;
  if (options.title) body.title = options.title;
  applyStyleTuning(body, options);

  const res = await fetchWithRetry(`${BASE_URL}/generate`, {
    method: "POST",
    headers: buildHeaders(apiKey),
    body: JSON.stringify(body),
  });

  const taskId = await extractTaskId(res, "generate API");
  return { taskId };
}

/**
 * Extend an existing song. The model must match the source audio's model.
 * Set defaultParamFlag=true and provide prompt/style/title/continueAt for custom extension.
 */
export async function extendMusic(
  options: ExtendMusicOptions,
  apiKey?: string
): Promise<GenerateResult> {
  const body: Record<string, unknown> = {
    audioId: options.audioId,
    defaultParamFlag: options.defaultParamFlag ?? false,
    model: options.model ?? DEFAULT_MODEL,
    callBackUrl: NOOP_CALLBACK_URL,
  };

  if (options.prompt != null) body.prompt = options.prompt;
  if (options.style != null) body.style = options.style;
  if (options.title != null) body.title = options.title;
  if (options.continueAt != null) body.continueAt = options.continueAt;
  applyStyleTuning(body, options);

  const res = await fetchWithRetry(`${BASE_URL}/generate/extend`, {
    method: "POST",
    headers: buildHeaders(apiKey),
    body: JSON.stringify(body),
  });

  const taskId = await extractTaskId(res, "extend API");
  return { taskId };
}

/**
 * Upload audio and create a cover version in a new style.
 */
export async function uploadAndCover(
  options: UploadCoverOptions,
  apiKey?: string
): Promise<GenerateResult> {
  const customMode = options.customMode ?? false;
  const instrumental = options.instrumental ?? false;

  const body: Record<string, unknown> = {
    uploadUrl: options.uploadUrl,
    customMode,
    instrumental,
    model: options.model ?? DEFAULT_MODEL,
    callBackUrl: NOOP_CALLBACK_URL,
  };

  if (options.prompt != null) body.prompt = options.prompt;
  if (options.style != null) body.style = options.style;
  if (options.title != null) body.title = options.title;
  applyStyleTuning(body, options);

  const res = await fetchWithRetry(`${BASE_URL}/generate/upload-cover`, {
    method: "POST",
    headers: buildHeaders(apiKey),
    body: JSON.stringify(body),
  });

  const taskId = await extractTaskId(res, "upload-cover API");
  return { taskId };
}

/**
 * Upload audio and extend it with AI-generated continuation.
 */
export async function uploadAndExtend(
  options: UploadExtendOptions,
  apiKey?: string
): Promise<GenerateResult> {
  const body: Record<string, unknown> = {
    uploadUrl: options.uploadUrl,
    defaultParamFlag: options.defaultParamFlag ?? false,
    model: options.model ?? DEFAULT_MODEL,
    callBackUrl: NOOP_CALLBACK_URL,
  };

  if (options.instrumental != null) body.instrumental = options.instrumental;
  if (options.prompt != null) body.prompt = options.prompt;
  if (options.style != null) body.style = options.style;
  if (options.title != null) body.title = options.title;
  if (options.continueAt != null) body.continueAt = options.continueAt;
  applyStyleTuning(body, options);

  const res = await fetchWithRetry(`${BASE_URL}/generate/upload-extend`, {
    method: "POST",
    headers: buildHeaders(apiKey),
    body: JSON.stringify(body),
  });

  const taskId = await extractTaskId(res, "upload-extend API");
  return { taskId };
}

/**
 * Add AI-generated vocals over an instrumental track.
 */
export async function addVocals(
  options: AddVocalsOptions,
  apiKey?: string
): Promise<GenerateResult> {
  const body: Record<string, unknown> = {
    uploadUrl: options.uploadUrl,
    prompt: options.prompt,
    title: options.title,
    style: options.style,
    callBackUrl: NOOP_CALLBACK_URL,
  };

  if (options.negativeTags != null) body.negativeTags = options.negativeTags;
  if (options.vocalGender != null) body.vocalGender = options.vocalGender;
  if (options.styleWeight != null) body.styleWeight = options.styleWeight;
  if (options.weirdnessConstraint != null) body.weirdnessConstraint = options.weirdnessConstraint;
  if (options.audioWeight != null) body.audioWeight = options.audioWeight;
  if (options.model != null) body.model = options.model;

  const res = await fetchWithRetry(`${BASE_URL}/generate/add-vocals`, {
    method: "POST",
    headers: buildHeaders(apiKey),
    body: JSON.stringify(body),
  });

  const taskId = await extractTaskId(res, "add-vocals API");
  return { taskId };
}

/**
 * Generate instrumental backing for a vocal track.
 */
export async function addInstrumental(
  options: AddInstrumentalOptions,
  apiKey?: string
): Promise<GenerateResult> {
  const body: Record<string, unknown> = {
    uploadUrl: options.uploadUrl,
    title: options.title,
    tags: options.tags,
    callBackUrl: NOOP_CALLBACK_URL,
  };

  if (options.negativeTags != null) body.negativeTags = options.negativeTags;
  if (options.vocalGender != null) body.vocalGender = options.vocalGender;
  if (options.styleWeight != null) body.styleWeight = options.styleWeight;
  if (options.audioWeight != null) body.audioWeight = options.audioWeight;
  if (options.weirdnessConstraint != null) body.weirdnessConstraint = options.weirdnessConstraint;
  if (options.model != null) body.model = options.model;

  const res = await fetchWithRetry(`${BASE_URL}/generate/add-instrumental`, {
    method: "POST",
    headers: buildHeaders(apiKey),
    body: JSON.stringify(body),
  });

  const taskId = await extractTaskId(res, "add-instrumental API");
  return { taskId };
}

/**
 * Blend two audio files into a mashup.
 */
export async function generateMashup(
  options: MashupOptions,
  apiKey?: string
): Promise<GenerateResult> {
  const customMode = options.customMode ?? false;

  const body: Record<string, unknown> = {
    uploadUrlList: options.uploadUrlList,
    customMode,
    model: options.model ?? DEFAULT_MODEL,
    callBackUrl: NOOP_CALLBACK_URL,
  };

  if (options.instrumental != null) body.instrumental = options.instrumental;
  if (options.prompt != null) body.prompt = options.prompt;
  if (options.style != null) body.style = options.style;
  if (options.title != null) body.title = options.title;
  applyStyleTuning(body, options);

  const res = await fetchWithRetry(`${BASE_URL}/generate/mashup`, {
    method: "POST",
    headers: buildHeaders(apiKey),
    body: JSON.stringify(body),
  });

  const taskId = await extractTaskId(res, "mashup API");
  return { taskId };
}

/**
 * Replace a specific time section of an existing track.
 * Time range must be 6–60 seconds and ≤50% of original track length.
 */
export async function replaceSection(
  options: ReplaceSectionOptions,
  apiKey?: string
): Promise<GenerateResult> {
  const body: Record<string, unknown> = {
    taskId: options.taskId,
    audioId: options.audioId,
    prompt: options.prompt,
    tags: options.tags,
    title: options.title,
    infillStartS: options.infillStartS,
    infillEndS: options.infillEndS,
    callBackUrl: NOOP_CALLBACK_URL,
  };

  if (options.negativeTags != null) body.negativeTags = options.negativeTags;

  const res = await fetchWithRetry(`${BASE_URL}/generate/replace-section`, {
    method: "POST",
    headers: buildHeaders(apiKey),
    body: JSON.stringify(body),
  });

  const taskId = await extractTaskId(res, "replace-section API");
  return { taskId };
}
