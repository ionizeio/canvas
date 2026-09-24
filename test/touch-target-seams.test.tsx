import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { cleanup } from "@testing-library/react";
import { type ComponentType, type ReactElement } from "react";
import { StyleSheet, type Insets, type ViewStyle } from "react-native";
import * as rtl from "../src/style/rtl.ts";
import { columnSeam, rowSeam, slopSides, splitSeam } from "../src/style/touch-seam.ts";
import { lightColors as t } from "../src/style/tokens.ts";
import { androidSkin as toastAndroid, webSkin as toastWeb } from "../src/organisms/toast/toast.styles.ts";
import { androidSkin as stepperAndroid } from "../src/atoms/stepper/stepper.styles.ts";
import { androidSkin as chipAndroid, webSkin as chipWeb } from "../src/atoms/chip/chip.styles.ts";
import { androidSkin as inputAndroid, iosSkin as inputIos, type InputSkin } from "../src/atoms/input/input.styles.ts";
import { ACTION_GAP } from "../src/atoms/input/input.shared.tsx";
import { androidSkin as alertAndroid, iosSkin as alertIos } from "../src/molecules/alert/alert.styles.ts";
import { androidSkin as buttonAndroid, iosSkin as buttonIos } from "../src/atoms/button/button.styles.ts";
import * as stepsStyles from "../src/organisms/steps/steps.styles.ts";
import { installTouchStubs, records, renderAndLayout, restoreTouchStubs, type NodeRecord } from "./fixtures/touch-records.tsx";

// Inside a kit component, a later control's slop never reaches into an earlier control's box.
//
// React Native hands a point that two siblings' touch areas both admit to the LATER sibling
// (Android's TouchTargetHelper and iOS's hit test walk the children from last to first), so a
// slop that reaches into an earlier sibling's box takes taps the user aimed at that sibling.
// Once RippleClip carried its pressable's slop on Android, every declared slop there went
// live, and some reached into a neighbor: a tap inside the right edge of a Toast's Undo
// dismissed the toast, a tap on the small Stepper's value pressed +, and (on both platforms,
// long before) a tap on an Input's clear glyph revealed the password.
//
// The rule these hold (src/style/touch-seam.ts): where a component places two of its own
// controls side by side or stacked, it splits the gap between their facing slops, from its
// own geometry, so the two touch areas meet without overlapping. Everything here is left to
// right (a row's start is its left), except the right-to-left checks.

beforeEach(installTouchStubs);
afterEach(restoreTouchStubs);

const noop = () => {};
const load = async (path: string, name: string) => (await import(path))[name] as ComponentType<Record<string, unknown>>;
const byLabel = (label: string): NodeRecord | undefined =>
  [...records.values()].find((r) => r.kind === "pressable" && r.props.accessibilityLabel === label);
const sides = (record: NodeRecord | undefined) => slopSides(record?.props.hitSlop as Insets | number | undefined);
const gapOf = (style: ViewStyle | ViewStyle[]) => (StyleSheet.flatten(style) as ViewStyle).gap as number;
// A step circle's own 32pt/dp box, as the device lays it out.
const CIRCLE_FRAME = { width: 32, height: 32 };
const rendered = (ui: ReactElement, platformMin: number | null = null, frame?: Parameters<typeof renderAndLayout>[2]) => {
  cleanup();
  records.clear();
  renderAndLayout(ui, platformMin, frame);
};

/**
 * Two controls `gap` apart in a row, `first` before `second`: the later one's slop stops
 * short of the earlier one's box, and the two touch areas meet without overlapping.
 */
function expectSeam(first: NodeRecord | undefined, second: NodeRecord | undefined, gap: number) {
  expect(first, "the first control rendered").toBeDefined();
  expect(second, "the second control rendered").toBeDefined();
  const a = sides(first);
  const b = sides(second);
  expect(b.left, "the later control's slop reaches no further than the gap").toBeLessThanOrEqual(gap + 1e-9);
  expect(a.right + b.left, "the two slops meet without overlapping").toBeLessThanOrEqual(gap + 1e-9);
}

describe("splitting a seam", () => {
  it("keeps each side's slop up to half the gap, and hands over what the other leaves", () => {
    expect(splitSeam(8, 12, 8)).toEqual([4, 4]);
    expect(splitSeam(0, 12, 8)).toEqual([0, 8]);
    expect(splitSeam(2, 12, 8)).toEqual([2, 6]);
    expect(splitSeam(3, 3, 8)).toEqual([3, 3]);
    expect(splitSeam(12, 0, 6)).toEqual([6, 0]);
  });

  it("never overlaps, never grows a side, and gives each at least what it asked of half the gap", () => {
    for (let gap = 0; gap <= 16; gap += 0.5) {
      for (let a = 0; a <= 16; a += 0.5) {
        for (let b = 0; b <= 16; b += 0.5) {
          const [x, y] = splitSeam(a, b, gap);
          expect(x + y).toBeLessThanOrEqual(gap + 1e-9);
          expect(x).toBeLessThanOrEqual(a);
          expect(y).toBeLessThanOrEqual(b);
          expect(x).toBeGreaterThanOrEqual(Math.min(a, gap / 2));
          expect(y).toBeGreaterThanOrEqual(Math.min(b, gap / 2));
          if (a + b <= gap) expect([x, y]).toEqual([a, b]);
        }
      }
    }
  });

  it("splits the sides that face each other, on the physical side the layout direction puts them", () => {
    expect(rowSeam(8, 12, 8)).toEqual([{ top: 8, bottom: 8, left: 8, right: 4 }, { top: 12, bottom: 12, left: 4, right: 12 }]);
    expect(rowSeam(undefined, 12, 8)).toEqual([undefined, { top: 12, bottom: 12, left: 8, right: 12 }]);
    expect(columnSeam(8, 8, 12)).toEqual([{ top: 8, bottom: 6, left: 8, right: 8 }, { top: 6, bottom: 8, left: 8, right: 8 }]);
    const spy = spyOn(rtl, "isRTL").mockReturnValue(true);
    try {
      // Right to left, the first control sits on the right: its end is its left side.
      expect(rowSeam(8, 12, 8)).toEqual([{ top: 8, bottom: 8, left: 4, right: 8 }, { top: 12, bottom: 12, left: 12, right: 4 }]);
    } finally {
      spy.mockRestore();
    }
  });
});

describe("inside a kit component, two controls split the gap between them", () => {
  it("the Toast: a tap inside the action never reaches the dismiss (Android, and iOS on the web skin)", async () => {
    const AndroidToast = await load("../src/organisms/toast/toast.android.tsx", "Toast");
    rendered(<AndroidToast message="Draft saved" action={{ label: "Undo", onPress: noop }} onDismiss={noop} />, 48);
    // 8dp of action slop and 12dp of dismiss slop across an 8dp gap: 4 each.
    expectSeam(byLabel("Undo"), byLabel("Dismiss"), gapOf(toastAndroid.container(t, true, false)));
    expect(sides(byLabel("Dismiss"))).toEqual({ top: 12, bottom: 12, left: 4, right: 12 });
    expect(sides(byLabel("Undo"))).toEqual({ top: 8, bottom: 8, left: 8, right: 4 });
    const IosToast = await load("../src/organisms/toast/toast.ios.tsx", "Toast");
    rendered(<IosToast message="Draft saved" action={{ label: "Undo", onPress: noop }} onDismiss={noop} />, 44);
    expectSeam(byLabel("Undo"), byLabel("Dismiss"), gapOf(toastWeb.container(t, true, false)));
    // A lone action or dismiss keeps its whole slop.
    rendered(<AndroidToast message="Draft saved" onDismiss={noop} />, 48);
    expect(sides(byLabel("Dismiss"))).toEqual({ top: 12, bottom: 12, left: 12, right: 12 });
  });

  it("the Android Stepper at every size: a tap on the value never presses a button", async () => {
    const Stepper = await load("../src/atoms/stepper/stepper.android.tsx", "Stepper");
    for (const size of ["small", "base", "large"] as const) {
      rendered(<Stepper defaultValue={1} {...{ [size]: true }} />);
      const gap = gapOf(stepperAndroid.group(t, size, false, false));
      const own = stepperAndroid.hitSlop!(size);
      // − then the value field, then +: the field asks for no slop, so each button may take
      // the whole gap toward it and no more; its outer side keeps the whole slop.
      expect(sides(byLabel("Decrease")).right, `${size}: − toward the value`).toBe(Math.min(own, gap));
      expect(sides(byLabel("Increase")).left, `${size}: + toward the value`).toBe(Math.min(own, gap));
      expect(sides(byLabel("Decrease")).left, `${size}: −'s outer side`).toBe(own);
      expect(sides(byLabel("Increase")).right, `${size}: +'s outer side`).toBe(own);
    }
    // The small size is where it bit: 8dp of slop across a 6dp gap.
    expect(stepperAndroid.hitSlop!("small")).toBeGreaterThan(gapOf(stepperAndroid.group(t, "small", false, false)));
  });

  it("a tappable, removable Chip: a tap on the label never removes it", async () => {
    for (const [path, skin, min] of [["../src/atoms/chip/chip.android.tsx", chipAndroid, 48], ["../src/atoms/chip/chip.ios.tsx", chipWeb, 44]] as const) {
      const Chip = await load(path, "Chip");
      rendered(<Chip onPress={noop} onRemove={noop} accessibilityLabel="Both">Both</Chip>, min);
      expectSeam(byLabel("Both"), byLabel("Remove Both"), gapOf(skin.base));
      // The glyph keeps its outer bias.
      expect(sides(byLabel("Remove Both")).right).toBe(skin.removeHitSlop.right);
    }
  });

  it("a Chip's remove glyph mirrors its bias and its seam right to left", async () => {
    const spy = spyOn(rtl, "isRTL").mockReturnValue(true);
    try {
      const Chip = await load("../src/atoms/chip/chip.android.tsx", "Chip");
      rendered(<Chip onRemove={noop}>Tag</Chip>, 48);
      // The label sits to the glyph's right: the short side faces it, the long side is outside.
      expect(sides(byLabel("Remove Tag"))).toEqual({ ...chipAndroid.removeHitSlop, left: chipAndroid.removeHitSlop.right, right: chipAndroid.removeHitSlop.left });
      rendered(<Chip onPress={noop} onRemove={noop} accessibilityLabel="Both">Both</Chip>, 48);
      const body = sides(byLabel("Both"));
      const glyph = sides(byLabel("Remove Both"));
      expect(glyph.right + body.left, "the seam is on the glyph's right and the body's left").toBeLessThanOrEqual(gapOf(chipAndroid.base) + 1e-9);
    } finally {
      spy.mockRestore();
    }
  });

  it("an Input's clear and eye glyphs, and the clear glyph beside the value", async () => {
    const textGap = (skin: InputSkin) =>
      (skin.groupField(t, { leadingIcon: false, trailingIcon: true, hasPrefix: false, hasSuffix: false }).paddingEnd as number)
      - (StyleSheet.flatten(skin.iconOverlay("right")).paddingEnd as number) - skin.iconSize;
    for (const [path, skin] of [["../src/atoms/input/input.android.tsx", inputAndroid], ["../src/atoms/input/input.ios.tsx", inputIos]] as const) {
      const Input = await load(path, "Input");
      rendered(<Input small clearable secureTextEntry passwordToggle value="hunter22" accessibilityLabel="Secret" />);
      expectSeam(byLabel("Clear text"), byLabel("Show password"), ACTION_GAP);
      expect(sides(byLabel("Clear text")).left, "the clear glyph toward the value").toBeLessThanOrEqual(textGap(skin) + 1e-9);
      // A lone eye faces the value the same way.
      rendered(<Input small secureTextEntry passwordToggle value="hunter22" accessibilityLabel="Secret" />);
      expect(sides(byLabel("Show password")).left).toBeLessThanOrEqual(textGap(skin) + 1e-9);
    }
    // The iOS gutter leaves 8pt between the value and the glyph, under its 12pt slop.
    expect(textGap(inputIos)).toBe(8);
  });

  it("the Alert: its dismiss and its actions keep out of each other's boxes by the Alert's own gaps", async () => {
    // The actions are the caller's Buttons, which the Alert lays out 8 apart; the widest
    // sideways slop a kit Button carries is its small icon square's (Android 32dp, iOS 36pt),
    // which the gap holds. The dismiss sits the Alert's gap after the content column.
    for (const [path, alertSkin, buttonSkin] of [
      ["../src/molecules/alert/alert.android.tsx", alertAndroid, buttonAndroid],
      ["../src/molecules/alert/alert.ios.tsx", alertIos, buttonIos],
    ] as const) {
      const Alert = await load(path, "Alert");
      const Button = await load(path.replace("molecules/alert/alert", "atoms/button/button"), "Button");
      const square = buttonSkin.container(t, "primary", "small", { icon: true, block: false, dim: false }).width as number;
      rendered(
        <Alert title="Heads up" dismissible actions={<>
          <Button small icon onPress={noop} accessibilityLabel="One" />
          <Button small icon onPress={noop} accessibilityLabel="Two" />
        </>} />,
        null,
        (r) => (r.props.accessibilityLabel === "One" || r.props.accessibilityLabel === "Two" ? { width: square, height: square } : null),
      );
      const actionsGap = gapOf(alertSkin.actions);
      expect(sides(byLabel("Two")).left, "the later action stops at the earlier one's box").toBeLessThanOrEqual(actionsGap + 1e-9);
      expect(sides(byLabel("Dismiss")).left, "the dismiss stops at the content column").toBeLessThanOrEqual(gapOf(alertSkin.container) + 1e-9);
    }
  });

  it("horizontal Steps: each circle keeps its share of the connector's margins toward the next", async () => {
    const across = 2 * (stepsStyles.horizontalConnector.marginHorizontal as number);
    for (const [path, min] of [["../src/organisms/steps/steps.android.tsx", 48], ["../src/organisms/steps/steps.ios.tsx", 44]] as const) {
      const Steps = await load(path, "Steps");
      rendered(<Steps steps={[{ label: "Cart" }, { label: "Ship" }, { label: "Pay" }]} onStepPress={noop} />, null, CIRCLE_FRAME);
      const circles = [...records.values()].filter((r) => r.kind === "pressable" && r.props.accessibilityRole === "button");
      expect(circles.length).toBe(3);
      for (let i = 0; i + 1 < circles.length; i += 1) expectSeam(circles[i], circles[i + 1], across);
      // The margins hold both platforms' whole slop: nothing is given up.
      expect(sides(circles[1]).left).toBe((min - 32) / 2);
    }
  });

  it("vertical Steps: each circle keeps its share of the rail between it and the next", async () => {
    const Steps = await load("../src/organisms/steps/steps.android.tsx", "Steps");
    // A one-line step's row is at least its label line and the spacing under it: 44dp, so
    // the circles sit at least 12dp apart and each keeps 6dp of its 8dp toward the other.
    rendered(<Steps vertical steps={[{ label: "Cart" }, { label: "Ship" }, { label: "Pay" }]} onStepPress={noop} />, null, CIRCLE_FRAME);
    const circles = [...records.values()].filter((r) => r.kind === "pressable" && r.props.accessibilityRole === "button");
    expect(circles.map((c) => [sides(c).top, sides(c).bottom])).toEqual([[8, 6], [6, 6], [6, 8]]);
    // A description line under a step leaves the whole slop on that seam.
    rendered(<Steps vertical steps={[{ label: "Cart", description: "Review items" }, { label: "Ship" }]} onStepPress={noop} />, null, CIRCLE_FRAME);
    const [first, second] = [...records.values()].filter((r) => r.kind === "pressable" && r.props.accessibilityRole === "button");
    expect(sides(first).bottom).toBe(8);
    expect(sides(second).top).toBe(8);
  });

  it("Steps connectors take no touches, so the circle before one keeps its slop over it", async () => {
    const Steps = await load("../src/organisms/steps/steps.android.tsx", "Steps");
    for (const vertical of [false, true]) {
      rendered(<Steps vertical={vertical} steps={[{ label: "Cart" }, { label: "Ship" }]} onStepPress={noop} />);
      const connectors = [...records.values()].filter((r) => {
        const flat = StyleSheet.flatten(r.props.style as ViewStyle) ?? {};
        return r.kind === "view" && (flat.height === 1 || flat.width === 1);
      });
      expect(connectors.length, vertical ? "the vertical connector" : "the horizontal connector").toBe(1);
      expect((StyleSheet.flatten(connectors[0]!.props.style as ViewStyle) as ViewStyle).pointerEvents).toBe("none");
    }
  });
});
