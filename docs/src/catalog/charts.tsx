import Svg, { Circle, G, Line, Path, Polyline, Rect } from "react-native-svg";
import { View, useTheme, alpha } from "@ionizeio/canvas";
import type { CatTile } from "./tile";

// Catalog tiles for the Charts tier: one small hand-authored vignette per
// chart type, drawn with the theme tokens so light/dark follow the app.
// These are docs-only preview mockups (the tile stage is far smaller than a
// real chart's standard width); each links to the component's full page.

const W = 200;
const H = 64;

function Stage({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ width: W, maxWidth: "100%" }}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        {children}
      </Svg>
    </View>
  );
}

function BarsPreview() {
  const { tokens } = useTheme();
  const values = [26, 38, 20, 44, 32, 52, 58];
  return (
    <Stage>
      {values.map((v, i) => (
        <Rect key={i} x={8 + i * 27} y={H - v} width={18} height={v} rx={3} fill={tokens.primary} />
      ))}
    </Stage>
  );
}

function LinePreview() {
  const { tokens } = useTheme();
  return (
    <Stage>
      <Polyline
        points={`0,${H - 14} 30,${H - 26} 60,${H - 20} 90,${H - 40} 120,${H - 34} 150,${H - 52} ${W},${H - 46}`}
        fill="none"
        stroke={tokens["chart-1"]}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Polyline
        points={`0,${H - 6} 30,${H - 12} 60,${H - 10} 90,${H - 22} 120,${H - 18} 150,${H - 30} ${W},${H - 26}`}
        fill="none"
        stroke={tokens["chart-2"]}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Stage>
  );
}

function AreaPreview() {
  const { tokens } = useTheme();
  const top = `0,${H - 30} 40,${H - 44} 80,${H - 34} 120,${H - 52} 160,${H - 44} ${W},${H - 56}`;
  return (
    <Stage>
      <Path d={`M${top.split(" ").join(" L")} L${W},${H} L0,${H} Z`} fill={alpha(tokens["chart-1"], 0.3)} />
      <Polyline points={top} fill="none" stroke={tokens["chart-1"]} strokeWidth={2.5} strokeLinejoin="round" />
    </Stage>
  );
}

function PiePreview() {
  const { tokens } = useTheme();
  const cx = W / 2;
  const cy = H / 2;
  const r = 26;
  // Three fixed sectors (~50% / ~30% / ~20%), drawn clockwise from 12 o'clock.
  return (
    <Stage>
      <Path d={`M${cx},${cy} L${cx},${cy - r} A${r},${r} 0 1 1 ${cx - r},${cy} Z`} fill={tokens["chart-1"]} stroke={tokens.card} strokeWidth={2} />
      <Path d={`M${cx},${cy} L${cx - r},${cy} A${r},${r} 0 0 1 ${cx - r * 0.31},${cy - r * 0.95} Z`} fill={tokens["chart-2"]} stroke={tokens.card} strokeWidth={2} />
      <Path d={`M${cx},${cy} L${cx - r * 0.31},${cy - r * 0.95} A${r},${r} 0 0 1 ${cx},${cy - r} Z`} fill={tokens["chart-3"]} stroke={tokens.card} strokeWidth={2} />
    </Stage>
  );
}

function ScatterPreview() {
  const { tokens } = useTheme();
  const a = [
    [20, 44], [50, 36], [85, 40], [120, 24], [160, 18],
  ] as const;
  const b = [
    [35, 54], [70, 48], [105, 34], [145, 30], [180, 38],
  ] as const;
  return (
    <Stage>
      {a.map(([x, y], i) => (
        <Circle key={`a${i}`} cx={x} cy={y} r={4} fill={tokens["chart-1"]} />
      ))}
      {b.map(([x, y], i) => (
        <Circle key={`b${i}`} cx={x} cy={y} r={4} fill={tokens["chart-2"]} />
      ))}
    </Stage>
  );
}

function CandlestickPreview() {
  const { tokens } = useTheme();
  // [x, wickTop, wickBottom, bodyTop, bodyBottom, up]
  const candles: Array<[number, number, number, number, number, boolean]> = [
    [20, 10, 54, 20, 40, true],
    [55, 6, 48, 12, 30, true],
    [90, 14, 58, 22, 46, false],
    [125, 8, 50, 16, 36, true],
    [160, 4, 44, 10, 28, false],
  ];
  return (
    <Stage>
      {candles.map(([x, wt, wb, bt, bb, up], i) => {
        const color = up ? tokens.success : tokens.destructive;
        return (
          <G key={i}>
            <Line x1={x} y1={wt} x2={x} y2={wb} stroke={color} strokeWidth={1.5} />
            <Rect x={x - 6} y={bt} width={12} height={bb - bt} rx={1.5} fill={color} />
          </G>
        );
      })}
    </Stage>
  );
}

function DepthPreview() {
  const { tokens } = useTheme();
  return (
    <Stage>
      <Path d={`M0,10 L0,22 L30,22 L30,34 L60,34 L60,46 L86,46 L86,${H} L0,${H} Z`} fill={alpha(tokens.success, 0.3)} />
      <Path d={`M0,10 L0,22 L30,22 L30,34 L60,34 L60,46 L86,46`} fill="none" stroke={tokens.success} strokeWidth={2} />
      <Path d={`M114,46 L144,46 L144,32 L170,32 L170,16 L${W},16 L${W},${H} L114,${H} Z`} fill={alpha(tokens.destructive, 0.3)} />
      <Path d={`M114,46 L144,46 L144,32 L170,32 L170,16 L${W},16`} fill="none" stroke={tokens.destructive} strokeWidth={2} />
    </Stage>
  );
}

function StackedBarPreview() {
  const { tokens } = useTheme();
  const widths = [80, 56, 36, 28];
  let x = 0;
  return (
    <Stage>
      {widths.map((w, i) => {
        const r = <Rect key={i} x={x} y={H / 2 - 6} width={w - 2} height={12} rx={i === 0 || i === widths.length - 1 ? 6 : 0} fill={tokens[`chart-${i + 1}` as "chart-1"]} />;
        x += w;
        return r;
      })}
    </Stage>
  );
}

function GaugePreview() {
  const { tokens } = useTheme();
  const r = 24;
  const c = 2 * Math.PI * r;
  return (
    <Stage>
      <Circle cx={W / 2} cy={H / 2} r={r} stroke={tokens.muted} strokeWidth={7} fill="none" />
      <Circle
        cx={W / 2}
        cy={H / 2}
        r={r}
        stroke={tokens.primary}
        strokeWidth={7}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * 0.28}
        transform={`rotate(-90 ${W / 2} ${H / 2})`}
      />
    </Stage>
  );
}

function HeatmapPreview() {
  const { tokens } = useTheme();
  const intensities = [0.2, 0.5, 0.85, 0.35, 0.65, 1, 0.25, 0.45, 0.75, 0.3, 0.9, 0.55, 0.15, 0.6, 0.4, 0.8, 0.5, 0.7];
  return (
    <Stage>
      {intensities.map((t, i) => (
        <Rect
          key={i}
          x={28 + (i % 6) * 25}
          y={4 + Math.floor(i / 6) * 20}
          width={17}
          height={16}
          rx={3}
          fill={alpha(tokens.primary, Math.max(0.12, t))}
        />
      ))}
    </Stage>
  );
}

function BarListPreview() {
  const { tokens } = useTheme();
  // Three ranked rows: swatch, label line, and a shortening track bar.
  const rows = [
    { w: 150, fill: tokens["chart-1"] },
    { w: 104, fill: tokens["chart-2"] },
    { w: 62, fill: tokens["chart-3"] },
  ];
  return (
    <Stage>
      {rows.map((r, i) => (
        <G key={i}>
          <Rect x={8} y={6 + i * 20} width={6} height={6} rx={1.5} fill={r.fill} />
          <Rect x={20} y={7.5 + i * 20} width={46} height={3} rx={1.5} fill={alpha(tokens["muted-foreground"], 0.4)} />
          <Rect x={8} y={15 + i * 20} width={W - 16} height={3} rx={1.5} fill={alpha(tokens["muted-foreground"], 0.18)} />
          <Rect x={8} y={15 + i * 20} width={r.w} height={3} rx={1.5} fill={r.fill} />
        </G>
      ))}
    </Stage>
  );
}

function MetricBreakdownPreview() {
  const { tokens } = useTheme();
  return (
    <Stage>
      {/* Headline block and rate. */}
      <Rect x={8} y={6} width={44} height={8} rx={2} fill={tokens.foreground} />
      <Rect x={8} y={18} width={28} height={4} rx={1.5} fill={alpha(tokens["muted-foreground"], 0.6)} />
      <Rect x={W - 34} y={6} width={26} height={5} rx={1.5} fill={alpha(tokens.destructive, 0.8)} />
      {/* Tiny trend. */}
      <Polyline
        points={`8,${34} 40,${31} 72,${32} 104,${28} 136,${29} 168,${26} ${W - 8},${27}`}
        fill="none"
        stroke={tokens["chart-1"]}
        strokeWidth={1.5}
      />
      {/* Two share rows. */}
      <Rect x={8} y={44} width={W - 16} height={3} rx={1.5} fill={alpha(tokens["muted-foreground"], 0.18)} />
      <Rect x={8} y={44} width={128} height={3} rx={1.5} fill={tokens["chart-1"]} />
      <Rect x={8} y={54} width={W - 16} height={3} rx={1.5} fill={alpha(tokens["muted-foreground"], 0.18)} />
      <Rect x={8} y={54} width={74} height={3} rx={1.5} fill={tokens["chart-2"]} />
    </Stage>
  );
}

function UptimeBarPreview() {
  const { tokens } = useTheme();
  // A pill strip with one degraded and one down period among operational.
  const status = (i: number) => (i === 9 ? alpha(tokens.destructive, 0.9) : i === 14 ? alpha(tokens["chart-3"], 0.9) : alpha(tokens["chart-2"], 0.8));
  return (
    <Stage>
      {Array.from({ length: 24 }, (_, i) => (
        <Rect key={i} x={4 + i * 8} y={22} width={6} height={20} rx={1.5} fill={status(i)} />
      ))}
    </Stage>
  );
}

function ServiceHealthPreview() {
  const { tokens } = useTheme();
  const rows = [
    { dot: alpha(tokens["chart-2"], 0.9), y: 8 },
    { dot: alpha(tokens["chart-3"], 0.9), y: 28 },
    { dot: alpha(tokens["chart-2"], 0.9), y: 48 },
  ];
  return (
    <Stage>
      {rows.map((r, i) => (
        <G key={i}>
          <Circle cx={12} cy={r.y + 4} r={4} fill={r.dot} />
          <Rect x={24} y={r.y} width={58} height={7} rx={2} fill={alpha(tokens["muted-foreground"], 0.5)} />
          <Rect x={W - 44} y={r.y} width={36} height={7} rx={2} fill={alpha(tokens["muted-foreground"], 0.25)} />
        </G>
      ))}
    </Stage>
  );
}

function BulletPreview() {
  const { tokens } = useTheme();
  const rows = [
    { bands: [150, 110, 70], value: 120, target: 140, y: 8 },
    { bands: [150, 100, 60], value: 84, target: 110, y: 28 },
    { bands: [150, 120, 80], value: 148, target: 132, y: 48 },
  ];
  return (
    <Stage>
      {rows.map((r, i) => (
        <G key={i}>
          {r.bands.map((b, bi) => (
            <Rect key={bi} x={30} y={r.y} width={b} height={10} rx={2} fill={alpha(tokens["muted-foreground"], 0.12 + bi * 0.1)} />
          ))}
          <Rect x={30} y={r.y + 2.5} width={r.value} height={5} rx={1.5} fill={tokens.primary} />
          <Rect x={30 + r.target} y={r.y - 1} width={2} height={12} fill={tokens.foreground} />
          <Rect x={6} y={r.y + 3} width={18} height={4} rx={1.5} fill={alpha(tokens["muted-foreground"], 0.5)} />
        </G>
      ))}
    </Stage>
  );
}

function ProgressRingPreview() {
  const { tokens } = useTheme();
  // A ring at ~70%: the track circle plus a value arc from 12 o'clock.
  return (
    <Stage>
      <Circle cx={100} cy={32} r={24} fill="none" stroke={tokens.muted} strokeWidth={7} />
      <Path
        d="M 100 8 A 24 24 0 1 1 77.2 39.4"
        fill="none"
        stroke={tokens.primary}
        strokeWidth={7}
        strokeLinecap="round"
      />
    </Stage>
  );
}

function ComposedPreview() {
  const { tokens } = useTheme();
  const bars = [26, 38, 20, 44, 32, 52];
  return (
    <Stage>
      {bars.map((v, i) => (
        <Rect key={i} x={10 + i * 31} y={H - v} width={16} height={v} rx={3} fill={alpha(tokens["chart-1"], 0.85)} />
      ))}
      <Polyline
        points={`18,${H - 34} 49,${H - 42} 80,${H - 30} 111,${H - 50} 142,${H - 44} 173,${H - 56}`}
        fill="none"
        stroke={tokens["chart-3"]}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </Stage>
  );
}

function RangeAreaPreview() {
  const { tokens } = useTheme();
  return (
    <Stage>
      <Path
        d={`M0,${H - 40} C40,${H - 48} 80,${H - 34} 120,${H - 44} S180,${H - 52} ${W},${H - 48} L${W},${H - 24} C160,${H - 28} 120,${H - 16} 80,${H - 22} S30,${H - 16} 0,${H - 20} Z`}
        fill={alpha(tokens["chart-1"], 0.25)}
      />
      <Path
        d={`M0,${H - 30} C40,${H - 36} 80,${H - 26} 120,${H - 33} S180,${H - 40} ${W},${H - 36}`}
        fill="none"
        stroke={tokens["chart-1"]}
        strokeWidth={2}
      />
    </Stage>
  );
}

function HistogramPreview() {
  const { tokens } = useTheme();
  const counts = [6, 14, 26, 40, 34, 22, 12, 5];
  return (
    <Stage>
      {counts.map((c, i) => (
        <Rect key={i} x={8 + i * 23.5} y={H - 6 - c} width={21} height={c} rx={2} fill={alpha(tokens.primary, 0.85)} />
      ))}
    </Stage>
  );
}

function BoxPlotPreview() {
  const { tokens } = useTheme();
  const boxes = [
    { cx: 40, min: 52, q1: 42, med: 34, q3: 24, max: 12 },
    { cx: 100, min: 56, q1: 46, med: 40, q3: 30, max: 18 },
    { cx: 160, min: 48, q1: 38, med: 28, q3: 20, max: 8 },
  ];
  return (
    <Stage>
      {boxes.map((b, i) => (
        <G key={i}>
          <Line x1={b.cx} y1={b.max} x2={b.cx} y2={b.min} stroke={tokens.primary} strokeWidth={1.5} />
          <Rect x={b.cx - 12} y={b.q3} width={24} height={b.q1 - b.q3} rx={2} fill={alpha(tokens.primary, 0.25)} stroke={tokens.primary} strokeWidth={1.5} />
          <Line x1={b.cx - 12} y1={b.med} x2={b.cx + 12} y2={b.med} stroke={tokens.primary} strokeWidth={2} />
        </G>
      ))}
    </Stage>
  );
}

function WaterfallPreview() {
  const { tokens } = useTheme();
  // start, rise, rise, fall, total: the running-total bridge silhouette.
  const bars = [
    { x: 8, y: 28, h: 30, fill: tokens.primary },
    { x: 47, y: 16, h: 12, fill: alpha(tokens["chart-2"], 0.9) },
    { x: 86, y: 8, h: 8, fill: alpha(tokens["chart-2"], 0.9) },
    { x: 125, y: 8, h: 14, fill: alpha(tokens.destructive, 0.9) },
    { x: 164, y: 22, h: 36, fill: tokens.primary },
  ];
  return (
    <Stage>
      {bars.map((b, i) => (
        <Rect key={i} x={b.x} y={b.y} width={28} height={b.h} rx={2} fill={b.fill} />
      ))}
      {bars.slice(0, -1).map((b, i) => (
        <Line key={`c${i}`} x1={b.x + 28} y1={i === 3 ? b.y + b.h : b.y} x2={bars[i + 1].x} y2={i === 3 ? b.y + b.h : bars[i + 1].y + (i === 2 ? 0 : 0)} stroke={alpha(tokens["muted-foreground"], 0.5)} strokeWidth={1} />
      ))}
    </Stage>
  );
}

function RadialBarPreview() {
  const { tokens } = useTheme();
  const rings = [
    { r: 12, frac: 0.8, color: tokens["chart-1"] },
    { r: 20, frac: 0.55, color: tokens["chart-2"] },
    { r: 28, frac: 0.35, color: tokens["chart-3"] },
  ];
  const arc = (r: number, frac: number) => {
    const a = frac * 2 * Math.PI;
    const x = 100 + r * Math.sin(a);
    const y = 32 - r * Math.cos(a);
    return `M 100 ${32 - r} A ${r} ${r} 0 ${frac > 0.5 ? 1 : 0} 1 ${x} ${y}`;
  };
  return (
    <Stage>
      {rings.map((ring, i) => (
        <G key={i}>
          <Circle cx={100} cy={32} r={ring.r} fill="none" stroke={alpha(tokens["muted-foreground"], 0.2)} strokeWidth={5} />
          <Path d={arc(ring.r, ring.frac)} fill="none" stroke={ring.color} strokeWidth={5} strokeLinecap="round" />
        </G>
      ))}
    </Stage>
  );
}

function FunnelPreview() {
  const { tokens } = useTheme();
  const widths = [180, 122, 74, 40];
  return (
    <Stage>
      {widths.map((w, i) => {
        const next = widths[i + 1] ?? w;
        const y0 = i * 16;
        return (
          <Path
            key={i}
            d={`M ${100 - w / 2} ${y0} L ${100 + w / 2} ${y0} L ${100 + next / 2} ${y0 + 13} L ${100 - next / 2} ${y0 + 13} Z`}
            fill={tokens[`chart-${i + 1}` as "chart-1"]}
          />
        );
      })}
    </Stage>
  );
}

function RadarPreview() {
  const { tokens } = useTheme();
  const pt = (r: number, i: number) => {
    const a = (i / 5) * 2 * Math.PI;
    return `${100 + r * Math.sin(a)},${34 - r * Math.cos(a)}`;
  };
  const ring = (r: number) => Array.from({ length: 5 }, (_, i) => pt(r, i)).join(" ");
  return (
    <Stage>
      <Polyline points={`${ring(28)} ${pt(28, 0)}`} fill="none" stroke={alpha(tokens["muted-foreground"], 0.3)} strokeWidth={1} />
      <Polyline points={`${ring(16)} ${pt(16, 0)}`} fill="none" stroke={alpha(tokens["muted-foreground"], 0.3)} strokeWidth={1} />
      <Polyline
        points={`${[26, 18, 24, 12, 22].map((r, i) => pt(r, i)).join(" ")} ${pt(26, 0)}`}
        fill={alpha(tokens["chart-1"], 0.2)}
        stroke={tokens["chart-1"]}
        strokeWidth={2}
      />
    </Stage>
  );
}

function TreemapPreview() {
  const { tokens } = useTheme();
  const tiles = [
    { x: 4, y: 4, w: 96, h: 56, fill: tokens["chart-1"] },
    { x: 102, y: 4, w: 56, h: 34, fill: tokens["chart-2"] },
    { x: 160, y: 4, w: 36, h: 34, fill: tokens["chart-3"] },
    { x: 102, y: 40, w: 40, h: 20, fill: tokens["chart-4"] },
    { x: 144, y: 40, w: 52, h: 20, fill: tokens["chart-5"] },
  ];
  return (
    <Stage>
      {tiles.map((t, i) => (
        <Rect key={i} x={t.x} y={t.y} width={t.w} height={t.h} rx={3} fill={t.fill} />
      ))}
    </Stage>
  );
}

export const CHARTS_TILES: CatTile[] = [
  { title: "Chart", href: "/components/chart", Preview: BarsPreview },
  { title: "LineChart", href: "/components/line-chart", Preview: LinePreview },
  { title: "AreaChart", href: "/components/area-chart", Preview: AreaPreview },
  { title: "PieChart", href: "/components/pie-chart", Preview: PiePreview },
  { title: "ScatterPlot", href: "/components/scatter-plot", Preview: ScatterPreview },
  { title: "CandlestickChart", href: "/components/candlestick-chart", Preview: CandlestickPreview },
  { title: "DepthChart", href: "/components/depth-chart", Preview: DepthPreview },
  { title: "StackedBar", href: "/components/stacked-bar", Preview: StackedBarPreview },
  { title: "Gauge", href: "/components/gauge", Preview: GaugePreview },
  { title: "Heatmap", href: "/components/heatmap", Preview: HeatmapPreview },
  { title: "BarList", href: "/components/bar-list", Preview: BarListPreview },
  { title: "MetricBreakdown", href: "/components/metric-breakdown", Preview: MetricBreakdownPreview },
  { title: "UptimeBar", href: "/components/uptime-bar", Preview: UptimeBarPreview },
  { title: "ServiceHealthList", href: "/components/service-health-list", Preview: ServiceHealthPreview },
  { title: "BulletChart", href: "/components/bullet-chart", Preview: BulletPreview },
  { title: "ProgressRing", href: "/components/progress-ring", Preview: ProgressRingPreview },
  { title: "ComposedChart", href: "/components/composed-chart", Preview: ComposedPreview },
  { title: "RangeAreaChart", href: "/components/range-area-chart", Preview: RangeAreaPreview },
  { title: "Histogram", href: "/components/histogram", Preview: HistogramPreview },
  { title: "BoxPlot", href: "/components/box-plot", Preview: BoxPlotPreview },
  { title: "WaterfallChart", href: "/components/waterfall-chart", Preview: WaterfallPreview },
  { title: "RadialBarChart", href: "/components/radial-bar-chart", Preview: RadialBarPreview },
  { title: "FunnelChart", href: "/components/funnel-chart", Preview: FunnelPreview },
  { title: "RadarChart", href: "/components/radar-chart", Preview: RadarPreview },
  { title: "Treemap", href: "/components/treemap", Preview: TreemapPreview },
];
