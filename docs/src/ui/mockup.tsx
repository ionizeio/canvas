import { type ReactNode, useMemo } from "react";
import { View, Text, ScrollView, useTheme, useResponsive, type ColorTokens } from "@ionizeio/canvas";
import Svg, { Path, Circle, Rect, Line } from "react-native-svg";
import { sans, geistMono } from "./fonts";
import { alpha } from "./color";

// A focused HTML-to-React-Native renderer for the docs' pattern/template mockups. The
// The previous web docs rendered each section's `html` field with dangerouslySetInnerHTML; that cannot
// run on native, so this interprets the SAME html string into RN Views/Texts. It covers
// the bounded subset those mockups use: inline-styled div/span/p/h*/code/kbd/a/label/li,
// the docs component classes (section-card, card, btn*, input, badge*, status-badge,
// kbd, avatar, dot, sep, dt-table), tables, form controls, and small svgs. Colors come
// from the live theme tokens, so the mockups track light/dark/glass like everything else.

// ── Parsing ──────────────────────────────────────────────
type Node = { type: "el"; tag: string; attrs: Record<string, string>; children: Node[] } | { type: "text"; text: string };

const VOID = new Set(["br", "hr", "img", "input", "path", "circle", "rect", "line", "polyline", "polygon", "source", "use"]);
const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  uarr: "↑", darr: "↓", larr: "←", rarr: "→", check: "✓",
  ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’", hellip: "…", mdash: "—", ndash: "–", times: "×", bull: "•",
};
function decode(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (_, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    }
    return ENTITIES[e] ?? _;
  });
}
function parseAttrs(s: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*"([^"]*)"|\s*=\s*'([^']*)')?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) attrs[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? "");
  return attrs;
}
function parseHtml(html: string): Node[] {
  const root: Node = { type: "el", tag: "root", attrs: {}, children: [] };
  const stack: Node[] = [root];
  const re = /<!--[\s\S]*?-->|<\/([a-zA-Z][a-zA-Z0-9]*)\s*>|<([a-zA-Z][a-zA-Z0-9]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const top = stack[stack.length - 1];
    if (top.type !== "el") continue;
    if (m[0].startsWith("<!--")) continue;
    if (m[1]) {
      const tag = m[1].toLowerCase();
      for (let i = stack.length - 1; i > 0; i--) {
        const n = stack[i];
        if (n.type === "el" && n.tag === tag) { stack.length = i; break; }
      }
    } else if (m[2]) {
      const tag = m[2].toLowerCase();
      const el: Node = { type: "el", tag, attrs: parseAttrs(m[3] ?? ""), children: [] };
      top.children.push(el);
      if (!VOID.has(tag) && !m[4]) stack.push(el);
    } else if (m[5]) {
      const text = decode(m[5]);
      if (text.trim() || /\s/.test(text)) top.children.push({ type: "text", text });
    }
  }
  return root.children;
}

// ── CSS value helpers ────────────────────────────────────
const RADIUS: Record<string, number> = { sm: 4, md: 8, lg: 12, xl: 16, full: 9999 };
// CSS box-alignment keywords map to RN/Yoga values (RN rejects raw start/end).
const ALIGN: Record<string, string> = {
  start: "flex-start", end: "flex-end", "self-start": "flex-start", "self-end": "flex-end",
  "flex-start": "flex-start", "flex-end": "flex-end", center: "center", stretch: "stretch", baseline: "baseline",
  "space-between": "space-between", "space-around": "space-around", "space-evenly": "space-evenly",
};
const al = (v: string) => ALIGN[v] ?? v;
function len(v: string): number | string | undefined {
  v = v.trim();
  if (!v) return undefined;
  if (v === "auto") return "auto";
  if (v.endsWith("%")) return v;
  if (v.endsWith("px")) return parseFloat(v);
  if (v.endsWith("rem")) return parseFloat(v) * 16;
  if (v.endsWith("em")) return parseFloat(v) * 16;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
}
function radius(v: string): number {
  v = v.trim();
  if (v === "50%" || v === "9999px") return 9999;
  const mv = v.match(/var\(--radius-([a-z]+)\s*,\s*([0-9.]+)px\)/);
  if (mv) return RADIUS[mv[1]] ?? parseFloat(mv[2]);
  const mr = v.match(/var\(--radius-([a-z]+)\)/);
  if (mr) return RADIUS[mr[1]] ?? 8;
  const l = len(v);
  return typeof l === "number" ? l : 8;
}

const COLOR_TOKENS = new Set<keyof ColorTokens>([
  "background", "foreground", "card", "card-foreground", "popover", "popover-foreground",
  "primary", "primary-text", "primary-foreground", "secondary", "secondary-foreground", "muted", "muted-foreground",
  "accent", "accent-foreground", "destructive", "destructive-text", "destructive-foreground",
  "border", "input", "field-border", "ring",
]);
// The optional text roles fall back for legacy complete token objects, exactly as
// the tokens screen resolves them.
function tokenColor(tokens: ColorTokens, key: keyof ColorTokens): string {
  if (key === "primary-text") return tokens[key] ?? tokens.primary;
  if (key === "destructive-text") return tokens[key] ?? tokens.destructive;
  if (key === "field-border") return tokens[key] ?? tokens.input;
  return tokens[key];
}
function color(v: string, tokens: ColorTokens): string | undefined {
  v = v.trim();
  if (!v || v === "currentColor" || v === "inherit") return undefined;
  if (v === "transparent" || v === "none") return "transparent";
  // color-mix(in oklch, var(--X) N%, transparent) -> alpha(token, N/100)
  const mix = v.match(/color-mix\(in oklch,\s*var\(--([a-z-]+)\)\s*([0-9.]+)%/);
  if (mix) {
    const tok = mix[1] as keyof ColorTokens;
    if (COLOR_TOKENS.has(tok)) return alpha(tokenColor(tokens, tok), parseFloat(mix[2]) / 100);
  }
  if (v.startsWith("linear-gradient") || v.startsWith("radial-gradient")) {
    const inner = v.match(/var\(--([a-z-]+)\)|#[0-9a-fA-F]{3,8}|hsl\([^)]*\)|rgba?\([^)]*\)/);
    return inner ? color(inner[0], tokens) : undefined;
  }
  const vm = v.match(/^var\(--([a-z-]+)/);
  if (vm) {
    const tok = vm[1] as keyof ColorTokens;
    return COLOR_TOKENS.has(tok) ? tokenColor(tokens, tok) : undefined;
  }
  return v; // hex / hsl / rgb / named
}

const TEXT_PROPS = new Set(["color", "fontSize", "fontFamily", "lineHeight", "letterSpacing", "textAlign", "textTransform", "textDecorationLine", "fontWeight", "fontStyle"]);

// Parse an inline style string into { view, text } RN style fragments. `text` props are
// the inheritable typographic ones; `grid` carries grid-template info for child layout.
function parseStyle(styleStr: string, tokens: ColorTokens) {
  const view: Record<string, unknown> = {};
  const text: Record<string, unknown> = {};
  let grid: string | undefined;
  let fontSize: number | undefined;
  let lineH: { ratio?: number; px?: number } | undefined;
  let isFlex = false;
  let hasDir = false;
  let pre = false;

  for (const decl of styleStr.split(";")) {
    const idx = decl.indexOf(":");
    if (idx < 0) continue;
    const prop = decl.slice(0, idx).trim().toLowerCase();
    const val = decl.slice(idx + 1).trim();
    if (!val) continue;
    switch (prop) {
      case "display": if (val === "none") view.display = "none"; else if (val === "grid") grid = "grid"; else if (val === "flex" || val === "inline-flex") isFlex = true; break;
      case "flex-direction": view.flexDirection = val; hasDir = true; break;
      case "flex-wrap": view.flexWrap = val; break;
      case "align-items": view.alignItems = al(val); break;
      case "align-self": view.alignSelf = al(val); break;
      case "justify-content": view.justifyContent = al(val); break;
      case "white-space": if (val.startsWith("pre")) pre = true; break;
      case "gap": view.gap = len(val); break;
      case "row-gap": view.rowGap = len(val); break;
      case "column-gap": view.columnGap = len(val); break;
      case "flex": view.flex = parseFloat(val) || (val === "1" ? 1 : undefined); break;
      case "flex-grow": view.flexGrow = parseFloat(val); break;
      case "flex-shrink": view.flexShrink = parseFloat(val); break;
      case "width": view.width = len(val); break;
      case "height": view.height = len(val); break;
      case "min-width": view.minWidth = len(val); break;
      case "max-width": view.maxWidth = len(val); break;
      case "min-height": view.minHeight = len(val); break;
      case "max-height": view.maxHeight = len(val); break;
      case "padding": expand(val, "padding", view); break;
      case "padding-top": view.paddingTop = len(val); break;
      case "padding-right": view.paddingRight = len(val); break;
      case "padding-bottom": view.paddingBottom = len(val); break;
      case "padding-left": view.paddingLeft = len(val); break;
      case "margin": expand(val, "margin", view); break;
      case "margin-top": view.marginTop = len(val); break;
      case "margin-right": view.marginRight = len(val); break;
      case "margin-bottom": view.marginBottom = len(val); break;
      case "margin-left": view.marginLeft = len(val); break;
      case "background": case "background-color": { const c = color(val, tokens); if (c) view.backgroundColor = c; break; }
      case "color": { const c = color(val, tokens); if (c) text.color = c; break; }
      case "border": border(val, "", view, tokens); break;
      case "border-top": border(val, "Top", view, tokens); break;
      case "border-bottom": border(val, "Bottom", view, tokens); break;
      case "border-left": border(val, "Left", view, tokens); break;
      case "border-right": border(val, "Right", view, tokens); break;
      case "border-color": { const c = color(val, tokens); if (c) view.borderColor = c; break; }
      case "border-width": view.borderWidth = len(val); break;
      case "border-radius": view.borderRadius = radius(val); break;
      case "font-size": { const n = len(val); if (typeof n === "number") { fontSize = n; text.fontSize = n; } break; }
      case "font-weight": text.fontWeight = val; break;
      case "font-family": text.fontFamily = val.includes("mono") ? geistMono("400") : sans("400"); break;
      case "font-style": text.fontStyle = val; break;
      case "line-height": { const n = parseFloat(val); if (val.endsWith("px")) lineH = { px: n }; else if (Number.isFinite(n)) lineH = { ratio: n }; break; }
      case "text-align": text.textAlign = val; break;
      case "text-transform": text.textTransform = val; break;
      case "letter-spacing": { const n = len(val); if (typeof n === "number") text.letterSpacing = n; break; }
      case "text-decoration": text.textDecorationLine = val.includes("underline") ? "underline" : "none"; break;
      case "opacity": view.opacity = parseFloat(val); break;
      case "overflow": view.overflow = val === "hidden" ? "hidden" : "visible"; break;
      case "box-shadow": {
        // RN Web renders the boxShadow style string; resolve var() colors so the focus
        // rings and card elevation track the theme. (Native ignores it gracefully.)
        const resolved = val.replace(/var\(--([a-z-]+)\)/g, (_w, name: string) => (COLOR_TOKENS.has(name as keyof ColorTokens) ? tokenColor(tokens, name as keyof ColorTokens) : "transparent"));
        view.boxShadow = resolved;
        break;
      }
      default: break;
    }
  }
  // CSS flex defaults to row; RN defaults to column. Force row when a flex container
  // does not name its direction.
  if (isFlex && !hasDir && view.flexDirection === undefined) view.flexDirection = "row";
  return { view, text, grid, fontSize, lineH, pre };
}
function expand(val: string, prefix: "padding" | "margin", out: Record<string, unknown>) {
  const parts = val.split(/\s+/).map((p) => len(p) ?? 0);
  const [a, b, c, d] = parts;
  const T = a, R = b ?? a, B = c ?? a, L = d ?? b ?? a;
  out[`${prefix}Top`] = T; out[`${prefix}Right`] = R; out[`${prefix}Bottom`] = B; out[`${prefix}Left`] = L;
}
function border(val: string, side: string, out: Record<string, unknown>, tokens: ColorTokens) {
  const parts = val.split(/\s+/);
  const w = len(parts[0]);
  const c = color(parts.slice(2).join(" ") || parts[parts.length - 1], tokens);
  if (side) { out[`border${side}Width`] = typeof w === "number" ? w : 1; if (c) out[`border${side}Color`] = c; }
  else { out.borderWidth = typeof w === "number" ? w : 1; if (c) out.borderColor = c; }
}

// Parse `grid-template-columns` into per-child layout overrides.
function gridChildren(tmpl: string, count: number): Record<string, unknown>[] {
  const auto = tmpl.match(/repeat\(auto-fit,\s*minmax\(\s*([0-9.]+)px/);
  if (auto) { const basis = parseFloat(auto[1]); return Array.from({ length: count }, () => ({ flexGrow: 1, flexBasis: basis, minWidth: basis })); }
  // repeat(n,1fr): with more children than tracks (calendar weeks), a percentage
  // basis pins exactly n cells per row instead of wrapping by content; exact only
  // at zero gap, which is what a multi-row grid in this subset uses. A single row
  // of n children divides by flex so a declared gap stays accounted for.
  const rep = tmpl.match(/repeat\((\d+),\s*1fr\)/);
  if (rep) {
    const n = parseInt(rep[1], 10) || 1;
    if (count > n) return Array.from({ length: count }, () => ({ flexBasis: `${100 / n}%`, flexGrow: 1, minWidth: 0 }));
    return Array.from({ length: count }, () => ({ flex: 1, minWidth: 0 }));
  }
  const tracks = tmpl.trim().split(/\s+/);
  if (tracks.length > 1) return Array.from({ length: count }, (_, i) => {
    const t = tracks[i % tracks.length];
    if (t === "1fr" || t.endsWith("fr")) return { flex: parseFloat(t) || 1, minWidth: 0 };
    const l = len(t); return { width: l, flexShrink: 0 };
  });
  return Array.from({ length: count }, () => ({ flex: 1, minWidth: 0 }));
}

// ── Class styles (mirror the docs component CSS) ─────────
type Frag = { view?: Record<string, unknown>; text?: Record<string, unknown> };
function classStyle(cls: string, t: ColorTokens, dark: boolean): Frag {
  switch (cls) {
    case "section-card":
    case "card":
    case "stat-card":
      return { view: { borderWidth: 1, borderColor: t.border, borderRadius: 20, backgroundColor: t.card, ...(cls === "stat-card" ? { padding: 24 } : {}) } };
    case "card-header": return { view: { padding: 20, paddingBottom: 12, gap: 4 } };
    case "card-content": return { view: { padding: 20, paddingTop: 12 } };
    case "card-footer": return { view: { padding: 20, paddingTop: 12 } };
    case "section-card-header": return { view: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, paddingHorizontal: 20 } };
    case "section-card-title": return { text: { fontFamily: sans("600"), fontSize: 15, color: t.foreground } };
    case "section-card-body": return { view: { padding: 20 } };
    case "stat-card-header": return { view: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 } };
    case "stat-card-label": return { text: { fontFamily: sans("500"), fontSize: 12, textTransform: "uppercase", letterSpacing: 0.48, color: t["muted-foreground"] } };
    case "stat-card-value": return { text: { fontFamily: sans("600"), fontSize: 24, letterSpacing: -0.48, color: t.foreground } };
    case "stat-card-delta": return { view: { marginTop: 4 }, text: { fontFamily: sans("500"), fontSize: 12, color: t["muted-foreground"] } };
    case "positive": return { text: { color: dark ? "#4ade80" : "#16a34a" } };
    case "negative": return { text: { color: dark ? "#f87171" : "#dc2626" } };
    case "page-header": return { view: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 24 } };
    case "page-header-title": return {};
    case "page-header-text": return {};
    case "page-header-sub": return { text: { fontFamily: sans("400"), fontSize: 13, color: t["muted-foreground"] } };
    case "page-header-actions": return { view: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 0 } };
    case "field-label": return { text: { color: t["muted-foreground"] } };
    case "field-value": return { text: { color: t.foreground } };
    case "mono": return { text: { fontFamily: geistMono("400"), fontSize: 13 } };
    case "dt-wrap": return {};
    case "label": return { view: { marginBottom: 6 }, text: { fontFamily: sans("500"), fontSize: 13, color: t.foreground } };
    case "input":
      return { view: { borderWidth: 1, borderColor: t.input, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: t.card, minHeight: 48, justifyContent: "center" }, text: { fontSize: 14, color: t["muted-foreground"] } };
    case "checkbox": return { view: { width: 20, height: 20, borderRadius: 6, borderWidth: 1, borderColor: t.input, backgroundColor: t.card } };
    case "btn":
      return { view: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 11, paddingHorizontal: 18, borderRadius: 12, borderWidth: 1, borderColor: t.input, backgroundColor: t.card }, text: { fontFamily: sans("500"), fontSize: 14, color: t.foreground } };
    case "btn-primary": return { view: { backgroundColor: t.primary, borderColor: "transparent" }, text: { color: t["primary-foreground"] } };
    case "btn-outline": return { view: { backgroundColor: t.background, borderColor: t.border }, text: { color: t.foreground } };
    case "btn-ghost": return { view: { backgroundColor: "transparent", borderColor: "transparent" }, text: { color: t.foreground } };
    case "btn-destructive": return { view: { backgroundColor: t.destructive, borderColor: "transparent" }, text: { color: "#ffffff" } };
    case "btn-sm": return { view: { paddingVertical: 6, paddingHorizontal: 10, gap: 4 }, text: { fontSize: 12 } };
    case "btn-icon": return { view: { paddingVertical: 0, paddingHorizontal: 0, width: 44, height: 44 } };
    case "badge":
      return { view: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", paddingVertical: 4, paddingHorizontal: 10, borderRadius: 9999, backgroundColor: t.secondary }, text: { fontFamily: sans("500"), fontSize: 12, color: t["secondary-foreground"] } };
    case "badge-secondary": return { view: { backgroundColor: t.secondary }, text: { color: t["secondary-foreground"] } };
    case "badge-outline": return { view: { backgroundColor: "transparent", borderWidth: 1, borderColor: t.border }, text: { color: t.foreground } };
    case "status-badge":
      return { view: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 6, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 9999, backgroundColor: alpha(t["muted-foreground"], 0.12) }, text: { fontFamily: sans("500"), fontSize: 12, color: t["muted-foreground"] } };
    case "sb-success": return { view: { backgroundColor: dark ? "rgba(20,83,45,0.3)" : "#dcfce7" }, text: { color: dark ? "#4ade80" : "#166534" } };
    case "sb-warning": return { view: { backgroundColor: dark ? "rgba(113,63,18,0.3)" : "#fef9c3" }, text: { color: dark ? "#facc15" : "#854d0e" } };
    case "sb-error": return { view: { backgroundColor: dark ? "rgba(127,29,29,0.3)" : "#fee2e2" }, text: { color: dark ? "#f87171" : "#991b1b" } };
    case "sb-info": return { view: { backgroundColor: dark ? "rgba(30,58,138,0.3)" : "#dbeafe" }, text: { color: dark ? "#60a5fa" : "#1e40af" } };
    case "dot": return { view: { width: 6, height: 6, borderRadius: 9999, backgroundColor: "currentColor" } };
    case "avatar":
      return { view: { width: 32, height: 32, borderRadius: 9999, backgroundColor: t.muted, alignItems: "center", justifyContent: "center", overflow: "hidden" }, text: { fontFamily: sans("600"), fontSize: 12, color: t["muted-foreground"] } };
    case "avatar-sm": return { view: { width: 24, height: 24 }, text: { fontSize: 10 } };
    case "badge-default": return { view: { backgroundColor: t.primary }, text: { color: t["primary-foreground"] } };
    case "kbd":
      return { view: { borderWidth: 1, borderColor: t.border, borderRadius: 6, backgroundColor: t.muted, paddingHorizontal: 6, paddingVertical: 2, minWidth: 24, alignItems: "center" }, text: { fontFamily: geistMono("400"), fontSize: 11, color: t["muted-foreground"] } };
    case "code":
      return { view: { backgroundColor: alpha(t["muted-foreground"], 0.12), borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: "flex-start" }, text: { fontFamily: geistMono("400"), fontSize: 12, color: t.foreground } };
    case "sep": return { view: { height: 1, backgroundColor: t.border, marginVertical: 8 } };
    default: return {};
  }
}

// ── Render ───────────────────────────────────────────────
const HEADING: Record<string, Record<string, unknown>> = {
  h1: { fontSize: 22, fontFamily: sans("600") },
  h2: { fontSize: 24, fontFamily: sans("700") },
  h3: { fontSize: 18, fontFamily: sans("600") },
  h4: { fontSize: 16, fontFamily: sans("600") },
  strong: { fontFamily: sans("700") },
  b: { fontFamily: sans("700") },
  code: { fontFamily: geistMono("400"), fontSize: 12 },
};
const BOX_KEYS = ["backgroundColor", "borderWidth", "borderTopWidth", "borderBottomWidth", "borderLeftWidth", "borderRightWidth", "padding", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight", "width", "height", "borderRadius", "minHeight", "minWidth"];

function isTextOnly(node: Extract<Node, { type: "el" }>): boolean {
  return node.children.length > 0 && node.children.every((c) => c.type === "text" || (c.type === "el" && c.tag === "br"));
}
function joinText(node: Extract<Node, { type: "el" }>, pre = false): string {
  // pre: preserve raw whitespace + newlines (white-space:pre code blocks), trimming only
  // a single leading/trailing blank line. Otherwise collapse whitespace but honor <br> as
  // a hard line break (split into runs at each <br>, collapse each run, join with "\n").
  if (pre) {
    return node.children.map((c) => (c.type === "text" ? c.text : c.tag === "br" ? "\n" : "")).join("").replace(/^\n/, "").replace(/\n$/, "");
  }
  const runs: string[] = [];
  let cur = "";
  for (const c of node.children) {
    if (c.type === "el" && c.tag === "br") { runs.push(cur); cur = ""; }
    else if (c.type === "text") cur += c.text;
  }
  runs.push(cur);
  return runs.map((r) => r.replace(/\s+/g, " ").trim()).join("\n");
}
function finalizeText(text: Record<string, unknown>, inheritColor?: string): Record<string, unknown> {
  const out: Record<string, unknown> = { ...text };
  const fam = typeof out.fontFamily === "string" ? out.fontFamily : "";
  const mono = fam.startsWith("GeistMono");
  if (out.fontWeight) {
    const w = out.fontWeight === "bold" ? "700" : String(out.fontWeight);
    out.fontFamily = mono ? geistMono(["400", "500", "600"].includes(w) ? (w as "400") : "400") : sans(["400", "500", "600", "700", "800"].includes(w) ? (w as "400") : "600");
  } else if (!out.fontFamily) {
    out.fontFamily = sans("400");
  }
  delete out.fontWeight;
  if (out.color === "currentColor") out.color = inheritColor;
  if (!out.color && inheritColor) out.color = inheritColor;
  return out;
}

function SvgNode({ node, color: cur }: { node: Extract<Node, { type: "el" }>; color: string }) {
  const w = parseFloat(node.attrs.width || "0") || 20;
  const h = parseFloat(node.attrs.height || "0") || 20;
  const vb = node.attrs.viewbox || `0 0 ${w} ${h}`;
  const paint = (v?: string) => (!v || v === "currentColor" ? cur : v);
  return (
    <Svg width={w} height={h} viewBox={vb}>
      {node.children.filter((c): c is Extract<Node, { type: "el" }> => c.type === "el").map((c, i) => {
        const a = c.attrs;
        const common = { fill: a.fill === "none" ? "none" : paint(a.fill), stroke: a.stroke ? paint(a.stroke) : undefined, strokeWidth: a["stroke-width"] ? parseFloat(a["stroke-width"]) : undefined };
        if (c.tag === "path") return <Path key={i} d={a.d} {...common} />;
        if (c.tag === "circle") return <Circle key={i} cx={a.cx} cy={a.cy} r={a.r} {...common} />;
        if (c.tag === "rect") return <Rect key={i} x={a.x} y={a.y} width={a.width} height={a.height} rx={a.rx} {...common} />;
        if (c.tag === "line") return <Line key={i} x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} {...common} />;
        return null;
      })}
    </Svg>
  );
}

function renderNode(node: Node, key: string, inherited: Record<string, unknown>, t: ColorTokens, dark: boolean, narrow: boolean, override?: Record<string, unknown>): ReactNode {
  if (node.type === "text") {
    const txt = node.text.replace(/\s+/g, " ");
    if (!txt.trim()) return null;
    return <Text key={key} style={finalizeText({ ...inherited }) as object}>{txt}</Text>;
  }
  const { tag, attrs } = node;
  if (tag === "script" || tag === "style" || tag === "br" || tag === "option") return null;
  const inheritColor = (inherited.color as string) ?? t.foreground;
  if (tag === "svg") return <SvgNode key={key} node={node} color={inheritColor} />;

  const classes = (attrs.class || "").split(/\s+/).filter(Boolean);
  const cv: Record<string, unknown> = {};
  let ct: Record<string, unknown> = {};
  for (const c of classes) { const f = classStyle(c, t, dark); Object.assign(cv, f.view); Object.assign(ct, f.text); }
  const tagText = HEADING[tag] ?? {};
  const parsed = parseStyle(attrs.style || "", t);
  const view = { ...cv, ...parsed.view, ...override };
  // Resolve "currentColor" backgrounds (dot) against the inherited text color.
  if (view.backgroundColor === "currentColor") view.backgroundColor = inheritColor;

  const fontSize = (parsed.text.fontSize as number) ?? (ct.fontSize as number) ?? (tagText.fontSize as number) ?? (inherited.fontSize as number) ?? 13;
  let lineHeight: number | undefined;
  if (parsed.lineH) lineHeight = parsed.lineH.px ?? (parsed.lineH.ratio ? parsed.lineH.ratio * fontSize : undefined);
  const text: Record<string, unknown> = { ...inherited, ...tagText, ...ct, ...parsed.text, fontSize };
  if (lineHeight) text.lineHeight = lineHeight;

  // Form controls.
  if (tag === "input") {
    if (attrs.type === "checkbox" || attrs.type === "radio") return <View key={key} style={{ ...classStyle("checkbox", t, dark).view, ...parsed.view, borderRadius: attrs.type === "radio" ? 9999 : 6 } as object} />;
    const ph = attrs.placeholder || attrs.value || "";
    return (
      <View key={key} style={{ ...classStyle("input", t, dark).view, ...parsed.view } as object}>
        <Text style={finalizeText({ fontSize: 13, color: attrs.value ? t.foreground : t["muted-foreground"] }) as object} numberOfLines={1}>{ph}</Text>
      </View>
    );
  }
  if (tag === "select") {
    const first = node.children.find((c): c is Extract<Node, { type: "el" }> => c.type === "el" && c.tag === "option");
    const label = first ? joinText(first) : "";
    return (
      <View key={key} style={{ ...classStyle("input", t, dark).view, flexDirection: "row", alignItems: "center", justifyContent: "space-between", ...parsed.view } as object}>
        <Text style={finalizeText({ fontSize: 13, color: t.foreground }) as object} numberOfLines={1}>{label}</Text>
        <Text style={{ color: t["muted-foreground"], fontSize: 11 }}>▾</Text>
      </View>
    );
  }
  if (tag === "img") return <View key={key} style={{ backgroundColor: t.muted, borderRadius: (view.borderRadius as number) ?? 12, width: (view.width as number) ?? 40, height: (view.height as number) ?? 40, ...parsed.view } as object} />;
  // A toggle switch (a span.switch with a .switch-slider): render the track + knob, on by default.
  if (classes.includes("switch")) {
    const findInput = (n: Extract<Node, { type: "el" }>): Extract<Node, { type: "el" }> | null => {
      for (const c of n.children) {
        if (c.type === "el") { if (c.tag === "input") return c; const f = findInput(c); if (f) return f; }
      }
      return null;
    };
    const input = findInput(node);
    const on = input ? "checked" in input.attrs : true;
    return (
      <View key={key} style={{ width: 44, height: 24, borderRadius: 9999, backgroundColor: on ? t.primary : t.input, padding: 2, justifyContent: "center" }}>
        <View style={{ width: 20, height: 20, borderRadius: 9999, backgroundColor: "#ffffff", alignSelf: on ? "flex-end" : "flex-start" }} />
      </View>
    );
  }
  if (tag === "table") return <TableEl key={key} node={node} t={t} dark={dark} narrow={narrow} inherited={text} />;

  // Text-only node.
  if (isTextOnly(node)) {
    const hasBox = BOX_KEYS.some((k) => view[k] !== undefined) || classes.some((c) => ["kbd", "code", "badge", "btn", "avatar", "input", "status-badge"].includes(c));
    const label = joinText(node, parsed.pre);
    const textEl = <Text style={finalizeText(text, inheritColor) as object}>{label}</Text>;
    if (!hasBox) return <Text key={key} style={finalizeText(text, inheritColor) as object}>{label}</Text>;
    return <View key={key} style={view as object}>{textEl}</View>;
  }

  // sep with a centered label (data-content).
  if (classes.includes("sep") && attrs["data-content"]) {
    return (
      <View key={key} style={{ flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 8 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
        <Text style={{ fontFamily: sans("400"), fontSize: 11, color: t["muted-foreground"] }}>{attrs["data-content"]}</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
      </View>
    );
  }

  // Container with element children. `.tpl-grid` marks the page-level multi-column
  // grids (split-screen, sidebar + form, stat strips) that collapse to a single
  // stacked column on phone widths, mirroring the old web docs' max-width media
  // query; other grids (calendar weeks, auto-fit card grids) keep their tracks.
  const els = node.children.filter((c) => !(c.type === "el" && (c.tag === "br")));
  const stack = !!parsed.grid && narrow && classes.includes("tpl-grid");
  const overrides = parsed.grid && !stack ? gridChildren(attrs["data-grid"] || gridTemplate(attrs.style || ""), els.length) : undefined;
  // CSS grid defaults to zero gap; grids that want a gutter declare one inline.
  // alignContent stretch mirrors grid's default row stretch (RN wrap rows pack
  // lines at the start instead, leaving dead space under a min-height grid).
  if (stack) view.flexDirection = "column";
  else if (parsed.grid) { view.flexDirection = "row"; view.flexWrap = "wrap"; if (view.alignContent === undefined) view.alignContent = "stretch"; }
  const kids = els.map((c, i) => renderNode(c, `${key}.${i}`, text, t, dark, narrow, overrides?.[i]));
  // `.tpl-scroll` marks containers whose content keeps a fixed min width (the
  // calendar's 7-track week grids): on phone widths they pan horizontally inside
  // their own frame, like the old web docs' overflow-x:auto preview stage. The
  // container's declared min-width becomes the pan area's definite width so
  // percentage-based grid tracks resolve against it.
  if (narrow && classes.includes("tpl-scroll")) {
    const { minWidth, ...frame } = view;
    return (
      <View key={key} style={frame as object}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
          <View style={{ flexGrow: 1, width: typeof minWidth === "number" ? minWidth : undefined }}>{kids}</View>
        </ScrollView>
      </View>
    );
  }
  return <View key={key} style={view as object}>{kids}</View>;
}
function gridTemplate(style: string): string {
  const m = style.match(/grid-template-columns:\s*([^;]+)/);
  return m ? m[1] : "1fr 1fr";
}

function TableEl({ node, t, dark, narrow, inherited }: { node: Extract<Node, { type: "el" }>; t: ColorTokens; dark: boolean; narrow: boolean; inherited: Record<string, unknown> }) {
  const rows: Extract<Node, { type: "el" }>[] = [];
  const walk = (n: Extract<Node, { type: "el" }>) => n.children.forEach((c) => { if (c.type === "el") { if (c.tag === "tr") rows.push(c); else walk(c); } });
  walk(node);
  // Fixed column widths declared on the header row (e.g. a 40px checkbox column)
  // bind every row, like CSS table column sizing; the rest share the leftover.
  const headCells = rows[0]?.children.filter((c): c is Extract<Node, { type: "el" }> => c.type === "el" && (c.tag === "td" || c.tag === "th")) ?? [];
  const colWidths = headCells.map((c) => { const w = parseStyle(c.attrs.style || "", t).view.width; return typeof w === "number" ? w : undefined; });
  const table = (
    <View style={{ borderWidth: 1, borderColor: t.border, borderRadius: 20, overflow: "hidden", ...(narrow ? { minWidth: Math.max(headCells.length, 1) * 110, flexGrow: 1 } : {}) }}>
      {rows.map((tr, r) => {
        const cells = tr.children.filter((c): c is Extract<Node, { type: "el" }> => c.type === "el" && (c.tag === "td" || c.tag === "th"));
        const head = cells.some((c) => c.tag === "th");
        return (
          <View key={r} style={{ flexDirection: "row", backgroundColor: head ? t.muted : "transparent", borderTopWidth: r === 0 ? 0 : 1, borderColor: t.border }}>
            {cells.map((cell, i) => (
              <View key={i} style={{ ...(colWidths[i] !== undefined ? { width: colWidths[i], flexShrink: 0 } : { flex: 1 }), paddingHorizontal: 12, paddingVertical: 9 }}>
                {isTextOnly(cell)
                  ? <Text style={finalizeText({ ...inherited, fontSize: head ? 11 : 12, fontFamily: head ? sans("600") : sans("400"), color: head ? t.foreground : (i === 0 ? t.foreground : t["muted-foreground"]) }) as object}>{joinText(cell)}</Text>
                  : renderNode(cell, `${r}.${i}`, { ...inherited, fontSize: 12 }, t, dark, narrow)}
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
  // On phone widths an over-wide table pans horizontally inside the stage,
  // mirroring the old web docs' overflow-x:auto preview stage.
  if (!narrow) return table;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
      {table}
    </ScrollView>
  );
}

// The public renderer: parse the mockup html once and render it as RN.
export function Mockup({ html }: { html: string }) {
  const { tokens, dark } = useTheme();
  // Phone-width flag for the `.tpl-grid` single-column collapse (desktop-first,
  // applies at the sm breakpoint and below).
  const narrow = useResponsive({ base: false, sm: true });
  const nodes = useMemo(() => parseHtml(html), [html]);
  const inherited = { fontSize: 13, color: tokens.foreground, fontFamily: sans("400") };
  return <View style={{ gap: 0 }}>{nodes.map((n, i) => renderNode(n, String(i), inherited, tokens, dark, narrow))}</View>;
}
