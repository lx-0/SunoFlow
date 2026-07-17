import { describe, it, expect } from "vitest";
import { asString, asNumber, asBool, asRecord, asStringArray, unwrapList } from "./coerce";

describe("asString", () => {
  const cases: Array<{ name: string; v: unknown; fallback?: string; expected: string | null }> = [
    { name: "non-empty string passes through", v: "hi", expected: "hi" },
    { name: "empty string counts as absent → null", v: "", expected: null },
    { name: "empty string falls back", v: "", fallback: "x", expected: "x" },
    { name: "number → null (no implicit cast)", v: 42, expected: null },
    { name: "null with fallback", v: null, fallback: "d", expected: "d" },
    { name: "undefined → null", v: undefined, expected: null },
    { name: "object → null", v: { a: 1 }, expected: null },
  ];
  it.each(cases)("$name", ({ v, fallback, expected }) => {
    expect(fallback === undefined ? asString(v) : asString(v, fallback)).toBe(expected);
  });
});

describe("asNumber", () => {
  const cases: Array<{ name: string; v: unknown; fallback?: number; expected: number | null }> = [
    { name: "finite number passes through", v: 3.5, expected: 3.5 },
    { name: "0 is a valid value, not absent", v: 0, expected: 0 },
    { name: "0 beats the fallback", v: 0, fallback: 7, expected: 0 },
    { name: "NaN falls back", v: Number.NaN, fallback: 0, expected: 0 },
    { name: "Infinity → null", v: Number.POSITIVE_INFINITY, expected: null },
    { name: "numeric string → null (no parsing)", v: "5", expected: null },
    { name: "null with fallback", v: null, fallback: 9, expected: 9 },
    { name: "undefined → null", v: undefined, expected: null },
  ];
  it.each(cases)("$name", ({ v, fallback, expected }) => {
    expect(fallback === undefined ? asNumber(v) : asNumber(v, fallback)).toBe(expected);
  });
});

describe("asBool", () => {
  const cases: Array<{ name: string; v: unknown; fallback?: boolean; expected: boolean }> = [
    { name: "true passes through", v: true, expected: true },
    { name: "false passes through (not absent)", v: false, expected: false },
    { name: "false beats a true fallback", v: false, fallback: true, expected: false },
    { name: '"true" string falls back to false', v: "true", expected: false },
    { name: "1 falls back to false", v: 1, expected: false },
    { name: "undefined honors the fallback", v: undefined, fallback: true, expected: true },
    { name: "null defaults to false", v: null, expected: false },
  ];
  it.each(cases)("$name", ({ v, fallback, expected }) => {
    expect(fallback === undefined ? asBool(v) : asBool(v, fallback)).toBe(expected);
  });
});

describe("asRecord", () => {
  it("returns the same object reference", () => {
    const obj = { a: 1 };
    expect(asRecord(obj)).toBe(obj);
  });
  it("arrays pass the guard (key reads degrade to undefined)", () => {
    const arr = [1, 2];
    expect(asRecord(arr)).toBe(arr);
    expect(asRecord(arr)?.foo).toBeUndefined();
  });
  const rejects: Array<{ name: string; v: unknown }> = [
    { name: "null", v: null },
    { name: "undefined", v: undefined },
    { name: "string", v: "x" },
    { name: "number", v: 5 },
    { name: "boolean", v: true },
  ];
  it.each(rejects)("$name → null", ({ v }) => {
    expect(asRecord(v)).toBeNull();
  });
});

describe("asStringArray", () => {
  const cases: Array<{ name: string; v: unknown; expected: string[] }> = [
    { name: "keeps non-empty strings only", v: ["a", "", 1, null, "b", {}], expected: ["a", "b"] },
    { name: "all-string array passes through", v: ["x", "y"], expected: ["x", "y"] },
    { name: "non-array → []", v: "a,b", expected: [] },
    { name: "null → []", v: null, expected: [] },
    { name: "object → []", v: { 0: "a" }, expected: [] },
  ];
  it.each(cases)("$name", ({ v, expected }) => {
    expect(asStringArray(v)).toEqual(expected);
  });
});

describe("unwrapList", () => {
  const mapId = (row: unknown): string | null => asString(asRecord(row)?.id);

  it("maps each row of the keyed list envelope", () => {
    const raw = { songs: [{ id: "a" }, { id: "b" }] };
    expect(unwrapList(raw, "songs", mapId)).toEqual(["a", "b"]);
  });
  it("drops rows the mapper rejects", () => {
    const raw = { songs: [{ id: "a" }, { id: 3 }, "junk", null, { id: "b" }] };
    expect(unwrapList(raw, "songs", mapId)).toEqual(["a", "b"]);
  });
  const degrades: Array<{ name: string; raw: unknown }> = [
    { name: "missing key", raw: { other: [] } },
    { name: "non-array value under the key", raw: { songs: { id: "a" } } },
    { name: "non-object root", raw: "nope" },
    { name: "null root", raw: null },
    { name: "array root (no keyed access)", raw: [{ id: "a" }] },
  ];
  it.each(degrades)("$name → []", ({ raw }) => {
    expect(unwrapList(raw, "songs", mapId)).toEqual([]);
  });
});
