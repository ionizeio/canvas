/*
 * Path helpers for tools/noticegen: turn what the build tools report (a source-map
 * source, an autolinking path, a generator's own lookup) into the exact package
 * directory a shipped package came from, written repo-relative for shipped.json.
 *
 * WHY LOCATIONS, NOT NAMES. A package name does not identify what ships. One install can
 * hold several copies of a package (a hoisted docs/node_modules/entities beside a nested
 * docs/node_modules/dom-serializer/node_modules/entities, a root copy beside a docs
 * copy), and which one the bundler or the native build picked is a fact about that
 * build, not something a later by-name lookup can recover. So the scan records the
 * directory each tool reports, and the generator reads the licence from there.
 */
import { existsSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

/** The last `node_modules/<name>` or `node_modules/@scope/<name>` in a posix path. */
const PACKAGE_SEGMENT = /node_modules\/((?:@[^/]+\/)?[^/]+)/g;

export interface SourcePackage {
  /** The package name, as the directory under node_modules spells it. */
  name: string;
  /** The absolute package directory the source file belongs to. */
  dir: string;
}

/**
 * Attribute one source-map `sources` entry to the package directory it came from.
 *
 * Expo's export serializer writes each module path as "/" followed by the path relative
 * to the Metro server root (@expo/metro-config serializeChunks: `'/' +
 * toPosixPath(path.relative(serverRoot, module.path))`), so a file outside the server
 * root keeps its "..": "/../src/index.ts". Resolving the entry against the server root
 * therefore gives back the exact file. Virtual modules ("\0polyfill:...",
 * "__prelude__") and first-party files outside any node_modules return null.
 *
 * The LAST node_modules segment wins, so a nested copy
 * (node_modules/dom-serializer/node_modules/entities/...) attributes to the inner
 * package and its own directory, never to the outer one.
 */
export function packageOfSource(source: string, serverRoot: string): SourcePackage | null {
  if (!source.startsWith("/")) return null;
  const file = resolve(serverRoot, source.slice(1));
  const posix = file.split(sep).join("/");
  const hits = [...posix.matchAll(PACKAGE_SEGMENT)];
  if (hits.length === 0) return null;
  const last = hits[hits.length - 1];
  const end = last.index + last[0].length;
  return { name: last[1], dir: posix.slice(0, end).split("/").join(sep) };
}

/**
 * An absolute path written relative to the repository, with forward slashes, as
 * shipped.json stores it. The repository may be reached through a symlink (macOS's
 * /tmp is /private/tmp, and the build tools report real paths), so both spellings of
 * the root are tried. A path outside the repository throws: nothing the docs app ships
 * can live there, so it means the scan misread a path.
 */
export function repoPath(abs: string, repo: string): string {
  const roots = [repo];
  try {
    const real = realpathSync(repo);
    if (real !== repo) roots.push(real);
  } catch {
    // The root itself always exists when the scan runs; keep the spelling given.
  }
  for (const root of roots) {
    const rel = relative(root, abs);
    const outside = rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel);
    if (rel && !outside) return rel.split(sep).join("/");
  }
  throw new Error(`notices: ${abs} is outside the repository at ${repo}`);
}

/**
 * Find a package the way Node's resolver would from `fromDir`: the first
 * `<dir>/node_modules/<name>` holding a package.json, walking up from `fromDir` and
 * stopping at `stopAt` (the repository root). The path is returned as found, without
 * resolving symlinks, since that is the path the generator itself reads through.
 */
export function lookupPackage(name: string, fromDir: string, stopAt: string): string | null {
  let dir = resolve(fromDir);
  const stop = resolve(stopAt);
  for (;;) {
    const candidate = join(dir, "node_modules", name);
    if (existsSync(join(candidate, "package.json"))) return candidate;
    if (dir === stop) return null;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}
