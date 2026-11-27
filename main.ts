// The World in One Day — 27 Nov 2026: entrypoint.
//
// The front page itself is entry.png, rendered and dated before this
// program is run. The program's job is to stand behind that file:
// check it is exactly the image the entry promises (a 1024x1024 PNG
// under the intake size cap), then publish it to the directory the
// harness names in $MAKEFUN_OUTPUT_DIR (default /output).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const WANT_WIDTH = 1024;
const WANT_HEIGHT = 1024;
const BYTE_CAP = 1024 * 1024; // the intake takes at most 1 MiB

const here = dirname(fileURLToPath(import.meta.url));
const sourceFile = join(here, "entry.png");

function refuse(reason: string): never {
  console.error(`entry refused: ${reason}`);
  process.exit(1);
}

// A PNG opens with an 8-byte signature; its first chunk is IHDR and
// the chunk's data begins with width and height, big-endian uint32s
// at byte offsets 16 and 20.
function pngSize(bytes: Buffer): { width: number; height: number } {
  const magic = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 24) refuse("shorter than a PNG header");
  for (let i = 0; i < magic.length; i++) {
    if (bytes[i] !== magic[i]) refuse("no PNG signature at the head");
  }
  if (bytes.toString("ascii", 12, 16) !== "IHDR") {
    refuse("first chunk is not IHDR");
  }
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function run(): void {
  const image = readFileSync(sourceFile);
  if (image.length > BYTE_CAP) {
    refuse(`entry.png weighs ${image.length} bytes, over the 1 MiB cap`);
  }
  const size = pngSize(image);
  if (size.width !== WANT_WIDTH || size.height !== WANT_HEIGHT) {
    refuse(`entry.png is ${size.width}x${size.height}, not ${WANT_WIDTH}x${WANT_HEIGHT}`);
  }
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  const targetFile = join(outDir, "entry.png");
  writeFileSync(targetFile, image);
  // Read the published file back and hold it against the validated
  // bytes: a short or torn write must fail loudly here, never go out
  // as a truncated front page.
  const landed = readFileSync(targetFile);
  if (!landed.equals(image)) {
    refuse(`published file differs from the validated image (${landed.length} of ${image.length} bytes landed)`);
  }
  console.log(`published ${targetFile}: ${image.length} bytes at ${size.width}x${size.height}, verified byte for byte`);
}

run();
