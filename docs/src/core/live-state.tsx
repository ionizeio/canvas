import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { View, Text, Icon, OverlayProvider, useTheme, Row, Column, Button, Typography, Card, Avatar, Skeleton, type IconProps, type ToastHandle } from "@ionizeio/canvas";
import { useReducedMotion, useResponsive } from "../../../src/style/index.js";
// The kit's glyph table, read straight from source like the style helpers above (the
// public Icon renders one glyph at a time and does not expose the catalog). Used only by
// the docs-only IconGallery below.
import { NAMES } from "../../../src/atoms/icon/icon.glyphs.js";

// Docs-only live-example infrastructure (not a Canvas component, not shipped): a
// render-prop state holder so a stateless example fence can still demonstrate
// CONTROLLED usage. An example fence is a single JSX expression invoked as a plain
// function, so it cannot call hooks itself; `Stateful` owns one piece of state in its
// own component fiber (where hooks are valid) and hands it to its children with a
// setter. That lets an example wire an external control (a Button, a Stepper) to a
// component's controlled `value` prop, e.g.:
//
//   <Stateful initial="step-1">
//     {(step, setStep) => (
//       <><Button onPress={() => setStep("step-2")}>Next</Button>
//         <Accordion value={step} items={STEPS} /></>
//     )}
//   </Stateful>
//
// The name is deliberately distinctive (not "State"): the docgen adds any scope name
// it sees as a whole word in a fence to that example's destructure, so a common word
// would pollute unrelated examples (e.g. a Select whose label is "State"). It renders
// no UI of its own; keep its type in sync with the `StatefulHelper` alias in
// ./scope.ts, which types it for the example scope.
export function Stateful<T>({
  initial,
  children,
}: {
  initial: T;
  children: (value: T, set: (next: T) => void) => ReactNode;
}): ReactNode {
  const [value, setValue] = useState<T>(initial);
  return <>{children(value, setValue)}</>;
}

// Docs-only live-example bridge for the imperative Toast API (not a Canvas export). Toast's
// primary usage is imperative — mount a <ToastProvider> and call the toast handle from the
// useToast hook — but an example fence is a single JSX expression invoked as a plain function,
// so it cannot call a hook itself (the same reason Stateful exists). WithToast is rendered
// INSIDE a <ToastProvider> and calls the hook it is handed, then passes the live handle to its
// children, letting a fence wire a real Button to toast(...):
//
//   <ToastProvider>
//     <WithToast hook={useToast}>
//       {({ toast }) => <Button onPress={() => toast({ message: "Saved" })}>Show toast</Button>}
//     </WithToast>
//   </ToastProvider>
//
// The hook is passed in (not imported here) so each 3-up column calls its OWN platform's
// useToast, which shares a React context with that column's ToastProvider; importing one web
// useToast here would read the wrong (null) context under the iOS/Android providers and throw.
// Keep its type in sync with the `WithToastHelper` alias in ./scope.ts.
export function WithToast({
  hook,
  children,
}: {
  hook: () => ToastHandle;
  children: (handle: ToastHandle) => ReactNode;
}): ReactNode {
  return <>{children(hook())}</>;
}

// Docs-only "app screen" for the imperative Toast example (not a Canvas export). A live toast
// is bottom-anchored to the nearest OverlayProvider outlet; the docs Playground mounts ONE
// stage-level outlet that spans the preview rows AND the code block, so a toast fired from the
// example lands at the bottom of the (tall) code block, mostly below the fold. AppScreen is a
// bounded region that hosts its OWN OverlayProvider, so the toast re-anchors to this screen and
// floats within view — and because each 3-up column renders its own AppScreen, each platform's
// toast stays contained to its column instead of stacking at the bottom of the whole stage. It
// stands in for "your app root" (which likewise mounts an OverlayProvider). A fixed width avoids
// the FitStage %-width collapse; styling is free here because this is the live-example frame, not
// a fence. Keep its type in sync with the `AppScreenHelper` alias in ./scope.ts.
export function AppScreen({ children }: { children: ReactNode }): ReactNode {
  const { tokens } = useTheme();
  return (
    <OverlayProvider
      style={{
        width: 420,
        maxWidth: "100%",
        minHeight: 220,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: tokens.border,
        overflow: "hidden",
      }}
    >
      {children}
    </OverlayProvider>
  );
}

// Docs-only live-example frame: a compact, RESPONSIVE app shell that showcases a Sidebar the
// way a real app mounts it — the nav rail beside a content pane on desktop, and a hamburger
// that opens the drill-down Liquid Glass menu on a narrow (phone) viewport, exactly like the
// docs' own left nav. The example fence supplies the real `<Sidebar responsive .../>` through
// the render-prop child; AppShell owns the surrounding chrome (the framed window, the top bar
// with its width-appropriate control, and a placeholder page) so the fence stays focused on
// the Sidebar API. Like AppScreen it hosts its OWN OverlayProvider, so the drawer the Sidebar
// portals at narrow widths stays contained to this frame instead of taking over the docs page.
// The width test mirrors the Sidebar's own drawer breakpoint (`lg` = 1024). Styling is free
// here because this is the live-example frame, not a fence. Keep its type in sync with the
// `AppShellHelper` alias in ./scope.ts.
export function AppShell({
  children,
}: {
  children: (state: {
    open: boolean;
    setOpen: (next: boolean) => void;
    active: string;
    select: (item: { label: string }) => void;
  }) => ReactNode;
}): ReactNode {
  const { tokens } = useTheme();
  const narrow = useResponsive({ base: false, lg: true });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("Dashboard");
  // A leaf selection updates the mock page title and (on narrow) dismisses the drawer, the
  // same wiring a real app hangs off the Sidebar's onSelect.
  const select = (item: { label: string }) => {
    setActive(item.label);
    setOpen(false);
  };
  const sidebar = children({ open, setOpen, active, select });

  // The mock page beside (or under) the rail: a top bar + a couple of placeholder cards, so the
  // sidebar reads as app chrome instead of a lone rail floating in the stage.
  const page = (
    <Column fill style={{ backgroundColor: tokens.muted, minWidth: 0 }}>
      <Row
        alignCenter
        snug
        style={{ height: 52, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: tokens.border, backgroundColor: tokens.background }}
      >
        {narrow ? (
          <Button ghost icon small accessibilityLabel="Open menu" iconLeft={<Icon menu size={18} />} onPress={() => setOpen(true)} />
        ) : null}
        <Typography body semibold>
          {active}
        </Typography>
        <View style={{ flex: 1 }} />
        <Avatar small name="Rachel Chen" />
      </Row>
      <Column pad relaxed fill>
        <Typography h4>Good morning, Rachel</Typography>
        <Row wrap relaxed>
          <Card raised grow title="$48,250" description="Revenue this week" />
          <Card raised grow title="1,204" description="Active users today" />
        </Row>
        <Card raised grow>
          <Column snug>
            <Typography body semibold>Recent activity</Typography>
            <Skeleton list />
          </Column>
        </Card>
      </Column>
    </Column>
  );

  return (
    <OverlayProvider
      style={{
        width: "100%",
        height: 480,
        maxWidth: "100%",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: tokens.border,
        overflow: "hidden",
        backgroundColor: tokens.background,
      }}
    >
      {narrow ? (
        // Narrow: the rail collapses to a hamburger; the Sidebar renders the drill-down drawer
        // as an overlay portaled into this frame (position in the tree is irrelevant).
        <>
          {page}
          {sidebar}
        </>
      ) : (
        // Desktop: the rail sits flush against the content pane (the Sidebar draws its own right
        // hairline in shell mode), filling the frame height. The Sidebar's shell column is
        // `flex: 1`, so it must sit in a plain flex-less View that takes the column's own 240/56
        // width (the same wrapper the docs shell uses); otherwise it would grow to half the frame.
        <Row fill flush>
          <View>{sidebar}</View>
          {page}
        </Row>
      )}
    </OverlayProvider>
  );
}

// Docs-only live-example ticker (not a Canvas export): steps a value through `values` on
// an interval so a fence can show a component driving ITSELF, e.g. a determinate Progress
// bar filling. Like Stateful it owns the hook state in its own fiber (a fence is a plain
// function and cannot call hooks). Honors Reduce Motion — it stops auto-advancing and holds
// one representative frame (`restIndex`, default the midpoint) so the page carries no
// perpetual motion for users who opted out. Keep its type in sync with the `TickerHelper`
// alias in ./scope.ts.
export function Ticker<T>({
  values,
  interval = 1400,
  restIndex = Math.floor((values.length - 1) / 2),
  children,
}: {
  values: T[];
  interval?: number;
  restIndex?: number;
  children: (value: T) => ReactNode;
}): ReactNode {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (reduced) return; // honor Reduce Motion: hold a single frame, no auto-advance
    const id = setInterval(() => setIndex((n) => (n + 1) % values.length), interval);
    return () => clearInterval(id);
  }, [interval, values.length, reduced]);
  const value = reduced ? values[Math.min(restIndex, values.length - 1)] : values[index];
  return <>{children(value)}</>;
}

// Docs-only reducer for the DragDrop examples (not a Canvas export): apply a DropEvent to a
// flat list of `{ id, zone, … }` cards, returning a new list where the dropped card's `zone`
// becomes the target and it sits at `index` within that zone. Cards render by filtering on
// `zone`, so only per-zone order matters; this preserves every zone's order and moves the one
// card. Keeps a fence's onDrop a single clean expression. Keep in sync with the
// `ApplyDropHelper` alias in ./scope.ts.
export function applyDrop<T extends { id: string; zone: string }>(
  cards: T[],
  e: { id: string; to: string; index: number },
): T[] {
  const moved = cards.find((c) => c.id === e.id);
  if (!moved) return cards;
  const without = cards.filter((c) => c.id !== e.id);
  const updated = { ...moved, zone: e.to };
  const target = without.filter((c) => c.zone === e.to);
  const others = without.filter((c) => c.zone !== e.to);
  target.splice(Math.max(0, Math.min(e.index, target.length)), 0, updated);
  return [...others, ...target];
}

// Select a glyph by its (string) name from Icon's one-boolean-per-name API. The name comes
// from the kit's own NAMES table, so it always resolves to a real glyph; the cast just bridges
// a dynamic string to the static prop shape (Icon reads the active name boolean at runtime).
function glyphByName(name: string): IconProps {
  return { [name]: true } as unknown as IconProps;
}

// The live search query for the Icon catalog. The Playground owns the ONE search field above
// the 3-up stage and publishes its text here; every platform column's IconGallery reads it, so a
// single control filters all three previews at once. Defaults to "" (unfiltered) when an
// IconGallery is rendered outside the Playground.
export const IconSearchContext = createContext("");

// Docs-only Icon catalog grid (not a Canvas component, not shipped): the wrapping, labeled grid
// of every kit glyph, filtered by the shared search query from IconSearchContext. Rendered as
// the Icon page's "Gallery" example — once per platform column, so all three columns filter
// together from the single search field the Playground draws above the stage. The kit Icon draws
// a single glyph; browsing the whole set is a docs concern, so the catalog lives here rather than
// as an Icon prop. Grid layout is docs-only infrastructure, so it composes raw Views (as the
// Playground harness does), not kit layout props. Keep its type in sync with the
// `IconGalleryHelper` alias in ./scope.ts.
export function IconGallery(): ReactNode {
  const { tokens } = useTheme();
  const query = useContext(IconSearchContext);
  const q = query.trim().toLowerCase();
  const matches = q
    ? NAMES.filter(({ key, label }) => key.toLowerCase().includes(q) || label.toLowerCase().includes(q))
    : NAMES;
  if (matches.length === 0) {
    return (
      <Text style={{ fontSize: 13, color: tokens["muted-foreground"], paddingVertical: 8 }}>
        No icons match "{query}".
      </Text>
    );
  }
  return (
    <View style={{ width: "100%", flexDirection: "row", flexWrap: "wrap" }}>
      {matches.map(({ key, label }) => (
        <View key={key} style={{ width: 80, alignItems: "center", gap: 6, borderRadius: 8, paddingHorizontal: 4, paddingVertical: 10 }}>
          <Icon {...glyphByName(key)} size={20} />
          <Text style={{ fontSize: 10, color: tokens["muted-foreground"] }}>{label}</Text>
        </View>
      ))}
    </View>
  );
}
