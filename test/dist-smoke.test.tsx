// Smoke-tests the PUBLISHED ARTIFACT (dist/), not src: imports the compiled
// barrel and renders real components from it. This is the layer that would have
// caught the ship-raw-TS packaging break — bun's react-native → react-native-web
// alias (test/setup.ts) stands in for a web consumer's bundler.
//
// Skipped when dist/ is absent (run `bun run build` first; CI builds before test).

import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { render, fireEvent } from "@testing-library/react";

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
const hasDist = fs.existsSync(path.join(DIST, "index.js"));

describe.skipIf(!hasDist)("dist artifact", () => {
  test("compiled barrel exports the kit", async () => {
    const kit = await import("../dist/index.js");
    // A representative spread: primitives, atoms, molecules, organisms, theme.
    for (const name of [
      "View", "Text", "Pressable",
      "Button", "Badge", "Avatar", "AvatarGroup", "AvatarMenu", "Chip", "Emblem", "Row", "Column", "Sparkline",
      "Card", "DescriptionList", "Field", "Form", "FormSection", "Stats",
      "Chart", "StackedBar", "Gauge", "Heatmap", "LineChart", "AreaChart", "PieChart", "ScatterPlot", "CandlestickChart", "DepthChart", "BarList", "MetricBreakdown", "UptimeBar", "ServiceHealthList", "BulletChart", "ProgressRing", "ComposedChart", "RangeAreaChart", "Histogram", "BoxPlot", "WaterfallChart", "RadialBarChart", "FunnelChart", "RadarChart", "Treemap", "DataTable", "Dialog", "Toast",
      "ThemeProvider", "GlassSurface", "QRCode", "Video",
    ]) {
      expect(typeof (kit as Record<string, unknown>)[name]).not.toBe("undefined");
    }
  });

  test("compiled components render and handle presses", async () => {
    const { Button, ThemeProvider } = await import("../dist/index.js");
    let pressed = 0;
    const { getByRole } = render(
      <ThemeProvider>
        <Button primary onPress={() => pressed++}>Save</Button>
      </ThemeProvider>,
    );
    const btn = getByRole("button");
    fireEvent.click(btn);
    expect(pressed).toBe(1);
  });

  test("optional-peer guards degrade instead of throwing (QRCode frame renders)", async () => {
    const { QRCode, ThemeProvider } = await import("../dist/index.js");
    // Whether or not react-native-qrcode-svg resolves in this environment, the
    // labeled frame must render and the optional-require path must not throw —
    // that graceful degrade IS the contract for optional peers.
    const { getByLabelText } = render(
      <ThemeProvider>
        <QRCode value="https://example.com" />
      </ThemeProvider>,
    );
    expect(getByLabelText("QR code encoding https://example.com")).toBeTruthy();
  });
});
