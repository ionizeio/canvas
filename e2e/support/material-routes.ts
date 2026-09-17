/** Shared coverage data for browser evidence and native launch URLs. No renderer imports. */
import { materialComponentRoutes } from "../../tools/materials/manifest.ts";

export const MATERIAL_ROUTES = materialComponentRoutes().map((route) => ({
  ...route,
  // Several foundation APIs share one family but have distinct reference routes.
  slug: route.path.replace(/^\/components\//, ""),
}));

/**
 * Lookout's native driver reads route.path, not target.query. Keep the material
 * choice in the deep-linked route so a native solid run cannot follow app defaults.
 */
export function nativeMaterialRoutes(surface: "solid" | "glass") {
  return MATERIAL_ROUTES.map((route) => ({
    ...route,
    path: `${route.path}${route.path.includes("?") ? "&" : "?"}surface=${surface}`,
  }));
}

/** Lookout supports one native target per run; both modes remain explicit choices. */
export function nativeMaterialTarget(value = process.env.CANVAS_LOOKOUT_NATIVE_SURFACE): "native-glass" | "native-solid" {
  if (value !== undefined && value !== "glass" && value !== "solid") {
    throw new Error("CANVAS_LOOKOUT_NATIVE_SURFACE must be glass or solid");
  }
  return value === "solid" ? "native-solid" : "native-glass";
}
