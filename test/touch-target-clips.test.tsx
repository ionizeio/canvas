import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { cleanup } from "@testing-library/react";
import { type ComponentType } from "react";
import { StyleSheet, type Insets } from "react-native";
import { iosSkin as inputIos, androidSkin as inputAndroid, webSkin as inputWeb, type Size as InputSize } from "../src/atoms/input/input.styles.ts";
import { actionOverhang } from "../src/atoms/input/input.shared.tsx";
import { clipSlop, reachSlop } from "../src/style/clip-slop.ts";
import { slopSides } from "../src/style/touch-seam.ts";
import { androidSkin as chipAndroid, webSkin as chipWeb } from "../src/atoms/chip/chip.styles.ts";
import { webSkin as codeBlock } from "../src/molecules/code-block/code-block.styles.ts";
import * as rtl from "../src/style/rtl.ts";
import { seedSlop, styleBox } from "../src/style/touch-target-seed.ts";
import { TOUCH_TARGET } from "../src/style/touch-target.ts";
import { lightColors as t } from "../src/style/tokens.ts";
import { spyOn } from "bun:test";
import { installTouchStubs, isSlop, records, renderAndLayout, restoreTouchStubs, type NodeRecord } from "./fixtures/touch-records.tsx";

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
  // The disclosure's slop sits in the field box, which paints but never clips.
  { name: "an Autocomplete's disclosure", load: entry("../src/atoms/autocomplete/autocomplete.ios.tsx", "Autocomplete"), props: { small: true, label: "Person", options: ["Ada"] }, pairs: 0 },
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

  it("reaches past the pill by what the remove glyph's 48dp target and the body's reach overhang", () => {
    // The body reaches the pill's own 48dp target: 7 above and below the 34dp pill.
    const slop = clipSlop(pill, [{ frame: body, slop: reachSlop(pill, body, { top: 7, bottom: 7, left: 0, right: 0 }) }, { frame: remove, slop: chipAndroid.removeHitSlop }]);
    // Remove: 15 above an 8dp inset, 22 past a 9dp end inset. Body: 14 above a 7dp inset.
    expect(slop).toEqual({ top: 7, bottom: 7, left: 0, right: 13 });
  });

  it("a child reaches its parent's target from where it sits: the inverse of the clip's slop", () => {
    expect(reachSlop(pill, body, { top: 7, bottom: 7, left: 0, right: 0 })).toEqual({ top: 14, bottom: 14, left: 17, right: 43 });
    expect(reachSlop(pill, body, undefined)).toEqual({ top: 7, bottom: 7, left: 17, right: 43 });
    // A child that reaches exactly the parent's target overhangs it by the target's own slop.
    expect(clipSlop(pill, [{ frame: body, slop: reachSlop(pill, body, 5) }])).toEqual({ top: 5, bottom: 5, left: 5, right: 5 });
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

describe("a tappable Chip's touch area", () => {
  const noop = () => {};
  const chip = async (platform: "android" | "ios") => (await import(`../src/atoms/chip/chip.${platform}.tsx`)).Chip as ComponentType<Record<string, unknown>>;
  const find = (label: string) => [...records.values()].find((r) => r.kind === "pressable" && r.props.accessibilityLabel === label);

  it("on Android is the 48dp minimum, measured from the chip, and its RippleClip carries the same", async () => {
    const Chip = await chip("android");
    expect(chipAndroid.bodyMinTarget).toBe(TOUCH_TARGET.android);
    // The fixture's 94.5 x 34dp chip: 7dp above and below, nothing sideways.
    const [found] = renderAndLayout(<Chip onPress={noop} accessibilityLabel="Tappable">Tappable</Chip>, null, { width: 94.5, height: 34 });
    expect(found!.pressable.props.hitSlop).toEqual({ top: 7, bottom: 7, left: 0, right: 0 });
    expect(found!.clip?.props.hitSlop).toEqual(found!.pressable.props.hitSlop);
  });

  it("on iOS keeps its fixed 11pt, which clears the 44pt minimum around the 25pt pill", async () => {
    const Chip = await chip("ios");
    const [found] = renderAndLayout(<Chip onPress={noop} accessibilityLabel="Tappable">Tappable</Chip>, null, { width: 70, height: 25 });
    expect(found!.pressable.props.hitSlop).toBe(chipWeb.bodyHitSlop);
    const pill = styleBox(StyleSheet.flatten(chipWeb.base), chipWeb.labelType.lineHeight);
    expect(pill.height).toBe(25);
    expect(pill.height! + 2 * chipWeb.bodyHitSlop!).toBeGreaterThanOrEqual(TOUCH_TARGET.ios);
  });

  it("on Android, beside a remove glyph, reaches the pill's whole target, and the pill carries what reaches past it", async () => {
    const Chip = await chip("android");
    // The 100 x 34dp pill: the label body inside its 1dp border and 16dp padding, the 18dp
    // glyph centered 9dp from its end.
    const frames: Record<string, { x: number; y: number; width: number; height: number }> = {
      pill: { x: 0, y: 0, width: 100, height: 34 },
      Both: { x: 17, y: 7, width: 40, height: 20 },
      "Remove Both": { x: 73, y: 8, width: 18, height: 18 },
    };
    renderAndLayout(<Chip onPress={noop} onRemove={noop} accessibilityLabel="Both">Both</Chip>, null,
      (r: NodeRecord) => frames[r.kind === "view" ? "pill" : String(r.props.accessibilityLabel)] ?? null);
    // 7 above and below the pill; toward the glyph, half the 8dp gap.
    expect(find("Both")?.props.hitSlop).toEqual({ top: 14, bottom: 14, left: 17, right: 4 });
    expect(find("Remove Both")?.props.hitSlop).toEqual({ ...chipAndroid.removeHitSlop, left: 4 });
    const pill = [...records.values()].find((r) => r.kind === "view" && r.clips);
    expect(pill?.props.hitSlop).toEqual({ top: 7, bottom: 7, left: 0, right: 13 });
  });

  it("on Android reaches the pill's target before the first layout too: its padding and border plus the shortfall", async () => {
    const Chip = await chip("android");
    renderAndLayout(<Chip onPress={noop} onRemove={noop} accessibilityLabel="Both">Both</Chip>, null, null);
    // 7dp of padding and border above and below, 7 more to 48; 17dp at the start; the glyph's
    // side split.
    expect(find("Both")?.props.hitSlop).toEqual({ top: 14, bottom: 14, left: 17, right: 4 });
  });

  it("a removable Android chip's pill carries its glyph's mirrored reach right to left", async () => {
    const spy = spyOn(rtl, "isRTL").mockReturnValue(true);
    try {
      const Chip = await chip("android");
      // Right to left the glyph sits at the pill's left end, 9dp in, its long side outward.
      renderAndLayout(<Chip onRemove={noop}>Tag</Chip>, null,
        (r: NodeRecord) => (r.kind === "view" ? { width: 100, height: 34 } : r.props.accessibilityLabel === "Remove Tag" ? { x: 9, y: 8, width: 18, height: 18 } : null));
      const pill = [...records.values()].find((r) => r.kind === "view" && r.clips);
      expect(pill?.props.hitSlop).toEqual({ top: 7, bottom: 7, left: chipAndroid.removeHitSlop.right - 9, right: 0 });
    } finally {
      spy.mockRestore();
    }
  });
});

describe("the CodeBlock's copy chips sit in no clipping kit view", () => {
  const Android = entry("../src/molecules/code-block/code-block.android.tsx", "CodeBlock");
  // The copy chip's RippleClip, and every clipping view around it.
  const clipsAround = () => {
    const chip = [...records.values()].find((r) => r.kind === "pressable" && r.props.accessibilityLabel === "Copy code");
    expect(chip, "the copy chip rendered").toBeDefined();
    const chain: NodeRecord[] = [];
    for (let id = chip!.clip; id != null; id = records.get(id)?.clip) chain.push(records.get(id)!);
    return chain;
  };

  for (const material of ["solid", "glass"] as const) {
    for (const [name, props] of [["floating", {}], ["header", { filename: "install.sh" }]] as const) {
      it(`${name}, ${material}: only its own RippleClip clips around it`, async () => {
        const CodeBlock = await Android();
        renderAndLayout(<CodeBlock copy code="bun add @ionizeio/canvas" {...props} />, TOUCH_TARGET.android, undefined, material);
        // Under glass the root takes the code surface's shape but not its clip, which would cut
        // the chip's 11dp of slop at 9dp from the edge.
        expect(clipsAround().map((r) => r.kind)).toEqual(["ripple-clip"]);
      });
    }
  }

  it("records the one window that cuts it: the terminal's, over a chrome that hosts tabs", async () => {
    // The terminal window clips at its rounded edge (it rounds the chrome and the body), and
    // its chrome centres the chip. Without tabs the chrome's padding holds the whole slop; with
    // tabs the 40pt chrome centres the 26pt chip 7.5 from the window's edge, and the window cuts
    // the part of the slop above it. Recorded for the owner, not fixed: moving the rounding off
    // the window changes how its shadow renders on iOS.
    const chip = styleBox(StyleSheet.flatten(codeBlock.copyButton(t, true, false)) as ViewStyle, codeBlock.copyText(t, true).lineHeight).height!;
    const border = codeBlock.terminalOuter(t).borderWidth as number;
    const chrome = codeBlock.terminalChrome;
    const tab = 2 * (codeBlock.tabItem(t, true, true).paddingVertical as number) + (codeBlock.tabLabel(t, true, true).lineHeight as number) + (codeBlock.tabItem(t, true, true).borderBottomWidth as number);
    const plain = border + (chrome.paddingVertical as number);
    const content = Math.max((chrome.minHeight as number) - (chrome.borderBottomWidth as number), tab, chip);
    const tabbed = border + (codeBlock.terminalChromeWithTabs.paddingVertical as number) + (content - chip) / 2;
    const cut = (min: number) => Math.max(0, seedSlop(min, { height: chip })!.top! - tabbed);
    expect(seedSlop(TOUCH_TARGET.android, { height: chip })!.top!).toBeLessThanOrEqual(plain);
    expect({ tabbed, android: cut(TOUCH_TARGET.android), ios: cut(TOUCH_TARGET.ios) }).toEqual({ tabbed: 7.5, android: 3.5, ios: 1.5 });
  });
});
