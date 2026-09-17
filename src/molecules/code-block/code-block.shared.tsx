import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { type GestureResponderEvent, StyleSheet } from "react-native";
import { useHorizontalScrollFocus } from "../../style/use-scroll-focus.js";
import { View, Pressable, Text, ScrollView, useTheme, useControllableState, surfaceRipple, pressDim, RippleClip, cornerRadii, splitElevation, devWarn, useMinTargetSlop, type ColorTokens, type StyleProp, type ViewStyle, type TextStyle, type TouchTargetSkin, type LayoutStyle, GlassSurface, isGlass, withInnerFill } from "../../style/index.js";
import { Icon } from "../../atoms/icon/icon.js";
import { MONO, type Variant } from "./code-block.styles.js";
import { tokenize, syntaxColor, type CodeToken } from "./tokenize.js";

// Shared CodeBlock shell. The structure (the muted code surface and its terminal /
// numbered / inline variants, the header/tab strip, the copy affordance, the
// highlight/diff/collapse row machinery), the boolean-prop axes, the variant
// precedence, and the tokenize/line-splitting logic live here once; a platform
// file supplies only its skin (shape, padding, type) and calls createCodeBlock.
//
// CodeBlock is a "Shared" platform treatment: neither iOS nor Android ships a code
// display control (apps roll their own monospaced view), and the web reference is the
// standard `pre`/`code` HTML pattern. So there is ONE look on every platform — the
// iOS and Android skins reference the same values as the web skin (see
// code-block.styles). The skin contract still exists so the file pattern matches the
// rest of the kit, but it carries no fabricated per-OS difference.
//
// Boolean-prop API: one boolean per option, grouped by axis, first-match precedence
// within an axis (mirrors Badge's toneOf). Axes:
//
// - Variant (pick one; default is the plain block):
//     `terminal` > `numbered` > `inline` > plain.
//   - plain: the muted code surface, padded, monospace, syntax-highlighted.
//   - terminal: a dark window with a chrome bar (traffic-light dots + a label)
//     over a dark body, for shell transcripts. Lines starting with the prompt
//     marker ("$ " by default) render as commands; when any line carries the
//     marker, the remaining lines render as dimmed output.
//   - numbered: the plain surface with a pinned left gutter of right-aligned
//     line numbers (offset by `startLine`), one per line.
//   - inline: a short, single token rendered as an inline pill (rounded bg-muted
//     chip), for code mentioned mid-sentence.
// - Density (pick one; default is the comfortable ramp): `compact` tightens the
//   type ramp (13/20) and padding for dense contexts such as docs panes.
// - Orthogonal booleans that stack: `copy` (clipboard chip), `wrap` (soft-wrap
//   long lines instead of scrolling), `diff` (+/- line tinting), `collapsible`
//   (fold long blocks behind an expander), `attached` (square the top edge to
//   sit flush under an adjoining bar). The inline variant ignores all of them.
//
// Long lines scroll horizontally by default (never truncate); `wrap` trades the
// scroller for soft-wrapping. Syntax highlighting is driven by `language` via the
// in-kit tokenizer (see ./tokenize) — unknown languages render monochrome.
//
// RN has no font-mono utility, so the monospace face is requested via an inline
// `style={MONO}` on each code Text (the same approach Badge's `mono` uses).

// The contract a platform skin fulfills. Every piece is a self-contained style
// fragment (or a token-driven function) for one part of the surface; the shell wires
// them onto the structure. For the "Shared" treatment all three platform skins point
// at the same object, so these are the single source of truth for the one look.
export interface CodeBlockSkin extends TouchTargetSkin {
  /** Shared code type (size / line-height) used by code, gutter, and terminal text. */
  codeType: TextStyle;
  /** The tightened compact ramp. */
  codeTypeCompact: TextStyle;
  /** Code foreground color (token-driven so it follows light/dark). */
  codeText: (t: ColorTokens) => TextStyle;
  /** The muted, bordered, rounded code surface (plain + numbered base). */
  surface: (t: ColorTokens) => ViewStyle;
  /** Squares the top edge for `attached` blocks (flush under an adjoining bar). */
  attachedTop: ViewStyle;
  /** Vertical padding of the rows column, per density. */
  bodyPad: (compact: boolean) => ViewStyle;
  /** One code row: direction + horizontal insets, per density and gutter presence. */
  rowPad: (compact: boolean, gutter: boolean) => ViewStyle;
  /** Header strip carrying the filename/language label or the tab strip. */
  headerBar: (t: ColorTokens) => ViewStyle;
  /** Header adjustments when it hosts the tab strip. */
  headerBarWithTabs: ViewStyle;
  /** Header label type (the file/language name). */
  headerLabel: (t: ColorTokens) => TextStyle;
  /** The trailing language badge (shown when both filename and language are set). */
  headerBadge: (t: ColorTokens) => TextStyle;
  /** Squares off the surface's top corners when a header bar sits above it. */
  surfaceUnderHeader: ViewStyle;
  /** The tab row hosted by the header bar / terminal chrome. */
  tabStrip: ViewStyle;
  /** One tab (underline when active; `dark` styles the terminal incarnation). */
  tabItem: (t: ColorTokens, active: boolean, dark: boolean) => ViewStyle;
  /** One tab's label type. */
  tabLabel: (t: ColorTokens, active: boolean, dark: boolean) => TextStyle;
  /** The soft primary wash behind a `highlightLines` row. */
  highlightRow: (t: ColorTokens, dark: boolean) => ViewStyle;
  /** The green/red wash behind an added/removed diff row. */
  diffRow: (kind: "add" | "del", dark: boolean) => ViewStyle;
  /** The +/- marker glyph type (non-selectable). */
  diffMarker: (kind: "add" | "del" | "ctx", t: ColorTokens, dark: boolean) => TextStyle;
  /** The pinned line-number column, per density. */
  gutterCol: (compact: boolean) => ViewStyle;
  /** One gutter row (right-aligned number), per density. */
  gutterRow: (compact: boolean) => ViewStyle;
  /** Dimmed line-number color. */
  gutterText: (t: ColorTokens) => TextStyle;
  /** The expander bar under a collapsed block. */
  expanderBar: (t: ColorTokens) => ViewStyle;
  /** The expander label type. */
  expanderLabel: (t: ColorTokens) => TextStyle;
  /** Terminal outer window: shape, border, shadow/elevation, clipping. */
  terminalOuter: (t: ColorTokens) => ViewStyle;
  /** Terminal chrome bar (dots + label / tabs / copy chip). */
  terminalChrome: ViewStyle;
  /** Chrome adjustments when it hosts the tab strip. */
  terminalChromeWithTabs: ViewStyle;
  /** A single traffic-light dot, keyed by hue. */
  trafficDot: (hue: "red" | "amber" | "green") => ViewStyle;
  /** Terminal chrome label type. */
  terminalLabel: TextStyle;
  /** Terminal body container (dark fill + vertical padding), per density. */
  terminalBody: (compact: boolean) => ViewStyle;
  /** The non-selectable prompt glyph. */
  terminalPrompt: TextStyle;
  /** The command line text. */
  terminalLine: TextStyle;
  /** A dimmed transcript output line. */
  terminalOutput: TextStyle;
  /** The inline pill (short mid-sentence token). */
  inlineBox: (t: ColorTokens) => ViewStyle;
  /** Inline label type (its own smaller size). */
  inlineType: TextStyle;
  /** The copy chip shape/fill (`dark` picks the terminal chip; `floating` adds its shadow). */
  copyButton: (t: ColorTokens, dark: boolean, floating: boolean) => ViewStyle;
  /** The copy chip label. */
  copyText: (t: ColorTokens, dark: boolean) => TextStyle;
  /** Press dim opacity for pressable chrome (iOS/web feedback). */
  copyPressedOpacity: number;
}

/** One snippet in a `tabs` group: a labeled code alternative (npm / yarn / bun…). */
export interface CodeBlockTab {
  /** The tab's visible label. */
  label: string;
  /** The code this tab shows. */
  code: string;
  /** Per-tab grammar; falls back to the block-level `language`. */
  language?: string;
  /** Per-tab filename; falls back to the block-level `filename`. */
  filename?: string;
}

export interface CodeBlockProps {
  /** The code to render. Newlines are preserved (RN Text honors "\n"). */
  code?: string;
  /**
   * Optional filename label shown in a header bar above the surface. Honored by
   * the plain and numbered variants (and the terminal chrome label); the inline
   * pill has no header. When both are set, `filename` takes the header label and
   * `language` renders as a trailing badge.
   */
  filename?: string;
  /**
   * The snippet's language. Drives syntax highlighting (ts/tsx/js/jsx, json,
   * bash/sh, css, html, python — anything else renders monochrome) and the
   * header/terminal label when no `filename` is given.
   */
  language?: string;

  // Variant (pick one; default is the plain block).
  terminal?: boolean;
  numbered?: boolean;
  inline?: boolean;

  // Density (pick one; default is the comfortable ramp).
  compact?: boolean;

  // Orthogonal modifiers.
  /** Show a copy affordance (header-hosted when a header/chrome exists, else pinned top-right). */
  copy?: boolean;
  /** Soft-wrap long lines instead of scrolling them horizontally. An overflowing unwrapped block is a keyboard tab stop; arrow keys use the platform's normal scrolling. */
  wrap?: boolean;
  /**
   * Render the code as a unified diff: the first column of every line is the
   * marker ("+" added, "-" removed, anything else context). Added/removed rows
   * tint green/red, markers stay out of the selection, and the copy chip yields
   * the post-change code (context + added lines, markers stripped).
   */
  diff?: boolean;
  /** Square the top edge (no top radius/border) to sit flush under an adjoining bar. */
  attached?: boolean;

  /**
   * Emphasize lines: entries are 1-based line numbers or "start-end" ranges
   * (e.g. `[2, "5-7"]`). Numbers refer to the displayed numbering, so they
   * respect `startLine`. Plain and numbered variants only.
   */
  highlightLines?: ReadonlyArray<number | string>;
  /** First displayed line number for the numbered variant (default 1). */
  startLine?: number;

  /** Fold long blocks behind a "Show all" expander (plain + numbered variants). */
  collapsible?: boolean;
  /** How many lines a collapsed block shows (default 8). */
  collapsedLines?: number;
  /** Controlled expanded state for `collapsible`. */
  expanded?: boolean;
  /** Uncontrolled initial expanded state (default false). */
  defaultExpanded?: boolean;
  /** Called when the expander toggles (fires in both modes). */
  onExpandedChange?: (expanded: boolean) => void;

  /**
   * Labeled code alternatives rendered as a tab strip in the header (or the
   * terminal chrome) — the classic npm/yarn/bun switcher. Each tab supplies its
   * own code and optional language/filename.
   */
  tabs?: ReadonlyArray<CodeBlockTab>;
  /** Controlled active tab index. */
  active?: number;
  /** Uncontrolled initial tab index (default 0). */
  defaultActive?: number;
  /** Called with the next tab index when a tab is selected (fires in both modes). */
  onTabChange?: (index: number) => void;

  /** The terminal prompt marker (default "$"). Lines starting with it render as commands. */
  prompt?: string;

  /**
   * Called when the copy affordance is pressed, with the copied text. The chip
   * also writes the clipboard itself (navigator.clipboard on web, the optional
   * expo-clipboard peer on native), so this is for side effects, not plumbing.
   */
  onCopy?: (code: string, event: GestureResponderEvent) => void;

  /** E2E hook forwarded to the root element. */
  testID?: string;

  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

// Variant precedence when more than one is passed: first match wins.
function variantOf(p: CodeBlockProps): Variant {
  if (p.terminal) return "terminal";
  if (p.numbered) return "numbered";
  if (p.inline) return "inline";
  return "plain";
}

const DEFAULT_CODE = 'const theme = getTheme();\nsetTheme(theme === "dark" ? "light" : "dark");';

// --- clipboard backends ------------------------------------------------------

// expo-clipboard is an OPTIONAL peer: consumers who never render a copy chip (or
// only target the web, where navigator.clipboard covers it) skip the install.
// Guarded literal require, mirroring qrcode.shared.tsx.
declare const require: (id: string) => unknown;
interface ExpoClipboardModule {
  setStringAsync?: (text: string) => Promise<unknown>;
}
let ExpoClipboard: ExpoClipboardModule | undefined;
try {
  // Directly in the try block: an intervening `if` makes Metro treat this as
  // a REQUIRED dependency. See src/organisms/backdrop/skia-runtime.ts.
  ExpoClipboard = require("expo-clipboard") as ExpoClipboardModule;
} catch {
  ExpoClipboard = undefined;
}

// Write `text` to the platform clipboard; returns whether a backend handled it.
function writeClipboard(text: string): boolean {
  if (ExpoClipboard?.setStringAsync) {
    void ExpoClipboard.setStringAsync(text);
    return true;
  }
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(text);
    return true;
  }
  return false;
}

// --- pure helpers ------------------------------------------------------------

interface DiffLine {
  kind: "add" | "del" | "ctx";
  text: string;
}

// Unified-diff column parse: the FIRST character of each line is the marker
// ("+", "-", or a space for context; a line with no marker column is context
// verbatim), and the rest of the line is the content.
function parseDiffLine(line: string): DiffLine {
  const c = line[0];
  if (c === "+") return { kind: "add", text: line.slice(1) };
  if (c === "-") return { kind: "del", text: line.slice(1) };
  if (c === " ") return { kind: "ctx", text: line.slice(1) };
  return { kind: "ctx", text: line };
}

const DIFF_GLYPH: Record<DiffLine["kind"], string> = { add: "+", del: "-", ctx: " " };

// Expand a highlightLines spec into the set of displayed line numbers.
function parseHighlightLines(spec: ReadonlyArray<number | string> | undefined): Set<number> {
  const out = new Set<number>();
  if (!spec) return out;
  for (const entry of spec) {
    if (typeof entry === "number") {
      out.add(entry);
      continue;
    }
    const range = /^(\d+)\s*-\s*(\d+)$/.exec(entry.trim());
    if (range) {
      const a = Number(range[1]);
      const b = Number(range[2]);
      for (let n = Math.min(a, b); n <= Math.max(a, b); n++) out.add(n);
      continue;
    }
    const single = /^(\d+)$/.exec(entry.trim());
    if (single) {
      out.add(Number(single[1]));
      continue;
    }
    devWarn(
      true,
      `[canvas] <CodeBlock />: unrecognized highlightLines entry "${entry}" (use a line number or a "start-end" range); it is ignored.`,
    );
  }
  return out;
}

// --- local layout fragments --------------------------------------------------

// relative wrapper for the absolutely-positioned copy chip.
const RELATIVE: ViewStyle = { position: "relative" };
// Fill the remaining row width. Longhands on purpose: RNW compiles `flex: 1`
// shorthand to a 0% basis that collapses inside some containers.
const FLEX_FILL: ViewStyle = { flexGrow: 1, flexShrink: 1, flexBasis: "0%" };
// Horizontal-scroll content: grow to at least the viewport width, but NEVER
// shrink/zero-base — that would clamp the content to the scroller's width and
// soft-wrap long lines instead of letting them extend and scroll (seen on iOS).
const GROW: ViewStyle = { flexGrow: 1 };
// The floating copy chip's anchor (measured so code rows reserve an end inset).
const FLOATING_CHIP: ViewStyle = { position: "absolute", top: 8, end: 8, zIndex: 10 };
// The header's trailing cluster (badge + copy chip).
const HEADER_END: ViewStyle = { flexDirection: "row", alignItems: "center", gap: 8, marginStart: "auto" };
// The chrome/tab strip wrapper next to the traffic dots.
const CHROME_TABS: ViewStyle = { marginStart: 8, flexDirection: "row", flexShrink: 1 };
const ROW: ViewStyle = { flexDirection: "row" };
const WRAP_TEXT: TextStyle = { flexShrink: 1 };

export function createCodeBlock(skin: CodeBlockSkin) {
  // One tokenized code line as nested spans. Kind "text" spans inherit the base
  // color (so the terminal's fixed-dark body keeps its own foreground), and every
  // other kind gets its theme-aware syntax color.
  function LineSpans({
    spans,
    base,
    dark,
  }: {
    spans: CodeToken[];
    base: StyleProp<TextStyle>;
    dark: boolean;
  }) {
    const { tokens } = useTheme();
    return (
      <Text selectable style={base}>
        {spans.map((s, i) =>
          s.kind === "text" ? (
            s.text
          ) : (
            <Text key={i} style={{ color: syntaxColor(s.kind, tokens, dark) }}>
              {s.text}
            </Text>
          ),
        )}
      </Text>
    );
  }

  // The copy chip. Positioning belongs to the caller (header slot or the
  // measured floating wrapper); the chip itself is just the bordered pill.
  function CopyChip({
    dark,
    floating,
    copied,
    onPress,
  }: {
    dark: boolean;
    floating: boolean;
    copied: boolean;
    onPress: (event: GestureResponderEvent) => void;
  }) {
    const { tokens } = useTheme();
    // The bounded ripple is clipped to the rounded chip by the RippleClip parent
    // (Android only; a same-node overflow:"hidden" cannot clip it — see
    // src/style/ripple-clip). The chip's Android `elevation` moves to the wrapper
    // (whose own shadow is unclipped by its child-overflow); iOS `shadow*` stays
    // on the inner Pressable.
    const { elevation, ...box } = StyleSheet.flatten(
      skin.copyButton(tokens, dark, floating),
    ) as ViewStyle & { elevation?: number };
    const { parent: elevParent } = splitElevation({ elevation });
    // The copy chip is a 26pt pill of label plus glyph: deliberately quiet chrome on
    // a code surface, and under both native minimums.
    const target = useMinTargetSlop(skin.minTarget);
    return (
      <RippleClip shape={cornerRadii(box)} style={elevParent}>
        <Pressable
          {...target}
          android_ripple={surfaceRipple(tokens)}
          style={({ pressed }) => [box, pressDim(pressed, skin.copyPressedOpacity)]}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={copied ? "Copied" : "Copy code"}
        >
          {copied ? (
            <Icon check size={12} decorative {...(dark ? { primaryForeground: true } : { success: true })} />
          ) : (
            <Icon copy size={12} decorative {...(dark ? { primaryForeground: true } : { muted: true })} />
          )}
          <Text style={skin.copyText(tokens, dark)}>{copied ? "Copied" : "Copy"}</Text>
        </Pressable>
      </RippleClip>
    );
  }

  // The tab strip hosted by the header bar or the terminal chrome.
  function TabStrip({
    tabs,
    active,
    onSelect,
    dark,
  }: {
    tabs: ReadonlyArray<CodeBlockTab>;
    active: number;
    onSelect: (index: number) => void;
    dark: boolean;
  }) {
    const { tokens } = useTheme();
    return (
      <View style={skin.tabStrip} accessibilityRole="tablist">
        {tabs.map((tab, i) => {
          const isActive = i === active;
          return (
            <Pressable
              key={`${tab.label}-${i}`}
              onPress={() => onSelect(i)}
              accessibilityRole="tab"
              // Dual alias: RNW forwards neither accessibilityState nor its
              // aria mapping, so both are set (see test/a11y-state.test.tsx).
              accessibilityState={{ selected: isActive }}
              aria-selected={isActive}
              style={({ pressed }) => [
                skin.tabItem(tokens, isActive, dark),
                pressDim(pressed, skin.copyPressedOpacity),
              ]}
            >
              <Text style={[skin.tabLabel(tokens, isActive, dark), MONO]} numberOfLines={1}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return function CodeBlock(props: CodeBlockProps) {
    const {
      copy,
      wrap,
      diff,
      onCopy,
      testID,
      style,
      highlightLines,
      startLine = 1,
      prompt = "$",
      collapsible,
      collapsedLines = 8,
      compact = false,
      attached = false,
    } = props;
    const variant = variantOf(props);
    const scrollFocus = useHorizontalScrollFocus();
    const theme = useMaterialTheme({ static: true });
    const { tokens, dark } = theme;

    // Tabs: the active tab supplies code/language/filename, falling back to the
    // block-level props. Raw props go into the hook (controlled iff provided).
    const tabList = props.tabs && props.tabs.length > 0 ? props.tabs : undefined;
    const [activeRaw, setActive] = useControllableState<number>(
      props.active,
      props.defaultActive ?? 0,
      props.onTabChange,
    );
    const active = tabList ? Math.min(Math.max(activeRaw, 0), tabList.length - 1) : 0;
    const tab = tabList?.[active];

    const code = (tab?.code ?? props.code ?? DEFAULT_CODE).replace(/\r\n/g, "\n");
    const language = tab?.language ?? props.language;
    const filename = tab?.filename ?? props.filename;

    const [expanded, setExpanded] = useControllableState<boolean>(
      props.expanded,
      props.defaultExpanded ?? false,
      props.onExpandedChange,
    );

    // Copied feedback: flips the chip for a beat after a successful copy.
    const [copied, setCopied] = useState(false);
    const copiedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    useEffect(
      () => () => {
        if (copiedTimer.current) clearTimeout(copiedTimer.current);
      },
      [],
    );

    // The floating chip's measured width, reserved as an end inset so long first
    // lines never render (or scroll) underneath it.
    const [copyInset, setCopyInset] = useState(0);

    // Tokenized body for the plain/numbered variants (diff strips markers first
    // so highlighting sees clean code).
    const parsed = useMemo(() => {
      const rawLines = code.split("\n");
      const diffLines = diff ? rawLines.map(parseDiffLine) : undefined;
      const contentLines = diffLines ? diffLines.map((d) => d.text) : rawLines;
      const tokenLines = tokenize(contentLines.join("\n"), language);
      return { diffLines, contentLines, tokenLines };
    }, [code, language, diff]);

    // Terminal rows: transcript mode (any line carrying the prompt marker) marks
    // the rest as dimmed output; otherwise every line is a command.
    const term = useMemo(() => {
      if (variant !== "terminal") return undefined;
      const rawLines = code.split("\n");
      const marker = `${prompt} `;
      const transcript = rawLines.some((l) => l.startsWith(marker));
      const rows = rawLines.map((line) => {
        if (transcript && !line.startsWith(marker)) {
          return { kind: "out" as const, text: line, spans: [] as CodeToken[] };
        }
        const text = transcript ? line.slice(marker.length) : line;
        return { kind: "cmd" as const, text, spans: tokenize(text, language ?? "bash")[0] ?? [] };
      });
      return { transcript, rows };
    }, [variant, code, prompt, language]);

    // What the copy chip yields: the runnable result, never chrome. A transcript
    // copies its commands (prompts stripped); a diff copies the post-change code
    // (context + added lines, markers stripped); everything else copies verbatim.
    const copyPayload = useMemo(() => {
      if (term?.transcript) {
        return term.rows.filter((r) => r.kind === "cmd").map((r) => r.text).join("\n");
      }
      if (parsed.diffLines) {
        return parsed.diffLines.filter((d) => d.kind !== "del").map((d) => d.text).join("\n");
      }
      return code;
    }, [term, parsed, code]);

    function handleCopy(event: GestureResponderEvent) {
      onCopy?.(copyPayload, event);
      const wrote = writeClipboard(copyPayload);
      devWarn(
        !wrote && !onCopy,
        "[canvas] <CodeBlock />: no clipboard backend is available (install the optional expo-clipboard peer for native copy) and no onCopy handler is set; the copy chip does nothing.",
      );
      if (wrote || onCopy) {
        setCopied(true);
        if (copiedTimer.current) clearTimeout(copiedTimer.current);
        copiedTimer.current = setTimeout(() => setCopied(false), 1600);
      }
    }

    const highlights = useMemo(() => parseHighlightLines(highlightLines), [highlightLines]);

    const type = compact ? skin.codeTypeCompact : skin.codeType;
    // Empty lines render an empty Text; the row keeps its height via minHeight.
    const rowMin: ViewStyle = { minHeight: type.lineHeight };

    // Inline: a short token rendered as an inline pill. No header, copy, or wrap.
    if (variant === "inline") {
      const inlineSpans = parsed.tokenLines.flatMap((line, i) =>
        i > 0 ? [{ text: "\n", kind: "text" as const }, ...line] : line,
      );
      return (
        <View testID={testID} style={[skin.inlineBox(tokens), style]}>
          <LineSpans
            spans={inlineSpans}
            base={[skin.codeText(tokens), MONO, skin.inlineType]}
            dark={dark}
          />
        </View>
      );
    }

    // Terminal: a dark window with a chrome bar over a dark body. The chrome
    // hosts the label (or the tab strip) and the copy chip; command lines get a
    // non-selectable prompt, transcript output lines render dimmed.
    if (variant === "terminal" && term) {
      const label = language ?? filename ?? "bash";
      const rows = (
        <View style={[GROW, skin.terminalBody(compact)]}>
          {term.rows.map((row, i) => (
            <View key={i} style={[skin.rowPad(compact, false), rowMin]}>
              {row.kind === "cmd" ? (
                <>
                  <Text style={[type, MONO, skin.terminalPrompt]}>{`${prompt} `}</Text>
                  <LineSpans
                    spans={row.spans}
                    base={[type, MONO, skin.terminalLine, wrap ? WRAP_TEXT : null]}
                    dark
                  />
                </>
              ) : (
                <Text selectable style={[type, MONO, skin.terminalOutput, wrap ? WRAP_TEXT : null]}>
                  {row.text}
                </Text>
              )}
            </View>
          ))}
        </View>
      );
      return (
        <View testID={testID} style={[skin.terminalOuter(tokens), attached ? skin.attachedTop : null, style]}>
          {/* Chrome bar: three traffic-light dots, the label or tab strip, the copy chip. */}
          <View style={[skin.terminalChrome, tabList ? skin.terminalChromeWithTabs : null]}>
            <View style={skin.trafficDot("red")} />
            <View style={skin.trafficDot("amber")} />
            <View style={skin.trafficDot("green")} />
            {tabList ? (
              <View style={CHROME_TABS}>
                <TabStrip tabs={tabList} active={active} onSelect={setActive} dark />
              </View>
            ) : (
              <Text style={[skin.terminalLabel, MONO]}>{label}</Text>
            )}
            {copy ? (
              <View style={HEADER_END}>
                <CopyChip dark floating={false} copied={copied} onPress={handleCopy} />
              </View>
            ) : null}
          </View>
          {wrap ? (
            rows
          ) : (
            <ScrollView {...scrollFocus} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={GROW}>
              {rows}
            </ScrollView>
          )}
        </View>
      );
    }

    // Plain / numbered: the muted surface. Numbered pins a line-number gutter
    // outside the horizontal scroller so digits never scroll; rows carry the
    // full-bleed highlight/diff tints.
    const gutter = variant === "numbered";
    const { diffLines, contentLines, tokenLines } = parsed;
    const total = contentLines.length;
    const folds = !!collapsible && total > collapsedLines;
    const visibleCount = folds && !expanded ? collapsedLines : total;

    // The header exists when there is a tab strip or a filename/language label.
    const headerLeft = filename ?? language;
    const hasHeader = !!(tabList || headerLeft);
    // The chip floats over the code only when no header can host it.
    const floatingCopy = !!copy && !hasHeader;

    const rowTint = (i: number): ViewStyle | null => {
      if (highlights.has(startLine + i)) return skin.highlightRow(tokens, dark);
      const kind = diffLines?.[i]?.kind;
      if (kind === "add" || kind === "del") return skin.diffRow(kind, dark);
      return null;
    };

    const rowsCol = (
      <View
        style={[
          GROW,
          skin.bodyPad(compact),
          copyInset > 0 ? { paddingEnd: copyInset } : null,
        ]}
      >
        {tokenLines.slice(0, visibleCount).map((spans, i) => (
          <View key={i} style={[skin.rowPad(compact, gutter), rowMin, rowTint(i)]}>
            {diffLines ? (
              <Text style={[type, MONO, skin.diffMarker(diffLines[i].kind, tokens, dark)]}>
                {`${DIFF_GLYPH[diffLines[i].kind]} `}
              </Text>
            ) : null}
            <LineSpans
              spans={spans}
              base={[type, skin.codeText(tokens), MONO, wrap ? WRAP_TEXT : null]}
              dark={dark}
            />
          </View>
        ))}
      </View>
    );

    const glass = isGlass(theme);
    return (
      <GlassSurface layer="content" testID={testID} style={[RELATIVE, glass ? skin.surface(tokens) : null, glass ? { padding: 0 } : null, style]}>
        {hasHeader ? (
          <View
            style={[
              glass ? withInnerFill(theme, { ...skin.headerBar(tokens), borderWidth: 0, borderBottomWidth: 0 }, "soft") : skin.headerBar(tokens),
              tabList ? skin.headerBarWithTabs : null,
              attached ? skin.attachedTop : null,
            ]}
          >
            {tabList ? (
              <TabStrip tabs={tabList} active={active} onSelect={setActive} dark={false} />
            ) : (
              <Text style={[skin.headerLabel(tokens), MONO]} numberOfLines={1}>
                {headerLeft}
              </Text>
            )}
            <View style={HEADER_END}>
              {!tabList && filename && language ? (
                <Text style={[skin.headerBadge(tokens), MONO]}>{language}</Text>
              ) : null}
              {copy ? <CopyChip dark={false} floating={false} copied={copied} onPress={handleCopy} /> : null}
            </View>
          </View>
        ) : null}
        <View
          style={[
            glass ? { ...skin.surface(tokens), backgroundColor: "transparent", borderWidth: 0, borderTopWidth: 0, borderRadius: 0 } : skin.surface(tokens),
            hasHeader ? skin.surfaceUnderHeader : null,
            !hasHeader && attached ? skin.attachedTop : null,
          ]}
        >
          <View style={ROW}>
            {gutter ? (
              <View style={[skin.gutterCol(compact), skin.bodyPad(compact)]}>
                {Array.from({ length: visibleCount }, (_, i) => (
                  <View key={i} style={[skin.gutterRow(compact), rowMin, rowTint(i)]}>
                    <Text style={[type, skin.gutterText(tokens), MONO]}>
                      {String(startLine + i)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
            {wrap ? (
              <View style={FLEX_FILL}>{rowsCol}</View>
            ) : (
              <ScrollView
                {...scrollFocus}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={FLEX_FILL}
                contentContainerStyle={GROW}
              >
                {rowsCol}
              </ScrollView>
            )}
          </View>
          {folds ? (
            <RippleClip shape={{ borderBottomStartRadius: 7, borderBottomEndRadius: 7 }}>
              <Pressable
                android_ripple={surfaceRipple(tokens)}
                onPress={() => setExpanded(!expanded)}
                accessibilityRole="button"
                // Dual alias: RNW drops accessibilityState (see test/a11y-state.test.tsx).
                accessibilityState={{ expanded }}
                aria-expanded={expanded}
                style={({ pressed }) => [skin.expanderBar(tokens), pressDim(pressed, skin.copyPressedOpacity)]}
              >
                <Icon {...(expanded ? { chevronUp: true } : { chevronDown: true })} muted decorative size={14} />
                <Text style={skin.expanderLabel(tokens)}>
                  {expanded ? "Show less" : `Show all ${total} lines`}
                </Text>
              </Pressable>
            </RippleClip>
          ) : null}
        </View>
        {floatingCopy ? (
          <View
            style={FLOATING_CHIP}
            onLayout={(e) => {
              const width = e.nativeEvent.layout?.width ?? 0;
              // 16 = the chip's end offset (8) plus a small clearance gap.
              setCopyInset((prev) => Math.max(prev, Math.ceil(width) + 16));
            }}
          >
            <CopyChip dark={false} floating copied={copied} onPress={handleCopy} />
          </View>
        ) : null}
      </GlassSurface>
    );
  };
}
