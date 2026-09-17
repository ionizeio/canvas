import { afterEach, describe, expect, it } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { ThemeProvider } from "../src/style/theme.tsx";
import { Button } from "../src/atoms/button/button.tsx";
import { ButtonGroup } from "../src/atoms/button-group/button-group.tsx";
import { Badge } from "../src/atoms/badge/badge.tsx";
import { Chip } from "../src/atoms/chip/chip.tsx";
import { Checkbox } from "../src/atoms/checkbox/checkbox.tsx";
import { Input } from "../src/atoms/input/input.tsx";
import { Textarea } from "../src/atoms/textarea/textarea.tsx";
import { Kbd } from "../src/atoms/kbd/kbd.tsx";
import { Radio } from "../src/atoms/radio/radio.tsx";
import { Switch } from "../src/atoms/switch/switch.tsx";
import { Progress } from "../src/atoms/progress/progress.tsx";
import * as WebIdentity from "../src/atoms/avatar/avatar.tsx";
import * as IOSIdentity from "../src/atoms/avatar/avatar.ios.tsx";
import * as AndroidIdentity from "../src/atoms/avatar/avatar.android.tsx";
import { Emblem } from "../src/atoms/emblem/emblem.tsx";

const CHROME = "Mozilla/5.0 Chrome/126.0.0.0 Safari/537.36";
const SAFARI = "Mozilla/5.0 Version/18.0 Safari/605.1.15";
const restores: Array<() => void> = [];

afterEach(() => {
  cleanup();
  restores.splice(0).reverse().forEach((restore) => restore());
});

function capabilities({ lens, frost }: { lens: boolean; frost: boolean }) {
  const descriptor = Object.getOwnPropertyDescriptor(window.navigator, "userAgent");
  Object.defineProperty(window.navigator, "userAgent", { configurable: true, value: lens ? CHROME : SAFARI });
  const css = Object.getOwnPropertyDescriptor(globalThis, "CSS");
  Object.defineProperty(globalThis, "CSS", {
    configurable: true,
    value: { supports: (_property: string, value: string) => value.startsWith("url(") ? lens : frost },
  });
  restores.push(() => {
    if (css) Object.defineProperty(globalThis, "CSS", css);
    if (descriptor) Object.defineProperty(window.navigator, "userAgent", descriptor);
    else delete (window.navigator as unknown as Record<string, unknown>).userAgent;
  });
}

const materials = (root: ParentNode) => [...root.querySelectorAll<HTMLElement>("[style]")]
  .filter((node) => node.style.backdropFilter);
const mode = (children: ReactNode, glass: boolean) => <ThemeProvider light glass={glass} solid={!glass}>{children}</ThemeProvider>;

describe("atom surface roles and capability fallback", () => {
  it("keeps editing wells and inline metadata solid when only liquid refraction is available", () => {
    capabilities({ lens: true, frost: false });
    render(mode(<>
      <Input label="Name" testID="name" />
      <Badge testID="badge">Member</Badge>
      <Checkbox testID="check" defaultChecked>Consent</Checkbox>
      <Button primary testID="action">Save</Button>
    </>, true));
    expect(materials(screen.getByTestId("name").parentElement!)).toHaveLength(0);
    expect(materials(screen.getByTestId("badge"))).toHaveLength(0);
    expect(materials(screen.getByTestId("check"))).toHaveLength(0);
    expect(materials(screen.getByTestId("action"))).toHaveLength(1);
    expect(screen.getByTestId("name").style.backgroundColor).not.toContain("0.00");
    expect(screen.getByTestId("badge").style.backgroundColor).not.toBe("");
  });

  it("uses stable frost for wells even on a browser that supports the liquid lens", () => {
    capabilities({ lens: true, frost: true });
    render(mode(<Input label="Name" testID="name" />, true));
    const painted = materials(screen.getByTestId("name").parentElement!);
    expect(painted).toHaveLength(1);
    expect(painted[0].style.backdropFilter).toMatch(/^blur\(/);
    expect(painted[0].style.backdropFilter).not.toContain("url(");
  });

  it("preserves complete solid fill and boundaries when no material can render", () => {
    capabilities({ lens: false, frost: false });
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
    capabilities({ lens: true, frost: true });
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
    capabilities({ lens: true, frost: false });
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
      capabilities({ lens: true, frost: false });
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
      capabilities({ lens: true, frost: true });
      render(mode(<>
        <Avatar name="Rachel Chen" testID="identity" />
        <AvatarGroup max={0} total={4} testID="group" />
        <Emblem primary label="RC" testID="emblem" />
        <Avatar name="Photo" src="https://example.test/avatar.png" testID="photo" />
      </>, true));
      for (const id of ["identity", "group", "emblem"]) {
        const layers = materials(screen.getByTestId(id));
        expect(layers).toHaveLength(1);
        expect(layers[0].style.backdropFilter).toMatch(/^blur\(/);
      }
      expect(materials(screen.getByTestId("photo"))).toHaveLength(0);
      expect(screen.getByLabelText("Photo")).toBeDefined();
    });
  }
});

describe("live editing survives material mode changes", () => {
  it("keeps the focused segment and uncontrolled selection when material changes both ways", () => {
    capabilities({ lens: true, frost: true });
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
        capabilities({ lens: true, frost: true });
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
