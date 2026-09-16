// Link the Canvas checkout into this app's node_modules so Metro can bundle and
// watch the live source. The published library still resolves its compiled dist.
//
// We do this with a symlink instead of a `file:` dependency because bun (and npm)
// COPY `file:` directory deps, which would freeze a snapshot; the docs must render
// the live library they document. This is isolated to this app (no Bun workspace,
// no change to the root package). Runs as `postinstall`. (The generated docs core now
// lives in-tree at src/core and is imported relatively, so it needs no symlink.)
import { symlinkSync, rmSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(projectRoot, "..");

// The root package's main/exports point to dist/index.js. This app's Metro
// resolver explicitly pins the bare package import to src/index.ts through this
// symlink, preserving its live source and native skin resolution.
const links = [
  ["node_modules/@ionizeio/canvas", repoRoot],
];

for (const [rel, target] of links) {
  const linkPath = resolve(projectRoot, rel);
  rmSync(linkPath, { recursive: true, force: true });
  mkdirSync(dirname(linkPath), { recursive: true });
  symlinkSync(target, linkPath, "dir");
  console.log(`linked ${rel} -> ${target}`);
}
