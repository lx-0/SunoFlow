import { describe, expect, it } from "vitest";
import { toggleSelection, toggleSelectAll } from "./selection";

describe("toggleSelection", () => {
  const songIds = ["a", "b", "c", "d"];

  it("selects an unselected song and sets anchor", () => {
    const result = toggleSelection({
      songId: "b",
      songIds,
      shiftKey: false,
      state: { selectedIds: new Set(), lastSelectedIndex: null },
    });

    expect(Array.from(result.selectedIds)).toEqual(["b"]);
    expect(result.lastSelectedIndex).toBe(1);
  });

  it("deselects an already-selected song", () => {
    const result = toggleSelection({
      songId: "b",
      songIds,
      shiftKey: false,
      state: { selectedIds: new Set(["b"]), lastSelectedIndex: 1 },
    });

    expect(Array.from(result.selectedIds)).toEqual([]);
    expect(result.lastSelectedIndex).toBe(1);
  });

  it("shift-selects an inclusive range from last anchor", () => {
    const result = toggleSelection({
      songId: "d",
      songIds,
      shiftKey: true,
      state: { selectedIds: new Set(["b"]), lastSelectedIndex: 1 },
    });

    expect(Array.from(result.selectedIds).sort()).toEqual(["b", "c", "d"]);
    expect(result.lastSelectedIndex).toBe(3);
  });
});

describe("toggleSelectAll", () => {
  const songIds = ["a", "b", "c"];

  it("selects all when not all selected", () => {
    const result = toggleSelectAll(songIds, new Set(["a"]));
    expect(Array.from(result.selectedIds).sort()).toEqual(songIds);
    expect(result.lastSelectedIndex).toBeNull();
  });

  it("clears selection when all are selected", () => {
    const result = toggleSelectAll(songIds, new Set(songIds));
    expect(Array.from(result.selectedIds)).toEqual([]);
    expect(result.lastSelectedIndex).toBeNull();
  });
});
