#!/usr/bin/env node
/**
 * bundle-size.mjs
 *
 * Reads .next/static/chunks/ to measure total client JavaScript size (raw + gzip).
 * Optionally compares against a baseline file and exits non-zero if total gzip JS
 * increases by more than MAX_INCREASE_PCT (default 10%).
 *
 * Usage:
 *   node scripts/bundle-size.mjs                                   # measure only
 *   node scripts/bundle-size.mjs --baseline baseline.json          # measure + compare
 *   node scripts/bundle-size.mjs --output report.json              # write to custom path
 *   node scripts/bundle-size.mjs --baseline baseline.json --output report.json
 */

import { readdirSync, statSync, readFileSync, writeFileSync, existsSync } from "fs";
import { createGzip } from "zlib";
import { pipeline } from "stream/promises";
import { createReadStream } from "fs";
import { Writable } from "stream";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NEXT_DIR = path.resolve(__dirname, "../.next");
const MAX_INCREASE_PCT = 10;

function getArgs() {
  const args = process.argv.slice(2);
  const result = { baseline: null, output: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--baseline" && args[i + 1]) result.baseline = args[++i];
    if (args[i] === "--output" && args[i + 1]) result.output = args[++i];
  }
  return result;
}

async function gzipSize(filePath) {
  let size = 0;
  const sink = new Writable({
    write(chunk, _enc, cb) {
      size += chunk.length;
      cb();
    },
  });
  await pipeline(createReadStream(filePath), createGzip({ level: 9 }), sink);
  return size;
}

function walkDir(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkDir(full);
    if (entry.name.endsWith(".js")) return [full];
    return [];
  });
}

async function measureChunks() {
  const chunksDir = path.join(NEXT_DIR, "static", "chunks");
  const files = walkDir(chunksDir);

  let totalRaw = 0;
  let totalGzip = 0;
  const chunks = [];

  for (const file of files) {
    const raw = statSync(file).size;
    const gz = await gzipSize(file);
    totalRaw += raw;
    totalGzip += gz;
    chunks.push({ path: path.relative(NEXT_DIR, file), raw, gzip: gz });
  }

  // Sort largest first for readability
  chunks.sort((a, b) => b.raw - a.raw);

  return { totalRaw, totalGzip, chunks };
}

function fmt(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

async function main() {
  const { baseline: baselineFile, output: outputFile } = getArgs();

  if (!existsSync(NEXT_DIR)) {
    console.error("ERROR: .next/ directory not found. Run `pnpm build` first.");
    process.exit(1);
  }

  console.log("Measuring bundle sizes...\n");
  const { totalRaw, totalGzip, chunks } = await measureChunks();

  const report = {
    measuredAt: new Date().toISOString(),
    totalRaw,
    totalGzip,
    chunkCount: chunks.length,
    topChunks: chunks.slice(0, 10),
  };

  console.log(`Total client JS: ${fmt(totalRaw)} raw  /  ${fmt(totalGzip)} gzip`);
  console.log(`Chunks: ${chunks.length}`);
  console.log("\nTop 10 chunks by size:");
  for (const c of report.topChunks) {
    const raw = fmt(c.raw).padStart(10);
    const gz = fmt(c.gzip).padStart(10);
    console.log(`  ${raw} raw  ${gz} gzip  ${c.path}`);
  }

  const outPath = outputFile ?? path.resolve(__dirname, "../bundle-size-report.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`\nReport written to: ${path.relative(process.cwd(), outPath)}`);

  // Baseline comparison
  if (baselineFile) {
    if (!existsSync(baselineFile)) {
      console.log(`\nNo baseline at ${baselineFile} — skipping comparison (first run).`);
      process.exit(0);
    }

    const baseline = JSON.parse(readFileSync(baselineFile, "utf8"));
    const delta = totalGzip - baseline.totalGzip;
    const pct = (delta / baseline.totalGzip) * 100;
    const sign = delta >= 0 ? "+" : "";

    console.log(`\nBaseline: ${fmt(baseline.totalGzip)} gzip  (${baseline.measuredAt})`);
    console.log(`Current:  ${fmt(totalGzip)} gzip`);
    console.log(`Delta:    ${sign}${fmt(Math.abs(delta))} (${sign}${pct.toFixed(1)}%)`);

    if (pct > MAX_INCREASE_PCT) {
      console.error(
        `\nFAIL: Bundle size regression: ${sign}${pct.toFixed(1)}% exceeds ${MAX_INCREASE_PCT}% threshold.`
      );
      process.exit(1);
    } else if (pct > 0) {
      console.log(`\nWARN: Bundle grew by ${pct.toFixed(1)}% (within ${MAX_INCREASE_PCT}% threshold).`);
    } else {
      console.log(`\nOK: Bundle size unchanged or improved.`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
