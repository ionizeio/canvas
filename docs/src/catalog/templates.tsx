import { View, Text, Row, Column, useTheme, alpha } from "@ionizeio/canvas";
import Svg, { Polyline, LinearGradient, Stop, Defs, Rect } from "react-native-svg";
import { sans } from "../ui/fonts";
import { CanvasMark } from "../brand/canvas-mark";
import { type CatTile } from "./tile";

// ── Templates previews ───────────────────────────────────────────────────────
// Hand-authored mini-mockups for the Templates category. Each Preview returns
// just the centered mockup; the Tile wrapper supplies the 16:9 stage, the muted
// wash, and padding.

function CalendarPreview() {
  const { tokens } = useTheme();
  // 7-column month grid: cell 10 is "today" (primary fill), cell 8 has a primary
  // bottom rule. A 21-cell grid with gap 1.
  return (
    <View style={{ width: "100%", maxWidth: 180, flexDirection: "row", flexWrap: "wrap", gap: 1 }}>
      {Array.from({ length: 21 }).map((_, i) => (
        <View
          key={i}
          style={{
            // 7 cells per row, 1px gaps between them: (100% - 6px) / 7.
            width: `${100 / 7}%`,
            aspectRatio: 1,
            backgroundColor: i === 10 ? tokens.primary : alpha(tokens.muted, 0.4),
            borderBottomWidth: i === 8 ? 1 : 0,
            borderColor: tokens.primary,
          }}
        />
      ))}
    </View>
  );
}

function DashboardPreview() {
  const { tokens } = useTheme();
  return (
    <View style={{ width: "100%", maxWidth: 220, gap: 6 }}>
      <Row tight>
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 28,
              borderRadius: 6,
              backgroundColor: tokens.card,
              borderWidth: 1,
              borderColor: tokens.border,
              padding: 4,
            }}
          >
            <Text style={{ fontFamily: sans("400"), fontSize: 7, color: tokens["muted-foreground"] }}>Stat</Text>
            <Text style={{ fontFamily: sans("600"), fontSize: 8, color: tokens.foreground }}>12k</Text>
          </View>
        ))}
      </Row>
      <Svg viewBox="0 0 100 18" preserveAspectRatio="none" style={{ width: "100%", height: 20 }}>
        <Polyline points="0,14 20,10 40,12 60,5 80,7 100,2" fill="none" stroke={tokens.primary} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      </Svg>
    </View>
  );
}

function DetailSidebarPreview() {
  const { tokens } = useTheme();
  // Two section-cards side by side (main column + 60px aside).
  const sectionCard = {
    backgroundColor: tokens.card,
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: 14,
    padding: 6,
    gap: 2,
  } as const;
  return (
    <View style={{ width: "100%", maxWidth: 220, flexDirection: "row", gap: 6 }}>
      <View style={[sectionCard, { flex: 1 }]}>
        <View style={{ height: 6, width: 48, borderRadius: 6, backgroundColor: alpha(tokens.foreground, 0.8) }} />
        <View style={{ height: 6, width: 64, borderRadius: 6, backgroundColor: tokens.muted }} />
        <View style={{ height: 6, width: 56, borderRadius: 6, backgroundColor: tokens.muted }} />
      </View>
      <View style={[sectionCard, { width: 60 }]}>
        <View style={{ height: 6, borderRadius: 6, backgroundColor: tokens.muted }} />
        <View style={{ height: 6, borderRadius: 6, backgroundColor: tokens.muted }} />
      </View>
    </View>
  );
}

function IdentitiesPreview() {
  const { tokens } = useTheme();
  return (
    <View style={{ width: "100%", maxWidth: 200, gap: 2 }}>
      {[1, 2, 3, 4].map((i) => (
        <Row key={i} tight alignCenter style={{ height: 12 }}>
          <View style={{ width: 6, height: 6, borderRadius: 5, backgroundColor: alpha(tokens.primary, 0.3) }} />
          <View style={{ flex: 1, height: 6, borderRadius: 6, backgroundColor: tokens.muted }} />
          <View style={{ width: 24, height: 6, borderRadius: 6, backgroundColor: alpha(tokens.muted, 0.6) }} />
        </Row>
      ))}
    </View>
  );
}

function OnboardingPreview() {
  const { tokens } = useTheme();
  return (
    <View style={{ width: "100%", maxWidth: 200, gap: 6 }}>
      <Row flush between>
        <Text style={{ fontFamily: sans("400"), fontSize: 8, color: tokens["muted-foreground"] }}>Step 2 of 4</Text>
        <Text style={{ fontFamily: sans("400"), fontSize: 8, color: tokens["muted-foreground"] }}>50%</Text>
      </Row>
      <View style={{ height: 4, backgroundColor: tokens.muted, borderRadius: 9999, overflow: "hidden" }}>
        <View style={{ height: "100%", width: "50%", backgroundColor: tokens.primary }} />
      </View>
      <View
        style={{
          backgroundColor: tokens.card,
          borderWidth: 1,
          borderColor: tokens.border,
          borderRadius: 14,
          padding: 8,
          marginTop: 4,
          gap: 2,
        }}
      >
        <Text style={{ fontFamily: sans("600"), fontSize: 10, color: tokens.foreground }}>Profile</Text>
        <Text style={{ fontFamily: sans("400"), fontSize: 8, color: tokens["muted-foreground"] }}>Tell us about yourself.</Text>
      </View>
    </View>
  );
}

function ProfilePreview() {
  const { tokens } = useTheme();
  return (
    <View style={{ width: "100%", maxWidth: 220, gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {/* linear-gradient(135deg, hsl(240 70% 55%), hsl(280 70% 55%)) */}
        <Svg width={32} height={32}>
          <Defs>
            <LinearGradient id="profile-avatar" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="hsl(240, 70%, 55%)" />
              <Stop offset="1" stopColor="hsl(280, 70%, 55%)" />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={32} height={32} rx={16} fill="url(#profile-avatar)" />
        </Svg>
        <Column tight fill>
          <View style={{ height: 8, width: 64, borderRadius: 6, backgroundColor: alpha(tokens.foreground, 0.8) }} />
          <View style={{ height: 6, width: 48, borderRadius: 6, backgroundColor: tokens.muted }} />
        </Column>
      </View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6, borderBottomWidth: 1, borderColor: tokens.border, paddingBottom: 2 }}>
        <View style={{ borderBottomWidth: 1, borderColor: tokens.foreground, paddingBottom: 2, marginBottom: -3 }}>
          <Text style={{ fontFamily: sans("500"), fontSize: 8, color: tokens.foreground }}>Overview</Text>
        </View>
        <Text style={{ fontFamily: sans("400"), fontSize: 8, color: tokens["muted-foreground"] }}>Credentials</Text>
      </View>
    </View>
  );
}

function SettingsPreview() {
  const { tokens } = useTheme();
  return (
    <View style={{ width: "100%", maxWidth: 220, flexDirection: "row", gap: 6 }}>
      <View style={{ width: 60, gap: 2 }}>
        <View style={{ paddingVertical: 2, paddingHorizontal: 4, borderRadius: 6, backgroundColor: tokens.accent }}>
          <Text style={{ fontFamily: sans("400"), fontSize: 9, color: tokens["accent-foreground"] }}>Profile</Text>
        </View>
        <View style={{ paddingVertical: 2, paddingHorizontal: 4 }}>
          <Text style={{ fontFamily: sans("400"), fontSize: 9, color: tokens["muted-foreground"] }}>Security</Text>
        </View>
        <View style={{ paddingVertical: 2, paddingHorizontal: 4 }}>
          <Text style={{ fontFamily: sans("400"), fontSize: 9, color: tokens["muted-foreground"] }}>Billing</Text>
        </View>
      </View>
      <Column
        tight
        fill
        padTight
        style={{
          backgroundColor: tokens.card,
          borderWidth: 1,
          borderColor: tokens.border,
          borderRadius: 14,
        }}
      >
        <View style={{ height: 6, width: 48, borderRadius: 6, backgroundColor: alpha(tokens.foreground, 0.8) }} />
        <View style={{ height: 16, borderRadius: 6, borderWidth: 1, borderColor: tokens.border }} />
        <View style={{ height: 16, borderRadius: 6, borderWidth: 1, borderColor: tokens.border }} />
      </Column>
    </View>
  );
}

function SigninPreview() {
  const { tokens } = useTheme();
  return (
    <Column
      flush
      alignCenter
      style={{
        width: "100%",
        maxWidth: 180,
        backgroundColor: tokens.card,
        borderWidth: 1,
        borderColor: tokens.border,
        borderRadius: 14,
        padding: 12,
      }}
    >
      <CanvasMark size={18} />
      <Text style={{ fontFamily: sans("600"), fontSize: 10, color: tokens.foreground, marginTop: 4 }}>Sign in</Text>
      <Column tight style={{ width: "100%", marginTop: 8 }}>
        <Column flush center style={{ height: 24, borderRadius: 10, borderWidth: 1, borderColor: tokens.input, backgroundColor: tokens.background, paddingHorizontal: 12 }}>
          <Text style={{ fontFamily: sans("400"), fontSize: 9, color: tokens["muted-foreground"] }}>Email</Text>
        </Column>
        <Column flush center style={{ height: 24, borderRadius: 10, borderWidth: 1, borderColor: tokens.input, backgroundColor: tokens.background, paddingHorizontal: 12 }}>
          <Text style={{ fontFamily: sans("400"), fontSize: 9, color: tokens["muted-foreground"] }}>Password</Text>
        </Column>
        <Column flush center alignCenter style={{ height: 24, borderRadius: 10, backgroundColor: tokens.primary }}>
          <Text style={{ fontFamily: sans("500"), fontSize: 9, color: tokens["primary-foreground"] }}>Sign in</Text>
        </Column>
      </Column>
    </Column>
  );
}

export const TEMPLATES_TILES: CatTile[] = [
  { title: "Calendar", href: "/templates/calendar", Preview: CalendarPreview },
  { title: "Dashboard", href: "/templates/dashboard", Preview: DashboardPreview },
  { title: "Detail w/ sidebar", href: "/templates/detail-sidebar", Preview: DetailSidebarPreview },
  { title: "Identities", href: "/templates/identities", Preview: IdentitiesPreview },
  { title: "Onboarding", href: "/templates/onboarding", Preview: OnboardingPreview },
  { title: "Profile", href: "/templates/profile", Preview: ProfilePreview },
  { title: "Settings", href: "/templates/settings", Preview: SettingsPreview },
  { title: "Sign-in", href: "/templates/signin", Preview: SigninPreview },
];
