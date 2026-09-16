import { Children, cloneElement, isValidElement, useState, type ComponentType, type ReactElement, type ReactNode } from "react";
import { View, Pressable, Text, useTheme, type ColorTokens, type StyleProp, type ViewStyle, type TextStyle, type ImageStyle, type LayoutStyle } from "../../style/index.js";
import { Image } from "../image/image.js";

// A platform-supplied surface for the initials fallback. iOS passes a GlassSurface
// wrapper (real Liquid Glass) via createAvatar; web and Android pass nothing, so the
// fallback stays the original plain, solid box. The glass path never enters the web or
// Android bundle because only avatar.ios imports GlassSurface.
export type AvatarSurface = ComponentType<{ style?: LayoutStyle; testID?: string; children?: ReactNode }>;

// Shared Avatar shell. The structure (a photo when the account has one, falling
// back to one or two initials in white on a deterministic per-name colour), the
// boolean-prop axes, the initials reduction, accessibility, and the optional
// Pressable trigger all live here once; a platform file supplies only its skin
// (rounded-square radius, initials type per size, and press feedback) and calls
// createAvatar.
//
// It is a circle by default (the consistent shape across topbars, identity rows,
// and menus), optionally a rounded square.
//
// Avatar is a "Light" platform treatment: one structure and one shared colour
// model (a per-name fill from the chart palette, neutral muted for the glass
// trigger), with per-OS touches limited to the rounded-square corner radius, the
// initials type, and the press feedback (Android ripple vs. iOS/web opacity dim).
// iOS and Android have no native avatar control (the iOS 27 kit and Material 3
// both lack one; iOS composes one from an image view or the person.crop.circle SF
// Symbol, M3 shows avatars only as content inside lists, chips, and app bars), so
// the skins apply platform conventions to the shared composition rather than
// matching a native widget.

export type Size = "tiny" | "small" | "default" | "large";
export type Shape = "circle" | "rounded";

// The only things a platform skin owns: the rounded-square corner radius, the
// initials type (size / line-height / weight / tracking) per size, the press
// feedback for the optional trigger, and the platform's minimum touch target.
// The circle radius (9999), the box sizes, the per-name fallback colour, and the
// ring outline are platform-neutral and live below.
//
// Android sets `ripple` (an android_ripple config) and leaves `pressedOpacity`
// null; iOS and web set `pressedOpacity` and leave `ripple` null, so the press
// feedback never double-signals.
export interface AvatarSkin {
  /** Corner radius for the `rounded` (square) shape; the circle is always 9999. */
  roundedRadius: number;
  /** Initials type per size (weight / size / line-height / tracking). */
  labelType: Record<Size, TextStyle>;
  /** Android ripple config for the pressable trigger, or null on iOS/web. */
  ripple: ((tokens: ColorTokens) => { color: string; borderless: boolean }) | null;
  /** iOS/web press dim opacity for the pressable trigger, or null on Android. */
  pressedOpacity: number | null;
  /**
   * Minimum effective touch target for the pressable trigger (HIG 44pt on iOS,
   * Material 48dp on Android). The shell pads a smaller visual box out to this
   * with hitSlop, so the tap area meets the platform minimum without changing
   * the rendered size. Inert for pointer input on web.
   */
  minTarget: number;
}

export interface AvatarProps {
  /**
   * The photo. A remote/URI string, or a bundled image module from `require(...)` /
   * `import`. When set (and it loads), the image fills the circle and the initials
   * fallback is hidden; if the image fails to load, it falls back to the initials.
   */
  src?: string | number;
  /** Alias for `src`, for callers that think in terms of a native image uri. */
  uri?: string | number;
  /** Full name. Drives the initials fallback AND the accessible label/alt text. */
  name?: string;
  /** Ready-made initials, used verbatim as the glyph (overrides `name`/`children`). */
  initials?: string;
  /** Same as `name`; the rendered initials when no photo is supplied. */
  children?: ReactNode;
  /**
   * Accessible name for the avatar (the photo's alt text and, when pressable, the
   * button's label). Falls back to `name`, then string `children`. Set it for a
   * photo-only or pressable avatar that has no `name`.
   */
  accessibilityLabel?: string;
  // Size (pick one; default is the 40px row avatar, `tiny` the 24px disc a capsule holds). Precedence: `tiny` > `small` > `large`.
  tiny?: boolean;
  small?: boolean;
  large?: boolean;
  // Shape (pick one; default is a circle).
  circle?: boolean;
  rounded?: boolean;
  /** Separator outline, for avatars that overlap in a stack. */
  ring?: boolean;
  /** When set, the avatar becomes pressable (e.g. a topbar account trigger). */
  onPress?: () => void;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** For layout composition only; overlap/stacking is owned by AvatarGroup, not this prop. */
  style?: LayoutStyle;
}

// Diameter per size: tiny is the disc that sits inside a capsule (the AvatarMenu
// identity pill) or a dense toolbar, small the inline topbar/stack size, default
// the 40px row avatar, large the identity-header size. Platform-neutral.
//
// 24 is the size the web hand-off draws inside its identity pill, and it is what
// keeps the capsule's inset right on every platform: the pill is 32/36/40 tall on
// web/iOS/Android, so a 24 disc leaves the hand-off's 4/6/8 of breathing room
// (measured from the outer edge, the 1px hairline included, since RN sizes a box
// the way `box-sizing: border-box` does).
const BOX: Record<Size, number> = { tiny: 24, small: 28, default: 40, large: 48 };
const CIRCLE_RADIUS = 9999;
// Width of the separator ring (and the matching "+N" chip border) drawn in the
// background color when avatars overlap in a stack. A thin hairline, owned once.
const RING_WIDTH = 1.5;

// Size precedence when more than one is passed: first match wins, smallest first.
function sizeOf(p: AvatarProps): Size {
  if (p.tiny) return "tiny";
  if (p.small) return "small";
  if (p.large) return "large";
  return "default";
}

// Shape precedence when more than one is passed: first match wins.
function shapeOf(p: AvatarProps): Shape {
  if (p.circle) return "circle";
  if (p.rounded) return "rounded";
  return "circle";
}

// Reduce a name or label to one or two initials ("Rachel Chen" -> "RC", "AO" ->
// "AO"), so callers can pass either a full name or ready-made initials.
function initialsFrom(text: string): string {
  const parts = text.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function radiusFor(skin: AvatarSkin, shape: Shape): number {
  return shape === "rounded" ? skin.roundedRadius : CIRCLE_RADIUS;
}

// The categorical fill palette for the initials fallback: the design system's
// chart tokens, a curated set built to keep N things distinct in both light and
// dark. White initials read on all eight. Photos and the neutral glass trigger
// never use it.
const PALETTE_KEYS = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5", "chart-6", "chart-7", "chart-8"] as const;

// Map an identity string (the name, else the initials) to a palette index. A
// stable, deterministic hash (no RNG), so one person always resolves to the same
// colour across sessions, platforms, and re-renders.
function paletteIndexFor(identity: string): number {
  let h = 0;
  for (let i = 0; i < identity.length; i++) h = (h * 31 + identity.charCodeAt(i)) | 0;
  return Math.abs(h) % PALETTE_KEYS.length;
}

function containerStyle(tokens: ColorTokens, skin: AvatarSkin, size: Size, shape: Shape, ring: boolean, background: string): ViewStyle {
  return {
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: background,
    width: BOX[size],
    height: BOX[size],
    borderRadius: radiusFor(skin, shape),
    // No ring-* equivalent in RN; a thin background-colored border is the stand-in
    // for ring ring-background, the separator outline used when avatars overlap.
    ...(ring ? { borderWidth: RING_WIDTH, borderColor: tokens.background } : null),
  };
}

// The photo fills the container exactly; the parent's overflow-hidden clips it to
// the shape (RN clips children to a parent's borderRadius).
function imageStyle(skin: AvatarSkin, shape: Shape): ImageStyle {
  return { width: "100%", height: "100%", borderRadius: radiusFor(skin, shape) };
}

function labelStyle(skin: AvatarSkin, size: Size, foreground: string): TextStyle {
  return { color: foreground, ...skin.labelType[size] };
}

/**
 * Build an Avatar component from a platform skin. `GlassFallback` is an optional,
 * platform-supplied surface for the initials fallback: iOS passes its interactive
 * Liquid Glass surface, web and Android pass nothing (so their box stays solid and
 * their bundles never pull in the glass material).
 */
export function createAvatar(skin: AvatarSkin, GlassFallback?: AvatarSurface) {
  return function Avatar(props: AvatarProps) {
    const { src, uri, name, initials, children, ring, accessibilityLabel, onPress, testID, style } = props;
    const { tokens } = useTheme();
    const size = sizeOf(props);
    const shape = shapeOf(props);
    const photo = src ?? uri;
    // Track a photo that failed to load so we fall back to the initials rather than
    // showing a blank circle (a broken URL, or a relative URL with no host on native).
    // Keyed on the photo value, so swapping in a new photo re-attempts the image.
    const [failedPhoto, setFailedPhoto] = useState<string | number | undefined>(undefined);
    const showPhoto = photo != null && failedPhoto !== photo;
    // The accessible name: an explicit label, else the full name, else string children.
    const label = accessibilityLabel ?? name ?? (typeof children === "string" ? children : undefined);

    // The initials glyph, resolved once. Explicit `initials` win verbatim; otherwise
    // reduce the name / string children. The colour identity keys off the full name
    // when present (so one person maps to one colour), else the initials or children.
    const source = name ?? (typeof children === "string" ? children : "");
    const glyph = showPhoto ? "" : initials ?? (source ? initialsFrom(source) : "");
    const identity = name ?? initials ?? (typeof children === "string" ? children : "");

    // Glass applies ONLY to the initials fallback of a pressable trigger (the topbar
    // account button), and ONLY when a platform supplied a glass surface (iOS). There
    // the interactive Liquid Glass reads as "tappable control", so it stays neutral and
    // the per-name colour is not applied. Content avatars (stacks, identity rows) and
    // every web/Android avatar take the solid coloured path below.
    const useGlass = !showPhoto && GlassFallback != null && onPress != null;

    // The initials fallback carries a deterministic per-name colour with white initials,
    // so people stay distinct in stacks and lists. A photo (the image covers the box),
    // an empty avatar, and the neutral glass trigger keep the muted surface instead.
    const colored = glyph !== "" && !useGlass;
    const background = colored ? tokens[PALETTE_KEYS[paletteIndexFor(identity)]] : tokens.muted;
    const foreground = colored ? tokens["primary-foreground"] : tokens["muted-foreground"];

    const container: StyleProp<ViewStyle> = [containerStyle(tokens, skin, size, shape, !!ring, background), style];

    // Pad the visual box out to the skin's minimum touch target (44pt HIG / 48dp
    // M3) when the avatar is pressable: e.g. the 28px `small` topbar trigger gets
    // hitSlop 8 on iOS (28 + 2*8 = 44) and 10 on Android (28 + 2*10 = 48). The
    // large 48px box already meets both minimums, so its slop resolves to 0.
    const targetSlop = Math.max(0, Math.ceil((skin.minTarget - BOX[size]) / 2));
    const hitSlop = targetSlop > 0 ? targetSlop : undefined;

    let inner: ReactNode;
    if (showPhoto) {
      inner = (
        <Image
          cover
          style={imageStyle(skin, shape)}
          source={typeof photo === "number" ? photo : { uri: photo }}
          onError={() => setFailedPhoto(photo)}
          accessibilityLabel={label}
          aria-label={label}
        />
      );
    } else {
      inner = glyph ? <Text style={labelStyle(skin, size, foreground)}>{glyph}</Text> : null;
    }

    if (!useGlass) {
      if (onPress) {
        return (
          <Pressable
            android_ripple={skin.ripple ? skin.ripple(tokens) : undefined}
            style={({ pressed }) => [container, pressed && skin.pressedOpacity != null ? { opacity: skin.pressedOpacity } : null]}
            onPress={onPress}
            hitSlop={hitSlop}
            testID={testID}
            accessibilityRole="button"
            accessibilityLabel={label}
            aria-label={label}
          >
            {inner}
          </Pressable>
        );
      }
      return <View style={container} testID={testID}>{inner}</View>;
    }

    // iOS initials fallback: the injected GlassSurface owns the sized, shaped surface;
    // its material supplies the fill and, being interactive, its own touch animation. A
    // pressable avatar wraps it in a bare Pressable (the glass itself signals the press,
    // so there is no opacity dim on top of the material's animation).
    const Surface = GlassFallback;
    if (onPress) {
      return (
        <Pressable onPress={onPress} hitSlop={hitSlop} testID={testID} accessibilityRole="button" accessibilityLabel={label} aria-label={label}>
          <Surface style={container}>{inner}</Surface>
        </Pressable>
      );
    }
    return <Surface style={container} testID={testID}>{inner}</Surface>;
  };
}

// AvatarGroup: the overlapping avatar stack, so no call site writes a negative
// `marginLeft` to overlap avatars. It caps the visible avatars at `max`,
// collapses the remainder into a "+N" chip, forwards its size to every child,
// and injects the overlap margin + separator ring internally (the caller's
// Avatars carry no layout style). Co-located with Avatar because it reuses the
// same AvatarSkin, size scale, box, and ring outline.

export type Overlap = "tight" | "snug" | "loose";

// Overlap (negative marginLeft) per size and tightness. The magic negative margin
// is owned here, once, instead of at every call site.
const OVERLAP: Record<Size, Record<Overlap, number>> = {
  tiny: { tight: -11, snug: -7, loose: -3 },
  small: { tight: -13, snug: -8, loose: -3 },
  default: { tight: -16, snug: -10, loose: -5 },
  large: { tight: -20, snug: -13, loose: -7 },
};

export interface AvatarGroupProps {
  /** Avatar elements to stack. */
  children?: ReactNode;
  /** Cap the visible avatars; the remainder collapses into a "+N" chip. */
  max?: number;
  /** Override the total behind the "+N" chip (e.g. a server-known member count). */
  total?: number;
  // Size (pick one; forwarded to every child so the whole stack is uniform). Precedence: `tiny` > `small` > `large`.
  tiny?: boolean;
  small?: boolean;
  large?: boolean;
  // Overlap tightness (pick one; default `tight`). Precedence loose > snug > tight.
  tight?: boolean;
  snug?: boolean;
  loose?: boolean;
  /** Accessible name for the whole group (e.g. "8 members"). */
  accessibilityLabel?: string;
  /** E2E hook forwarded to the root element. */
  testID?: string;
}

// Overlap precedence when more than one is passed: first match wins.
function overlapOf(p: AvatarGroupProps): Overlap {
  if (p.loose) return "loose";
  if (p.snug) return "snug";
  return "tight";
}

/** Build an AvatarGroup from the same platform skin as Avatar. */
export function createAvatarGroup(skin: AvatarSkin) {
  return function AvatarGroup(props: AvatarGroupProps) {
    const { children, max, total, tiny, small, large, accessibilityLabel, testID } = props;
    const { tokens } = useTheme();
    const size = sizeOf(props);
    const overlap = OVERLAP[size][overlapOf(props)];

    const items = Children.toArray(children).filter(isValidElement) as ReactElement<AvatarProps>[];
    const cap = max ?? items.length;
    const visible = items.slice(0, cap);
    const totalCount = total ?? items.length;
    const hidden = totalCount - visible.length;

    // Size is forwarded only when the group sets one, so a child keeps its own
    // size otherwise. Overlap + ring are always injected, so the caller's
    // Avatars never carry layout style.
    const sizeProps: Partial<AvatarProps> = tiny ? { tiny: true } : small ? { small: true } : large ? { large: true } : {};

    return (
      <View
        style={{ flexDirection: "row", alignItems: "center" }}
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        aria-label={accessibilityLabel}
      >
        {visible.map((child, i) =>
          cloneElement(child, {
            key: child.key ?? i,
            ...sizeProps,
            ring: true,
            style: [child.props.style, i > 0 ? { marginStart: overlap } : null],
          }),
        )}
        {hidden > 0 ? (
          <View
            style={{
              flexShrink: 0,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              backgroundColor: tokens.muted,
              width: BOX[size],
              height: BOX[size],
              borderRadius: CIRCLE_RADIUS,
              borderWidth: RING_WIDTH,
              borderColor: tokens.background,
              marginStart: visible.length > 0 ? overlap : 0,
            }}
          >
            <Text style={{ color: tokens["muted-foreground"], ...skin.labelType[size] }}>+{hidden}</Text>
          </View>
        ) : null}
      </View>
    );
  };
}
