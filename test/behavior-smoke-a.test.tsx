import { describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { type ReactNode } from "react";
import { ThemeProvider } from "../src/style/theme.tsx";
import { Alert } from "../src/molecules/alert/alert.tsx";
import { Stats } from "../src/molecules/stats/stats.tsx";
import { EmptyState } from "../src/molecules/empty-state/empty-state.tsx";
import { Button } from "../src/atoms/button/button.tsx";

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
const SUCCESS = "25, 117, 68"; // the success token (Riskora green/800)
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

  // The width measure axis: every measure is a MAXIMUM, never a floor. The
  // banner rides width:"100%" under a maxWidth cap (480 default / 320 narrow /
  // 640 wide; block drops the cap), so it still shrinks to its container. RNW
  // serializes the pair as inline width/max-width, so the axis is assertable
  // at the DOM.
  const alertRoot = (c: HTMLElement) => c.querySelector('[role="alert"]') as HTMLElement;

  it("caps a bare banner at the default 480px measure, filling under the cap", () => {
    const { container } = ui(<Alert info title="Measured" />);
    expect(alertRoot(container).style.width).toBe("100%");
    expect(alertRoot(container).style.maxWidth).toBe("480px");
  });

  it("narrow and wide pick the other two caps", () => {
    const n = ui(<Alert narrow info title="Narrow" />);
    expect(alertRoot(n.container).style.maxWidth).toBe("320px");
    n.unmount();
    const w = ui(<Alert wide info title="Wide" />);
    expect(alertRoot(w.container).style.maxWidth).toBe("640px");
  });

  it("block fills the container with no cap", () => {
    const { container } = ui(<Alert block info title="Announcement" />);
    expect(alertRoot(container).style.width).toBe("100%");
    expect(alertRoot(container).style.maxWidth).toBe("");
  });

  it("resolves measure conflicts first-match: block > wide > narrow", () => {
    const all = ui(<Alert narrow wide block info title="All three" />);
    expect(alertRoot(all.container).style.maxWidth).toBe("");
    all.unmount();
    const two = ui(<Alert narrow wide info title="Wide beats narrow" />);
    expect(alertRoot(two.container).style.maxWidth).toBe("640px");
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
