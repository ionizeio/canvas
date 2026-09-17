import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { COMPONENTS } from "../docs/src/core/data/components";
import { checkMaterialCoverage } from "../tools/materials/check";
import { discoverPublicRenderables } from "../tools/materials/discover";
import { materialCoverage } from "../tools/materials/manifest";

const root = resolve(import.meta.dir, "..");
const nav = JSON.parse(readFileSync(resolve(root, "docs/src/data/nav.config.json"), "utf8")) as { routes: Record<string, { href: string }> };
const exports = discoverPublicRenderables(root);
const result = checkMaterialCoverage(exports, COMPONENTS, materialCoverage, Object.values(nav.routes).map(({ href }) => href.replace(/^\//, "")));
if (process.argv.includes("--json")) console.log(JSON.stringify({ ...result, exports }, null, 2));
else {
  console.log(`Material inventory: ${result.families} families, ${result.docsEntries} component docs entries, ${result.publicAPIs} renderable public APIs.`);
  console.log("Coverage records design decisions and required evidence, not implementation, native rendering or accessibility passes.");
  for (const error of result.errors) console.error(error);
}
if (result.errors.length) process.exitCode = 1;
