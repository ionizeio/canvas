// Tooling metadata, not a public styling API. Material role is independent of
// tint density and capability resolution.
export type MaterialRole = "static" | "liquid" | "inherited";
export type MaterialTier = "atoms" | "molecules" | "organisms" | "charts" | "style";

export interface MaterialCoverageEntry {
  name: string;
  tier: MaterialTier;
  family: string;
  docsRoute: string | null;
  roles: readonly MaterialRole[];
  /** The owned surface and context, including compound/inherited anatomy. */
  target: string;
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
