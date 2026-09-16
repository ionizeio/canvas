import type RNQRCodeType from "react-native-qrcode-svg";
import { View, useHugStyle, type StyleProp, type ViewStyle } from "../../style/index.js";

// react-native-qrcode-svg is an OPTIONAL peer (it drags a large text-encoding
// polyfill), so it is loaded with a guarded literal require: consumers who never
// render a QRCode skip the install AND the bundle weight; consumers who use it
// install the peer. When absent, QRCode renders its labeled frame empty and
// warns once in dev.
declare const require: (id: string) => unknown;
let RNQRCode: typeof RNQRCodeType | undefined;
try {
  // Directly in the try block: an intervening `if` makes Metro treat this as
  // a REQUIRED dependency. See src/organisms/backdrop/skia-runtime.ts.
  const mod = require("react-native-qrcode-svg") as { default?: typeof RNQRCodeType } | typeof RNQRCodeType;
  RNQRCode = (mod as { default?: typeof RNQRCodeType }).default ?? (mod as typeof RNQRCodeType);
} catch {
  RNQRCode = undefined;
}
let warnedMissing = false;

// Dev-mode check that survives every runtime: Metro defines __DEV__, web
// bundlers define process.env.NODE_ENV, and anything else counts as dev (a
// missing-peer warning is more useful than silence in unknown environments).
function isDevMode(): boolean {
  try {
    if (typeof __DEV__ !== "undefined") return __DEV__;
  } catch { /* not defined */ }
  try {
    return process.env.NODE_ENV !== "production";
  } catch {
    return true;
  }
}

// Shared QRCode shell. The structure (a fixed dark-on-white card wrapping the
// react-native-qrcode-svg renderer) and the boolean-prop size axis live here once;
// a platform file supplies only its skin (the card shape + the module/field colors)
// and calls createQRCode.
//
// QRCode is built on react-native-qrcode-svg, which draws with react-native-svg, so
// the same code renders identically on iOS, Android, and the web. The look is fixed
// dark-on-white inside a white card because a QR must stay high-contrast to scan
// reliably; unlike most components it does not follow the theme.
//
// QRCode is a "Shared" platform treatment: there is no native QR control to match on
// any platform, and contrast requirements forbid per-OS restyling, so the iOS, Android,
// and Web skins are identical (the three skin exports point at the same values).
//
// Boolean-prop API: a single size axis (first match wins, default medium).
//
//   <QRCode value="https://example.com" />     the medium 140px code
//   <QRCode value={url} small />                a compact 96px code
//   <QRCode value={url} large />                a large 200px code

export interface QRCodeSkin {
  /** The card shape: quiet-zone padding, radius, and white field around the code. */
  frame: ViewStyle;
  /** Near-black module color (the dark squares). Fixed for scan contrast. */
  moduleColor: string;
  /** The light field behind the modules. Fixed for scan contrast. */
  fieldColor: string;
}

export interface QRCodeProps {
  /** The string to encode: a URL, plain text, a token, etc. */
  value: string;
  // Size axis (pick one; default is the medium 140px code).
  /** A compact 96px code. */
  small?: boolean;
  /** A large 200px code. */
  large?: boolean;
  /**
   * Spoken equivalent for screen readers. A QR code is camera-only content, so
   * without a label assistive tech announces nothing. Defaults to
   * `QR code encoding ${value}`; pass a generic label (e.g. "QR code") when
   * surfacing the raw value is undesirable.
   */
  accessibilityLabel?: string;
  /** E2E hook forwarded to the root element. */
  testID?: string;
  /** Outer layout composition only (width/flex within a parent), never a restyle hook. */
  style?: StyleProp<ViewStyle>;
}

// First-match size precedence; defaults to the medium code.
function sizeOf(p: QRCodeProps): number {
  if (p.small) return 96;
  if (p.large) return 200;
  return 140;
}

export function createQRCode(skin: QRCodeSkin) {
  return function QRCode(props: QRCodeProps) {
    const { value, accessibilityLabel, testID, style } = props;
    // The QR draws as a bare SVG of rects (an <svg> of rects on web via RNW); without
    // a label assistive tech announces nothing, not even that a code is present. Expose
    // a spoken equivalent of the otherwise camera-only content. aria-label is added for
    // RNW, which does not forward accessibilityLabel as the web image's accessible name.
    const label = accessibilityLabel ?? `QR code encoding ${value}`;
    // HUG: the card keeps the code's size inside a stretching Column.
    const hug = useHugStyle();
    return (
      <View
        style={[skin.frame, hug, style]}
        testID={testID}
        accessible
        accessibilityRole="image"
        role="img"
        accessibilityLabel={label}
        aria-label={label}
      >
        {RNQRCode ? (
          // react-native-qrcode-svg throws on an empty string, so fall back to a space.
          <RNQRCode value={value || " "} size={sizeOf(props)} color={skin.moduleColor} backgroundColor={skin.fieldColor} />
        ) : (
          // Optional peer not installed: keep the labeled frame (sized like the code)
          // so layout holds, and tell the developer what to install.
          (() => {
            if (isDevMode() && !warnedMissing) {
              warnedMissing = true;
              console.warn(
                "[canvas] <QRCode /> requires the optional peer dependency react-native-qrcode-svg. Install it to render QR codes.",
              );
            }
            return <View style={{ width: sizeOf(props), height: sizeOf(props) }} />;
          })()
        )}
      </View>
    );
  };
}
