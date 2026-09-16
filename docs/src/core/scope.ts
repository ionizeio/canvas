import type { ReactNode } from "react";
import type { ColorTokens, ToastHandle } from "@ionizeio/canvas";

// The scope an example fence renders against: every Canvas export (components,
// primitives, the alpha/shadow/palette style helpers) plus the live, theme-aware
// `tokens`. This mirrors the docs runtime LIVE_SCOPE (./live-scope.ts), but
// as a STATIC type, so every generated example fence is type-checked against the
// real component prop types at build time — a guarantee the old runtime sucrase +
// `new Function` engine could never give.
//
// A generated example module is a pure function of this scope: it destructures the
// names its fence uses and returns the fence as JSX. The consuming Playground builds
// the scope value and injects the active `tokens`:
//   - on web it builds three scopes (web / iOS / Android) by swapping in the
//     per-platform skins, to render the three-up comparison; and
//   - on native it builds one scope from the device skins Metro already resolved.
// No `eval`, no sucrase, Hermes-safe.
// The docs-only live-example state helper (./live-state.tsx). A render-prop state
// holder that lets a stateless fence demonstrate CONTROLLED usage: it owns state and
// hands it to its children with a setter, so an example can wire an external control
// to a component's `value`. Typed structurally here so this type module needs no value
// import; keep it in sync with the `Stateful` component in ./live-state.tsx.
type StatefulHelper = <T>(props: { initial: T; children: (value: T, set: (next: T) => void) => ReactNode }) => ReactNode;

// The docs-only live-example ticker (./live-state.tsx): auto-steps a value through `values`
// so a fence can show a component driving itself (e.g. a Progress bar filling). Keep in sync
// with the `Ticker` component in ./live-state.tsx.
type TickerHelper = <T>(props: {
  values: T[];
  interval?: number;
  restIndex?: number;
  children: (value: T) => ReactNode;
}) => ReactNode;

// The docs-only DragDrop reducer (./live-state.tsx): applies a DropEvent to a flat list of
// `{ id, zone, … }` cards so a drag example's onDrop stays a single expression. Keep in sync
// with the `applyDrop` function in ./live-state.tsx.
type ApplyDropHelper = <T extends { id: string; zone: string }>(
  cards: T[],
  e: { id: string; to: string; index: number },
) => T[];

// The docs-only Icon catalog (./live-state.tsx): a searchable gallery of every kit glyph,
// used as the Icon page's "Gallery" example. Typed structurally so this type module needs no
// value import; keep it in sync with the `IconGallery` component in ./live-state.tsx.
type IconGalleryHelper = () => ReactNode;

// The docs-only imperative-Toast bridge (./live-state.tsx): rendered inside a <ToastProvider>,
// it calls the platform useToast hook it is handed and passes the live handle to its children,
// so a fence can wire a real Button to toast(...). Keep in sync with the `WithToast` component
// in ./live-state.tsx.
type WithToastHelper = (props: {
  hook: () => ToastHandle;
  children: (handle: ToastHandle) => ReactNode;
}) => ReactNode;

// The docs-only "app screen" frame (./live-state.tsx): a bounded region that hosts its own
// OverlayProvider so an imperative toast floats within view instead of at the bottom of the
// stage's code block. Keep in sync with the `AppScreen` component in ./live-state.tsx.
type AppScreenHelper = (props: { children: ReactNode }) => ReactNode;

// The docs-only responsive "app shell" frame (./live-state.tsx): mounts a Sidebar the way a
// real app does — rail + content on desktop, hamburger-opened drill-down drawer on narrow —
// so the Sidebar example reads as app chrome instead of a lone rail. Keep in sync with the
// `AppShell` component in ./live-state.tsx.
type AppShellHelper = (props: {
  children: (state: {
    open: boolean;
    setOpen: (next: boolean) => void;
    active: string;
    select: (item: { label: string }) => void;
  }) => ReactNode;
}) => ReactNode;

export type ExampleScope = typeof import("@ionizeio/canvas") & {
  tokens: ColorTokens;
  Stateful: StatefulHelper;
  Ticker: TickerHelper;
  applyDrop: ApplyDropHelper;
  IconGallery: IconGalleryHelper;
  WithToast: WithToastHelper;
  AppScreen: AppScreenHelper;
  AppShell: AppShellHelper;
};

// A generated example module's default export.
export type ExampleRender = (scope: ExampleScope) => ReactNode;

// One preview column for the Playground. The web build returns three (iOS / Android /
// Web, each with the matching per-OS skins); the native build returns one (the running
// device, whose skins Metro already resolved). See build-scopes.{web,native}.ts.
export interface PreviewScope {
  label: string;
  platform: "ios" | "android" | "web";
  scope: ExampleScope;
}

export interface DocExample {
  label: string;
  // The verbatim fence source, for the CodeBlock display beneath the preview.
  code: string;
  render: ExampleRender;
}

export interface DocDontSide {
  caption: string;
  code: string;
  render: ExampleRender;
}

export interface DocDontPair {
  title?: string;
  do: DocDontSide;
  dont: DocDontSide;
}

export interface DocEntry {
  // The source directory / `.md` stem (src/<category>/<dir>/<dir>.md). The URL slug
  // can differ (see the components data); the consuming page maps slug -> dir.
  dir: string;
  category: "atoms" | "molecules" | "organisms" | "charts";
  examples: DocExample[];
  donts: DocDontPair[];
}
