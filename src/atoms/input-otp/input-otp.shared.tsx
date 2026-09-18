import { useTextEntryMaterial } from "../../style/text-entry-material.js";
import { Fragment, forwardRef, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  type NativeSyntheticEvent,
  type TextInput as RNTextInput,
  type TextInputSelectionChangeEventData,
} from "react-native";
import {
  View,
  Text,
  TextInput,
  useHugStyle,
  useControllableState,
  useReducedMotion,
  supportsNativeDriver,
  keyframes,
  FOCUS_RESET,
  type ColorTokens,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
  type LayoutStyle,
  GlassPane, paneStyle,
  isGlass,
} from "../../style/index.js";

// Shared InputOTP shell. The whole structure, state, and accessibility live here
// ONCE; a platform file supplies only its skin (the cell shape/fill/border, the
// active-cell highlight, the digit type scale, the gap and group treatment) and
// calls createInputOTP.
//
// Architecture (the crux): the field is driven by ONE real <TextInput> so native
// SMS autofill, the one-time-code keyboard suggestion, and paste all flow into a
// single value. That input is positioned ABSOLUTELY to fill the whole row and is
// made visually invisible (opacity 0, caret hidden), so tapping anywhere
// on the segmented row focuses it and autofill/paste land in it. The visible
// segment cells (a View + a Text per character) are laid out underneath and read
// from the resolved `value`; the "active" cell (index === value.length, clamped
// to the last cell) shows a caret/ring while the input is focused. Focus is tracked
// in local state for the active-cell highlight ONLY; the value flows through
// useControllableState, so InputOTP works controlled OR uncontrolled (a bare one is typeable).
//
// Because that one input spans the whole row, a tap drops the native caret wherever
// the pointer landed, which on a partly-entered code is the MIDDLE of the string. The
// selection is therefore pinned to the end of the value (see pinCaret below), so a
// keystroke always lands in the first unfilled cell no matter which cell was tapped.

export type Size = "small" | "base" | "large";

export interface InputOTPProps {
  /** Number of segment cells (and the max code length). Default 6. */
  length?: number;
  /** Current code (controlled). Only the typed characters, e.g. "123". Omit for
   *  uncontrolled use; a bare <InputOTP /> is typeable out of the box. */
  value?: string;
  /** Starting code for the uncontrolled field. Defaults to empty. */
  defaultValue?: string;
  /** Called with the new code (cleaned, sliced to `length`) on each change (both modes). */
  onChangeText?: (code: string) => void;
  /** Fired once when the code reaches `length` digits. */
  onComplete?: (code: string) => void;
  /** Split the run into groups of this many cells, separated by a dash: `length={6}`
   *  with `groups={3}` reads 123-456. Omit for one unbroken run. */
  groups?: number;
  /** Accept letters as well as digits, and ask for the text keyboard instead of the
   *  number pad. Off by default: a one-time code is digits only. */
  alphanumeric?: boolean;
  /** Focus the field on mount. */
  autoFocus?: boolean;
  /** Disable input and dim the cells. */
  disabled?: boolean;
  /** Render a bullet (●) instead of the character, for passcode entry. */
  masked?: boolean;
  // Size (pick one; default is the medium cell).
  small?: boolean;
  large?: boolean;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

// The contract a platform skin fulfills. The size and per-cell state (active while
// focused, whether the cell is filled) are passed in; the skin maps them to RN
// style objects built from the active brand tokens (so light/dark/glass follow).
export interface InputOTPSkin {
  /** Clear Liquid Glass text entry on the web appearance. */
  liquid?: boolean;
  /** Gap between cells. shadcn connects cells (gap 0, shared borders); iOS/M3 separate them. */
  gap: (size: Size) => number;
  /** Whether cells share borders as one connected group (web shadcn) — rounds only the outer corners. */
  connected: boolean;
  /** A single cell box: shape, fill, border, size. `groupStart`/`groupEnd` mark the ends of
   *  each connected run (the whole row, or one `groups` chunk) so the web skin rounds and
   *  closes a run's outer edges while its interior cells keep sharing borders. */
  cell: (
    t: ColorTokens,
    size: Size,
    state: { active: boolean; filled: boolean; groupStart: boolean; groupEnd: boolean },
  ) => ViewStyle;
  /** The digit (or bullet) text inside a cell. */
  digit: (t: ColorTokens, size: Size) => TextStyle;
  /** The dash drawn between two `groups`. */
  separator: (t: ColorTokens, size: Size) => TextStyle;
  /** The caret bar drawn in the active empty cell. */
  caret: (t: ColorTokens, size: Size) => ViewStyle;
  /** Whether the caret blinks (~1s cycle), the native insertion-point idiom on iOS/Android.
   *  The web skin keeps its established static bar. */
  caretBlink: boolean;
  /** Opacity applied to the whole control when disabled. */
  disabledOpacity: number;
}

// Size precedence within the axis: large > small > default (first match wins),
// matching the other atoms.
function sizeOf(p: InputOTPProps): Size {
  if (p.large) return "large";
  if (p.small) return "small";
  return "base";
}

const DIGITS_ONLY = /\D/g;
// U+2013 EN DASH: the group separator, wider than a hyphen and narrower than the
// em dash, which is what reads as a pause between two halves of a code.
const SEPARATOR = "–";

// One run of cells: a row of the skin's cells (the connected web run shares its
// borders and sets no gap; the separated skins pass the row gap in).
const RUN: ViewStyle = { flexDirection: "row", alignItems: "center" };

// Digits only unless `alphanumeric`, and never longer than the cell count.
function cleanCode(raw: string, length: number, alphanumeric?: boolean): string {
  return (alphanumeric ? raw : raw.replace(DIGITS_ONLY, "")).slice(0, length);
}

// The active-cell caret. Native insertion points blink — the iOS caret and the M3
// text-field cursor both pulse on a ~1s cycle — so the iOS/Android skins opt in via
// `caretBlink` and the bar loops its opacity: visible ~380ms, a quick 120ms fade out,
// hidden ~380ms, a 120ms fade back in (a 1000ms cycle). The cycle is ONE looping timing
// whose easing is that schedule (keyframes), on the native driver where there is one and
// on the JS driver on web (supportsNativeDriver, src/style/motion.ts): a native loop cannot
// hold an Animated.sequence or an Animated.delay, and under the New Architecture a
// JS-driven loop is a shadow-tree commit per frame, so even a 1Hz blink is not free there.
// Reduce Motion holds the caret solid: the bar alone still marks the insertion point.
const BLINK = keyframes([
  [0, 0],
  [0.38, 0],
  [0.5, 1],
  [0.88, 1],
  [1, 0],
]);

function Caret({ blink, style }: { blink: boolean; style: ViewStyle }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const reduced = useReducedMotion();
  const active = blink && !reduced;
  useEffect(() => {
    if (!active) {
      opacity.setValue(1);
      return;
    }
    // From 1 toward 0 along BLINK: 1 while the schedule sits at 0, 0 while it sits at 1.
    const loop = Animated.loop(Animated.timing(opacity, { toValue: 0, duration: 1000, easing: BLINK, useNativeDriver: supportsNativeDriver }));
    loop.start();
    return () => loop.stop();
  }, [active, opacity]);
  return <Animated.View style={active ? [style, { opacity }] : style} />;
}

/** Build an InputOTP component from a platform skin. */
export function createInputOTP(skin: InputOTPSkin) {
  const InputOTP = forwardRef<RNTextInput, InputOTPProps>(function InputOTP(props, ref) {
    const {
      length = 6,
      defaultValue = "",
      groups,
      alphanumeric,
      autoFocus,
      onChangeText,
      onComplete,
      disabled,
      masked,
      testID,
      style,
    } = props;
    const size = sizeOf(props);
    const entryMaterial = useTextEntryMaterial(!!skin.liquid);
    const { theme } = entryMaterial;
    const { tokens } = theme;
    // Under glass the code field uses the skin's text-entry material: each separated iOS /
    // M3 cell takes its own GlassPane, while a connected web run (cells sharing their
    // borders) takes ONE pane across the run, so it still reads as a single field box.
    // A cell drops its fill and resting border under glass (the pane's material and
    // rim carry them) and keeps only its ACTIVE border and ring as state.
    const glass = isGlass(theme);
    // HUG: the cell row keeps its content width inside a stretching Column.
    const hug = useHugStyle();
    const [focused, setFocused] = useState(false);

    // Controlled when `value` is provided, self-managed otherwise, so a bare
    // <InputOTP /> accepts typing/paste/autofill out of the box. The uncontrolled
    // seed goes through the same cleaning as typed input, so `defaultValue` can
    // never seed a code the field would refuse.
    const [value, setValue] = useControllableState<string>(
      props.value,
      cleanCode(defaultValue, length, alphanumeric),
      onChangeText,
    );

    // Fire onComplete exactly once per "reaches full length" transition: track the
    // last completed code so re-renders with the same full value don't re-fire.
    const completedRef = useRef<string | null>(null);
    useEffect(() => {
      if (value.length === length) {
        if (completedRef.current !== value) {
          completedRef.current = value;
          onComplete?.(value);
        }
      } else {
        completedRef.current = null;
      }
      // onComplete is intentionally read fresh on each call; value/length drive it.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, length]);

    const handleChange = (raw: string) => {
      setValue(cleanCode(raw, length, alphanumeric));
    };

    // Caret pinning. `caret` is the selection handed to the input, and it always sits at
    // the end of the code. Its object IDENTITY is what drives re-application (a platform
    // only pushes `selection` down when it changes), so the memo deliberately yields a new
    // object in exactly two cases and no others: the code's length changed (typing, paste,
    // autofill, a controlled update), or a tap dropped the caret somewhere it does not
    // belong. Rebuilding it on every render instead would re-collapse the selection on any
    // unrelated re-render, and holding it fixed would fight the caret while typing.
    const [strayCaret, reportStrayCaret] = useReducer((n: number) => n + 1, 0);
    const caret = useMemo(
      () => ({ start: value.length, end: value.length }),
      // `strayCaret` is a deliberate identity-only dependency: a stray tap leaves the END
      // of the code where it was, so nothing in the body changes and only a fresh object
      // can make the platform re-apply the selection. Excluding it would strand the caret
      // wherever the tap left it.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [value.length, strayCaret],
    );
    const handleSelectionChange = (
      e: NativeSyntheticEvent<TextInputSelectionChangeEventData>,
    ) => {
      const { start, end } = e.nativeEvent.selection;
      // Already where it belongs.
      if (start === value.length && end === value.length) return;
      // A full-range selection is select-all: left alone, so a paste still REPLACES a
      // complete code instead of being refused by maxLength. Any other position is a
      // stray caret and gets pushed back to the end, where the next character belongs.
      if (start === 0 && end === value.length) return;
      reportStrayCaret();
    };

    const gap = skin.gap(size);
    // A group size below 1 would put a separator before every cell (and 0 would divide
    // by zero), so anything under 1 renders as one unbroken run.
    const groupSize = groups != null && groups >= 1 ? groups : null;
    // The active cell is where the next character lands: value.length, clamped to the
    // last cell so a full code keeps the last cell highlighted while focused.
    const activeIndex = Math.min(value.length, length - 1);
    // The cells, grouped into runs: one unbroken run, or `groups`-sized runs with a
    // separator between them. A run is one connected field box on the web skin and a
    // set of separated cells on iOS/M3; either way it is the unit the glass pane spans.
    const runs: number[][] = [];
    for (let index = 0; index < length; index++) {
      if (index === 0 || (groupSize ? index % groupSize === 0 : false)) runs.push([]);
      runs[runs.length - 1]!.push(index);
    }

    return (
      <View
        testID={testID}
        style={[hug, disabled ? { opacity: skin.disabledOpacity } : null, style]}
      >
        {/* The visible segmented row. Relatively positioned so the real input can
            overlay it absolutely. The connected web group shares borders (gap 0);
            iOS/M3 separate the cells with `gap`. */}
        <View
          style={{
            position: "relative",
            flexDirection: "row",
            alignItems: "center",
            ...(skin.connected ? null : { gap }),
          }}
        >
          {runs.map((run, r) => {
            // A connected run's pane takes the run's outer corners: its first cell's
            // start radii and its last cell's end radii (the inner seams are square).
            const first = StyleSheet.flatten(skin.cell(tokens, size, { active: false, filled: false, groupStart: true, groupEnd: run.length === 1 })) as ViewStyle;
            const last = StyleSheet.flatten(skin.cell(tokens, size, { active: false, filled: false, groupStart: run.length === 1, groupEnd: true })) as ViewStyle;
            const runShape: ViewStyle = {
              borderTopStartRadius: first.borderTopStartRadius,
              borderBottomStartRadius: first.borderBottomStartRadius,
              borderTopEndRadius: last.borderTopEndRadius,
              borderBottomEndRadius: last.borderBottomEndRadius,
            };
            return (
              <Fragment key={r}>
                {r > 0 ? (
                  // The dash between two runs: a separator starts a NEW connected run, so
                  // the cell after it draws its own left edge and rounds it; without that
                  // the web skin's shared-border seam would leave the run open on its left.
                  <Text
                    style={[skin.separator(tokens, size), { pointerEvents: "none" }]}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                  >
                    {SEPARATOR}
                  </Text>
                ) : null}
                <View style={[RUN, skin.connected ? null : { gap }]}>
                  {skin.connected ? <GlassPane {...entryMaterial.paneProps} shape={runShape} /> : null}
                  {run.map((index) => {
                    const char = value[index];
                    const filled = char != null;
                    const active = focused && !disabled && index === activeIndex;
                    const showCaret = active && !filled;
                    const groupStart = index === run[0];
                    const groupEnd = index === run[run.length - 1];
                    const cellShape = skin.cell(tokens, size, { active, filled, groupStart, groupEnd });
                    return (
                      <View
                        key={index}
                        style={[
                          paneStyle(theme, cellShape),
                          glass ? { backgroundColor: "transparent", borderColor: active ? cellShape.borderColor : "transparent" } : null,
                          { pointerEvents: "none" },
                        ]}
                        // The cells are decorative; the TextInput carries the a11y role/label.
                        accessibilityElementsHidden
                        importantForAccessibility="no-hide-descendants"
                      >
                        {skin.connected ? null : <GlassPane {...entryMaterial.paneProps} shape={cellShape} />}
                        {filled ? (
                          // U+25CF BLACK CIRCLE, not the U+2022 text bullet: at the digit font
                          // size the text bullet paints as a tiny dot, while BLACK CIRCLE reads
                          // at secure-entry weight (the iOS/Android password-dot idiom).
                          <Text style={skin.digit(tokens, size)}>{masked ? "●" : char}</Text>
                        ) : showCaret ? (
                          <Caret blink={skin.caretBlink} style={skin.caret(tokens, size)} />
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              </Fragment>
            );
          })}

          {/* The real input: one transparent, caret-hidden field stretched over the
              whole row. It captures typing, paste, and one-time-code autofill, then
              the cells paint the value. A Pressable wrapper is NOT needed — the input
              itself fills the row, so a tap anywhere focuses it. */}
          <TextInput
            ref={ref}
            value={value}
            onChangeText={handleChange}
            editable={!disabled}
            autoFocus={autoFocus}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            // Pinned to the end of the code so a tap on any cell still appends at the
            // first unfilled one (see handleSelectionChange).
            selection={caret}
            onSelectionChange={handleSelectionChange}
            caretHidden
            inputMode={alphanumeric ? "text" : "numeric"}
            keyboardType={alphanumeric ? "default" : "number-pad"}
            // Codes are entered exactly as shown; nothing is re-cased behind the caller.
            autoCapitalize="none"
            // When masked, obscure the value at the input layer so the platform
            // masks it for real: RN hides it natively and RNW emits a password
            // input, so a screen reader / the DOM value / password-manager UI no
            // longer expose the raw passcode (the cell bullets alone were purely
            // cosmetic). Keep `textContentType="oneTimeCode"` set regardless —
            // iOS still honors it for SMS autofill even with secure entry — so
            // one-time-code autofill keeps landing in both modes.
            secureTextEntry={!!masked}
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={length}
            // Brand the (hidden) selection in case the OS still shows a selection band.
            selectionColor={tokens.primary}
            accessibilityLabel="One-time code"
            aria-label="One-time code"
            accessibilityState={{ disabled: !!disabled }}
            aria-disabled={disabled}
            style={[
              {
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: "100%",
                height: "100%",
                // Visually invisible: the cells render the value, this only captures input.
                // It is hidden with OPACITY rather than a transparent text color, because
                // Android does not honor `color: "transparent"` here and painted the raw
                // code straight across the middle of the row, over the cells. Opacity is
                // honored everywhere and changes nothing else: an opacity-0 view still
                // takes touches, still focuses, and is still read by assistive tech.
                opacity: 0,
                backgroundColor: "transparent",
                textAlign: "center",
              },
              FOCUS_RESET,
            ]}
          />
        </View>
      </View>
    );
  });
  InputOTP.displayName = "InputOTP";
  return InputOTP;
}
