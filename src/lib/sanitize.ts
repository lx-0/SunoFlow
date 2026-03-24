/**
 * Input sanitization utilities for user-supplied text.
 *
 * All user-facing text fields must be passed through these helpers before
 * persistence or processing.  The approach is intentionally conservative:
 * strip HTML tags and enforce hard length limits.  No third-party dependency
 * is required — the regex is sufficient for server-rendered contexts where
 * the output is stored (not directly inserted into the DOM).
 *
 * ## Limits
 *
 * | Field   | Max chars |
 * |---------|-----------|
 * | title   |       200 |
 * | prompt  |     2 000 |
 * | lyrics  |     5 000 |
 * | default |     1 000 |
 */

export const TEXT_MAX_LENGTHS = {
  title: 200,
  prompt: 2000,
  lyrics: 5000,
} as const;

export type TextField = keyof typeof TEXT_MAX_LENGTHS;

/**
 * Strip HTML/XML tags from a string.
 * Removes angle-bracket delimited tags only; does not decode HTML entities.
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "");
}

export interface SanitizeResult {
  value: string;
  /** Populated when the input was invalid or truncated. */
  error?: string;
}

/**
 * Strip HTML from `value` and enforce the maximum length for the given field.
 *
 * @param value   - Raw user input.
 * @param field   - One of the known field names, or a custom max length.
 * @param maxLen  - Override the default maximum length.
 * @returns       { value, error? } where `value` is the sanitized string and
 *                `error` is set if validation failed.
 */
export function sanitizeText(
  value: unknown,
  field: TextField | string,
  maxLen?: number
): SanitizeResult {
  if (typeof value !== "string") {
    return { value: "", error: `${field} must be a string` };
  }

  const sanitized = stripHtml(value).trim();
  const limit =
    maxLen ??
    (TEXT_MAX_LENGTHS[field as TextField] !== undefined
      ? TEXT_MAX_LENGTHS[field as TextField]
      : 1000);

  if (sanitized.length > limit) {
    return {
      value: sanitized.slice(0, limit),
      error: `${field} must be ${limit} characters or fewer`,
    };
  }

  return { value: sanitized };
}

/**
 * Validate a text field without truncating.  Returns an error string when the
 * input is invalid; `undefined` when it is acceptable.
 */
export function validateText(
  value: unknown,
  field: TextField | string,
  maxLen?: number
): string | undefined {
  const result = sanitizeText(value, field, maxLen);
  return result.error;
}
