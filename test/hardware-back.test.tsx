import { describe, it, expect, afterEach, spyOn } from "bun:test";
import { render, cleanup } from "@testing-library/react";
import type { ReactNode } from "react";
import { BackHandler, Text } from "react-native";
import { ThemeProvider } from "../src/style/theme.tsx";
import { useHardwareBack } from "../src/style/use-hardware-back.ts";
import { Drawer } from "../src/organisms/drawer/drawer.tsx";
import { ActionSheet } from "../src/organisms/action-sheet/action-sheet.tsx";

// Regression lock for the web BackHandler guard: react-native-web's BackHandler
// shim logs console.error("BackHandler is not supported on web…") on EVERY
// addEventListener call, so an unguarded hardware-back subscription spams every
// web consumer's console each time an overlay opens. useHardwareBack (shared by
// the full-screen overlays, the Sidebar drill-down and every card AnchoredOverlay
// floats; test/anchored-overlay-dismissal.test.tsx) must therefore never touch
// BackHandler on web. These tests run under the react-native-web alias, i.e. the
// exact environment the bug reproduced in.

afterEach(cleanup);

const BACKHANDLER_RE = /BackHandler is not supported/i;

// Render `node` while intercepting console.error, and return every logged message
// that is the RNW BackHandler complaint. console.error is always restored (even if
// render throws) so a failing case can't leak the spy into later tests.
function backHandlerErrorsDuringRender(node: ReactNode): string[] {
  const original = console.error;
  const complaints: string[] = [];
  console.error = (...args: unknown[]) => {
    const message = args.map((a) => (typeof a === "string" ? a : String(a))).join(" ");
    if (BACKHANDLER_RE.test(message)) complaints.push(message);
    // Keep forwarding so genuinely-unexpected errors still show up in the run log.
    original(...(args as []));
  };
  try {
    render(<ThemeProvider>{node}</ThemeProvider>);
  } finally {
    console.error = original;
  }
  return complaints;
}

describe("hardware-back wiring on web", () => {
  it("useHardwareBack never subscribes to BackHandler on web, even while active", () => {
    // The direct assert covering every consumer at once (including the Sidebar
    // drill-down): on web the hook must not call the shim at all.
    const addSpy = spyOn(BackHandler, "addEventListener");
    const Probe = () => {
      useHardwareBack(true, () => {});
      return <Text>probe</Text>;
    };
    try {
      render(
        <ThemeProvider>
          <Probe />
        </ThemeProvider>,
      );
      expect(addSpy).not.toHaveBeenCalled();
    } finally {
      addSpy.mockRestore();
    }
  });

  it("an open Drawer logs no BackHandler console.error", () => {
    const complaints = backHandlerErrorsDuringRender(
      <Drawer open onOpenChange={() => {}}>
        <Text>Navigation</Text>
      </Drawer>,
    );
    expect(complaints).toEqual([]);
  });

  it("an open ActionSheet logs no BackHandler console.error", () => {
    const complaints = backHandlerErrorsDuringRender(
      <ActionSheet
        open
        onOpenChange={() => {}}
        actions={[{ label: "Archive", onPress: () => {} }]}
      />,
    );
    expect(complaints).toEqual([]);
  });
});
