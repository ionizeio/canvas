import { useEffect, useRef, useState } from "react";
import { Platform, useWindowDimensions, type View as NativeView } from "react-native";
import { Backdrop, BackdropHost, Button, Column, Input, OverlayProvider, Row, ThemeProvider, Typography, useTheme } from "@ionizeio/canvas";
import { LiquidAnchoredOverlay } from "../../../../src/style/liquid-anchored-overlay";

type CaptureStats = { hosts: number; activeHosts: number; recordings: number; frostViews: number; frameListeners: number };
declare const require: (name: string) => unknown;
let capture: { getCaptureStats?: () => CaptureStats } | undefined;
try { capture = require("@ionizeio/canvas-blur") as typeof capture; } catch { /* Optional native integration. */ }

const blobs = [
  { color: "#1264d7", cx: 0.2, cy: 0.3, r: 0.5, o: 0.8, end: 1 },
  { color: "#d62e73", cx: 0.8, cy: 0.6, r: 0.5, o: 0.75, end: 1 },
];

/** Private runtime probe: production popup geometry without enabling a component. */
export function LiquidGeometryProbe({ initialGlass, dark }: { initialGlass: boolean; dark: boolean }) {
  const [glass, setGlass] = useState(initialGlass);
  const { height } = useWindowDimensions();
  return <ThemeProvider glass={glass} solid={!glass} dark={dark} light={!dark}>
    <BackdropHost>
      <Backdrop calm vivid still><Backdrop.Gradient blobs={blobs} /></Backdrop>
      {/* A viewport-sized test stage lets the popup sample the same still scene. */}
      <OverlayProvider style={{ minHeight: height }}>
        <GeometryBody glass={glass} onMaterial={() => setGlass((value) => !value)} />
      </OverlayProvider>
    </BackdropHost>
  </ThemeProvider>;
}

function GeometryBody({ glass, onMaterial }: { glass: boolean; onMaterial: () => void }) {
  const { tokens } = useTheme();
  const anchor = useRef<NativeView>(null);
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState("Ready");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frame = useRef(0);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    cancelAnimationFrame(frame.current);
  }, []);
  const run = () => {
    if (running) return;
    setRunning(true);
    setResult("Recording six cycles");
    const before = capture?.getCaptureStats?.() ?? null;
    const intervals: number[] = [];
    const phaseIntervals: number[][] = [];
    let step = 0;
    let previous: number | null = null;
    const sample = (now: number) => {
      if (previous !== null) {
        intervals.push(now - previous);
        (phaseIntervals[step] ??= []).push(now - previous);
      }
      previous = now;
      frame.current = requestAnimationFrame(sample);
    };
    frame.current = requestAnimationFrame(sample);
    const advance = () => {
      setOpen(step % 2 === 0);
      step++;
      if (step < 12) timer.current = setTimeout(advance, 1500);
      else timer.current = setTimeout(() => {
        cancelAnimationFrame(frame.current);
        const sorted = [...intervals].sort((a, b) => a - b);
        const p95 = sorted[Math.floor((sorted.length - 1) * 0.95)] ?? 0;
        const phases = phaseIntervals.flatMap((values, index) => {
          if (!values) return [];
          const ordered = [...values].sort((a, b) => a - b);
          return [{ cycle: Math.ceil(index / 2), open: index % 2 === 1, frames: values.length, p95: ordered[Math.floor((ordered.length - 1) * 0.95)], maximum: ordered.at(-1) }];
        });
        const record = { runtime: Platform.OS, glass, frames: intervals.length, p95, maximum: sorted.at(-1), phases, before, after: capture?.getCaptureStats?.() ?? null };
        console.log("CANVAS_LIQUID_GEOMETRY_V1", JSON.stringify(record));
        setResult(`Complete: ${glass ? "glass" : "solid"}; frames ${intervals.length}; p95 ${p95.toFixed(1)}ms; max ${record.maximum?.toFixed(1)}ms; frost ${record.after?.frostViews ?? "n/a"}; listeners ${record.after?.frameListeners ?? "n/a"}`);
        setRunning(false);
        timer.current = null;
      }, 1500);
    };
    advance();
  };
  return <Column relaxed>
    <Typography h3>Isolated liquid geometry</Typography>
    <Typography testID="geometry-mode">Mode: {glass ? "glass" : "solid"}; static backdrop</Typography>
    <Row snug wrap>
      <Button onPress={onMaterial} disabled={running} testID="geometry-material">Switch material</Button>
      <Button onPress={run} disabled={running} testID="geometry-run">Run six cycles</Button>
    </Row>
    <Typography testID="geometry-result">{result}</Typography>
    <Button ref={anchor} onPress={() => setOpen((value) => !value)} testID="geometry-trigger">Open geometry panel</Button>
    <LiquidAnchoredOverlay open={open} onDismiss={() => setOpen(false)} triggerRef={anchor} cardWidth={300} dense
      cardStyle={{ width: 300, backgroundColor: tokens.popover, borderRadius: 20, padding: 16 }}>
      <Column snug>
        <Typography h4>Stable menu content</Typography>
        <Input label="Preserved editor" defaultValue="Unscaled text" />
        {Array.from({ length: 6 }, (_, index) => <Button key={index} ghost small onPress={() => setOpen(false)}>Option {index + 1}</Button>)}
      </Column>
    </LiquidAnchoredOverlay>
  </Column>;
}
