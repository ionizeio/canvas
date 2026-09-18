import { Component, Fragment, type ReactNode, useEffect, useState } from "react";
import { Platform } from "react-native";
import { ScrollView, View, Text, Row, Column, Tabs, Input, ButtonGroup, BackdropHost, OverlayProvider, BreakpointOverride, useMeasuredWidth, useTheme, type IconName, type BreakpointKey, useResponsive } from "@ionizeio/canvas";
import { buildScopes } from "../core/build-scopes";
import { IconSearchContext } from "../core/live-state";
import type { DocExample, ExampleScope } from "../core/scope";
import { CodeBlock } from "./code-block";
import { DocsSurface } from "./surface";
import { sans } from "./fonts";

// Docs-only: example helpers whose fence renders a searchable catalog. When the selected
// example's code uses one, the Playground draws a SINGLE search field above the 3-up stage and
// publishes its text through IconSearchContext, so that one control filters every platform column
// at once (see IconGallery) instead of a separate box per column. The value is the placeholder.
const SEARCHABLE_EXAMPLES: Record<string, string> = { IconGallery: "Search icons" };

// The form-factor simulator behind the icon switcher in the stage header (WEB
// docs only: on a device you ARE the form factor, so the native app never
// renders it). Selecting a tier does two things at once, so the container- and
// viewport-driven halves of the kit's responsive system tell the same story:
//   - constrains the preview card to the tier's width, which the
//     container-measured components (DataTable, Grid, Row stacks, Navbar)
//     re-fit to, and
//   - pins the kit's viewport bucket via BreakpointOverride, which the
//     useBreakpoint / useResponsive / useFormFactor consumers (the Sidebar and
//     FilterPanel drawers, DescriptionList) resolve as the simulated tier. The
//     override wraps the stage's OverlayProvider, so portaled overlay content
//     (menus, dialogs, the calendar peek) simulates too.
// The tiers walk the kit's own breakpoint scale (src/style/tokens.ts
// `breakpoints`: sm 640, md 768, lg 1024, xl 1280), one preview per bucket a
// component can switch on, plus a phone that sits well inside `sm`. Full width
// is the resting state: no width constraint, no override. In a stage narrower
// than the tier (a laptop tier in a mid-width window) the card clamps to the
// stage and the readout shows the MEASURED width, so it never overstates.
const FORM_FACTORS: readonly { label: string; icon: IconName; width: number | null; bucket: BreakpointKey | "base" | null }[] = [
  { label: "Phone width (375px)", icon: "smartphone", width: 375, bucket: "sm" },
  { label: "Large phone width (640px)", icon: "phone", width: 640, bucket: "sm" },
  { label: "Tablet width (768px)", icon: "tablet", width: 768, bucket: "md" },
  { label: "Laptop width (1024px)", icon: "laptop", width: 1024, bucket: "lg" },
  { label: "Desktop width (1280px)", icon: "monitor", width: 1280, bucket: "xl" },
  { label: "Full width", icon: "maximize", width: null, bucket: null },
];

export class ExampleErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
  render() {
    if (this.state.error) return <ErrorNote message={this.state.error} />;
    return this.props.children;
  }
}

function ErrorNote({ message }: { message: string }) {
  const { tokens } = useTheme();
  return (
    <Column tight style={{ borderRadius: 8, borderWidth: 1, borderColor: tokens.destructive, padding: 10 }}>
      <Text style={{ fontFamily: sans("600"), fontSize: 12, color: tokens.destructive }}>Example failed to render</Text>
      <Text style={{ fontSize: 11, color: tokens["muted-foreground"] }}>{message}</Text>
    </Column>
  );
}

// Holds a preview sized to the stage. The stage is a DEFINITE-width box that centers
// its children (`width:"100%"` + `alignItems:"center"`), which is the layout the kit's
// sizing natures (src/style/sizing.ts) are built for:
//   - a FILL example (a field, a card, a table, a chart) resolves `width:"100%"` against
//     the stage's real width, so it fills the stage and keeps resizing with it;
//   - a HUG example (a bare `<Button>`, a badge) is content-sized under `alignItems:
//     "center"` and stays centered, never stretched to full width;
//   - a wide example (a flex-wrap row of chips, the icon gallery) is shrink-to-fit
//     against the stage width, so it wraps onto more lines instead of running off the
//     edge.
// It used to be a content-sized `maxWidth` box instead. In a content-sized parent a
// `width:"100%"` child resolves to its own content (the `field-width.ts` post-mortem: a
// text field then re-sized on every keystroke), which is why every fill component once
// carried a fixed pixel width. The definite stage removes that root cause. The component
// is untouched: it renders within the width it is given and never learns the stage exists.
// No horizontal scroller, so the Carousel's horizontal FlatList is never nested in a
// same-orientation scroller. `align` (default "center") keeps the centering above;
// "start" pins the example to the leading edge and stretches it (a block-level,
// leading-aligned component such as Breadcrumb spans the row and reads from the left).
export function FitStage({ children, align = "center" }: { children: ReactNode; align?: "center" | "start" }) {
  const fill = align === "start";
  return (
    <View style={{ width: "100%", alignItems: fill ? "stretch" : "center", justifyContent: "center" }}>
      {/* A local BackdropHost so an example that mounts a <Backdrop> paints inside its
          own stage. A Backdrop claims the NEAREST host, so without this an example
          would publish to the app-root host and take over the whole page's backdrop.
          Costs nothing for every other example: a host with no claimant renders nothing. */}
      <View style={{ width: "100%", alignItems: fill ? "stretch" : "center" }}>
        <BackdropHost>{children}</BackdropHost>
      </View>
    </View>
  );
}

// One platform row in the stage: the centered live render, tagged with a small platform
// watermark in the cell's top-left corner (only on the web 3-up, where three platforms stack
// and need telling apart). The tag floats over the render and is non-interactive, so it never
// intercepts a press, and it costs no layout width: dropping the old 96px label column hands
// that space back to the preview. On a device there is a single preview and you ARE the
// platform, so the tag is dropped and the render spans the full width.
function PlatformRow({ label, scope, render, resetKey, first, showLabel, stageAlign }: {
  label: string;
  scope: ExampleScope;
  render: (s: ExampleScope) => ReactNode;
  resetKey: string;
  first: boolean;
  showLabel: boolean;
  stageAlign?: "center" | "start";
}) {
  const { tokens } = useTheme();
  return (
    <View
      // Marks the row with its platform for tooling (element crops, row-level
      // assertions). Web-only attribute; a no-op on native, where a single
      // unlabeled preview renders. Same dataSet pattern as previewStage below.
      {...(Platform.OS === "web" ? ({ dataSet: { platformRow: label.toLowerCase() } } as object) : null)}
      style={{ borderTopWidth: first ? 0 : 1, borderColor: tokens.border }}
    >
      {/* The live render cell. The overlay host is ONE per stage (see Playground),
          not per cell: a per-cell host traps its outlet inside the cell's stacking
          context, so an open menu on an upper row is clipped by the cell and painted
          under lower rows. A single stage-level outlet floats overlays above every
          row instead. */}
      <Column flush center alignCenter padLoose style={{ minWidth: 0, minHeight: 84 }}>
        <ExampleErrorBoundary key={resetKey}>
          <FitStage align={stageAlign}>{render(scope)}</FitStage>
        </ExampleErrorBoundary>
      </Column>
      {showLabel ? (
        <View pointerEvents="none" style={{ position: "absolute", top: 8, left: 12 }}>
          <Text style={{ fontFamily: sans("600"), fontSize: 10, letterSpacing: 0.6, textTransform: "uppercase", color: tokens["muted-foreground"], opacity: 0.55 }}>
            {label}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// The component playground: the stacked iOS/Android/Web stage (one device row on
// native), a gap, then the source, with the example rail to the right on wide viewports.
// Selection is optionally controlled: pass `selected` + `onSelect` to drive the active
// example from the URL variant (see ComponentReference); omit them and the rail manages
// its own state.
export function Playground({ examples, stageAlign, singlePreview, selected: selectedProp, onSelect: onSelectProp }: {
  examples: DocExample[];
  stageAlign?: "center" | "start";
  singlePreview?: boolean;
  selected?: number;
  onSelect?: (index: number) => void;
}) {
  const { tokens } = useTheme();
  // The wide stage above the tablet tier (width > lg, 1024), through the kit's bucket
  // hook so the server and the hydration render agree on the desktop layout.
  const wide = useResponsive({ base: true, lg: false });
  const [selectedState, setSelectedState] = useState(0);
  const selected = selectedProp ?? selectedState;
  const setSelected = onSelectProp ?? setSelectedState;
  // One search field above the stage for catalog examples (see SEARCHABLE_EXAMPLES): its query
  // flows to every platform column through IconSearchContext, so a single control filters all
  // three previews. Reset when the selected example changes so a stale query never carries over.
  const [query, setQuery] = useState("");
  useEffect(() => { setQuery(""); }, [selected]);
  // The simulated form factor (see FORM_FACTORS). Full width (the last entry) is
  // the resting state; the choice survives example switches on purpose, so a
  // breakpoint sweep can walk every variant at one tier.
  const [factorIndex, setFactorIndex] = useState(FORM_FACTORS.length - 1);
  const simulated = FORM_FACTORS[factorIndex] ?? FORM_FACTORS[FORM_FACTORS.length - 1];
  const simulating = Platform.OS === "web" && simulated.width != null;
  // The simulated card's REAL width: in a stage narrower than the tier the
  // card clamps (maxWidth 100%), and the readout follows this measurement so
  // it never overstates the frame.
  const { width: cardWidth, onLayout: onCardLayout } = useMeasuredWidth();
  const ex = examples[selected] ?? examples[0];
  if (!ex) return null;

  const allPreviews = buildScopes(tokens);
  // `singlePreview` components (full app chrome, e.g. Sidebar) show ONE preview instead of the
  // stacked iOS/Android/Web 3-up: keep the last column (the web skin on web) and drop the rest.
  // On native the build already returns a single device preview, so this is a no-op there.
  const previews = singlePreview && allPreviews.length > 1 ? [allPreviews[allPreviews.length - 1]] : allPreviews;
  // The web build returns the iOS/Android/Web 3-up (labels help tell them apart); the native
  // build returns a single device preview, where the platform label is redundant.
  const showLabels = previews.length > 1;
  // The single-search placeholder for this example, if its fence renders a searchable catalog.
  const searchPlaceholder = Object.entries(SEARCHABLE_EXAMPLES).find(([tag]) => ex.code.includes(tag))?.[1];

  const stage = (
    // The form-factor override wraps the WHOLE stage, OverlayProvider included:
    // the kit Portal renders overlay children at the provider's outlet (a React
    // sibling of the provider's children), so an override mounted below the
    // provider would never reach portaled overlay content. Above it, an open
    // menu / dialog / peek simulates the same tier as the inline preview.
    <BreakpointOverride value={simulating ? simulated.bucket : null}>
    {/* ONE overlay host per stage (not per cell). A portaled overlay (an open
        Dropdown / Select / Autocomplete / Popover / Row-menu menu) renders into this
        stage-level outlet, which paints above ALL device rows AND the code block, so
        it is neither clipped by the stage nor occluded by a lower row's trigger.
        Anchoring stays correct: AnchoredOverlay measures the trigger relative to this
        outlet. Because overlays no longer render inside the stage card, the card can
        keep its clean `overflow: "hidden"` rounded corners. */}
    <OverlayProvider style={{ flex: 1, minWidth: 0 }}>
      <IconSearchContext.Provider value={query}>
      <View
        // Marks the preview stage so web-scrollbar.tsx can hide the browser scrollbar that
        // react-native-web draws for a scrollable demo (a ScrollView/list/table) inside a
        // preview cell — a real iOS/Android device shows a transient indicator, not a
        // persistent bar. Web-only attribute; a no-op on native.
        {...(Platform.OS === "web" ? ({ dataSet: { previewStage: "" } } as object) : null)}
        style={{ flex: 1, minWidth: 0 }}
      >
        {/* The stage stacks its pieces (the search field, the switcher, the card, the
            code block) with one kit gap, so the card reads as a detached frame with the
            same breathing room above and below it, in every example and at every
            simulated tier. */}
        <Column cozy>
          {/* A single search field above the stage for catalog examples (SEARCHABLE_EXAMPLES): its
              query flows to every platform column via IconSearchContext, so one control filters all
              three previews at once. Absent for every other example. */}
          {searchPlaceholder ? (
            <Input
              leadingIcon
              icon="search"
              placeholder={searchPlaceholder}
              accessibilityLabel={searchPlaceholder}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
          ) : null}
          {/* The form-factor switcher (web only; see FORM_FACTORS): icon segments
              depicting each tier, the simulated width read out beside them. */}
          {Platform.OS === "web" ? (
            <Row tight end alignCenter>
              {simulating ? (
                <Text style={{ fontFamily: sans("500"), fontSize: 11, color: tokens["muted-foreground"] }}>
                  {`${cardWidth || simulated.width}px`}
                </Text>
              ) : null}
              <ButtonGroup
                segmented
                small
                iconsOnly
                accessibilityLabel="Preview form factor"
                items={FORM_FACTORS.map(({ label, icon }) => ({ label, icon }))}
                active={factorIndex}
                onSelect={setFactorIndex}
              />
            </Row>
          ) : null}
          {/* The stage is a content surface: a solid card in solid mode, a frost in glass mode
              (DocsSurface routes through the kit GlassSurface), so the preview never reads as a
              clear hole. The cells below inherit it. The card is a fully-rounded, fully-bordered
              frame that sits a gap above the code block (never flush to it). When simulating,
              it narrows to the tier's width, centered, while the code block stays full width,
              and the kit's viewport bucket is pinned to match. */}
          {/* onLayout attaches UNCONDITIONALLY: react-native-web registers its
              ResizeObserver in a mount-once effect, so toggling the prop from
              undefined to a handler on a live View never observes it (the
              measurement would sit at 0 forever). Measuring while not simulating
              is free; the readout only shows during simulation. */}
          <View
            // Marks the preview card (the platform-rows surface, without the
            // switcher row or the code block) for tooling screenshots.
            {...(Platform.OS === "web" ? ({ dataSet: { previewCard: "" } } as object) : null)}
            onLayout={onCardLayout}
            style={simulating ? { width: simulated.width ?? undefined, maxWidth: "100%", alignSelf: "center" } : null}
          >
            <DocsSurface
              fill="card"
              style={{
                borderWidth: 1,
                borderColor: tokens.border,
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              {previews.map((p, i) => (
                <PlatformRow key={p.platform} label={p.label} scope={p.scope} render={ex.render} resetKey={`${p.platform}:${selected}`} first={i === 0} showLabel={showLabels} stageAlign={stageAlign} />
              ))}
            </DocsSurface>
          </View>
          <CodeBlock code={ex.code} />
        </Column>
      </View>
      </IconSearchContext.Provider>
    </OverlayProvider>
    </BreakpointOverride>
  );

  if (examples.length <= 1) return stage;

  // The example switcher is the kit Tabs component, so the docs dogfood a real
  // selectable control instead of a hand-rolled pill row (which read as loose,
  // affordance-less text). One label per example; controlled by `selected`.
  const labels = examples.map((e) => e.label);

  // Wide: Tabs' `vertical` rail (a settings-style side rail, active row filled)
  // beside the stage, in a fixed 200px scroller so many examples still scroll.
  // Narrow: the horizontal `underline` tab bar above the stage, bare — the kit's
  // own overflow scroller pans long/many labels and keeps the selected tab in
  // view, so the docs-side horizontal ScrollView wrapper this once needed is
  // gone (it also blocked the kit scroller from capping, being content-sized).
  const rail = wide ? (
    <ScrollView style={{ width: 200, flexGrow: 0 }} showsVerticalScrollIndicator={false}>
      <Tabs vertical block testID="playground-examples" tabs={labels} active={selected} onSelect={setSelected} />
    </ScrollView>
  ) : (
    <Tabs underline testID="playground-examples" tabs={labels} active={selected} onSelect={setSelected} />
  );

  return (
    <View style={{ flexDirection: wide ? "row" : "column", gap: wide ? 16 : 10 }}>
      {/* Stable sibling keys preserve the live example when the rail moves above it. */}
      {wide ? (
        <>
          <Fragment key="stage">{stage}</Fragment>
          <Fragment key="rail">{rail}</Fragment>
        </>
      ) : (
        <>
          <Fragment key="rail">{rail}</Fragment>
          <Fragment key="stage">{stage}</Fragment>
        </>
      )}
    </View>
  );
}
