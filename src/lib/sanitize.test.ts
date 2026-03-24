import { describe, it, expect } from "vitest";
import { stripHtml, sanitizeText, validateText, TEXT_MAX_LENGTHS } from "./sanitize";

describe("stripHtml", () => {
  it("removes simple tags", () => {
    expect(stripHtml("<b>hello</b>")).toBe("hello");
  });

  it("removes self-closing tags", () => {
    expect(stripHtml("line1<br/>line2")).toBe("line1line2");
  });

  it("removes script tags", () => {
    expect(stripHtml('<script>alert("xss")</script>world')).toBe('alert("xss")world');
  });

  it("removes nested tags", () => {
    expect(stripHtml("<div><p>text</p></div>")).toBe("text");
  });

  it("preserves plain text unchanged", () => {
    expect(stripHtml("hello world")).toBe("hello world");
  });

  it("handles empty string", () => {
    expect(stripHtml("")).toBe("");
  });

  it("handles attributes on tags", () => {
    expect(stripHtml('<a href="https://example.com" class="link">click</a>')).toBe("click");
  });

  it("preserves special characters that are not tags", () => {
    expect(stripHtml("5 > 3 && 2 < 4")).toBe("5 > 3 && 2 < 4");
  });
});

describe("sanitizeText", () => {
  it("returns sanitized value for valid input", () => {
    const { value, error } = sanitizeText("My Song", "title");
    expect(value).toBe("My Song");
    expect(error).toBeUndefined();
  });

  it("strips HTML from input", () => {
    const { value } = sanitizeText("<b>bold</b> title", "title");
    expect(value).toBe("bold title");
  });

  it("trims whitespace", () => {
    const { value } = sanitizeText("  spaced  ", "title");
    expect(value).toBe("spaced");
  });

  it("returns error when value exceeds max length for title", () => {
    const longTitle = "a".repeat(201);
    const { error, value } = sanitizeText(longTitle, "title");
    expect(error).toMatch(/200/);
    expect(value).toHaveLength(200);
  });

  it("returns error when value exceeds max length for prompt", () => {
    const longPrompt = "x".repeat(2001);
    const { error, value } = sanitizeText(longPrompt, "prompt");
    expect(error).toMatch(/2000/);
    expect(value).toHaveLength(2000);
  });

  it("returns error when value exceeds max length for lyrics", () => {
    const longLyrics = "y".repeat(5001);
    const { error } = sanitizeText(longLyrics, "lyrics");
    expect(error).toMatch(/5000/);
  });

  it("accepts value exactly at the limit", () => {
    const exactTitle = "a".repeat(200);
    const { value, error } = sanitizeText(exactTitle, "title");
    expect(error).toBeUndefined();
    expect(value).toHaveLength(200);
  });

  it("returns error for non-string input", () => {
    const { value, error } = sanitizeText(42, "title");
    expect(error).toMatch(/string/);
    expect(value).toBe("");
  });

  it("returns error for null input", () => {
    const { error } = sanitizeText(null, "title");
    expect(error).toMatch(/string/);
  });

  it("uses custom maxLen when provided", () => {
    const { error } = sanitizeText("a".repeat(11), "custom", 10);
    expect(error).toMatch(/10/);
  });

  it("uses default 1000 char limit for unknown fields", () => {
    const long = "a".repeat(1001);
    const { error } = sanitizeText(long, "unknown_field");
    expect(error).toMatch(/1000/);
  });

  it("strips HTML and then checks length", () => {
    // <script> tag itself is 8 chars, content is 3 — total stripped = 3 chars
    const withTag = "<script>abc</script>";
    const { value, error } = sanitizeText(withTag, "title");
    expect(error).toBeUndefined();
    expect(value).toBe("abc");
  });
});

describe("validateText", () => {
  it("returns undefined for valid input", () => {
    expect(validateText("hello", "title")).toBeUndefined();
  });

  it("returns an error string for oversized input", () => {
    expect(validateText("a".repeat(201), "title")).toBeTruthy();
  });

  it("returns an error string for non-string input", () => {
    expect(validateText(123, "prompt")).toMatch(/string/);
  });
});

describe("TEXT_MAX_LENGTHS", () => {
  it("has correct limits", () => {
    expect(TEXT_MAX_LENGTHS.title).toBe(200);
    expect(TEXT_MAX_LENGTHS.prompt).toBe(2000);
    expect(TEXT_MAX_LENGTHS.lyrics).toBe(5000);
  });
});
