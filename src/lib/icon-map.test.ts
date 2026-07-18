import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as heroiconsOutline from "@heroicons/react/24/outline";
import * as lucide from "lucide-react";
import {
  HEROICON_TO_LUCIDE,
  HEROICON_TO_LUCIDE_NOTES,
  ICON_SIZE,
  ICON_STROKE_WIDTH,
} from "@/lib/icon-map";

const SRC_ROOT = join(__dirname, "..");

/** Collect every Heroicon symbol imported anywhere under src/. */
function collectImportedHeroicons(): Set<string> {
  const symbols = new Set<string>();
  const importRe = /import\s*\{([^}]*)\}\s*from\s*["']@heroicons\/react\/[^"']+["']/g;

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules") walk(full);
        continue;
      }
      if (!/\.(?:tsx?|jsx?)$/.test(entry.name)) continue;
      const source = readFileSync(full, "utf8");
      for (const match of source.matchAll(importRe)) {
        for (const part of match[1].split(",")) {
          const name = part.split(/\s+as\s+/)[0].trim();
          if (name) symbols.add(name);
        }
      }
    }
  };

  walk(SRC_ROOT);
  return symbols;
}

describe("icon convention", () => {
  it("matches DESIGN.md (Lucide 22px, stroke 1.5)", () => {
    expect(ICON_SIZE).toBe(22);
    expect(ICON_STROKE_WIDTH).toBe(1.5);
  });
});

describe("HEROICON_TO_LUCIDE", () => {
  it("covers every Heroicon symbol imported under src/", () => {
    const imported = collectImportedHeroicons();
    expect(imported.size).toBeGreaterThan(0);
    const unmapped = [...imported].filter(
      (name) => !(name in HEROICON_TO_LUCIDE)
    );
    expect(unmapped).toEqual([]);
  });

  it("only maps real Heroicon exports", () => {
    const invalid = Object.keys(HEROICON_TO_LUCIDE).filter(
      (name) => !(name in heroiconsOutline)
    );
    expect(invalid).toEqual([]);
  });

  it("only targets real lucide-react exports", () => {
    const invalid = Object.entries(HEROICON_TO_LUCIDE).filter(
      ([, target]) => typeof (lucide as Record<string, unknown>)[target] === "undefined"
    );
    expect(invalid).toEqual([]);
  });

  it("annotates imperfect matches only for mapped symbols", () => {
    const orphaned = Object.keys(HEROICON_TO_LUCIDE_NOTES).filter(
      (name) => !(name in HEROICON_TO_LUCIDE)
    );
    expect(orphaned).toEqual([]);
  });
});
