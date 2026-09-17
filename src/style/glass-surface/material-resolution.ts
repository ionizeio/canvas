import type { ThemeValue } from "../theme.js";
import type { GlassLayer } from "./glass-surface.shared.js";

export interface MaterialOptions {
  /** Stable frost instead of functional Liquid Glass. Content defaults to frost. */
  static?: boolean;
  layer?: GlassLayer;
}

export interface MaterialCapabilities {
  platform: "web" | "ios" | "android" | "other";
  frost: boolean;
  liquid: boolean;
  lens: boolean;
  requiresTarget: boolean;
}

export type MaterialRenderer = "solid" | "frost" | "liquid" | "lens";
export type MaterialFallback = "preference" | "contrast" | "transparency" | "missing-target" | "unavailable";
export interface MaterialResolution {
  renderer: MaterialRenderer;
  static: boolean;
  fallback?: MaterialFallback;
}

/** Role, density and renderer are separate decisions. This never acquires resources. */
export function resolveMaterial(
  theme: Pick<ThemeValue, "surface" | "increasedContrast" | "reducedTransparency">,
  options: MaterialOptions,
  capabilities: MaterialCapabilities,
  hasSafeTarget: boolean,
): MaterialResolution {
  const stable = options.static ?? options.layer === "content";
  const solid = (fallback: MaterialFallback): MaterialResolution => ({ renderer: "solid", static: stable, fallback });
  if (theme.increasedContrast) return solid("contrast");
  if (theme.reducedTransparency) return solid("transparency");
  if (theme.surface !== "glass") return solid("preference");
  if (!stable && capabilities.liquid) return { renderer: "liquid", static: false };
  if (!stable && capabilities.lens) return { renderer: "lens", static: false };
  if (!capabilities.frost) return solid("unavailable");
  if (capabilities.requiresTarget && !hasSafeTarget) return solid("missing-target");
  return { renderer: "frost", static: stable };
}
