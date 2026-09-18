// Cut the docs' seven faces down to the glyphs the docs can show, from the full files
// the @expo-google-fonts packages ship, into docs/assets/fonts (committed, so native
// builds and the web export read the same bytes; run again after bumping a source
// package or changing the ranges below).
//
// Every one of these faces is on the first paint's critical path: the page preloads
// them, and Lighthouse's model keeps every preloaded font that finished before the
// paint on the Largest Contentful Paint path. The full files carry scripts the docs
// never render (Geist Mono is 100 KB of Latin, Greek, Cyrillic and Vietnamese); the
// Latin subset measured 22 KB against 48 KB over the wire for a mono face and 15 KB
// against 23 KB for a sans face, about half the bytes before the first paint. A glyph
// outside the subset still renders: every platform falls back per glyph to a system
// face, which is what the flags and other emoji in the examples already do.
//
// Usage: node scripts/subset-fonts.mjs      (from docs/)

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import subsetFont from "subset-font";

const require = createRequire(import.meta.url);
const DOCS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(DOCS, "assets", "fonts");

// The faces docs/src/ui/fonts.ts registers, and the package file each comes from.
const FACES = [
  ["Urbanist_400Regular", "@expo-google-fonts/urbanist/400Regular/Urbanist_400Regular.ttf"],
  ["Urbanist_500Medium", "@expo-google-fonts/urbanist/500Medium/Urbanist_500Medium.ttf"],
  ["Urbanist_600SemiBold", "@expo-google-fonts/urbanist/600SemiBold/Urbanist_600SemiBold.ttf"],
  ["Urbanist_700Bold", "@expo-google-fonts/urbanist/700Bold/Urbanist_700Bold.ttf"],
  ["GeistMono_400Regular", "@expo-google-fonts/geist-mono/400Regular/GeistMono_400Regular.ttf"],
  ["GeistMono_500Medium", "@expo-google-fonts/geist-mono/500Medium/GeistMono_500Medium.ttf"],
  ["GeistMono_600SemiBold", "@expo-google-fonts/geist-mono/600SemiBold/GeistMono_600SemiBold.ttf"],
];

// What the docs can show: Latin with the Western European accents and the extended
// set (Latin Extended-A covers the Central European and Turkish letters), the general
// punctuation block (dashes, curly quotes, bullets, the ellipsis), superscripts and
// currency, and the handful of symbols the docs' own text uses: the four arrows and
// the return and shift arrows, the minus and the comparison operators the guides
// quote, the keyboard glyphs Kbd renders (the command, option and down-arrowhead
// signs), the check and cross marks, and the small geometric shapes the examples use.
// Whole blocks of arrows, operators and shapes would double a mono face for glyphs
// nothing renders; a range a face does not cover costs nothing.
const RANGES = [
  [0x0020, 0x007e], // Basic Latin
  [0x00a0, 0x00ff], // Latin-1 Supplement
  [0x0100, 0x017f], // Latin Extended-A
  [0x02c6, 0x02dc], // Spacing modifier letters (circumflex, tilde)
  [0x2000, 0x206f], // General punctuation
  [0x2070, 0x209f], // Superscripts and subscripts
  [0x20a0, 0x20bf], // Currency symbols
  [0x2122, 0x2122], // Trade mark sign
  [0x2190, 0x2194], // Left, up, right, down and left-right arrows
  [0x21b5, 0x21b5], // Return arrow
  [0x21e7, 0x21e7], // Shift arrow
  [0x2212, 0x2212], // Minus sign
  [0x2248, 0x2248], // Almost equal to
  [0x2260, 0x2265], // Not equal, identical, less-or-equal, greater-or-equal
  [0x22ef, 0x22ef], // Midline ellipsis
  [0x2303, 0x2305], // Up arrowhead, down arrowhead, projective
  [0x2318, 0x2318], // Command sign
  [0x2325, 0x2326], // Option sign, erase to the right
  [0x25a0, 0x25a1], // Black and white squares
  [0x25b2, 0x25bf], // Triangles (the small pointers Select and Dropdown draw)
  [0x25c6, 0x25c7], // Diamonds
  [0x25cb, 0x25cf], // Circles
  [0x2713, 0x2715], // Check marks and the multiplication cross
];

const text = RANGES.map(([from, to]) => {
  let out = "";
  for (let code = from; code <= to; code += 1) out += String.fromCodePoint(code);
  return out;
}).join("");

fs.mkdirSync(OUT, { recursive: true });
for (const [name, file] of FACES) {
  const source = fs.readFileSync(require.resolve(file));
  const subset = await subsetFont(source, text, { targetFormat: "truetype" });
  const target = path.join(OUT, `${name}.ttf`);
  fs.writeFileSync(target, subset);
  console.log(`${name}: ${source.length} -> ${subset.length} bytes`);
}
