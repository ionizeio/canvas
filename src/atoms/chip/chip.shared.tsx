import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { View, Text, Pressable, RippleClip, StyleSheet, cornerRadii, useHugStyle, useControllableState, surfaceRipple, pressDim, palette, statusColors, type StatusColorTone, type Hue, type ColorTokens, type LayoutStyle, type StyleProp, type ViewStyle, type TextStyle, GlassPane, paneStyle, alpha } from "../../style/index.js";
import { useClipSlop } from "../../style/clip-slop.js";
import { primaryText } from "../../style/primary-text.js";
import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { Icon } from "../icon/icon.js";

// Shared Chip shell. The interactive/removable pill, so no call site hand-composes
// a `borderRadius + backgroundColor + padding` Pressable to build a filter chip,
// tag, or token. A Chip carries an optional leading icon and label, becomes
// tappable with `onPress` (a filter toggle), and grows a trailing "×" remove
// button with `onRemove`.
//
// A chip is a LOW-emphasis tag, not a call to action: the neutral chip is Dark
// Factory's quiet card2 pill, and a coloured chip is its SOFT pill (the color's wash
// under the color's ink, the recipe Alert and every toned surface share). Two
// orthogonal axes drive the look:
//   - Color: a semantic status (success / warning / error / info, from statusColors,
//     so a success chip and a success badge are one state; neutral is the muted tag)
//     OR a free-form palette hue (red … rose, gray). Omit for the neutral tag.
//   - Emphasis: `outline` drops the fill for a border-only chip; `primary` is the
//     primary color's soft pill. A selected filter chip is Dark Factory's selected chip,
//     the solid primary with its foreground ink (or its color's soft pill, for a
//     coloured chip).
//
// Chip is a "Light" platform treatment: one structure and semantic colors (here),
// with the per-OS look in the skin: label type, shape, and the Android M3 anatomy
// (32dp sizing, icon-side insets, the idle outline, the tonal selected filter chip and
// its checkmark).

// Chromatic hues backed by the Tailwind palette; each renders a soft tinted tag.
// The union itself lives beside `palette` in the style layer, since Badge, Alert and
// this file all speak it.
export type { Hue };

// The touch slop of a pressable chip body, which is short (a ~20pt pill on web/iOS, a 32dp
// M3 chip on Android): it grows the tap target toward the 44pt/48dp minimums. One value for
// the body Pressable and the RippleClip around the tappable pill, which must admit the same
// area or the Android clip cuts it (src/style/ripple-clip.tsx).
const BODY_HIT_SLOP = 11;

// Literal-hue props, scanned in this order (first match wins) after the status names.
const HUES: Hue[] = [
  "red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal", "cyan",
  "sky", "blue", "indigo", "violet", "fuchsia", "purple", "pink", "rose",
];

export interface ChipSkin {
  /** Container shape + padding + gap (the one, compact size). */
  base: ViewStyle;
  /** Label type. */
  labelType: TextStyle;
  /** Remove "×" glyph size. */
  removeSize: number;
  /** Remove-button hitSlop, sized so glyph + slop reaches the platform's minimum
   *  touch target (44pt iOS / 48dp Android), biased away from the label (left). */
  removeHitSlop: { top: number; bottom: number; left: number; right: number };
  /** Per-side horizontal insets, for a platform that pads an icon-bearing side
   *  tighter than a text side (M3: 16dp beside text, 8dp beside an icon). The
   *  shell resolves paddingStart/End from it; omit to keep `base`'s padding. */
  sidePadding?: { text: number; icon: number };
  /** M3 selected filter-chip anatomy: while selected, the chip leads with a
   *  checkmark at this size and drops its outline (skin-threaded, like the
   *  Accordion chevron). Omit on iOS/web: their selected look is the fill alone. */
  selectedCheckSize?: number;
  /** M3: an idle neutral chip draws its 1dp outline. Omit where the chip is borderless. */
  outlined?: boolean;
  /** M3: a selected chip takes the tonal fill (the primary's soft pill) instead of the solid primary. */
  tonalSelected?: boolean;
}

export interface ChipProps {
  /** The chip label. */
  children?: ReactNode;
  /** A leading element (e.g. an `<Icon />` or a small `<Avatar />`). An `<Icon />` is
   *  auto-tinted to the chip's label color unless it sets its own color. */
  icon?: ReactNode;
  /** A trailing element (e.g. a chevron for a menu trigger). Rendered after the label. */
  trailing?: ReactNode;
  /** Makes the whole chip tappable (e.g. toggling a filter). */
  onPress?: () => void;
  /** Adds a trailing "×" remove button firing this handler. */
  onRemove?: () => void;
  /**
   * Turns the chip into a filter toggle that owns its own selected state: pressing
   * it lights up (to the solid `primary`, the tonal primary on Android, or its
   * color's soft pill when it has a color) and back. Selection is controlled via
   * `selected`, uncontrolled via `defaultSelected`.
   */
  selectable?: boolean;
  /** Selected state for a selectable chip (CONTROLLED). Omit for uncontrolled use. */
  selected?: boolean;
  /** Initial selected state for an uncontrolled selectable chip. */
  defaultSelected?: boolean;
  /** Fired with the next selected state when a selectable chip is pressed. */
  onSelectedChange?: (selected: boolean) => void;
  // Color axis (pick one; default the neutral tag). Two families, both a soft tint:
  //  - Semantic status (matches Badge): success / warning / error / info / neutral.
  success?: boolean;
  warning?: boolean;
  /** The danger tone. This is the name the intent axis uses across the kit (Button,
   *  AlertDialog, and every chart) and the one the design hand-off uses here too. */
  destructive?: boolean;
  /** @deprecated Use `destructive`. Kept working so existing call sites are untouched;
   *  it resolves to exactly the same hue. */
  error?: boolean;
  info?: boolean;
  neutral?: boolean;
  //  - Free-form palette hues, plus `gray` for an explicit neutral tag.
  red?: boolean;
  orange?: boolean;
  amber?: boolean;
  yellow?: boolean;
  lime?: boolean;
  green?: boolean;
  emerald?: boolean;
  teal?: boolean;
  cyan?: boolean;
  sky?: boolean;
  blue?: boolean;
  indigo?: boolean;
  violet?: boolean;
  fuchsia?: boolean;
  purple?: boolean;
  pink?: boolean;
  rose?: boolean;
  gray?: boolean;
  // Emphasis (orthogonal to color). `outline` is border-only; `primary` is the
  // primary color's soft pill. `secondary` is the default neutral tag (kept for
  // back-compat; same as passing no color).
  secondary?: boolean;
  primary?: boolean;
  outline?: boolean;
  // A chip has ONE compact size, so there is no size axis.
  disabled?: boolean;
  accessibilityLabel?: string;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** For layout composition only (not styling). */
  style?: LayoutStyle;
}

// The three colors a chip paints with: container fill, border, and label/glyph text,
// plus what its glass pane takes under glass: a coloured chip's wash as the pane's tint
// (in place of the control tint, so the ink reads as it does in solid mode), or a solid
// selected chip's brand color.
interface Appearance {
  bg: string;
  border: string;
  text: string;
  glassTint?: string;
  brand?: string;
}

// The chosen color from the color axis: a status tone, a palette hue, or the muted-gray
// flag. Status names are scanned first so a semantic intent wins.
function colorOf(p: ChipProps): { tone: StatusColorTone | null; hue: Hue | null; mutedGray: boolean } {
  if (p.success) return { tone: "success", hue: null, mutedGray: false };
  if (p.warning) return { tone: "warning", hue: null, mutedGray: false };
  if (p.destructive || p.error) return { tone: "error", hue: null, mutedGray: false };
  if (p.info) return { tone: "info", hue: null, mutedGray: false };
  if (p.neutral) return { tone: null, hue: null, mutedGray: true };
  for (const h of HUES) if ((p as Record<string, unknown>)[h]) return { tone: null, hue: h, mutedGray: false };
  if (p.gray) return { tone: null, hue: null, mutedGray: true };
  return { tone: null, hue: null, mutedGray: false };
}

// A status tone's soft pill (statusColors): the wash under the ink, or for `outline` a
// border in the tone's solid color around the ink.
function toneTint(tokens: ColorTokens, tone: StatusColorTone, outline: boolean): Appearance {
  const { ink, wash, dot } = statusColors(tokens, tone);
  return outline ? { bg: "transparent", border: dot, text: ink } : { bg: wash, border: "transparent", text: ink, glassTint: wash };
}

// Dark Factory's soft alpha (its accent2Soft): a free palette hue washes at this over
// the surface, in both modes, under the hue's deep ink (800 light, 300 dark), which holds
// 4.5:1 on every hue over the page, a content pane and a control puck
// (test/glass-controls.test.tsx pins the floor).
export const HUE_SOFT = { light: 0.14, dark: 0.16 } as const;

function hueTint(hue: Hue, dark: boolean, outline: boolean): Appearance {
  const text = palette[`${hue}-${dark ? 300 : 800}`];
  if (outline) return { bg: "transparent", border: palette[`${hue}-${dark ? 700 : 300}`], text };
  const wash = alpha(palette[`${hue}-500`], dark ? HUE_SOFT.dark : HUE_SOFT.light);
  return { bg: wash, border: "transparent", text, glassTint: wash };
}

// The neutral (uncolored) chip: Dark Factory's card2 pill in the foreground, the
// muted-gray tag (`gray`/`neutral`), or a border-only outline; on a skin that outlines
// its idle chips (M3), the fill carries the `border` hairline too.
function neutralTint(tokens: ColorTokens, outline: boolean, mutedGray: boolean, outlined: boolean): Appearance {
  if (outline) return { bg: "transparent", border: tokens.border, text: tokens.foreground };
  const border = outlined ? tokens.border : "transparent";
  if (mutedGray) return { bg: tokens.muted, border, text: tokens["muted-foreground"] };
  return { bg: tokens.secondary, border, text: tokens.foreground };
}

// A selected filter chip with no color: Dark Factory's selected chip (the solid primary
// under its foreground ink, brand-tinted glass under glass), or on M3 the tonal fill.
function selectedTint(tokens: ColorTokens, tonal: boolean): Appearance {
  if (tonal) return toneTint(tokens, "info", false);
  return { bg: tokens.primary, border: "transparent", text: tokens["primary-foreground"], brand: tokens.primary };
}

/** Build a Chip from a platform skin. */
export function createChip(skin: ChipSkin) {
  return function Chip(props: ChipProps) {
    const { children, icon, trailing, onPress, onRemove, disabled, accessibilityLabel, testID, style } = props;
    const selectable =
      props.selectable === true ||
      props.selected !== undefined ||
      props.defaultSelected !== undefined ||
      props.onSelectedChange !== undefined;
    // Removing metadata does not make its body an action surface.
    const staticMaterial = !(onPress || selectable);
    const theme = useMaterialTheme({ static: staticMaterial, layer: "control" });
    const { tokens, dark } = theme;
    // Under glass the chip is a CONTROL-layer puck: a GlassPane paints the material
    // behind its content (a coloured chip washes it with its color), and the pill drops
    // its fill and hairline (the pane's material and rim carry them). The pressable
    // shell keeps its tap, ripple and dim over it.
    // HUG: content width inside a stretching Column, content-sized in a Row.
    const hug = useHugStyle();
    // The Android pill clips (its skin sets overflow hidden), and React Native hit-tests a
    // clipping view only inside its own bounds plus its own slop, so around a remove glyph
    // the pill carries the part of the glyph's slop (the 48dp close target) and the body's
    // that reaches past it, measured (src/style/clip-slop.ts). A tappable pill with no
    // remove glyph is itself the pressable, whose own slop needs no help.
    const pillClip = useClipSlop(onRemove != null && (StyleSheet.flatten(skin.base) as ViewStyle).overflow === "hidden");

    // A selectable chip is a filter toggle that owns its selected state (controlled
    // via `selected`, uncontrolled via `defaultSelected`). It is "selectable" when
    // asked explicitly or when any selection prop is passed.
    const [selectedState, setSelected] = useControllableState<boolean>(
      props.selected,
      props.defaultSelected ?? false,
      props.onSelectedChange,
    );

    const { tone, hue, mutedGray } = colorOf(props);
    const accent = props.primary === true; // the primary color's soft pill
    const outline = props.outline === true;
    const selectedActive = selectable && selectedState;
    const surfaced = !outline || selectedActive;
    // M3 selected filter-chip anatomy, threaded through the skin (the Android skin
    // sets `selectedCheckSize`): while selected, the chip leads with a checkmark
    // (replacing any custom leading icon) and sheds its outline. iOS/web omit the
    // size, so their selected look stays the tint swap alone.
    const selectedCheck = selectedActive ? skin.selectedCheckSize : undefined;
    // A tappable chip reports its toggle/active state to AT (see the Pressable below).
    const isSelected = selectable ? selectedState : accent;

    // Resolve the paint. A selected filter chip lights up to its color's soft pill, or
    // with no color to the selected chip (solid primary; tonal on M3); otherwise the color
    // axis + `outline` pick the tint, and `primary` is the primary color's soft pill.
    let appearance: Appearance;
    if (selectedActive) {
      appearance = tone ? toneTint(tokens, tone, false) : hue ? hueTint(hue, dark, false) : selectedTint(tokens, !!skin.tonalSelected);
    } else if (tone) {
      appearance = toneTint(tokens, tone, outline);
    } else if (hue) {
      appearance = hueTint(hue, dark, outline);
    } else if (accent) {
      appearance = outline ? { bg: "transparent", border: tokens.primary, text: primaryText(tokens) } : toneTint(tokens, "info", false);
    } else {
      appearance = neutralTint(tokens, outline, mutedGray, !!skin.outlined);
    }

    const handlePress = () => {
      if (selectable) setSelected(!selectedState);
      onPress?.();
    };

    // M3 pads an icon-bearing side tighter than a text side; the Android skin opts
    // in via `sidePadding` and the shell resolves the per-side insets here. The
    // selected checkmark and the remove button count as icons on their sides.
    const hasLeading = icon != null || selectedCheck != null;
    const hasTrailing = trailing != null || onRemove != null;

    const chrome: StyleProp<ViewStyle> = [
      skin.base,
      {
        backgroundColor: appearance.bg,
        // A selected M3 filter chip drops its outline (the fill carries the
        // state); the borderWidth stays so the box doesn't shift between states.
        borderColor: selectedCheck != null ? "transparent" : appearance.border,
      },
    ];
    const liquid = surfaced && !staticMaterial;
    const container: StyleProp<ViewStyle> = [
      surfaced || theme.increasedContrast ? paneStyle(theme, chrome) : chrome,
      skin.sidePadding
        ? {
            paddingStart: hasLeading ? skin.sidePadding.icon : skin.sidePadding.text,
            paddingEnd: hasTrailing ? skin.sidePadding.icon : skin.sidePadding.text,
          }
        : null,
      disabled && !liquid ? { opacity: 0.5 } : null,
      hug,
      style,
    ];

    // Auto-tint a leading/trailing `<Icon />` to the chip's label color so a bare
    // `<Icon check />` matches its chip's hue without the caller threading the color.
    // An Icon that sets its own `color` (or a semantic color boolean, which wins
    // inside Icon) keeps it; a non-Icon node (an Avatar) ignores the injected color.
    const tint = (node: ReactNode): ReactNode =>
      isValidElement(node)
        ? cloneElement(node as ReactElement<Record<string, unknown>>, {
            color: (node.props as Record<string, unknown>).color ?? appearance.text,
          })
        : node;

    // The chip's content minus the remove control: the leading check/icon, the
    // label, and any trailing element.
    const pane = surfaced ? <GlassPane static={staticMaterial} layer="control" shape={skin.base} tint={appearance.glassTint} brand={appearance.brand} interactive={!staticMaterial && !disabled} /> : null;
    const bodyContent = (
      <>
        {selectedCheck != null ? (
          // The M3 selected filter chip's leading checkmark, riding the label
          // color. Decorative: the Pressable already reports the selected state
          // (accessibilityState.selected / aria-pressed).
          <Icon check decorative size={selectedCheck} color={appearance.text} />
        ) : (
          tint(icon)
        )}
        {children != null ? (
          <Text style={[skin.labelType, { color: appearance.text }]}>
            {children}
          </Text>
        ) : null}
        {tint(trailing)}
      </>
    );

    // The trailing "×" remove control, a button in its own right.
    const removeButton = onRemove ? (
      <Pressable
        onPress={onRemove}
        disabled={disabled}
        style={liquid && disabled ? { opacity: 0.5 } : null}
        accessibilityRole="button"
        // Name the specific chip, not a bare "Remove", when the label is a string.
        accessibilityLabel={typeof children === "string" ? `Remove ${children}` : "Remove"}
        // Grow the glyph to the platform minimum target (44pt iOS, 48dp
        // Android per the M3 input-chip close target); per-skin values,
        // biased away from the label (left).
        hitSlop={skin.removeHitSlop}
        {...pillClip.measure("remove")}
      >
        {/* The "×" rides the chip's label color so it matches every hue. */}
        <Icon x size={skin.removeSize} color={appearance.text} />
      </Pressable>
    ) : null;

    // Interactive AND removable: the pill is a plain View shell (its appearance and
    // padding), holding TWO sibling buttons — the toggle body and the remove "×" —
    // so neither nests inside the other (a role="button" inside role="button" is
    // invalid on the web, and a nested remove press would bubble to the toggle).
    // The shell's own gap (from skin.base) separates them; the body reuses that gap
    // for its icon/label row. The press feedback + ripple move onto the toggle body.
    if ((onPress || selectable) && onRemove) {
      const bodyGap = (skin.base as { gap?: number }).gap;
      return (
        <View style={container} testID={testID} hitSlop={pillClip.slop({ body: BODY_HIT_SLOP, remove: skin.removeHitSlop })} {...pillClip.measure()}>
          {pane}
          <Pressable
            {...pillClip.measure("body")}
            onPress={handlePress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            accessibilityState={{ selected: isSelected, disabled: !!disabled }}
            aria-pressed={isSelected}
            hitSlop={BODY_HIT_SLOP}
            android_ripple={surfaceRipple(tokens)}
            style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: bodyGap }, liquid && disabled ? { opacity: 0.5 } : null, pressDim(pressed, 0.85)]}
          >
            {bodyContent}
          </Pressable>
          {removeButton}
        </View>
      );
    }

    // Tappable chip (a filter toggle) with no remove control: the whole pill is the
    // Pressable, kept even when disabled so it holds its button role + disabled state.
    if (onPress || selectable) {
      return (
        // The whole-pill ripple is clipped to the rounded chip by this RippleClip parent
        // (Android only). A bounded android_ripple is the pressable's own rectangular-masked
        // background, which its own overflow:"hidden" cannot clip. See src/style/ripple-clip.
        <RippleClip shape={cornerRadii(container)} hitSlop={BODY_HIT_SLOP} style={hug}>
          <Pressable
            onPress={handlePress}
            disabled={disabled}
            testID={testID}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            // Toggle state to AT: the active/selected chip reads as pressed. Announce
            // it natively via accessibilityState.selected and on the web via
            // aria-pressed (RNW drops accessibilityState at the DOM), the dual alias
            // the Switch uses.
            accessibilityState={{ selected: isSelected, disabled: !!disabled }}
            aria-pressed={isSelected}
            // The compact chip is short; grow the whole tap target toward the minimums.
            hitSlop={BODY_HIT_SLOP}
            // Android shows a BOUNDED ripple state layer on press (the M3 chip state layer
            // fills the container), clipped to the rounded outline by the RippleClip parent;
            // iOS/web keep the opacity dim.
            android_ripple={surfaceRipple(tokens)}
            style={({ pressed }) => [container, !liquid ? pressDim(pressed, 0.85) : null]}
          >
            {({ pressed }) => <>
              {pane}
              <View style={[
                { flexDirection: "row", alignItems: "center", gap: skin.base.gap, flexShrink: 1 },
                liquid && disabled ? { opacity: 0.5 } : null,
                liquid ? pressDim(pressed, 0.85) : null,
              ]}>{bodyContent}</View>
            </>}
          </Pressable>
        </RippleClip>
      );
    }

    // Static chip (not tappable): a View; a remove "×" here is a lone button in a
    // non-interactive container, so there is no nesting to resolve.
    return (
      <View style={container} testID={testID} accessibilityLabel={accessibilityLabel} hitSlop={pillClip.slop({ remove: skin.removeHitSlop })} {...pillClip.measure()}>
        {pane}
        {bodyContent}
        {removeButton}
      </View>
    );
  };
}
