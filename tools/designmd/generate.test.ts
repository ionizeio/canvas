import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { lightColors, radius, spacing } from "../../src/style/tokens.ts";

// DESIGN.md is the kit's design system, written to be read by the agents and people
// building on it. Its value depends on two things being true at once: that the numbers
// are the kit's real numbers, which `designmd:gen --check` enforces in CI, and that the
// frontmatter is actually parseable by whatever reads it, which is what this asserts.
//
// The schema is the one the design-md library uses for the 74 production systems it
// documents, so a tool that can read one of those can read this.

const ROOT = join(import.meta.dir, "..", "..");
const source = readFileSync(join(ROOT, "DESIGN.md"), "utf8");

const fence = /^---\n([\s\S]*?)\n---\n/.exec(source);

describe("the frontmatter", () => {
  it("opens the file, so a parser finds it", () => {
    expect(fence, "DESIGN.md must begin with a frontmatter fence").not.toBeNull();
  });

  const data = parse(fence![1]) as Record<string, unknown>;

  it("parses as YAML", () => {
    expect(typeof data).toBe("object");
    expect(data.name).toBe("Canvas");
  });

  it("carries the schema's own keys", () => {
    for (const key of ["colors", "typography", "spacing", "rounded", "components"]) {
      expect(data, key).toHaveProperty(key);
    }
  });

  it("carries the numbers from src/style/tokens.ts, not a copy of them", () => {
    const colors = data.colors as Record<string, string>;
    expect(colors.primary).toBe(lightColors.primary);
    expect(colors.background).toBe(lightColors.background);

    const rounded = data.rounded as Record<string, string>;
    expect(rounded.lg).toBe(`${radius.lg}px`);
    // "DEFAULT" is spelled "base" in the library's schema.
    expect(rounded.base).toBe(`${radius.DEFAULT}px`);

    const space = data.spacing as Record<string, string>;
    expect(space["4"]).toBe(`${spacing["4"]}px`);
  });

  it("describes a type role fully enough to render it", () => {
    const body = (data.typography as Record<string, Record<string, unknown>>).body;
    expect(body.fontSize).toBe("16px");
    expect(body.fontWeight).toBe(400);
    expect(String(body.fontFamily)).toContain("Urbanist");
    expect(String(body.lineHeight)).toMatch(/^\d+px$/);
  });

  it("states both platforms' touch minimums and the web's absence of one", () => {
    expect(data.touchTargets).toEqual({ ios: "44px", android: "48px", web: "none" });
  });
});

describe("the prose", () => {
  const body = source.slice(fence![0].length);

  it("keeps every generated block paired", () => {
    const opens = [...body.matchAll(/<!-- @generated:([\w-]+) -->/g)].map((m) => m[1]);
    const closes = body.match(/<!-- @\/generated -->/g) ?? [];
    expect(opens.length).toBe(closes.length);
    expect(new Set(opens).size, "a block placed twice would be filled twice").toBe(opens.length);
  });

  it("says the things a caller gets wrong", () => {
    // Not a style check: these four are the rules that are easy to break by accident
    // and expensive to find afterwards, so the document is not useful without them.
    expect(body).toContain("boolean");
    expect(body).toContain("no styling escape hatch");
    expect(body).toContain("theming mode");
    expect(body).toContain("desktop-first");
  });

  it("has no em-dashes", () => {
    // House rule, and the generator writes this file, so it is worth a test.
    expect(source).not.toContain("—");
  });
});
