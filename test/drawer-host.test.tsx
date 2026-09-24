import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useContext, useState, type ReactNode, type RefObject } from "react";
import { Text, View } from "react-native";
import { Dropdown } from "../src/atoms/dropdown/dropdown.tsx";
import { webSkin as dropdownSkin } from "../src/atoms/dropdown/dropdown.styles.ts";
import { Select } from "../src/atoms/select/select.tsx";
import { Drawer } from "../src/organisms/drawer/drawer.tsx";
import { Drawer as IOSDrawer } from "../src/organisms/drawer/drawer.ios.tsx";
import { Drawer as AndroidDrawer } from "../src/organisms/drawer/drawer.android.tsx";
import { GlassBlurTargetContext, GlassWindowBlurTargetContext } from "../src/style/glass-surface/glass-surface.shared.tsx";
import { OverlayProvider, Portal, useOverlayHost, type OverlayHost } from "../src/style/portal.tsx";
import { ThemeProvider } from "../src/style/theme.tsx";
import { layoutHostedEntrance } from "./entrance-layout.ts";

const rect = (x: number, y: number, width: number, height: number): DOMRect => ({
  x, y, width, height, left: x, top: y, right: x + width, bottom: y + height, toJSON: () => ({}),
});
const isOutlet = (node: Element) => {
  const style = getComputedStyle(node);
  return style.position === "absolute" && style.zIndex === "1000";
};
const outletIn = (node: Element) => [...node.querySelectorAll("div")].find(isOutlet)!;
let measure: ReturnType<typeof spyOn>;
const mountSpies: ReturnType<typeof spyOn>[] = [];

beforeEach(() => {
  // happy-dom has no layout. Supply distinct window coordinates to the real RNW
  // measurement APIs, leaving Modal, Portal and AnchoredOverlay unmocked.
  measure = spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    if (isOutlet(this)) return rect(40, 60, 600, 700);
    return rect(140, 220, 160, 36);
  });
});
afterEach(() => {
  cleanup();
  fireEvent.keyUp(document.body, { key: "Escape" });
  for (const spy of mountSpies.splice(0)) spy.mockRestore();
  measure.mockRestore();
});

function CaptureHost({ report }: { report: (host: OverlayHost) => void }) {
  const host = useOverlayHost();
  if (host) report(host);
  return null;
}
const ui = (node: ReactNode) => render(<ThemeProvider>{node}</ThemeProvider>);
const escape = (target: Element) => {
  fireEvent.keyDown(target, { key: "Escape" });
  fireEvent.keyUp(document.body, { key: "Escape" });
};
const trackMounts = (host: OverlayHost) => {
  const spy = spyOn(host, "mount");
  mountSpies.push(spy);
  return spy;
};

// Dropdown and Select use their web entries in these window-host tests. Report
// their 32px rows plus card chrome through all four native layout boundaries.
async function layoutOptions(role: "menu" | "listbox", rows: number) {
  const panel = await waitFor(() => {
    const node = document.querySelector(`[role="${role}"]`);
    expect(node).not.toBeNull();
    return node!;
  });
  layoutHostedEntrance(panel, { width: 160, height: rows * 32 + 10 }, { width: 150, height: rows * 32 });
}

describe("Drawer window overlay host", () => {
  for (const [platform, Component, edge] of [
    ["web", Drawer, { left: true }],
    ["iOS", IOSDrawer, { bottom: true }],
    ["Android", AndroidDrawer, { right: true }],
  ] as const) {
    it(`${platform}: hosts anchored children in the Modal, outside its sliding and clipped panel`, async () => {
      const hosts: Record<string, OverlayHost> = {};
      const drawerChanges: boolean[] = [];
      const selected: string[] = [];
      const { container } = ui(
        <OverlayProvider>
          <CaptureHost report={(host) => { hosts.app = host; }} />
          <Component open {...edge} testID="drawer-window" onOpenChange={(open) => drawerChanges.push(open)}>
            <CaptureHost report={(host) => { hosts.drawer = host; }} />
            <View testID="drawer-content">
              <Dropdown trigger="Actions" items={[{ label: "Archive" }]} onSelect={(item) => selected.push(item.label)} />
              <Select placeholder="Choose a size" options={["Small", "Large"]} onSelect={(value) => selected.push(value)} />
            </View>
          </Component>
        </OverlayProvider>,
      );
      const appMount = trackMounts(hosts.app);
      fireEvent.click(screen.getByRole("button", { name: "Actions" }));
      await layoutOptions("menu", 1);
      const row = await screen.findByRole("menuitem", { name: "Archive" });
      const modal = screen.getByTestId("drawer-window");
      expect(appMount).not.toHaveBeenCalled();
      expect(hosts.drawer).not.toBe(hosts.app);
      expect(outletIn(container).childElementCount).toBe(0);
      expect(modal.contains(row)).toBe(true);
      expect(screen.getByTestId("drawer-content").contains(row)).toBe(false);

      const outlet = outletIn(modal);
      const positioned = [...outlet.children].find((child) => child.contains(row))!;
      expect(getComputedStyle(positioned).left).toBe("100px");
      // The trigger measures 36 tall at 160 in the outlet; the card stands off by the menu's gap.
      expect(getComputedStyle(positioned).top).toBe(`${160 + 36 + dropdownSkin.menuGap}px`);
      // The outlet's ancestry never enters the panel's transform or corner clip.
      for (let node = outlet.parentElement; node && node !== modal; node = node.parentElement) {
        const style = getComputedStyle(node);
        expect(style.overflow).not.toBe("hidden");
        expect(["", "none"]).toContain(style.transform);
      }
      expect(getComputedStyle(outlet.parentElement!).flexGrow).toBe("1");

      fireEvent.click(row);
      await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
      expect(selected).toEqual(["Archive"]);
      expect(drawerChanges).toEqual([]);

      fireEvent.click(screen.getByText("Choose a size"));
      await layoutOptions("listbox", 2);
      const option = await screen.findByRole("option", { name: "Large" });
      expect(modal.contains(option)).toBe(true);
      expect(appMount).not.toHaveBeenCalled();
      fireEvent.click(option);
      await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
      expect(selected).toEqual(["Archive", "Large"]);

      fireEvent.click(screen.getByRole("button", { name: "Actions" }));
      await layoutOptions("menu", 1);
      await screen.findByRole("menuitem", { name: "Archive" });
      const backdrop = [...outlet.children].find((child) => getComputedStyle(child).bottom === "0px")!;
      fireEvent.click(backdrop);
      await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
      expect(drawerChanges).toEqual([]);
      expect(appMount).not.toHaveBeenCalled();
    });
  }

  it("keeps nested Drawer windows independent and dismisses menu, inner window, then outer window", async () => {
    const hosts: Record<string, OverlayHost> = {};
    const closed: string[] = [];
    function Tree() {
      const [outer, setOuter] = useState(true);
      const [inner, setInner] = useState(true);
      return <OverlayProvider>
        <CaptureHost report={(host) => { hosts.app = host; }} />
        <Drawer open={outer} testID="outer-window" onOpenChange={(open) => { closed.push("outer"); setOuter(open); }}>
          <Text>Outer content</Text>
          <CaptureHost report={(host) => { hosts.outer = host; }} />
          <Drawer open={inner} testID="inner-window" onOpenChange={(open) => { closed.push("inner"); setInner(open); }}>
            <Text>Inner content</Text>
            <CaptureHost report={(host) => { hosts.inner = host; }} />
            <Dropdown trigger="Inner actions" items={[{ label: "Rename" }]} onOpenChange={(open) => { if (!open) closed.push("menu"); }} />
          </Drawer>
        </Drawer>
      </OverlayProvider>;
    }
    ui(<Tree />);
    const appMount = trackMounts(hosts.app);
    const outerMount = trackMounts(hosts.outer);
    fireEvent.click(screen.getByRole("button", { name: "Inner actions" }));
    await layoutOptions("menu", 1);
    const row = await screen.findByRole("menuitem", { name: "Rename" });
    expect(new Set(Object.values(hosts)).size).toBe(3);
    expect(screen.getByTestId("inner-window").contains(row)).toBe(true);
    expect(screen.getByTestId("outer-window").contains(row)).toBe(false);
    expect(appMount).not.toHaveBeenCalled();
    expect(outerMount).not.toHaveBeenCalled();
    escape(row);
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(closed).toEqual(["menu"]);
    escape(screen.getByText("Inner content"));
    await waitFor(() => expect(screen.queryByTestId("inner-window")).toBeNull());
    expect(closed).toEqual(["menu", "inner"]);
    escape(screen.getByText("Outer content"));
    await waitFor(() => expect(screen.queryByTestId("outer-window")).toBeNull());
    expect(closed).toEqual(["menu", "inner", "outer"]);
  });

  it("preserves the separate-window blur bridge for its panel and local outlet", () => {
    const target: RefObject<View | null> = { current: null };
    const seen: Record<string, unknown> = {};
    function Probe({ name }: { name: string }) {
      seen[name] = useContext(GlassBlurTargetContext);
      seen[`${name}-window`] = useContext(GlassWindowBlurTargetContext);
      return <Text>{name}</Text>;
    }
    ui(
      <GlassWindowBlurTargetContext.Provider value={target}>
        <OverlayProvider>
          <Drawer open>
            <Probe name="panel" />
            <Portal><Probe name="outlet" /></Portal>
            <Drawer open><Probe name="nested-panel" /><Portal><Probe name="nested-outlet" /></Portal></Drawer>
          </Drawer>
        </OverlayProvider>
      </GlassWindowBlurTargetContext.Provider>,
    );
    expect(seen.panel).toBe(target);
    expect(seen["nested-panel"]).toBe(target);
    // The explicit Modal bridge proves this target is outside the native window.
    // Its panel and local outlets can safely sample that same external plane.
    expect(seen.outlet).toBe(target);
    expect(seen["nested-outlet"]).toBe(target);
    expect(seen["outlet-window"]).toBe(target);
    expect(seen["nested-outlet-window"]).toBe(target);
  });
});
