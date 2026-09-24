import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { act, cleanup, render } from "@testing-library/react";
import { type ComponentType } from "react";
import { StyleSheet, type Insets, type LayoutChangeEvent, type ViewStyle } from "react-native";
import { minTargetSlop, seedSlop, styleBox, useSeededMinTargetSlop, type TargetBox } from "../src/style/touch-target-seed.ts";
import { useMinTargetSlop } from "../src/style/touch-target.ts";
import { iosSkin as buttonIos, androidSkin as buttonAndroid } from "../src/atoms/button/button.styles.ts";
import { iosSkin as rowMenuIos, androidSkin as rowMenuAndroid } from "../src/organisms/row-menu/row-menu.styles.ts";
import { iosSkin as switchIos, androidSkin as switchAndroid } from "../src/atoms/switch/switch.styles.ts";
import { circleBase } from "../src/organisms/steps/steps.styles.ts";
import { arrowSize, itemSize, selectorSize } from "../src/atoms/pagination/pagination.styles.ts";
import { webSkin as codeBlock } from "../src/molecules/code-block/code-block.styles.ts";
import { lightColors as t } from "../src/style/tokens.ts";
import { installTouchStubs, isSlop, records, renderAndLayout, restoreTouchStubs } from "./fixtures/touch-records.tsx";

// A measured slop arrives after the first layout, and a commit that changes only hitSlop
// lays nothing out, so a native ancestor that hugs the control can keep a layout record
// without the slop (a Tooltip's own root around a Button, a component root carrying a
// testID, the CodeBlock's floating copy wrapper). The kit's controls seed the slop from the
// least box their skin gives (a fixed size, or padding and border around one label line,
// raised to a minimum size), so it is in place before the first layout. These pin the seeds,
// the rule that makes them safe (a seed is never smaller than the slop the rendered control
// measures), the re-seed when the declared box changes, and the public hook's unchanged
// first render.

const IOS = 44;
const ANDROID = 48;
const opts = { icon: false, block: false, dim: false };

describe("the seed each control takes from its skin", () => {
  it("a text Button: its padding and border around one label line, the least it renders at", () => {
    const box = (skin: typeof buttonIos, intent: "primary" | "outline", size: "small" | "base") =>
      styleBox(skin.container(t, intent, size, opts), skin.label(t, intent, size, opts).lineHeight);
    // Android: 30dp small, 40dp base. Sideways, the padding alone (a label only widens it):
    // 32dp small, 48dp base.
    expect(box(buttonAndroid, "primary", "small")).toEqual({ width: 32, height: 30 });
    expect(seedSlop(ANDROID, box(buttonAndroid, "primary", "small"))).toEqual({ top: 9, bottom: 9, left: 8, right: 8 });
    expect(seedSlop(ANDROID, box(buttonAndroid, "primary", "base"))).toEqual({ top: 4, bottom: 4, left: 0, right: 0 });
    // iOS: 36pt small; the 50pt base meets the minimum in height, and its 40pt of padding
    // leaves 2pt a side until the label is measured.
    expect(seedSlop(IOS, box(buttonIos, "primary", "small"))).toEqual({ top: 4, bottom: 4, left: 8, right: 8 });
    expect(seedSlop(IOS, box(buttonIos, "primary", "base"))).toEqual({ top: 0, bottom: 0, left: 2, right: 2 });
  });

  it("an icon Button: its fixed square, on both axes", () => {
    const icon = { ...opts, icon: true };
    const box = styleBox(buttonAndroid.container(t, "primary", "small", icon), buttonAndroid.label(t, "primary", "small", icon).lineHeight);
    expect(box).toEqual({ width: 32, height: 32 });
    expect(seedSlop(ANDROID, box)).toEqual({ top: 8, bottom: 8, left: 8, right: 8 });
  });

  it("a Steps circle, a RowMenu trigger and the Pagination cells: their fixed sizes", () => {
    expect(seedSlop(ANDROID, styleBox(circleBase))).toEqual({ top: 8, bottom: 8, left: 8, right: 8 });
    expect(seedSlop(IOS, styleBox(circleBase))).toEqual({ top: 6, bottom: 6, left: 6, right: 6 });
    expect(seedSlop(ANDROID, styleBox(StyleSheet.flatten(rowMenuAndroid.trigger)))).toEqual({ top: 4, bottom: 4, left: 4, right: 4 });
    expect(seedSlop(IOS, styleBox(StyleSheet.flatten(rowMenuIos.trigger)))).toEqual({ top: 6, bottom: 6, left: 6, right: 6 });
    // A page abuts its neighbors, so it grows vertically only.
    expect(seedSlop(ANDROID, styleBox(itemSize.default), { axis: "vertical" })).toEqual({ top: 6, bottom: 6, left: 0, right: 0 });
    expect(seedSlop(IOS, styleBox(itemSize.small), { axis: "vertical" })).toEqual({ top: 7.5, bottom: 7.5, left: 0, right: 0 });
    expect(seedSlop(ANDROID, styleBox(arrowSize.default))).toEqual({ top: 6, bottom: 6, left: 6, right: 6 });
    // The rows-per-page trigger's width is its value's: seeded from its padding alone.
    expect(seedSlop(ANDROID, styleBox(selectorSize.default))).toEqual({ top: 6, bottom: 6, left: 12, right: 12 });
  });

  it("the CodeBlock copy chip: its padding and border around one 16px line, 26 tall", () => {
    const box = styleBox(StyleSheet.flatten(codeBlock.copyButton(t, false, true)) as ViewStyle, codeBlock.copyText(t, false).lineHeight);
    expect(box).toEqual({ width: 22, height: 26 });
    expect(seedSlop(ANDROID, box)).toEqual({ top: 11, bottom: 11, left: 13, right: 13 });
    expect(seedSlop(IOS, box)).toEqual({ top: 9, bottom: 9, left: 11, right: 11 });
  });

  it("a Switch: its track, the least the row renders at (a label only widens or heightens it)", () => {
    const ios = styleBox(switchIos.track(t, false, false, "base"));
    expect(seedSlop(IOS, ios)).toEqual(minTargetSlop(IOS, ios.width!, ios.height!));
    expect(seedSlop(IOS, ios)?.top).toBeGreaterThan(0);
    const android = styleBox(switchAndroid.track(t, false, false, "small"));
    expect(seedSlop(ANDROID, android)).toEqual(minTargetSlop(ANDROID, android.width!, android.height!));
    expect(seedSlop(ANDROID, android)?.top).toBeGreaterThan(0);
  });

  it("floors an axis the content sizes at the padding and border around it, raised to a minimum size", () => {
    expect(styleBox({ paddingHorizontal: 12 })).toEqual({ width: 24, height: 0 });
    expect(styleBox({ paddingHorizontal: 12, minWidth: 40, borderWidth: 1 }, 16)).toEqual({ width: 40, height: 18 });
    expect(styleBox({ paddingVertical: 4, borderTopWidth: 2 }, 12)).toEqual({ width: 0, height: 22 });
    expect(styleBox({ paddingVertical: 4, borderTopWidth: 2, minHeight: 30 }, 12)).toEqual({ width: 0, height: 30 });
    expect(styleBox({ paddingStart: 3, paddingRight: 5, borderWidth: 1 })).toEqual({ width: 10, height: 2 });
    // A logical edge wins over the physical one on the same side, as in Yoga.
    expect(styleBox({ paddingStart: 3, paddingLeft: 9 })).toEqual({ width: 3, height: 0 });
    // A fixed size stands; a percentage is not a floor.
    expect(styleBox({ width: 32, height: "100%", padding: 4 }, 16)).toEqual({ width: 32, height: 24 });
    // Only a side the skin says nothing about seeds nothing.
    expect(seedSlop(ANDROID, {})).toBeUndefined();
  });

  it("is never smaller than the slop the rendered control measures, however wide or tall its content", () => {
    const skins = [[buttonAndroid, ANDROID], [buttonIos, IOS]] as const;
    for (const [skin, min] of skins) {
      for (const intent of ["primary", "outline", "ghost", "link"] as const) {
        for (const size of ["small", "base", "large"] as const) {
          for (const icon of [false, true]) {
            const o = { ...opts, icon };
            const box = styleBox(skin.container(t, intent, size, o), skin.label(t, intent, size, o).lineHeight);
            const seed = seedSlop(min, box);
            // The content only adds to the floor: every rendered size is the floor or more.
            for (let extraW = 0; extraW <= 80; extraW += 2.5) {
              for (let extraH = 0; extraH <= 20; extraH += 2.5) {
                const measured = minTargetSlop(min, (box.width ?? 0) + (icon ? 0 : extraW), (box.height ?? 0) + (icon ? 0 : extraH));
                for (const side of ["top", "bottom", "left", "right"] as const) {
                  expect(seed?.[side] ?? 0, `${intent} ${size}${icon ? " icon" : ""} +${extraW}x${extraH} ${side}`).toBeGreaterThanOrEqual(measured?.[side] ?? 0);
                }
              }
            }
          }
        }
      }
    }
  });
});

describe("the seeded measurement", () => {
  afterEach(cleanup);
  type Result = { hitSlop?: Insets; onLayout?: (e: LayoutChangeEvent) => void };
  function Probe({ minTarget, box, onRender }: { minTarget: number | null; box?: TargetBox; onRender: (r: Result) => void }) {
    onRender(useSeededMinTargetSlop(minTarget, box));
    return null;
  }
  const layout = (width: number, height: number) => ({ nativeEvent: { layout: { x: 0, y: 0, width, height } } }) as LayoutChangeEvent;

  it("has the slop before any layout, keeps it through a layout that differs by less than a pixel, and follows a real change", () => {
    const seen: Result[] = [];
    render(<Probe minTarget={ANDROID} box={{ width: 32, height: 32 }} onRender={(r) => seen.push(r)} />);
    const seeded = seen[0]!.hitSlop;
    expect(seeded).toEqual({ top: 8, bottom: 8, left: 8, right: 8 });
    // The laid-out box is snapped to the pixel grid: 84px at 2.625px/dp is 32.0, 85px is 32.38.
    act(() => seen.at(-1)!.onLayout!(layout(32.38, 32.38)));
    expect(seen.at(-1)!.hitSlop).toBe(seeded);
    // A control that rendered bigger than declared takes the smaller measured slop.
    act(() => seen.at(-1)!.onLayout!(layout(40, 40)));
    expect(seen.at(-1)!.hitSlop).toEqual({ top: 4, bottom: 4, left: 4, right: 4 });
  });

  it("seeds again when the declared box changes, until the next layout measures it", () => {
    const seen: Result[] = [];
    const { rerender } = render(<Probe minTarget={ANDROID} box={{ width: 32, height: 32 }} onRender={(r) => seen.push(r)} />);
    act(() => seen.at(-1)!.onLayout!(layout(40, 40)));
    expect(seen.at(-1)!.hitSlop).toEqual({ top: 4, bottom: 4, left: 4, right: 4 });
    // The control turns smaller (a Button that turns small): its new box seeds at once.
    rerender(<Probe minTarget={ANDROID} box={{ width: 24, height: 24 }} onRender={(r) => seen.push(r)} />);
    expect(seen.at(-1)!.hitSlop).toEqual({ top: 12, bottom: 12, left: 12, right: 12 });
    act(() => seen.at(-1)!.onLayout!(layout(26, 26)));
    expect(seen.at(-1)!.hitSlop).toEqual({ top: 11, bottom: 11, left: 11, right: 11 });
    // The same box again keeps the measurement.
    rerender(<Probe minTarget={ANDROID} box={{ width: 24, height: 24 }} onRender={(r) => seen.push(r)} />);
    expect(seen.at(-1)!.hitSlop).toEqual({ top: 11, bottom: 11, left: 11, right: 11 });
  });

  it("without a box it is useMinTargetSlop: nothing until the first layout", () => {
    const seen: Result[] = [];
    function Public({ onRender }: { onRender: (r: Result) => void }) {
      onRender(useMinTargetSlop(ANDROID));
      return null;
    }
    render(<Public onRender={(r) => seen.push(r)} />);
    expect(seen[0]!.hitSlop).toBeUndefined();
    act(() => seen.at(-1)!.onLayout!(layout(30, 30)));
    expect(seen.at(-1)!.hitSlop).toEqual({ top: 9, bottom: 9, left: 9, right: 9 });
  });

  it("measures nothing where the skin declares no minimum (the web)", () => {
    const seen: Result[] = [];
    render(<Probe minTarget={null} box={{ width: 32, height: 32 }} onRender={(r) => seen.push(r)} />);
    expect(seen[0]).toEqual({});
  });
});

describe("the kit's controls carry their slop before the first layout", () => {
  beforeEach(installTouchStubs);
  afterEach(restoreTouchStubs);
  const noop = () => {};
  // A 16dp glyph stand-in for an icon.
  const Glyph = () => null;
  const load = async (path: string, name: string) => (await import(path))[name] as ComponentType<Record<string, unknown>>;
  const cases: Array<[string, string, string, Record<string, unknown>, number | null]> = [
    ["a small Button", "../src/atoms/button/button.android.tsx", "Button", { small: true, onPress: noop, children: "Save" }, null],
    ["an icon Button", "../src/atoms/button/button.ios.tsx", "Button", { small: true, icon: true, onPress: noop, accessibilityLabel: "Add" }, null],
    ["pressable Steps", "../src/organisms/steps/steps.android.tsx", "Steps", { steps: [{ label: "Cart" }, { label: "Ship" }], onStepPress: noop }, null],
    ["a RowMenu", "../src/organisms/row-menu/row-menu.ios.tsx", "RowMenu", { items: [{ label: "Edit" }] }, null],
    ["a numbered Pagination", "../src/atoms/pagination/pagination.android.tsx", "Pagination", { total: 5 }, ANDROID],
    ["a Pagination with size", "../src/atoms/pagination/pagination.android.tsx", "Pagination", { total: 5, withSize: true }, ANDROID],
    ["a CodeBlock copy chip", "../src/molecules/code-block/code-block.android.tsx", "CodeBlock", { copy: true, code: "bun add @ionizeio/canvas" }, ANDROID],
    ["a Switch", "../src/atoms/switch/switch.ios.tsx", "Switch", { accessibilityLabel: "Wi-Fi" }, null],
  ];
  it("a Button with no label seeds from its padding alone: a lone 16dp glyph is shorter than a label line", async () => {
    const Button = await load("../src/atoms/button/button.android.tsx", "Button");
    renderAndLayout(<Button small onPress={noop} accessibilityLabel="Add" iconLeft={<Glyph />} />, null, null);
    const button = [...records.values()].find((r) => r.kind === "pressable" && r.props.accessibilityLabel === "Add");
    // 6dp of padding above and below a 16dp glyph is 28dp, which measures 10dp of slop a side.
    const measured = minTargetSlop(ANDROID, 60, 28)!;
    expect((button?.props.hitSlop as Insets | undefined)?.top ?? 0).toBeGreaterThanOrEqual(measured.top!);
  });

  for (const [name, path, exported, props, platformMin] of cases) {
    it(name, async () => {
      const Component = await load(path, exported);
      // No layout at all: the render as it stands on the first frame.
      renderAndLayout(<Component {...props} />, platformMin, null);
      const measured = [...records.values()].filter((r) => r.kind === "pressable" && typeof r.props.onLayout === "function");
      expect(measured.length, "the control measures its slop").toBeGreaterThan(0);
      for (const pressable of measured) {
        expect(isSlop(pressable.props.hitSlop), `${String(pressable.props.accessibilityLabel ?? name)} carries a slop before any layout`).toBe(true);
        const clip = pressable.clip == null ? undefined : records.get(pressable.clip);
        if (clip?.kind === "ripple-clip") expect(clip.props.hitSlop, "its RippleClip carries the same seed").toEqual(pressable.props.hitSlop);
      }
    });
  }
});
