import { type ViewStyle } from "react-native";
import { type QRCodeSkin } from "./qrcode.shared.js";

// Per-OS QRCode skins. QRCode is a "Shared" treatment: there is no native QR control on
// any platform, and a scannable code must stay high-contrast (dark modules on a white
// field) whatever the app's light/dark theme — the same reason Apple and Google always
// present QR codes on white. So the card shape and the module/field colors are fixed and
// identical on iOS, Android, and the web; the three skin exports point at the same values.

// A fixed white card with a quiet-zone of padding around the code, regardless of theme.
// HUG via the shell's `useHugStyle()`, not a static alignSelf.
const frame: ViewStyle = {
  padding: 12,
  borderRadius: 12,
  backgroundColor: "#ffffff",
};

// Near-black modules on a white field: maximum contrast for reliable scanning.
const MODULE_COLOR = "#0a0a0a";
const FIELD_COLOR = "#ffffff";

export const webSkin: QRCodeSkin = {
  frame,
  moduleColor: MODULE_COLOR,
  fieldColor: FIELD_COLOR,
};

// Shared treatment: iOS and Android use the SAME look as the web base (a QR code has no
// native per-OS variant, and contrast requirements forbid restyling it per platform).
export const iosSkin: QRCodeSkin = webSkin;
export const androidSkin: QRCodeSkin = webSkin;
