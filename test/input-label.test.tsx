import { describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import { ThemeProvider } from "../src/style/theme.tsx";
import { Input as InputWeb } from "../src/atoms/input/input.tsx";
import { Input as InputIOS } from "../src/atoms/input/input.ios.tsx";
import { Input as InputAndroid } from "../src/atoms/input/input.android.tsx";

// The Input `label` prop (Phase A). iOS + web render the label ABOVE the field;
// the Android skin floats it inside the M3 container. Across every skin the label
// is the field's programmatic NAME (aria-labelledby -> the label's nativeID, plus
// accessibilityLabel/aria-label), so getByLabelText resolves the DOM input by the
// label text — the same WCAG-4.1.2 contract the composers relied on, now owned by
// Input itself. The docs/web bundler renders every skin through react-native-web,
// so all three are assertable at the DOM here.

afterEach(cleanup);
const ui = (n: ReactNode) => render(<ThemeProvider>{n}</ThemeProvider>);

const SKINS = [
  ["web", InputWeb],
  ["ios", InputIOS],
  ["android", InputAndroid],
] as const;

describe("Input label: names the field on every skin", () => {
  for (const [plat, Input] of SKINS) {
    it(`${plat}: the visible label is the control's accessible name`, () => {
      ui(<Input label="Email" placeholder="ada@acme.dev" />);
      const field = screen.getByLabelText("Email");
      expect(field.tagName.toLowerCase()).toBe("input");
      // The name is wired through aria-labelledby (a nativeID link), not only aria-label.
      expect(field.getAttribute("aria-labelledby")).toBeTruthy();
    });
  }

  it("a caller-supplied aria-labelledby still wins over the self-wired id", () => {
    ui(
      <>
        <InputWeb label="Ignored" aria-labelledby="ext" placeholder="bare" />
        <span id="ext">External name</span>
      </>,
    );
    expect(screen.getByLabelText("External name")).toBe(screen.getByPlaceholderText("bare"));
  });
});

describe("Input label: the required star never pollutes the accessible name", () => {
  for (const [plat, Input] of SKINS) {
    it(`${plat}: required marks aria-required but the name stays the bare label`, () => {
      ui(<Input label="Email" required placeholder="ada@acme.dev" />);
      // getByLabelText is exact: it only resolves if the name is "Email", not "Email *".
      const field = screen.getByLabelText("Email");
      expect(field.getAttribute("aria-required")).toBe("true");
    });
  }

  it("omits aria-required entirely when the field is optional", () => {
    ui(<InputWeb label="Email" placeholder="ada@acme.dev" />);
    expect(screen.getByLabelText("Email").getAttribute("aria-required")).toBeNull();
  });
});

describe("Input label: descriptions and validation still forward", () => {
  it("keeps aria-describedby alongside the self-wired label", () => {
    ui(
      <>
        <InputWeb label="Email" aria-describedby="hint" placeholder="ada@acme.dev" />
        <span id="hint">We never share it.</span>
      </>,
    );
    expect(screen.getByLabelText("Email").getAttribute("aria-describedby")).toBe("hint");
  });

  it("flags aria-invalid when error is set", () => {
    ui(<InputAndroid label="Email" error placeholder="ada@acme.dev" />);
    expect(screen.getByLabelText("Email").getAttribute("aria-invalid")).toBe("true");
  });
});

describe("Input label: above-rendering (iOS / web) shows the label as static text", () => {
  for (const [plat, Input] of [["web", InputWeb], ["ios", InputIOS]] as const) {
    it(`${plat}: the placeholder is shown at rest (label is not the placeholder)`, () => {
      ui(<Input label="Email" placeholder="ada@acme.dev" />);
      // Above-rendering keeps the placeholder visible immediately (unlike the
      // floating skin, which gates it to focus).
      expect(screen.getByPlaceholderText("ada@acme.dev")).toBe(screen.getByLabelText("Email"));
    });
  }

  it("web: a labeled field's wrapper is FILL (the parent provides the bounds)", () => {
    const { container } = ui(<InputWeb label="Email" placeholder="ada@acme.dev" />);
    const input = container.querySelector("input") as HTMLElement;
    // The field fills the wrapper; the wrapper carries the fill nature.
    expect(input.style.width).toBe("100%");
    let wrap: HTMLElement | null = input.parentElement;
    while (wrap && wrap.style.flexShrink !== "1") wrap = wrap.parentElement;
    expect(wrap?.style.width).toBe("100%");
    expect(wrap?.style.minWidth).toBe("0px");
    expect(wrap?.style.maxWidth).toBe("");
  });
});

describe("Input label: Android floating label gates the placeholder to focus", () => {
  it("hides the placeholder at rest and reveals it on focus (M3)", () => {
    const { container } = ui(<InputAndroid label="Email" placeholder="ada@acme.dev" />);
    const input = container.querySelector("input") as HTMLInputElement;
    // At rest the floating label IS the placeholder, so no placeholder attribute.
    expect(input.getAttribute("placeholder")).toBeNull();
    fireEvent.focus(input);
    expect(input.getAttribute("placeholder")).toBe("ada@acme.dev");
  });

  it("a prefilled field seeds populated (the label starts floated, no crash)", () => {
    // The seed reads value ?? defaultValue; the field renders without throwing and
    // is still named by its label.
    ui(<InputAndroid label="Email" defaultValue="ada@acme.dev" />);
    expect(screen.getByLabelText("Email")).not.toBeNull();
  });
});

describe("Input: the no-label path is unchanged (bare root)", () => {
  it("emits no label link when `label` is omitted", () => {
    const { container } = ui(<InputWeb placeholder="Email" />);
    const input = container.querySelector("input") as HTMLElement;
    expect(input.getAttribute("aria-labelledby")).toBeNull();
    // Still a bare FILL field: width 100% of the parent, no cap of its own.
    expect(input.style.width).toBe("100%");
    expect(input.style.maxWidth).toBe("");
  });
});
