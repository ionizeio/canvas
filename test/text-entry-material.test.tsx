import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { AccessibilityInfo, View } from "react-native";
import { ThemeProvider } from "../src/style/theme.tsx";
import { Input } from "../src/atoms/input/input.tsx";
import { Input as InputIOS } from "../src/atoms/input/input.ios.tsx";
import { Textarea } from "../src/atoms/textarea/textarea.tsx";
import { Textarea as TextareaAndroid } from "../src/atoms/textarea/textarea.android.tsx";
import { Autocomplete } from "../src/atoms/autocomplete/autocomplete.tsx";
import { Autocomplete as AutocompleteIOS } from "../src/atoms/autocomplete/autocomplete.ios.tsx";
import { InputOTP } from "../src/atoms/input-otp/input-otp.tsx";
import { Stepper } from "../src/atoms/stepper/stepper.tsx";
import { PhoneInput } from "../src/molecules/phone-input/phone-input.tsx";
import { PhoneInput as PhoneInputIOS } from "../src/molecules/phone-input/phone-input.ios.tsx";
import { clearSurfaceTint } from "../src/style/glass-surface/glass-surface.shared.tsx";
import { WEB_FROST } from "../src/style/glass-surface/web-frost.ts";
import { lightColors } from "../src/style/tokens.ts";

const restores: Array<() => void> = [];
let available = true;

// The browser's one material question: does it render a CSS backdrop filter? `available`
// is its answer, and a browser that says no gets every field's solid skin.
beforeEach(() => {
  available = true;
  const css = Object.getOwnPropertyDescriptor(globalThis, "CSS");
  Object.defineProperty(globalThis, "CSS", { configurable: true, value: {
    supports: () => available,
  } });
  restores.push(() => {
    if (css) Object.defineProperty(globalThis, "CSS", css);
    else delete (globalThis as unknown as Record<string, unknown>).CSS;
  });
});

afterEach(() => {
  cleanup();
  restores.splice(0).reverse().forEach(restore => restore());
});

const mode = (children: ReactNode, glass = true) => <ThemeProvider light glass={glass} solid={!glass}>{children}</ThemeProvider>;
// The material GlassBox paints behind a field. Counted by its wrapper, because a clear
// field draws no frost: Dark Factory draws its fields as an unblurred translucent fill.
const materials = (root: ParentNode) => [...root.querySelectorAll<HTMLElement>('[data-testid="glass-material"]')];
// react-native-web stores an alpha as an 8-bit channel and prints it with two decimals,
// so colours compare as numbers quantized the way it does.
const rgbaOf = (value: string) => {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(value);
  if (!m) return value;
  const a = m[4] == null ? 1 : Number(m[4]);
  return [Number(m[1]), Number(m[2]), Number(m[3]), Number((Math.round(a * 255) / 255).toFixed(2))];
};

describe("clear grouped field state borders", () => {
  const fields = [
    {
      name: "grouped Input",
      field: (native: boolean) => native ? <InputIOS prefix="$" testID="field" /> : <Input prefix="$" testID="field" />,
      owner: (input: HTMLElement) => input.parentElement!.parentElement!,
    },
    {
      name: "Autocomplete",
      field: (native: boolean) => native ? <AutocompleteIOS options={["Ada", "Grace"]} testID="field" /> : <Autocomplete options={["Ada", "Grace"]} testID="field" />,
      owner: (input: HTMLElement) => input.parentElement!,
    },
    {
      name: "PhoneInput",
      field: (native: boolean) => native ? <PhoneInputIOS testID="field" /> : <PhoneInput testID="field" />,
      owner: (input: HTMLElement) => input.parentElement!.parentElement!,
    },
  ];

  for (const { name, field, owner } of fields) {
    it(`${name} paints the active outline after the material and retains the original border space`, () => {
      render(mode(field(false)));
      const input = screen.getByTestId("field");
      const box = owner(input);
      const borderWidth = box.style.borderWidth;
      expect(screen.queryByTestId("text-entry-state-border")).toBeNull();
      act(() => input.focus());
      const outline = screen.getByTestId("text-entry-state-border");
      const outlineStyle = getComputedStyle(outline);
      expect(outline.parentElement).toBe(box);
      expect(box.lastElementChild).toBe(outline);
      expect(outlineStyle.position).toBe("absolute");
      expect(outlineStyle.zIndex).toBe("1");
      expect(outlineStyle.pointerEvents).toBe("none");
      expect([outlineStyle.top, outlineStyle.right, outlineStyle.bottom, outlineStyle.left]).toEqual(["0px", "0px", "0px", "0px"]);
      expect(outline.getAttribute("aria-hidden")).toBe("true");
      expect(outline.style.borderColor).not.toBe("");
      expect(outline.style.borderColor).not.toContain("0.00");
      expect(outline.style.borderWidth).toBe(borderWidth);
      expect(box.style.borderWidth).toBe(borderWidth);
      expect(box.style.borderColor).toContain("0.00");
      expect(materials(box)).toHaveLength(1);
      expect(screen.getByTestId("field")).toBe(input);
      expect(document.activeElement).toBe(input);
    });

    for (const appearance of ["solid", "native"] as const) {
      it(`${name} keeps the ${appearance} active border on its original owner`, () => {
        render(mode(field(appearance === "native"), appearance === "native"));
        const input = screen.getByTestId("field");
        act(() => input.focus());
        expect(screen.queryByTestId("text-entry-state-border")).toBeNull();
        expect(owner(input).style.borderColor).not.toBe("");
        expect(owner(input).style.borderColor).not.toContain("0.00");
        expect(document.activeElement).toBe(input);
      });
    }
  }

  it("keeps an error outline in the foreground while focus changes", () => {
    render(mode(<Input prefix="$" error testID="field" />));
    const input = screen.getByTestId("field");
    const box = input.parentElement!.parentElement!;
    const errorColor = screen.getByTestId("text-entry-state-border").style.borderColor;
    expect(input.getAttribute("aria-invalid")).toBe("true");
    act(() => input.focus());
    expect(screen.getByTestId("text-entry-state-border").style.borderColor).toBe(errorColor);
    act(() => input.blur());
    expect(screen.getByTestId("text-entry-state-border").style.borderColor).toBe(errorColor);
    expect(box.style.borderColor).toContain("0.00");
  });

  it("leaves a bare field's error border on its existing foreground editor", () => {
    render(mode(<Input error testID="field" />));
    const input = screen.getByTestId("field");
    expect(screen.queryByTestId("text-entry-state-border")).toBeNull();
    expect(input.style.borderColor).not.toBe("");
    expect(input.style.borderColor).not.toContain("0.00");
    expect(materials(input.parentElement!)).toHaveLength(1);
  });
});

describe("clear web text-entry material", () => {
  const fields: [string, ReactNode][] = [
    ["Input", <Input label="Name" />],
    ["Textarea", <Textarea label="Notes" showCount />],
    ["Autocomplete", <Autocomplete label="Person" options={["Ada", "Grace"]} />],
    ["InputOTP", <InputOTP length={6} groups={3} />],
    ["Stepper", <Stepper label="Quantity" />],
    ["PhoneInput", <PhoneInput label="Phone" />],
  ];

  for (const [name, field] of fields) {
    it(`${name} shares the clear material and returns to its solid skin`, () => {
      const result = render(mode(<View testID="field">{field}</View>));
      const painted = materials(screen.getByTestId("field"));
      expect(painted).toHaveLength(name === "InputOTP" ? 2 : 1);
      for (const material of painted) {
        // A clear field frosts nothing: its under-fill (the light neutral veil), then the
        // control layer's hairline rim in the palette's border colour, and no backdrop filter.
        const layers = [...material.children] as HTMLElement[];
        expect(layers).toHaveLength(2);
        expect(material.querySelector('[style*="backdrop-filter"]')).toBeNull();
        expect(rgbaOf(layers[0].style.backgroundColor)).toEqual(rgbaOf(clearSurfaceTint(lightColors, false)));
        expect(layers[1].style.boxShadow).toBe(`inset 0 0 0 ${WEB_FROST.rimWidth}px ${lightColors.border}`);
      }
      result.rerender(mode(<View testID="field">{field}</View>, false));
      expect(materials(screen.getByTestId("field"))).toHaveLength(0);
    });
  }

  it("retains clear material when disabled or read-only while preserving editor semantics", () => {
    render(mode(<>
      <Input disabled defaultValue="Disabled name" testID="disabled" />
      <Input readOnly defaultValue="Read-only name" testID="readonly" />
      <PhoneInput readOnly defaultValue="5551234567" testID="phone" />
    </>));
    for (const id of ["disabled", "readonly", "phone"]) {
      const input = screen.getByTestId(id) as HTMLInputElement;
      expect(input.readOnly).toBe(true);
      const owner = id === "phone" ? input.parentElement!.parentElement! : input.parentElement!;
      expect(materials(owner)).toHaveLength(1);
    }
    expect((screen.getByTestId("readonly") as HTMLInputElement).value).toBe("Read-only name");
    expect(screen.getByRole("button", { name: /^Country,/ }).hasAttribute("disabled")).toBe(true);
  });

  it("keeps the grouped editor identity, focus, selection and draft through material fallback", () => {
    const field = () => <Input label="Budget" prefix="$" defaultValue="initial" testID="draft" />;
    const result = render(mode(field()));
    const input = screen.getByTestId("draft") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Working draft" } });
    act(() => {
      input.focus();
      input.setSelectionRange(2, 7);
    });
    for (const state of [
      { glass: false, supported: true },
      { glass: true, supported: false },
      { glass: true, supported: true },
    ]) {
      available = state.supported;
      result.rerender(mode(field(), state.glass));
      expect(screen.getByTestId("draft")).toBe(input);
      expect(document.activeElement).toBe(input);
      expect(input.value).toBe("Working draft");
      expect([input.selectionStart, input.selectionEnd]).toEqual([2, 7]);
      expect(materials(input.parentElement!.parentElement!)).toHaveLength(state.glass && state.supported ? 1 : 0);
      expect(screen.queryByTestId("text-entry-state-border") !== null).toBe(state.glass && state.supported);
    }
  });

  for (const [appearance, Field] of [["web", Textarea], ["Android", TextareaAndroid]] as const) {
    it(`keeps ${appearance} flush textarea corners square and its count outside the material owner`, () => {
      render(mode(<Field flush label="Reply" showCount defaultValue="hello" testID="reply" />));
      const input = screen.getByTestId("reply");
      const owner = input.parentElement!;
      expect(materials(owner)).toHaveLength(1);
      const pane = owner.firstElementChild as HTMLElement;
      for (const node of [input, pane]) {
        expect(node.style.borderRadius).toBe("0px");
        expect(node.style.borderTopLeftRadius).toBe("0px");
        expect(node.style.borderTopRightRadius).toBe("0px");
        expect(node.style.borderBottomLeftRadius).toBe("0px");
        expect(node.style.borderBottomRightRadius).toBe("0px");
      }
      expect(owner.contains(screen.getByText("5"))).toBe(false);
    });
  }

  for (const reducedMotion of [false, true]) {
    it(`keeps the clear material without custom press feedback with Reduce Motion ${reducedMotion ? "on" : "off"}`, async () => {
      const reduced = spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(reducedMotion);
      restores.push(() => reduced.mockRestore());
      render(mode(<Input label="Name" testID="name" />));
      await act(async () => {});
      const input = screen.getByTestId("name");
      const owner = input.parentElement!;
      const before = owner.innerHTML;
      const pointer = { button: 0, clientX: 25, clientY: 15 };
      fireEvent.mouseDown(input, { ...pointer, buttons: 1 });
      try {
        expect(owner.innerHTML).toBe(before);
      } finally {
        // React's selection plugin tracks mouse state across roots and tests.
        fireEvent.mouseUp(input, { ...pointer, buttons: 0 });
        fireEvent.click(input, pointer);
      }
      const touch = { identifier: 1, pageX: 25, pageY: 15, clientX: 25, clientY: 15, target: input };
      fireEvent.touchStart(input, { touches: [touch], changedTouches: [touch] });
      try {
        expect(owner.innerHTML).toBe(before);
      } finally {
        fireEvent.touchEnd(input, { touches: [], changedTouches: [touch] });
        // Complete the browser's compatibility mouse sequence. RNW suppresses
        // mouse starts after a touch until this mouseup ends that sequence.
        fireEvent.mouseDown(input, { ...pointer, buttons: 1 });
        fireEvent.mouseUp(input, { ...pointer, buttons: 0 });
        fireEvent.click(input, pointer);
      }
      expect(owner.innerHTML).toBe(before);
      expect(materials(owner)).toHaveLength(1);
    });
  }
});
