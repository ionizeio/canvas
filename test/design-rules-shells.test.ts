import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { componentSkins, GROUPS } from "../tools/skins/divergence.ts";

// The seams a platform difference goes through (CLAUDE.md, the design language's item 5,
// "One job, different control"): a component's shared shell is one build for every
// platform, and whatever differs per platform arrives from its platform entry files, as
// the skin or as injected parts (`createX(skin, parts)`), never as a platform import or
// a `Platform.OS` branch inside the shell. That is what lets the docs' three-up render
// each platform truthfully: the web docs import the `.ios` and `.android` entries by
// literal path, so a shell that reached for another component's build itself would draw
// the web build in the iOS and Android columns (a device resolves by platform, which
// hides the fault there). And a component that switches layout reads its container,
// never the window, except the window-level chrome listed below (CLAUDE.md, "Highly
// responsive").

const ROOT = join(import.meta.dir, "..");
const SRC = join(ROOT, "src");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

/** Every non-entry module in a component directory: the shells and their helpers. */
const shellModules = GROUPS.flatMap((group) =>
  readdirSync(join(SRC, group)).flatMap((dir) => {
    const compDir = join(SRC, group, dir);
    if (!statSync(compDir).isDirectory()) return [];
    return walk(compDir)
      .filter((file) => /\.tsx?$/.test(file))
      .filter((file) => !/\.(ios|android)\.tsx$/.test(file)) // the platform entries
      .filter((file) => file !== join(compDir, `${dir}.tsx`)) // the web entry
      .filter((file) => !/\.styles\.tsx?$/.test(file)) // the skins, which ARE per platform
      .map((file) => ({ file: relative(ROOT, file), dir, text: readFileSync(file, "utf8") }));
  }),
);

/** The lines of a module that are code, not comments. */
function codeLines(text: string): { line: string; n: number }[] {
  let inBlock = false;
  return text.split("\n").flatMap((raw, i) => {
    let line = raw;
    if (inBlock) {
      const end = line.indexOf("*/");
      if (end === -1) return [];
      inBlock = false;
      line = line.slice(end + 2);
    }
    const start = line.indexOf("/*");
    if (start !== -1 && line.indexOf("*/", start) === -1) {
      inBlock = true;
      line = line.slice(0, start);
    }
    line = line.replace(/\/\*.*?\*\//g, "").replace(/\/\/.*$/, "");
    return line.trim() ? [{ line, n: i + 1 }] : [];
  });
}

const skins = componentSkins(SRC);
const divergentDirs = new Set(skins.filter((c) => Object.keys(c.divergent).length > 0).map((c) => c.dir));

describe("the shells that build each component", () => {
  it("never import a platform file", () => {
    const offenders = shellModules.flatMap(({ file, text }) =>
      [...text.matchAll(/from\s*"([^"]+\.(?:ios|android|web|native)\.js)"/g)].map((m) => `${file} imports ${m[1]}`),
    );
    expect(shellModules.length).toBeGreaterThan(100);
    expect(offenders).toEqual([]);
  });

  it("take a component that looks different per platform only as a part, whose web build is the default", () => {
    const offenders: string[] = [];
    for (const { file, text } of shellModules) {
      for (const m of text.matchAll(/^import \{([^}]*)\} from "([^"]*\/([a-z-]+)\/([a-z-]+)\.js)";/gm)) {
        const [, names, specifier, compDir, module] = m;
        if (compDir !== module || !divergentDirs.has(compDir)) continue;
        for (const name of names.split(",").map((n) => n.trim()).filter(Boolean)) {
          if (name.startsWith("type ")) continue;
          if (/ as Web\w+$/.test(name)) continue; // the part's web default
          offenders.push(`${file} imports ${name} from ${specifier}; take it as a part (import { ${name} as Web${name} }, parts.${name} ?? Web${name})`);
        }
      }
    }
    expect(divergentDirs.size).toBeGreaterThan(40);
    expect(offenders).toEqual([]);
  });

  // A platform check inside a shell is allowed only for a mechanism, never for what the
  // component draws: the look and the control come from the entry files.
  const PLATFORM_MECHANISMS: Record<string, string> = {
    "src/molecules/alert-dialog/alert-dialog.shared.tsx": "iOS's keyboard pushes the alert up by padding (KeyboardAvoidingView behavior)",
    "src/organisms/dialog/dialog.shared.tsx": "iOS's keyboard pushes the dialog up by padding (KeyboardAvoidingView behavior)",
    "src/organisms/drawer/drawer.shared.tsx": "iOS's keyboard pushes the drawer's content up by padding (KeyboardAvoidingView behavior)",
    "src/organisms/action-sheet/action-sheet.shared.tsx": "iOS's keyboard pushes the sheet up by padding (KeyboardAvoidingView behavior)",
    "src/atoms/autocomplete/autocomplete.shared.tsx": "the web keeps option rows out of the tab order (tabIndex -1), a DOM focus mechanism",
    "src/organisms/calendar/calendar.accessibility.ts": "the web states a selected day as aria-pressed, native as accessibilityState",
    "src/atoms/stepper/stepper.accessibility.ts": "each platform's spinbutton spelling (role and actions)",
    "src/organisms/carousel/carousel.shared.tsx": "the dot target's fallback size when a skin declares none (every shipped skin declares one)",
  };

  it("check the platform only for the mechanisms listed here", () => {
    const found = new Set<string>();
    const offenders: string[] = [];
    for (const { file, text } of shellModules) {
      for (const { line, n } of codeLines(text)) {
        if (!/\bPlatform\.(OS|select)\b/.test(line)) continue;
        found.add(file);
        if (!(file in PLATFORM_MECHANISMS)) offenders.push(`${file}:${n} ${line.trim()}`);
      }
    }
    expect(offenders).toEqual([]);
    // The list stays honest: an entry whose check is gone is removed.
    expect(Object.keys(PLATFORM_MECHANISMS).filter((file) => !found.has(file))).toEqual([]);
  });
});

describe("viewport reads", () => {
  // The window is read only by the responsive plumbing and the window-level chrome; a
  // component that switches layout measures its own container (src/style/container.ts).
  const WINDOW_READERS: Record<string, string> = {
    "src/style/responsive.tsx": "the one shared window subscription behind useBreakpoint, useResponsive and useFormFactor",
    "src/style/container.ts": "the seed a container reading uses until its first layout lands",
    "src/style/anchored-overlay.tsx": "an anchored card re-measures when the window resizes or rotates",
    "src/style/in-view.ts": "whether an element has scrolled into the window",
    "src/organisms/sidebar/sidebar.shared.tsx": "the Sidebar becomes a drawer over the WINDOW at its drawer breakpoint",
    "src/organisms/filter-panel/filter-panel.shared.tsx": "the FilterPanel becomes a drawer over the WINDOW at its drawer breakpoint",
  };
  const VIEWPORT = /\b(useBreakpoint|useResponsive|useFormFactor|useWindowDimensions)\s*\(|\bDimensions\.(get|addEventListener)\b/;

  it("happen only in the modules listed here", () => {
    const found = new Set<string>();
    const offenders: string[] = [];
    for (const file of walk(SRC).filter((f) => /\.tsx?$/.test(f))) {
      const rel = relative(ROOT, file);
      for (const { line, n } of codeLines(readFileSync(file, "utf8"))) {
        if (!VIEWPORT.test(line) || /\bfunction (useBreakpoint|useResponsive|useFormFactor)\b/.test(line)) continue;
        found.add(rel);
        if (!(rel in WINDOW_READERS)) offenders.push(`${rel}:${n} ${line.trim()}`);
      }
    }
    expect(offenders).toEqual([]);
    expect(Object.keys(WINDOW_READERS).filter((file) => !found.has(file))).toEqual([]);
  });
});
