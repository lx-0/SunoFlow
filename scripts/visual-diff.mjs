#!/usr/bin/env node
/**
 * Informational visual diff for the visual verification harness.
 *
 * Walks matching PNGs in a baseline tree vs a current tree (per playwright
 * project subdir), writes a red-on-faded-grayscale heatmap per changed
 * surface plus a summary table, and ALWAYS exits 0 — Wave A recolors the
 * whole app by design, so this is a human before/after report, not a gate.
 *
 * Usage:
 *   node scripts/visual-diff.mjs \
 *     [--baseline e2e/visual/__baseline__] \
 *     [--current visual-artifacts/current] \
 *     [--out visual-artifacts/diff] \
 *     [--tolerance 24]        # max per-channel delta still counted as equal
 *
 * Zero dependencies by design: pixelmatch/pngjs are not repo deps, and an
 * operator tool should not force a lockfile change. Includes a minimal PNG
 * codec (8-bit, non-interlaced gray/gray+alpha/RGB/RGBA — exactly what
 * Playwright screenshots produce) built on node:zlib.
 */

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

// ─── args ───────────────────────────────────────────────────────────────────

function argValue(flag, fallback) {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
}

const baselineRoot = argValue("--baseline", "e2e/visual/__baseline__");
const currentRoot = argValue("--current", "visual-artifacts/current");
const outRoot = argValue("--out", "visual-artifacts/diff");
const tolerance = Number(argValue("--tolerance", "24"));

// ─── minimal PNG decode (8-bit, non-interlaced) ─────────────────────────────

const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const CHANNELS = { 0: 1, 2: 3, 4: 2, 6: 4 };

function decodePNG(buf) {
  if (!buf.subarray(0, 8).equals(PNG_SIG)) throw new Error("not a PNG");
  let pos = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0, interlace = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    pos += 12 + len; // len + type + data + crc
  }
  if (bitDepth !== 8) throw new Error(`unsupported bit depth ${bitDepth}`);
  if (interlace !== 0) throw new Error("interlaced PNG unsupported");
  const channels = CHANNELS[colorType];
  if (!channels) throw new Error(`unsupported color type ${colorType} (palette?)`);

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const pixels = Buffer.alloc(height * stride);
  let rawPos = 0;
  let prevRow = null;
  for (let y = 0; y < height; y++) {
    const filter = raw[rawPos++];
    const row = raw.subarray(rawPos, rawPos + stride);
    rawPos += stride;
    const out = pixels.subarray(y * stride, (y + 1) * stride);
    unfilterRow(filter, row, out, prevRow, channels);
    prevRow = out;
  }

  // normalize to RGBA
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0, p = 0; i < width * height; i++, p += 4) {
    const s = i * channels;
    if (colorType === 6) {
      pixels.copy(rgba, p, s, s + 4);
    } else if (colorType === 2) {
      rgba[p] = pixels[s]; rgba[p + 1] = pixels[s + 1]; rgba[p + 2] = pixels[s + 2]; rgba[p + 3] = 255;
    } else if (colorType === 0) {
      rgba[p] = rgba[p + 1] = rgba[p + 2] = pixels[s]; rgba[p + 3] = 255;
    } else {
      rgba[p] = rgba[p + 1] = rgba[p + 2] = pixels[s]; rgba[p + 3] = pixels[s + 1];
    }
  }
  return { width, height, rgba };
}

function unfilterRow(filter, row, out, prevRow, bpp) {
  const len = row.length;
  for (let x = 0; x < len; x++) {
    const rawByte = row[x];
    const left = x >= bpp ? out[x - bpp] : 0;
    const up = prevRow ? prevRow[x] : 0;
    const upLeft = prevRow && x >= bpp ? prevRow[x - bpp] : 0;
    let value;
    switch (filter) {
      case 0: value = rawByte; break;
      case 1: value = rawByte + left; break;
      case 2: value = rawByte + up; break;
      case 3: value = rawByte + ((left + up) >> 1); break;
      case 4: value = rawByte + paeth(left, up, upLeft); break;
      default: throw new Error(`bad filter ${filter}`);
    }
    out[x] = value & 0xff;
  }
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

// ─── minimal PNG encode (8-bit RGBA, filter 0) ──────────────────────────────

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePNG(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: None
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  return Buffer.concat([
    PNG_SIG,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 6 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ─── diff ───────────────────────────────────────────────────────────────────

function diffImages(base, curr) {
  const { width, height } = base;
  const total = width * height;
  const heat = Buffer.alloc(total * 4);
  let changed = 0;
  for (let i = 0, p = 0; i < total; i++, p += 4) {
    const dr = Math.abs(base.rgba[p] - curr.rgba[p]);
    const dg = Math.abs(base.rgba[p + 1] - curr.rgba[p + 1]);
    const db = Math.abs(base.rgba[p + 2] - curr.rgba[p + 2]);
    const da = Math.abs(base.rgba[p + 3] - curr.rgba[p + 3]);
    if (Math.max(dr, dg, db, da) > tolerance) {
      changed++;
      heat[p] = 255; heat[p + 1] = 60; heat[p + 2] = 60; heat[p + 3] = 255;
    } else {
      // faded grayscale of the baseline, pixelmatch-style
      const gray = (base.rgba[p] * 77 + base.rgba[p + 1] * 151 + base.rgba[p + 2] * 28) >> 8;
      const faded = 255 - ((255 - gray) >> 2);
      heat[p] = heat[p + 1] = heat[p + 2] = faded; heat[p + 3] = 255;
    }
  }
  return { changed, total, heat, width, height };
}

// ─── walk + report ──────────────────────────────────────────────────────────

function listPngs(root) {
  const result = new Map(); // "project/name.png" -> abs path
  if (!fs.existsSync(root)) return result;
  for (const project of fs.readdirSync(root)) {
    const dir = path.join(root, project);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const file of fs.readdirSync(dir)) {
      if (file.endsWith(".png")) result.set(`${project}/${file}`, path.join(dir, file));
    }
  }
  return result;
}

const baseline = listPngs(baselineRoot);
const current = listPngs(currentRoot);

if (baseline.size === 0) {
  console.log(`No baseline PNGs under ${baselineRoot} — capture one first:`);
  console.log("  VISUAL_LABEL=baseline bash scripts/visual-journey.sh");
  console.log(`  cp -R visual-artifacts/baseline/. ${baselineRoot}/`);
  process.exit(0);
}

const keys = [...new Set([...baseline.keys(), ...current.keys()])].sort();
const rows = [];
for (const key of keys) {
  const basePath = baseline.get(key);
  const currPath = current.get(key);
  if (!basePath) { rows.push({ key, note: "only in current" }); continue; }
  if (!currPath) { rows.push({ key, note: "only in baseline" }); continue; }
  let base, curr;
  try {
    base = decodePNG(fs.readFileSync(basePath));
    curr = decodePNG(fs.readFileSync(currPath));
  } catch (err) {
    rows.push({ key, note: `decode failed: ${err.message}` });
    continue;
  }
  if (base.width !== curr.width || base.height !== curr.height) {
    rows.push({
      key,
      note: `size ${base.width}x${base.height} -> ${curr.width}x${curr.height}`,
    });
    continue;
  }
  const { changed, total, heat, width, height } = diffImages(base, curr);
  const ratio = changed / total;
  if (changed > 0) {
    const outPath = path.join(outRoot, key);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, encodePNG(width, height, heat));
  }
  rows.push({ key, changed, total, ratio });
}

console.log(`\nVisual diff — baseline: ${baselineRoot}  current: ${currentRoot}  tolerance: ${tolerance}`);
console.log("(informational only — Wave A recolors everything by design; always exits 0)\n");
const pad = Math.max(...rows.map((r) => r.key.length), 10);
for (const row of rows) {
  if (row.note) {
    console.log(`  ${row.key.padEnd(pad)}  —          ${row.note}`);
  } else {
    const pct = (row.ratio * 100).toFixed(2).padStart(6);
    const marker = row.ratio > 0.5 ? " <<< heavy change" : row.changed === 0 ? " (identical)" : "";
    console.log(`  ${row.key.padEnd(pad)}  ${pct}%  ${String(row.changed).padStart(9)} px${marker}`);
  }
}
const diffed = rows.filter((r) => !r.note);
const changedSurfaces = diffed.filter((r) => r.changed > 0).length;
console.log(
  `\n${diffed.length} compared, ${changedSurfaces} changed, ${rows.length - diffed.length} skipped. Heatmaps: ${outRoot}/\n`,
);
process.exit(0);
