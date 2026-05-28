import { MAX_VARIATIONS } from "@/lib/songs/variations/constants";
import { normalizeVariationTags, variationTitle } from "@/lib/songs/variations/helpers";
import { resolveRootId } from "@/lib/songs/variations/parent-context";
import { getVariationFamily } from "@/lib/songs/variations/family";
import {
  createVariation,
  addVocals,
  addInstrumental,
  replaceSection,
  extendSong,
  separateVocals,
} from "@/lib/songs/variations/generate";
import type {
  VariationFamily,
  VariationInput,
  AddVocalsInput,
  AddInstrumentalInput,
  ReplaceSectionInput,
  ExtendSongInput,
  SeparateVocalsInput,
  VariationRow,
} from "@/lib/songs/variations/types";

export { MAX_VARIATIONS };
export type {
  VariationFamily,
  VariationInput,
  AddVocalsInput,
  AddInstrumentalInput,
  ReplaceSectionInput,
  ExtendSongInput,
  SeparateVocalsInput,
  VariationRow,
};
export { normalizeVariationTags, variationTitle, resolveRootId };
export { getVariationFamily, createVariation, addVocals, addInstrumental, replaceSection, extendSong, separateVocals };
