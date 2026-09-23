import { describe, it, expect, afterEach } from "bun:test";
import { render, cleanup, screen } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { Text } from "react-native";
import { ThemeProvider } from "../src/style/theme.tsx";

// Skin smoke test — the ONLY layer that loads the per-OS *.ios.tsx / *.android.tsx
// skin files. Every other suite imports the base `<name>.tsx` (the web build), so a
// skin that references a missing token, mis-shapes a StyleSheet, or throws at render
// on iOS or Android alone would ship untested. Here we dynamically import BOTH the
// iOS and the Android build of every skinned component and render each once inside
// ThemeProvider, asserting the export exists and the mount does not throw.
//
// Data-driven: one row per exported component, keyed by its directory + file base +
// export name, with the minimal props needed to render its body. We import the skin
// file by a variable path (../src/<dir>/<file>.<platform>.tsx) — bun resolves the
// react-native -> react-native-web alias transitively through the dynamic import,
// exactly as the static suites get it — and render with React.createElement so a
// single loop covers ~130 mounts without hand-writing each JSX case.
//
// Deliberately NOT covered here: `useToast` (a hook, not a renderable component — it
// is exercised via ToastProvider below and in components-extra.test.tsx). StackedBar,
// Gauge, and Heatmap live in the platform-neutral charts-viz.tsx but are re-exported
// from the charts skin files, so importing them through the skin still loads and
// mounts them per platform.

afterEach(cleanup);

/** Wrap raw strings in <Text> so View-only panels (Drawer, ToastProvider) are legal RN. */
const txt = (s: string) => createElement(Text, null, s);
const noop = () => {};

type Kids = ReactNode | ((mod: Record<string, unknown>) => ReactNode);

interface SkinCase {
  /** Exported symbol to render (also the test's display name unless `label` is set). */
  name: string;
  /** Display name, when two rows exercise the same export in different shapes. */
  label?: string;
  /** Component directory under src/, e.g. "atoms/avatar". */
  dir: string;
  /** File base name — the part before `.ios.tsx` / `.android.tsx`. */
  file: string;
  /** Minimal props satisfying the component's required props and rendering a body. */
  props?: Record<string, unknown>;
  /** Children; a function receives the resolved module (for AvatarGroup's Avatars). */
  children?: Kids;
}

const CASES: SkinCase[] = [
  // ---- atoms ----
  { name: "Avatar", dir: "atoms/avatar", file: "avatar", children: "AB" },
  // The `tiny` (24px) step the identity pill is built around: its own labelType
  // row on every skin, so a missing one throws here instead of at a call site.
  { name: "Avatar", label: "Avatar (tiny)", dir: "atoms/avatar", file: "avatar", props: { tiny: true }, children: "AB" },
  {
    name: "AvatarGroup",
    dir: "atoms/avatar",
    file: "avatar",
    props: { max: 2 },
    children: (mod) => [
      createElement(mod.Avatar as never, { key: "a" }, "AB"),
      createElement(mod.Avatar as never, { key: "b" }, "CD"),
      createElement(mod.Avatar as never, { key: "c" }, "EF"),
    ],
  },
  {
    // Opened, so the per-OS pill AND the menu it drives both mount on each platform.
    name: "AvatarMenu",
    dir: "atoms/avatar",
    file: "avatar",
    props: {
      open: true,
      name: "Rachel Chen",
      email: "rachel@example.com",
      items: [{ label: "Profile" }, { label: "Sign out", destructive: true }],
    },
  },
  { name: "Badge", dir: "atoms/badge", file: "badge", children: "New" },
  { name: "Breadcrumb", dir: "atoms/breadcrumb", file: "breadcrumb", props: { items: ["Home", "Library", "Data"] } },
  { name: "BreadcrumbItem", dir: "atoms/breadcrumb", file: "breadcrumb", props: { current: true }, children: "Home" },
  { name: "ButtonGroup", dir: "atoms/button-group", file: "button-group", props: { items: ["Day", "Week", "Month"], active: 0 } },
  { name: "Button", dir: "atoms/button", file: "button", children: "Save" },
  { name: "Checkbox", dir: "atoms/checkbox", file: "checkbox", props: { checked: false, description: "Secondary line" }, children: "Accept" },
  { name: "Chip", dir: "atoms/chip", file: "chip", children: "Filter" },
  { name: "Autocomplete", dir: "atoms/autocomplete", file: "autocomplete", props: { options: ["Apple", "Banana"], open: true, label: "Fruit", required: true } },
  { name: "Divider", dir: "atoms/divider", file: "divider" },
  { name: "Dropdown", dir: "atoms/dropdown", file: "dropdown", props: { label: "Menu", items: [{ label: "One" }, { label: "Two" }] } },
  { name: "Emblem", dir: "atoms/emblem", file: "emblem", props: { label: "AB", primary: true } },
  { name: "Icon", dir: "atoms/icon", file: "icon", props: { check: true } },
  { name: "InputOTP", dir: "atoms/input-otp", file: "input-otp", props: { value: "12", length: 6, onChangeText: noop } },
  { name: "Input", dir: "atoms/input", file: "input", props: { placeholder: "Email" } },
  { name: "Kbd", dir: "atoms/kbd", file: "kbd", children: "K" },
  { name: "Row", dir: "atoms/layout", file: "layout", children: txt("row") },
  { name: "Column", dir: "atoms/layout", file: "layout", children: txt("col") },
  { name: "Listbox", dir: "atoms/listbox", file: "listbox", props: { items: [{ label: "One", selected: true }, { label: "Two" }] } },
  { name: "Listbox", label: "Listbox multi", dir: "atoms/listbox", file: "listbox", props: { multi: true, accessibilityLabel: "Teams", items: [{ label: "One", selected: true }, { label: "Two" }] } },
  { name: "Stepper", dir: "atoms/stepper", file: "stepper", props: { value: 3, min: 0, max: 10, onChange: noop } },
  { name: "Pagination", dir: "atoms/pagination", file: "pagination", props: { page: 1, total: 5, onChange: noop } },
  // `inline` renders the popover card body directly (no trigger click needed).
  { name: "Popover", dir: "atoms/popover", file: "popover", props: { inline: true, title: "Title", description: "Body", actionLabel: "OK" } },
  { name: "Progress", dir: "atoms/progress", file: "progress", props: { value: 0.6 } },
  { name: "QRCode", dir: "atoms/qrcode", file: "qrcode", props: { value: "https://example.com" } },
  { name: "Radio", dir: "atoms/radio", file: "radio", props: { checked: false }, children: "Option" },
  {
    // The group builds from the Radio skin, so iOS mounts its checkmark list section here.
    name: "RadioGroup",
    dir: "atoms/radio",
    file: "radio",
    props: { defaultValue: "a", label: "Letter" },
    children: (mod) => [
      createElement(mod.Radio as never, { key: "a", value: "a" }, "A"),
      createElement(mod.Radio as never, { key: "b", value: "b" }, "B"),
    ],
  },
  { name: "Reveal", dir: "atoms/reveal", file: "reveal", children: txt("Revealed content") },
  { name: "Select", dir: "atoms/select", file: "select", props: { options: ["A", "B", "C"], value: "A", open: true, label: "Letter", required: true } },
  { name: "Skeleton", dir: "atoms/skeleton", file: "skeleton" },
  { name: "Slider", dir: "atoms/slider", file: "slider", props: { value: 40, min: 0, max: 100 } },
  { name: "Sparkline", dir: "charts/sparkline", file: "sparkline", props: { values: [1, 3, 2, 5, 4, 6] } },
  { name: "Spinner", dir: "atoms/spinner", file: "spinner" },
  // `value` + `detail` render both mono label lines alongside the block.
  { name: "Swatch", dir: "atoms/swatch", file: "swatch", props: { color: "#4f39f6", value: "--primary", detail: "oklch(0.511 0.262 276.966)" }, children: "primary" },
  { name: "Switch", dir: "atoms/switch", file: "switch", props: { checked: true }, children: "Wi-Fi" },
  { name: "Textarea", dir: "atoms/textarea", file: "textarea", props: { placeholder: "Notes", label: "Notes", required: true, rows: 3 } },
  // `open` renders the tip bubble body.
  { name: "Tooltip", dir: "atoms/tooltip", file: "tooltip", props: { label: "Tip", trigger: "Hover", open: true } },
  { name: "Typography", dir: "atoms/typography", file: "typography", props: { h1: true }, children: "Heading" },

  // ---- molecules ----
  // `card` + a per-item `description` + `defaultValue` exercise the card-surface
  // and stacked-label skin fields with an open panel on both native skins.
  { name: "Accordion", dir: "molecules/accordion", file: "accordion", props: { card: true, items: [{ key: "a", title: "Section A", description: "Secondary line", content: "Body A" }], defaultValue: "a" } },
  { name: "ActionPanel", dir: "molecules/action-panels", file: "action-panels", props: { title: "Delete project", description: "This cannot be undone.", actionLabel: "Delete", destructive: true } },
  { name: "AlertDialog", dir: "molecules/alert-dialog", file: "alert-dialog", props: { open: true, title: "Are you sure?", description: "This deletes the record.", confirmLabel: "Delete", cancelLabel: "Cancel" } },
  { name: "Alert", dir: "molecules/alert", file: "alert", props: { title: "Heads up", description: "Your trial ends soon.", info: true } },
  { name: "Card", dir: "molecules/card", file: "card", props: { title: "Card", description: "Subtitle", body: "Body copy", footer: "Footer" } },
  { name: "CodeBlock", dir: "molecules/code-block", file: "code-block", props: { code: "const x = 1;\nconsole.log(x);", language: "ts" } },
  // `card` + `description` exercise the card-surface and stacked-label skin
  // fields with an open panel on both native skins.
  { name: "Collapsible", dir: "molecules/collapsible", file: "collapsible", props: { title: "More", description: "Secondary line", card: true, defaultOpen: true }, children: "Panel body" },
  { name: "DescriptionList", dir: "molecules/description-lists", file: "description-lists", props: { items: [{ term: "Name", value: "Ada" }, { term: "Role", value: "Engineer" }] } },
  { name: "EmptyState", dir: "molecules/empty-state", file: "empty-state", props: { icon: "∅", title: "No results", description: "Try a different search.", actionLabel: "Reset" } },
  { name: "Field", dir: "molecules/field", file: "field", props: { label: "Email", helper: "We'll never share your email." }, children: "control" },
  { name: "Feed", dir: "molecules/feeds", file: "feeds", props: { items: [{ actor: "Rachel Chen", action: "approved the request", time: "2 hours ago" }] } },
  { name: "Form", dir: "molecules/form", file: "form", props: { submitLabel: "Save", cancelLabel: "Cancel", children: "Stitched fields" } },
  { name: "FormSection", dir: "molecules/form", file: "form", props: { title: "Personal info", description: "Displayed on your profile.", children: "Stitched fields" } },
  { name: "GridList", dir: "molecules/grid-lists", file: "grid-lists", props: { items: [{ title: "Design", subtitle: "12 files" }, { title: "Research", subtitle: "3 files" }] } },
  { name: "MediaObject", dir: "molecules/media-objects", file: "media-objects", props: { title: "Rachel Chen", description: "Product designer", avatar: "RC" } },
  { name: "StackedList", dir: "molecules/stacked-lists", file: "stacked-lists", props: { items: [{ name: "Ada Lovelace", detail: "ada@acme.dev" }, { name: "Alan Turing", detail: "alan@acme.dev" }] } },
  // Reorderable + trailing mount the per-OS drag grips and the trailing-slot branch.
  {
    name: "StackedList",
    dir: "molecules/stacked-lists",
    file: "stacked-lists",
    props: {
      reorderable: true,
      items: [
        { id: "ada", name: "Ada Lovelace", detail: "ada@acme.dev", trailing: txt("Owner") },
        { id: "alan", name: "Alan Turing", detail: "alan@acme.dev" },
      ],
    },
  },
  { name: "Stats", dir: "molecules/stats", file: "stats", props: { items: [{ label: "Total users", value: "12,847", delta: "+12.5%" }, { label: "Revenue", value: "$48.2k" }] } },

  // ---- organisms ----
  { name: "ActionSheet", dir: "organisms/action-sheet", file: "action-sheet", props: { open: true, onOpenChange: noop, title: "Options", actions: [{ label: "Delete", destructive: true, onPress: noop }, { label: "Share", onPress: noop }] } },
  // Board mounts the full kanban anatomy per platform: lanes, column header badges, a
  // pressable card body, the drag grip, a kebab menu, an item badge, and an empty column.
  {
    name: "Board",
    dir: "organisms/board",
    file: "board",
    props: {
      columns: [{ id: "todo", label: "To do" }, { id: "doing", label: "Doing", badge: "WIP" }],
      items: [
        { id: "a", columnId: "todo", title: "Task A", description: "Two-line description copy.", badge: "3", chips: txt("frontend"), menu: [{ label: "Archive" }] },
        { id: "b", columnId: "todo", title: "Task B" },
      ],
      onPressItem: noop,
    },
  },
  { name: "Calendar", dir: "organisms/calendar", file: "calendar", props: { month: "June 2026", selected: 10, today: 12, daysInMonth: 30, startWeekday: 1, events: [{ day: 10, title: "Standup", start: 9 }, { day: 12 }] } },
  // Week + day views mount the timeline half of every skin (hour axis, slot lines, event blocks).
  { name: "Calendar", dir: "organisms/calendar", file: "calendar", props: { week: true, month: "June 2026", selected: 10, today: 12, daysInMonth: 30, startWeekday: 1, events: [{ day: 10, title: "Standup", start: 9 }, { day: 11, title: "Review", start: 9.5, end: 11 }] } },
  { name: "Calendar", dir: "organisms/calendar", file: "calendar", props: { day: true, month: "June 2026", selected: 10, daysInMonth: 30, startWeekday: 1, events: [{ day: 10, title: "Standup", start: 9 }, { day: 10, title: "Overlap", start: 9.5, end: 11 }] } },
  // Range mode mounts the band + endpoint treatment of every skin.
  { name: "Calendar", dir: "organisms/calendar", file: "calendar", props: { range: true, month: "June 2026", daysInMonth: 30, startWeekday: 1, defaultRangeStart: 8, defaultRangeEnd: 14 } },
  { name: "Carousel", dir: "organisms/carousel", file: "carousel", props: { index: 0, onIndexChange: noop, items: [{ key: "a", content: "A" }, { key: "b", content: "B" }, { key: "c", content: "C" }] } },
  { name: "Chart", dir: "charts/chart", file: "chart", props: { title: "Signups", data: [{ label: "Mon", value: 3 }, { label: "Tue", value: 5 }, { label: "Wed", value: 2 }] } },
  { name: "StackedBar", dir: "charts/stacked-bar", file: "stacked-bar", props: { label: "Traffic sources", segments: [{ label: "Direct", value: 60 }, { label: "Search", value: 40 }] } },
  { name: "Gauge", dir: "charts/gauge", file: "gauge", props: { value: 72, label: "Uptime" } },
  { name: "Heatmap", dir: "charts/heatmap", file: "heatmap", props: { label: "Activity", values: [0.1, 0.4, 0.8, 0.2, 0.9, 0.5] } },
  { name: "BarList", dir: "charts/bar-list", file: "bar-list", props: { title: "Top pages", items: [{ label: "/docs", value: 4 }, { label: "/blog", value: 2 }] } },
  { name: "MetricBreakdown", dir: "charts/metric-breakdown", file: "metric-breakdown", props: { value: "12.4k", label: "Requests", breakdown: [{ label: "GET", value: 8 }, { label: "POST", value: 4 }] } },
  { name: "UptimeBar", dir: "charts/uptime-bar", file: "uptime-bar", props: { label: "Uptime", periods: [{}, { down: true }, { degraded: true }] } },
  { name: "ServiceHealthList", dir: "charts/service-health-list", file: "service-health-list", props: { title: "Status", items: [{ label: "API" }, { label: "Web", degraded: true }] } },
  { name: "BulletChart", dir: "charts/bullet-chart", file: "bullet-chart", props: { title: "Targets", data: [{ label: "Revenue", value: 275, target: 300, ranges: [200, 350] }] } },
  { name: "ProgressRing", dir: "charts/progress-ring", file: "progress-ring", props: { value: 72, label: "Complete" } },
  { name: "ComposedChart", dir: "charts/composed-chart", file: "composed-chart", props: { title: "Revenue", labels: ["Q1", "Q2"], series: [{ label: "Revenue", values: [4, 5] }, { label: "Margin", values: [1, 2], line: true }] } },
  { name: "RangeAreaChart", dir: "charts/range-area-chart", file: "range-area-chart", props: { title: "Band", label: "Range", labels: ["Mon", "Tue"], data: [{ low: 1, high: 3, mid: 2 }, { low: 2, high: 4, mid: 3 }] } },
  { name: "Histogram", dir: "charts/histogram", file: "histogram", props: { title: "Latency", label: "ms", values: [1, 2, 2, 3, 3, 3, 4, 8] } },
  { name: "BoxPlot", dir: "charts/box-plot", file: "box-plot", props: { title: "Spread", data: [{ label: "A", values: [1, 2, 3, 4, 5] }, { label: "B", values: [2, 3, 4, 5, 9] }] } },
  { name: "WaterfallChart", dir: "charts/waterfall-chart", file: "waterfall-chart", props: { title: "Bridge", steps: [{ label: "Start", value: 100, total: true }, { label: "Up", value: 30 }, { label: "Down", value: -12 }] } },
  { name: "RadialBarChart", dir: "charts/radial-bar-chart", file: "radial-bar-chart", props: { label: "Activation", data: [{ label: "iOS", value: 64 }, { label: "Web", value: 82 }], max: 100 } },
  { name: "FunnelChart", dir: "charts/funnel-chart", file: "funnel-chart", props: { title: "Funnel", stages: [{ label: "Visits", value: 100 }, { label: "Paid", value: 20 }] } },
  { name: "RadarChart", dir: "charts/radar-chart", file: "radar-chart", props: { title: "Profile", axes: ["A", "B", "C"], series: [{ label: "X", values: [1, 2, 3] }] } },
  { name: "Treemap", dir: "charts/treemap", file: "treemap", props: { title: "Storage", data: [{ label: "Media", value: 6 }, { label: "Logs", value: 2 }] } },
  { name: "GeoMap", dir: "charts/geo-map", file: "geo-map", props: { title: "Installs", points: [{ label: "London", lat: 51.5, lng: -0.13, count: 40 }, { label: "Tokyo", lat: 35.69, lng: 139.69, count: 12 }] } },
  { name: "GeoMap", label: "GeoMap zoomable", dir: "charts/geo-map", file: "geo-map", props: { zoomable: true, title: "Installs", points: [{ label: "London", lat: 51.5, lng: -0.13, count: 40 }, { label: "Tokyo", lat: 35.69, lng: 139.69, count: 12 }] } },
  { name: "LineChart", dir: "charts/line-chart", file: "line-chart", props: { title: "Signups", labels: ["Jan", "Feb", "Mar"], series: [{ label: "Web", values: [1, 3, 2] }, { label: "Mobile", values: [2, 1, 4] }] } },
  { name: "PieChart", dir: "charts/pie-chart", file: "pie-chart", props: { label: "Traffic", donut: true, slices: [{ label: "Direct", value: 60 }, { label: "Search", value: 40 }] } },
  { name: "ScatterPlot", dir: "charts/scatter-plot", file: "scatter-plot", props: { title: "Load vs latency", series: [{ label: "A", points: [{ x: 1, y: 2 }, { x: 3, y: 4 }] }] } },
  { name: "CandlestickChart", dir: "charts/candlestick-chart", file: "candlestick-chart", props: { title: "Daily", labels: ["Mon", "Tue"], candles: [{ open: 1, high: 3, low: 0.5, close: 2 }, { open: 2, high: 4, low: 1.5, close: 1.8 }], volume: [10, 12] } },
  { name: "DepthChart", dir: "charts/depth-chart", file: "depth-chart", props: { title: "Book", bids: [{ price: 10, size: 5 }], asks: [{ price: 11, size: 4 }] } },
  { name: "AreaChart", dir: "charts/area-chart", file: "area-chart", props: { title: "Traffic", labels: ["Jan", "Feb", "Mar"], series: [{ label: "Direct", values: [1, 3, 2] }, { label: "Search", values: [2, 1, 4] }], stacked: true } },
  { name: "Command", dir: "organisms/command", file: "command", props: { open: true, placeholder: "Search…", active: 0, groups: [{ heading: "Actions", items: [{ label: "New file" }, { label: "Open" }] }] } },
  // Unlocked, so each platform mounts the customize-mode anatomy too: the cell affordance,
  // the grip row, and that platform's own DragDrop family around every cell.
  {
    name: "DashboardGrid",
    dir: "organisms/dashboard-grid",
    file: "dashboard-grid",
    props: {
      unlocked: true,
      items: [
        { id: "a", span: 8, title: "Revenue", content: txt("Revenue widget") },
        { id: "b", span: 4, narrowSpan: 6, title: "Signups", content: txt("Signups widget") },
      ],
    },
  },
  { name: "DataTable", dir: "organisms/data-table", file: "data-table", props: { columns: ["Name", "Role"], rows: [["Ada", "Eng"], ["Bob", "PM"]] } },
  { name: "Dialog", dir: "organisms/dialog", file: "dialog", props: { open: true, onOpenChange: noop, title: "Edit profile", description: "Update your details.", confirmLabel: "Save", cancelLabel: "Cancel" } },
  // DragDropProvider renders a full mini-board so all four skin-consuming members (provider,
  // zone, draggable, handle) mount together with real context on each platform.
  {
    name: "DragDropProvider",
    dir: "organisms/drag-drop",
    file: "drag-drop",
    children: (mod) =>
      createElement(
        mod.DropZone as never,
        { id: "z", label: "Zone" },
        createElement(
          mod.Draggable as never,
          { id: "d", data: { n: 1 } },
          createElement(mod.DragHandle as never, { label: "Reorder item" }),
          txt("Card"),
        ),
      ),
  },
  { name: "DropZone", dir: "organisms/drag-drop", file: "drag-drop", props: { id: "z", label: "Zone" }, children: txt("Zone body") },
  { name: "Draggable", dir: "organisms/drag-drop", file: "drag-drop", props: { id: "d", data: {} }, children: txt("Card") },
  { name: "DragHandle", dir: "organisms/drag-drop", file: "drag-drop", props: { label: "Reorder" } },
  { name: "Drawer", dir: "organisms/drawer", file: "drawer", props: { open: true, onOpenChange: noop, left: true }, children: txt("Drawer panel content") },
  { name: "FilterPanel", dir: "organisms/filter-panel", file: "filter-panel", props: { groups: [{ title: "Status", options: [{ label: "Active", checked: true }, { label: "Archived" }] }] } },
  { name: "Navbar", dir: "organisms/navbars", file: "navbars", props: { brand: "Acme", links: ["Home", "Docs", "Pricing"], active: 0, actionLabel: "Sign in" } },
  { name: "RowMenu", dir: "organisms/row-menu", file: "row-menu", props: { open: true, items: [{ label: "Edit" }, { label: "Delete", destructive: true }] } },
  { name: "Sidebar", dir: "organisms/sidebar", file: "sidebar", props: { items: [{ label: "Dashboard", icon: "■" }, { label: "Settings", badge: "3" }], active: 0 } },
  { name: "Steps", dir: "organisms/steps", file: "steps", props: { current: 1, steps: [{ label: "Cart" }, { label: "Shipping" }, { label: "Payment" }] } },
  { name: "TabBar", dir: "organisms/tab-bar", file: "tab-bar", props: { active: "a", onSelect: noop, items: [{ key: "a", label: "Home", icon: () => txt("H") }, { key: "b", label: "Search", icon: () => txt("S") }] } },
  { name: "Tabs", dir: "organisms/tabs", file: "tabs", props: { tabs: ["One", "Two", "Three"], active: 0 } },
  { name: "Toast", dir: "organisms/toast", file: "toast", props: { message: "Saved", success: true } },
  { name: "ToastProvider", dir: "organisms/toast", file: "toast", children: txt("App content") },
];

// "web" is the bare `<file>.tsx` build (no platform suffix); ios/android are the
// per-OS skin forks. Mounting the web build here too means the components that live
// ONLY in this suite (the behaviorally smoke-only ones) still get their web render
// exercised, not just their native skins.
const PLATFORMS = ["web", "ios", "android"] as const;

for (const platform of PLATFORMS) {
  describe(`${platform} skins mount inside ThemeProvider`, () => {
    for (const c of CASES) {
      it(`${c.label ?? c.name}`, async () => {
        const suffix = platform === "web" ? "" : `.${platform}`;
        const mod = (await import(`../src/${c.dir}/${c.file}${suffix}.tsx`)) as Record<string, unknown>;
        const Comp = mod[c.name];
        // A renamed/dropped export in a skin file is itself a defect this catches.
        expect(Comp, `${c.name} not exported from ${c.dir}/${c.file}${suffix}.tsx`).toBeDefined();
        const kids = typeof c.children === "function" ? (c.children as (m: Record<string, unknown>) => ReactNode)(mod) : c.children;
        // The core assertion: the skin renders on this platform without throwing
        // (a missing token, bad StyleSheet, or runtime error surfaces here).
        expect(() => {
          render(createElement(ThemeProvider, null, createElement(Comp as never, c.props ?? null, kids)));
        }).not.toThrow();
        if (c.name === "Stepper") {
          // An iOS/Android skin preview in a browser still needs web semantics.
          const field = screen.getByRole("spinbutton", { name: "Number" });
          expect(field.tagName).toBe("INPUT");
          expect(screen.getByRole("group", { name: "Number" }).contains(field)).toBe(true);
          expect(screen.queryByRole("slider")).toBeNull();
        }
        if (c.name === "Listbox" && c.props?.multi) {
          const group = screen.getByRole("group", { name: "Teams" });
          expect(screen.getAllByRole("checkbox")).toHaveLength(2);
          expect(group.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
          expect(group.querySelector('[aria-hidden="true"] [tabindex]')).toBeNull();
        }
      });
    }

    // The indicator is a selection visual, so it mirrors the SELECTION Checkbox: a
    // one-setting Checkbox is the switch on iOS and Android (the design language's item 5).
    it("Listbox and its private indicator keep the platform selection Checkbox artwork without its interaction", async () => {
      const suffix = platform === "web" ? "" : `.${platform}`;
      const { Checkbox } = await import(`../src/atoms/checkbox/checkbox${suffix}.tsx`);
      const { CheckboxIndicator } = await import(`../src/atoms/checkbox/indicator/index${suffix}.tsx`);
      const { Listbox } = await import(`../src/atoms/listbox/listbox${suffix}.tsx`);
      for (const checked of [false, true]) {
        for (const disabled of [false, true]) {
          const publicControl = render(
            <ThemeProvider><Checkbox selection checked={checked} disabled={disabled} accessibilityLabel="Choice" /></ThemeProvider>,
          );
          const checkbox = publicControl.getByRole("checkbox", { name: "Choice" });
          const expectedArtwork = checkbox.firstElementChild?.outerHTML;
          const expectedOpacity = getComputedStyle(checkbox).opacity;
          publicControl.unmount();
          const decorative = render(<ThemeProvider><CheckboxIndicator checked={checked} disabled={disabled} /></ThemeProvider>);
          const indicator = decorative.container.firstElementChild as HTMLElement;
          expect(indicator.firstElementChild?.outerHTML).toBe(expectedArtwork);
          expect(getComputedStyle(indicator).opacity).toBe(expectedOpacity);
          expect(decorative.container.querySelector('[role], [tabindex], button, input')).toBeNull();
          decorative.unmount();

          const list = render(
            <ThemeProvider><Listbox multi items={[{ label: "Choice" }]} selected={checked ? [0] : []} disabled={disabled} /></ThemeProvider>,
          );
          const row = list.getByRole("checkbox", { name: "Choice" });
          const composedIndicator = row.querySelector('[aria-hidden="true"]')?.firstElementChild as HTMLElement;
          expect(composedIndicator.firstElementChild?.outerHTML).toBe(expectedArtwork);
          expect(getComputedStyle(composedIndicator).opacity).toBe(expectedOpacity);
          expect(composedIndicator.querySelector('[role], [tabindex], button, input')).toBeNull();
          list.unmount();
        }
      }
    });
  });
}
