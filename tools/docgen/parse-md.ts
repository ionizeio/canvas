// The component-markdown grammar, lifted verbatim from the original web docs'
// component page into one framework-free module so the web
// shell, the native shell, and the build-time codegen all parse a component's
// `.md` the exact same way and can never drift. These functions are pure string
// parsers with no React or bundler dependency.
//
// Each component's co-located markdown (src/<level>/<slug>/<slug>.md) is split into
// the Playground examples (the Usage fence as "Default", then each Variant) and the
// parsed Do/Don't pairs. The leading "# Name" + description are dropped (the page
// header shows them); the Usage section carries no prose.

export type Example = { label: string; code: string };
export type DontSide = { caption: string; code: string };
export type DontPair = { title?: string; do: DontSide; dont: DontSide };

export function splitDoc(src: string): { examples: Example[]; donts: DontPair[] } {
  const md = src.replace(/\r\n/g, "\n");
  const dontsAt = md.indexOf("\n## Do & Don't");
  const body = dontsAt === -1 ? md : md.slice(0, dontsAt);
  const section = dontsAt === -1 ? "" : md.slice(dontsAt);
  // Head begins at the first "## " (Usage), dropping the "# Name" + description.
  const firstSection = body.indexOf("\n## ");
  const head = firstSection === -1 ? "" : body.slice(firstSection + 1);
  // Usage is everything up to "## Variants"; the rest is the variant list.
  const variantsAt = head.indexOf("\n## Variants");
  const usageMd = variantsAt === -1 ? head : head.slice(0, variantsAt);
  const variantsMd = variantsAt === -1 ? "" : head.slice(variantsAt);

  const usageCode = firstFence(usageMd);
  const variants = parseVariants(variantsMd);
  const examples: Example[] = [];
  if (usageCode) examples.push({ label: "Default", code: usageCode });
  // Skip a variant whose fence is identical to Usage (e.g. typography's first
  // "Style - display" duplicates the Usage example), so it shows once as Default.
  for (const v of variants) if (v.code !== usageCode) examples.push(v);

  return { examples, donts: parseDonts(section) };
}

// The body of the first ```tsx/jsx fence in a markdown slice (the Usage example).
export function firstFence(md: string): string | null {
  const lines = md.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (/^```(\w+)?\s*$/.test(lines[i])) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) code.push(lines[i++]);
      return code.join("\n");
    }
  }
  return null;
}

// The Variants section is a flat list of "### <label>" headings, each followed by
// exactly one ```tsx fence (no intervening prose). The label is the heading text
// verbatim; the code is the fence body.
export function parseVariants(section: string): Example[] {
  const lines = section.split("\n");
  const out: Example[] = [];
  let label: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const h = /^###\s+(.*)$/.exec(lines[i]);
    if (h) { label = h[1].trim(); continue; }
    if (label && /^```(\w+)?\s*$/.test(lines[i])) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) code.push(lines[i++]);
      out.push({ label, code: code.join("\n") });
      label = null;
    }
  }
  return out;
}

// The Do/Don't markdown is regular: "### title" groups, each with "**Do** — caption"
// + a ```tsx fence and "**Don't** — caption" + a ```tsx fence (Do emitted first).
// Pair by marker name, not position, so order does not matter.
export function parseDonts(section: string): DontPair[] {
  const lines = section.split("\n");
  const pairs: DontPair[] = [];
  let title: string | undefined;
  let cur: { do?: DontSide; dont?: DontSide } = {};
  let side: "do" | "dont" | null = null;
  let caption = "";
  for (let i = 0; i < lines.length; i++) {
    const h = /^###\s+(.*)$/.exec(lines[i]);
    if (h) { title = h[1].trim(); cur = {}; side = null; continue; }
    const m = /^\*\*(Do|Don['’]t)\*\*\s*(.*)$/.exec(lines[i]);
    if (m) {
      side = m[1] === "Do" ? "do" : "dont";
      // Strip the leading separator (an em/en dash, colon, or hyphen) + spaces.
      caption = m[2].replace(/^[\s\p{P}]+/u, "").trim();
      continue;
    }
    if (/^```(\w+)?\s*$/.test(lines[i]) && side) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) code.push(lines[i++]);
      cur[side] = { caption, code: code.join("\n") };
      side = null;
      if (cur.do && cur.dont) { pairs.push({ title, do: cur.do, dont: cur.dont }); cur = {}; }
    }
  }
  return pairs;
}

// Extract the names exposed to an example fence (the LIVE_SCOPE keys) straight from
// the docs runtime scope module, so the codegen's destructure list stays in lockstep
// with the single source of truth (docs/src/core/live-scope.ts) without importing it
// (importing would pull react-native into a plain Node/Bun context). These are all
// VALUE names (components, primitives, `tokens`, `alpha`/`shadow`/`palette`) — never
// type-only exports — so destructuring them from the scope is always valid.
export function scopeNamesFromLiveScope(src: string): string[] {
  const text = src.replace(/\r\n/g, "\n");
  const start = text.indexOf("LIVE_SCOPE");
  const open = start === -1 ? -1 : text.indexOf("{", start);
  if (open === -1) return [];
  // Find the matching close brace for the object literal.
  let depth = 0;
  let end = -1;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) return [];
  const body = text.slice(open + 1, end);
  const names = new Set<string>();
  for (const raw of body.split("\n")) {
    const line = raw.replace(/\/\/.*$/, ""); // drop trailing line comment
    const m = /^\s*([A-Za-z_$][\w$]*)\s*[,:]/.exec(line);
    if (m) names.add(m[1]);
  }
  return [...names];
}

// Style-shim guardrail. The "No styling escape hatches" directive (CLAUDE.md)
// bans raw `style={{…}}` overrides that restyle, re-space, reposition, or
// re-typeset a component or primitive; those choices belong to semantic props and
// the Row/Column layout primitives. bannedStyleViolations flags such keys in a
// fence so the codegen can warn (and, once the sweep is done, fail). Deliberately
// NOT banned: `width`/`height`/`maxWidth`/`minWidth` (bounding a demo is
// composition, not styling), `overflow`, and `textAlign` (Typography has no align
// axis yet). "Don't" fences are exempt at the call site (they hand-roll the wrong
// way on purpose), so this is only run over the example and "Do" fences.
// EXCEPTION to the width allowance: max/minWidth placed directly on an
// input-like control is the shim the standard field width axis replaced; see
// fieldWidthShimViolations below.
export const BANNED_STYLE_PROPS: string[] = [
  // layout / spacing / positioning — belongs to Row/Column or the component
  "flexDirection", "flexWrap", "flex", "flexGrow", "flexShrink", "flexBasis",
  "alignItems", "alignSelf", "justifyContent", "gap", "rowGap", "columnGap",
  "margin", "marginTop", "marginBottom", "marginLeft", "marginRight",
  "marginHorizontal", "marginVertical", "marginStart", "marginEnd",
  "padding", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight",
  "paddingHorizontal", "paddingVertical", "paddingStart", "paddingEnd",
  "position", "top", "left", "right", "bottom", "zIndex",
  // typography — belongs to Typography's role / tone / weight / underline
  "fontSize", "lineHeight", "fontWeight", "color", "letterSpacing", "textTransform", "fontFamily", "textDecorationLine",
  // surface — belongs to the relevant component (Card, Chip, Emblem, Divider, …)
  "backgroundColor", "borderWidth", "borderColor", "borderRadius",
  "borderTopWidth", "borderBottomWidth", "borderLeftWidth", "borderRightWidth",
  "borderTopColor", "borderBottomColor", "borderLeftColor", "borderRightColor",
  "borderTopLeftRadius", "borderTopRightRadius", "borderBottomLeftRadius", "borderBottomRightRadius",
  "shadowColor", "shadowOpacity", "shadowRadius", "shadowOffset", "elevation", "boxShadow", "opacity",
];

// The distinct banned property names found inside any `style={…}` /
// `contentContainerStyle={…}` expression in a fence. A `// docgen-allow-style`
// comment on the line where a style begins opts that one style out (a last
// resort, mirroring CLAUDE.md's "name it and get authorization" stance).
export function bannedStyleViolations(code: string): string[] {
  const found = new Set<string>();
  const marker = "style={";
  let idx = 0;
  while (true) {
    const at = code.indexOf(marker, idx);
    if (at === -1) break;
    // Move to the first "{" of the expression after "style=".
    let i = code.indexOf("{", at + marker.length - 1);
    if (i === -1) break;
    // Brace-match the whole `{…}` expression (object or array of objects).
    const start = i;
    let depth = 0;
    for (; i < code.length; i++) {
      if (code[i] === "{") depth++;
      else if (code[i] === "}") {
        depth--;
        if (depth === 0) { i++; break; }
      }
    }
    const expr = code.slice(start, i);
    idx = i;

    // Per-line opt-out on the line where the style begins.
    const lineStart = code.lastIndexOf("\n", at) + 1;
    let lineEnd = code.indexOf("\n", at);
    if (lineEnd === -1) lineEnd = code.length;
    if (code.slice(lineStart, lineEnd).includes("docgen-allow-style")) continue;

    for (const key of BANNED_STYLE_PROPS) {
      // Key as an object member: preceded by "{", "," or whitespace, followed by ":".
      if (new RegExp(`(?:^|[{,\\s])${key}\\s*:`).test(expr)) found.add(key);
    }
  }
  return [...found];
}

// Bare-width guardrail. The docs page's content box is the viewport minus 56px,
// so a fence that pins a fixed width at or above this threshold with no
// `maxWidth` in the same style expression overflows the page at phone width.
// Adding `maxWidth: "100%"` beside the width keeps the desktop size and lets the
// demo shrink on narrow viewports. Unlike the style-shim guardrail, "Don't"
// fences are NOT exempt: a wrong-way demo must still not overflow the page it
// renders on. The same `// docgen-allow-style` line opt-out applies.
export const BARE_WIDTH_MIN = 280;

/**
 * Bare fixed widths in a fence: each entry is `width: <N> without maxWidth` for
 * a numeric `width` >= BARE_WIDTH_MIN found inside a style={…} expression that
 * carries no `maxWidth` key. A `maxWidth` anywhere in the expression clears it
 * (React Native merges array styles, so a sibling array member's bound applies).
 */
export function bareWidthViolations(code: string): string[] {
  const found = new Set<string>();
  const marker = "style={";
  let idx = 0;
  while (true) {
    const at = code.indexOf(marker, idx);
    if (at === -1) break;
    // Move to the first "{" of the expression after "style=".
    let i = code.indexOf("{", at + marker.length - 1);
    if (i === -1) break;
    // Brace-match the whole `{…}` expression (object or array of objects).
    const start = i;
    let depth = 0;
    for (; i < code.length; i++) {
      if (code[i] === "{") depth++;
      else if (code[i] === "}") {
        depth--;
        if (depth === 0) { i++; break; }
      }
    }
    const expr = code.slice(start, i);
    idx = i;

    // Per-line opt-out on the line where the style begins.
    const lineStart = code.lastIndexOf("\n", at) + 1;
    let lineEnd = code.indexOf("\n", at);
    if (lineEnd === -1) lineEnd = code.length;
    if (code.slice(lineStart, lineEnd).includes("docgen-allow-style")) continue;

    if (/(?:^|[{,\s])maxWidth\s*:/.test(expr)) continue;

    // Numeric `width` members only ("width: 320"); percentage strings and other
    // non-numeric values self-bound. The boundary chars keep `maxWidth`/
    // `minWidth`/`borderWidth` from matching as `width`.
    const widthRe = /(?:^|[{,\s])width\s*:\s*(\d+)/g;
    let m: RegExpExecArray | null;
    while ((m = widthRe.exec(expr)) !== null) {
      const n = Number(m[1]);
      if (n >= BARE_WIDTH_MIN) found.add(`width: ${n} without maxWidth`);
    }
  }
  return [...found];
}

// The input-like controls are FILL (src/style/sizing.ts): the parent layout
// container provides their bounds, so a `maxWidth`/`minWidth` in a `style`
// placed DIRECTLY on one of these tags is the shim the layout tier replaced
// (a Container step or a Row span is the fix) and is banned in example/"Do"
// fences; the `LayoutStyle` type rejects it at compile time as well. Explicit
// `width` stays allowed here (deliberate side-by-side comparisons), as do width
// bounds on wrapper Views/Cards (page-layout composition). The
// `// docgen-allow-style` line opt-out applies here too.
const FIELD_WIDTH_TAGS = ["Input", "Textarea", "Select", "Autocomplete", "Listbox", "Field"] as const;
const FIELD_WIDTH_BANNED = ["maxWidth", "minWidth"] as const;

/**
 * Violations of the field width axis: each entry is "<key> on <Tag>" for a
 * max/minWidth style key found inside a style={…} attribute of an input-like
 * control's opening tag.
 */
export function fieldWidthShimViolations(code: string): string[] {
  const found = new Set<string>();
  const tagRe = new RegExp(`<(${FIELD_WIDTH_TAGS.join("|")})\\b`, "g");
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(code)) !== null) {
    // Walk the opening tag to its closing ">", tracking brace depth so a ">"
    // inside a JSX expression attribute (e.g. an arrow function) doesn't end it.
    let i = m.index + m[0].length;
    let depth = 0;
    let tagEnd = code.length;
    for (; i < code.length; i++) {
      const ch = code[i];
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
      else if (ch === ">" && depth === 0) { tagEnd = i; break; }
    }
    const tagSrc = code.slice(m.index, tagEnd);
    const styleAt = tagSrc.indexOf("style={");
    if (styleAt === -1) continue;

    // Same per-line opt-out as bannedStyleViolations, on the line where the
    // style attribute begins.
    const absAt = m.index + styleAt;
    const lineStart = code.lastIndexOf("\n", absAt) + 1;
    let lineEnd = code.indexOf("\n", absAt);
    if (lineEnd === -1) lineEnd = code.length;
    if (code.slice(lineStart, lineEnd).includes("docgen-allow-style")) continue;

    for (const key of FIELD_WIDTH_BANNED) {
      if (new RegExp(`(?:^|[{,\\s])${key}\\s*:`).test(tagSrc.slice(styleAt))) {
        found.add(`${key} on <${m[1]}>`);
      }
    }
  }
  return [...found];
}

// Prose guardrail. Canvas is a React Native kit, so its docs prose must describe
// the real component API, never a web/CSS-framework idiom the kit does not expose.
// This is the same disease as the banned style shims, one layer out: not a raw
// `style={…}` in a fence, but a Tailwind utility class (`gap-6`, `items-center`,
// `bg-input`, `mt-[3px]`), a CSS property (`min-height`, `resize-y`), an HTML
// element (`<label>`, "a bare div", "pre element"), or a CSS class reference
// (`.label`, `.input-addon`) sitting in an intro paragraph or a "Do" caption.
// Each pattern matches framework-specific SYNTAX with no plain-English meaning, so
// ordinary words ("a label", "the gap between rows") never trip it.
const PROSE_PHANTOM_PATTERNS: [RegExp, string][] = [
  // Tailwind utility-class tokens.
  [/\b[a-z][a-z-]*-\[[^\]\s]+\]/g, "tailwind arbitrary value (e.g. mt-[3px])"],
  [/\b(?:gap|space)-(?:[xy]-)?\d/g, "tailwind gap utility"],
  [/\b[mp][trblxye]?-\d(?![\d.])/g, "tailwind margin/padding utility"],
  [/\b(?:min-)?[wh]-\d/g, "tailwind size utility"],
  [/\b(?:items|self|content)-(?:center|start|end|stretch|baseline)\b/g, "tailwind align utility"],
  [/\bjustify-(?:center|between|around|evenly|start|end)\b/g, "tailwind justify utility"],
  [/\bbg-[a-z][a-z-]*/g, "tailwind background utility"],
  [/\btext-(?:muted|xs|sm|lg|xl|center|left|right)[a-z-]*/g, "tailwind text utility"],
  [/\bfont-(?:mono|sans|serif|medium|semibold|bold|light|normal)\b/g, "tailwind font utility"],
  [/\bselect-(?:none|text|all)\b/g, "tailwind select utility"],
  [/\brounded-(?:sm|md|lg|xl|full|none)\b/g, "tailwind rounded utility"],
  [/\b(?:shrink|grow)-\d/g, "tailwind flex utility"],
  [/\bflex-(?:row|col|1|none|wrap)\b/g, "tailwind flex-direction utility"],
  [/\b(?:leading|tracking)-(?:none|tight|snug|normal|relaxed|loose|wide|wider)\b/g, "tailwind leading/tracking utility"],
  [/\bw\/h\b/g, "w/h utilities shorthand"],
  // CSS property names (kebab-case) in prose — the kit uses camelCase props/tokens.
  [/\b(?:min|max)-(?:width|height)\b/g, "CSS property (use the width axis / rows)"],
  [/\bresize-(?:y|x|none|both)\b/g, "CSS resize (RN has no resize handle)"],
  [/\b(?:z-index|line-height|font-size|font-weight|border-radius|box-shadow|letter-spacing|backdrop-filter)\b/g, "CSS property name"],
  // HTML elements / attributes.
  [/<\/?(?:div|span|label|ul|ol|li|pre|p|a|button|section|nav|img|table)\b/g, "HTML element"],
  [/\bdivs?\b/gi, "HTML element (div)"],
  [/\b(?:pre|div|span) element\b/g, "HTML element reference"],
  [/\b(?:className|htmlFor|inputmode)\b/g, "HTML/DOM attribute"],
  [/<a href/g, "HTML anchor"],
  // CSS class references (`.label`, `.input-addon`), excluding file-extension tokens.
  [/(?:^|[\s(])\.[a-z][a-z-]{2,}\b/g, "CSS class reference"],
];
const PROSE_FILE_EXT = /^\.(?:md|tsx?|jsx?|json|png|svg|css|html|sh|dev|com|io|env)$/;

/**
 * Phantom-API references in a component's `.md` PROSE (intro paragraph + "Do"
 * captions + any other non-fence, non-"Don't"-caption line). "Don't" captions are
 * exempt for the same reason "Don't" fences are exempt from the style guardrail:
 * they describe the wrong-way idiom on purpose. A line carrying
 * `docgen-allow-prose` is skipped (a last-resort escape). Returns one entry per
 * distinct match so the codegen can fail with a located, actionable list.
 */
export function prosePhantomApiViolations(md: string): { line: number; token: string; kind: string }[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: { line: number; token: string; kind: string }[] = [];
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^```/.test(line)) { inFence = !inFence; continue; }
    if (inFence) continue;
    if (/^\*\*Don['’]t\*\*/.test(line)) continue; // anti-pattern caption
    if (line.includes("docgen-allow-prose")) continue;
    for (const [re, kind] of PROSE_PHANTOM_PATTERNS) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(line)) !== null) {
        const token = m[0].trim();
        if (kind === "CSS class reference" && PROSE_FILE_EXT.test(token)) continue;
        out.push({ line: i + 1, token, kind });
      }
    }
  }
  return out;
}
