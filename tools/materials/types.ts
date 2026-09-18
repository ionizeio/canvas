// Tooling metadata, not a public styling API. Material role is independent of
// tint density, capability resolution, and whether an interaction animates.
export type MaterialRole = "static" | "liquid" | "inherited";
export type MaterialTier = "atoms" | "molecules" | "organisms" | "charts" | "style";
// "moving-selection": one measured glass surface travels between the component's
// own targets (Tabs, TabBar, Navbar). "liquid-popup": the anchored panel opens and
// closes through the kit's popup material lifecycle. Both are internal profiles
// that follow the effective material; neither is a public styling axis.
export type MotionProfile = "native-feedback" | "selection-pilot" | "moving-selection" | "liquid-popup" | "optional-profile" | "inherited";

export interface MaterialCoverageEntry {
  name: string;
  tier: MaterialTier;
  family: string;
  docsRoute: string | null;
  roles: readonly MaterialRole[];
  /** The owned surface and context, including compound/inherited anatomy. */
  target: string;
  /** Extra custom motion is never inferred from clickability or material. */
  motion: MotionProfile;
  /** Existing unfilled variants must retain their anatomy in every mode. */
  unpaintedVariants: string;
  /** Required evidence recipes, not a claim of implementation or a test pass. */
  verification: readonly string[];
}

export interface MaterialRoute {
  path: string;
  family: string;
  roles: MaterialRole[];
}

export interface PublicRenderable {
  name: string;
  /** Repo-relative declaration paths, including dependency-owned primitives. */
  files: string[];
}

export interface ComponentCatalogEntry {
  slug: string;
  dir?: string;
  category: string;
}
