import { describe, expect, it } from "bun:test";
import { deriveAll } from "../tools/darkfactory/derive-tokens.ts";
import { readTable } from "../tools/darkfactory/parity.ts";

// tools/darkfactory/tokens.json is what the rules in derive-tokens.ts produce from the
// vendored Dark Factory theme. A rule change without a regenerated table (`bun run
// df:tokens`) fails here, in the pre-push suite, rather than only in CI.
describe("the Dark Factory token table", () => {
  it("is what the derivation rules produce", () => {
    expect(JSON.parse(JSON.stringify(deriveAll()))).toEqual(readTable().palettes);
  });
});
