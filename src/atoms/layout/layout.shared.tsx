import { Children, isValidElement, type ReactNode } from "react";
import {
  View,
  LayoutAxisProvider,
  breakpoints,
  clampSpan,
  devWarn,
  layoutAxis,
  spanWidth,
  useContainerWidth,
  useLayoutAxis,
  type BreakpointKey,
  type LayoutAxis,
  type StyleProp,
  type ViewStyle,
} from "../../style/index.js";
import { type FlexSkin } from "./layout.styles.js";

// Shared layout primitives: Row (horizontal) and Column (vertical). The kit had
// no layout primitive, so every example hand-rolled `<View style={{ flexDirection,
// gap, alignItems, justifyContent }}>`. Row and Column own arrangement through
// semantic boolean axes instead, so a call site never writes raw flex style. This
// is what the "No styling escape hatches" directive points every layout shim at.
//
// Direction is the component identity (Row vs Column), not a prop. Everything else
// is a boolean axis with a documented first-match precedence, mirroring Badge's
// toneOf / Typography's roleOf:
//   - gap scale     (flush / tight / snug / cozy / relaxed / loose; default snug)
//   - main axis      justify (start / center / end / between / around / evenly)
//   - cross axis      align   (alignStart / alignCenter / alignEnd / baseline / stretch)
//   - modifiers       wrap / fill / grow / shrink (orthogonal, stack freely)
//   - padding scale  (padTight / pad / padLoose; default none)
//   - span           (a Row child's width in twelfths of the Row: Bootstrap `.col-n`)
//
// Both publish the layout-axis context from src/style/sizing.ts (the container's
// axis, whether a Column stretches its children, and whether the box is a
// content-sized cell inside a Row), which is how a HUG component hugs inside a
// stretching Column and how a FILL component warns inside a bare Column in a Row.
// A Row whose children carry `span` measures its own width (the Grid and Form
// precedent) and wraps each spanning child in a px-wide cell; a Row with neither
// spans nor `stacks` mounts no measurement at all.
// Main- and cross-axis "center" carry distinct prop names (`center` vs
// `alignCenter`) so `<Row center alignCenter>` is unambiguous.
//
// Layout is a "Shared" platform treatment like Typography: flexbox is identical
// on iOS, Android, and react-native-web, so the three platform skins reference the
// same scale maps. The full per-OS file structure exists to match the kit recipe.

export type Direction = "row" | "column";
export type Gap = "flush" | "tight" | "snug" | "cozy" | "relaxed" | "loose";
export type Justify = "start" | "center" | "end" | "between" | "around" | "evenly";
export type Align = "alignStart" | "alignCenter" | "alignEnd" | "baseline" | "stretch";
export type Pad = "padTight" | "pad" | "padLoose";

export interface FlexProps {
  children?: ReactNode;

  // Gap scale (pick one; default `snug`). Maps to the shared spacing tokens.
  flush?: boolean; // 0
  tight?: boolean; // 4
  snug?: boolean; // 8 (default)
  cozy?: boolean; // 12
  relaxed?: boolean; // 16
  loose?: boolean; // 24

  // Main-axis distribution / justifyContent (pick one; default `start`).
  start?: boolean; // flex-start (default)
  center?: boolean; // center
  end?: boolean; // flex-end
  between?: boolean; // space-between
  around?: boolean; // space-around
  evenly?: boolean; // space-evenly

  // Cross-axis alignment / alignItems (pick one; default `stretch`, RN's native default).
  alignStart?: boolean; // flex-start
  alignCenter?: boolean; // center
  alignEnd?: boolean; // flex-end
  baseline?: boolean; // baseline
  stretch?: boolean; // stretch (default)

  // Orthogonal modifiers (stack freely).
  wrap?: boolean; // flexWrap: "wrap"
  fill?: boolean; // flex: 1
  grow?: boolean; // flexGrow: 1
  /**
   * Let this box shrink below its own content width when the line runs out of
   * room (`flexShrink: 1`), so a long text child wraps instead of overflowing.
   *
   * React Native gives every box `flexShrink: 0`, which is the opposite of the
   * web's flex default: inside a Row, a Column holding a sentence keeps its
   * MAX-CONTENT width and spills past the row's edge, where the nearest
   * clipping ancestor cuts it mid-word. `shrink` is the opt-in that hands the
   * row's width back to the text. Reach for it on the copy in a
   * heading-beside-actions row, a label beside a control, any Row child whose
   * width should follow the row rather than its own longest line.
   *
   * It is not `fill`. `fill` (flex: 1) also zeroes the flex BASIS, so in a
   * `wrap` row every child then fits on one line and the actions stop wrapping
   * below the copy; `shrink` leaves the basis at the content size, so the row
   * still breaks where it did and only the over-wide child gives way.
   * Redundant alongside `fill`, which already shrinks.
   */
  shrink?: boolean; // flexShrink: 1
  /**
   * Responsive (Row only): render as a Column when the row's own CONTAINER is
   * at or below `stackBreakpoint` (default `sm` = 640). Container-measured with
   * a viewport seed for the first frame, so a Row inside a narrow desktop
   * column stacks too, not just on phones. When stacked, the Row IS the Column
   * with the same props: gap, justify, align, and padding apply to the new
   * axes, the default `stretch` cross-axis makes children full width, and
   * `wrap` is inert. Ignored (with a DEV warning) on Column: a Column that
   * must become a Row is a Row that stacks.
   */
  stacks?: boolean;
  /** The breakpoint at and below which `stacks` flips to a column (default
   *  `"sm"`). Only meaningful with `stacks` (DEV warns without it). */
  stackBreakpoint?: BreakpointKey;
  /**
   * Width in twelfths of the parent Row (Bootstrap `.col-n`): `span={6}` is half
   * the row, `span={4}` a third, `span={12}` the full width. The Row measures its
   * own width and gives this box a px cell, gaps included in the arithmetic, so
   * two `span={6}` children plus the gap between them fill the row exactly. Spans
   * over twelve wrap onto the next line. A Row with `stacks` ignores spans once it
   * has stacked (every child is then full width). Only meaningful on a direct
   * child of a Row (DEV warns elsewhere); in a Column, a width is a Container
   * step. A child without a span, `fill`, or `grow` hugs its content
   * (`.col-auto`): a fill component inside it collapses, so give it one of those.
   */
  span?: number;
  /**
   * Indent the whole stack by one control gutter (24: a control box plus the row
   * gap), so a nested option group lines up under its parent control's label
   * instead of its box. For nesting checkboxes/radios under a "select all" parent.
   */
  indent?: boolean; // paddingLeft: 24

  // Padding scale (pick one; omit for none).
  padTight?: boolean; // 8
  pad?: boolean; // 16
  padLoose?: boolean; // 24

  /** E2E hook forwarded to the root element. */
  testID?: string;

  /**
   * Layout containers are the exception to the no-sizing rule: for sizing and
   * composition only (a `maxWidth` on a shell, a `flex` inside an app frame),
   * never for styling or spacing. Gap, margin, padding, and flex layout come from
   * the props above, and the codegen guardrail rejects those keys in `style`.
   * Prefer a Container step or a `span` where one fits.
   */
  style?: StyleProp<ViewStyle>;
}

const JUSTIFY: Record<Justify, ViewStyle["justifyContent"]> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
  around: "space-around",
  evenly: "space-evenly",
};

const ALIGN: Record<Align, ViewStyle["alignItems"]> = {
  alignStart: "flex-start",
  alignCenter: "center",
  alignEnd: "flex-end",
  baseline: "baseline",
  stretch: "stretch",
};

// Gap precedence when more than one is passed: first match wins, largest-first
// (mirrors Typography's roleOf ordering). Default `snug` when none is set.
// Exported for Grid, which shares the gap axis and its precedence.
export function gapOf(p: Pick<FlexProps, Gap>): Gap {
  if (p.loose) return "loose";
  if (p.relaxed) return "relaxed";
  if (p.cozy) return "cozy";
  if (p.snug) return "snug";
  if (p.tight) return "tight";
  if (p.flush) return "flush";
  return "snug";
}

// Main-axis precedence; default `start`.
function justifyOf(p: FlexProps): Justify {
  if (p.between) return "between";
  if (p.around) return "around";
  if (p.evenly) return "evenly";
  if (p.center) return "center";
  if (p.end) return "end";
  return "start";
}

// Cross-axis precedence; default `stretch` (RN's native alignItems default).
function alignOf(p: FlexProps): Align {
  if (p.stretch) return "stretch";
  if (p.baseline) return "baseline";
  if (p.alignCenter) return "alignCenter";
  if (p.alignEnd) return "alignEnd";
  if (p.alignStart) return "alignStart";
  return "stretch";
}

// Padding precedence; default none (null).
function padOf(p: FlexProps): Pad | null {
  if (p.padLoose) return "padLoose";
  if (p.pad) return "pad";
  if (p.padTight) return "padTight";
  return null;
}

/** Whether any direct child declares a `span` (the Row then measures itself). */
function hasSpans(children: ReactNode): boolean {
  return Children.toArray(children).some((child) => isValidElement(child) && (child.props as FlexProps).span != null);
}

/** Wrap each spanning child in a px-wide cell; other children pass through. */
function spanCells(children: ReactNode, width: number, gap: number): ReactNode {
  return Children.toArray(children).map((child, i) => {
    const span = isValidElement(child) ? (child.props as FlexProps).span : undefined;
    if (span == null) return child;
    const cell = width > 0 ? { width: spanWidth(width, clampSpan(span), gap) } : null;
    return (
      <View key={i} style={cell}>
        {child}
      </View>
    );
  });
}

/** Build a Row or Column component from a platform skin and a fixed direction. */
export function createFlex(skin: FlexSkin, direction: Direction) {
  // Resolve every axis to one ViewStyle for a concrete direction. While stacked
  // (a Row rendering as a Column), `wrap` is inert: a single column has nothing
  // to wrap, and dropping it keeps the stacked layout byte-identical to the
  // equivalent Column.
  function flexStyle(props: FlexProps, dir: Direction, stacked: boolean): ViewStyle {
    const layout: ViewStyle = {
      flexDirection: dir,
      gap: skin.gap[gapOf(props)],
      justifyContent: JUSTIFY[justifyOf(props)],
      alignItems: ALIGN[alignOf(props)],
    };
    if (props.wrap && !stacked) layout.flexWrap = "wrap";
    if (props.fill) layout.flex = 1;
    if (props.grow) layout.flexGrow = 1;
    if (props.shrink) layout.flexShrink = 1;
    if (props.indent) layout.paddingLeft = 24; // one control gutter: box (16) + row gap (8)
    const pad = padOf(props);
    if (pad) layout.padding = skin.pad[pad];
    return layout;
  }

  // The context value this box publishes: its axis, whether it stretches its
  // children, and whether it is a content-sized cell inside a Row.
  function axisOf(props: FlexProps, dir: Direction, parent: LayoutAxis | null): LayoutAxis {
    const sized = props.span != null || !!props.fill || !!props.grow;
    // `stretch` describes the WIDTH of children, so it is a Column fact only: a
    // Row's cross axis is its height.
    return layoutAxis(dir, dir === "column" && alignOf(props) === "stretch", parent, sized);
  }

  // The measuring variant, mounted only when a Row passes `stacks` or a child
  // carries a `span`: a bare Row/Column mounts no measurement and keeps a
  // byte-identical DOM. Width falls back to the window until the first layout
  // (the Grid and Form precedent), so a phone's first frame already stacks.
  function MeasuredRow(props: FlexProps & { parent: LayoutAxis | null; spanning: boolean }) {
    const { parent, spanning, children, style, testID } = props;
    const bp = props.stackBreakpoint ?? "sm";
    const { width, onLayout } = useContainerWidth();
    const stacked = !!props.stacks && width > 0 && width <= breakpoints[bp];
    const dir: Direction = stacked ? "column" : "row";
    const layout = flexStyle(props, dir, stacked);
    // A span row wraps like Bootstrap's `.row`: spans past twelve go to the next line.
    if (spanning && !stacked) layout.flexWrap = "wrap";
    const gap = skin.gap[gapOf(props)];
    return (
      <View onLayout={onLayout} style={[layout, style]} testID={testID}>
        <LayoutAxisProvider value={axisOf(props, dir, parent)}>
          {spanning && !stacked ? spanCells(children, width, gap) : children}
        </LayoutAxisProvider>
      </View>
    );
  }

  return function Flex(props: FlexProps) {
    const { children, testID, style } = props;
    const parent = useLayoutAxis();
    devWarn(
      direction === "column" && !!props.stacks,
      "[canvas] <Column stacks>: `stacks` applies to Row only (a stacked Row IS the Column); it is ignored here.",
    );
    devWarn(
      !!props.stackBreakpoint && !props.stacks,
      "[canvas] <Row stackBreakpoint>: `stackBreakpoint` refines `stacks` and does nothing without it.",
    );
    devWarn(
      props.span != null && parent?.axis !== "row",
      `[canvas] <${direction === "row" ? "Row" : "Column"} span>: \`span\` sizes a direct child of a Row in twelfths and does nothing here. In a Column, give the box a Container step instead.`,
    );
    devWarn(
      props.span != null && (!Number.isInteger(props.span) || props.span < 1 || props.span > 12),
      `[canvas] <${direction === "row" ? "Row" : "Column"} span={${String(props.span)}}>: \`span\` is a whole number of the twelve columns (1..12); it is clamped.`,
    );
    if (direction === "row" && (props.stacks || hasSpans(children))) {
      return <MeasuredRow {...props} parent={parent} spanning={hasSpans(children)} />;
    }
    return (
      <View style={[flexStyle(props, direction, false), style]} testID={testID}>
        <LayoutAxisProvider value={axisOf(props, direction, parent)}>{children}</LayoutAxisProvider>
      </View>
    );
  };
}
