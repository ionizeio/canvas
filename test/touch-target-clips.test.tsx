import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { cleanup } from "@testing-library/react";
import { type ComponentType } from "react";
import { StyleSheet, type Insets } from "react-native";
import { iosSkin as inputIos, androidSkin as inputAndroid, webSkin as inputWeb, type Size as InputSize } from "../src/atoms/input/input.styles.ts";
import { actionOverhang } from "../src/atoms/input/input.shared.tsx";
import { clipSlop, slopSides } from "../src/style/clip-slop.ts";
import { androidSkin as chipAndroid } from "../src/atoms/chip/chip.styles.ts";
import { installTouchStubs, isSlop, records, renderAndLayout, restoreTouchStubs } from "./fixtures/touch-records.tsx";

// A clipping kit node carries the slop its descendants declare.
//
// React Native hit-tests a view that clips (overflow hidden or scroll) only inside its own
// bounds plus its own hitSlop: Android's TouchTargetHelper returns nothing for a point
// outside them and never asks the children, and iOS stops at a view that clips to its
// bounds. So a pressable's touch slop is cut at the edge of any clipping ancestor that does
// not admit the same area, which is how every RippleClip swallowed the platform minimum on
// Android (the wrapper clips the ripple there).
//
// The test DOM is react-native-web, which drops hitSlop and runs no native hit test, so a
// rendered check would pass with or without the fix. Instead the components' own platform
// entries render with recording stand-ins for RippleClip, View and Pressable
// (test/fixtures/touch-records.tsx); the measured pressables then receive a layout, so the
// slop the kit measures is in place, and every slop-bearing pressable's nearest clipping node
// must carry that same slop.

beforeEach(installTouchStubs);
afterEach(restoreTouchStubs);

type Load = () => Promise<ComponentType<Record<string, unknown>>>;
const entry = (path: string, name: string): Load => async () => (await import(path))[name];

interface Case {
  name: string;
  load: Load;
  props: Record<string, unknown>;
  /** How many slop-bearing pressables sit in a RippleClip in this render. */
  pairs: number;
  /** A clipping View here measures its union of its pressables' slop (src/style/clip-slop.ts). */
  measuredClip?: boolean;
}

const noop = () => {};
const ANDROID: Case[] = [
  { name: "a small Button", load: entry("../src/atoms/button/button.android.tsx", "Button"), props: { small: true, onPress: noop, children: "Save" }, pairs: 1 },
  { name: "a base Button", load: entry("../src/atoms/button/button.android.tsx", "Button"), props: { onPress: noop, children: "Save" }, pairs: 1 },
  { name: "an icon Button", load: entry("../src/atoms/button/button.android.tsx", "Button"), props: { small: true, icon: true, onPress: noop, accessibilityLabel: "Add" }, pairs: 1 },
  { name: "a numbered Pagination", load: entry("../src/atoms/pagination/pagination.android.tsx", "Pagination"), props: { total: 5 }, pairs: 7 },
  { name: "a compact Pagination", load: entry("../src/atoms/pagination/pagination.android.tsx", "Pagination"), props: { total: 5, compact: true }, pairs: 2 },
  { name: "a Pagination with size", load: entry("../src/atoms/pagination/pagination.android.tsx", "Pagination"), props: { total: 5, withSize: true }, pairs: 3 },
  { name: "pressable Steps", load: entry("../src/organisms/steps/steps.android.tsx", "Steps"), props: { steps: [{ label: "Cart" }, { label: "Ship" }, { label: "Pay" }], onStepPress: noop }, pairs: 3 },
  { name: "a RowMenu", load: entry("../src/organisms/row-menu/row-menu.android.tsx", "RowMenu"), props: { items: [{ label: "Edit" }] }, pairs: 1 },
  { name: "a CodeBlock with a floating copy chip", load: entry("../src/molecules/code-block/code-block.android.tsx", "CodeBlock"), props: { copy: true, code: "bun add @ionizeio/canvas" }, pairs: 1 },
  { name: "a CodeBlock with a header copy chip", load: entry("../src/molecules/code-block/code-block.android.tsx", "CodeBlock"), props: { copy: true, filename: "install.sh", code: "bun add @ionizeio/canvas" }, pairs: 1 },
  { name: "a Stepper", load: entry("../src/atoms/stepper/stepper.android.tsx", "Stepper"), props: { defaultValue: 1 }, pairs: 2 },
  { name: "a tappable Chip", load: entry("../src/atoms/chip/chip.android.tsx", "Chip"), props: { onPress: noop, children: "Tappable" }, pairs: 1 },
  { name: "a removable Chip", load: entry("../src/atoms/chip/chip.android.tsx", "Chip"), props: { onRemove: noop, children: "Removable" }, pairs: 0, measuredClip: true },
  { name: "a tappable, removable Chip", load: entry("../src/atoms/chip/chip.android.tsx", "Chip"), props: { onPress: noop, onRemove: noop, children: "Both" }, pairs: 0, measuredClip: true },
  { name: "a Toast with an action and a dismiss", load: entry("../src/organisms/toast/toast.android.tsx", "Toast"), props: { message: "Draft saved", action: { label: "Undo", onPress: noop }, onDismiss: noop }, pairs: 2 },
  { name: "a StackedList with row menus", load: entry("../src/molecules/stacked-lists/stacked-lists.android.tsx", "StackedList"), props: { rowMenu: true, onPressItemMenu: noop, items: [{ name: "Ada", detail: "Owner" }, { name: "Lin", detail: "Viewer" }] }, pairs: 2 },
  { name: "a clearable Input", load: entry("../src/atoms/input/input.android.tsx", "Input"), props: { small: true, clearable: true, value: "Clear me", accessibilityLabel: "Field" }, pairs: 0 },
];

const IOS: Case[] = [
  { name: "a small clearable Input", load: entry("../src/atoms/input/input.ios.tsx", "Input"), props: { small: true, clearable: true, value: "Clear me", accessibilityLabel: "Field" }, pairs: 0 },
  { name: "a base clearable Input", load: entry("../src/atoms/input/input.ios.tsx", "Input"), props: { clearable: true, value: "Clear me", accessibilityLabel: "Field" }, pairs: 0 },
];

/**
 * A clipping View around a slop-bearing pressable that carries no slop of its own must say
 * why the slop fits inside it, and the reason is checked here rather than trusted.
 */
const FITS_INSIDE: Record<string, (props: Record<string, unknown>) => boolean> = {
  // The grouped field box around the clear and eye glyphs: a glyph plus its 12pt slop fits
  // the box's height (or the box carries the overhang, in which case it has a slop and never
  // reaches this check), and the gutter's end inset covers the slop sideways.
  "a clearable Input": () => fitsInput(inputAndroid, "small"),
  "a base clearable Input": () => fitsInput(inputIos, "base"),
};

const ACTION_HIT_SLOP = 12;
function fitsInput(skin: typeof inputIos, size: InputSize): boolean {
  const endInset = StyleSheet.flatten(skin.iconOverlay("right")).paddingEnd as number;
  return skin.iconSize + 2 * ACTION_HIT_SLOP <= skin.groupedHeight(size) && endInset >= ACTION_HIT_SLOP;
}

function check(platform: string, cases: Case[], platformMin: number) {
  describe(`${platform}: every slop-bearing pressable's clipping node carries its slop`, () => {
    for (const c of cases) {
      it(c.name, async () => {
        const Component = await c.load();
        const found = renderAndLayout(<Component {...c.props} />, platformMin);
        expect(found.length, "the render produced no slop-bearing pressable: the stand-ins did not take").toBeGreaterThan(0);
        let pairs = 0;
        for (const { pressable, clip } of found) {
          const label = String(pressable.props.accessibilityLabel ?? pressable.props.testID ?? "a pressable");
          if (clip === undefined) continue;
          if (clip.kind === "ripple-clip") {
            pairs += 1;
            expect(clip.props.hitSlop, `${label}: its RippleClip must carry the slop it carries`).toEqual(pressable.props.hitSlop);
          } else if (!isSlop(clip.props.hitSlop)) {
            const fits = FITS_INSIDE[c.name];
            expect(fits?.(c.props) ?? false, `${label}: the ${clip.kind} around it clips and carries no slop`).toBe(true);
          } else if (c.measuredClip) {
            // Every node was given the same frame, so a measured union must reach at least
            // as far as each pressable's own slop on every side.
            const need = slopSides(pressable.props.hitSlop as Insets | number);
            const have = slopSides(clip.props.hitSlop as Insets | number);
            for (const side of ["top", "bottom", "left", "right"] as const) {
              expect(have[side], `${label}: the clip's ${side} slop`).toBeGreaterThanOrEqual(need[side]);
            }
          }
        }
        expect(pairs, "slop-bearing pressables paired with a RippleClip").toBe(c.pairs);
      });
    }
  });
}

check("Android", ANDROID, 48);
check("iOS", IOS, 44);

describe("a clip's measured slop is the part of its children's slop that reaches past it", () => {
  // The Android Chip pill (34 x 100 around one 20dp label line): the body sits inside the
  // 1dp border and 6dp/16dp padding, the 18dp remove glyph is centered 9dp from the end.
  const pill = { width: 100, height: 34 };
  const body = { x: 17, y: 7, width: 40, height: 20 };
  const remove = { x: 73, y: 8, width: 18, height: 18 };

  it("reaches past the pill by what the remove glyph's 48dp target and the body's slop overhang", () => {
    const slop = clipSlop(pill, [{ frame: body, slop: 11 }, { frame: remove, slop: chipAndroid.removeHitSlop }]);
    // Remove: 15 above an 8dp inset, 22 past a 9dp end inset. Body: 11 above a 7dp inset.
    expect(slop).toEqual({ top: 7, bottom: 7, left: 0, right: 13 });
  });

  it("carries nothing when every slop stays inside, and ignores a child not yet measured", () => {
    expect(clipSlop(pill, [{ frame: { x: 20, y: 12, width: 10, height: 10 }, slop: 4 }])).toBeUndefined();
    expect(clipSlop(pill, [{ frame: undefined, slop: 40 }])).toBeUndefined();
    expect(clipSlop(undefined, [{ frame: body, slop: 11 }])).toBeUndefined();
  });
});

describe("the grouped Input box carries the part of an action's slop that overhangs it", () => {
  it("overhangs only where a glyph plus its slop is taller than the box", () => {
    // iOS small: a 20pt glyph and 12pt of slop in a 36pt box, 4pt over on each side.
    expect(actionOverhang(inputIos.iconSize, inputIos.groupedHeight("small"))).toEqual({ top: 4, bottom: 4, left: 0, right: 0 });
    for (const skin of [inputIos, inputAndroid, inputWeb]) {
      for (const size of ["base", "large"] as const) {
        expect(actionOverhang(skin.iconSize, skin.groupedHeight(size)), `${size}`).toBeUndefined();
      }
    }
    expect(actionOverhang(inputAndroid.iconSize, inputAndroid.groupedHeight("small"))).toBeUndefined();
  });

  it("never overhangs sideways: the gutter's end inset covers the slop on every skin", () => {
    for (const skin of [inputIos, inputAndroid, inputWeb]) {
      expect(StyleSheet.flatten(skin.iconOverlay("right")).paddingEnd as number).toBeGreaterThanOrEqual(ACTION_HIT_SLOP);
    }
  });

  it("puts the overhang on the rendered box of the iOS small field", async () => {
    const Input = (await import("../src/atoms/input/input.ios.tsx")).Input as ComponentType<Record<string, unknown>>;
    renderAndLayout(<Input small clearable value="Clear me" accessibilityLabel="Field" />);
    const box = [...records.values()].find((r) => r.kind === "view" && r.clips && isSlop(r.props.hitSlop));
    expect(box?.props.hitSlop).toEqual({ top: 4, bottom: 4, left: 0, right: 0 });
  });
});

describe("a textless Radio in an iOS list keeps no slop", () => {
  // The row is a full-width cell at the platform's row height, so it meets the minimum on
  // its own, and a slop would be cut by the section's clip and reach into the next rows.
  it("drops the ring's slop in a list cell and keeps it standing alone", async () => {
    const { Radio, RadioGroup } = (await import("../src/atoms/radio/radio.ios.tsx")) as unknown as {
      Radio: ComponentType<Record<string, unknown>>;
      RadioGroup: ComponentType<Record<string, unknown>>;
    };
    renderAndLayout(
      <RadioGroup defaultValue="a" accessibilityLabel="Plan">
        <Radio value="a" accessibilityLabel="Monthly" />
        <Radio value="b" accessibilityLabel="Yearly" />
      </RadioGroup>,
    );
    const cells = [...records.values()].filter((r) => r.kind === "pressable" && r.props.accessibilityRole === "radio");
    expect(cells.length).toBe(2);
    for (const cell of cells) expect(cell.props.hitSlop).toBeUndefined();
    cleanup();
    records.clear();
    renderAndLayout(<Radio accessibilityLabel="Alone" />);
    const alone = [...records.values()].find((r) => r.kind === "pressable" && r.props.accessibilityRole === "radio");
    expect(alone?.props.hitSlop).toBe(8);
  });
});
