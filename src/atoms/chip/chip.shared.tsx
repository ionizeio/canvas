import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { View, Text, Pressable, RippleClip, cornerRadii, useHugStyle, useControllableState, surfaceRipple, pressDim, palette, statusHues, HUE_WASH, type Hue, type ColorTokens, type LayoutStyle, type StyleProp, type ViewStyle, type TextStyle, GlassPane, paneStyle, isGlass, alpha } from "../../style/index.js";
import { useMaterialTheme } from "../../style/glass-surface/use-material-theme.js";
import { Icon } from "../icon/icon.js";

// Shared Chip shell. The interactive/removable pill, so no call site hand-composes
// a `borderRadius + backgroundColor + padding` Pressable to build a filter chip,
// tag, or token. A Chip carries an optional leading icon and label, becomes
// tappable with `onPress` (a filter toggle), and grows a trailing "×" remove
// button with `onRemove`.
//
// A chip is a LOW-emphasis tag, not a call to action, so it never wears a saturated
// button fill: every chip renders a SOFT tint (a light wash + subtle border + strong
// text; the reverse in dark), the same recipe Badge's status pills use, so the two
// read as one system. Two orthogonal axes drive the look:
//   - Color: the tint's hue. A semantic status (success / warning / error / info /
//     neutral) OR a free-form palette hue (red … rose, gray). Omit for the neutral tag.
//   - Emphasis: `outline` drops the fill for a border-only chip; `primary` is the
//     brand-accent (indigo) tint and the state a selectable chip lights up to.
//
// Chip is a "Light" platform treatment: one structure and semantic colors (here),
// with the per-OS look in the skin: label type, shape, and the Android M3 anatomy
// (32dp sizing, icon-side insets, the selected filter-chip checkmark).

// Chromatic hues backed by the Tailwind palette; each renders a soft tinted tag.
// The union itself lives beside `palette` in the style layer, since Badge, Alert and
// this file all speak it.
export type { Hue };

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
   *  Accordion chevron). Omit on iOS/web: their selected look is the tint swap. */
  selectedCheckSize?: number;
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
   * it lights up to the active tint (its color's fill, or the brand `primary`
   * when the chip has no color) and back. Selection is controlled via `selected`,
   * uncontrolled via `defaultSelected`. Give it an `outline` base so the unselected
   * (border-only) and selected (filled) states read apart.
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
  // brand-accent (indigo) tint and the selectable "on" look. `secondary` is the
  // default neutral tag (kept for back-compat; same as passing no color).
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
// plus the hue wash a coloured chip's glass pane takes under glass (a neutral or
// outline chip leaves it unset and inherits the surrounding surface).
interface Appearance {
  bg: string;
  border: string;
  text: string;
  glassTint?: string;
}

// The chosen hue from the color axis. Status names alias a hue (matching Badge);
// literal hues resolve to themselves. `neutral`/`gray` carry no hue but flag the
// muted-gray tag. Status names are scanned first so a semantic intent wins.
function colorOf(p: ChipProps): { hue: Hue | null; mutedGray: boolean } {
  // The status names resolve through the shared map, so a success chip and a
  // success badge cannot end up on different greens.
  if (p.success) return { hue: statusHues.success, mutedGray: false };
  if (p.warning) return { hue: statusHues.warning, mutedGray: false };
  if (p.destructive || p.error) return { hue: statusHues.error, mutedGray: false };
  if (p.info) return { hue: statusHues.info, mutedGray: false };
  if (p.neutral) return { hue: null, mutedGray: true };
  for (const h of HUES) if ((p as Record<string, unknown>)[h]) return { hue: h, mutedGray: false };
  if (p.gray) return { hue: null, mutedGray: true };
  return { hue: null, mutedGray: false };
}

// A chromatic hue's soft tint: a light 50 fill + 200 border + 700 text in light, a
// deep 950 fill + 800 border + 400 text in dark (Badge's status recipe). `outline`
// drops the fill for a border-only chip in the same hue.
//
// Under glass the soft fill becomes a WASH of the hue's mid step under the material
// (the Alert's recipe) and the label steps one deeper (800 in light, 300 in dark): the
// wash over the page, a content pane or a control puck is darker than the 50/950 fill,
// and the deeper ink is what keeps every hue's label at 4.5:1 there (the 700/400 ink
// drops to ~3.4:1 on orange and indigo; test/glass-controls.test.tsx pins the floor).
function hueTint(hue: Hue, dark: boolean, outline: boolean, glass: boolean): Appearance {
  const text = glass ? (dark ? palette[`${hue}-300`] : palette[`${hue}-800`]) : dark ? palette[`${hue}-400`] : palette[`${hue}-700`];
  if (outline) {
    return dark
      ? { bg: "transparent", border: palette[`${hue}-700`], text }
      : { bg: "transparent", border: palette[`${hue}-300`], text };
  }
  const glassTint = glass ? alpha(palette[`${hue}-500`], dark ? HUE_WASH.dark : HUE_WASH.light) : undefined;
  return dark
    ? { bg: palette[`${hue}-950`], border: palette[`${hue}-800`], text, glassTint }
    : { bg: palette[`${hue}-50`], border: palette[`${hue}-200`], text, glassTint };
}

// The neutral (uncolored) chip: the default soft-secondary tag, a muted-gray tag
// (`gray`/`neutral`), or a border-only outline. Neutral stays on the scheme-aware
// semantic tokens (always legible) rather than the fixed palette.
function neutralTint(tokens: ColorTokens, outline: boolean, mutedGray: boolean): Appearance {
  if (outline) return { bg: "transparent", border: tokens.border, text: tokens.foreground };
  if (mutedGray) return { bg: tokens.muted, border: tokens.border, text: tokens["muted-foreground"] };
  return { bg: tokens.secondary, border: tokens.border, text: tokens["secondary-foreground"] };
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
    // behind its content (a coloured chip washes it with its hue), and the pill drops
    // its fill and hairline (the pane's material and rim carry them). The pressable
    // shell keeps its tap, ripple and dim over it.
    const glass = isGlass(theme);
    // HUG: content width inside a stretching Column, content-sized in a Row.
    const hug = useHugStyle();

    // A selectable chip is a filter toggle that owns its selected state (controlled
    // via `selected`, uncontrolled via `defaultSelected`). It is "selectable" when
    // asked explicitly or when any selection prop is passed.
    const [selectedState, setSelected] = useControllableState<boolean>(
      props.selected,
      props.defaultSelected ?? false,
      props.onSelectedChange,
    );

    const { hue, mutedGray } = colorOf(props);
    const accent = props.primary === true; // brand-accent (indigo) tone / the "active" look
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

    // Resolve the paint. A selected filter chip lights up to a filled tint of its
    // color (or the brand primary when it has none); otherwise the color axis + `outline`
    // pick the tint, and `primary` maps to the indigo accent.
    let appearance: Appearance;
    if (selectedActive) {
      appearance = hueTint(hue ?? "indigo", dark, false, glass);
    } else if (hue) {
      appearance = hueTint(hue, dark, outline, glass);
    } else if (accent) {
      appearance = hueTint("indigo", dark, outline, glass);
    } else {
      appearance = neutralTint(tokens, outline, mutedGray);
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
    const pane = surfaced ? <GlassPane static={staticMaterial} layer="control" shape={skin.base} tint={appearance.glassTint} interactive={!staticMaterial && !disabled} /> : null;
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
        <View style={container} testID={testID}>
          {pane}
          <Pressable
            onPress={handlePress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            accessibilityState={{ selected: isSelected, disabled: !!disabled }}
            aria-pressed={isSelected}
            hitSlop={11}
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
        <RippleClip shape={cornerRadii(container)} style={hug}>
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
            // The compact chip is short (a ~20px pill on web/iOS, a 32dp M3 chip on
            // Android); grow the whole tap target toward the 44pt/48dp minimums.
            hitSlop={11}
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
      <View style={container} testID={testID} accessibilityLabel={accessibilityLabel}>
        {pane}
        {bodyContent}
        {removeButton}
      </View>
    );
  };
}
