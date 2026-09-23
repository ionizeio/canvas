import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { ThemeProvider } from "../src/style/theme.tsx";
import { Button } from "../src/atoms/button/button.tsx";
import { ButtonGroup } from "../src/atoms/button-group/button-group.tsx";
import { Badge } from "../src/atoms/badge/badge.tsx";
import { Chip } from "../src/atoms/chip/chip.tsx";
import { Checkbox } from "../src/atoms/checkbox/checkbox.tsx";
import { Input } from "../src/atoms/input/input.tsx";
import { Input as InputIOS } from "../src/atoms/input/input.ios.tsx";
import { Input as InputAndroid } from "../src/atoms/input/input.android.tsx";
import { Textarea } from "../src/atoms/textarea/textarea.tsx";
import { Kbd } from "../src/atoms/kbd/kbd.tsx";
import { Radio } from "../src/atoms/radio/radio.tsx";
import { Switch } from "../src/atoms/switch/switch.tsx";
import { Progress } from "../src/atoms/progress/progress.tsx";
import * as WebIdentity from "../src/atoms/avatar/avatar.tsx";
import * as IOSIdentity from "../src/atoms/avatar/avatar.ios.tsx";
import * as AndroidIdentity from "../src/atoms/avatar/avatar.android.tsx";
import { Emblem } from "../src/atoms/emblem/emblem.tsx";
import * as materialRuntime from "../src/style/glass-surface/material-runtime.ts";
import { WEB_FROST } from "../src/style/glass-surface/web-frost.ts";

const restores: Array<() => void> = [];

afterEach(() => {
  cleanup();
  restores.splice(0).reverse().forEach((restore) => restore());
});

// The browser's one material question: does it render a CSS backdrop filter? The web's
// only material is the frost, so a browser that answers no gets every solid skin.
function browser({ frost }: { frost: boolean }) {
  const css = Object.getOwnPropertyDescriptor(globalThis, "CSS");
  Object.defineProperty(globalThis, "CSS", { configurable: true, value: { supports: () => frost } });
  restores.push(() => {
    if (css) Object.defineProperty(globalThis, "CSS", css);
    else delete (globalThis as unknown as Record<string, unknown>).CSS;
  });
}

// A platform that renders Liquid Glass but no frost: iOS 26 with expo-glass-effect and
// without expo-blur. Only there do the two roles render differently: a surface that
// asks for the liquid material keeps it while a static one falls to its solid skin. The
// web never reports liquid (its one material is the frost), so the capability hook is
// stubbed; the shells that choose each role are shared by every skin, so the web host
// shows which surfaces asked for which.
function liquidWithoutFrost() {
  const spy = spyOn(materialRuntime, "useMaterialCapabilities").mockImplementation(
    () => ({ platform: "ios", frost: false, liquid: true, requiresTarget: false }),
  );
  restores.push(() => spy.mockRestore());
}

// The material GlassBox paints behind a surface, found by its wrapper so a clear surface
// (which frosts nothing) counts too, and the frost layer inside one, if it has any.
const materials = (root: ParentNode) => [...root.querySelectorAll<HTMLElement>('[data-testid="glass-material"]')];
const frostOf = (material: HTMLElement) => material.querySelector<HTMLElement>('[style*="backdrop-filter"]');
const mode = (children: ReactNode, glass: boolean) => <ThemeProvider light glass={glass} solid={!glass}>{children}</ThemeProvider>;

describe("atom surface roles and capability fallback", () => {
  it("uses liquid for web fields while native wells and metadata remain solid when frost is unavailable", () => {
    liquidWithoutFrost();
    render(mode(<>
      <Input label="Name" testID="name" />
      <InputIOS label="iOS name" testID="ios-name" />
      <InputAndroid label="Android name" testID="android-name" />
      <Badge testID="badge">Member</Badge>
      <Checkbox testID="check" defaultChecked>Consent</Checkbox>
      <Button primary testID="action">Save</Button>
    </>, true));
    expect(materials(screen.getByTestId("name").parentElement!)).toHaveLength(1);
    for (const id of ["ios-name", "android-name"]) {
      expect(materials(screen.getByTestId(id).parentElement!)).toHaveLength(0);
      expect(screen.getByTestId(id).style.backgroundColor).not.toContain("0.00");
    }
    expect(materials(screen.getByTestId("badge"))).toHaveLength(0);
    expect(materials(screen.getByTestId("check"))).toHaveLength(0);
    expect(materials(screen.getByTestId("action"))).toHaveLength(1);
    expect(screen.getByTestId("badge").style.backgroundColor).not.toBe("");
  });

  it("keeps web fields clear and native appearance wells frosted where the browser renders the frost", () => {
    browser({ frost: true });
    render(mode(<>
      <Input label="Name" testID="name" />
      <InputIOS label="iOS name" testID="ios-name" />
      <InputAndroid label="Android name" testID="android-name" />
    </>, true));
    const material = (id: string) => {
      const painted = materials(screen.getByTestId(id).parentElement!);
      expect(painted).toHaveLength(1);
      return painted[0];
    };
    // The web field is clear: its material frosts nothing at all.
    expect(frostOf(material("name"))).toBeNull();
    // The native wells are static frost: Dark Factory's one blur, with no saturation shift.
    for (const id of ["ios-name", "android-name"]) expect(frostOf(material(id))?.style.backdropFilter).toBe(`blur(${WEB_FROST.blur}px)`);
  });

  it("preserves complete solid fill and boundaries when no material can render", () => {
    browser({ frost: false });
    const children = <>
      <Button destructive testID="button">Delete</Button>
      <Badge testID="badge">Member</Badge>
      <Chip blue testID="chip">Design</Chip>
      <Kbd testID="kbd">K</Kbd>
      <Input error label="Email" testID="input" />
      <Radio card checked testID="radio">Annual</Radio>
      <Switch defaultChecked>Enabled</Switch>
      <Progress value={40} testID="progress" />
    </>;
    const result = render(mode(children, true));
    const snapshot = () => {
      const nodes = ["button", "badge", "chip", "kbd", "input", "radio", "progress"].map((id) => screen.getByTestId(id));
      nodes.push(screen.getByRole("switch").lastElementChild as HTMLElement);
      return nodes.map((node) => [node.style.backgroundColor, node.style.borderColor, node.style.borderWidth]);
    };
    const fallback = snapshot();
    expect(materials(result.container)).toHaveLength(0);
    expect(fallback.every(([fill]) => fill !== "" && !fill.includes("0.00"))).toBe(true);
    result.rerender(mode(children, false));
    expect(snapshot()).toEqual(fallback);
  });

  it("keeps outline metadata unfilled while selected outline chips gain their selected surface", () => {
    browser({ frost: true });
    render(mode(<>
      <Badge outline testID="badge">Version</Badge>
      <Chip outline testID="chip">Topic</Chip>
      <Chip outline selectable testID="filter">Selected topic</Chip>
    </>, true));
    for (const id of ["badge", "chip", "filter"]) {
      expect(materials(screen.getByTestId(id))).toHaveLength(0);
      expect(screen.getByTestId(id).style.borderColor).not.toContain("0.00");
    }
    fireEvent.click(screen.getByTestId("filter"));
    expect(screen.getByTestId("filter").getAttribute("aria-pressed")).toBe("true");
    expect(materials(screen.getByTestId("filter"))).toHaveLength(1);
  });

  it("does not make removable metadata liquid solely because it has a remove action", () => {
    liquidWithoutFrost();
    render(mode(<>
      <Chip testID="metadata" onRemove={() => {}}>Design</Chip>
      <Chip testID="action" selectable>Filter</Chip>
    </>, true));
    expect(materials(screen.getByTestId("metadata"))).toHaveLength(0);
    expect(materials(screen.getByTestId("action"))).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Remove Design" })).toBeDefined();
  });
});

describe("identity material ownership", () => {
  for (const [platform, { Avatar, AvatarGroup, AvatarMenu }] of [["web", WebIdentity], ["ios", IOSIdentity], ["android", AndroidIdentity]] as const) {
    it(`${platform} keeps identity static and reserves liquid material for the account capsule`, () => {
      liquidWithoutFrost();
      render(mode(<>
        <Avatar name="Rachel Chen" onPress={() => {}} testID="identity" />
        <AvatarGroup max={0} total={4} testID="group" />
        <Emblem primary label="RC" testID="emblem" />
        <AvatarMenu name="Rachel Chen" items={[{ label: "Settings" }]} testID="account" />
      </>, true));
      for (const id of ["identity", "group", "emblem"]) expect(materials(screen.getByTestId(id))).toHaveLength(0);
      expect(materials(screen.getByTestId("account"))).toHaveLength(1);
      expect(screen.getByTestId("identity").getAttribute("role")).toBe("button");
    });

    it(`${platform} paints static identity frost and leaves photo pixels untouched`, () => {
      browser({ frost: true });
      render(mode(<>
        <Avatar name="Rachel Chen" testID="identity" />
        <AvatarGroup max={0} total={4} testID="group" />
        <Emblem primary label="RC" testID="emblem" />
        <Avatar name="Photo" src="https://example.test/avatar.png" testID="photo" />
      </>, true));
      for (const id of ["identity", "group", "emblem"]) {
        const painted = materials(screen.getByTestId(id));
        expect(painted).toHaveLength(1);
        expect(frostOf(painted[0])?.style.backdropFilter).toBe(`blur(${WEB_FROST.blur}px)`);
      }
      expect(materials(screen.getByTestId("photo"))).toHaveLength(0);
      expect(screen.getByLabelText("Photo")).toBeDefined();
    });
  }
});

describe("live editing survives material mode changes", () => {
  it("keeps the focused segment and uncontrolled selection when material changes both ways", () => {
    browser({ frost: true });
    const control = <ButtonGroup items={["Day", "Week", "Month"]} />;
    const result = render(mode(control, false));
    fireEvent.click(screen.getByRole("tab", { name: "Week" }));
    const week = screen.getByRole("tab", { name: "Week" });
    act(() => week.focus());
    for (const glass of [true, false, true]) {
      result.rerender(mode(control, glass));
      expect(screen.getByRole("tab", { name: "Week" })).toBe(week);
      expect(document.activeElement).toBe(week);
      expect(week.getAttribute("aria-selected")).toBe("true");
    }
  });
  for (const kind of ["input", "textarea"] as const) {
    for (const labeled of [false, true]) {
      it(`${kind} keeps its host, focus, value and selection in both directions${labeled ? " with a label" : ""}`, () => {
        browser({ frost: true });
        const props = { label: labeled ? "Draft" : undefined, accessibilityLabel: "Draft", defaultValue: "initial", testID: "draft" };
        const field = kind === "input" ? <Input {...props} /> : <Textarea {...props} showCount />;
        const result = render(mode(field, false));
        const host = screen.getByTestId("draft") as HTMLInputElement | HTMLTextAreaElement;
        fireEvent.change(host, { target: { value: "Working draft" } });
        act(() => {
          host.focus();
          host.setSelectionRange(2, 7);
        });
        for (const glass of [true, false, true]) {
          result.rerender(mode(field, glass));
          expect(screen.getByTestId("draft")).toBe(host);
          expect(document.activeElement).toBe(host);
          expect(host.value).toBe("Working draft");
          expect([host.selectionStart, host.selectionEnd]).toEqual([2, 7]);
          expect(materials(host.parentElement!).length).toBe(glass ? 1 : 0);
        }
      });
    }
  }
});
