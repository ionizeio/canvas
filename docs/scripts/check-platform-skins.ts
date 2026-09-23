// Guards the docs' platform-skin registry: every component that actually LOOKS
// different per OS must be listed in src/core/platform-skins.ts, so the three-up
// preview shows the real iOS and Android skins instead of the web one three times.
//
// Why this needs a guard at all. On a device Metro resolves `foo.ios.tsx` by
// extension, so native is always right. The WEB docs cannot do that: a browser
// bundler resolves a bare import to the web module, so the docs preview the other
// two platforms by importing the .ios/.android files through this registry by
// LITERAL path. Forget the entry and nothing breaks, nothing warns, and the three
// panes quietly render the same web component with three different labels over
// them. That has now happened twice: AvatarMenu (its menu was the web Dropdown in
// every row) and Field (its Android row drew the label above the box instead of
// floating it inside).
//
// What counts as "looks different" lives in tools/skins/divergence.ts, shared with the
// kit's shells gate (test/design-rules-shells.test.ts): a platform entry diverges when
// it builds from its own skin object (a spread of the web skin with overrides included)
// rather than an identity alias of the web skin, or when it injects platform parts (the
// shell draws the platform's Button, Drawer or DragDrop builds). An alias with no parts
// renders identically by construction, so its absence from the registry is correct.
// The check runs both ways: every divergent build must be registered, and a registered
// name must be a divergent build, so the table never labels the web build a platform's.
//
// Run by CI (ci.yml) and `bun run check:skins`.
//
// Stays free of React Native so it runs in plain bun: the styles modules pull in the
// kit's style layer, so skins are classified from source text rather than by importing
// them, the same approach check-nav-sync.ts uses for pattern slugs.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { componentSkins, type Platform } from "../../tools/skins/divergence.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const KIT = join(HERE, "..", "..", "src");
const REGISTRY = join(HERE, "..", "src", "core", "platform-skins.ts");

const components = componentSkins(KIT);
const divergent = components.filter((c) => Object.keys(c.divergent).length > 0);

const registry = readFileSync(REGISTRY, "utf8");
function registeredIn(table: "ios" | "android"): Set<string> {
  const block = registry.split(`${table}: {`)[1]?.split("},")[0] ?? "";
  const suffix = table === "ios" ? "IOS" : "Android";
  return new Set([...block.matchAll(new RegExp(`(\\w+):\\s*\\w+${suffix}`, "g"))].map((m) => m[1]));
}
const iosTable = registeredIn("ios");
const androidTable = registeredIn("android");

const TABLE: Record<Platform, Set<string>> = { iOS: iosTable, Android: androidTable };

const missing: string[] = [];
for (const c of divergent) {
  for (const platform of Object.keys(c.divergent) as Platform[]) {
    for (const name of c.exports) {
      if (!TABLE[platform].has(name)) missing.push(`  ${name} (src/${c.group}/${c.dir}) is absent from the ${platform === "iOS" ? "ios" : "android"} table: its entry ${c.divergent[platform]}`);
    }
  }
}

const stale: string[] = [];
for (const platform of ["iOS", "Android"] as const) {
  for (const name of TABLE[platform]) {
    const owner = components.find((c) => c.exports.includes(name));
    if (!owner || !owner.divergent[platform]) stale.push(`  ${name} is in the ${platform === "iOS" ? "ios" : "android"} table but its ${platform} build is the web build`);
  }
}

if (missing.length || stale.length) {
  if (missing.length) {
    console.error(
      `check:skins - ${missing.length} platform build(s) look different from the web but are missing from ` +
        `docs/src/core/platform-skins.ts, so the docs three-up shows the WEB build in those rows:\n` +
        `${missing.join("\n")}\n\n` +
        `Add the literal .ios.js / .android.js imports and the table entries. If a component genuinely ` +
        `looks the same on every platform, make that explicit in its styles module (export const ` +
        `iosSkin: T = webSkin;) and inject no platform parts, and this check will stop asking.`,
    );
  }
  if (stale.length) {
    console.error(`check:skins - ${stale.length} registry entr(ies) name a build that is the web build on that platform:\n${stale.join("\n")}`);
  }
  process.exit(1);
}

console.log(
  `✓ platform-skins.ts covers every divergent build (${divergent.length} components render per-OS; ` +
    `${iosTable.size} iOS and ${androidTable.size} Android entries registered, none stale)`,
);
