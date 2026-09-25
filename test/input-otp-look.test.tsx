import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { AccessibilityInfo } from "react-native";
import { ThemeProvider } from "../src/style/theme.tsx";
import { darkColors, lightColors, mintColors, type ColorTokens } from "../src/style/tokens.ts";
import { alpha } from "../src/style/color.ts";
import { keyframes } from "../src/style/motion.ts";
import { trackAt } from "../src/style/loop.tsx";
import { TOUCH_TARGET } from "../src/style/touch-target.ts";
import { FIELD_HEIGHT, fieldDisabled, fieldFrame } from "../src/style/field-look.ts";
import * as skins from "../src/atoms/input-otp/input-otp.styles.ts";
import { CARET_BLINK, CARET_BLINK_PERIOD, type Size } from "../src/atoms/input-otp/input-otp.shared.tsx";
import { InputOTP } from "../src/atoms/input-otp/input-otp.tsx";

// InputOTP takes Dark Factory's field on every platform (SKN-6c): neither iOS nor Material 3
// ships a one-time-code control, so the three entries share one skin whose cells are the
// field recipe's frame (src/style/field-look.ts), and the caret blinks on the loop primitive
// (src/style/loop.tsx) instead of an Animated.loop, keeping its one-second schedule.

afterEach(cleanup);

const ROOT = join(import.meta.dir, "..");
const SIZES: Size[] = ["small", "base", "large"];
const PALETTES: Array<[string, ColorTokens, { dark?: boolean; mint?: boolean }]> = [
  ["blush", lightColors, {}],
  ["mint", mintColors, { mint: true }],
  ["dark", darkColors, { dark: true }],
];
// A colour as "r,g,b,a" (alpha to two places), whether a token's hex or rgba or the DOM's rgb.
function norm(color: string): string {
  if (color === "transparent") return "0,0,0,0.00";
  const m = (color.startsWith("#") ? alpha(color, 1) : color).match(/rgba?\(([^)]*)\)/);
  if (!m) throw new Error(`not a colour: ${color}`);
  const [r, g, b, a = "1"] = m[1]!.split(",").map((v) => v.trim());
  return `${r},${g},${b},${Number(a).toFixed(2)}`;
}

function cellsOf(container: HTMLElement): HTMLElement[] {
  // The cells are the row's boxes carrying the field corner.
  return [...container.querySelectorAll<HTMLElement>("div")].filter((el) => el.style.borderRadius === "10px");
}

function caretOf(container: HTMLElement): HTMLElement | undefined {
  return [...container.querySelectorAll<HTMLElement>("div")].find((el) => el.style.width === "1.5px");
}

describe("one skin on every platform", () => {
  it("iOS and Android alias the web skin", () => {
    expect(skins.iosSkin).toBe(skins.webSkin);
    expect(skins.androidSkin).toBe(skins.webSkin);
    // The per-platform split's flags are gone from the contract.
    for (const gone of ["caretBlink", "connected", "disabledOpacity"]) expect(Object.keys(skins.webSkin)).not.toContain(gone);
  });

  it("draws each cell as Dark Factory's field frame, the ring on the active one, in every palette", () => {
    for (const [, t] of PALETTES) {
      for (const size of SIZES) {
        for (const active of [false, true]) {
          const cell = skins.webSkin.cell(t, size, { active, filled: false });
          expect(cell).toMatchObject(fieldFrame(t, { focused: active, error: false }));
          // No halo: the 1px ring is the focus indicator (the old 3px 50% halo read 1.87:1).
          expect(cell.boxShadow).toBeUndefined();
        }
      }
      expect(skins.webSkin.disabledLook).toBe(fieldDisabled);
    }
  });

  it("draws squares as tall as the field, set apart, and grows a cell to each native platform's minimum", () => {
    const web = skins.sharedSkin({ minTarget: null });
    const ios = skins.sharedSkin({ minTarget: TOUCH_TARGET.ios });
    const android = skins.sharedSkin({ minTarget: TOUCH_TARGET.android });
    const box = (skin: typeof web, size: Size) => {
      const { width, height } = skin.cell(lightColors, size, { active: false, filled: false });
      return [width, height];
    };
    // The cell is the field's own height at each size (an Input beside it lines up).
    expect(SIZES.map((size) => box(web, size))).toEqual(SIZES.map((size) => [FIELD_HEIGHT[size], FIELD_HEIGHT[size]]));
    expect(SIZES.map((size) => box(web, size))).toEqual([[34, 34], [40, 40], [46, 46]]);
    expect(SIZES.map((size) => box(ios, size))).toEqual([[34, 44], [40, 44], [46, 46]]);
    expect(SIZES.map((size) => box(android, size))).toEqual([[34, 48], [40, 48], [46, 48]]);
    expect(SIZES.map((size) => web.gap(size))).toEqual([6, 8, 10]);
    // Six base cells in two groups of three, the dash and its room between them, fit the
    // 319px column the docs give a 375px phone: 6 x 40, four gaps inside the groups, two
    // beside the dash, its 8px insets and the dash itself (under 10px at 18px).
    const separator = skins.webSkin.separator(lightColors, "base");
    const grouped = 6 * 40 + 6 * web.gap("base") + 2 * (separator.marginHorizontal as number) + 10;
    expect(grouped).toBeLessThanOrEqual(319);
    // The web harness is the web: no minimum there.
    expect(box(skins.webSkin, "small")).toEqual([34, 34]);
  });

  it("sets the digit at the field's weight in the foreground ink and the caret in the brand", () => {
    for (const [, t] of PALETTES) {
      expect(skins.webSkin.digit(t, "base")).toMatchObject({ fontSize: 18, fontWeight: "600", color: t.foreground });
      expect(skins.webSkin.caret(t, "base")).toMatchObject({ width: 1.5, height: 18, backgroundColor: t.primary });
      expect(skins.webSkin.separator(t, "base").color).toBe(t["muted-foreground"]);
    }
  });
});

describe("the rendered field", () => {
  for (const [name, t, provider] of PALETTES) {
    it(`${name}: separate wells, the ring where the next character lands`, () => {
      render(<ThemeProvider solid {...provider}><InputOTP length={4} defaultValue="1" testID="otp" /></ThemeProvider>);
      const root = screen.getByTestId("otp");
      const input = root.querySelector("input") as HTMLInputElement;
      act(() => input.focus());
      const cells = cellsOf(root);
      expect(cells).toHaveLength(4);
      cells.forEach((cell, index) => {
        expect(cell.style.width).toBe("40px");
        expect(norm(cell.style.backgroundColor)).toBe(norm(t["field-fill"]!));
        expect(norm(cell.style.borderColor)).toBe(norm(index === 1 ? t.ring : t["field-border"]!));
        expect(cell.style.boxShadow).toBe("");
      });
      expect(norm(cells[0]!.querySelector<HTMLElement>('[dir="auto"]')!.style.color)).toBe(norm(t.foreground));
    });

    it(`${name}: a disabled field takes the field's disabled look, not a dim`, () => {
      render(<ThemeProvider solid {...provider}><InputOTP length={4} defaultValue="12" disabled testID="otp" /></ThemeProvider>);
      const root = screen.getByTestId("otp");
      expect(root.style.opacity).toBe("");
      const input = root.querySelector("input") as HTMLInputElement;
      // react-native-web disables the capture input, so neither a tap nor the keyboard reaches it.
      expect(input.disabled).toBe(true);
      act(() => input.focus());
      expect(document.activeElement).not.toBe(input);
      const cells = cellsOf(root);
      expect(cells).toHaveLength(4);
      for (const cell of cells) {
        expect(norm(cell.style.backgroundColor)).toBe(norm("transparent"));
        expect(norm(cell.style.borderColor)).toBe(norm(t.border));
        expect(cell.style.opacity).toBe("");
      }
      expect(norm(cells[0]!.querySelector<HTMLElement>('[dir="auto"]')!.style.color)).toBe(norm(t["muted-foreground"]));
      expect(caretOf(root)).toBeUndefined();
    });
  }
});

describe("the caret blink", () => {
  it("keeps the one-second schedule the Animated.loop ran", () => {
    // The loop it replaced: opacity 1 - BLINK(t), a 1000ms timing eased by these keyframes.
    const BLINK = keyframes([[0, 0], [0.38, 0], [0.5, 1], [0.88, 1], [1, 0]]);
    expect(CARET_BLINK_PERIOD).toBe(1000);
    for (let i = 0; i <= 200; i++) {
      const phase = i / 200;
      expect(trackAt(CARET_BLINK, phase)).toBeCloseTo(1 - BLINK(phase), 10);
    }
  });

  it("runs on the web as a compositor animation, with no Animated.loop in the shell", async () => {
    const spy = spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockReturnValue(Promise.resolve(false));
    try {
      render(<ThemeProvider solid><InputOTP length={4} testID="otp" /></ThemeProvider>);
      const root = screen.getByTestId("otp");
      act(() => (root.querySelector("input") as HTMLInputElement).focus());
      await waitFor(() => expect(caretOf(root)?.className).toMatch(/animationKeyframes/));
      const caret = caretOf(root)!;
      expect(caret.className).toMatch(/animationDuration/);
      // Played from the top when it appears: no time elapsed yet.
      expect(caret.style.animationDelay).toMatch(/^-?0ms$/);
      const css = [...document.styleSheets].flatMap((sheet) => [...sheet.cssRules].map((rule) => rule.cssText)).join("\n");
      expect(css).toMatch(/38\.0000%\s*\{\s*opacity:\s*1/);
      expect(css).toMatch(/50\.0000%\s*\{\s*opacity:\s*0/);
      expect(css).toMatch(/88\.0000%\s*\{\s*opacity:\s*0/);
    } finally {
      spy.mockRestore();
    }
    const shell = readFileSync(join(ROOT, "src/atoms/input-otp/input-otp.shared.tsx"), "utf8");
    expect(shell).not.toContain("Animated.loop(");
    expect(shell).toContain("LoopView");
  });

  it("holds solid under Reduce Motion", async () => {
    const spy = spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockReturnValue(Promise.resolve(true));
    try {
      render(<ThemeProvider solid><InputOTP length={4} testID="otp" /></ThemeProvider>);
      const root = screen.getByTestId("otp");
      act(() => (root.querySelector("input") as HTMLInputElement).focus());
      await waitFor(() => expect(caretOf(root)).toBeDefined());
      await waitFor(() => expect(caretOf(root)!.className).not.toMatch(/animationKeyframes/));
      expect(caretOf(root)!.style.animationDelay).toBe("");
      expect(caretOf(root)!.style.opacity).toBe("");
    } finally {
      spy.mockRestore();
    }
  });
});

describe("the CSS hand-off", () => {
  it("has no iOS or Android InputOTP rows: both platforms read the web's", () => {
    const css = readFileSync(join(ROOT, "styles/tokens/platforms.css"), "utf8");
    expect(css.match(/--p-otp-radius:/g)).toHaveLength(1);
    expect(css).toContain("--p-otp-rest-border-color:var(--field-border)");
    expect(css).toContain("--p-otp-caret-blink:canvas-caret 1s linear infinite");
    const base = readFileSync(join(ROOT, "styles/tokens/base.css"), "utf8");
    expect(base).toContain("@keyframes canvas-caret{0%,38%{opacity:1}50%,88%{opacity:0}100%{opacity:1}}");
  });
});
