import { paneShapeInside, useTextEntryMaterial } from "../../style/text-entry-material.js";
import { Fragment, forwardRef, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  type NativeSyntheticEvent,
  type TextInput as RNTextInput,
  type TextInputSelectionChangeEventData,
} from "react-native";
import {
  View,
  Text,
  TextInput,
  LoopView,
  createLoopChannel,
  useHugStyle,
  useControllableState,
  useReducedMotion,
  FOCUS_RESET,
  type ColorTokens,
  type LoopTrack,
  type ViewStyle,
  type TextStyle,
  type LayoutStyle,
  GlassPane, paneStyle,
  isGlass,
} from "../../style/index.js";
import type { FieldDisabledLook } from "../../style/field-look.js";
import { CARET_BLINK } from "../../style/motion.js";

// Shared InputOTP shell. The whole structure, state, and accessibility live here
// ONCE; the skin (input-otp.styles.ts, one for every platform) supplies the cell
// shape, fill and border, the active-cell highlight, the digit type scale, the gap,
// the caret bar and the disabled look, and each entry file calls createInputOTP.
//
// Architecture (the crux): the field is driven by ONE real <TextInput> so native
// SMS autofill, the one-time-code keyboard suggestion, and paste all flow into a
// single value. That input is positioned ABSOLUTELY to fill the whole row and paints
// nothing (see-through on the web, inkless at full opacity on iOS and Android, its caret
// switched off or inked clear, per InputOTPParts), so tapping anywhere
// on the segmented row focuses it and autofill/paste land in it. The visible
// segment cells (a View + a Text per character) are laid out underneath and read
// from the resolved `value`; the "active" cell (index === value.length, clamped
// to the last cell) shows a caret/ring while the input is focused. Focus is tracked
// in local state for the active-cell highlight ONLY; the value flows through
// useControllableState, so InputOTP works controlled OR uncontrolled (a bare one is typeable).
//
// Because that one input spans the whole row, a tap drops the native caret wherever the
// pointer landed. Its invisible text sits at the start of the row, so a press past the code
// lands at its end on its own; a press on the code itself can still land in the MIDDLE of a
// partly-entered code, so the caret is pinned to the end of the value (see
// handleSelectionChange below), and a keystroke always lands in the first unfilled cell no
// matter which cell was tapped. A range the platform selects is left where it is, so its
// Cut, Copy and Paste still work.

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
  /** Disable input. The cells take the field's disabled look (a hairline frame with no
   *  fill and muted digits) rather than dimming. */
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

// The contract the skin fulfills (one skin serves every platform: input-otp.styles.ts). The
// size and per-cell state (active on the cell the next character lands in while the field
// is focused, whether the cell is filled) are passed in; the skin maps them to RN style
// objects built from the active brand tokens (so light/dark/glass follow).
export interface InputOTPSkin {
  /** Clear Liquid Glass text entry on the web appearance. */
  liquid?: boolean;
  /** Gap between two cells (each cell is a field of its own). */
  gap: (size: Size) => number;
  /** A single cell box: shape, fill, border, size. */
  cell: (t: ColorTokens, size: Size, state: { active: boolean; filled: boolean }) => ViewStyle;
  /** The digit (or bullet) text inside a cell. */
  digit: (t: ColorTokens, size: Size) => TextStyle;
  /** The dash drawn between two `groups`. */
  separator: (t: ColorTokens, size: Size) => TextStyle;
  /** The caret bar drawn in the active empty cell (the shell blinks it). */
  caret: (t: ColorTokens, size: Size) => ViewStyle;
  /** A disabled field's look, in place of a dim: each cell's frame and the ink of its digits. */
  disabledLook: (t: ColorTokens, focused: boolean) => FieldDisabledLook;
}

// The per-platform pieces an entry threads in beside its skin: how the capture input, its
// caret and its selection paint nothing. The look is the same everywhere; what differs is
// what each platform still sees, or still draws, of an input nobody is meant to see.
export interface InputOTPParts {
  /**
   * Hide the capture input by its ink (a text and selection colour that paints nothing) at
   * full opacity, instead of by opacity. iOS and Android pass it, because both treat a view
   * drawn at zero alpha as absent: UIKit's hit test (and React Native's own) skips any view
   * below 0.01 alpha, so a tap on a cell never reached the field on iOS, and both
   * accessibility trees drop it, so neither VoiceOver nor TalkBack could find the field. The
   * web leaves it off: a browser hit-tests and exposes a see-through input, and opacity is
   * the only way to hide what it paints over an autofilled one (its autofill fill and ink,
   * applied with `!important`, which no inline style overrides).
   */
  opaqueCapture?: boolean;
  /**
   * Keep the platform's caret on and hide it by its ink (a cursor and handle colour that
   * paints nothing), instead of switching it off. Android passes it, because its text editor
   * offers the long-press Paste popup only while the cursor is on: `caretHidden` turns the
   * cursor off (EditText.setCursorVisible(false)), and Editor.prepareCursorControllers then
   * disables the insertion controller that a long press on the field starts the popup from.
   * Before Android 10 React Native cannot recolour the cursor, so there it stays off
   * (androidParts in input-otp.android.tsx). iOS and the web leave it off: iOS opens its
   * edit menu, with Paste, at a hidden caret, and the web's input is see-through.
   */
  inklessCaret?: boolean;
  /**
   * The platform paints a selection that no colour hides, so the field keeps none: a range is
   * collapsed back to the end of the code, as a stray caret is. iOS passes it, because its
   * selection band and grabbers take the selection colour's hue at an alpha of their own, so
   * a range over the capture input's invisible glyphs would paint a band and two grabbers
   * across the row, off the cells it selects; so does Android before 10, whose handles React
   * Native cannot recolour. Android and the web otherwise leave it off and keep a range:
   * Android's highlight and handles honour the colour's zero alpha, the web's input is
   * see-through, and Android's selection toolbar (Cut, Copy, Paste) only survives while its
   * range does.
   */
  visibleSelection?: boolean;
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

// One run of cells: a row of the skin's cells, the skin's gap between them.
const RUN: ViewStyle = { flexDirection: "row", alignItems: "center" };

// A colour that paints nothing, the capture input's ink under `opaqueCapture`. Not the
// `transparent` keyword: that is rgba(0, 0, 0, 0), the integer 0, which React Native's
// Android renderer also reads as "no colour set", so a TextInput given it falls back to the
// default black ink and paints the raw code across the row. Zero alpha over white channels
// is just as clear and is a colour Android keeps.
const NO_INK = "rgba(255, 255, 255, 0)";

// The two ways the capture input paints nothing (InputOTPParts.opaqueCapture).
const SEE_THROUGH: TextStyle = { opacity: 0 };
const INKLESS: TextStyle = { color: NO_INK };

// Digits only unless `alphanumeric`, and never longer than the cell count.
function cleanCode(raw: string, length: number, alphanumeric?: boolean): string {
  return (alphanumeric ? raw : raw.replace(DIGITS_ONLY, "")).slice(0, length);
}

// The active-cell caret blinks, the insertion point's idiom on every platform (the iOS
// caret, the Material 3 cursor and a browser's text caret all pulse on a one-second
// cycle): visible for 380ms, a 120ms fade out, hidden for 380ms, a 120ms fade back in.
// The cycle is one table (CARET_BLINK, with the other motion tunables in
// src/style/motion.ts) on a loop channel (src/style/loop.tsx), so no frame of it goes
// through React: the native driver advances it on iOS and Android, and on the web it is
// a compositor CSS animation. Each caret owns its channel and plays it from the top when
// it appears, so a caret that moves to the next cell after a keystroke shows at once and
// only then blinks. Reduce Motion holds the caret solid: the bar alone still marks the
// insertion point.
function Caret({ style }: { style: ViewStyle }) {
  const reduced = useReducedMotion();
  const [channel] = useState(() => createLoopChannel({ period: CARET_BLINK.period }));
  const blink = useMemo<LoopTrack>(() => ({ channel, ...CARET_BLINK.opacity }), [channel]);
  useEffect(() => {
    if (reduced) return;
    // Played from an effect, never during render: the web's phase is wall-clock derived.
    channel.play(0);
    return () => channel.stop();
  }, [reduced, channel]);
  return reduced ? <View style={style} /> : <LoopView style={style} opacity={blink} />;
}

/** Build an InputOTP component from a platform skin (plus the platform's capture part). */
export function createInputOTP(skin: InputOTPSkin, parts: InputOTPParts = {}) {
  const { opaqueCapture, inklessCaret, visibleSelection } = parts;
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
    // Under glass the code field uses the skin's text-entry material: each cell takes its
    // own GlassPane (the clear well on the web, the static material natively) across its
    // padding box (paneShapeInside). A cell drops its fill and resting border under glass
    // (the pane's material and rim carry them) and keeps only its ACTIVE border as state.
    // A disabled field paints no material, as a disabled Input paints none.
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

    // The range the platform selected, and the code it was selected on: held while the
    // field still shows that code (see the selection below). Any change to the code lets
    // go of it (typing, a paste over it, a parent's update), here during the render, so the
    // same code coming back later (a parent that clears the field and fills it again) never
    // brings back a selection nobody made.
    const [range, setRange] = useState<{ start: number; end: number; code: string } | null>(null);
    if (range !== null && range.code !== value) setRange(null);
    const held = range !== null && range.code === value ? range : null;

    const handleChange = (raw: string) => {
      setValue(cleanCode(raw, length, alphanumeric));
    };

    // Caret pinning. `selection` is handed to the input: the end of the code, so a keystroke
    // always lands in the first unfilled cell, or the range the platform selected, left
    // exactly where the platform put it. React Native re-applies a controlled `selection`
    // over any selection the platform reports that differs from it, and on Android it
    // re-applies it by writing the text back too, which the editor takes as an edit: that
    // hides its handles, ends the long-press drag and stops the selection toolbar. So a
    // range (select-all, the word a long press or a double tap selects, a dragged handle)
    // is mirrored, never corrected: pushed back to the end, a long press on the digits
    // opened no toolbar on Android, and widened to the whole code, a long press on one word
    // of an alphanumeric code lost its toolbar the same way. Held, the platform's toolbar or
    // edit menu stays up, and its Cut, Copy and Paste act on the range, so a paste over a
    // selected code replaces it instead of being refused by maxLength. A platform whose
    // selection shows whatever its colour (InputOTPParts.visibleSelection) keeps no range:
    // there a range is a stray caret, since a band off the cells would misstate what is
    // selected.
    //
    // The object's IDENTITY is what drives re-application on the web (react-native-web
    // applies `selection` when the prop changes), so the memo yields a new object only when
    // the place changed (the code's length on typing, paste, autofill or a controlled
    // update; a range held or let go), or when a tap put the caret somewhere it does not
    // belong. Rebuilding it on every render instead would re-collapse the selection on any
    // unrelated re-render, and holding it fixed would fight the caret while typing.
    const [strayCaret, reportStrayCaret] = useReducer((n: number) => n + 1, 0);
    const selectionStart = held ? held.start : value.length;
    const selectionEnd = held ? held.end : value.length;
    const selection = useMemo(
      () => ({ start: selectionStart, end: selectionEnd }),
      // `strayCaret` is a deliberate identity-only dependency: a stray tap leaves the END
      // of the code where it was, so nothing in the body changes and only a fresh object
      // can make the platform re-apply the selection. Excluding it would strand the caret
      // wherever the tap left it.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [selectionStart, selectionEnd, strayCaret],
    );
    const handleSelectionChange = (
      e: NativeSyntheticEvent<TextInputSelectionChangeEventData>,
    ) => {
      const { start, end } = e.nativeEvent.selection;
      if (start !== end && !visibleSelection) {
        // A range: held where the platform put it.
        if (held === null || held.start !== start || held.end !== end) setRange({ start, end, code: value });
        return;
      }
      // A collapsed caret lets go of any range.
      if (range !== null) setRange(null);
      // Already where it belongs.
      if (start === value.length && end === value.length) return;
      // Anywhere else is a stray caret (a tap drops it where the finger landed), or a range
      // the platform would paint off the cells: pushed back to the end, where the next
      // character belongs.
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
    // separator between them.
    const runs: number[][] = [];
    for (let index = 0; index < length; index++) {
      if (index === 0 || (groupSize ? index % groupSize === 0 : false)) runs.push([]);
      runs[runs.length - 1]!.push(index);
    }

    return (
      <View testID={testID} style={[hug, style]}>
        {/* The visible segmented row. Relatively positioned so the real input can
            overlay it absolutely. */}
        <View style={{ position: "relative", flexDirection: "row", alignItems: "center", gap }}>
          {runs.map((run, r) => (
            <Fragment key={r}>
              {r > 0 ? (
                // The dash between two runs.
                <Text
                  style={[skin.separator(tokens, size), { pointerEvents: "none" }]}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                >
                  {SEPARATOR}
                </Text>
              ) : null}
              <View style={[RUN, { gap }]}>
                {run.map((index) => {
                  const char = value[index];
                  const filled = char != null;
                  // The cell the next character lands in carries the focus ring and, while
                  // empty, the caret. A disabled field's input takes no focus (the web
                  // disables it, native fields are not editable), so it shows neither.
                  const active = focused && !disabled && index === activeIndex;
                  const showCaret = active && !filled;
                  const cellShape = skin.cell(tokens, size, { active, filled });
                  const disabledLook = disabled ? skin.disabledLook(tokens, active) : null;
                  const digit = skin.digit(tokens, size);
                  return (
                    <View
                      key={index}
                      style={[
                        ...(disabledLook
                          ? [cellShape, disabledLook.frame]
                          : [
                              paneStyle(theme, cellShape, active),
                              glass ? { backgroundColor: "transparent", borderColor: active ? cellShape.borderColor : "transparent" } : null,
                            ]),
                        { pointerEvents: "none" },
                      ]}
                      // The cells are decorative; the TextInput carries the a11y role/label.
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                    >
                      {disabledLook ? null : <GlassPane {...entryMaterial.paneProps} shape={paneShapeInside(cellShape)} />}
                      {filled ? (
                        // U+25CF BLACK CIRCLE, not the U+2022 text bullet: at the digit font
                        // size the text bullet paints as a tiny dot, while BLACK CIRCLE reads
                        // at secure-entry weight (the iOS/Android password-dot idiom).
                        <Text style={disabledLook ? [digit, { color: disabledLook.ink }] : digit}>{masked ? "●" : char}</Text>
                      ) : showCaret ? (
                        <Caret style={skin.caret(tokens, size)} />
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </Fragment>
          ))}

          {/* The real input: one caret-hidden field that paints nothing, stretched over
              the whole row. It captures typing, paste, and one-time-code autofill, then
              the cells paint the value. No Pressable wrapper: the input itself fills the
              row, so a tap anywhere focuses it and a long press reaches the input's own
              handling (iOS opens its edit menu, with Paste, there). */}
          <TextInput
            ref={ref}
            value={value}
            onChangeText={handleChange}
            editable={!disabled}
            autoFocus={autoFocus}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            // Pinned to the end of the code so a tap on any cell still appends at the
            // first unfilled one, or holding the whole code (see handleSelectionChange).
            selection={selection}
            onSelectionChange={handleSelectionChange}
            // The platform caret paints nothing either way: switched off, or kept on for a
            // platform that ties its long-press Paste to it and inked clear, with its handles
            // (InputOTPParts.inklessCaret). The cells draw the kit's own caret.
            caretHidden={!inklessCaret}
            cursorColor={NO_INK}
            selectionHandleColor={NO_INK}
            inputMode={alphanumeric ? "text" : "numeric"}
            keyboardType={alphanumeric ? "default" : "number-pad"}
            // Codes are entered exactly as shown: nothing is re-cased, corrected or flagged
            // behind the caller (autocorrect would rewrite an alphanumeric code into a word
            // at the next boundary, and its prompt and marks would paint over the cells).
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            // When masked, obscure the value at the input layer so the platform
            // masks it for real: RN hides it natively and RNW emits a password
            // input, so a screen reader / the DOM value / password-manager UI no
            // longer expose the raw passcode (the cell bullets alone were purely
            // cosmetic). Keep `textContentType="oneTimeCode"` set regardless (iOS
            // still honors it for SMS autofill even with secure entry), so
            // one-time-code autofill keeps landing in both modes.
            secureTextEntry={!!masked}
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            // No maxLength: the platform would cut a pasted or autofilled code at the cell count
            // BEFORE cleanCode strips its separators ("65-43 21" arrived as "65-43 ", six
            // characters, four digits). cleanCode slices to the cell count itself, and the input
            // is controlled, so a longer entry never shows.
            // The selection is ink too, and paints none: a band (and, on Android, the
            // handles, which take this colour) over glyphs nobody sees would sit off the
            // cells. react-native-web drops the prop; its see-through input shows none.
            selectionColor={NO_INK}
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
                backgroundColor: "transparent",
                // The invisible code sits at the start of the row, so a press anywhere past
                // it lands at the END of the code, where the next character belongs: the
                // platform itself puts its caret, its Paste popup and its edit menu there, and
                // the pin has nothing to correct. Centred, a press left of the code landed
                // before it, and every correction the pin pushed is, on Android, a rewrite of
                // the text that its editor takes as an edit: it closed the Paste popup a long
                // press on a filled cell had opened, and a field never focused reported no
                // caret to correct at all, so its Paste went in before the code.
                textAlign: "left",
              },
              // Paints nothing: the cells render the value, this only captures input.
              // See-through on the web, inkless at full opacity where the platform drops
              // a zero-alpha view from touch and assistive tech (InputOTPParts).
              opaqueCapture ? INKLESS : SEE_THROUGH,
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
