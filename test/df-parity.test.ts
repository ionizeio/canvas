import { describe, expect, it } from "bun:test";
import { checkParity, readTable } from "../tools/darkfactory/parity.ts";

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
});
