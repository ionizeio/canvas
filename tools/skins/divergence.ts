// Which components look different per platform, read from source text so it runs in
// plain bun (the styles modules pull in the kit's style layer, so importing them would
// need React Native). One definition of "diverges", shared by the docs' registry guard
// (docs/scripts/check-platform-skins.ts), which needs every divergent component in the
// three-up registry, and the shells gate (test/design-rules-shells.test.ts), which lets
// a shell import only components that look the same everywhere, and takes the rest as
// parts.
//
// A platform entry (`<name>.ios.tsx`, `<name>.android.tsx`) diverges from the web when
// it builds from a skin that is its own object, INCLUDING a spread of the web skin with
// overrides, rather than an identity alias (`export const iosSkin: T = webSkin;`), or
// when it injects platform parts (it imports another component's `.ios.js` /
// `.android.js` build and passes it to the shell). An entry that re-exports the shared
// module, or builds from an alias of the web skin and injects nothing, renders the web
// build by construction.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export type Platform = "iOS" | "Android";

export interface ComponentSkins {
  /** `atoms`, `molecules`, `organisms` or `charts`. */
  group: string;
  /** The component directory, e.g. `button`. */
  dir: string;
  /**
   * The values its platform entries build from their skin (`export const X =`, a
   * destructured `export const { A, B } =`). Names an entry only re-exports from the
   * shared module (a static subcomponent, a helper, a data table) are the same build on
   * every platform and are not listed.
   */
  exports: string[];
  /** The platforms whose entry diverges from the web build, with the reason for each. */
  divergent: Partial<Record<Platform, string>>;
  /** Whether the component has platform entries at all. */
  hasPlatformEntries: boolean;
}

export const GROUPS = ["atoms", "molecules", "organisms", "charts"] as const;

const ENTRY: Record<Platform, { ext: string; skin: string; suffix: string }> = {
  iOS: { ext: ".ios.tsx", skin: "iosSkin", suffix: ".ios.js" },
  Android: { ext: ".android.tsx", skin: "androidSkin", suffix: ".android.js" },
};

/** The values an entry builds itself: `export const X =` and a destructured `export const { A, B } =`. */
export function builtExports(source: string): string[] {
  const names: string[] = [];
  for (const m of source.matchAll(/export const (\w+)\s*[:=]/g)) names.push(m[1]);
  for (const m of source.matchAll(/export const \{([^}]*)\}\s*=/g)) names.push(...m[1].split(",").map((n) => n.trim()).filter(Boolean));
  return names;
}

function skinSpecifier(source: string, skinName: string): string | null {
  const m = source.match(new RegExp(`import\\s*\\{[^}]*\\b${skinName}\\b[^}]*\\}\\s*from\\s*"([^"]+)"`));
  return m ? m[1] : null;
}

function resolveStyles(compDir: string, specifier: string): string | null {
  for (const ext of [".ts", ".tsx"]) {
    const path = join(compDir, specifier.replace(/\.js$/, ext));
    if (existsSync(path)) return path;
  }
  return null;
}

/** Why a platform entry diverges from the web build, or null when it renders the web build. */
export function entryDivergence(compDir: string, source: string, platform: Platform): string | null {
  const { skin, suffix } = ENTRY[platform];
  const parts = [...source.matchAll(/from\s*"([^"]+)"/g)].map((m) => m[1]).filter((spec) => spec.endsWith(suffix));
  if (parts.length) return `injects platform parts (${parts.join(", ")})`;
  const specifier = skinSpecifier(source, skin);
  if (!specifier) return null; // re-exports the shared module, or builds from nothing per-platform
  const stylesPath = resolveStyles(compDir, specifier);
  if (!stylesPath) return null;
  const decl = readFileSync(stylesPath, "utf8").match(new RegExp(`export const ${skin}\\s*(?::[^=]+)?=\\s*([^;]+)`));
  if (!decl) return null;
  return /^\s*webSkin\s*$/.test(decl[1]) ? null : `builds from its own ${skin}`;
}

/** Every kit component with its platform divergence. */
export function componentSkins(kitSrc: string): ComponentSkins[] {
  const out: ComponentSkins[] = [];
  for (const group of GROUPS) {
    const groupDir = join(kitSrc, group);
    if (!existsSync(groupDir)) continue;
    for (const dir of readdirSync(groupDir)) {
      const compDir = join(groupDir, dir);
      if (!statSync(compDir).isDirectory()) continue;
      const files = readdirSync(compDir);
      const entry: ComponentSkins = { group, dir, exports: [], divergent: {}, hasPlatformEntries: false };
      for (const platform of Object.keys(ENTRY) as Platform[]) {
        const file = files.find((f) => f === `${dir}${ENTRY[platform].ext}`);
        if (!file) continue;
        entry.hasPlatformEntries = true;
        const source = readFileSync(join(compDir, file), "utf8");
        for (const name of builtExports(source)) if (!entry.exports.includes(name)) entry.exports.push(name);
        const reason = entryDivergence(compDir, source, platform);
        if (reason) entry.divergent[platform] = reason;
      }
      out.push(entry);
    }
  }
  return out;
}
