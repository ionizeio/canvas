import { View, Text, useTheme, alpha, Row } from "@ionizeio/canvas";
import Svg, { Path, Circle, Polygon } from "react-native-svg";
import { sans } from "../ui/fonts";
import { MiniBtn, MiniInput, type CatTile } from "./tile";

// ── Atoms previews ───────────────────────────────────────────────────────────
// Hand-authored mini-mockups for the Atoms category.

// The avatar tiles use brand gradients; RN keeps it readable at tile size with
// a solid lead color drawn from each gradient's start hue.
const avatarColors = ["hsl(258 70% 55%)", "hsl(290 70% 55%)", "hsl(186 70% 50%)", "hsl(8 70% 55%)"];

function ViewPreview() {
  const { tokens } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 6, padding: 8, borderRadius: 10, borderWidth: 1, borderStyle: "dashed", borderColor: tokens.border }}>
      {[0, 1].map((i) => (
        <View
          key={i}
          style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.22), borderWidth: 1, borderColor: alpha(tokens.primary, 0.45) }}
        />
      ))}
    </View>
  );
}

function TextPreview() {
  const { tokens } = useTheme();
  return (
    <View style={{ alignItems: "center", gap: 2 }}>
      <Text style={{ fontFamily: sans("700"), fontSize: 22, letterSpacing: -0.44, color: tokens.foreground }}>Aa</Text>
      <Text style={{ fontFamily: sans("400"), fontSize: 11, color: tokens["muted-foreground"] }}>The quick brown fox</Text>
    </View>
  );
}

function PressablePreview() {
  const { tokens } = useTheme();
  return (
    <View style={{ alignItems: "center", gap: 6 }}>
      <View
        style={{
          width: 88,
          height: 36,
          borderRadius: 10,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: alpha(tokens.primary, 0.16),
          borderWidth: 1,
          borderColor: alpha(tokens.primary, 0.38),
        }}
      >
        <Text style={{ fontFamily: sans("500"), fontSize: 11, color: tokens.foreground }}>Press me</Text>
      </View>
      <Text style={{ fontFamily: sans("400"), fontSize: 10, color: tokens["muted-foreground"] }}>onPress · pressed state</Text>
    </View>
  );
}

function ImagePreview() {
  const { tokens } = useTheme();
  return (
    <View
      style={{
        width: 64,
        height: 48,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: tokens.border,
        backgroundColor: alpha(tokens.muted, 0.5),
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <Svg width={60} height={44} viewBox="0 0 60 44" opacity={0.55}>
        <Circle cx={18} cy={14} r={5} fill={tokens["muted-foreground"]} />
        <Path d="M4 40 L22 20 L34 32 L44 24 L56 40 Z" fill={tokens["muted-foreground"]} />
      </Svg>
    </View>
  );
}

function TextInputPreview() {
  const { tokens } = useTheme();
  return (
    <View
      style={{
        height: 32,
        maxWidth: 170,
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: tokens.input,
        backgroundColor: tokens.background,
        paddingHorizontal: 12,
      }}
    >
      <Text style={{ fontFamily: sans("400"), fontSize: 12, color: tokens.foreground }}>Jane Doe</Text>
      <View style={{ width: 1, height: 14, backgroundColor: tokens.primary, marginLeft: 1 }} />
    </View>
  );
}

function ScrollViewPreview() {
  const { tokens } = useTheme();
  return (
    <View style={{ width: 120, height: 56, borderRadius: 10, borderWidth: 1, borderColor: tokens.border, overflow: "hidden", backgroundColor: tokens.card }}>
      <View style={{ gap: 4, padding: 6 }}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ height: 10, borderRadius: 5, backgroundColor: alpha(tokens.muted, 0.7) }} />
        ))}
      </View>
      <View style={{ position: "absolute", right: 3, top: 6, bottom: 6, width: 3, borderRadius: 5, backgroundColor: alpha(tokens["muted-foreground"], 0.25) }}>
        <View style={{ position: "absolute", top: 0, height: "45%", width: "100%", borderRadius: 5, backgroundColor: alpha(tokens["muted-foreground"], 0.6) }} />
      </View>
    </View>
  );
}

function AvatarsPreview() {
  const { tokens } = useTheme();
  return (
    <Row flush>
      {["AL", "GH", "RC", "LB"].map((s, i) => (
        <View
          key={s}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: tokens.background,
            backgroundColor: avatarColors[i],
            marginLeft: i > 0 ? -8 : 0,
            zIndex: 10 - i,
          }}
        >
          <Text style={{ fontFamily: sans("600"), fontSize: 10, color: "#ffffff" }}>{s}</Text>
        </View>
      ))}
    </Row>
  );
}

function BadgesPreview() {
  const { tokens } = useTheme();
  return (
    <View style={{ alignItems: "center", gap: 6 }}>
      <Row tight>
        <View style={{ paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10, backgroundColor: tokens.primary }}>
          <Text style={{ fontFamily: sans("500"), fontSize: 12, color: tokens["primary-foreground"] }}>Default</Text>
        </View>
        <View style={{ paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10, backgroundColor: tokens.secondary }}>
          <Text style={{ fontFamily: sans("500"), fontSize: 12, color: tokens["secondary-foreground"] }}>Tag</Text>
        </View>
      </Row>
      <Row tight>
        <StatusBadge label="Active" status="success" />
        <StatusBadge label="Pending" status="warning" />
      </Row>
    </View>
  );
}

// A status pill colored per status: a bordered 9999-radius pill with a leading dot.
function StatusBadge({ label, status }: { label: string; status: "success" | "warning" | "error" | "info" | "neutral" }) {
  const { tokens } = useTheme();
  const palette = {
    success: { dot: "#16a34a", text: "#15803d", border: alpha("#16a34a", 0.3) },
    warning: { dot: "#f59e0b", text: "#d97706", border: alpha("#f59e0b", 0.35) },
    error: { dot: tokens.destructive, text: tokens.destructive, border: alpha(tokens.destructive, 0.3) },
    info: { dot: "#2563eb", text: "#2563eb", border: alpha("#2563eb", 0.3) },
    neutral: { dot: tokens["muted-foreground"], text: tokens["muted-foreground"], border: tokens.border },
  }[status];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 9999, borderWidth: 1, borderColor: palette.border }}>
      <View style={{ width: 6, height: 6, borderRadius: 5, backgroundColor: palette.dot }} />
      <Text style={{ fontFamily: sans("500"), fontSize: 12, color: palette.text }}>{label}</Text>
    </View>
  );
}

function BreadcrumbsPreview() {
  const { tokens } = useTheme();
  const chevron = (
    <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={tokens["muted-foreground"]} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="m9 18 6-6-6-6" />
    </Svg>
  );
  return (
    <Row tight alignCenter>
      <Text style={{ fontFamily: sans("400"), fontSize: 11, color: tokens["muted-foreground"] }}>Projects</Text>
      {chevron}
      <Text style={{ fontFamily: sans("400"), fontSize: 11, color: tokens["muted-foreground"] }}>Identity</Text>
      {chevron}
      <Text style={{ fontFamily: sans("500"), fontSize: 11, color: tokens.foreground }}>Profile</Text>
    </Row>
  );
}

function ButtonGroupsPreview() {
  const { tokens } = useTheme();
  return (
    <Row flush style={{ borderRadius: 10, borderWidth: 1, borderColor: tokens.input, backgroundColor: tokens.card, padding: 2 }}>
      <View style={{ paddingVertical: 2, paddingHorizontal: 8, backgroundColor: tokens.primary, borderRadius: 6, justifyContent: "center" }}>
        <Text style={{ fontFamily: sans("400"), fontSize: 11, color: tokens["primary-foreground"] }}>Day</Text>
      </View>
      <View style={{ paddingVertical: 2, paddingHorizontal: 8, justifyContent: "center" }}>
        <Text style={{ fontFamily: sans("400"), fontSize: 11, color: tokens["muted-foreground"] }}>Week</Text>
      </View>
      <View style={{ paddingVertical: 2, paddingHorizontal: 8, justifyContent: "center" }}>
        <Text style={{ fontFamily: sans("400"), fontSize: 11, color: tokens["muted-foreground"] }}>Month</Text>
      </View>
    </Row>
  );
}

function ButtonsPreview() {
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      <MiniBtn label="Save" />
      <MiniBtn label="Cancel" variant="outline" />
    </View>
  );
}

// A 14px checkbox box, filled with the primary color and a check glyph when checked.
function CheckRow({ label, checked }: { label: string; checked?: boolean }) {
  const { tokens } = useTheme();
  return (
    <Row snug alignCenter>
      <View
        style={{
          width: 14,
          height: 14,
          borderRadius: 5,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: checked ? tokens.primary : tokens.background,
          borderWidth: 1,
          borderColor: checked ? tokens.primary : tokens.input,
        }}
      >
        {checked ? (
          <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={tokens["primary-foreground"]} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M20 6 9 17l-5-5" />
          </Svg>
        ) : null}
      </View>
      <Text style={{ fontFamily: sans("400"), fontSize: 11, color: tokens.foreground }}>{label}</Text>
    </Row>
  );
}

function CheckboxesPreview() {
  return (
    <View style={{ gap: 6 }}>
      <CheckRow label="Option A" checked />
      <CheckRow label="Option B" />
    </View>
  );
}

function AutocompletePreview() {
  const { tokens } = useTheme();
  return (
    <View style={{ width: "100%", maxWidth: 180 }}>
      <View
        style={{
          height: 32,
          flexDirection: "row",
          alignItems: "center",
          borderRadius: 10,
          borderWidth: 1,
          borderColor: tokens.input,
          backgroundColor: tokens.background,
          paddingLeft: 12,
          paddingRight: 8,
        }}
      >
        <Text style={{ flex: 1, fontFamily: sans("400"), fontSize: 12, color: tokens["muted-foreground"] }}>Search…</Text>
        <Svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={tokens["muted-foreground"]} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="m6 9 6 6 6-6" />
        </Svg>
      </View>
    </View>
  );
}

function DividersPreview() {
  const { tokens } = useTheme();
  return (
    <View style={{ width: "100%", maxWidth: 180 }}>
      <Text style={{ fontFamily: sans("400"), fontSize: 10, color: tokens["muted-foreground"], marginBottom: 8 }}>Above</Text>
      <View style={{ height: 1, backgroundColor: tokens.border }} />
      <Text style={{ fontFamily: sans("400"), fontSize: 10, color: tokens["muted-foreground"], marginTop: 8 }}>Below</Text>
    </View>
  );
}

function DropdownsPreview() {
  const { tokens } = useTheme();
  return (
    <View style={{ minWidth: 120, backgroundColor: tokens.card, borderWidth: 1, borderColor: tokens.border, borderRadius: 10, padding: 4 }}>
      <View style={{ paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 }}>
        <Text style={{ fontFamily: sans("400"), fontSize: 11, color: tokens.foreground }}>Edit</Text>
      </View>
      <View style={{ paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 }}>
        <Text style={{ fontFamily: sans("400"), fontSize: 11, color: tokens.foreground }}>Copy</Text>
      </View>
      <View style={{ paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 }}>
        <Text style={{ fontFamily: sans("400"), fontSize: 11, color: tokens.destructive }}>Delete</Text>
      </View>
    </View>
  );
}

// The 12 lucide-style outline icons, redrawn as react-native-svg paths in a 6-column grid.
const ICON_PATHS = [
  "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4-4v2",
  "M22 12h-4l-3 9L9 3l-3 9H2",
  "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z",
  "M12 2L2 7l10 5 10-5-10-5z",
  "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  "M15.5 7.5l-7 7M21 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0z",
  "M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8",
  "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51",
  "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z",
  "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9",
  "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707",
];

function IconsPreview() {
  const { tokens } = useTheme();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", width: 6 * 16 + 5 * 12, justifyContent: "space-between", rowGap: 12 }}>
      {ICON_PATHS.map((d, i) => (
        <Svg key={i} width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={tokens.foreground} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d={d} />
        </Svg>
      ))}
    </View>
  );
}

function InputsFormsPreview() {
  return <MiniInput placeholder="email@example.com" width={180} />;
}

// A square ghost icon button used in the pagination row.
function PageIconBtn({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ width: 28, height: 28, borderRadius: 10, alignItems: "center", justifyContent: "center" }}>{children}</View>
  );
}

function PaginationPreview() {
  const { tokens } = useTheme();
  return (
    <Row tight alignCenter>
      <PageIconBtn>
        <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={tokens.foreground} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="m15 18-6-6 6-6" />
        </Svg>
      </PageIconBtn>
      <PageIconBtn>
        <Text style={{ fontFamily: sans("500"), fontSize: 11, color: tokens.foreground }}>1</Text>
      </PageIconBtn>
      <View style={{ width: 28, height: 28, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: tokens.primary }}>
        <Text style={{ fontFamily: sans("500"), fontSize: 11, color: tokens["primary-foreground"] }}>2</Text>
      </View>
      <PageIconBtn>
        <Text style={{ fontFamily: sans("500"), fontSize: 11, color: tokens.foreground }}>3</Text>
      </PageIconBtn>
      <PageIconBtn>
        <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={tokens.foreground} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="m9 18 6-6-6-6" />
        </Svg>
      </PageIconBtn>
    </Row>
  );
}

// A 14px radio: a ring with a filled inner dot when selected.
function RadioRow({ label, checked }: { label: string; checked?: boolean }) {
  const { tokens } = useTheme();
  return (
    <Row snug alignCenter>
      <View
        style={{
          width: 14,
          height: 14,
          borderRadius: 7,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: checked ? 4 : 1,
          borderColor: checked ? tokens.primary : tokens.input,
          backgroundColor: tokens.background,
        }}
      />
      <Text style={{ fontFamily: sans("400"), fontSize: 11, color: tokens.foreground }}>{label}</Text>
    </Row>
  );
}

function RadiosPreview() {
  return (
    <View style={{ gap: 6 }}>
      <RadioRow label="Pro" checked />
      <RadioRow label="Hobby" />
    </View>
  );
}

function SelectsPreview() {
  const { tokens } = useTheme();
  return (
    <View style={{ width: "100%", maxWidth: 160 }}>
      <View
        style={{
          height: 32,
          flexDirection: "row",
          alignItems: "center",
          borderRadius: 10,
          borderWidth: 1,
          borderColor: tokens.input,
          backgroundColor: tokens.background,
          paddingLeft: 12,
          paddingRight: 8,
        }}
      >
        <Text style={{ flex: 1, fontFamily: sans("400"), fontSize: 12, color: tokens.foreground }} numberOfLines={1}>
          United States
        </Text>
        <Svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={tokens["muted-foreground"]} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="m6 9 6 6 6-6" />
        </Svg>
      </View>
    </View>
  );
}

function SkeletonsPreview() {
  const { tokens } = useTheme();
  const bar = alpha(tokens.muted, 0.6);
  return (
    <Row snug alignCenter style={{ width: "100%", maxWidth: 180 }}>
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: bar }} />
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ height: 8, borderRadius: 6, backgroundColor: bar }} />
        <View style={{ height: 8, width: "75%", borderRadius: 6, backgroundColor: bar }} />
      </View>
    </Row>
  );
}

function TextareasPreview() {
  const { tokens } = useTheme();
  return (
    <View style={{ width: "100%", maxWidth: 180, minHeight: 40, borderRadius: 10, borderWidth: 1, borderColor: tokens.input, backgroundColor: tokens.background, padding: 8 }}>
      <Text style={{ fontFamily: sans("400"), fontSize: 12, color: tokens["muted-foreground"] }}>Description…</Text>
    </View>
  );
}

// A pill toggle: a track with a knob pinned left (off) or right (on).
function MiniToggle({ on }: { on: boolean }) {
  const { tokens } = useTheme();
  return (
    <View style={{ height: 20, width: 36, borderRadius: 9999, backgroundColor: on ? tokens.primary : tokens.muted, justifyContent: "center" }}>
      <View
        style={{
          height: 16,
          width: 16,
          borderRadius: 14,
          backgroundColor: tokens.background,
          marginLeft: on ? 18 : 2,
        }}
      />
    </View>
  );
}

function SwitchPreview() {
  return (
    <Row cozy>
      <MiniToggle on />
      <MiniToggle on={false} />
    </Row>
  );
}

function TooltipsPreview() {
  const { tokens } = useTheme();
  return (
    <View style={{ alignItems: "center", gap: 4 }}>
      <View style={{ paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, backgroundColor: tokens.foreground }}>
        <Text style={{ fontFamily: sans("400"), fontSize: 10, color: tokens.background }}>Tooltip</Text>
      </View>
      <Svg width={10} height={6} viewBox="0 0 10 6">
        <Polygon points="0,0 10,0 5,6" fill={tokens.foreground} />
      </Svg>
      <MiniBtn label="Hover me" variant="outline" />
    </View>
  );
}

export const ATOMS_TILES: CatTile[] = [
  { title: "View", href: "/components/view", Preview: ViewPreview },
  { title: "Text", href: "/components/text", Preview: TextPreview },
  { title: "Pressable", href: "/components/pressable", Preview: PressablePreview },
  { title: "Image", href: "/components/image", Preview: ImagePreview },
  { title: "TextInput", href: "/components/text-input", Preview: TextInputPreview },
  { title: "ScrollView", href: "/components/scroll-view", Preview: ScrollViewPreview },
  { title: "Autocomplete", href: "/components/autocomplete", Preview: AutocompletePreview },
  { title: "Avatar", href: "/components/avatar", Preview: AvatarsPreview },
  { title: "Badge", href: "/components/badge", Preview: BadgesPreview },
  { title: "Breadcrumb", href: "/components/breadcrumb", Preview: BreadcrumbsPreview },
  { title: "ButtonGroup", href: "/components/button-group", Preview: ButtonGroupsPreview },
  { title: "Button", href: "/components/button", Preview: ButtonsPreview },
  { title: "Checkbox", href: "/components/checkbox", Preview: CheckboxesPreview },
  { title: "Divider", href: "/components/divider", Preview: DividersPreview },
  { title: "Dropdown", href: "/components/dropdown", Preview: DropdownsPreview },
  { title: "Icon", href: "/components/icon", Preview: IconsPreview },
  { title: "Input", href: "/components/input", Preview: InputsFormsPreview },
  { title: "Pagination", href: "/components/pagination", Preview: PaginationPreview },
  { title: "Radio", href: "/components/radio", Preview: RadiosPreview },
  { title: "Select", href: "/components/select", Preview: SelectsPreview },
  { title: "Skeleton", href: "/components/skeleton", Preview: SkeletonsPreview },
  { title: "Textarea", href: "/components/textarea", Preview: TextareasPreview },
  { title: "Switch", href: "/components/switch", Preview: SwitchPreview },
  { title: "Tooltip", href: "/components/tooltip", Preview: TooltipsPreview },
];
