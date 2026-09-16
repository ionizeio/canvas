import { useEffect, useRef, useState } from "react";
import { Animated, AccessibilityInfo } from "react-native";
import { View, Text, Row, Column, useTheme, alpha, Container } from "@nannier-com/canvas";
import Svg, { Defs, RadialGradient, Stop, Rect } from "react-native-svg";
import { sans, geistMono } from "../ui/fonts";
import { MiniBtn, type CatTile } from "./tile";

// ── Patterns previews ─────────────────────────────────────────────────────────
// Hand-authored mini-mockups for the Patterns category.

// Honours the OS "reduce motion" setting so the pulsing skeletons hold still when
// the user has asked for less animation. Mirrors the hero-orbit helper.
function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduced(v);
    });
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return reduced;
}

// The CSS `pulse` keyframe (opacity 1 → 0.5 → 1 over 2s, ease-in-out) as an
// Animated.Value, shared by the skeleton bars/discs in the Loading & related tiles.
function usePulse() {
  const opacity = useRef(new Animated.Value(1)).current;
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) {
      opacity.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.5, duration: 1000, useNativeDriver: false }),
        Animated.timing(opacity, { toValue: 1, duration: 1000, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, opacity]);
  return opacity;
}

// A small key-cap, standing in for the docs `.kbd` element.
function MiniKbd({ children }: { children: string }) {
  const { tokens } = useTheme();
  return (
    <Column
      flush
      center
      alignCenter
      style={{
        height: 18,
        minWidth: 18,
        paddingHorizontal: 5,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: tokens.border,
        backgroundColor: tokens.muted,
      }}
    >
      <Text style={{ fontFamily: geistMono("500"), fontSize: 11, color: tokens.foreground }}>{children}</Text>
    </Column>
  );
}

// 1. Accessibility — a focused button (ring offset) next to a keyboard hint.
function AccessibilityPreview() {
  const { tokens } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View
        style={{
          borderRadius: 14,
          borderWidth: 2,
          borderColor: tokens.ring,
          padding: 2,
          backgroundColor: tokens.background,
        }}
      >
        <MiniBtn label="Focus" />
      </View>
      <MiniKbd>⌘K</MiniKbd>
    </View>
  );
}

// 2. Density — three cards (compact / regular / comfy) with growing padding.
function DensityPreview() {
  const { tokens } = useTheme();
  return (
    <Container xxxs start>
      <Row tight>
        <Column
          flush
          center
          alignCenter
          fill
          style={{
            backgroundColor: tokens.card,
            borderWidth: 1,
            borderColor: tokens.border,
            borderRadius: 6,
            // The 4 / 8 / 12 padding ramp is the subject of this tile, so all three stay
            // literal here rather than one of them becoming the `padTight` boolean.
            padding: 4,
          }}
        >
          <Text style={{ fontFamily: sans("400"), fontSize: 8, color: tokens.foreground }}>Compact</Text>
        </Column>
        <Column
          flush
          center
          alignCenter
          fill
          style={{
            backgroundColor: tokens.primary,
            borderWidth: 1,
            borderColor: tokens.primary,
            borderRadius: 6,
            padding: 8,
          }}
        >
          <Text style={{ fontFamily: sans("400"), fontSize: 8, color: tokens["primary-foreground"] }}>Regular</Text>
        </Column>
        <Column
          flush
          center
          alignCenter
          fill
          style={{
            backgroundColor: tokens.card,
            borderWidth: 1,
            borderColor: tokens.border,
            borderRadius: 6,
            padding: 12,
          }}
        >
          <Text style={{ fontFamily: sans("400"), fontSize: 8, color: tokens.foreground }}>Comfy</Text>
        </Column>
      </Row>
    </Container>
  );
}

// 3. Form Validation — an input in an error state with a destructive message.
function FormValidationPreview() {
  const { tokens } = useTheme();
  return (
    <View style={{ width: 200, maxWidth: "100%", gap: 6 }}>
      <Column
        flush
        center
        style={{
          height: 28,
          // A destructive border paired with a 1px destructive ring reads as an emphasized error
          // outline; a 2px destructive border conveys that at tile size.
          borderRadius: 10,
          borderWidth: 2,
          borderColor: tokens.destructive,
          backgroundColor: tokens.background,
          paddingHorizontal: 10,
        }}
      >
        <Text style={{ fontFamily: sans("400"), fontSize: 10, color: tokens.foreground }} numberOfLines={1}>
          not-an-email
        </Text>
      </Column>
      <Text style={{ fontFamily: sans("400"), fontSize: 9, color: tokens.destructive }}>Not a valid email</Text>
    </View>
  );
}

// 4. Glass Surface — a glass card floating over a soft warm/cool gradient wash.
function GlassSurfacePreview() {
  return (
    <View
      style={{
        width: 220,
        maxWidth: "100%",
        height: 80,
        borderRadius: 14,
        overflow: "hidden",
        position: "relative",
        backgroundColor: "hsl(220, 30%, 96%)",
      }}
    >
      <Svg width="100%" height="100%" style={{ position: "absolute", top: 0, left: 0 }}>
        <Defs>
          <RadialGradient id="glassWarm" cx="20%" cy="10%" r="60%">
            <Stop offset="0%" stopColor="hsl(28, 100%, 80%)" stopOpacity={0.55} />
            <Stop offset="100%" stopColor="hsl(28, 100%, 80%)" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="glassCool" cx="80%" cy="20%" r="55%">
            <Stop offset="0%" stopColor="hsl(210, 100%, 78%)" stopOpacity={0.55} />
            <Stop offset="100%" stopColor="hsl(210, 100%, 78%)" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#glassWarm)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#glassCool)" />
      </Svg>
      <Column
        flush
        center
        alignCenter
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          right: 12,
          bottom: 12,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.5)",
          backgroundColor: "rgba(255, 255, 255, 0.55)",
        }}
      >
        <Text style={{ fontFamily: sans("500"), fontSize: 10, color: "hsl(220, 30%, 20%)" }}>Glass</Text>
      </Column>
    </View>
  );
}

// 5. Loading — a pulsing avatar disc beside two pulsing skeleton bars.
function LoadingPreview() {
  const { tokens } = useTheme();
  const opacity = usePulse();
  const fill = alpha(tokens.muted, 0.6);
  return (
    <Container xxxs start>
      <Row snug alignCenter>
        <Animated.View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: fill, opacity }} />
        <View style={{ flex: 1, gap: 6 }}>
          <Animated.View style={{ height: 8, borderRadius: 6, backgroundColor: fill, opacity }} />
          <Animated.View style={{ height: 8, width: "75%", borderRadius: 6, backgroundColor: fill, opacity }} />
        </View>
      </Row>
    </Container>
  );
}

// 6. Responsive — three device frames at growing breakpoints (375 / 768 / 1024).
function ResponsivePreview() {
  const { tokens } = useTheme();
  const frames = [
    { w: 20, h: 36, bg: 0.15, bd: 0.3, label: "375", fs: 7 },
    { w: 32, h: 44, bg: 0.2, bd: 0.3, label: "768", fs: 7 },
    { w: 48, h: 48, bg: 0.3, bd: 0.4, label: "1024", fs: 8 },
  ];
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
      {frames.map((f) => (
        <View
          key={f.label}
          style={{
            width: f.w,
            height: f.h,
            borderRadius: 2,
            backgroundColor: alpha(tokens.primary, f.bg),
            borderWidth: 1,
            borderColor: alpha(tokens.primary, f.bd),
            alignItems: "center",
            justifyContent: "flex-end",
            paddingBottom: 2,
          }}
        >
          <Text style={{ fontFamily: geistMono("400"), fontSize: f.fs, color: tokens.foreground }}>{f.label}</Text>
        </View>
      ))}
    </View>
  );
}

export const PATTERNS_TILES: CatTile[] = [
  { title: "Accessibility", href: "/patterns/accessibility", Preview: AccessibilityPreview },
  { title: "Density", href: "/patterns/density", Preview: DensityPreview },
  { title: "Form Validation", href: "/patterns/form-validation", Preview: FormValidationPreview },
  { title: "Glass Surface", href: "/patterns/glass", Preview: GlassSurfacePreview },
  { title: "Loading", href: "/patterns/loading", Preview: LoadingPreview },
  { title: "Responsive", href: "/patterns/responsive", Preview: ResponsivePreview },
];
