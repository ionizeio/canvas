import { type ReactNode } from "react";
import { CELL_AXIS, LayoutAxisProvider, View, widths, type StyleProp, type ViewStyle, type WidthKey } from "../../style/index.js";
import { type FlexSkin } from "../layout/layout.styles.js";
import { type Pad } from "../layout/layout.shared.js";

// Container: the bounds provider (Bootstrap `.container` / `.container-fluid`).
// A Canvas component never dictates its own width; it is FILL or HUG and the
// nearest layout container provides the bounds. Container is the container that
// exists to provide a MEASURE: it spans its parent (`width:"100%"`), caps at one
// step of the shared width scale (`maxWidth`), and centers itself, so the reading
// measure of a form, an article, a settings page, or a card stack is one named
// step instead of a `maxWidth` invented at the call site. The cap is fluid: below
// the step the container simply fills its parent, which is all a phone is.
//
// Axes (each a boolean; first match wins, narrowest first, so a stray wider
// step never silently widens a deliberate narrow one):
//   - measure   xxxs 192 / xxs 256 / xs 320 / sm 384 / md 448 / lg 512 / xl 576 /
//               xxl 672 / xxxl 768 / wide 896 / wider 1024 / widest 1152 /
//               page 1280 (default) / fluid (no cap)
//   - alignment centered (default) / start
//   - gutters   padTight 8 / pad 16 / padLoose 24 of HORIZONTAL padding (Row and
//               Column's pad scale); vertical rhythm belongs to the Column inside.
//
// Layout is a "Shared" platform treatment like Row and Column: flexbox is
// identical on iOS, Android, and react-native-web, so the three skins reference
// the same padding scale.

export type Measure = WidthKey | "fluid";

export interface ContainerProps {
  children?: ReactNode;

  // Measure (pick one; default `page`). The step of the width scale the container caps at.
  xxxs?: boolean; // 192, a small KPI tile
  xxs?: boolean; // 256, a chart tile
  xs?: boolean; // 320
  sm?: boolean; // 384
  md?: boolean; // 448
  lg?: boolean; // 512
  xl?: boolean; // 576
  xxl?: boolean; // 672
  xxxl?: boolean; // 768
  wide?: boolean; // 896
  wider?: boolean; // 1024
  widest?: boolean; // 1152
  page?: boolean; // 1280 (default)
  /** No cap: the container spans its parent (Bootstrap `.container-fluid`). Wins over every step. */
  fluid?: boolean;

  /** Pin the container to the leading edge instead of centering it in its parent. */
  start?: boolean;

  // Gutters: horizontal padding (pick one; omit for none).
  padTight?: boolean; // 8
  pad?: boolean; // 16
  padLoose?: boolean; // 24

  /** E2E hook forwarded to the root element. */
  testID?: string;
  /**
   * Layout containers are the exception to the no-sizing rule: for composition
   * inside an app frame only (a `flex` in a screen shell), never a restyle hook.
   */
  style?: StyleProp<ViewStyle>;
}

// Measure precedence: fluid, then narrowest first; default `page`.
export function measureOf(p: ContainerProps): Measure {
  if (p.fluid) return "fluid";
  if (p.xxxs) return "xxxs";
  if (p.xxs) return "xxs";
  if (p.xs) return "xs";
  if (p.sm) return "sm";
  if (p.md) return "md";
  if (p.lg) return "lg";
  if (p.xl) return "xl";
  if (p.xxl) return "xxl";
  if (p.xxxl) return "xxxl";
  if (p.wide) return "wide";
  if (p.wider) return "wider";
  if (p.widest) return "widest";
  return "page";
}

// Gutter precedence, loosest first (Row and Column's own); default none.
function padOf(p: ContainerProps): Pad | null {
  if (p.padLoose) return "padLoose";
  if (p.pad) return "pad";
  if (p.padTight) return "padTight";
  return null;
}

/** The root style for a measure: full width, capped at the step, centered or pinned to the start. */
export function containerStyle(measure: Measure, start: boolean): ViewStyle {
  return {
    width: "100%",
    alignSelf: start ? "flex-start" : "center",
    ...(measure === "fluid" ? null : { maxWidth: widths[measure] }),
  };
}

/** Build a Container component from a platform skin (the shared padding scale). */
export function createContainer(skin: FlexSkin) {
  return function Container(props: ContainerProps) {
    const { children, testID, style } = props;
    const pad = padOf(props);
    const gutters: ViewStyle | null = pad ? { paddingHorizontal: skin.pad[pad] } : null;
    // A Container is a definite-width column: hug components hug inside it and
    // fill components fill it (the layout-axis context from sizing.ts).
    return (
      <View style={[containerStyle(measureOf(props), !!props.start), gutters, style]} testID={testID}>
        <LayoutAxisProvider value={CELL_AXIS}>{children}</LayoutAxisProvider>
      </View>
    );
  };
}
