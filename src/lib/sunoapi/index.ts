/**
 * sunoapi.org API client
 *
 * Tree-shakeable, no side-effects on import.
 * API key is read from SUNOAPI_KEY env var at call time — never hard-coded.
 *
 * Split into domain modules:
 *   - types.ts       — shared type definitions
 *   - http.ts        — error class, fetch helpers, response mappers
 *   - generation.ts  — music generation, extension, mashup, section replacement, sounds, cover images
 *   - lyrics.ts      — lyrics generation & timestamped lyrics
 *   - audio.ts       — vocal separation, WAV conversion, MIDI, music video
 *   - persona.ts     — persona creation, style boost
 *   - status.ts      — task status polling, credits query, detailed status for all task types
 *   - songs.ts       — song listing, retrieval, download
 *   - uploads.ts     — file uploads (base64, URL)
 */

// Types
export type {
  SongStatus,
  TaskStatus,
  SunoModel,
  VocalGender,
  PersonaModel,
  SeparationType,
  SoundKey,
  SunoSong,
  StyleTuningOptions,
  GenerateSongOptions,
  GenerateResult,
  TaskStatusResult,
  ExtendMusicOptions,
  UploadCoverOptions,
  UploadExtendOptions,
  AddVocalsOptions,
  AddInstrumentalOptions,
  GenerateLyricsOptions,
  LyricsResult,
  TimestampedWord,
  TimestampedLyricsResult,
  SeparateVocalsOptions,
  ConvertToWavOptions,
  MusicVideoOptions,
  GeneratePersonaOptions,
  PersonaResult,
  MashupOptions,
  ReplaceSectionOptions,
  GenerateMidiOptions,
  BoostStyleResult,
  FileUploadResult,
  GenerateSoundsOptions,
  GenerateCoverImageOptions,
  CoverImageResult,
  LyricsTaskStatus,
  LyricsDetailResult,
  VocalSeparationStatus,
  VocalSeparationDetailResult,
  WavConversionStatus,
  WavConversionDetailResult,
  MusicVideoStatus,
  MusicVideoDetailResult,
  MidiNote,
  MidiInstrument,
  MidiDetailResult,
  CoverImageDetailResult,
  StreamUploadResult,
} from "./types";

// Error classes
export { SunoApiError, type SunoApiErrorCode } from "./http";
export { SunoValidationError } from "./validation";
export { CircuitOpenError } from "@/lib/circuit-breaker";

// Music generation
export {
  generateSong,
  extendMusic,
  uploadAndCover,
  uploadAndExtend,
  addVocals,
  addInstrumental,
  generateMashup,
  replaceSection,
  generateSounds,
  generateCoverImage,
} from "./generation";

// Lyrics
export { generateLyrics, getTimestampedLyrics } from "./lyrics";

// Audio processing & music video
export { separateVocals, convertToWav, generateMidi, createMusicVideo } from "./audio";

// Persona & style
export { generatePersona, boostStyle } from "./persona";

// Status & credits
export {
  getTaskStatus,
  getRemainingCredits,
  getLyricsDetail,
  getVocalSeparationDetail,
  getWavConversionDetail,
  getMusicVideoDetail,
  getMidiDetail,
  getCoverImageDetail,
} from "./status";

// Song retrieval
export { listSongs, getSongById, downloadSong } from "./songs";

// File uploads
export { uploadFileBase64, uploadFileFromUrl, uploadFileStream } from "./uploads";

// Convenience namespace
import { generateSong, extendMusic, uploadAndCover, uploadAndExtend, addVocals, addInstrumental, generateMashup, replaceSection, generateSounds, generateCoverImage } from "./generation";
import { generateLyrics, getTimestampedLyrics } from "./lyrics";
import { separateVocals, convertToWav, generateMidi, createMusicVideo } from "./audio";
import { generatePersona, boostStyle } from "./persona";
import { getTaskStatus, getRemainingCredits, getLyricsDetail, getVocalSeparationDetail, getWavConversionDetail, getMusicVideoDetail, getMidiDetail, getCoverImageDetail } from "./status";
import { listSongs, getSongById, downloadSong } from "./songs";
import { uploadFileBase64, uploadFileFromUrl, uploadFileStream } from "./uploads";

export const sunoApi = {
  generateSong,
  extendMusic,
  uploadAndCover,
  uploadAndExtend,
  addVocals,
  addInstrumental,
  generateMashup,
  replaceSection,
  generateSounds,
  generateCoverImage,
  generateLyrics,
  getTimestampedLyrics,
  separateVocals,
  convertToWav,
  generateMidi,
  createMusicVideo,
  generatePersona,
  boostStyle,
  getTaskStatus,
  getRemainingCredits,
  getLyricsDetail,
  getVocalSeparationDetail,
  getWavConversionDetail,
  getMusicVideoDetail,
  getMidiDetail,
  getCoverImageDetail,
  listSongs,
  getSongById,
  downloadSong,
  uploadFileBase64,
  uploadFileFromUrl,
  uploadFileStream,
} as const;
