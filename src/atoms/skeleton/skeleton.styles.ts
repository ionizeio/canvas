import { shape } from "../../style/index.js";
import { type SkeletonSkin } from "./skeleton.shared.js";

// Per-OS Skeleton skins. Skeleton is a "Shared" treatment: neither iOS nor
// Material 3 ships a real skeleton control (iOS uses redacted placeholder content,
// M3 documents skeleton loaders only as a motion transition pattern), so there is
// no native shape to match and the look is identical on every platform. The skin
// carries only the placeholder corner radii; the iOS and Android skins reference
// the web skin verbatim, so the three columns stay byte-identical.
//
// Radii match the Riskora web look: a 6px line placeholder reads as plain content, a
// 12px button placeholder matches the control corner, a `rounded-full` avatar mirrors
// the avatar circle, and a card-cornered surface matches the real card.

export const webSkin: SkeletonSkin = {
  lineRadius: 6,
  buttonRadius: 12,
  avatarRadius: 9999,
  cardRadius: shape.web.card,
};

// Shared treatment: identical to web on every platform (no native skeleton to match).
export const iosSkin: SkeletonSkin = webSkin;
export const androidSkin: SkeletonSkin = webSkin;
