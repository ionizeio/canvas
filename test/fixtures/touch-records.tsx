import { spyOn } from "bun:test";
import { act, cleanup, render } from "@testing-library/react";
import { createContext, useContext, useRef, type ReactElement, type ReactNode, type Ref } from "react";
import { StyleSheet, View as RNView, type Insets, type ViewStyle } from "react-native";
import * as styleIndex from "../../src/style/index.ts";
import { ThemeProvider } from "../../src/style/theme.tsx";

// Recording stand-ins for the kit's RippleClip, View and Pressable, shared by the touch-target
// tests (test/touch-target-clips.test.tsx, test/touch-target-seams.test.tsx).
//
// The test DOM is react-native-web, which drops hitSlop and runs no native hit test, so a
// rendered check would pass with or without a touch-target fix. Instead a component's own
// platform entry renders with these stand-ins swapped in on the style module the shells import
// from (and restored after each test). Each records the props it received and the clipping
// node it sits in; renderAndLayout then hands the measured pressables a layout, so the slop
// the kit measures is in place, and a test reads what every node carries.

export interface NodeRecord {
  kind: "ripple-clip" | "view" | "pressable";
  /** The latest props the stand-in rendered with. */
  props: Record<string, unknown>;
  /** The nearest clipping ancestor, by record id. */
  clip: number | undefined;
  /** Whether this node clips its children on the platform under test. */
  clips: boolean;
}

// The real View, held before any stand-in is installed: the style module re-exports React
// Native's own binding, so swapping it there swaps the imported name too.
const RealView = RNView;
const realUseMinTargetSlop = styleIndex.useMinTargetSlop;

export const records = new Map<number, NodeRecord>();
let nextId = 0;
const ClipContext = createContext<number | undefined>(undefined);

function useRecordId(): number {
  const ref = useRef<number | null>(null);
  if (ref.current == null) ref.current = ++nextId;
  return ref.current;
}

function clipsStyle(style: unknown): boolean {
  const flat = (StyleSheet.flatten(style as ViewStyle) ?? {}) as ViewStyle;
  return flat.overflow === "hidden" || flat.overflow === "scroll";
}

// RippleClip clips on Android whenever it is given a shape (src/style/ripple-clip.tsx).
function StubRippleClip(props: { shape?: unknown; children?: ReactNode; [key: string]: unknown }) {
  const id = useRecordId();
  const parent = useContext(ClipContext);
  const clips = props.shape != null;
  records.set(id, { kind: "ripple-clip", props, clip: parent, clips });
  return <ClipContext.Provider value={clips ? id : parent}><RealView>{props.children}</RealView></ClipContext.Provider>;
}

// React 19 hands a function component its ref as an ordinary prop.
function StubView({ ref, ...props }: Record<string, unknown> & { ref?: Ref<RNView>; children?: ReactNode }) {
  const id = useRecordId();
  const parent = useContext(ClipContext);
  const clips = clipsStyle(props.style);
  records.set(id, { kind: "view", props, clip: parent, clips });
  return <ClipContext.Provider value={clips ? id : parent}><RealView ref={ref} {...props} /></ClipContext.Provider>;
}

function StubPressable({ ref, ...props }: Record<string, unknown> & { ref?: Ref<RNView>; children?: ReactNode | ((state: object) => ReactNode) }) {
  const id = useRecordId();
  const parent = useContext(ClipContext);
  const state = { pressed: false, hovered: false, focused: false };
  const style = typeof props.style === "function" ? (props.style as (s: object) => unknown)(state) : props.style;
  const clips = clipsStyle(style);
  records.set(id, { kind: "pressable", props, clip: parent, clips });
  const children = typeof props.children === "function" ? props.children(state) : props.children;
  return <ClipContext.Provider value={clips ? id : parent}><RealView ref={ref}>{children}</RealView></ClipContext.Provider>;
}

const spies: Array<{ mockRestore: () => void }> = [];

/** Swap the stand-ins in (a beforeEach). */
export function installTouchStubs(): void {
  records.clear();
  spies.push(
    spyOn(styleIndex, "RippleClip").mockImplementation(StubRippleClip as never),
    spyOn(styleIndex, "View").mockImplementation(StubView as never),
    spyOn(styleIndex, "Pressable").mockImplementation(StubPressable as never),
  );
}

/** Unmount and put the real components back (an afterEach). */
export function restoreTouchStubs(): void {
  cleanup();
  while (spies.length) spies.pop()!.mockRestore();
}

export function isSlop(slop: unknown): slop is number | Insets {
  if (typeof slop === "number") return slop > 0;
  if (slop == null || typeof slop !== "object") return false;
  return Object.values(slop as Insets).some((value) => typeof value === "number" && value > 0);
}

type Frame = { width: number; height: number };

/**
 * Render, give every measured node a layout, and return the slop-bearing pressables with the
 * clipping node each one sits in. `frame` is one frame for every measured node (by default
 * well under both minimums, so a measured slop exists on every axis it extends), a function
 * choosing one per node (null leaves that node unmeasured), or null for the render as it
 * stands before the first layout.
 */
export function renderAndLayout(
  ui: ReactElement,
  platformMin: number | null = null,
  frame: Frame | ((record: NodeRecord) => Frame | null) | null = { width: 20, height: 20 },
) {
  // A skin that one component shares across the platforms (Pagination, CodeBlock) reads
  // its minimum from platformMinTarget() when its module loads, and the test DOM loads it
  // as the web, where there is none. Stand in the platform's own number for that case.
  if (platformMin != null) {
    spies.push(spyOn(styleIndex, "useMinTargetSlop").mockImplementation(((min: number | null, options?: object) =>
      realUseMinTargetSlop(min ?? platformMin, options)) as never));
  }
  render(<ThemeProvider light solid>{ui}</ThemeProvider>);
  const measured = frame == null ? [] : [...records.values()].filter((r) => typeof r.props.onLayout === "function");
  act(() => {
    for (const record of measured) {
      const size = typeof frame === "function" ? frame(record) : frame;
      if (size == null) continue;
      (record.props.onLayout as (event: unknown) => void)({ nativeEvent: { layout: { x: 0, y: 0, ...size } } });
    }
  });
  return [...records.values()]
    .filter((r) => r.kind === "pressable" && isSlop(r.props.hitSlop))
    .map((pressable) => ({ pressable, clip: pressable.clip == null ? undefined : records.get(pressable.clip) }));
}
