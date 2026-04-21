import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  get DATABASE_URL() { return "postgres://test:test@localhost:5432/test"; },
  get AUTH_SECRET() { return "test-secret"; },
  get NEXTAUTH_URL() { return "http://localhost:3000"; },
  get SUNOAPI_KEY() { return "test-api-key"; },
  get SUNO_API_TIMEOUT_MS() { return 30000; },
  get RATE_LIMIT_MAX_GENERATIONS() { return 10; },
  get WEBHOOK_BASE_URL() { return "http://localhost:3000"; },
  get SUNO_WEBHOOK_SECRET() { return "test-webhook-secret"; },
  env: {},
}));

import {
  SunoValidationError,
  validatePrompt,
  validateNonCustomPrompt,
  validateStyle,
  validateTitle,
  validateLyricsPrompt,
  validateSoundsPrompt,
  validateSoundTempo,
  validateInfillRange,
  validatePersonaVocalSegment,
  validateStyleTuningWeights,
  validateAuthor,
  validateDomainName,
} from "./validation";

// ── SunoValidationError ──────────────────────────────────────────────────────

describe("SunoValidationError", () => {
  it("has correct name and instanceof", () => {
    const err = new SunoValidationError("test");
    expect(err).toBeInstanceOf(SunoValidationError);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("SunoValidationError");
  });
});

// ── Model-specific prompt limits ─────────────────────────────────────────────

describe("validatePrompt", () => {
  it("allows V4 prompt at 3000 chars", () => {
    expect(() => validatePrompt("x".repeat(3000), "V4")).not.toThrow();
  });

  it("rejects V4 prompt over 3000 chars", () => {
    expect(() => validatePrompt("x".repeat(3001), "V4")).toThrow(SunoValidationError);
    expect(() => validatePrompt("x".repeat(3001), "V4")).toThrow(/exceeds 3000/);
  });

  it("allows V5_5 prompt at 5000 chars", () => {
    expect(() => validatePrompt("x".repeat(5000), "V5_5")).not.toThrow();
  });

  it("rejects V5_5 prompt over 5000 chars", () => {
    expect(() => validatePrompt("x".repeat(5001), "V5_5")).toThrow(SunoValidationError);
  });

  it("allows V4_5 prompt at 5000 chars", () => {
    expect(() => validatePrompt("x".repeat(5000), "V4_5")).not.toThrow();
  });

  it("defaults to V5_5 limit when no model specified", () => {
    expect(() => validatePrompt("x".repeat(5000))).not.toThrow();
    expect(() => validatePrompt("x".repeat(5001))).toThrow(SunoValidationError);
  });
});

// ── Non-custom prompt limit ──────────────────────────────────────────────────

describe("validateNonCustomPrompt", () => {
  it("allows prompt at 500 chars", () => {
    expect(() => validateNonCustomPrompt("x".repeat(500))).not.toThrow();
  });

  it("rejects prompt over 500 chars", () => {
    expect(() => validateNonCustomPrompt("x".repeat(501))).toThrow(SunoValidationError);
    expect(() => validateNonCustomPrompt("x".repeat(501))).toThrow(/exceeds 500/);
  });
});

// ── Model-specific style limits ──────────────────────────────────────────────

describe("validateStyle", () => {
  it("allows V4 style at 200 chars", () => {
    expect(() => validateStyle("x".repeat(200), "V4")).not.toThrow();
  });

  it("rejects V4 style over 200 chars", () => {
    expect(() => validateStyle("x".repeat(201), "V4")).toThrow(SunoValidationError);
    expect(() => validateStyle("x".repeat(201), "V4")).toThrow(/exceeds 200/);
  });

  it("allows V5 style at 1000 chars", () => {
    expect(() => validateStyle("x".repeat(1000), "V5")).not.toThrow();
  });

  it("rejects V5 style over 1000 chars", () => {
    expect(() => validateStyle("x".repeat(1001), "V5")).toThrow(SunoValidationError);
  });
});

// ── Model-specific title limits ──────────────────────────────────────────────

describe("validateTitle", () => {
  it("allows V4 title at 80 chars", () => {
    expect(() => validateTitle("x".repeat(80), "V4")).not.toThrow();
  });

  it("rejects V4 title over 80 chars", () => {
    expect(() => validateTitle("x".repeat(81), "V4")).toThrow(SunoValidationError);
    expect(() => validateTitle("x".repeat(81), "V4")).toThrow(/exceeds 80/);
  });

  it("allows V4_5ALL title at 80 chars (same as V4)", () => {
    expect(() => validateTitle("x".repeat(80), "V4_5ALL")).not.toThrow();
  });

  it("rejects V4_5ALL title over 80 chars", () => {
    expect(() => validateTitle("x".repeat(81), "V4_5ALL")).toThrow(SunoValidationError);
  });

  it("allows V5_5 title at 100 chars", () => {
    expect(() => validateTitle("x".repeat(100), "V5_5")).not.toThrow();
  });

  it("rejects V5_5 title over 100 chars", () => {
    expect(() => validateTitle("x".repeat(101), "V5_5")).toThrow(SunoValidationError);
  });
});

// ── Fixed-limit validators ───────────────────────────────────────────────────

describe("validateLyricsPrompt", () => {
  it("allows prompt at 200 chars", () => {
    expect(() => validateLyricsPrompt("x".repeat(200))).not.toThrow();
  });

  it("rejects prompt over 200 chars", () => {
    expect(() => validateLyricsPrompt("x".repeat(201))).toThrow(SunoValidationError);
  });
});

describe("validateSoundsPrompt", () => {
  it("allows prompt at 500 chars", () => {
    expect(() => validateSoundsPrompt("x".repeat(500))).not.toThrow();
  });

  it("rejects prompt over 500 chars", () => {
    expect(() => validateSoundsPrompt("x".repeat(501))).toThrow(SunoValidationError);
  });
});

describe("validateAuthor", () => {
  it("allows author at 50 chars", () => {
    expect(() => validateAuthor("x".repeat(50))).not.toThrow();
  });

  it("rejects author over 50 chars", () => {
    expect(() => validateAuthor("x".repeat(51))).toThrow(SunoValidationError);
  });
});

describe("validateDomainName", () => {
  it("allows domain at 50 chars", () => {
    expect(() => validateDomainName("x".repeat(50))).not.toThrow();
  });

  it("rejects domain over 50 chars", () => {
    expect(() => validateDomainName("x".repeat(51))).toThrow(SunoValidationError);
  });
});

// ── Range validators ─────────────────────────────────────────────────────────

describe("validateSoundTempo", () => {
  it("allows 1–300 BPM", () => {
    expect(() => validateSoundTempo(1)).not.toThrow();
    expect(() => validateSoundTempo(120)).not.toThrow();
    expect(() => validateSoundTempo(300)).not.toThrow();
  });

  it("rejects values outside 1–300", () => {
    expect(() => validateSoundTempo(0)).toThrow(SunoValidationError);
    expect(() => validateSoundTempo(301)).toThrow(SunoValidationError);
  });
});

describe("validateInfillRange", () => {
  it("allows 6–60 second ranges", () => {
    expect(() => validateInfillRange(0, 6)).not.toThrow();
    expect(() => validateInfillRange(10, 70)).not.toThrow();
    expect(() => validateInfillRange(0, 60)).not.toThrow();
  });

  it("rejects range under 6 seconds", () => {
    expect(() => validateInfillRange(0, 5.99)).toThrow(SunoValidationError);
    expect(() => validateInfillRange(0, 5.99)).toThrow(/6–60 seconds/);
  });

  it("rejects range over 60 seconds", () => {
    expect(() => validateInfillRange(0, 60.01)).toThrow(SunoValidationError);
  });
});

describe("validatePersonaVocalSegment", () => {
  it("allows 10–30 second segments", () => {
    expect(() => validatePersonaVocalSegment(0, 10)).not.toThrow();
    expect(() => validatePersonaVocalSegment(5, 25)).not.toThrow();
    expect(() => validatePersonaVocalSegment(0, 30)).not.toThrow();
  });

  it("rejects segment under 10 seconds", () => {
    expect(() => validatePersonaVocalSegment(0, 9.99)).toThrow(SunoValidationError);
    expect(() => validatePersonaVocalSegment(0, 9.99)).toThrow(/10–30 seconds/);
  });

  it("rejects segment over 30 seconds", () => {
    expect(() => validatePersonaVocalSegment(0, 30.01)).toThrow(SunoValidationError);
  });
});

// ── Style tuning weight validators ───────────────────────────────────────────

describe("validateStyleTuningWeights", () => {
  it("allows all weights in 0–1 range", () => {
    expect(() =>
      validateStyleTuningWeights({ styleWeight: 0, weirdnessConstraint: 0.5, audioWeight: 1 })
    ).not.toThrow();
  });

  it("skips undefined weights", () => {
    expect(() => validateStyleTuningWeights({})).not.toThrow();
    expect(() => validateStyleTuningWeights({ styleWeight: 0.5 })).not.toThrow();
  });

  it("rejects styleWeight over 1", () => {
    expect(() => validateStyleTuningWeights({ styleWeight: 1.1 })).toThrow(SunoValidationError);
  });

  it("rejects weirdnessConstraint below 0", () => {
    expect(() => validateStyleTuningWeights({ weirdnessConstraint: -0.1 })).toThrow(SunoValidationError);
  });

  it("rejects audioWeight over 1", () => {
    expect(() => validateStyleTuningWeights({ audioWeight: 1.5 })).toThrow(SunoValidationError);
  });
});
