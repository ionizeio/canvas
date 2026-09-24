/**
 * How to open every overlay the kit ships, in one place.
 *
 * There are two things that drive these overlays: the end-to-end suite, which asserts
 * what they do, and lookout, which photographs and judges them. Both used to carry
 * their own copy of the list, and that is exactly how four of lookout's recipes went
 * stale unnoticed: Select was opened by the text of its current value, which stopped
 * matching when the example changed, so the sweep spent months judging a closed Select
 * as an open one. One list, two consumers.
 *
 * The only import is a type, erased at runtime, so this file loads under bun (which is
 * how lookout executes the config that reads it) without pulling in a test runner.
 * Each recipe takes the Playwright page AND the Playground stage, because the two
 * consumers scope the stage differently: the suite filters for the one containing a
 * preview card, lookout takes the first.
 */
import type { Locator, Page } from "playwright";

export interface OverlayRecipe {
  /** The component page's slug, which is also its route segment. */
  slug: string;
  /**
   * Open it. Clicks the LAST matching trigger inside the stage: the rows stack iOS,
   * Android, Web, so the last one belongs to the Web row, the row whose behaviour is
   * native to the browser being driven.
   */
  open: (page: Page, stage: Locator) => Promise<void>;
  /** The ARIA role the overlay itself carries once open. */
  role: "dialog" | "alertdialog" | "menu" | "listbox";
  /** How many nodes of that role one opening adds. */
  adds: number;
  /** The control that opened it, for a focus-return check. */
  trigger: (page: Page, stage: Locator) => Locator;
  /** Whether the trigger carries aria-expanded (menus, selects, comboboxes do). */
  expands?: boolean;
  /** Whether the kit contracts that focus returns to the trigger on close. */
  restoresFocus?: boolean;
  /** True when the overlay renders through a Modal at the document root. */
  atDocumentRoot?: boolean;
  /**
   * True when the open card paints in the window's outermost OverlayProvider, not in
   * the stage's own: every anchored card that closes on an outside tap does, so its
   * dismiss layer covers the whole window. It is still placed within the stage.
   */
  inWindowLayer?: boolean;
}

const lastButton = (stage: Locator, name: string | RegExp) =>
  stage.getByRole("button", { name }).last();

const clickButton =
  (name: string | RegExp) =>
  async (_page: Page, stage: Locator): Promise<void> => {
    await lastButton(stage, name).click();
  };

export const OVERLAY_RECIPES: OverlayRecipe[] = [
  {
    slug: "dialog",
    open: clickButton("Open dialog"),
    trigger: (_page, stage) => lastButton(stage, "Open dialog"),
    role: "dialog",
    adds: 1,
    restoresFocus: true,
  },
  {
    slug: "alert-dialog",
    open: clickButton(/Delete identity/),
    trigger: (_page, stage) => lastButton(stage, /Delete identity/),
    role: "alertdialog",
    adds: 1,
    restoresFocus: true,
  },
  {
    slug: "popover",
    open: clickButton("Open popover"),
    trigger: (_page, stage) => lastButton(stage, "Open popover"),
    role: "dialog",
    adds: 1,
    restoresFocus: true,
    inWindowLayer: true,
  },
  {
    slug: "dropdown",
    open: clickButton("Actions"),
    trigger: (_page, stage) => lastButton(stage, "Actions"),
    role: "menu",
    adds: 1,
    expands: true,
    restoresFocus: true,
    inWindowLayer: true,
  },
  {
    slug: "row-menu",
    open: async (_page, stage) => {
      await stage.getByLabel("More options").last().click();
    },
    trigger: (_page, stage) => stage.getByLabel("More options").last(),
    role: "menu",
    adds: 1,
    expands: true,
    inWindowLayer: true,
  },
  {
    // The collapsed field is a button named for its label. It used to be opened by the
    // text of its current value, which stopped matching when the example changed.
    slug: "select",
    open: clickButton("Country"),
    trigger: (_page, stage) => lastButton(stage, "Country"),
    role: "listbox",
    adds: 1,
    expands: true,
    inWindowLayer: true,
  },
  {
    // The field is a combobox, not a bare textbox: the old locator matched the page's
    // own search box on some routes and timed out on others.
    slug: "autocomplete",
    open: async (_page, stage) => {
      const field = stage.getByRole("combobox").last();
      await field.click();
      await field.pressSequentially("a", { delay: 40 });
    },
    trigger: (_page, stage) => stage.getByRole("combobox").last(),
    role: "listbox",
    adds: 1,
    expands: true,
    inWindowLayer: true,
  },
  {
    // The default example is the COLLAPSED trigger, not an inline palette, so the
    // placeholder the old recipe clicked does not exist until after it opens.
    slug: "command",
    open: clickButton(/Search/),
    trigger: (_page, stage) => lastButton(stage, /Search/),
    role: "listbox",
    adds: 1,
    expands: true,
    inWindowLayer: true,
  },
  {
    slug: "action-sheet",
    open: clickButton("Add photo"),
    trigger: (_page, stage) => lastButton(stage, "Add photo"),
    role: "dialog",
    adds: 1,
    atDocumentRoot: true,
  },
  {
    slug: "drawer",
    open: clickButton("Open menu"),
    trigger: (_page, stage) => lastButton(stage, "Open menu"),
    role: "dialog",
    adds: 1,
    atDocumentRoot: true,
  },
];

/** Country menus join material evidence without changing the Linux solid baselines. */
export const PHONE_INPUT_RECIPE: OverlayRecipe = {
  slug: "phone-input",
  open: async (_page, stage) => {
    await stage.getByRole("button", { name: /^Country(?:,|$)/ }).last().click();
  },
  trigger: (_page, stage) => stage.getByRole("button", { name: /^Country(?:,|$)/ }).last(),
  role: "listbox",
  adds: 1,
  expands: true,
  inWindowLayer: true,
};

/** Material captures share these exact input recipes with Lookout. */
export const MATERIAL_OVERLAY_RECIPES: OverlayRecipe[] = [...OVERLAY_RECIPES, PHONE_INPUT_RECIPE];

/**
 * Toast is not an overlay you open and close: it is an announcement written into a
 * live region already standing on the page, and it removes itself.
 */
export const TOAST_RECIPE = {
  slug: "toast",
  open: async (_page: Page, stage: Locator): Promise<void> => {
    await lastButton(stage, "Show toast").click();
  },
};
