/**
 * Synthetic-user personas for the agentic UX smoke test.
 *
 * IMPORTANT (grounded in research, 2024–2026): these personas are a cheap
 * pre-screen for *navigation / flow* defects only. They are NOT a valid proxy
 * for real taste/preference judgements — out-of-the-box LLM personas predict
 * the next real human action at only ~12% accuracy (arXiv:2503.20749), and
 * persona-conditioning flattens/​misportrays identity groups (arXiv:2402.01908).
 * Treat every "note" they emit as a hypothesis to confirm with a real user,
 * never as a verdict.
 */

export interface Persona {
  /** Stable slug, used for report filenames. */
  id: string;
  /** Human-readable label for reports. */
  label: string;
  /**
   * Persona-conditioning prompt. Describes who the user is and how they behave.
   * Kept deliberately behavioural (how they navigate, what confuses them),
   * not demographic — demographic conditioning is the weakest, most-biased part.
   */
  bio: string;
  /** Hard cap on agent steps before we abort the run (models "patience"). */
  maxSteps: number;
}

export const PERSONAS: Persona[] = [
  {
    id: "casual-listener",
    label: "Casual listener (low tech-confidence)",
    bio: [
      "You are a casual music listener who is NOT very confident with apps.",
      "You read button labels literally and get confused by jargon, dense screens,",
      "or anything that doesn't clearly say what it does. You do not guess at hidden",
      "gestures. If something is unclear or you can't find the obvious next step,",
      "you record a friction note rather than persevering.",
    ].join(" "),
    maxSteps: 18,
  },
  {
    id: "power-user",
    label: "Power user (large library, impatient)",
    bio: [
      "You are an experienced power user with a large library. You move fast, expect",
      "search and keyboard-friendly flows, and get frustrated by extra clicks, slow",
      "feedback, or steps that should be one action. You notice when affordances are",
      "missing (no bulk action, no obvious sort) and record those as friction.",
    ].join(" "),
    maxSteps: 14,
  },
];
