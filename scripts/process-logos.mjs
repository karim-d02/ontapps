/**
 * Prepares the university wordmarks for a dark page.
 *
 * Run with:  node scripts/process-logos.mjs
 *
 * The source files are brand assets drawn in each school's colours on a white
 * ground, at five different sizes with five different amounts of baked-in
 * margin. Dropped onto this site as-is they render as white boxes, and even
 * with the box removed they sit at wildly different optical weights because
 * the padding — not the artwork — is what a matched height would be matching.
 *
 * Four passes, in this order:
 *
 *  1. FLATTEN over white. Some files already carry an alpha channel and some
 *     don't; flattening first means the next step sees the same thing either
 *     way rather than having two code paths.
 *
 *  2. LUMINANCE BECOMES ALPHA. Rather than keying out white with a threshold
 *     — which leaves hard, aliased edges and pale halos around every letter —
 *     the greyscale value is inverted into the alpha channel and the colour is
 *     set to flat white. Dark artwork becomes opaque white, the white ground
 *     becomes fully transparent, and every anti-aliased edge in between
 *     becomes a partial alpha that composites cleanly onto any surface. This
 *     is both the transparency pass and the monochrome pass.
 *
 *  3. GAMMA on the alpha. Thin strokes are anti-aliased down to low alpha
 *     values and read as grey mush at small sizes; lifting the curve makes
 *     hairlines hold their weight without fattening the solid areas.
 *
 *  4. CROP to the content box, then resize by HEIGHT with width auto. Fixed
 *     widths would distort marks whose aspect ratios run from about 2:1 to
 *     5:1, which these schools' brand terms prohibit and which looks wrong
 *     besides.
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const LOGOS = ["mcmaster", "queens", "uoft", "waterloo", "western"];
const DIR = path.join(process.cwd(), "public", "logos");

/** Rendered around 28–40px tall; 200 covers a 4× display with room to spare. */
const TARGET_HEIGHT = 200;

/** <1 lifts faint anti-aliased pixels. 1 would leave hairlines grey. */
const ALPHA_GAMMA = 0.8;

/** Alpha below this is treated as empty when finding the content box. */
const CROP_THRESHOLD = 8;

/**
 * True if this file has already been through the pipeline.
 *
 * The transform is NOT idempotent and re-running it on its own output is
 * destructive: step 1 flattens over white, and white artwork on a white ground
 * is a blank image. A processed file is recognisable by having a fully
 * near-transparent corner and no colour left anywhere. The corner is tested
 * with a tolerance rather than against 0 — Queen's carries an alpha of 8 there
 * from its own anti-aliasing, which an exact test read as "not yet processed".
 */
async function alreadyProcessed(source) {
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  if (data[3] > 16) return false;
  for (let i = 0; i < info.width * info.height; i++) {
    const [r, g, b, a] = [data[i * 4], data[i * 4 + 1], data[i * 4 + 2], data[i * 4 + 3]];
    if (a > 10 && (Math.abs(r - g) > 6 || Math.abs(g - b) > 6)) return false;
  }
  return true;
}

async function processLogo(name) {
  const file = path.join(DIR, `${name}.png`);
  const source = await readFile(file);

  const before = await sharp(source).metadata();

  if (await alreadyProcessed(source)) {
    return {
      name,
      from: `${before.width}×${before.height}`,
      content: "—",
      to: `${before.width}×${before.height}`,
      ratio: (before.width / before.height).toFixed(2),
      paddingRemoved: "—",
      bytes: source.length,
      note: "already processed, skipped",
    };
  }

  // 1 + 2: flatten over white, then read luminance.
  const { data: grey, info } = await sharp(source)
    .flatten({ background: "#ffffff" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    // Inverted luminance is the mask; the colour is flat white throughout.
    const alpha = 255 - grey[i];
    const lifted = Math.round(255 * (alpha / 255) ** ALPHA_GAMMA);
    rgba[i * 4] = 255;
    rgba[i * 4 + 1] = 255;
    rgba[i * 4 + 2] = 255;
    rgba[i * 4 + 3] = lifted;
  }

  // 4: content box from the alpha channel.
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (rgba[(y * width + x) * 4 + 3] > CROP_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) throw new Error(`${name}: no content found`);

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;

  const out = await sharp(rgba, { raw: { width, height, channels: 4 } })
    .extract({ left: minX, top: minY, width: cropW, height: cropH })
    .resize({ height: TARGET_HEIGHT, fit: "inside", withoutEnlargement: false })
    .png({ compressionLevel: 9 })
    .toBuffer();

  await writeFile(file, out);
  const after = await sharp(out).metadata();

  const paddingRemoved = 100 - Math.round((cropW / width) * (cropH / height) * 100);
  return {
    name,
    from: `${before.width}×${before.height}`,
    content: `${cropW}×${cropH}`,
    to: `${after.width}×${after.height}`,
    ratio: (after.width / after.height).toFixed(2),
    paddingRemoved: `${paddingRemoved}%`,
    bytes: out.length,
    note: "",
  };
}

const rows = [];
for (const name of LOGOS) rows.push(await processLogo(name));
console.table(rows);
