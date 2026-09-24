/*
 * Third-party licence notice generator.
 *
 * Writes docs/src/data/third-party-notices.ts (pure data, no renderer attached), which
 * `app/(home)/licenses.tsx` renders with Canvas components.
 *
 * WHY THIS EXISTS. Two of the licences in the shipped dependency set carry an obligation
 * that a `license:` field in package.json does not discharge:
 *
 *   - MIT requires "the above copyright notice and this permission notice" to be included
 *     in all copies or substantial portions of the Software.
 *   - OFL-1.1 (the Geist and Geist Mono typefaces) is stricter still: condition 2 says the
 *     font may be bundled and redistributed "provided that each copy contains the above
 *     copyright notice and this license".
 *
 * The app bundles the .ttf files, so the licence has to travel with the artifact. Before
 * this generator existed, no licence text reached the build at all on any platform.
 *
 * HOW THE SET IS CHOSEN. It is not chosen here. tools/noticegen/scan.ts works out which
 * packages actually ship and records them in shipped.json; this generator only turns that
 * list into licence data. See scan.ts for why walking the dependency closure gives the
 * wrong answer (it reports 531 packages and attributes copyleft code the app never
 * contains).
 *
 * WHERE EACH PACKAGE IS READ FROM. shipped.json maps every package to the directories it
 * shipped from, and version, licence and notice text are read from exactly those
 * directories. Resolving a bare name instead (docs/node_modules first, then the root) is
 * a guess whenever an install holds more than one copy: a docs devDependency once hoisted
 * entities@7 over dom-serializer's entities@4, and a by-name lookup reports whichever copy
 * sits at the top, whether or not it is the one the bundle took. A package that ships two
 * versions lists each; a recorded directory missing from disk (or holding another
 * package) is a stale install or a stale scan, and fails the run rather than falling back
 * to another copy.
 *
 * HOW TEXTS ARE DEDUPED. Sixty-odd MIT licences are byte-identical apart from their
 * copyright line, so storing each in full would bloat the bundle for no legal benefit.
 * Each licence file is split into the copyright lines (kept PER PACKAGE, because that is
 * the part the notice clause is actually about) and the remaining body (shared). The
 * screen shows both, so the full notice is reconstructible for every package.
 *
 * Run: bun run notices:scan       (rare, slow: recompute which packages ship)
 *      bun run notices:gen        (writes the module)
 *      bun run notices:gen:check  (CI: fails if the checked-in module is stale)
 */
import { readFileSync, existsSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const docs = join(repo, "docs");
const OUT = join(docs, "src/data/third-party-notices.ts");
const SHIPPED = join(here, "shipped.json");

// Canvas itself is first-party, and so is its optional Android blur integration, published
// from this repository's packages/canvas-blur. Both are described in their own paragraph on
// the screen rather than listed as third-party dependencies, so the walk skips them (and
// never follows the workspace symlinks into the repository). Their LICENSE files are
// written at pack time by tools/licensegen and are not in git, so reading them here would
// make the output depend on whether a package had been packed on the machine.
const FIRST_PARTY = new Set(["@ionizeio/canvas", "@ionizeio/canvas-blur"]);

const LICENSE_FILES = [
  "LICENSE", "LICENSE.md", "LICENSE.txt", "LICENCE", "LICENCE.md", "LICENCE.txt",
  "license", "license.md", "COPYING", "COPYING.md",
];
// Font packages ship the wrapper's MIT as LICENSE and the typeface's OFL as LICENSE_FONT.
// The second file is the one carrying the obligation, so it is collected separately.
const FONT_LICENSE_FILES = ["LICENSE_FONT", "OFL.txt", "OFL"];

/** One licence file of one shipped package version (a dual-licensed package has two). */
export interface Pkg {
  name: string;
  version: string;
  license: string;
  copyright: string[];
  bodyHash: string | null;
  body: string | null;
  bodyTitle: string;
}

/** shipped.json as tools/noticegen/scan.ts writes it (only the part read here). */
export interface Shipped {
  /** Package name to the repo-relative directories it ships from. */
  packages: Record<string, string[]>;
}

function readJson(p: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

/** Normalise the SPDX-ish string a package declares. */
function licenseOf(pj: Record<string, unknown>): string {
  if (typeof pj.license === "string") return pj.license;
  // Very old packages used `license: {type}` or an array of `licenses`.
  if (pj.license && typeof pj.license === "object" && "type" in (pj.license as object)) {
    return String((pj.license as { type: unknown }).type);
  }
  if (Array.isArray(pj.licenses)) {
    return (pj.licenses as { type?: string }[]).map((l) => l.type).filter(Boolean).join(" OR ");
  }
  return "UNKNOWN";
}

/**
 * Split a licence file into its copyright lines and the remaining shared body.
 *
 * The copyright lines are what differ between two MIT licences; the body is what they
 * share. Keeping them apart is what makes deduplication safe rather than lossy.
 *
 * ONLY THE HEADER IS SCANNED, which matters more than it looks. Licence bodies contain
 * plenty of lines that begin with the word "copyright" but are not notices at all: the
 * OFL alone has "copyright statement(s).", "Copyright Holder. This restriction only
 * applies...", and "COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM...". Matching those would
 * list six fake notices AND, far worse, cut those lines out of the licence text, leaving
 * a mutilated OFL on a page whose entire purpose is to reproduce it verbatim.
 *
 * So: walk from the top, take copyright lines until the licence body proper starts, and
 * from that marker onward copy the text through UNTOUCHED.
 */
const BODY_START =
  /^\s*(permission is hereby granted|this font software is licensed|redistribution and use|the mit license|sil open font license|-{5,}|={5,})/i;

// Requires a year, so "Copyright Holder." and "copyright statement(s)." cannot match even
// if one appeared in the header.
const COPYRIGHT_LINE = /^\s*(copyright|\(c\)|©)[\s(c)©,-]*\d{4}/i;

function splitLicense(text: string): { copyright: string[]; body: string } {
  // A few packages ship LICENSE.md with the entire text inside a markdown code fence
  // (dijkstrajs does). The fence is presentation, not licence wording, so drop it rather
  // than rendering a stray ``` at the top and bottom of the panel.
  const unfenced = text.trim().replace(/^```[a-z]*\n/i, "").replace(/\n```$/, "");
  const lines = unfenced.replace(/\r\n/g, "\n").split("\n");
  const copyright: string[] = [];
  const header: string[] = [];
  let i = 0;

  for (; i < lines.length; i++) {
    if (BODY_START.test(lines[i])) break;
    if (COPYRIGHT_LINE.test(lines[i])) copyright.push(lines[i].trim());
    else header.push(lines[i]);
  }

  const body = [...header, ...lines.slice(i)].join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return { copyright, body };
}

/** A short human title for a licence body, used as the section heading on the screen. */
function titleFor(body: string, declared: string): string {
  if (/SIL OPEN FONT LICENSE/i.test(body)) return "SIL Open Font License 1.1";
  if (/Apache License/i.test(body)) return "Apache License 2.0";
  // ISC before MIT: lucide-static's LICENSE is the ISC text followed by a Feather MIT
  // rider for the derived icons, so the MIT probe below would claim the combined text.
  // An MIT-only licence never contains the phrase "ISC License", so this order is safe.
  if (/ISC License/i.test(body) || /^ISC$/i.test(declared)) return "ISC License";
  if (/^\s*MIT License/im.test(body) || /permission is hereby granted, free of charge/i.test(body)) {
    return "MIT License";
  }
  if (/Redistribution and use in source and binary forms/i.test(body)) {
    return /neither the name/i.test(body) ? "BSD 3-Clause License" : "BSD 2-Clause License";
  }
  // mdn-data's CSS data (compiled into the native bundles by css-tree) is dedicated to
  // the public domain; the dedication's own heading names it.
  if (/^\s*CC0 1\.0 Universal/i.test(body)) return "CC0 1.0 Universal";
  return declared;
}

function collect(dir: string, name: string, version: string, declared: string): Pkg[] {
  const out: Pkg[] = [];
  const files = readdirSync(dir);
  const pick = (candidates: string[]) => candidates.find((f) => files.includes(f));

  const main = pick(LICENSE_FILES);
  const font = pick(FONT_LICENSE_FILES);

  // A font package declares a COMPOUND licence ("MIT AND OFL-1.1", "MIT AND
  // Apache-2.0") and ships the two halves as separate files: LICENSE covers the wrapper
  // code, LICENSE_FONT the typeface. Tag each file with its own half rather than
  // repeating the compound string on both, so the package reads as "MIT" + "OFL-1.1"
  // instead of "MIT AND OFL-1.1" + "OFL-1.1".
  const compound = /^(.*?)\s+AND\s+(\S+)$/i.exec(declared);
  const mainTag = font && compound ? compound[1].trim() : declared;

  // The font file's tag comes from its own text, never from an assumption: the Geist
  // wrappers ship the OFL there, but material-symbols ships the Apache-2.0 text, and
  // hard-tagging every font file "OFL-1.1" (as this once did) badged that package with
  // a licence it does not carry.
  const fontTag = (body: string) =>
    /SIL OPEN FONT LICENSE/i.test(body) ? "OFL-1.1"
    : /Apache License/i.test(body) ? "Apache-2.0"
    : compound ? compound[2].trim()
    : declared;

  for (const [file, kind] of [[main, "main"], [font, "font"]] as const) {
    if (!file) continue;
    const text = readFileSync(join(dir, file), "utf8");
    if (!text.trim()) continue;
    const { copyright, body } = splitLicense(text);
    const tag = kind === "font" ? fontTag(body) : mainTag;
    out.push({
      name,
      version,
      license: tag,
      copyright,
      body,
      // Hash a whitespace-normalised copy so the same licence wrapped to a different
      // column counts as one text, while the ORIGINAL wording is what gets displayed.
      // Deliberately not case-normalised: that would merge texts on a weaker signal
      // than "identical wording", and the saving is not worth the ambiguity.
      bodyHash: createHash("sha256").update(body.replace(/\s+/g, " ").trim()).digest("hex"),
      bodyTitle: titleFor(body, tag),
    });
  }

  // Declared a licence but shipped no file: record it honestly rather than substituting a
  // canonical text, which would attach a copyright line the package never claimed.
  if (out.length === 0) {
    out.push({ name, version, license: declared, copyright: [], body: null, bodyHash: null, bodyTitle: declared });
  }
  return out;
}

// ---- read the shipped set and collect each package's licence -------------------------

/** Read shipped.json, refusing a missing file or the older names-only format. */
export function readShipped(file: string): Shipped {
  if (!existsSync(file)) {
    throw new Error(`${file} is missing. Run \`bun run notices:scan\` first.`);
  }
  const raw = JSON.parse(readFileSync(file, "utf8")) as { packages?: unknown };
  const packages = raw.packages;
  const valid =
    packages !== null &&
    typeof packages === "object" &&
    !Array.isArray(packages) &&
    Object.values(packages).every((dirs) => Array.isArray(dirs) && dirs.length > 0 && dirs.every((d) => typeof d === "string"));
  if (!valid) {
    throw new Error(
      `${file} does not map each package to the directories it ships from (it predates that format, or was edited by hand). ` +
        "Run `bun run notices:scan` to record them.",
    );
  }
  return { packages: packages as Record<string, string[]> };
}

/**
 * Collect the licence files of every shipped package from the directories shipped.json
 * records, relative to `root` (the repository).
 *
 * Each distinct version gets its own rows; two copies of one version are one package, so
 * the second is only checked, not collected again. Every recorded directory must exist and
 * hold the package it is recorded for. There is deliberately no fallback to another copy
 * of the same name: that fallback is the by-name lookup this format replaced, and it
 * silently reports a version the app does not ship.
 */
export function collectShipped(root: string, shipped: Shipped): Pkg[] {
  const found: Pkg[] = [];
  const missing: string[] = [];
  const mismatched: string[] = [];

  for (const [name, dirs] of Object.entries(shipped.packages)) {
    if (FIRST_PARTY.has(name)) continue;

    const versions = new Set<string>();
    for (const at of dirs) {
      const dir = join(root, at);
      const pj = readJson(join(dir, "package.json"));
      if (!pj) {
        missing.push(`${name} (${at})`);
        continue;
      }
      if (pj.name !== name) {
        mismatched.push(`${at} holds ${typeof pj.name === "string" ? pj.name : "an unnamed package"}, not ${name}`);
        continue;
      }
      const version = String(pj.version ?? "0.0.0");
      if (versions.has(version)) continue;
      versions.add(version);
      found.push(...collect(dir, name, version, licenseOf(pj)));
    }
  }

  // Fail loudly rather than quietly emitting a smaller or different file. Most of the set
  // lives ONLY in docs/node_modules, so running before `bun install` in docs/ misses half
  // of it and the output differs wildly; without this the symptom is a baffling "stale"
  // from --check, which is exactly how this first failed in CI. A directory that holds a
  // different package, or is gone although both installs are current, means the install
  // layout changed since the scan (a new dependency re-hoisted a shared one).
  if (missing.length || mismatched.length) {
    const total = Object.keys(shipped.packages).length;
    const bad = missing.length + mismatched.length;
    const lines = [
      `${bad} recorded package ${bad === 1 ? "directory" : "directories"} (of ${total} shipped packages) not installed as recorded.`,
      "Run `bun install --frozen-lockfile` in BOTH the workspace root and docs/ first (most of the set is only in docs/node_modules).",
      "If both installs are current, the layout changed since the last scan: run `bun run notices:scan`, then `bun run notices:gen`.",
    ];
    if (missing.length) {
      lines.push(`Missing: ${missing.slice(0, 12).join(", ")}${missing.length > 12 ? `, +${missing.length - 12} more` : ""}`);
    }
    if (mismatched.length) lines.push(`Holding another package: ${mismatched.join("; ")}`);
    throw new Error(lines.join("\n"));
  }
  return found;
}

/** One row of the notices table: a package at one shipped version. */
export interface NoticeEntry {
  name: string;
  version: string;
  licenses: string[];
  textIds: number[];
}

export interface Notices {
  packages: NoticeEntry[];
  texts: { id: number; title: string; body: string; notices: string[]; packages: string[]; count: number }[];
  breakdown: [string, number][];
  /** The complete third-party-notices.ts module. */
  rendered: string;
}

/** Turn the collected licence files into the notices module. */
export function renderNotices(found: Pkg[]): Notices {
  const keyOf = (p: { name: string; version: string }) => `${p.name}@${p.version}`;

  // ---- dedupe bodies ----------------------------------------------------------------

  const bodies = new Map<string, { id: number; title: string; body: string }>();
  for (const p of found) {
    if (!p.bodyHash || !p.body) continue;
    if (!bodies.has(p.bodyHash)) {
      bodies.set(p.bodyHash, { id: bodies.size, title: p.bodyTitle, body: p.body });
    }
  }

  // How many table rows (a package at one version) carry each text.
  const carriers = new Map<string, Set<string>>();
  for (const p of found) {
    if (!p.bodyHash) continue;
    const rows = carriers.get(p.bodyHash) ?? new Set<string>();
    rows.add(keyOf(p));
    carriers.set(p.bodyHash, rows);
  }
  const usage = new Map([...carriers].map(([hash, rows]) => [hash, rows.size]));

  // Stable ordering: OFL first (it is the one with the bundling obligation), then by how
  // many packages share the text, so the big shared licences come before the one-offs.
  const ordered = [...bodies.entries()].sort((a, b) => {
    const ofl = (x: string) => (x.includes("Open Font") ? 0 : 1);
    return ofl(a[1].title) - ofl(b[1].title) || (usage.get(b[0])! - usage.get(a[0])!) || a[1].title.localeCompare(b[1].title);
  });
  const idOf = new Map<string, number>();
  ordered.forEach(([hash], i) => idOf.set(hash, i));

  // One entry PER PACKAGE VERSION, not per licence file. A dual-licensed package
  // contributes two files and therefore two `found` rows, but it is still one package and
  // must appear once in the table, carrying both licences. A package that ships two
  // versions appears once per version, each with its own licence files.
  const merged = new Map<string, NoticeEntry>();
  for (const p of found) {
    const e = merged.get(keyOf(p)) ?? {
      name: p.name,
      version: p.version,
      licenses: [],
      textIds: [],
    };
    if (!e.licenses.includes(p.license)) e.licenses.push(p.license);
    const id = p.bodyHash != null ? idOf.get(p.bodyHash) : undefined;
    if (id !== undefined && !e.textIds.includes(id)) e.textIds.push(id);
    merged.set(keyOf(p), e);
  }
  const packages = [...merged.values()].sort(
    (a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version, "en", { numeric: true }),
  );

  const texts = ordered.map(([hash, v], i) => ({
    id: i,
    title: v.title,
    body: v.body,
    // Notices belong to the LICENCE FILE they were read from, not to the package as a
    // whole. A dual-licensed font package holds two unrelated copyrights (Expo's, over the
    // wrapper code, and the Geist authors', over the typeface); attaching both to both
    // texts would put Expo's name on the OFL and imply it holds rights in the font.
    notices: [
      ...new Set(found.filter((p) => p.bodyHash === hash).flatMap((p) => p.copyright)),
    ].sort(),
    packages: [...new Set(packages.filter((p) => p.textIds.includes(i)).map((p) => p.name))],
    count: usage.get(hash) ?? 0,
  }));

  // Count table rows per licence; a dual-licensed package counts once under each.
  const byLicense = new Map<string, number>();
  for (const p of packages) for (const l of p.licenses) byLicense.set(l, (byLicense.get(l) ?? 0) + 1);
  const breakdown = [...byLicense.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  // ---- emit -------------------------------------------------------------------------

  const q = (s: string) => JSON.stringify(s);
  const header = `/*
 * GENERATED by tools/noticegen/generate.ts. Do not edit by hand.
 * Run \`bun run notices:gen\` after changing the docs app's runtime dependencies.
 *
 * Third-party licence notices for everything the Canvas docs app ships. See the
 * generator's header for why this is required (MIT's notice clause, and OFL-1.1's
 * condition that the licence travel with the bundled font) and for how the set is
 * chosen and deduplicated.
 */

export interface NoticePackage {
  name: string;
  version: string;
  /** Every licence the package is under. More than one when it is dual-licensed. */
  licenses: string[];
  /**
   * Indices into THIRD_PARTY_TEXTS. Empty when the package shipped no licence file.
   * Copyright notices hang off the TEXT rather than the package, since a dual-licensed
   * package holds separate copyrights over its code and its font.
   */
  textIds: number[];
}

export interface NoticeText {
  id: number;
  title: string;
  body: string;
  /** The copyright notices carried by this exact licence text. */
  notices: string[];
  packages: string[];
  count: number;
}
`;

  const body = `
export const THIRD_PARTY_TITLE = "Open Source Licenses";

export const THIRD_PARTY_INTRO =
  ${q(`Canvas is built on open source. This page lists every third-party package the app ships, with its licence and copyright notice, and reproduces the full text of each licence. It is generated from the packages actually installed, so it cannot drift from what is in the build.`)};

export const THIRD_PARTY_CANVAS =
  ${q(`Canvas itself is published to npm as @ionizeio/canvas under the MIT License, and its optional Android blur integration as @ionizeio/canvas-blur under the same licence. This app is their reference documentation.`)};

export const THIRD_PARTY_FONTS =
  ${q(`The Manrope and Geist Mono typefaces are licensed under the SIL Open Font License 1.1, and the Material Symbols typeface under the Apache License 2.0. Both licences require their text to travel with the bundled font, and both are reproduced in full below.`)};

/** Package count by declared licence, most common first. */
export const THIRD_PARTY_BREAKDOWN: { license: string; count: number }[] = ${JSON.stringify(breakdown.map(([license, count]) => ({ license, count })), null, 2)};

export const THIRD_PARTY_PACKAGE_COUNT = ${packages.length};

export const THIRD_PARTY_PACKAGES: NoticePackage[] = ${JSON.stringify(packages, null, 2)};

export const THIRD_PARTY_TEXTS: NoticeText[] = ${JSON.stringify(texts, null, 2)};
`;

  return { packages, texts, breakdown, rendered: header + body };
}

// ---- run ----------------------------------------------------------------------------

if (import.meta.main) {
  let notices: Notices;
  try {
    notices = renderNotices(collectShipped(repo, readShipped(SHIPPED)));
  } catch (err) {
    console.error(`notices:gen: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
  const { packages, texts, breakdown, rendered } = notices;

  const check = process.argv.includes("--check");
  const existing = existsSync(OUT) ? readFileSync(OUT, "utf8") : null;

  if (check) {
    if (existing !== rendered) {
      console.error(
        `notices:gen --check FAILED: ${OUT} is stale.\n` +
          `Run \`bun run notices:gen\` and commit the result.`,
      );
      process.exit(1);
    }
    console.log(
      `notices:gen --check verified ${packages.length} packages and ${texts.length} licence texts; notices in sync.`,
    );
  } else {
    writeFileSync(OUT, rendered);
    console.log(`notices:gen: wrote ${OUT}`);
    console.log(`  ${packages.length} package entries, ${texts.length} distinct licence texts`);
    for (const [license, count] of breakdown) console.log(`  ${String(count).padStart(3)}  ${license}`);
  }
}
