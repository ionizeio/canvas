// A stable native content plane, sampled only by sibling outlet surfaces.
// The optional integration owns capture demand. Modern Expo targets cannot stop
// recording while preserving their children, so absent integration is solid.
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import type { GlassBlurTargetHostProps } from "./glass-surface.shared.js";
import { NativePaintHost, NativeCaptureHost, nativeCaptureAvailable, useCaptureAvailability } from "./capture-runtime.js";
import { captureTargetOwner, useCaptureEnabled } from "./capture-target.js";

export const glassBlurTargetAvailable = nativeCaptureAvailable;

export function blurTargetMountable(style: StyleProp<ViewStyle>): boolean {
  if (!nativeCaptureAvailable) return false;
  const flat = StyleSheet.flatten(style) ?? {};
  const grow = flat.flexGrow ?? (typeof flat.flex === "number" && flat.flex > 0 ? flat.flex : 0);
  return typeof grow === "number" && grow > 0;
}

// The style keys that arrange the provider's CHILDREN, as opposed to sizing or
// positioning the wrapper box itself. Splitting the single wrapper in two must not
// change layout, so the outer box keeps every box-level key (how the provider sits
// in its parent, where the outlet's absolute layer anchors, and all authored
// paint). The target owns only child arrangement. Native capture samples the
// paint owner's Drawable without visibly painting it again. `gap: 28` keeps
// spacing the same nodes it spaced in the single-View structure.
const CHILD_KEYS = new Set<string>([
  "flexDirection", "flexWrap", "justifyContent", "alignItems", "alignContent",
  "gap", "rowGap", "columnGap",
  "padding", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight",
  "paddingStart", "paddingEnd", "paddingHorizontal", "paddingVertical",
  "direction",
]);

// The target sizes exactly like the outer box: grow into a flex-sized wrapper (an
// app root's flex: 1), size by content when the wrapper is content-sized (a docs
// page or stage). The content layer MIRRORS the consumer's flex longhands rather
// than forcing a fill: a hardcoded flexShrink 1 let Fabric's ScrollView content
// measurement shrink the BlurTargetView to the viewport, capping every docs
// page's scroll range at ~one screen on Android. Longhands with an explicit
// "auto" basis , react-native-web rewrites the `flex` shorthand's basis to 0%,
// which collapses content-sized hosts, and native keeps the longhand form for
// parity.
const TARGET_FILL: ViewStyle = { flexGrow: 1, flexShrink: 1, flexBasis: "auto" };

export function splitHostStyle(style: StyleProp<ViewStyle>): { box: ViewStyle; content: ViewStyle } {
  const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, unknown>;
  const box: Record<string, unknown> = {};
  const hasLonghands = flat.flexGrow != null || flat.flexShrink != null || flat.flexBasis != null;
  const content: Record<string, unknown> = hasLonghands
    ? {
        flexGrow: flat.flexGrow ?? 0,
        flexShrink: flat.flexShrink ?? 0,
        flexBasis: flat.flexBasis ?? "auto",
      }
    : { ...TARGET_FILL };
  for (const [key, value] of Object.entries(flat)) {
    if (value == null) continue;
    if (CHILD_KEYS.has(key)) content[key] = value;
    else box[key] = value;
  }
  return { box: box as ViewStyle, content: content as ViewStyle };
}

export function GlassBlurTargetHost({ style, targetRef, outlet, children }: GlassBlurTargetHostProps) {
  const enabled = useCaptureEnabled(targetRef);
  const onAvailabilityChange = useCaptureAvailability(targetRef);
  if (!NativePaintHost || !NativeCaptureHost || !blurTargetMountable(style)) {
    return <View style={style}>{children}{outlet}</View>;
  }
  const { box, content } = splitHostStyle(style);
  return (
    <NativePaintHost style={box}>
      <NativeCaptureHost ref={captureTargetOwner(targetRef)?.attach ?? targetRef} onAvailabilityChange={onAvailabilityChange} captureEnabled={enabled} style={content}>
        {children}
      </NativeCaptureHost>
      {outlet}
    </NativePaintHost>
  );
}
