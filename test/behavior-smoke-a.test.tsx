import { describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { type ReactNode } from "react";
import { ThemeProvider } from "../src/style/theme.tsx";
import { Alert } from "../src/molecules/alert/alert.tsx";
import { Stats } from "../src/molecules/stats/stats.tsx";
import { EmptyState } from "../src/molecules/empty-state/empty-state.tsx";
import { Button } from "../src/atoms/button/button.tsx";
import { lightColors } from "../src/style/tokens.ts";

// Behavioral coverage for three "Light"-treatment molecules that previously had
// mount-smoke only. These pin the regressable branches each shell owns: Alert's
// tone -> live-region mapping and its dismiss/actions slots, Stats' delta-tone
// direction, and EmptyState's success-vs-default wash + action wiring.
//
// react-native-web serializes computed styles as inline `style` attributes, so a
// semantic color lands as an `rgba(r, g, b, a)` substring we can assert on. We
// match the RGB triplet (alpha-agnostic) so a tone regression fails loudly without
// snapshotting the whole style string.
afterEach(cleanup);
const ui = (node: ReactNode) => render(<ThemeProvider>{node}</ThemeProvider>);

// Semantic hues the kit resolves for these tones (Tailwind 600 in light mode).
const GREEN = "22, 163, 74"; // green-600 (a rise, from the palette hue ramp)
// The success token's channels, as react-native-web writes them into a style.
const SUCCESS = [1, 3, 5].map((i) => parseInt(lightColors.success.slice(i, i + 2), 16)).join(", ");
const RED = "220, 38, 38"; // red-600 (a decline)

describe("Alert", () => {
  // toneOf() precedence -> live: error is urgent ("assertive"); every other tone
  // (info/success/warning + the neutral default) rides a "polite" live region.
  // Both announce with accessibilityRole="alert" (role="alert" on web).
  it("maps each tone to the right alert role + aria-live", () => {
    const cases: Array<{ props: Record<string, boolean>; live: string }> = [
      { props: { info: true }, live: "polite" },
      { props: { success: true }, live: "polite" },
      { props: { warning: true }, live: "polite" },
      { props: { error: true }, live: "assertive" },
      { props: {}, live: "polite" }, // neutral default
    ];
    for (const c of cases) {
      const { container, unmount } = ui(<Alert {...c.props} title="Heads up" />);
      const root = container.querySelector('[role="alert"]');
      expect(root, `tone ${JSON.stringify(c.props)} should render role="alert"`).not.toBeNull();
      expect(root?.getAttribute("aria-live")).toBe(c.live);
      unmount();
    }
  });

  it("renders the title and description text", () => {
    ui(<Alert warning title="Low disk space" description="Only 2 GB left" />);
    expect(screen.getByText("Low disk space")).toBeTruthy();
    expect(screen.getByText("Only 2 GB left")).toBeTruthy();
  });

  it("shows the dismiss control only with `dismissible` and fires onDismiss", () => {
    // No dismiss affordance by default.
    const plain = ui(<Alert info title="No X here" />);
    expect(plain.container.querySelector('[aria-label="Dismiss"]')).toBeNull();
    plain.unmount();

    let dismissed = 0;
    const { container } = ui(<Alert info title="Closable" dismissible onDismiss={() => { dismissed += 1; }} />);
    const btn = container.querySelector('[aria-label="Dismiss"]');
    expect(btn).not.toBeNull();
    fireEvent.click(btn as Element);
    expect(dismissed).toBe(1);
  });

  // The controlled + uncontrolled contract (useControllableState): a bare
  // dismissible Alert hides itself when the "×" is pressed; a controlled
  // `dismissed` prop hands that state to the parent instead.
  it("self-dismisses out of the box when the dismiss control is pressed", () => {
    const { container } = ui(<Alert info title="Transient" dismissible />);
    fireEvent.click(container.querySelector('[aria-label="Dismiss"]') as Element);
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it("defers to a controlled `dismissed` prop and still reports the press", () => {
    let dismissed = 0;
    const { container } = ui(
      <Alert info title="Parent-owned" dismissible dismissed={false} onDismiss={() => { dismissed += 1; }} />,
    );
    fireEvent.click(container.querySelector('[aria-label="Dismiss"]') as Element);
    // The parent owns the state, so the banner stays until it flips the prop.
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(dismissed).toBe(1);

    const hidden = ui(<Alert info title="Gone" dismissible dismissed />);
    expect(hidden.container.querySelector('[role="alert"]')).toBeNull();
  });

  it("renders whatever is passed to the actions slot", () => {
    ui(
      <Alert error title="Payment failed" actions={<Button primary small>Retry</Button>} />,
    );
    expect(screen.getByText("Retry")).toBeTruthy();
  });

  // Width: an Alert is FILL (src/style/sizing.ts). It spans the parent it is
  // given with the row-sharing pair and carries no cap of its own; a Container
  // step around it sets the measure. RNW serializes the style inline, so the
  // nature is assertable at the DOM.
  const alertRoot = (c: HTMLElement) => c.querySelector('[role="alert"]') as HTMLElement;

  it("fills the parent with no cap of its own", () => {
    const { container } = ui(<Alert info title="Measured" />);
    const root = alertRoot(container);
    expect(root.style.width).toBe("100%");
    expect(root.style.flexShrink).toBe("1");
    expect(root.style.minWidth).toBe("0px");
    expect(root.style.maxWidth).toBe("");
  });
});

describe("Stats", () => {
  it("renders each metric's label and value, and omits the delta when absent", () => {
    ui(<Stats items={[{ label: "Total users", value: "12,847" }]} />);
    expect(screen.getByText("Total users")).toBeTruthy();
    expect(screen.getByText("12,847")).toBeTruthy();
    // No delta string was supplied, so no delta Text is rendered.
    expect(screen.queryByText("+12.5%")).toBeNull();
  });

  // deltaTone(dark, down): a rise reads green, a decline reads red. Pin the
  // direction by the resolved color the shell layers onto the delta Text.
  it("colors a rising delta green and a declining delta red", () => {
    const { getByText } = ui(
      <Stats
        items={[
          { label: "Revenue", value: "$48.2k", delta: "+12.5%" },
          { label: "Churn", value: "3.6%", delta: "-4.2%", down: true },
        ]}
      />,
    );
    expect(getByText("+12.5%").getAttribute("style")).toContain(GREEN);
    expect(getByText("-4.2%").getAttribute("style")).toContain(RED);
  });

  it("makes each metric a button and reports its index when onPressItem is set", () => {
    let pressed = -1;
    const { container } = ui(
      <Stats
        onPressItem={(i) => { pressed = i; }}
        items={[
          { label: "A", value: "1" },
          { label: "B", value: "2" },
        ]}
      />,
    );
    const buttons = container.querySelectorAll('[role="button"]');
    expect(buttons.length).toBe(2);
    fireEvent.click(buttons[1] as Element);
    expect(pressed).toBe(1);
  });
});

describe("EmptyState", () => {
  it("renders the title, description, and action label", () => {
    ui(
      <EmptyState
        icon="📭"
        title="No messages"
        description="You're all caught up"
        actionLabel="Compose"
        onAction={() => {}}
      />,
    );
    expect(screen.getByText("No messages")).toBeTruthy();
    expect(screen.getByText("You're all caught up")).toBeTruthy();
    expect(screen.getByText("Compose")).toBeTruthy();
  });

  // discTone/glyphTone: `success` washes the disc + glyph the semantic success
  // green; the default tone stays on the muted / muted-foreground tokens. Assert
  // the success glyph is green and the default glyph is NOT (tone axis flips).
  it("paints the glyph green for the success tone and muted otherwise", () => {
    const good = ui(<EmptyState icon="✅" title="All clear" success />);
    expect(good.getByText("✅").getAttribute("style")).toContain(SUCCESS);
    good.unmount();

    const plain = ui(<EmptyState icon="📦" title="Nothing yet" />);
    expect(plain.getByText("📦").getAttribute("style")).not.toContain(SUCCESS);
  });

  it("fires onAction when the action button is pressed", () => {
    let acted = 0;
    ui(<EmptyState title="Empty" actionLabel="Add item" onAction={() => { acted += 1; }} />);
    fireEvent.click(screen.getByText("Add item"));
    expect(acted).toBe(1);
  });
});
