import { describe, it, expect, afterEach, spyOn } from "bun:test";
import { type ReactNode, StrictMode, useContext } from "react";
import { render, cleanup, screen } from "@testing-library/react";
import { Animated, Text, TextInput } from "react-native";
import { Entrance, type EntranceProps } from "../src/style/entrance.tsx";
import { EntranceReadinessContext } from "../src/style/entrance-readiness.ts";
import { ThemeProvider } from "../src/style/theme.tsx";

// Entrance is a hold, not a motion: the card is in the tree and measurable while
// its owner is not ready, invisible and inert until it is, and it appears in place
// with no animation.
afterEach(cleanup);

function Probe() {
  const ready = useContext(EntranceReadinessContext);
  return <><Text testID="readiness">{ready ? "ready" : "held"}</Text><TextInput accessibilityLabel="Draft" defaultValue="original" /></>;
}
function ui(props: Omit<EntranceProps, "children"> = {}, inherited = true): ReactNode {
  return <ThemeProvider light solid><EntranceReadinessContext.Provider value={inherited}>
    <Entrance {...props}><Probe /></Entrance>
  </EntranceReadinessContext.Provider></ThemeProvider>;
}
const wrapper = () => screen.getByTestId("readiness").parentElement as HTMLElement;
const readiness = () => screen.getByTestId("readiness").textContent;
const held = () => ({
  ariaHidden: wrapper().getAttribute("aria-hidden") === "true",
  opacity: wrapper().style.opacity,
  pointerEvents: getComputedStyle(wrapper()).pointerEvents,
});

describe("Entrance", () => {
  it("shows a default-ready card at once, visible and interactive", () => {
    render(ui());
    expect(readiness()).toBe("ready");
    expect(held()).toEqual({ ariaHidden: false, opacity: "", pointerEvents: "auto" });
    expect(wrapper().style.transform).toBe("");
  });

  it("holds an unready card outside hit testing and accessibility, and releases it in place", () => {
    const view = render(ui({ ready: false }));
    expect(readiness()).toBe("held");
    expect(held()).toEqual({ ariaHidden: true, opacity: "0", pointerEvents: "none" });
    const input = screen.getByLabelText("Draft") as HTMLInputElement;
    view.rerender(ui({ ready: true }));
    expect(readiness()).toBe("ready");
    expect(held()).toEqual({ ariaHidden: false, opacity: "", pointerEvents: "auto" });
    // The same host and the same input survive the release and a re-hold: nothing remounts.
    expect(screen.getByLabelText("Draft")).toBe(input);
    view.rerender(ui({ ready: false }));
    expect(readiness()).toBe("held");
    expect(held().ariaHidden).toBe(true);
    expect(screen.getByLabelText("Draft")).toBe(input);
  });

  it("aggregates inherited focus readiness without hiding its own host", () => {
    const view = render(ui({}, false));
    expect(readiness()).toBe("held");
    expect(held().ariaHidden).toBe(false);
    view.rerender(ui());
    expect(readiness()).toBe("ready");
  });

  it("never starts an animation", () => {
    const spring = spyOn(Animated, "spring");
    const timing = spyOn(Animated, "timing");
    try {
      const view = render(ui({ ready: false }));
      view.rerender(ui({ ready: true }));
      view.rerender(ui({ ready: false }));
      view.rerender(ui({ ready: true }));
      expect(spring).not.toHaveBeenCalled();
      expect(timing).not.toHaveBeenCalled();
      expect(wrapper().style.transform).toBe("");
    } finally {
      spring.mockRestore();
      timing.mockRestore();
    }
  });

  it("survives StrictMode's replayed effects on the retained host", () => {
    render(<StrictMode>{ui()}</StrictMode>);
    const input = screen.getByLabelText("Draft") as HTMLInputElement;
    expect(readiness()).toBe("ready");
    expect(screen.getByLabelText("Draft")).toBe(input);
  });
});
