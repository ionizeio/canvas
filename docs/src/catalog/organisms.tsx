import { View, Text, Row, Column, useTheme, alpha, Container } from "@nannier-com/canvas";
import Svg, { Path, Circle, Line, Polyline } from "react-native-svg";
import { geist } from "../ui/fonts";
import { CanvasMark } from "../brand/canvas-mark";
import type { CatTile } from "./tile";

// ── Organisms previews ───────────────────────────────────────────────────────
// Hand-authored mini-mockups for the Organisms category, ported from the previous
// web docs' components-index tiles.

// Status-badge colors mirror docs-chrome.css .sb-* (literal oklch greens/ambers stay literal).
const STATUS_SUCCESS = "#22c55e";

function CalendarsPreview() {
  const { tokens } = useTheme();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", width: 160, maxWidth: "100%", gap: 2 }}>
      {Array.from({ length: 28 }).map((_, i) => {
        const selected = i === 14;
        const accent = i % 3 === 0;
        return (
          <Column
            key={i}
            flush
            center
            alignCenter
            style={{
              width: (160 - 2 * 6) / 7,
              aspectRatio: 1,
              borderRadius: 4,
              backgroundColor: selected ? tokens.primary : accent ? tokens.accent : "transparent",
            }}
          >
            <Text
              style={{
                fontFamily: geist(selected ? "600" : "400"),
                fontSize: 8,
                color: selected ? tokens["primary-foreground"] : tokens["muted-foreground"],
              }}
            >
              {i + 1}
            </Text>
          </Column>
        );
      })}
    </View>
  );
}

function CommandPalettePreview() {
  const { tokens } = useTheme();
  return (
    <View
      style={{
        width: 220,
        maxWidth: "100%",
        backgroundColor: tokens.card,
        borderWidth: 1,
        borderColor: tokens.border,
        borderRadius: 6,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingVertical: 4,
          paddingHorizontal: 8,
          borderBottomWidth: 1,
          borderColor: tokens.border,
        }}
      >
        <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={tokens["muted-foreground"]} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Circle cx={11} cy={11} r={8} />
          <Line x1={21} y1={21} x2={16.65} y2={16.65} />
        </Svg>
        <Text style={{ fontFamily: geist("400"), fontSize: 10, color: tokens["muted-foreground"] }}>Search...</Text>
        <View style={{ flex: 1 }} />
        <View style={{ borderRadius: 4, borderWidth: 1, borderColor: tokens.border, backgroundColor: alpha(tokens.muted, 0.5), paddingHorizontal: 4, paddingVertical: 1 }}>
          <Text style={{ fontFamily: geist("500"), fontSize: 9, color: tokens["muted-foreground"] }}>{"⌘K"}</Text>
        </View>
      </View>
      <View style={{ padding: 4, gap: 2 }}>
        <View style={{ paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4, backgroundColor: tokens.accent }}>
          <Text style={{ fontFamily: geist("400"), fontSize: 10, color: tokens["accent-foreground"] }}>Go to Dashboard</Text>
        </View>
        <View style={{ paddingVertical: 2, paddingHorizontal: 6 }}>
          <Text style={{ fontFamily: geist("400"), fontSize: 10, color: tokens.foreground }}>Identities</Text>
        </View>
      </View>
    </View>
  );
}

function StatusBadge({ label }: { label: string }) {
  return (
    <Row
      tight
      alignCenter
      style={{
        alignSelf: "flex-start",
        paddingVertical: 1,
        paddingHorizontal: 6,
        borderRadius: 9999,
        borderWidth: 1,
        borderColor: alpha(STATUS_SUCCESS, 0.3),
      }}
    >
      <View style={{ width: 5, height: 5, borderRadius: 9999, backgroundColor: STATUS_SUCCESS }} />
      <Text style={{ fontFamily: geist("500"), fontSize: 9, color: STATUS_SUCCESS }}>{label}</Text>
    </Row>
  );
}

function DataTablesPreview() {
  const { tokens } = useTheme();
  const rows: [string, string][] = [
    ["ada@ex.com", "Active"],
    ["grace@ex.com", "Active"],
  ];
  return (
    <View style={{ width: 380, maxWidth: "100%", borderWidth: 1, borderColor: tokens.border, borderRadius: 10, overflow: "hidden" }}>
      <Row flush style={{ backgroundColor: alpha(tokens.muted, 0.4), borderBottomWidth: 1, borderColor: tokens.border }}>
        <Text style={{ flex: 1, fontFamily: geist("500"), fontSize: 9, letterSpacing: 0.4, textTransform: "uppercase", color: tokens["muted-foreground"], paddingVertical: 6, paddingHorizontal: 10 }}>Name</Text>
        <Text style={{ flex: 1, fontFamily: geist("500"), fontSize: 9, letterSpacing: 0.4, textTransform: "uppercase", color: tokens["muted-foreground"], paddingVertical: 6, paddingHorizontal: 10 }}>Status</Text>
      </Row>
      {rows.map(([name, status], i) => (
        <Row key={name} flush alignCenter style={{ borderBottomWidth: i < rows.length - 1 ? 1 : 0, borderColor: tokens.border }}>
          <Text style={{ flex: 1, fontFamily: geist("400"), fontSize: 10, color: tokens.foreground, paddingVertical: 6, paddingHorizontal: 10 }}>{name}</Text>
          <View style={{ flex: 1, paddingVertical: 6, paddingHorizontal: 10 }}>
            <StatusBadge label={status} />
          </View>
        </Row>
      ))}
    </View>
  );
}

function CheckRow({ label, checked }: { label: string; checked: boolean }) {
  const { tokens } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Column
        flush
        center
        alignCenter
        style={{
          width: 12,
          height: 12,
          borderRadius: 3,
          borderWidth: 1,
          borderColor: checked ? tokens.primary : tokens.input,
          backgroundColor: checked ? tokens.primary : tokens.background,
        }}
      >
        {checked ? (
          <Svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke={tokens["primary-foreground"]} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <Polyline points="20 6 9 17 4 12" />
          </Svg>
        ) : null}
      </Column>
      <Text style={{ fontFamily: geist("400"), fontSize: 10, color: tokens.foreground }}>{label}</Text>
    </View>
  );
}

function FilterPanelsPreview() {
  const { tokens } = useTheme();
  return (
    <Column tight padTight style={{ width: 180, maxWidth: "100%", backgroundColor: tokens.card, borderWidth: 1, borderColor: tokens.border, borderRadius: 10 }}>
      <Text style={{ fontFamily: geist("500"), fontSize: 8, letterSpacing: 0.4, textTransform: "uppercase", color: tokens["muted-foreground"], marginBottom: 2 }}>Status</Text>
      <CheckRow label="Active" checked />
      <CheckRow label="Inactive" checked={false} />
    </Column>
  );
}

function NavbarsPreview() {
  const { tokens } = useTheme();
  return (
    <View style={{ width: 260, maxWidth: "100%", borderWidth: 1, borderColor: tokens.border, borderRadius: 6, overflow: "hidden" }}>
      <Row
        snug
        alignCenter
        style={{
          height: 36,
          paddingHorizontal: 8,
          backgroundColor: tokens.card,
          borderBottomWidth: 1,
          borderColor: tokens.border,
        }}
      >
        <CanvasMark size={16} />
        <Text style={{ fontFamily: geist("600"), fontSize: 10, color: tokens.foreground }}>Canvas</Text>
        <View style={{ flex: 1 }} />
        <Column flush center alignCenter style={{ width: 24, height: 24, borderRadius: 9999, backgroundColor: tokens.muted }}>
          <Text style={{ fontFamily: geist("500"), fontSize: 9, color: tokens["muted-foreground"] }}>AL</Text>
        </Column>
      </Row>
    </View>
  );
}

function SidebarPreview() {
  const { tokens } = useTheme();
  return (
    <View style={{ width: 160, maxWidth: "100%", backgroundColor: tokens.card, borderWidth: 1, borderColor: tokens.border, borderRadius: 6, padding: 6 }}>
      <Text style={{ fontFamily: geist("400"), fontSize: 9, textTransform: "uppercase", color: tokens["muted-foreground"], paddingHorizontal: 4, marginBottom: 2 }}>Identity</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, padding: 4, borderRadius: 4, backgroundColor: tokens.accent }}>
        <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={tokens["accent-foreground"]} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4-4v2" />
          <Circle cx={9} cy={7} r={4} />
        </Svg>
        <Text style={{ fontFamily: geist("400"), fontSize: 10, color: tokens["accent-foreground"] }}>Identities</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, padding: 4, borderRadius: 4 }}>
        <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={tokens["muted-foreground"]} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </Svg>
        <Text style={{ fontFamily: geist("400"), fontSize: 10, color: tokens["muted-foreground"] }}>Sessions</Text>
      </View>
    </View>
  );
}

function DialogPreview() {
  const { tokens } = useTheme();
  return (
    <Column flush center alignCenter style={{ width: 200, maxWidth: "100%", height: 64 }}>
      <View style={{ width: 130, backgroundColor: tokens.card, borderWidth: 1, borderColor: tokens.border, borderRadius: 6, padding: 8 }}>
        <View style={{ height: 6, width: 56, borderRadius: 3, backgroundColor: alpha(tokens.foreground, 0.8), marginBottom: 6 }} />
        <View style={{ height: 4, width: "100%", borderRadius: 2, backgroundColor: alpha(tokens["muted-foreground"], 0.4), marginBottom: 8 }} />
        <Row tight end>
          <View style={{ height: 12, width: 28, borderRadius: 3, borderWidth: 1, borderColor: tokens.border }} />
          <View style={{ height: 12, width: 28, borderRadius: 3, backgroundColor: tokens.primary }} />
        </Row>
      </View>
    </Column>
  );
}

function StepsPreview() {
  const { tokens } = useTheme();
  const steps = [true, true, false, false];
  return (
    <Container xxxs start>
      <Row flush alignCenter>
        {steps.map((done, i) => {
          const current = i === 2;
          const last = i === steps.length - 1;
          return (
            <Row key={i} flush alignCenter fill={!last}>
              <Column
                flush
                center
                alignCenter
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: done ? tokens.primary : current ? "transparent" : tokens.muted,
                  borderWidth: current ? 2 : 0,
                  borderColor: current ? tokens.primary : "transparent",
                }}
              >
                {done ? (
                  <Svg width={8} height={8} viewBox="0 0 24 24" fill="none" stroke={tokens["primary-foreground"]} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <Polyline points="20 6 9 17 4 12" />
                  </Svg>
                ) : (
                  <Text style={{ fontFamily: geist("600"), fontSize: 9, color: current ? tokens.primary : tokens["muted-foreground"] }}>{i + 1}</Text>
                )}
              </Column>
              {!last ? (
                <View style={{ flex: 1, height: 2, marginHorizontal: 4, backgroundColor: done ? tokens.primary : tokens.muted }} />
              ) : null}
            </Row>
          );
        })}
      </Row>
    </Container>
  );
}

function TabsPreview() {
  const { tokens } = useTheme();
  const tabs = ["Overview", "Activity", "Settings"];
  return (
    <View style={{ flexDirection: "row", gap: 2, width: 260, maxWidth: "100%", borderBottomWidth: 1, borderColor: tokens.border }}>
      {tabs.map((t, i) => {
        const active = i === 0;
        return (
          <View
            key={t}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 8,
              marginBottom: -1,
              borderBottomWidth: active ? 2 : 0,
              borderColor: tokens.foreground,
            }}
          >
            <Text style={{ fontFamily: geist(active ? "600" : "400"), fontSize: 10, color: active ? tokens.foreground : tokens["muted-foreground"] }}>{t}</Text>
          </View>
        );
      })}
    </View>
  );
}

export const ORGANISMS_TILES: CatTile[] = [
  { title: "Calendar", href: "/components/calendar", Preview: CalendarsPreview },
  { title: "Command", href: "/components/command", Preview: CommandPalettePreview },
  { title: "DataTable", href: "/components/data-table", span: true, Preview: DataTablesPreview },
  { title: "FilterPanel", href: "/components/filter-panel", Preview: FilterPanelsPreview },
  { title: "Navbar", href: "/components/navbars", Preview: NavbarsPreview },
  { title: "Sidebar", href: "/components/sidebar", Preview: SidebarPreview },
  { title: "Dialog", href: "/components/dialog", Preview: DialogPreview },
  { title: "Steps", href: "/components/steps", Preview: StepsPreview },
  { title: "Tabs", href: "/components/tabs", Preview: TabsPreview },
];
