import { gotoDocs } from "../support/docs";
import { expect, test } from "../support/fixtures";

// The document owns the docs' faces: every pre-rendered page carries the exporter's
// @font-face rules (in the head's `expo-generated-fonts` style element) and a preload per
// face, and the client must adopt them rather than declare them again
// (docs/src/ui/fonts.ts). expo-font 57.0.1 compared a rule's family name with the one it
// was asked for without dropping quotes, which Firefox's CSSOM keeps, so in Firefox it
// found none of the faces loaded: right after hydration it moved the style element to
// the end of the head and appended a second rule for each face, seven times over. Every
// face was then declared twice and fetched again, and the page's text vanished and came
// back in a fallback face before its own. Chromium and WebKit drop the quotes and never
// did it, which is why this runs on all three engines.
//
// The check is deterministic: expo-font's hook re-declares a face synchronously in the
// root layout's mount effect, which runs before the commit that marks the document
// hydrated, so by the time gotoDocs returns a re-declaration has already happened.
test("the pre-rendered page's font faces are adopted, not declared again", async ({ page }) => {
  // Watch the faces' style element from the document's first node on.
  await page.addInitScript(() => {
    const scope = window as unknown as { __fontStyleMoves: number };
    scope.__fontStyleMoves = 0;
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of Array.from(record.removedNodes)) {
          if (node instanceof HTMLStyleElement && node.id === "expo-generated-fonts") scope.__fontStyleMoves += 1;
        }
      }
    }).observe(document, { childList: true, subtree: true });
  });
  await gotoDocs(page, "/components/carousel/loop");
  const faces = await page.evaluate(() => ({
    families: Array.from(document.styleSheets)
      .flatMap((sheet) => Array.from(sheet.cssRules))
      .filter((rule): rule is CSSFontFaceRule => rule instanceof CSSFontFaceRule)
      // Firefox serializes the family quoted, Chromium and WebKit bare.
      .map((rule) => rule.style.getPropertyValue("font-family").replace(/^(["'])(.*)\1$/, "$2"))
      .sort(),
    preloads: document.querySelectorAll('link[rel="preload"][as="font"]').length,
    moves: (window as unknown as { __fontStyleMoves: number }).__fontStyleMoves,
  }));
  expect(faces.moves, "the faces' style element left the head after the page loaded").toBe(0);
  expect(faces.families.filter((family, index) => faces.families.indexOf(family) !== index), "faces declared twice").toEqual([]);
  expect(faces.families, "one @font-face rule per preloaded face").toHaveLength(faces.preloads);
});
