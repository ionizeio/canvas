/**
 * The overlay recipes, bound to this suite's stage and to Playwright's own types.
 *
 * The recipes themselves live in ./overlay-recipes, shared with lookout.config.ts, so
 * the two things that drive these overlays cannot disagree about how to open one.
 * This file is the thin adapter: it supplies the stage (filtered to the Playground's,
 * since the Do/Don't cards carry the same attribute) and the locators the specs read.
 */
import { type Locator, type Page } from "@playwright/test";
import { OVERLAY_RECIPES, MATERIAL_OVERLAY_RECIPES, TOAST_RECIPE, type OverlayRecipe } from "./overlay-recipes";
import { stage } from "./docs";

export interface BoundOverlay {
  slug: string;
  /** Open it, and return once the click has been dispatched. */
  open: (page: Page) => Promise<void>;
  /** The overlay's role in its own preview host, the window's layer, or a document-root Modal. */
  panel: (page: Page) => Locator;
  /** How many of those one opening adds. */
  adds: number;
  /** The control that opened it, for the focus-return check. */
  trigger: (page: Page) => Locator;
  expands?: boolean;
  restoresFocus?: boolean;
  atDocumentRoot?: boolean;
  inWindowLayer?: boolean;
}

function bind(recipe: OverlayRecipe): BoundOverlay {
  return {
    slug: recipe.slug,
    open: (page) => recipe.open(page as never, stage(page) as never),
    // The stage's OverlayProvider wraps both the preview and its sibling portal
    // outlet. Scope to that host so portaled panels are included but permanently
    // open Do/Don't panels cannot satisfy the Playground's readiness assertion. A
    // card in the window's layer paints outside the stage, in the app root's outlet,
    // so it is found page-wide; the specs count before and after opening, and that
    // outlet comes last in the document, so `.last()` is the card just opened.
    panel: (page) => recipe.atDocumentRoot || recipe.inWindowLayer
      ? page.getByRole(recipe.role)
      : stage(page).locator("..").getByRole(recipe.role),
    adds: recipe.adds,
    trigger: (page) => recipe.trigger(page as never, stage(page) as never) as unknown as Locator,
    expands: recipe.expands,
    restoresFocus: recipe.restoresFocus,
    atDocumentRoot: recipe.atDocumentRoot,
    inWindowLayer: recipe.inWindowLayer,
  };
}

export const OVERLAYS: BoundOverlay[] = OVERLAY_RECIPES.map(bind);
export const MATERIAL_OVERLAYS: BoundOverlay[] = MATERIAL_OVERLAY_RECIPES.map(bind);

export const TOAST = {
  slug: TOAST_RECIPE.slug,
  open: (page: Page) => TOAST_RECIPE.open(page as never, stage(page) as never),
  region: (page: Page) => page.getByRole("status"),
};
