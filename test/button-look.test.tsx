import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "../src/style/theme.tsx";
import { lightColors } from "../src/style/tokens.ts";
import { actionFill, actionInk } from "../src/style/action.ts";
import { primaryText } from "../src/style/primary-text.ts";
import { Button } from "../src/atoms/button/button.tsx";
import { Button as IOSButton } from "../src/atoms/button/button.ios.tsx";
import { Button as AndroidButton } from "../src/atoms/button/button.android.tsx";
import { webSkin, type Intent, type Size } from "../src/atoms/button/button.styles.ts";

// The web Button is Dark Factory's pill button (SKN-4a): every intent a pill with a 1px
// border (none on the link), bold labels, the call to action in 800 with DF's 0.01em
// tracking, `secondary` DF's violet outline, `outline` DF's hairline ghost, an instant hover
// wash behind the outline looks, and DF's disabled look in place of a fade. `raised` is DF's
// resting glow under a primary. The iOS and Android skins keep their platform buttons.

afterEach(cleanup);

const t = lightColors;
const opts = (disabled = false) => ({ icon: false, block: false, dim: disabled, disabled });
const look = (intent: Intent, size: Size = "base", disabled = false) => ({
  box: webSkin.container(t, intent, size, opts(disabled)),
  label: webSkin.label(t, intent, size, opts(disabled)),
});

describe("the web Button is Dark Factory's pill", () => {
  it("draws each intent in DF's colours", () => {
    const expected: Record<Intent, { fill: string; border: string; label: string }> = {
      primary: { fill: actionFill(t), border: actionFill(t), label: actionInk(t) },
      destructive: { fill: t.destructive, border: t.destructive, label: t["destructive-foreground"] },
      secondary: { fill: "transparent", border: t.ring, label: primaryText(t) },
      outline: { fill: "transparent", border: t.border, label: t.foreground },
      ghost: { fill: "transparent", border: "transparent", label: t.foreground },
      link: { fill: "transparent", border: "transparent", label: primaryText(t) },
    };
    for (const [intent, colours] of Object.entries(expected) as [Intent, (typeof expected)[Intent]][]) {
      const { box, label } = look(intent);
      expect({ fill: box.backgroundColor, border: box.borderColor, label: label.color }, intent).toEqual(colours);
      expect(box.borderRadius, intent).toBe(9999);
      expect(box.borderWidth, intent).toBe(intent === "link" ? 0 : 1);
      expect(label.textDecorationLine, intent).toBeUndefined();
    }
  });

  it("sets the call to action in 800 with DF's tracking, the violet outline in 800 from base up, and the rest in 700", () => {
    expect(look("primary").label).toMatchObject({ fontWeight: "800", letterSpacing: 0.12 });
    expect(look("destructive").label).toMatchObject({ fontWeight: "800", letterSpacing: 0.12 });
    expect(look("secondary").label.fontWeight).toBe("800");
    expect(look("secondary", "small").label.fontWeight).toBe("700");
    for (const intent of ["outline", "ghost", "link"] as const) {
      expect(look(intent).label.fontWeight, intent).toBe("700");
      expect(look(intent).label.letterSpacing, intent).toBeUndefined();
    }
  });

  it("is DF's 29 and 36 tall at small and base (40 at large), the call to action two wider", () => {
    const height = (size: Size) => {
      const { box, label } = look("outline", size);
      return 2 * (box.paddingVertical as number) + (label.lineHeight as number) + 2;
    };
    expect([height("small"), height("base"), height("large")]).toEqual([29, 36, 40]);
    expect(look("primary").box.paddingHorizontal).toBe(18);
    expect(look("outline").box.paddingHorizontal).toBe(16);
    expect(look("link").box).toMatchObject({ paddingVertical: 0, paddingHorizontal: 0 });
  });

  it("shows DF's disabled look rather than a fade: transparent, a hairline, a muted 700 label", () => {
    for (const intent of ["primary", "destructive", "secondary", "outline"] as const) {
      const { box, label } = look(intent, "base", true);
      expect({ fill: box.backgroundColor, border: box.borderColor, label: label.color, weight: label.fontWeight }, intent)
        .toEqual({ fill: "transparent", border: t.border, label: t["muted-foreground"], weight: "700" });
      expect(box.opacity, intent).toBeUndefined();
    }
    expect(look("ghost", "base", true).box.borderColor).toBe("transparent");
  });

  it("washes the outline looks at once on hover, dims the link, and never while disabled", () => {
    render(
      <ThemeProvider light solid>
        <Button secondary onPress={() => {}}>Review</Button>
        <Button outline onPress={() => {}}>Details</Button>
        <Button ghost onPress={() => {}}>Cancel</Button>
        <Button link onPress={() => {}}>Learn more</Button>
        <Button outline disabled onPress={() => {}}>Pending</Button>
      </ThemeProvider>,
    );
    const hoverFill = /rgba\(123,\s*108,\s*240,\s*0\.08\)/;
    for (const name of ["Review", "Details", "Cancel"]) {
      const button = screen.getByRole("button", { name });
      expect(button.style.getPropertyValue("transition-property"), name).toBe("");
      fireEvent.pointerEnter(button, { pointerType: "mouse" });
      expect(button.style.backgroundColor, name).toMatch(hoverFill);
      fireEvent.pointerLeave(button);
      expect(button.style.backgroundColor, name).not.toMatch(hoverFill);
    }
    const link = screen.getByRole("button", { name: "Learn more" });
    fireEvent.pointerEnter(link, { pointerType: "mouse" });
    expect(link.style.opacity).toBe("0.9");
    const disabled = screen.getByRole("button", { name: "Pending" });
    fireEvent.pointerEnter(disabled, { pointerType: "mouse" });
    expect(disabled.style.backgroundColor).not.toMatch(hoverFill);
  });
});

describe("a raised Button rests on DF's glow", () => {
  it("glows under a primary in the action colour on every platform, and nowhere else", () => {
    render(
      <ThemeProvider light solid>
        <Button primary raised onPress={() => {}}>Web</Button>
        <IOSButton primary raised onPress={() => {}}>iOS</IOSButton>
        <AndroidButton primary raised onPress={() => {}}>Android</AndroidButton>
        <Button primary raised small onPress={() => {}}>Small</Button>
        <Button secondary raised onPress={() => {}}>Secondary</Button>
        <Button primary raised disabled onPress={() => {}}>Disabled</Button>
        <Button primary onPress={() => {}}>Plain</Button>
      </ThemeProvider>,
    );
    const glow = (name: string) => screen.getByRole("button", { name }).style.boxShadow;
    for (const name of ["Web", "iOS"]) expect(glow(name), name).toMatch(/12px 22px -10px/);
    // Android clips its ripple to the pill on the wrapper, which would cut a glow drawn
    // outside the button, so there the glow rests on the wrapper itself.
    const android = screen.getByRole("button", { name: "Android" });
    expect(android.style.boxShadow).toBe("");
    expect(android.parentElement!.style.boxShadow).toMatch(/12px 22px -10px/);
    expect(glow("Small")).toMatch(/10px 20px -10px/);
    for (const name of ["Secondary", "Disabled", "Plain"]) expect(glow(name), name).toBe("");
  });
});
