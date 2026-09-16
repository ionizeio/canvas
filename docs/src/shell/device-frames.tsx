import { useState } from "react";
import type { ReactNode } from "react";
import { View, Text, useTheme } from "@nannier-com/canvas";
import { sans } from "../ui/fonts";

// The hardware around each landing-hero capture. The screenshots are pure screen grabs
// (status bar, app bar, tab bar and all), so the bezel, the corner radii and the camera
// cutouts live here as drawn chrome rather than being baked into 114 images: it stays
// crisp at any column width, follows the theme, and adds no image weight.
//
// Every proportion is a fraction of the frame's own measured width, so one spec scales
// from the phone-stacked layout up to the three-column desktop hero.

export type DeviceVariant = "ios" | "android" | "web";

// One bezel width for all three so the outer frames are identical in size; only the
// corner radii differ, which is the actual difference between the two handsets.
const BEZEL = 0.027;
const SPEC: Record<DeviceVariant, { body: number; screen: number }> = {
  // iPhone 17 Pro: very round corners, Dynamic Island.
  ios: { body: 0.15, screen: 0.12 },
  // Pixel 10 Pro: marginally squarer body, centred hole-punch camera.
  android: { body: 0.12, screen: 0.095 },
  // A neutral handset showing mobile Chrome; matches the Pixel geometry.
  web: { body: 0.12, screen: 0.095 },
};

// The chassis is deliberately NOT a theme token: real hardware is graphite in both light
// and dark, and keying it to `foreground` turned the bezel white on the dark site.
const CHASSIS = "#17171a";
const CHASSIS_RIM = "rgba(255,255,255,0.16)";

// Mobile Chrome's toolbar, as a share of the screen's height.
const CHROME_BAR = 0.062;

export function DeviceFrame({
  variant,
  aspect,
  label,
  children,
}: {
  variant: DeviceVariant;
  /** Screen aspect (width / height) of the capture inside the frame. */
  aspect: number;
  /** Accessible name for the whole device, e.g. "iPhone 17 Pro". */
  label?: string;
  children: ReactNode;
}) {
  const { tokens } = useTheme();
  const [w, setW] = useState(0);
  const s = SPEC[variant];

  const bezel = w * BEZEL;
  const bodyRadius = w * s.body;
  const screenRadius = w * s.screen;
  // The screen is the frame minus its bezel on both sides.
  const screenW = Math.max(0, w - bezel * 2);
  const screenH = aspect > 0 ? screenW / aspect : 0;

  return (
    <View
      accessibilityLabel={label}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={{
        width: "100%",
        padding: bezel,
        borderRadius: bodyRadius,
        backgroundColor: CHASSIS,
        // A hairline highlight reads as the machined edge of the chassis.
        borderWidth: 1,
        borderColor: CHASSIS_RIM,
      }}
    >
      <View style={{ width: "100%", aspectRatio: aspect, borderRadius: screenRadius, overflow: "hidden", backgroundColor: tokens.card }}>
        <View style={{ flex: 1, overflow: "hidden" }}>{children}</View>

        {/* Mobile Chrome's toolbar, overlaid on the top of the screen rather than taking
            layout space, so all three panes keep an identical full-screen image area. */}
        {variant === "web" ? <ChromeBar height={screenH * CHROME_BAR} /> : null}

        {/* Camera hardware, drawn over the screen the way it physically sits. */}
        {variant === "ios" ? (
          <View
            style={{
              position: "absolute",
              top: screenH * 0.014,
              alignSelf: "center",
              width: screenW * 0.3,
              height: screenH * 0.0165,
              borderRadius: 999,
              backgroundColor: "#000",
            }}
          />
        ) : null}
        {variant === "android" ? (
          <View
            style={{
              position: "absolute",
              top: screenH * 0.012,
              alignSelf: "center",
              width: screenW * 0.05,
              height: screenW * 0.05,
              borderRadius: 999,
              backgroundColor: "#000",
            }}
          />
        ) : null}
      </View>
    </View>
  );
}

// The browser strip: an omnibox pill with the docs host, flanked by the usual affordances.
function ChromeBar({ height }: { height: number }) {
  const { tokens } = useTheme();
  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height,
        flexDirection: "row",
        alignItems: "center",
        gap: height * 0.22,
        paddingHorizontal: height * 0.3,
        backgroundColor: tokens.muted,
        borderBottomWidth: 1,
        borderColor: tokens.border,
      }}
    >
      <View
        style={{
          flex: 1,
          height: height * 0.62,
          borderRadius: 999,
          backgroundColor: tokens.background,
          justifyContent: "center",
          paddingHorizontal: height * 0.28,
        }}
      >
        <Text
          numberOfLines={1}
          style={{ fontFamily: sans("400"), fontSize: Math.max(5, height * 0.34), color: tokens["muted-foreground"] }}
        >
          canvas.nannier.com
        </Text>
      </View>
      {/* The overflow dots. */}
      <View style={{ gap: height * 0.07 }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ width: height * 0.075, height: height * 0.075, borderRadius: 999, backgroundColor: tokens["muted-foreground"] }} />
        ))}
      </View>
    </View>
  );
}
