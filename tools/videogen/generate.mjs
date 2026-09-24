#!/usr/bin/env node
// Generates the docs' sample clip for the Video pages: docs/public/video-sample.mp4 and
// its poster, docs/public/video-sample.jpg.
//
// Why this exists: a sample clip in the docs ships in the App Store and Play builds and on
// the public site, so its rights have to be certain. Stock footage carries a licence to
// record and a subject's likeness to clear; this clip carries neither, because every
// pixel is computed here by ffmpeg's own generators (a spiral gradient field whose four
// Dark Factory hues drift, softened by a gaussian blur). No source footage, no model.
//
// It is deliberately abstract and slow: the page demonstrates play, pause, seek and fit,
// and a calm field reads well under every control state in both themes. The docs'
// security headers allow media from the site itself only, which is why it is committed
// rather than linked.
//
// Usage: node tools/videogen/generate.mjs   (needs ffmpeg 6 or later on PATH)

import { execFileSync } from "node:child_process";
import { statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const out = join(root, "docs", "public");
const clip = join(out, "video-sample.mp4");
const poster = join(out, "video-sample.jpg");

// Dark Factory's violet primary, its blush page, a mint and a soft rose.
const HUES = ["0x7262e5", "0xf5f2fe", "0x9fe3cf", "0xf4b6d2"];
const SECONDS = 6;
const FPS = 24;

const source = [
  `gradients=s=1280x720:r=${FPS}:d=${SECONDS}:n=${HUES.length}`,
  ...HUES.map((hue, i) => `c${i}=${hue}`),
  "type=spiral:speed=0.012:seed=7",
].join(":");

execFileSync("ffmpeg", [
  "-v", "error", "-y",
  "-f", "lavfi", "-i", source,
  "-vf", "gblur=sigma=24,format=yuv420p",
  "-c:v", "libx264", "-preset", "slow", "-crf", "30", "-profile:v", "high",
  "-movflags", "+faststart", "-an",
  clip,
]);

execFileSync("ffmpeg", ["-v", "error", "-y", "-i", clip, "-vf", "select=eq(n\\,0)", "-vframes", "1", "-q:v", "4", poster]);

for (const file of [clip, poster]) {
  console.log(`${file.slice(root.length + 1)}  ${(statSync(file).size / 1024).toFixed(0)} KB`);
}
