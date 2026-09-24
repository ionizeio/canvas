import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { platformDisabledDim } from "../src/style/ripple.ts";
import { Text } from "react-native";
import { Button } from "../src/atoms/button/button.tsx";
import { Button as IOSButton } from "../src/atoms/button/button.ios.tsx";
import { Button as AndroidButton } from "../src/atoms/button/button.android.tsx";
import { Select } from "../src/atoms/select/select.tsx";
import { Select as IOSSelect } from "../src/atoms/select/select.ios.tsx";
import { Select as AndroidSelect } from "../src/atoms/select/select.android.tsx";
import { Chip } from "../src/atoms/chip/chip.tsx";
import { Chip as IOSChip } from "../src/atoms/chip/chip.ios.tsx";
import { Chip as AndroidChip } from "../src/atoms/chip/chip.android.tsx";
import { AvatarMenu } from "../src/atoms/avatar/avatar.tsx";
import { AvatarMenu as IOSAvatarMenu } from "../src/atoms/avatar/avatar.ios.tsx";
import { AvatarMenu as AndroidAvatarMenu } from "../src/atoms/avatar/avatar.android.tsx";
import { Dropdown } from "../src/atoms/dropdown/dropdown.tsx";
import { Stepper as AndroidStepper } from "../src/atoms/stepper/stepper.android.tsx";
import { GlassSurface } from "../src/style/glass-surface/glass-surface.tsx";
import { ThemeProvider } from "../src/style/theme.tsx";
import { lightColors } from "../src/style/tokens.ts";

afterEach(cleanup);

// `buttonDisabled` is the Button's own dim: null on the web, whose disabled Button is Dark
// Factory's look (a transparent pill, a hairline, a muted label) rather than a fade.
const platforms = [
  { name: "web", Button, Select, Chip, AvatarMenu, disabled: 0.5, buttonDisabled: null, selectDisabled: 0.5, pressed: 0.9, selectPressed: 0.9 },
  { name: "iOS", Button: IOSButton, Select: IOSSelect, Chip: IOSChip, AvatarMenu: IOSAvatarMenu, disabled: 0.4, buttonDisabled: 0.4, selectDisabled: 0.4, pressed: 0.8, selectPressed: 0.8 },
  { name: "Android", Button: AndroidButton, Select: AndroidSelect, Chip: AndroidChip, AvatarMenu: AndroidAvatarMenu, disabled: 0.38, buttonDisabled: 0.38, selectDisabled: 0.38, pressed: null, selectPressed: null },
] as const;

// The web's disabled Button: no dim anywhere above its label, the muted ink instead.
function expectWebDisabledLook(label: HTMLElement) {
  for (let node: HTMLElement | null = label; node && node.getAttribute("role") !== "button"; node = node.parentElement) {
    expect(node.style.opacity === "" || Number(node.style.opacity) === 1).toBe(true);
  }
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(lightColors["muted-foreground"].slice(i, i + 2), 16));
  expect(label.style.color.replace(/\s/g, "")).toBe(`rgba(${r},${g},${b},1.00)`);
}

function expectMaterialAncestorsOpaque(root: HTMLElement) {
  const layers = [...root.querySelectorAll<HTMLElement>('[style*="backdrop-filter"]')];
  expect(layers.length).toBeGreaterThan(0);
  for (const layer of layers) {
    for (let node = layer.parentElement; node; node = node.parentElement) {
      expect(node.style.opacity === "" || Number(node.style.opacity) === 1).toBe(true);
      if (node === root) break;
    }
  }
}
const press = (node: HTMLElement) => fireEvent.mouseDown(node, { button: 0, buttons: 1, clientX: 1, clientY: 1 });
const release = (node: HTMLElement) => fireEvent.mouseUp(node, { button: 0, buttons: 0, clientX: 1, clientY: 1 });

describe("liquid control foreground feedback", () => {
  for (const p of platforms) {
    it(`${p.name} dims disabled ink while every material ancestor remains opaque`, () => {
      let calls = 0;
      const { container } = render(<ThemeProvider glass>
        <p.Button disabled onPress={() => calls++}>Save</p.Button>
        <p.Select disabled options={["North", "South"]} defaultValue="North" label="Region" />
        <p.Chip disabled selectable onSelectedChange={() => calls++}>Filter</p.Chip>
        <p.Chip disabled selectable onRemove={() => calls++}>Removable</p.Chip>
        <p.AvatarMenu disabled name="Rachel Chen" email="rachel@example.com" items={[]} onOpenChange={() => calls++} />
      </ThemeProvider>);
      expectMaterialAncestorsOpaque(container);
      if (p.buttonDisabled == null) expectWebDisabledLook(screen.getByText("Save"));
      else expect(Number(screen.getByText("Save").parentElement!.style.opacity)).toBe(p.buttonDisabled);
      expect(Number(screen.getByText("North").parentElement!.style.opacity)).toBe(p.selectDisabled);
      expect(Number(screen.getByText("Filter").parentElement!.style.opacity)).toBe(0.5);
      expect(Number(screen.getByText("Removable").parentElement!.style.opacity)).toBe(0.5);
      // The identity pill is one skin on every platform, evaluated here in the web
      // bundle; each native bundle resolves its own dim (platformDisabledDim).
      expect(Number(screen.getByText("Rachel Chen").parentElement!.style.opacity)).toBe(platformDisabledDim("web"));
      for (const button of screen.getAllByRole("button")) fireEvent.click(button);
      expect(calls).toBe(0);
    });

    it(`${p.name} keeps its original solid disabled surface dim`, () => {
      render(<ThemeProvider solid><p.Button disabled>Save</p.Button><p.Select disabled options={["North"]} defaultValue="North" label="Region" /></ThemeProvider>);
      if (p.buttonDisabled == null) {
        expect(screen.getByRole("button", { name: "Save" }).style.opacity).toBe("");
        expectWebDisabledLook(screen.getByText("Save"));
      } else expect(Number(screen.getByRole("button", { name: "Save" }).style.opacity)).toBe(p.buttonDisabled);
      expect(Number(screen.getByRole("button", { name: "Region" }).style.opacity)).toBe(p.selectDisabled);
    });

    if (p.pressed !== null) it(`${p.name} keeps actual press feedback on the label instead of the native material`, async () => {
      const { container } = render(<ThemeProvider glass><p.Button>Save</p.Button><p.Select options={["North"]} defaultValue="North" label="Region" /><p.Chip selectable>Filter</p.Chip></ThemeProvider>);
      for (const [name, text, opacity] of [["Save", "Save", p.pressed], ["Region", "North", p.selectPressed], ["Filter", "Filter", 0.85]] as const) {
        const host = screen.getByRole("button", { name });
        press(host);
        await waitFor(() => expect(Number(screen.getByText(text).parentElement!.style.opacity)).toBe(opacity));
        expectMaterialAncestorsOpaque(container);
        release(host);
      }
    });
  }

  it("does not fade an arbitrary custom Dropdown subtree containing material", () => {
    const { container } = render(<ThemeProvider glass><Dropdown disabled triggerLabel="Custom actions" items={[]}>
      <GlassSurface style={{ backgroundColor: "white", borderRadius: 12 }}><Text>Custom foreground</Text></GlassSurface>
    </Dropdown></ThemeProvider>);
    expectMaterialAncestorsOpaque(container);
    const host = screen.getByRole("button", { name: "Custom actions" });
    expect(host.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(host);
    expect(host.getAttribute("aria-expanded")).toBe("false");
  });

  it("keeps disabled detached Stepper materials outside label and value dimming", () => {
    const { container } = render(<ThemeProvider glass><AndroidStepper disabled label="Quantity" description="Items" defaultValue={4} /></ThemeProvider>);
    expectMaterialAncestorsOpaque(container);
    expect(screen.getByText("Quantity").style.opacity).toBe("0.5");
    expect(screen.getByDisplayValue("4").style.opacity).toBe("0.5");
    expect(screen.getByRole("button", { name: "Increase" }).getAttribute("aria-disabled")).toBe("true");
  });

  it("retains foreground state and keyboard focus when material appearance changes", () => {
    let mounts = 0;
    function StatefulGlyph() {
      const [identity] = useState(() => ++mounts);
      return <Text testID="glyph">{identity}</Text>;
    }
    const tree = (glass: boolean) => <ThemeProvider glass={glass} solid={!glass}>
      <Button iconLeft={<StatefulGlyph />} accessibilityLabel="Save action">Save</Button>
      <Select label="Region" options={["North"]} defaultValue="North" />
      <Chip selectable>Filter</Chip>
    </ThemeProvider>;
    const { rerender } = render(tree(true));
    const host = screen.getByRole("button", { name: "Save action" });
    host.focus();
    const glyph = screen.getByTestId("glyph");
    const value = screen.getByText("North");
    const label = screen.getByText("Filter");
    for (const glass of [false, true]) {
      rerender(tree(glass));
      expect(document.activeElement).toBe(host);
      expect(screen.getByTestId("glyph")).toBe(glyph);
      expect(screen.getByText("North")).toBe(value);
      expect(screen.getByText("Filter")).toBe(label);
      expect(mounts).toBe(1);
    }
  });
});
