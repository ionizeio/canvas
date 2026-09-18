import { useContext } from "react";
import { useReadyCaptureTarget } from "./capture-target.js";
import { useTheme, type ThemeValue } from "../theme.js";
import { GlassBlurTargetContext } from "./glass-surface.shared.js";
import { useMaterialCapabilities } from "./material-runtime.js";
import { resolveMaterial, type MaterialOptions } from "./material-resolution.js";

/** Shared effective appearance for a surface's fill, foreground, states and motion. */
export function useMaterialTheme(options: MaterialOptions = {}): ThemeValue {
  const theme = useTheme();
  const target = useReadyCaptureTarget(useContext(GlassBlurTargetContext));
  const material = resolveMaterial(theme, options, useMaterialCapabilities(), target !== null);
  return material.renderer === "solid" && theme.surface !== "solid" ? { ...theme, surface: "solid" } : theme;
}
