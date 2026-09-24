import { type ImageStyle, type ViewStyle } from "react-native";
import { type ColorTokens } from "../../style/index.js";
import { TOUCH_TARGET } from "../../style/touch-target.js";

// Per-OS Video skins. The picture is letterboxed on black on every platform and in
// every theme, the convention of every video surface (a clip's own dark frames would
// otherwise bleed into a light page). On the web the control bar sits under the
// picture as a card row with a hairline above it (the owner's call on 2026-09-24, over
// a pill floating on the picture: the bar never covers the clip); the frame clips both
// to the corner radius.
//
// iOS and Android hand `controls` to the platform's own player controls, so their
// skins never draw the bar; they share the web frame and differ only in the inline
// control's minimum tap target.

export interface VideoSkin {
  /** The whole player: clips the picture and the bar to the corner radius. */
  frame: ViewStyle;
  /** The picture area, sized by the clip's aspect ratio and letterboxed on black. */
  picture: ViewStyle;
  /** A layer covering the picture: the video surface and the poster. */
  layer: ImageStyle;
  /** The inline control covering the picture; centers the play emblem and the spinner. */
  overlay: ViewStyle;
  /** The web control bar under the picture: a card row with a hairline above it. */
  bar: (tokens: ColorTokens) => ViewStyle;
  /** Minimum tap target of the inline control; null on the pointer-first web. */
  minTarget: number | null;
}

// Covers the whole picture. Sized by width and height rather than by pinning all four
// edges: on the web the video surface is a `<video>`, a replaced element, which keeps
// the clip's own pixel size when only its edges are pinned and would show a cropped
// corner of the clip.
const fillPicture: ImageStyle = { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" };

const frame: ViewStyle = { overflow: "hidden" };

const picture: ViewStyle = {
  width: "100%",
  overflow: "hidden",
  backgroundColor: "#000000",
};

const overlay: ViewStyle = {
  ...fillPicture,
  alignItems: "center",
  justifyContent: "center",
};

const bar = (tokens: ColorTokens): ViewStyle => ({
  borderTopWidth: 1,
  borderTopColor: tokens.border,
  backgroundColor: tokens.card,
  paddingHorizontal: 8,
  paddingVertical: 4,
});

export const webSkin: VideoSkin = {
  frame,
  picture,
  layer: fillPicture,
  overlay,
  bar,
  minTarget: null,
};

export const iosSkin: VideoSkin = { ...webSkin, minTarget: TOUCH_TARGET.ios };
export const androidSkin: VideoSkin = { ...webSkin, minTarget: TOUCH_TARGET.android };
