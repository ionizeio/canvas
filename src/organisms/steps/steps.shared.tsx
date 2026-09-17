import { type ReactNode } from "react";
import { type DimensionValue } from "react-native";
import { View, Pressable, Text, RippleClip, cornerRadii, useTheme, useControllableState, useContainerBreakpoint, containerProbe, useMinTargetSlop, type BreakpointKey, type Responsive, type StyleProp, type ViewStyle, type LayoutStyle, GlassPane, paneStyle, isGlass } from "../../style/index.js";
import * as s from "./steps.styles.js";
import { type State, type StepsSkin } from "./steps.styles.js";

// Shared Steps shell. The structure (the numbered/check circles joined by
// connectors, plus the vertical and progress-bar layouts), the layout
// precedence, the per-step state derivation, the press handlers, and the
// accessibility all live here once; a platform file supplies only its skin (the
// circle/connector colors, the connector cap, the current-step emphasis, and
// the press feedback) and calls createSteps.
//
// Boolean-prop API: layout is a single axis with `progress` and `vertical`
// opting out of the default horizontal layout (first-match precedence,
// mirroring Divider). `progress` beats `vertical` beats the horizontal default.

export interface Step {
  label: string;
  description?: string;
}

export interface StepsProps {
  /** Ordered steps to render. Each is a label with an optional one-line note. */
  steps: Step[];
  /** Index of the active step (CONTROLLED). Earlier steps read completed, later ones muted. Omit for uncontrolled use. */
  current?: number;
  /** Initial active step for uncontrolled use (pressing a step, with `onStepPress`, moves it). */
  defaultCurrent?: number;
  // Layout (pick one; default is horizontal).
  vertical?: boolean;
  /** Render a labeled percentage progress bar instead of discrete steps. */
  progress?: boolean;
  /**
   * Responsive (horizontal layout only): render the EXISTING vertical layout
   * when the component's own CONTAINER is at or below `stackBreakpoint`
   * (default `sm` = 640). Container-measured with a viewport seed, mirroring
   * Row `stacks`. `vertical` and `progress` are unaffected (a progress bar is
   * already fluid).
   */
  stacks?: boolean;
  /** The breakpoint at and below which `stacks` goes vertical (default `"sm"`).
   *  Only meaningful with `stacks`. */
  stackBreakpoint?: BreakpointKey;
  /** Progress mode only: filled fraction, 0-100 (clamped). Defaults to 0. */
  value?: number;
  /** Progress mode only: caption shown left of the percentage. */
  label?: string;
  /** When set, each step circle is pressable, reporting the step index. */
  onStepPress?: (index: number) => void;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

type Layout = "horizontal" | "vertical" | "progress";

// First match wins when more than one layout flag is passed.
function layoutOf(p: StepsProps): Layout {
  if (p.progress) return "progress";
  if (p.vertical) return "vertical";
  return "horizontal";
}

// Each step's visual state derives from its index relative to `current`.
function stateOf(index: number, current: number): State {
  if (index < current) return "completed";
  if (index === current) return "current";
  return "upcoming";
}

/** Build a Steps component from a platform skin. */
export function createSteps(skin: StepsSkin) {
  // The numbered/check disc. Pressable (and so opacity-dim / ripple) only when an
  // onStepPress handler is supplied; otherwise a plain View.
  function Circle({ index, state, onPress }: { index: number; state: State; onPress?: () => void }) {
    // A step circle is 32pt of visible dot on every platform, which is right for the
    // rail's rhythm and short of both platforms' minimum, so the touch area grows
    // around it rather than the dot growing.
    const target = useMinTargetSlop(skin.minTarget);
    const theme = useTheme();
    const { tokens } = theme;
    // Under glass the circle is a CONTROL-layer puck: a completed step is BRAND-tinted
    // glass under its check, the current step keeps its brand ring as its state over
    // the plain material, and an upcoming step is the plain material; the circle drops
    // its fill and outline otherwise (the pane's material and rim carry them).
    const glass = isGlass(theme);
    const circle = skin.circleState(tokens, state);
    const glassCircle: ViewStyle | null = glass ? { backgroundColor: "transparent", borderColor: state === "current" ? circle.borderColor : "transparent" } : null;
    const pane = <GlassPane layer="control" shape={s.circleBase} brand={state === "completed" ? tokens.primary : undefined} interactive={!!onPress} />;
    const glyph = (
      <Text style={[s.glyphBase, skin.glyphState(tokens, state)]}>
        {state === "completed" ? "✓" : String(index + 1)}
      </Text>
    );
    if (onPress) {
      const ripple = skin.ripple ? skin.ripple(tokens, state) : undefined;
      // The bounded ripple is clipped to the round circle by this RippleClip parent
      // (a node can never clip its own ripple on Android); no outer layout to move.
      return (
        <RippleClip shape={cornerRadii(s.circleBase)}>
          <Pressable
            {...target}
            style={({ pressed }) => [
              s.circleBase,
              circle,
              glassCircle,
              skin.pressedOpacity != null && pressed ? { opacity: skin.pressedOpacity } : null,
            ]}
            android_ripple={ripple}
            onPress={onPress}
            accessibilityRole="button"
          >
            {pane}
            {glyph}
          </Pressable>
        </RippleClip>
      );
    }
    return (
      <View style={[s.circleBase, circle, glassCircle]}>
        {pane}
        {glyph}
      </View>
    );
  }

  return function Steps(props: StepsProps) {
    const { steps, value, label, onStepPress, testID, style } = props;
    const theme = useTheme();
    const { tokens } = theme;
    // Under glass the progress rail is a CONTROL-layer puck (the brand fill slides over it).
    const glass = isGlass(theme);
    // `stacks` (horizontal only): the component measures its own CONTAINER and
    // renders the existing vertical layout in narrow ones. The hook is
    // unconditional (rules of hooks); the measurement only attaches with `stacks`.
    // In a ROW parent the horizontal root HUGS its content (and the stacked
    // branch spans full width), so neither branch can learn the container's
    // width by measuring itself: the hugged self-measure latched `stacks`
    // vertical inside any wide row, and every relayout flickered it back
    // through horizontal (the Tabs vertical-rail post-mortem). The handler
    // rides an out-of-flow containerProbe sibling instead, rendered in BOTH
    // states so a widening container un-stacks.
    const { value: narrow, onLayout: onStacksLayout } = useContainerBreakpoint(
      { base: false, [props.stackBreakpoint ?? "sm"]: true } as Responsive<boolean>,
      { seedViewport: true },
    );
    const requested = layoutOf(props);
    const layout = requested === "horizontal" && props.stacks && narrow ? "vertical" : requested;
    const measureStacks = props.stacks && requested === "horizontal" ? onStacksLayout : undefined;
    const withStacksProbe = (root: ReactNode) =>
      measureStacks ? (
        <>
          <View style={containerProbe} onLayout={measureStacks} />
          {root}
        </>
      ) : (
        root
      );
    // Controlled when `current` is provided, self-managed otherwise, so a bare
    // Steps with pressable steps moves the active step instead of ignoring it.
    const [current, setCurrent] = useControllableState<number>(props.current, props.defaultCurrent ?? 0);
    // Pressable steps (opt-in via onStepPress) move the active step and report it.
    const pressStep = onStepPress
      ? (i: number) => {
          setCurrent(i);
          onStepPress(i);
        }
      : undefined;

    if (layout === "progress") {
      const pct = Math.max(0, Math.min(100, Math.round(value ?? 0)));
      return (
        <View testID={testID} style={[s.fullWidth, style]}>
          <View style={s.progressHeader}>
            <Text style={skin.progressCaption(tokens)}>{label ?? "Setup progress"}</Text>
            <Text style={skin.progressPercent(tokens)}>{pct}%</Text>
          </View>
          <View style={paneStyle(glass, skin.progressTrack(tokens))}>
            <GlassPane layer="control" shape={skin.progressTrack(tokens)} />
            <View style={[skin.progressFill(tokens), { width: `${pct}%` as DimensionValue }]} />
          </View>
        </View>
      );
    }

    if (layout === "vertical") {
      return withStacksProbe(
        <View testID={testID} style={[s.fullWidth, style]}>
          {steps.map((step, i) => {
            const state = stateOf(i, current);
            const isLast = i === steps.length - 1;
            return (
              <View key={i} style={s.verticalRow}>
                <View style={s.verticalRail}>
                  <Circle index={i} state={state} onPress={pressStep ? () => pressStep(i) : undefined} />
                  {!isLast ? (
                    <View style={[s.verticalConnector, skin.connector(tokens, state === "completed")]} />
                  ) : null}
                </View>
                <View style={[s.flex1, !isLast ? s.verticalContentSpacing : null]}>
                  <Text style={[s.labelBase, skin.labelState(tokens, state)]}>{step.label}</Text>
                  {step.description != null ? (
                    <Text style={skin.verticalDescription(tokens)}>{step.description}</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>,
      );
    }

    // Horizontal: a row of circle + label columns, joined by flex-filling rules.
    return withStacksProbe(
      <View testID={testID} style={[s.horizontalRow, style]}>
        {steps.map((step, i) => {
          const state = stateOf(i, current);
          const isLast = i === steps.length - 1;
          return (
            <View key={i} style={[s.horizontalRow, !isLast ? s.flex1 : null]}>
              <View style={s.horizontalColumn}>
                <Circle index={i} state={state} onPress={onStepPress ? () => onStepPress(i) : undefined} />
                <Text style={[s.labelBaseXs, skin.labelState(tokens, state)]}>{step.label}</Text>
              </View>
              {!isLast ? (
                // The connector after a step is "filled" once that step is
                // completed (i.e. the next step has been reached).
                <View style={[s.horizontalConnector, skin.connector(tokens, i < current)]} />
              ) : null}
            </View>
          );
        })}
      </View>,
    );
  };
}
