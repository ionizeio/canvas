import { describe, it, expect, afterEach } from "bun:test";
import { render, cleanup, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import { Text } from "react-native";
import { ThemeProvider } from "../src/style/theme.tsx";
import { Row, Column } from "../src/atoms/layout/layout.tsx";
import { Avatar, AvatarGroup } from "../src/atoms/avatar/avatar.tsx";
import { Chip } from "../src/atoms/chip/chip.tsx";
import { createChip } from "../src/atoms/chip/chip.shared.tsx";
import { androidSkin as chipAndroidSkin, iosSkin as chipIosSkin } from "../src/atoms/chip/chip.styles.ts";
import { Emblem } from "../src/atoms/emblem/emblem.tsx";
import { Sparkline } from "../src/charts/sparkline/sparkline.tsx";
import { Gauge, Heatmap } from "../src/index.ts";
import { gaugeArc, gaugeFill } from "../src/charts/gauge/gauge.shared.tsx";
import { lightColors, palette } from "../src/style/tokens.ts";
import { Typography } from "../src/atoms/typography/typography.tsx";
import { Card } from "../src/molecules/card/card.tsx";
import { Breadcrumb } from "../src/atoms/breadcrumb/breadcrumb.tsx";
import { Textarea } from "../src/atoms/textarea/textarea.tsx";

// Behavior + a11y coverage for the "no styling escape hatches" component wave:
// Row/Column, AvatarGroup, Chip, Emblem, Sparkline, the Gauge/Heatmap charts,
// plus the new Typography tone/weight axes, Card selected/grow, Breadcrumb
// collapse, and the Textarea flush variant. react-native-web renders these to
// readable inline styles, so a semantic boolean prop can be checked at the DOM
// (e.g. `loose` → `gap: 24px`), alongside the aria-* / interaction assertions.

afterEach(cleanup);
const ui = (n: ReactNode) => render(<ThemeProvider>{n}</ThemeProvider>);
const at = (c: HTMLElement, id: string) => c.querySelector(`[data-testid="${id}"]`) as HTMLElement;

describe("Row / Column (layout primitives)", () => {
  it("carry their fixed direction as flexDirection", () => {
    const { container } = ui(
      <>
        <Row testID="r"><Text>x</Text></Row>
        <Column testID="c"><Text>y</Text></Column>
      </>,
    );
    expect(at(container, "r").style.flexDirection).toBe("row");
    expect(at(container, "c").style.flexDirection).toBe("column");
  });

  it("map the gap axis to the shared spacing scale (default snug, loose, tight)", () => {
    const { container } = ui(
      <>
        <Row testID="def"><Text>x</Text></Row>
        <Row loose testID="lo"><Text>x</Text></Row>
        <Row tight testID="ti"><Text>x</Text></Row>
      </>,
    );
    expect(at(container, "def").style.gap).toBe("8px"); // snug default
    expect(at(container, "lo").style.gap).toBe("24px");
    expect(at(container, "ti").style.gap).toBe("4px");
  });

  it("map justify / align booleans to justifyContent / alignItems", () => {
    const { container } = ui(
      <>
        <Row center alignCenter testID="cc"><Text>x</Text></Row>
        <Row between testID="bw"><Text>x</Text></Row>
      </>,
    );
    expect(at(container, "cc").style.justifyContent).toBe("center");
    expect(at(container, "cc").style.alignItems).toBe("center");
    expect(at(container, "bw").style.justifyContent).toBe("space-between");
  });

  it("turn wrap on and forward testID to the root element", () => {
    const { container } = ui(<Row wrap testID="wrapped"><Text>x</Text></Row>);
    const el = at(container, "wrapped");
    expect(el).not.toBeNull();
    expect(el.style.flexWrap).toBe("wrap");
  });

  // `shrink` is the opt-out of React Native's `flexShrink: 0` default, which is
  // what lets a long sentence in a Row child overflow the row instead of
  // wrapping. It has to stay distinct from `fill`: `fill` zeroes the flex basis
  // too, which pulls every child of a `wrap` row back onto one line.
  it("map the flex modifiers to their own properties (grow, shrink, fill)", () => {
    const { container } = ui(
      <>
        <Column testID="plain"><Text>x</Text></Column>
        <Column shrink testID="sh"><Text>x</Text></Column>
        <Column grow testID="gr"><Text>x</Text></Column>
        <Column fill testID="fi"><Text>x</Text></Column>
      </>,
    );
    expect(at(container, "plain").style.flexShrink).toBe(""); // RN's default: never shrinks
    expect(at(container, "sh").style.flexShrink).toBe("1");
    expect(at(container, "sh").style.flexBasis).toBe(""); // basis stays at the content size
    expect(at(container, "sh").style.flexGrow).toBe("");
    expect(at(container, "gr").style.flexGrow).toBe("1");
    expect(at(container, "gr").style.flexShrink).toBe("");
    expect(at(container, "fi").style.flexBasis).toBe("0%"); // flex: 1 zeroes the basis
  });
});

describe("AvatarGroup", () => {
  it("caps the visible avatars at max and collapses the rest into a +N chip", () => {
    const { getByText, queryByText } = ui(
      <AvatarGroup max={2}>
        <Avatar name="Ada Byron" />
        <Avatar name="Bob Cat" />
        <Avatar name="Cy Young" />
        <Avatar name="Dee Ell" />
      </AvatarGroup>,
    );
    expect(getByText("AB")).toBeDefined(); // first visible avatar's initials
    expect(queryByText("CY")).toBeNull(); // 3rd avatar is past the cap
    expect(getByText("+2")).toBeDefined(); // two hidden collapse into +2
  });

  it("injects the separator ring onto the stacked avatars (caller sets none)", () => {
    const { container } = ui(
      <AvatarGroup max={3}>
        <Avatar name="Ada Byron" testID="av0" />
        <Avatar name="Bob Cat" />
      </AvatarGroup>,
    );
    // The group clones each child with ring:true, which paints the hairline outline.
    expect(at(container, "av0").style.borderWidth).toBe("1.5px");
  });
});

describe("Chip", () => {
  it("fires onPress when the whole pill is tapped", () => {
    let pressed = false;
    const { container } = ui(<Chip onPress={() => { pressed = true; }}>Filter</Chip>);
    fireEvent.click(container.querySelector('[role="button"]') as Element);
    expect(pressed).toBe(true);
  });

  it("fires onRemove from the trailing remove button", () => {
    let removed = false;
    const { container } = ui(<Chip onRemove={() => { removed = true; }}>Design</Chip>);
    fireEvent.click(container.querySelector('[aria-label="Remove Design"]') as Element);
    expect(removed).toBe(true);
  });

  it("reflects the active (primary) tone through aria-pressed", () => {
    const { container, rerender } = ui(<Chip onPress={() => {}}>Filter</Chip>);
    expect(container.querySelector('[role="button"]')?.getAttribute("aria-pressed")).toBe("false");
    rerender(<ThemeProvider><Chip primary onPress={() => {}}>Filter</Chip></ThemeProvider>);
    expect(container.querySelector('[role="button"]')?.getAttribute("aria-pressed")).toBe("true");
  });

  it("names the specific chip on its remove control", () => {
    const { container } = ui(<Chip onRemove={() => {}}>Design</Chip>);
    expect(container.querySelector('[aria-label="Remove Design"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Remove"]')).toBeNull();
  });

  it("a hue tints the chip, distinct hues differ, and none is the saturated primary button fill", () => {
    const { container } = ui(
      <>
        <Chip testID="neutral">A</Chip>
        <Chip testID="blue" blue>B</Chip>
        <Chip testID="green" green>C</Chip>
        <Chip testID="primary" primary>D</Chip>
      </>,
    );
    const bg = (id: string) => at(container, id).style.backgroundColor;
    // A color changes the fill, and different colors read apart.
    expect(bg("blue")).not.toBe(bg("neutral"));
    expect(bg("blue")).not.toBe(bg("green"));
    // The whole point: `primary` is now a SOFT accent tint, not the saturated
    // `primary` fill a Button wears (#3da3f5 today), and it is not the neutral gray either.
    expect(["#3da3f5", "rgb(61, 163, 245)", "rgba(61, 163, 245, 1.00)"]).not.toContain(bg("primary"));
    expect(bg("primary")).not.toBe(bg("neutral"));
  });

  it("a status name aliases its hue (success renders as green)", () => {
    const { container } = ui(
      <>
        <Chip testID="success" success>A</Chip>
        <Chip testID="green" green>B</Chip>
      </>,
    );
    expect(at(container, "success").style.backgroundColor).toBe(at(container, "green").style.backgroundColor);
  });

  it("outline drops the fill but keeps a colored border", () => {
    const { container } = ui(<Chip testID="ob" blue outline>A</Chip>);
    const el = at(container, "ob");
    // A border-only chip has no (or zero-alpha) fill; RNW writes transparent as rgba(…,0).
    expect(el.style.backgroundColor).toMatch(/^$|transparent|rgba\(0, 0, 0, 0(\.0+)?\)/);
    expect(el.style.borderColor).toBeTruthy();
  });
});

// The M3 selected filter-chip anatomy is threaded through the skin (like the
// Accordion chevron), so it is exercised on createChip(androidSkin) directly;
// the iOS/web skins omit the flag and keep the tint swap alone.
describe("Chip (Android M3 selected filter anatomy)", () => {
  const AndroidChip = createChip(chipAndroidSkin);
  const IOSChip = createChip(chipIosSkin);
  // The bun harness renders no real <svg>, so decorative Icons are counted via
  // their aria-hidden wrappers (see the Icon-render memory note).
  const icons = (c: HTMLElement) => c.querySelectorAll('[aria-hidden="true"]').length;

  it("selecting grows the leading 18dp checkmark and drops the outline", () => {
    const { container } = ui(
      <AndroidChip testID="mc" selectable outline>Engineering</AndroidChip>,
    );
    const el = at(container, "mc");
    const restingIcons = icons(container);
    expect(el.style.borderColor).not.toMatch(/transparent|rgba\(0, 0, 0, 0(\.0+)?\)/);
    fireEvent.click(container.querySelector('[role="button"]') as Element);
    // Selected: one leading checkmark appears and the outline goes transparent
    // (the borderWidth stays, so the box does not shift).
    expect(icons(container)).toBe(restingIcons + 1);
    expect(el.style.borderColor).toMatch(/transparent|rgba\(0, 0, 0, 0(\.0+)?\)/);
  });

  it("pads 16dp beside text and 8dp beside an icon (M3 side insets)", () => {
    const { container } = ui(
      <>
        <AndroidChip testID="plain">A</AndroidChip>
        <AndroidChip testID="removable" onRemove={() => {}}>B</AndroidChip>
      </>,
    );
    const pad = (id: string) => {
      const s = at(container, id).style;
      return {
        start: s.paddingInlineStart || s.paddingLeft,
        end: s.paddingInlineEnd || s.paddingRight,
      };
    };
    expect(pad("plain")).toEqual({ start: "16px", end: "16px" });
    // The remove button counts as a trailing icon: its side tightens to 8dp.
    expect(pad("removable")).toEqual({ start: "16px", end: "8px" });
  });

  it("the iOS skin keeps the tint-swap selected look (no checkmark, border kept)", () => {
    const { container } = ui(<IOSChip testID="ic" selectable outline>Engineering</IOSChip>);
    const restingIcons = icons(container);
    fireEvent.click(container.querySelector('[role="button"]') as Element);
    expect(icons(container)).toBe(restingIcons);
    expect(at(container, "ic").style.borderColor).not.toMatch(/transparent|rgba\(0, 0, 0, 0(\.0+)?\)/);
  });
});

describe("Emblem", () => {
  it("renders a monogram label", () => {
    const { getByText } = ui(<Emblem label="JS" />);
    expect(getByText("JS")).toBeDefined();
  });

  it("tints the surface from the semantic tone", () => {
    const { container } = ui(
      <>
        <Emblem primary label="A" testID="pri" />
        <Emblem muted label="A" testID="mut" />
      </>,
    );
    const pri = at(container, "pri").style.backgroundColor;
    const mut = at(container, "mut").style.backgroundColor;
    expect(pri).not.toBe("");
    expect(mut).not.toBe("");
    expect(pri).not.toBe(mut); // tone drives a distinct fill
  });

  it("warning tints the surface with the amber wash and paints the monogram to match", () => {
    const { container, getByText } = ui(<Emblem warning label="W" testID="warn" />);
    // Light-scheme warning token (#ad4e1e, Riskora orange/800) at the shared 12% tint recipe.
    expect(at(container, "warn").style.backgroundColor).toBe("rgba(173, 78, 30, 0.12)");
    // The monogram paints in the solid warning token, not the muted foreground.
    expect((getByText("W") as HTMLElement).style.color).toBe("rgba(173, 78, 30, 1.00)");
  });

  it("resolves tone conflicts by fixed precedence (destructive outranks warning)", () => {
    const { container } = ui(
      <>
        <Emblem destructive warning label="A" testID="dw" />
        <Emblem destructive label="A" testID="d" />
      </>,
    );
    expect(at(container, "dw").style.backgroundColor).toBe(at(container, "d").style.backgroundColor);
  });
});

describe("Sparkline", () => {
  it("renders one bar per value", () => {
    const { container } = ui(<Sparkline values={[1, 2, 3, 4, 5]} testID="spark" />);
    expect(at(container, "spark").children.length).toBe(5);
  });

  it("exposes an accessible summary label", () => {
    const { container } = ui(
      <Sparkline values={[1, 2, 3]} accessibilityLabel="requests, last 3 days" />,
    );
    expect(container.querySelector('[aria-label="requests, last 3 days"]')).not.toBeNull();
  });
});

describe("Charts — Gauge & Heatmap", () => {
  it("Gauge's accessible name carries the label and value", () => {
    const { container } = ui(<Gauge value={87} label="Uptime" />);
    const name = container.querySelector("[aria-label]")?.getAttribute("aria-label") ?? "";
    expect(name).toContain("Uptime");
    expect(name).toContain("87%");
  });

  it("Gauge clamps an out-of-range value into 0–100", () => {
    const { container } = ui(<Gauge value={150} />);
    expect(container.querySelector("[aria-label]")?.getAttribute("aria-label")).toContain("100%");
  });

  // The harness stubs react-native-svg, so the arc's stroke cannot be read off
  // the DOM; the tone resolver is asserted directly (the Progress toneFill
  // precedent), plus a render smoke through the accessible name.
  it("Gauge's warning tone fills with the shared statusHues amber", () => {
    expect(gaugeFill(lightColors, { value: 81, warning: true })).toBe(palette["amber-500"]);
    const { container } = ui(<Gauge warning value={81} label="Budget used" />);
    const name = container.querySelector("[aria-label]")?.getAttribute("aria-label") ?? "";
    expect(name).toContain("Budget used");
    expect(name).toContain("81%");
  });

  it("Gauge tone precedence: success > warning > destructive, else primary", () => {
    expect(gaugeFill(lightColors, { value: 1, success: true, warning: true })).toBe(palette["green-500"]);
    expect(gaugeFill(lightColors, { value: 1, warning: true, destructive: true })).toBe(palette["amber-500"]);
    expect(gaugeFill(lightColors, { value: 1, destructive: true })).toBe(palette["red-500"]);
    expect(gaugeFill(lightColors, { value: 1 })).toBe(lightColors.primary);
  });

  // The harness stubs react-native-svg, so the arc cannot be read off the DOM;
  // the pure geometry export is asserted directly (the gaugeFill precedent).
  it("Gauge draws a 180 degree top semicircle and dashes the value's share of it", () => {
    const { d, dasharray } = gaugeArc(72);
    // One sweep across the top of the fixed 120-wide graphic: from the left
    // end (10, 60) over radius 50 to the right end (110, 60).
    expect(d).toBe("M 10 60 A 50 50 0 0 1 110 60");
    // The dash reveals 72% of the semicircle's length against the full track.
    const semi = Math.PI * 50;
    expect(dasharray).toBe(`${semi * (72 / 100)} ${semi}`);
    // Both arcs share the path; only the dash varies with the value.
    expect(gaugeArc(0).d).toBe(d);
    expect(gaugeArc(0).dasharray).toBe(`0 ${semi}`);
    expect(gaugeArc(100).dasharray).toBe(`${semi} ${semi}`);
  });

  it("Gauge rounds the readout to a whole percent while the arc keeps the fraction", () => {
    const { getByText } = ui(<Gauge value={72.5} label="Uptime" />);
    // The display rounds per the hand-off (72.5 reads as 73%)...
    expect(getByText("73%")).toBeDefined();
    // ...but the dash still carries the exact fractional share of the track.
    const semi = Math.PI * 50;
    expect(gaugeArc(72.5).dasharray).toBe(`${semi * (72.5 / 100)} ${semi}`);
  });

  it("Gauge renders the readout above the label, below the graphic", () => {
    const { getByText } = ui(<Gauge value={72} label="Uptime" />);
    const readout = getByText("72%");
    const caption = getByText("Uptime");
    // The semicircle anatomy stacks readout then label; the label follows the
    // readout in document order.
    expect(readout.compareDocumentPosition(caption) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("Heatmap's accessible name carries the label and cell count", () => {
    const { container } = ui(<Heatmap values={[0.1, 0.5, 0.9]} label="Activity" hideLegend />);
    const name = container.querySelector("[aria-label]")?.getAttribute("aria-label") ?? "";
    expect(name).toContain("Activity");
    expect(name).toContain("3 cells");
  });

  it("Heatmap accepts cell objects, reading intensity off `value`", () => {
    const { container } = ui(<Heatmap values={[{ value: 0.2 }, { value: 0.8, count: 5 }]} label="Commits" hideLegend />);
    const name = container.querySelector("[aria-label]")?.getAttribute("aria-label") ?? "";
    expect(name).toContain("Commits");
    expect(name).toContain("2 cells");
  });

  it("Heatmap calendar mode shows weekday + month labels and names the day span", () => {
    // Fourteen consecutive days spanning a month boundary (Jan → Feb 2026).
    const values = Array.from({ length: 14 }, (_, i) => {
      const day = 25 + i; // Jan 25 … Feb 7
      const iso = day <= 31 ? `2026-01-${String(day).padStart(2, "0")}` : `2026-02-${String(day - 31).padStart(2, "0")}`;
      return { value: (i % 5) / 4, count: i, date: iso };
    });
    const { container } = ui(<Heatmap calendar values={values} label="Contribution activity" />);
    const name = container.querySelector("[aria-label]")?.getAttribute("aria-label") ?? "";
    expect(name).toContain("Contribution activity");
    expect(name).toContain("14 days");
    const text = container.textContent ?? "";
    // GitHub-style furniture: alternating weekday labels + the two month names.
    expect(text).toContain("Mon");
    expect(text).toContain("Wed");
    expect(text).toContain("Fri");
    expect(text).toContain("Jan");
    expect(text).toContain("Feb");
    // The discrete less-to-more legend renders by default.
    expect(text).toContain("Less");
    expect(text).toContain("More");
  });

  it("Heatmap calendar name reports the contribution total when cells carry counts", () => {
    const values = [
      { value: 1, count: 4, date: "2026-03-01" },
      { value: 0.5, count: 2, date: "2026-03-02" },
      { value: 0, count: 0, date: "2026-03-03" },
    ];
    const { container } = ui(<Heatmap calendar hideLegend values={values} label="Streak" />);
    const name = container.querySelector("[aria-label]")?.getAttribute("aria-label") ?? "";
    expect(name).toContain("6 total");
  });
});

describe("Typography — tone & weight axes", () => {
  it("applies the weight axis as fontWeight over the role's own weight", () => {
    const { container } = ui(
      <>
        <Typography body testID="reg">Plain</Typography>
        <Typography body bold testID="bold">Heavy</Typography>
      </>,
    );
    expect(at(container, "bold").style.fontWeight).toBe("700");
    // The body role carries no intrinsic weight, so the untouched one stays unset.
    expect(at(container, "reg").style.fontWeight).not.toBe("700");
  });

  it("applies the tone axis as a distinct color over the role's own color", () => {
    const { container } = ui(
      <>
        <Typography body testID="plain">Plain</Typography>
        <Typography body primary testID="tone">Branded</Typography>
      </>,
    );
    const plain = at(container, "plain").style.color;
    const tone = at(container, "tone").style.color;
    expect(tone).not.toBe("");
    expect(tone).not.toBe(plain);
  });
});

describe("Card — selected & grow", () => {
  it("selected recolors the border away from the resting surface", () => {
    const { container } = ui(
      <>
        <Card testID="rest"><Text>a</Text></Card>
        <Card selected testID="sel"><Text>b</Text></Card>
      </>,
    );
    expect(at(container, "sel").style.borderColor).not.toBe(at(container, "rest").style.borderColor);
  });

  it("grow sets flexGrow so the card fills its parent axis", () => {
    const { container } = ui(<Card grow testID="g"><Text>a</Text></Card>);
    expect(at(container, "g").style.flexGrow).toBe("1");
  });
});

describe("Breadcrumb — maxItems collapse", () => {
  it("keeps the first and tail crumbs and replaces the middle with an ellipsis", () => {
    const { getByText, queryByText, container } = ui(
      <Breadcrumb items={["Home", "Team", "Projects", "Canvas", "Settings"]} maxItems={3} />,
    );
    expect(getByText("Home")).toBeDefined(); // first crumb kept
    expect(getByText("Settings")).toBeDefined(); // last crumb kept
    expect(queryByText("Team")).toBeNull(); // collapsed into the middle
    expect(queryByText("Projects")).toBeNull(); // collapsed into the middle
    expect(container.querySelector('[aria-label="More levels"]')).not.toBeNull();
  });
});

describe("Textarea — flush variant", () => {
  it("drops its own border and radius so it sits flush in a framed container", () => {
    const { container } = ui(<Textarea flush testID="ta" />);
    const field = container.querySelector("textarea") as HTMLTextAreaElement;
    expect(field.style.borderTopWidth).toBe("0px");
    expect(field.style.borderRadius).toBe("0px");
  });
});
