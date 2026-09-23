/**
 * The token stylesheet, rendered the way a consumer links it.
 *
 * test/tokens.html pulls in styles/canvas.css exactly as a web consumer would, so
 * this is the one baseline that photographs the CSS hand-off rather than the React
 * Native kit. It replaces the screenshot script that used to shoot this fixture, whose
 * 5% pixel and 1% dimension tolerances existed only to paper over the difference
 * between the macOS machine that minted its baselines and whatever machine ran it
 * next. Linux-only baselines remove the reason for the tolerance.
 *
 * Served by the second web server in playwright.config.ts, from the checkout root.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { TOKENS_URL } from "../../playwright.config";
import { expect, test } from "../support/fixtures";
import { MINT_SELECTOR, declarationsIn } from "../../tools/tokens/css-tokens.ts";

for (const scheme of ["light", "dark"] as const) {
  test(`the token stylesheet in ${scheme}`, async ({ page }) => {
    await page.goto(TOKENS_URL, { waitUntil: "networkidle" });
    // The stylesheet keys dark off a `.dark` class on the root, never
    // prefers-color-scheme, so this is how a consumer switches it too.
    await page.evaluate((wantDark) => {
      document.documentElement.classList.toggle("dark", wantDark);
    }, scheme === "dark");
    await expect(page).toHaveScreenshot(`tokens--${scheme}.png`, { fullPage: true });
  });
}

// The palette axis, where it actually resolves: the browser's cascade. Mint paints only
// in a light context (on the root or on any wrapper) and a dark root or wrapper always
// shows the one dark palette, the precedence the ThemeProvider gives `dark` over `mint`.
// Under increased contrast every glass layer falls back to its opaque token, inside a
// palette or scheme wrapper as much as on the root. Values come from the stylesheet itself.
const colorsCss = readFileSync(resolve(__dirname, "../../styles/tokens/colors.css"), "utf8");
const blush = declarationsIn(colorsCss, ":root");
const mint = { ...blush, ...declarationsIn(colorsCss, MINT_SELECTOR) };
const dark = { ...blush, ...declarationsIn(colorsCss, ".dark") };

test("the mint palette paints only in a light context", async ({ page }) => {
  await page.goto(TOKENS_URL, { waitUntil: "networkidle" });
  const read = (setup: { rootDark: boolean; rootMint: boolean; wrapperMint: boolean; wrapperDark?: boolean }) => page.evaluate((s) => {
    const root = document.documentElement;
    root.classList.toggle("dark", s.rootDark);
    if (s.rootMint) root.dataset.palette = "mint"; else delete root.dataset.palette;
    const wrapper = document.createElement("div");
    if (s.wrapperMint) wrapper.dataset.palette = "mint";
    if (s.wrapperDark) wrapper.classList.add("dark");
    document.body.append(wrapper);
    const at = (node: Element) => ({
      background: getComputedStyle(node).getPropertyValue("--background").trim(),
      tint: getComputedStyle(node).getPropertyValue("--glass-tint").trim(),
    });
    const values = { root: at(root), wrapper: at(wrapper) };
    wrapper.remove();
    return values;
  }, setup);
  const expectLook = (seen: { background: string; tint: string }, look: Record<string, string | undefined>, name: string) => {
    expect(seen.background, name).toBe(look.background);
    expect(seen.tint, name).toBe(look["glass-tint"]);
  };

  let seen = await read({ rootDark: false, rootMint: false, wrapperMint: false });
  expectLook(seen.root, blush, "no attribute: blush");
  seen = await read({ rootDark: false, rootMint: true, wrapperMint: false });
  expectLook(seen.root, mint, "mint on the root");
  seen = await read({ rootDark: true, rootMint: true, wrapperMint: false });
  expectLook(seen.root, dark, "dark and mint on the root: dark wins");
  seen = await read({ rootDark: false, rootMint: false, wrapperMint: true });
  expectLook(seen.root, blush, "a mint wrapper leaves the root blush");
  expectLook(seen.wrapper, mint, "a mint wrapper in a light root");
  seen = await read({ rootDark: true, rootMint: false, wrapperMint: true });
  expectLook(seen.wrapper, dark, "a mint wrapper inside a dark root stays dark");
  seen = await read({ rootDark: false, rootMint: true, wrapperMint: false, wrapperDark: true });
  expectLook(seen.wrapper, dark, "a dark wrapper inside a mint root is dark");
});

test("increased contrast turns the glass opaque inside palette and scheme wrappers too", async ({ page }) => {
  await page.goto(TOKENS_URL, { waitUntil: "networkidle" });
  await page.emulateMedia({ contrast: "more" });
  const tints = await page.evaluate(() => {
    const root = document.documentElement;
    root.classList.remove("dark");
    root.dataset.surface = "glass";
    const read = (setup: (node: HTMLElement) => void) => {
      const wrapper = document.createElement("div");
      setup(wrapper);
      document.body.append(wrapper);
      const tint = getComputedStyle(wrapper).getPropertyValue("--glass-tint").trim();
      wrapper.remove();
      return tint;
    };
    const values = {
      root: getComputedStyle(root).getPropertyValue("--glass-tint").trim(),
      mint: read((node) => { node.dataset.palette = "mint"; }),
      dark: read((node) => { node.classList.add("dark"); }),
    };
    delete root.dataset.surface;
    return values;
  });
  // The fallback points each tint at an opaque token, so none stays a translucent rgba().
  for (const [where, tint] of Object.entries(tints)) expect(tint, where).not.toMatch(/^rgba\(/);
});
