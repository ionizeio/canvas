import { describe, it, expect } from "bun:test";
import {
  splitDoc,
  firstFence,
  parseVariants,
  parseDonts,
  scopeNamesFromLiveScope,
  bannedStyleViolations,
  widthShimViolations,
  bareWidthViolations,
  prosePhantomApiViolations,
} from "./parse-md.ts";

// Unit tests for the docgen markdown parser (tools/docgen/parse-md.ts). These are
// the pure string functions the build-time codegen (tools/docgen/generate.ts) runs
// over every component's co-located `.md`; the generator GATES `docs:gen` (pre-push
// hook + CI), so a regression here silently corrupts every Playground example or the
// style guardrail. No React / DOM here — these are string-in, data-out.

// A fenced-code delimiter. Interpolating this keeps the test markdown readable and
// avoids escaping three backticks inside every template literal.
const F = "```";

describe("firstFence", () => {
  it("returns the body of the first tsx fence", () => {
    const md = `Some prose\n\n${F}tsx\n<Button primary />\n${F}\n`;
    expect(firstFence(md)).toBe("<Button primary />");
  });

  it("accepts a jsx-tagged fence and a bare fence too", () => {
    expect(firstFence(`${F}jsx\n<A />\n${F}`)).toBe("<A />");
    expect(firstFence(`${F}\n<A />\n${F}`)).toBe("<A />");
  });

  it("preserves multi-line bodies verbatim, joined by newlines", () => {
    const code = "<Card>\n  <Text>Hi</Text>\n</Card>";
    expect(firstFence(`${F}tsx\n${code}\n${F}`)).toBe(code);
  });

  it("returns only the FIRST fence when several are present", () => {
    const md = `${F}tsx\n<First />\n${F}\n\n${F}tsx\n<Second />\n${F}`;
    expect(firstFence(md)).toBe("<First />");
  });

  it("returns null when there is no fence", () => {
    expect(firstFence("just prose, no code here")).toBeNull();
  });

  it("returns an empty string for an empty fence body (falsy, so splitDoc drops it)", () => {
    expect(firstFence(`${F}tsx\n${F}`)).toBe("");
  });
});

describe("parseVariants", () => {
  it("pairs each '### label' heading with the fence that follows it", () => {
    const section = `## Variants\n\n### Type - section\n\n${F}tsx\n<Card section />\n${F}\n\n### Type - generic\n\n${F}tsx\n<Card generic />\n${F}\n`;
    expect(parseVariants(section)).toEqual([
      { label: "Type - section", code: "<Card section />" },
      { label: "Type - generic", code: "<Card generic />" },
    ]);
  });

  it("trims surrounding whitespace off the label", () => {
    const section = `###    Spacey label   \n${F}tsx\n<A />\n${F}`;
    expect(parseVariants(section)).toEqual([{ label: "Spacey label", code: "<A />" }]);
  });

  it("preserves multi-line variant code", () => {
    const code = "<Form\n  stacked\n/>";
    const section = `### Layout\n${F}tsx\n${code}\n${F}`;
    expect(parseVariants(section)).toEqual([{ label: "Layout", code }]);
  });

  it("drops a heading with no fence; the next heading's label wins", () => {
    // "### Orphan" never gets a fence, so it is discarded and "### Real" is emitted.
    const section = `### Orphan\n### Real\n${F}tsx\n<X />\n${F}`;
    expect(parseVariants(section)).toEqual([{ label: "Real", code: "<X />" }]);
  });

  it("ignores a fence that appears before any heading", () => {
    const section = `${F}tsx\n<Loose />\n${F}\n### After\n${F}tsx\n<Kept />\n${F}`;
    expect(parseVariants(section)).toEqual([{ label: "After", code: "<Kept />" }]);
  });

  it("returns [] for a section with no variants", () => {
    expect(parseVariants("")).toEqual([]);
    expect(parseVariants("## Variants\n\njust prose")).toEqual([]);
  });
});

describe("splitDoc", () => {
  it("emits the Usage fence as the 'Default' example", () => {
    const md = `# Button\n\nA button.\n\n## Usage\n\n${F}tsx\n<Button primary />\n${F}\n`;
    const { examples, donts } = splitDoc(md);
    expect(examples).toEqual([{ label: "Default", code: "<Button primary />" }]);
    expect(donts).toEqual([]);
  });

  it("drops the '# Name' + description header (only sections become examples)", () => {
    const md = `# Button\n\nProse that must NOT leak into an example.\n\n## Usage\n\n${F}tsx\n<Button />\n${F}`;
    const { examples } = splitDoc(md);
    expect(examples).toHaveLength(1);
    expect(examples[0].code).toBe("<Button />");
    expect(examples[0].code).not.toContain("Prose");
  });

  it("appends each Variant after Default", () => {
    const md =
      `# Card\n\ndesc\n\n## Usage\n\n${F}tsx\n<Card />\n${F}\n\n## Variants\n\n` +
      `### Type - section\n\n${F}tsx\n<Card section />\n${F}\n\n` +
      `### Type - generic\n\n${F}tsx\n<Card generic />\n${F}\n`;
    const { examples } = splitDoc(md);
    expect(examples).toEqual([
      { label: "Default", code: "<Card />" },
      { label: "Type - section", code: "<Card section />" },
      { label: "Type - generic", code: "<Card generic />" },
    ]);
  });

  it("de-dupes a variant whose fence is byte-identical to Usage (shows once as Default)", () => {
    const md =
      `# Typography\n\ndesc\n\n## Usage\n\n${F}tsx\n<Typography display>Aa</Typography>\n${F}\n\n## Variants\n\n` +
      `### Style - display\n\n${F}tsx\n<Typography display>Aa</Typography>\n${F}\n\n` +
      `### Style - body\n\n${F}tsx\n<Typography body>Aa</Typography>\n${F}\n`;
    const { examples } = splitDoc(md);
    expect(examples).toEqual([
      { label: "Default", code: "<Typography display>Aa</Typography>" },
      { label: "Style - body", code: "<Typography body>Aa</Typography>" },
    ]);
  });

  it("parses the Do & Don't section into pairs and keeps it out of examples", () => {
    const md =
      `# Form\n\ndesc\n\n## Usage\n\n${F}tsx\n<Form stacked />\n${F}\n\n## Do & Don't\n\n` +
      `### Stacked\n\n**Do** — one field per row\n\n${F}tsx\n<Form stacked />\n${F}\n\n` +
      `**Don't** — cramped side by side\n\n${F}tsx\n<Form twoColumn />\n${F}\n`;
    const { examples, donts } = splitDoc(md);
    expect(examples).toEqual([{ label: "Default", code: "<Form stacked />" }]);
    expect(donts).toEqual([
      {
        title: "Stacked",
        do: { caption: "one field per row", code: "<Form stacked />" },
        dont: { caption: "cramped side by side", code: "<Form twoColumn />" },
      },
    ]);
  });

  it("handles a doc with no Variants section (Default only)", () => {
    const md = `# X\n\nd\n\n## Usage\n\n${F}tsx\n<X />\n${F}`;
    expect(splitDoc(md).examples).toEqual([{ label: "Default", code: "<X />" }]);
  });

  it("handles a doc with no Do & Don't section (empty donts)", () => {
    const md = `# X\n\nd\n\n## Usage\n\n${F}tsx\n<X />\n${F}`;
    expect(splitDoc(md).donts).toEqual([]);
  });

  it("yields no examples and no donts when the doc has no '## ' sections at all", () => {
    const md = `# Placeholder\n\nJust a header and prose, no sections yet.`;
    expect(splitDoc(md)).toEqual({ examples: [], donts: [] });
  });

  it("normalizes CRLF line endings before parsing", () => {
    const md = `# X\r\n\r\ndesc\r\n\r\n## Usage\r\n\r\n${F}tsx\r\n<X />\r\n${F}\r\n`;
    const { examples } = splitDoc(md);
    expect(examples).toEqual([{ label: "Default", code: "<X />" }]);
    // The normalized body must not carry stray carriage returns.
    expect(examples[0].code).not.toContain("\r");
  });
});

describe("parseDonts", () => {
  it("pairs a Do fence with a Don't fence under one title", () => {
    const section = `## Do & Don't\n\n### Anchor\n\n**Do** — keep the divider\n\n${F}tsx\n<Good />\n${F}\n\n**Don't** — drop it\n\n${F}tsx\n<Bad />\n${F}\n`;
    expect(parseDonts(section)).toEqual([
      {
        title: "Anchor",
        do: { caption: "keep the divider", code: "<Good />" },
        dont: { caption: "drop it", code: "<Bad />" },
      },
    ]);
  });

  it("pairs by marker, not position: a Don't listed before its Do still pairs correctly", () => {
    const section = `### G\n\n**Don't** — bad way\n\n${F}tsx\n<Bad />\n${F}\n\n**Do** — good way\n\n${F}tsx\n<Good />\n${F}\n`;
    expect(parseDonts(section)).toEqual([
      { title: "G", do: { caption: "good way", code: "<Good />" }, dont: { caption: "bad way", code: "<Bad />" } },
    ]);
  });

  it("strips the leading separator (em dash, colon, or hyphen) from a caption", () => {
    const mk = (marker: string) =>
      `### T\n\n**Do** ${marker} keep it\n\n${F}tsx\n<G />\n${F}\n\n**Don't** ${marker} not this\n\n${F}tsx\n<B />\n${F}`;
    for (const sep of ["—", "–", "-", ":"]) {
      const [pair] = parseDonts(mk(sep));
      expect(pair.do.caption).toBe("keep it");
      expect(pair.dont.caption).toBe("not this");
    }
  });

  it("recognizes a curly-apostrophe Don’t marker", () => {
    const section = `### T\n\n**Do** — a\n\n${F}tsx\n<G />\n${F}\n\n**Don’t** — b\n\n${F}tsx\n<B />\n${F}`;
    const [pair] = parseDonts(section);
    expect(pair.do.caption).toBe("a");
    expect(pair.dont.caption).toBe("b");
  });

  it("collects multiple titled groups in order", () => {
    const grp = (n: string) =>
      `### ${n}\n\n**Do** — d${n}\n\n${F}tsx\n<G${n} />\n${F}\n\n**Don't** — x${n}\n\n${F}tsx\n<B${n} />\n${F}`;
    const pairs = parseDonts(`## Do & Don't\n\n${grp("A")}\n\n${grp("B")}`);
    expect(pairs.map((p) => p.title)).toEqual(["A", "B"]);
    expect(pairs[1].do.code).toBe("<GB />");
    expect(pairs[1].dont.code).toBe("<BB />");
  });

  it("leaves title undefined when a pair has no preceding '### heading'", () => {
    const section = `**Do** — a\n\n${F}tsx\n<G />\n${F}\n\n**Don't** — b\n\n${F}tsx\n<B />\n${F}`;
    const [pair] = parseDonts(section);
    expect(pair.title).toBeUndefined();
  });

  it("preserves multi-line code inside each side", () => {
    const good = "<Card>\n  <Row />\n</Card>";
    const section = `### T\n\n**Do** — x\n\n${F}tsx\n${good}\n${F}\n\n**Don't** — y\n\n${F}tsx\n<B />\n${F}`;
    expect(parseDonts(section)[0].do.code).toBe(good);
  });

  it("does not emit a pair when one side is missing", () => {
    const section = `### T\n\n**Do** — only a do\n\n${F}tsx\n<G />\n${F}`;
    expect(parseDonts(section)).toEqual([]);
  });

  it("returns [] for an empty section", () => {
    expect(parseDonts("")).toEqual([]);
  });
});

describe("scopeNamesFromLiveScope", () => {
  it("extracts the object keys of the LIVE_SCOPE literal", () => {
    const src = `export const LIVE_SCOPE: Record<string, unknown> = {\n  View,\n  Text,\n  Button,\n};`;
    expect(scopeNamesFromLiveScope(src).sort()).toEqual(["Button", "Text", "View"]);
  });

  it("captures a key whose value is an inline object (e.g. tokens: {}) and names after it", () => {
    // Brace-matching must find the OUTER close, so names after a nested {} still land.
    const src = `const LIVE_SCOPE = {\n  tokens: {},\n  alpha,\n  View,\n};`;
    expect(scopeNamesFromLiveScope(src).sort()).toEqual(["View", "alpha", "tokens"]);
  });

  it("drops trailing line comments", () => {
    const src = `const LIVE_SCOPE = {\n  View, // the primitive\n  Text, // another\n};`;
    expect(scopeNamesFromLiveScope(src).sort()).toEqual(["Text", "View"]);
  });

  it("ignores full-line comments", () => {
    const src = `const LIVE_SCOPE = {\n  // Theme/style helpers below\n  alpha,\n  shadow,\n};`;
    expect(scopeNamesFromLiveScope(src).sort()).toEqual(["alpha", "shadow"]);
  });

  it("only captures the leading identifier on each line", () => {
    // "b: { c: 1 }" yields "b", never the nested "c".
    const src = `const LIVE_SCOPE = {\n  a,\n  b: { c: 1 },\n  d,\n};`;
    expect(scopeNamesFromLiveScope(src).sort()).toEqual(["a", "b", "d"]);
  });

  it("de-dupes repeated names", () => {
    const src = `const LIVE_SCOPE = {\n  View,\n  View,\n};`;
    expect(scopeNamesFromLiveScope(src)).toEqual(["View"]);
  });

  it("returns [] when there is no LIVE_SCOPE token", () => {
    expect(scopeNamesFromLiveScope("export const OTHER = { View };")).toEqual([]);
  });

  it("returns [] when no opening brace follows LIVE_SCOPE", () => {
    expect(scopeNamesFromLiveScope("export const LIVE_SCOPE")).toEqual([]);
  });

  it("returns [] when the object literal is never closed", () => {
    expect(scopeNamesFromLiveScope("const LIVE_SCOPE = {\n  View,\n  Text,")).toEqual([]);
  });

  it("reads the real docs/src/core/live-scope.ts source (codegen's single source of truth)", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(
      path.join(import.meta.dir, "..", "..", "docs", "src", "core", "live-scope.ts"),
      "utf8",
    );
    const names = scopeNamesFromLiveScope(src);
    // The generator throws if this is empty; it must include the primitives, the
    // style helpers, and real components — and carry no comment/brace junk.
    expect(names.length).toBeGreaterThan(50);
    for (const expected of ["View", "Text", "Pressable", "tokens", "alpha", "Button", "Heatmap"]) {
      expect(names).toContain(expected);
    }
    expect(names.every((n) => /^[A-Za-z_$][\w$]*$/.test(n))).toBe(true);
  });
});

describe("bannedStyleViolations", () => {
  it("flags a layout / spacing / positioning key", () => {
    expect(bannedStyleViolations(`<V style={{ flexDirection: "row" }} />`)).toContain("flexDirection");
    expect(bannedStyleViolations(`<V style={{ marginTop: 4 }} />`)).toContain("marginTop");
    expect(bannedStyleViolations(`<V style={{ gap: 8 }} />`)).toContain("gap");
    expect(bannedStyleViolations(`<V style={{ padding: 16 }} />`)).toContain("padding");
    expect(bannedStyleViolations(`<V style={{ position: "absolute", top: 0, zIndex: 2 }} />`).sort()).toEqual([
      "position",
      "top",
      "zIndex",
    ]);
  });

  it("flags a typography key", () => {
    const found = bannedStyleViolations(
      `<Text style={{ fontSize: 12, lineHeight: 16, fontWeight: "600", color: "red", letterSpacing: 0.4, textTransform: "uppercase", fontFamily: "monospace" }} />`,
    ).sort();
    expect(found).toEqual(
      ["color", "fontFamily", "fontSize", "fontWeight", "letterSpacing", "lineHeight", "textTransform"].sort(),
    );
  });

  it("flags a surface key", () => {
    const found = bannedStyleViolations(
      `<V style={{ backgroundColor: "x", borderWidth: 1, borderColor: "y", borderRadius: 4, boxShadow: "z", opacity: 0.5, shadowColor: "w" }} />`,
    ).sort();
    expect(found).toEqual(
      ["backgroundColor", "borderColor", "borderRadius", "borderWidth", "boxShadow", "opacity", "shadowColor"].sort(),
    );
  });

  it("ignores the deliberately-allowed keys (bounding/align/overflow are composition, not styling)", () => {
    const code = `<V style={{ width: 280, height: 40, maxWidth: 360, minWidth: 10, textAlign: "center", overflow: "hidden" }} />`;
    expect(bannedStyleViolations(code)).toEqual([]);
  });

  it("returns [] for a clean fence with no style prop", () => {
    expect(bannedStyleViolations(`<Button primary large>Save</Button>`)).toEqual([]);
  });

  it("does not false-match a prefix key (marginTop must not also report 'margin')", () => {
    expect(bannedStyleViolations(`<V style={{ marginTop: 4 }} />`)).toEqual(["marginTop"]);
    expect(bannedStyleViolations(`<V style={{ flexDirection: "row", flex: 1 }} />`).sort()).toEqual([
      "flex",
      "flexDirection",
    ]);
  });

  it("scans an array-of-styles expression", () => {
    expect(bannedStyleViolations(`<V style={[{ padding: 8 }, { color: "red" }]} />`).sort()).toEqual([
      "color",
      "padding",
    ]);
  });

  it("unions violations across multiple style blocks in one fence", () => {
    const code = `<V style={{ gap: 8 }}><Text style={{ fontWeight: "600" }}>x</Text></V>`;
    expect(bannedStyleViolations(code).sort()).toEqual(["fontWeight", "gap"]);
  });

  it("de-dupes the same key found in two blocks", () => {
    const code = `<V style={{ padding: 8 }}><Text style={{ padding: 4 }}>x</Text></V>`;
    expect(bannedStyleViolations(code)).toEqual(["padding"]);
  });

  it("respects the // docgen-allow-style opt-out on the line where the style begins", () => {
    const code = `<V style={{ padding: 16 }} /> {/* docgen-allow-style */}`;
    expect(bannedStyleViolations(code)).toEqual([]);
  });

  it("does NOT opt out when the marker sits on a different line than the style", () => {
    // The comment is on the `<V` line, but the style opens on the next line.
    const code = `<V // docgen-allow-style\n  style={{ padding: 16 }}\n/>`;
    expect(bannedStyleViolations(code)).toEqual(["padding"]);
  });

  it("opts out only the annotated style, still flagging a second un-annotated one on another line", () => {
    // Opt-out is per-line, so the two styles must live on separate lines.
    const code = `<V style={{ padding: 16 }} /* docgen-allow-style */>\n  <Text style={{ color: "red" }}>x</Text>\n</V>`;
    expect(bannedStyleViolations(code)).toEqual(["color"]);
  });
});

describe("widthShimViolations", () => {
  it("flags width/max/minWidth in a style placed directly on a component", () => {
    expect(widthShimViolations(`<Input style={{ maxWidth: 320 }} />`)).toEqual(["maxWidth on <Input>"]);
    expect(widthShimViolations(`<Select style={{ minWidth: 200 }} options={[]} />`)).toEqual(["minWidth on <Select>"]);
    expect(widthShimViolations(`<Autocomplete\n  options={[]}\n  style={{ maxWidth: 300 }}\n/>`)).toEqual([
      "maxWidth on <Autocomplete>",
    ]);
    expect(widthShimViolations(`<Card style={{ maxWidth: 420 }} />`)).toEqual(["maxWidth on <Card>"]);
  });

  it("flags an explicit width too: a width belongs to a layout container", () => {
    expect(widthShimViolations(`<Select style={{ width: 192 }} options={[]} />`)).toEqual(["width on <Select>"]);
  });

  it("flags a raw View standing in for a Container, and allows the layout containers themselves", () => {
    expect(widthShimViolations(`<View style={{ maxWidth: 420 }}>\n  <Input placeholder="x" />\n</View>`)).toEqual(["maxWidth on <View>"]);
    expect(widthShimViolations(`<Container sm start><Input placeholder="x" /></Container>`)).toEqual([]);
    expect(widthShimViolations(`<Column style={{ maxWidth: 420 }} />`)).toEqual([]);
    expect(widthShimViolations(`<Grid style={{ maxWidth: 900 }} />`)).toEqual([]);
    expect(widthShimViolations(`<Sidebar style={{ width: 280 }} />`)).toEqual([]);
  });

  it("does not leak past the opening tag into a sibling's style", () => {
    // The Input's tag closes before the Container opens.
    const code = `<Input placeholder="x" />\n<Container sm />`;
    expect(widthShimViolations(code)).toEqual([]);
  });

  it("is not fooled by a '>' inside an expression attribute before the style", () => {
    const code = `<Input onChangeText={(t) => setV(t)} style={{ maxWidth: 320 }} />`;
    expect(widthShimViolations(code)).toEqual(["maxWidth on <Input>"]);
  });

  it("honors the docgen-allow-style line opt-out", () => {
    const code = `<Card style={{ maxWidth: 420 }} /* docgen-allow-style */ />`;
    expect(widthShimViolations(code)).toEqual([]);
  });
});

describe("bareWidthViolations", () => {
  it("flags a fixed width >= 280 with no maxWidth in the same style", () => {
    expect(bareWidthViolations(`<View style={{ width: 320 }} />`)).toEqual(["width: 320 without maxWidth"]);
  });

  it("flags the threshold width itself (280 is included)", () => {
    expect(bareWidthViolations(`<Card padded style={{ width: 280 }} />`)).toEqual(["width: 280 without maxWidth"]);
  });

  it("passes when the same style also carries maxWidth", () => {
    expect(bareWidthViolations(`<View style={{ width: 320, maxWidth: "100%" }} />`)).toEqual([]);
  });

  it("passes a width under the threshold", () => {
    expect(bareWidthViolations(`<View style={{ width: 240 }} />`)).toEqual([]);
  });

  it("passes a non-numeric width (a percentage string self-bounds)", () => {
    expect(bareWidthViolations(`<Skeleton text style={{ width: "60%" }} />`)).toEqual([]);
  });

  it("does not mistake a maxWidth/minWidth/borderWidth key for width", () => {
    expect(bareWidthViolations(`<View style={{ maxWidth: 560 }} />`)).toEqual([]);
    expect(bareWidthViolations(`<View style={{ minWidth: 320, borderWidth: 300 }} />`)).toEqual([]);
  });

  it("unions violations across multiple style blocks in one fence", () => {
    const code = `<View style={{ width: 320 }}>\n  <View style={{ width: 400 }} />\n</View>`;
    expect(bareWidthViolations(code).sort()).toEqual([
      "width: 320 without maxWidth",
      "width: 400 without maxWidth",
    ]);
  });

  it("flags only the unbounded style, not a sibling that carries maxWidth", () => {
    const code = `<View style={{ width: 320, maxWidth: "100%" }}>\n  <View style={{ width: 400 }} />\n</View>`;
    expect(bareWidthViolations(code)).toEqual(["width: 400 without maxWidth"]);
  });

  it("respects the // docgen-allow-style opt-out on the style's line", () => {
    const code = `<View style={{ width: 320 }} /> {/* docgen-allow-style */}`;
    expect(bareWidthViolations(code)).toEqual([]);
  });
});

describe("prosePhantomApiViolations", () => {
  const tokens = (md: string) => prosePhantomApiViolations(md).map((v) => v.token);

  it("passes clean prose that names only real Canvas API", () => {
    const md = `# Button\n\nA primary, large button. Pass \`primary\` and \`large\`; it reads like natural language.`;
    expect(prosePhantomApiViolations(md)).toEqual([]);
  });

  it("flags a CSS property name written in prose", () => {
    expect(tokens(`Set the border-radius to round the card.`)).toContain("border-radius");
    expect(tokens(`It controls the font-size of the label.`)).toContain("font-size");
  });

  it("flags an HTML element mentioned in prose", () => {
    expect(tokens(`Renders as a <div> under the hood.`)).toContain("<div");
    expect(tokens(`Composes a bunch of divs together.`)).toContain("divs");
  });

  it("flags a Tailwind utility referenced in prose", () => {
    expect(tokens(`The row uses flex-row to lay out.`)).toContain("flex-row");
  });

  it("ignores everything inside a fenced code block (examples are exempt)", () => {
    const md = `Intro line.\n\n${F}tsx\n<View style={{ borderRadius: 8 }} className="flex-row" />\n${F}\n\nOutro line.`;
    expect(prosePhantomApiViolations(md)).toEqual([]);
  });

  it("exempts a \"Don't\" caption (it describes the wrong-way idiom on purpose)", () => {
    const md = `**Don't** — Reach for a raw <div> with border-radius to fake a card.`;
    expect(prosePhantomApiViolations(md)).toEqual([]);
  });

  it("respects the docgen-allow-prose escape hatch on a line", () => {
    const md = `This mentions border-radius deliberately. docgen-allow-prose`;
    expect(prosePhantomApiViolations(md)).toEqual([]);
  });

  it("does not flag a file-extension token as a CSS class reference", () => {
    // `.md` / `.tsx` look like `.class` but are excluded via PROSE_FILE_EXT.
    expect(tokens(`See the component's .md and its .tsx entry.`)).not.toContain(".md");
  });

  it("reports the 1-based line number of a violation", () => {
    const md = `Clean intro.\n\nA line with box-shadow in it.`;
    const found = prosePhantomApiViolations(md);
    expect(found.some((v) => v.token === "box-shadow" && v.line === 3)).toBe(true);
  });
});
