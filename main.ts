// news-image-20261127: the entry program. It copies the entry image — a dense
// newspaper broadsheet summing up the world news of Friday 27 November
// 2026 — to the grader's output directory as /output/entry.png.
// Deterministic: the same bytes are copied on every run. No network access.
//
// Run locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Detect an image file's format from its first bytes: PNG starts with
// 89 50 4E 47, JPEG with FF D8 FF. Returns the format ('PNG', 'JPEG', or
// null when the bytes match neither) together with the head bytes, which
// the caller puts in its error message when the format is unknown.
function detectImageFormat(path) {
  const head = readFileSync(path, { flag: 'r' }).subarray(0, 4);
  if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) return { format: 'PNG', head };
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return { format: 'JPEG', head };
  return { format: null, head };
}

// Copy the entry image into the output directory and verify the copy: it
// must be a whole PNG or JPEG, as the gate requires, and byte-complete —
// exactly as long as the source, so a truncated copy cannot slip through.
function publishEntry(src, outDir) {
  mkdirSync(outDir, { recursive: true });
  const dst = join(outDir, 'entry.png');
  copyFileSync(src, dst);
  const { format, head } = detectImageFormat(dst);
  if (format === null) throw new Error(`entry.png is neither PNG nor JPEG (magic ${head.toString('hex')})`);
  const size = statSync(dst).size;
  if (size !== statSync(src).size) throw new Error(`entry.png copy is incomplete (${size} bytes at ${dst})`);
  return { dst, format, size };
}

const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const { dst, format, size } = publishEntry(join(here, 'entry.png'), outDir);
console.log(`wrote ${dst} (${size} bytes, ${format})`);
