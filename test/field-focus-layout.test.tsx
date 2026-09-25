import { describe, it, expect, afterEach } from "bun:test";
import { render, cleanup } from "@testing-library/react";
import type { ReactNode } from "react";
import type { ViewStyle, TextStyle } from "react-native";
import { ThemeProvider } from "../src/style/theme.tsx";
import { lightColors as t } from "../src/style/tokens.ts";

import { webSkin as selectWeb, iosSkin as selectIos, androidSkin as selectAndroid } from "../src/atoms/select/select.styles.ts";
import { webSkin as comboWeb, iosSkin as comboIos, androidSkin as comboAndroid } from "../src/atoms/autocomplete/autocomplete.styles.ts";
import { webSkin as inputWeb, iosSkin as inputIos, androidSkin as inputAndroid } from "../src/atoms/input/input.styles.ts";

import { Input } from "../src/atoms/input/input.tsx";
import { Autocomplete } from "../src/atoms/autocomplete/autocomplete.tsx";
import { Textarea } from "../src/atoms/textarea/textarea.tsx";
import { Stepper } from "../src/atoms/stepper/stepper.tsx";

// ---------------------------------------------------------------------------
// Part A: the active indicator must not reflow the value text.
//
// The M3/iOS field thickens its bottom active-indicator when it becomes active
// (Select/Autocomplete on open, Input on focus). Each such field has a fixed height,
// box-sizing:border-box, and vertically-centered content, so any change to the
// total vertical border+padding shifts the centered value text. The fix reserves
// a constant amount below the content (border + compensating padding); this test
// locks that: the total vertical inset must be identical in the rest and active
// states, for every size and skin. (Textarea is intentionally excluded: its
// content is top-aligned, so a bottom-border change never moves the text.)
// ---------------------------------------------------------------------------

const SIZES = ["small", "default", "large"] as const;

const num = (v: unknown): number => (typeof v === "number" ? v : 0);

// Total top+bottom border + padding an element reserves. Constant across states
// => content box (and the centered value text) does not move.
function vInset(s: ViewStyle | TextStyle): number {
  const st = s as Record<string, unknown>;
  const pv = num(st.paddingVertical);
  const pt = st.paddingTop != null ? num(st.paddingTop) : pv;
  const pb = st.paddingBottom != null ? num(st.paddingBottom) : pv;
  const bw = num(st.borderWidth);
  const bt = st.borderTopWidth != null ? num(st.borderTopWidth) : bw;
  const bb = st.borderBottomWidth != null ? num(st.borderBottomWidth) : bw;
  return pt + pb + bt + bb;
}

describe("field active indicator: content box stays fixed across the active state", () => {
  for (const [plat, skin] of [["web", selectWeb], ["ios", selectIos], ["android", selectAndroid]] as const) {
    for (const size of SIZES) {
      it(`Select ${plat} ${size} trigger`, () => {
        expect(vInset(skin.trigger(t, size, true))).toBe(vInset(skin.trigger(t, size, false)));
      });
    }
  }

  for (const [plat, skin] of [["web", comboWeb], ["ios", comboIos], ["android", comboAndroid]] as const) {
    for (const size of SIZES) {
      it(`Autocomplete ${plat} ${size} field`, () => {
        expect(vInset(skin.field(t, size, true))).toBe(vInset(skin.field(t, size, false)));
      });
    }
  }

  // Input's active state is `focused || error`; the shell passes borderColor "ring"
  // + focused=true when active, "input" + false at rest. Bare and grouped both
  // carry the indicator (bare on the field, grouped on the container).
  for (const [plat, skin] of [["web", inputWeb], ["ios", inputIos], ["android", inputAndroid]] as const) {
    it(`Input ${plat} bareField`, () => {
      expect(vInset(skin.bareField(t, "ring", true, false))).toBe(vInset(skin.bareField(t, "input", false, false)));
    });
    it(`Input ${plat} groupContainer`, () => {
      expect(vInset(skin.groupContainer(t, "ring", true, false))).toBe(vInset(skin.groupContainer(t, "input", false, false)));
    });
  }
});

// ---------------------------------------------------------------------------
// Part C: a prefix/suffix affix must hug the value on the inline-affix skin.
//
// On Android the prefix/suffix is INLINE affix text sharing the field surface
// (no separate fill, no divider), so the value follows it with only a small gap;
// the affix owns the container's leading/trailing inset. The Android skin
// regressed to a padded box (addon paddingHorizontal 16 + a 1px divider + the
// field's own 16 inset => a ~33dp void between "https://" and the value). This
// locks the inline behavior: the affix->value gap is tight and there is no
// divider, while the container inset before the affix is preserved.
//
// iOS is deliberately NOT inline: the iOS input-field reference draws its
// currency addon as a BOXED, muted addon with a divider on the field side (see
// input.styles.ts iosSkin), which Part C2 pins instead.
// ---------------------------------------------------------------------------

// Resolve a horizontal edge padding, honoring paddingHorizontal as the fallback.
function hpad(s: ViewStyle | TextStyle, edge: "start" | "end"): number {
  const st = s as Record<string, unknown>;
  const ph = num(st.paddingHorizontal);
  const v = edge === "start" ? st.paddingStart : st.paddingEnd;
  return v != null ? num(v) : ph;
}

describe("grouped affix hugs the value on the inline-affix skins", () => {
  const prefixField = (skin: typeof inputAndroid) =>
    skin.groupField(t, { leadingIcon: false, trailingIcon: false, hasPrefix: true, hasSuffix: false });
  const suffixField = (skin: typeof inputAndroid) =>
    skin.groupField(t, { leadingIcon: false, trailingIcon: false, hasPrefix: false, hasSuffix: true });

  const rest = { focused: false, error: false };
  for (const [plat, skin] of [["android", inputAndroid]] as const) {
    it(`Input ${plat}: prefix -> value gap is tight (<= 8) and there is no divider`, () => {
      const addon = skin.addonBox(t, "left", rest) as Record<string, unknown>;
      const gap = hpad(addon, "end") + hpad(prefixField(skin), "start");
      expect(gap).toBeLessThanOrEqual(8);
      // Inline affix: no fill of its own and no separator rule.
      expect(addon.borderEndWidth).toBeUndefined();
      expect(addon.borderStartWidth).toBeUndefined();
    });

    it(`Input ${plat}: suffix -> value gap is tight (<= 8) and there is no divider`, () => {
      const addon = skin.addonBox(t, "right", rest) as Record<string, unknown>;
      const gap = hpad(addon, "start") + hpad(suffixField(skin), "end");
      expect(gap).toBeLessThanOrEqual(8);
      expect(addon.borderStartWidth).toBeUndefined();
      expect(addon.borderEndWidth).toBeUndefined();
    });
  }

  // Part C2: the iOS addon is the reference's boxed addon. Its divider sits on the
  // field side and takes the field's state colour (rest hairline, ring on focus,
  // destructive on error), its fill is `muted` at rest and the error wash on error,
  // and the field keeps its own 12pt inset after the divider.
  it("Input ios: the addon is a boxed, muted addon whose divider follows the field state", () => {
    const left = inputIos.addonBox(t, "left", rest) as Record<string, unknown>;
    const right = inputIos.addonBox(t, "right", rest) as Record<string, unknown>;
    expect(left.borderEndWidth).toBe(1);
    expect(right.borderStartWidth).toBe(1);
    expect(left.backgroundColor).toBe(t.muted);
    expect(left.borderColor).toBe(t["field-border"]);
    expect((inputIos.addonBox(t, "left", { focused: true, error: false }) as Record<string, unknown>).borderColor).toBe(t.ring);
    expect((inputIos.addonBox(t, "left", { focused: false, error: true }) as Record<string, unknown>).borderColor).toBe(t.destructive);
    expect((inputIos.addonBox(t, "left", { focused: false, error: true }) as Record<string, unknown>).backgroundColor).not.toBe(t.muted);
    expect(hpad(prefixField(inputIos), "start")).toBe(12);
  });

  it("Input android: the prefix still keeps the 16dp container leading inset", () => {
    // The affix owns the container edge inset (M3 content padding), so only the
    // gap toward the value shrinks, not the leading edge.
    expect(hpad(inputAndroid.addonBox(t, "left"), "start")).toBe(16);
  });

  it("Input: addon boxes stretch to the row instead of setting their own height", () => {
    // The shell owns the group height (minHeight on the container); a box that
    // set its own height would inflate the row past groupedHeight by the
    // border/indicator band.
    for (const skin of [inputWeb, inputIos, inputAndroid]) {
      for (const side of ["left", "right"] as const) {
        expect((skin.addonBox(t, side, { focused: false, error: false }) as Record<string, unknown>).height).toBeUndefined();
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Part D: grouped icon overlays anchor to the field area, not the container.
//
// The Android group container swaps bottom border for compensating padding when
// focus thickens the active indicator (1dp+1dp -> 2dp+0dp). The border is outside
// an absolute child's positioning box but the padding is inside it, so an overlay
// stretched top:0/bottom:0 across the CONTAINER spans a band that changes by 1dp
// with focus and its centered icon hops by half that (the reported Android bug).
// The shell therefore nests the overlays next to the TextInput inside a flexible
// field-area wrapper (the container's content box, constant by Part A).
// ---------------------------------------------------------------------------

describe("grouped icon overlay anchors to the field area", () => {
  it("Input (leading icon): the overlay is a sibling of the input inside an unbordered wrapper", () => {
    const { container } = ui(<Input leadingIcon icon="search" placeholder="x" />);
    const input = container.querySelector("input");
    expect(input).not.toBeNull();
    const area = input!.parentElement as HTMLElement;
    const overlay = Array.from(area.children).find(
      (c) => c !== input && (c as HTMLElement).style.position === "absolute",
    ) as HTMLElement | undefined;
    expect(overlay).toBeDefined();
    // The wrapper is the flexible field cell, not the bordered group container.
    expect(area.style.flexGrow).toBe("1");
    expect(area.style.borderBottomWidth === "" || area.style.borderBottomWidth === "0px").toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Part B: the browser's default focus outline must be suppressed on web.
//
// react-native-web paints its default focus outline on the <input>/<textarea>.
// Every field skin paints its own focus affordance (web border -> ring, iOS
// hairline, Android indicator), so the shared FOCUS_RESET suppresses the browser
// outline. This locks that the field shells apply it on every rendered field
// (the bare Input path was the one that regressed).
// ---------------------------------------------------------------------------

const ui = (n: ReactNode) => render(<ThemeProvider>{n}</ThemeProvider>);
afterEach(cleanup);

// RNW writes the reset as an inline style on the element; assert the outline is
// explicitly zeroed rather than left at the UA default. The width does the work; the
// style is `solid` because React Native's native prop parser rejects `none`.
function assertOutlineSuppressed(el: HTMLElement | null) {
  expect(el).not.toBeNull();
  const inline = el!.style;
  expect(inline.outlineWidth).toBe("0px");
  expect(inline.outlineStyle).toBe("solid");
}

describe("field focus outline is suppressed on web", () => {
  it("Input (bare single-line)", () => {
    const { container } = ui(<Input placeholder="x" />);
    assertOutlineSuppressed(container.querySelector("input"));
  });

  it("Input (grouped with addon)", () => {
    const { container } = ui(<Input prefix="$" placeholder="x" />);
    assertOutlineSuppressed(container.querySelector("input"));
  });

  it("Autocomplete", () => {
    const { container } = ui(<Autocomplete placeholder="x" options={["Ada", "Grace"]} />);
    assertOutlineSuppressed(container.querySelector("input"));
  });

  it("Textarea", () => {
    const { container } = ui(<Textarea placeholder="x" />);
    assertOutlineSuppressed(container.querySelector("textarea"));
  });

  it("Stepper", () => {
    const { container } = ui(<Stepper placeholder="x" />);
    assertOutlineSuppressed(container.querySelector("input"));
  });
});
