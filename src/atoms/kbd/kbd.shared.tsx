import { Fragment, type ReactNode } from "react";
import { View, Text, useHugStyle, useTheme, type ColorTokens, type StyleProp, type ViewStyle, type TextStyle, type LayoutStyle } from "../../style/index.js";

// Shared Kbd shell. Kbd is a keyboard shortcut indicator: a small bordered, slightly
// raised key cap with monospace-ish small text. A single key comes from `children`
// (<Kbd>Esc</Kbd>); a whole shortcut comes from `keys` (<Kbd keys="⌘ K" />), which
// renders one cap per key with a separator between them so the component owns the
// composition instead of pushing a Row + N caps + N-1 separators onto every call site.
//
// The cap has one fixed look (no size or intent variants), so there are no boolean
// axes to map: the structure, accessibility, and token-driven colors live here once,
// and a platform file supplies only its skin (cap geometry, label type, chord row)
// and calls createKbd.
//
// Kbd is a "Shared" platform treatment: neither iOS (no native keyboard-key cap
// element) nor Material 3 (no keyboard-key cap component) has a native control, so all
// three platforms render ONE look. The per-OS skins reference the same values as the
// web skin; only the cross-platform shape and token-driven surface remain.

export interface KbdSkin {
  /** The key-cap box geometry: a centered row, fixed cap height, min width, radius, border width, padding. */
  capBox: ViewStyle;
  /** The key label type (size / line-height / weight / tracking). */
  labelType: TextStyle;
  /** The chord wrapper: a centered row holding each cap and its separator. */
  chordRow: ViewStyle;
}

export interface KbdProps {
  /** A single key label, rendered as one cap. Ignored when `keys` is set. */
  children?: ReactNode;
  /**
   * A multi-key shortcut, rendered as one cap per key with a separator between them.
   * Pass a whitespace-separated string (`"⌘ K"`) or an array (`["⌘", "K"]`). A single
   * entry renders one cap, identical to passing that key as `children`. When set, `keys`
   * takes precedence over `children`.
   */
  keys?: string | string[];
  /**
   * Render a key SEQUENCE (press one, then the next), separating caps with a gap
   * instead of the default `+` combo joiner. Only affects the `keys` form.
   */
  sequence?: boolean;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

// The cap surface: the muted fill and the hairline border color (platform-neutral,
// token-driven so the cap follows light/dark; it paints tokens.muted, which stays
// SOLID under glass, since only the functional/popover layer frosts).
function capSurface(tokens: ColorTokens): ViewStyle {
  return { borderColor: tokens.border, backgroundColor: tokens.muted };
}

// The label color: muted foreground (platform-neutral, token-driven). The chord
// separator ("+") reuses this so it matches the key labels.
function labelColor(tokens: ColorTokens): TextStyle {
  return { color: tokens["muted-foreground"] };
}

// A key sequence gets a touch more air between caps than a combo, so the "then" pause
// reads (a combo keeps its caps snug around the "+"). Internal only.
const SEQUENCE_GAP: ViewStyle = { gap: 8 };

/** Normalize `keys` into a clean list of key labels, or null when unset/empty. */
function keyList(keys: string | string[] | undefined): string[] | null {
  if (keys == null) return null;
  const list = (Array.isArray(keys) ? keys : keys.split(/\s+/)).map((k) => `${k}`.trim()).filter(Boolean);
  return list.length > 0 ? list : null;
}

/** Build a Kbd component from a platform skin. */
export function createKbd(skin: KbdSkin) {
  return function Kbd({ children, keys, sequence, testID, style }: KbdProps) {
    const { tokens } = useTheme();
    // HUG: a keycap keeps its content width inside a stretching Column.
    const hug = useHugStyle();

    const list = keyList(keys);

    // Single cap: a 1-key `keys` list, or `children`. Renders exactly as before.
    if (list == null || list.length === 1) {
      const label = list != null ? list[0] : children;
      return (
        <View testID={testID} style={[skin.capBox, capSurface(tokens), hug, style]}>
          {label != null ? <Text style={[skin.labelType, labelColor(tokens)]}>{label}</Text> : null}
        </View>
      );
    }

    // Chord: one cap per key with a separator between them. The whole shortcut reads
    // as a single accessible name (e.g. "⌘+K"), so a screen reader announces the
    // shortcut once instead of each cap in turn; the caps and separators are hidden
    // from the tree as decorative.
    const name = list.join(sequence ? " " : "+");
    return (
      <View
        testID={testID}
        // The chord is announced once, as a unit, rather than cap by cap. That needs a
        // role the name can sit on: react-native-web maps accessibilityRole="text" to
        // no DOM role at all, so the aria-label was landing on a generic div, which
        // ARIA prohibits naming. img is the role for a group of glyphs read as one
        // thing, and is what Swatch and the named status Badge use for the same reason.
        accessibilityRole="image"
        role="img"
        accessibilityLabel={name}
        aria-label={name}
        style={[skin.chordRow, sequence ? SEQUENCE_GAP : null, hug, style]}
      >
        {list.map((key, i) => (
          <Fragment key={i}>
            {i > 0 && !sequence ? (
              <Text
                style={[skin.labelType, labelColor(tokens)]}
                importantForAccessibility="no-hide-descendants"
                aria-hidden
              >
                +
              </Text>
            ) : null}
            <View
              style={[skin.capBox, capSurface(tokens)]}
              importantForAccessibility="no-hide-descendants"
              aria-hidden
            >
              <Text style={[skin.labelType, labelColor(tokens)]}>{key}</Text>
            </View>
          </Fragment>
        ))}
      </View>
    );
  };
}
