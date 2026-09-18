import type { ComponentCatalogEntry, MaterialCoverageEntry, PublicRenderable } from "./types";

const ROLES = new Set(["static", "liquid", "inherited"]);
const MOTION = new Set(["native-feedback", "selection-pilot", "moving-selection", "liquid-popup", "optional-profile", "inherited"]);
const TIERS = new Set(["atoms", "molecules", "organisms", "charts", "style"]);
const RECIPE_IDS = new Set([
  "solid-appearance", "glass-appearance", "mode-switch", "accessibility-fallback",
  "runtime-capability", "semantic-state", "inherited-composition", "liquid-motion",
  "open-surface", "inspection",
]);

/** Pure inventory gate. Intended recipes are not executable/runtime evidence. */
export function checkMaterialCoverage(
  exports: readonly PublicRenderable[],
  catalog: readonly ComponentCatalogEntry[],
  entries: readonly MaterialCoverageEntry[],
  guideRoutes: readonly string[] = [],
) {
  const errors: string[] = [];
  const discovered = new Map(exports.map((entry) => [entry.name, entry]));
  const declared = new Set<string>();
  const docs = new Map(catalog.map((entry) => [`components/${entry.slug}`, entry]));
  const knownRoutes = new Set([...docs.keys(), ...guideRoutes]);
  const coveredRoutes = new Set<string>();
  const families = new Set<string>();

  for (const entry of entries) {
    if (declared.has(entry.name)) errors.push(`Duplicate material API: ${entry.name}`);
    declared.add(entry.name);
    const api = discovered.get(entry.name);
    if (!api) errors.push(`Removed or non-renderable API still registered: ${entry.name}`);
    if (!TIERS.has(entry.tier)) errors.push(`Unknown material tier for ${entry.name}: ${entry.tier}`);
    if (!/^[a-z][a-z0-9-]*$/.test(entry.family)) errors.push(`Invalid material family for ${entry.name}: ${entry.family}`);
    if (entry.tier !== "style") {
      families.add(`${entry.tier}/${entry.family}`);
      const directory = `src/${entry.tier}/${entry.family}/`;
      if (api && !api.files.some((file) => file.startsWith(directory))) errors.push(`Wrong source family for ${entry.name}: expected ${directory}`);
      if (!entry.docsRoute) errors.push(`Product API has no docs route: ${entry.name}`);
    }
    if (entry.docsRoute) {
      if (!knownRoutes.has(entry.docsRoute)) errors.push(`Unknown docs route for ${entry.name}: ${entry.docsRoute}`);
      coveredRoutes.add(entry.docsRoute);
      const doc = docs.get(entry.docsRoute);
      if (doc && entry.tier !== "style" && (doc.category.toLowerCase() !== entry.tier || (doc.dir ?? doc.slug) !== entry.family)) {
        errors.push(`Docs family mismatch for ${entry.name}: ${entry.docsRoute}`);
      }
    }
    if (!entry.roles.length || new Set(entry.roles).size !== entry.roles.length || entry.roles.some((role) => !ROLES.has(role))) errors.push(`Invalid material roles for ${entry.name}`);
    if (!entry.target.trim()) errors.push(`Missing surface context for ${entry.name}`);
    if (!entry.unpaintedVariants.trim()) errors.push(`Missing unpainted-variant policy for ${entry.name}`);
    if (!MOTION.has(entry.motion)) errors.push(`Unknown motion profile for ${entry.name}: ${entry.motion}`);
    if (!entry.verification.length || entry.verification.some((recipe) => !RECIPE_IDS.has(recipe))) errors.push(`Invalid verification recipes for ${entry.name}`);
    const ownsSurface = entry.roles.includes("static") || entry.roles.includes("liquid");
    const required = ownsSurface
      ? ["solid-appearance", "glass-appearance", "mode-switch", "accessibility-fallback", "runtime-capability", "semantic-state"]
      : ["inherited-composition", "semantic-state"];
    for (const recipe of required) if (!entry.verification.includes(recipe)) errors.push(`Missing ${recipe} expectation for ${entry.name}`);
    if (entry.motion === "selection-pilot" && (!entry.roles.includes("liquid") || !entry.verification.includes("liquid-motion"))) {
      errors.push(`Selection pilot lacks liquid role/motion verification: ${entry.name}`);
    }
    // A delivered liquid profile is a claim about motion; it needs the liquid role
    // and the liquid-motion evidence recipe, exactly like the pilots.
    if ((entry.motion === "moving-selection" || entry.motion === "liquid-popup") && (!entry.roles.includes("liquid") || !entry.verification.includes("liquid-motion"))) {
      errors.push(`Liquid profile lacks liquid role/motion verification: ${entry.name}`);
    }
  }
  for (const name of discovered.keys()) if (!declared.has(name)) errors.push(`Unclassified public renderable: ${name}`);
  for (const route of docs.keys()) if (!coveredRoutes.has(route)) errors.push(`Unclassified component docs route: ${route}`);
  return {
    errors,
    families: families.size,
    publicAPIs: exports.length,
    docsEntries: catalog.length,
    // Keep the evidence boundary visible in both text and machine output.
    implementationVerified: false,
    runtimeEvidence: "not-recorded" as const,
  };
}
