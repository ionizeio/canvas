import { describe, it, expect, afterEach, beforeEach } from "bun:test";
import { render, cleanup, renderHook } from "@testing-library/react";
import { Dimensions } from "react-native";
import { ThemeProvider } from "../src/style/theme.tsx";
import { Row, Column } from "../src/atoms/layout/layout.tsx";
import { Container, containerStyle, measureOf } from "../src/atoms/container/container.tsx";
import { Grid } from "../src/atoms/grid/grid.tsx";
import { Badge } from "../src/atoms/badge/badge.tsx";
import { clampSpan, spanWidth, useLayoutAxis, widths } from "../src/style/index.ts";
import { resetDevWarnings } from "../src/style/dev-warn.ts";
import { resizeViewport } from "./viewport.ts";

// The layout tier's bounds providers: Row spans (twelfths, container-measured
// px cells; happy-dom never fires onLayout, so the cells resolve against the
// window fallback), the Container measure axis, and the layout-axis context
// every kit container publishes (src/style/sizing.ts).

afterEach(cleanup);
beforeEach(resetDevWarnings);

const ui = (node: React.ReactNode) => render(<ThemeProvider>{node}</ThemeProvider>);
const at = (testID: string) => document.querySelector(`[data-testid="${testID}"]`) as HTMLElement;

describe("spanWidth / clampSpan (pure)", () => {
  it("two 6-column cells plus their gap fill the row exactly, as do twelve 1-column cells", () => {
    const w = 600, gap = 8;
    expect(spanWidth(w, 6, gap) * 2 + gap).toBe(600);
    expect(spanWidth(w, 12, gap)).toBe(600);
    expect(spanWidth(w, 1, gap) * 12 + gap * 11).toBeLessThanOrEqual(600);
    expect(spanWidth(w, 8, gap) + gap + spanWidth(w, 4, gap)).toBeLessThanOrEqual(600);
    expect(spanWidth(0, 6, gap)).toBe(0);
  });

  it("clamps to a whole number of the twelve columns", () => {
    expect(clampSpan(6)).toBe(6);
    expect(clampSpan(0)).toBe(1);
    expect(clampSpan(13)).toBe(12);
    expect(clampSpan(4.4)).toBe(4);
    expect(clampSpan(Number.NaN)).toBe(12);
  });
});

describe("Row spans", () => {
  it("wraps each spanning child in a px cell sized from the measured (window-seeded) width", () => {
    resizeViewport(1200);
    ui(
      <Row snug testID="r">
        <Column span={8} testID="main">
          <Badge>a</Badge>
        </Column>
        <Column span={4} testID="aside">
          <Badge>b</Badge>
        </Column>
      </Row>,
    );
    const width = Dimensions.get("window").width;
    const cellOf = (id: string) => at(id).parentElement as HTMLElement;
    expect(cellOf("main").style.width).toBe(`${spanWidth(width, 8, 8)}px`);
    expect(cellOf("aside").style.width).toBe(`${spanWidth(width, 4, 8)}px`);
    // A span row wraps like Bootstrap's .row.
    expect(at("r").style.flexWrap).toBe("wrap");
  });

  it("leaves non-spanning siblings unwrapped and mounts no cells in a Row without spans", () => {
    ui(
      <Row testID="r">
        <Column span={6} testID="half">
          <Badge>a</Badge>
        </Column>
        <Badge testID="hug">b</Badge>
      </Row>,
    );
    expect((at("half").parentElement as HTMLElement).style.width).not.toBe("");
    expect(at("hug").parentElement).toBe(at("r"));
    ui(
      <Row testID="plain">
        <Column testID="c">
          <Badge>a</Badge>
        </Column>
      </Row>,
    );
    expect(at("c").parentElement).toBe(at("plain"));
    expect(at("plain").style.flexWrap).not.toBe("wrap");
  });

  it("stacks ignores spans once stacked: every child is a full-width column child", () => {
    resizeViewport(375);
    ui(
      <Row snug stacks testID="r">
        <Column span={6} testID="l">
          <Badge>a</Badge>
        </Column>
        <Column span={6} testID="rr">
          <Badge>b</Badge>
        </Column>
      </Row>,
    );
    expect(at("r").style.flexDirection).toBe("column");
    expect(at("l").parentElement).toBe(at("r"));
    expect(at("rr").parentElement).toBe(at("r"));
  });

  it("warns for a span outside a Row and for a span that is not a whole column count", () => {
    const seen: string[] = [];
    const original = console.warn;
    console.warn = (m: string) => { seen.push(m); };
    try {
      ui(
        <Column>
          <Column span={6}>
            <Badge>a</Badge>
          </Column>
        </Column>,
      );
      expect(seen.some((m) => m.includes("<Column span>") && m.includes("direct child of a Row"))).toBe(true);
      ui(
        <Row>
          <Column span={4.5}>
            <Badge>a</Badge>
          </Column>
        </Row>,
      );
      expect(seen.some((m) => m.includes("span={4.5}") && m.includes("clamped"))).toBe(true);
    } finally {
      console.warn = original;
    }
  });
});

describe("the layout-axis context the containers publish", () => {
  const Probe = ({ onAxis }: { onAxis: (v: ReturnType<typeof useLayoutAxis>) => void }) => {
    onAxis(useLayoutAxis());
    return null;
  };
  const axisIn = (wrap: (probe: React.ReactNode) => React.ReactNode) => {
    let seen: ReturnType<typeof useLayoutAxis> = null;
    ui(wrap(<Probe onAxis={(v) => { seen = v; }} />));
    return seen;
  };

  it("Column: a stretching column; alignCenter is not stretch", () => {
    expect(axisIn((p) => <Column>{p}</Column>)).toEqual({ axis: "column", stretch: true, hugging: false });
    expect(axisIn((p) => <Column alignCenter>{p}</Column>)).toEqual({ axis: "column", stretch: false, hugging: false });
  });

  it("Row: children are content-sized on the row axis", () => {
    expect(axisIn((p) => <Row>{p}</Row>)).toEqual({ axis: "row", stretch: false, hugging: false });
  });

  it("a bare Column inside a Row is a hugging cell; span, fill, or grow make it definite", () => {
    expect(axisIn((p) => <Row><Column>{p}</Column></Row>)?.hugging).toBe(true);
    expect(axisIn((p) => <Row><Column span={6}>{p}</Column></Row>)?.hugging).toBe(false);
    expect(axisIn((p) => <Row><Column fill>{p}</Column></Row>)?.hugging).toBe(false);
    expect(axisIn((p) => <Row><Column grow>{p}</Column></Row>)?.hugging).toBe(false);
    expect(axisIn((p) => <Row><Row>{p}</Row></Row>)?.hugging).toBe(true);
    expect(axisIn((p) => <Column><Column>{p}</Column></Column>)?.hugging).toBe(false);
  });

  it("a stacked Row publishes a column axis", () => {
    resizeViewport(375);
    expect(axisIn((p) => <Row stacks>{p}</Row>)?.axis).toBe("column");
  });

  it("Container and Grid cells are definite stretching columns; only the Grid cell is bounded", () => {
    expect(axisIn((p) => <Container>{p}</Container>)).toEqual({ axis: "column", stretch: true, hugging: false });
    // A Grid cell is stretched to its row's height, so it is definite on both axes
    // (`bounded`): a Card in it grows to that height. A Container has no such
    // height, so a Card in one stays as tall as its sections.
    expect(axisIn((p) => <Grid><Badge>a</Badge>{p}</Grid>)).toEqual({ axis: "column", stretch: true, hugging: false, bounded: true });
  });

  it("is null outside every kit container", () => {
    expect(renderHook(() => useLayoutAxis()).result.current).toBeNull();
  });
});

describe("Container", () => {
  it("spans its parent, caps at the step, and centers by default", () => {
    ui(
      <Container sm testID="c">
        <Badge>a</Badge>
      </Container>,
    );
    expect(at("c").style.width).toBe("100%");
    expect(at("c").style.maxWidth).toBe(`${widths.sm}px`);
    expect(at("c").style.alignSelf).toBe("center");
  });

  it("defaults to the page step, fluid drops the cap, start pins to the leading edge", () => {
    ui(<Container testID="p" />);
    expect(at("p").style.maxWidth).toBe(`${widths.page}px`);
    ui(<Container fluid start testID="f" />);
    expect(at("f").style.maxWidth).toBe("");
    expect(at("f").style.alignSelf).toBe("flex-start");
  });

  it("resolves the measure narrowest-first, with fluid winning outright", () => {
    expect(measureOf({})).toBe("page");
    expect(measureOf({ xl: true, sm: true })).toBe("sm");
    expect(measureOf({ fluid: true, xs: true })).toBe("fluid");
    expect(containerStyle("md", false)).toEqual({ width: "100%", alignSelf: "center", maxWidth: widths.md });
    expect(containerStyle("fluid", true)).toEqual({ width: "100%", alignSelf: "flex-start" });
  });

  it("gutters are horizontal padding from the layout pad scale", () => {
    ui(<Container pad testID="g" />);
    expect(at("g").style.paddingLeft).toBe("16px");
    expect(at("g").style.paddingRight).toBe("16px");
    expect(at("g").style.paddingTop).toBe("");
  });
});
