import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MINT_SELECTOR, checkParity, readTable } from "../tools/darkfactory/parity.ts";

// The kit's color tokens are Dark Factory's, derived by rule (tools/darkfactory/
// derive-tokens.ts). This runs the parity check in the pre-push suite, so a hand edit to
// the hand-off or to tokens.ts fails here, not only in CI.
describe("Dark Factory parity", () => {
  it("the hand-off and tokens.ts equal the derived table", () => {
    expect(checkParity()).toEqual([]);
  });

  it("reports a drifted value on either side", () => {
    const table = readTable();
    const drifted = structuredClone(table);
    drifted.palettes.blush!.foreground!.value = "#000000";
    const failures = checkParity(drifted);
    expect(failures.some((line) => line.startsWith("light --foreground: css"))).toBe(true);
    expect(failures.some((line) => line.startsWith("light foreground: tokens.ts"))).toBe(true);
  });

  it("reports a role missing from the hand-off", () => {
    const failures = checkParity(readTable(), ":root{}\n.dark{}\n");
    expect(failures.some((line) => line.includes("--background: missing from styles/tokens/colors.css"))).toBe(true);
  });

  it("holds the mint palette too, on both sides", () => {
    const drifted = structuredClone(readTable());
    drifted.palettes.mint!.primary!.value = "#000000";
    const failures = checkParity(drifted);
    expect(failures.some((line) => line.startsWith("mint --primary: css"))).toBe(true);
    expect(failures.some((line) => line.startsWith("mint primary: tokens.ts"))).toBe(true);
  });

  // The web resolves `.dark` over mint by the selector alone (the browser check is
  // e2e/visual/tokens.e2e.ts), so a block under the bare attribute, which would paint mint
  // inside a dark wrapper, reads as missing.
  it("refuses a mint block that is not anchored out of dark contexts", () => {
    const css = readFileSync(join(import.meta.dir, "..", "styles", "tokens", "colors.css"), "utf8");
    expect(MINT_SELECTOR).toContain(":not(:where(.dark, .dark *))");
    const bare = css.replace(`${MINT_SELECTOR}{`, '[data-palette="mint"]{');
    expect(checkParity(readTable(), bare)).toContain(`styles/tokens/colors.css has no ${MINT_SELECTOR} block`);
  });
});
