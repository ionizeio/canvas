/*
 * Open Graph image generator. Composes the docs' social-card image from the launch
 * hero (.github/assets/hero.png, 1200x880) into the 1200x630 canvas the Open Graph /
 * Twitter summary_large_image spec expects:
 *
 *   docs/public/og.png  referenced absolutely by the og:image in docs/src/app/+html.tsx
 *
 * Run: bun run og:gen  (re-run whenever the hero is regenerated)
 *
 * The hero reads top-down (tagline, platform labels, three phone panes), so the crop
 * anchors to the top: the tagline stays the headline and the panes bleed off the
 * bottom edge. A short fade to the hero's own background color (#0D0D17, sampled from
 * its bottom rows) makes that bleed read as intentional rather than clipped.
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");

const WIDTH = 1200;
const HEIGHT = 630;
const FADE_HEIGHT = 140;
const BACKGROUND = "#0D0D17";

const fadeSvg = Buffer.from(
  `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">` +
    `<defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${BACKGROUND}" stop-opacity="0"/>` +
    `<stop offset="1" stop-color="${BACKGROUND}" stop-opacity="1"/>` +
    `</linearGradient></defs>` +
    `<rect x="0" y="${HEIGHT - FADE_HEIGHT}" width="${WIDTH}" height="${FADE_HEIGHT}" fill="url(#fade)"/>` +
    `</svg>`,
);

const src = resolve(repo, ".github/assets/hero.png");
const out = resolve(repo, "docs/public/og.png");

const image = await sharp(src)
  .resize(WIDTH, HEIGHT, { fit: "cover", position: "top" })
  .composite([{ input: fadeSvg }])
  .png()
  .toBuffer();

await sharp(image).toFile(out);
const { width, height } = await sharp(out).metadata();
console.log(`wrote ${out} (${width}x${height}, ${(image.length / 1024).toFixed(0)} KiB)`);
