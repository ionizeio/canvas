import { useEffect, useRef, useState } from "react";
import { Backdrop, BackdropHost, Button, Column, Icon, Row, TabBar, Tabs, ThemeProvider, Typography } from "@nannier-com/canvas";

const tabs = [{ label: "Overview" }, { label: "Activity" }, { label: "Unavailable", disabled: true }];

export function TabsBody({ disabled = false }: { disabled?: boolean }) {
  const [selected, setSelected] = useState(0);
  const [changes, setChanges] = useState(0);
  return (
    <Column relaxed>
      <Tabs tabs={tabs} defaultActive={0} disabled={disabled} testID="workspace-tabs"
        onSelect={(index) => {
          setSelected(index);
          setChanges((count) => count + 1);
        }} />
      <Typography testID="tabs-selection">Selected tab: {tabs[selected]?.label ?? "Unknown"}</Typography>
      <Typography small muted testID="tabs-change-count">Changes: {changes}</Typography>
      <LiquidSelection disabled={disabled} />
    </Column>
  );
}

const pills = ["All", "Active", "Archived", "Drafts"];
const destinations = [
  { key: "home", label: "Home", icon: (active: boolean) => <Icon home size={22} primary={active} muted={!active} /> },
  { key: "search", label: "Search", icon: (active: boolean) => <Icon search size={22} primary={active} muted={!active} /> },
  { key: "profile", label: "Profile", icon: (active: boolean) => <Icon user size={22} primary={active} muted={!active} /> },
];
const blobs = [
  { color: "#1264d7", cx: 0.2, cy: 0.3, r: 0.5, o: 0.8, end: 1 },
  { color: "#d62e73", cx: 0.8, cy: 0.6, r: 0.5, o: 0.75, end: 1 },
];

// The liquid selection harness: in glass mode the pill Tabs selection and the
// TabBar indicator travel as measured surfaces (stretch, recoil, settle). It
// starts solid so a recording captures the material switch on purpose, and the
// "Next" buttons advance the controlled selections without a precise tap, which
// is what a native runner or a recorded run needs. The readouts carry test ids so
// a check reads state instead of pixels.
function LiquidSelection({ disabled }: { disabled: boolean }) {
  const [glass, setGlass] = useState(false);
  const [pill, setPill] = useState(0);
  const [destination, setDestination] = useState("home");
  const nextDestination = () => setDestination((key) => {
    const index = destinations.findIndex((item) => item.key === key);
    return destinations[(index + 1) % destinations.length]!.key;
  });
  // A four-second requestAnimationFrame trace, read from the readout after the
  // hops: the numeric half of a recorded run on platforms with no page probe.
  const [frames, setFrames] = useState("Frames: not sampled");
  const trace = useRef<{ handle: number; timer: ReturnType<typeof setTimeout> } | null>(null);
  useEffect(() => () => {
    if (!trace.current) return;
    cancelAnimationFrame(trace.current.handle);
    clearTimeout(trace.current.timer);
  }, []);
  const sample = () => {
    if (trace.current) return;
    setFrames("Frames: sampling for 4 s");
    const intervals: number[] = [];
    let previous: number | null = null;
    const tick = (now: number) => {
      if (previous !== null) intervals.push(now - previous);
      previous = now;
      if (trace.current) trace.current.handle = requestAnimationFrame(tick);
    };
    const timer = setTimeout(() => {
      if (trace.current) cancelAnimationFrame(trace.current.handle);
      trace.current = null;
      const sorted = [...intervals].sort((a, b) => a - b);
      const at = (q: number) => sorted[Math.floor((sorted.length - 1) * q)] ?? 0;
      setFrames(`Frames: ${sorted.length}; p50 ${at(0.5).toFixed(1)} ms; p95 ${at(0.95).toFixed(1)} ms; max ${(sorted.at(-1) ?? 0).toFixed(1)} ms`);
    }, 4000);
    trace.current = { handle: requestAnimationFrame(tick), timer };
  };
  // The host paints its scene across its parent's box, so a Column of its own
  // keeps the gradient behind this section instead of behind the whole fixture.
  return (
    <Column testID="liquid-harness">
      <ThemeProvider glass={glass} solid={!glass}>
        <BackdropHost>
          <Backdrop calm vivid still><Backdrop.Gradient blobs={blobs} /></Backdrop>
          <Column relaxed>
            <Typography h3>Liquid selection</Typography>
            <Typography testID="liquid-mode">Mode: {glass ? "glass" : "solid"}</Typography>
            <Row snug wrap>
              <Button onPress={() => setGlass((value) => !value)} testID="liquid-material">Switch material</Button>
              <Button onPress={() => setPill((index) => (index + 1) % pills.length)} testID="liquid-next-tab">Next tab</Button>
              <Button onPress={nextDestination} testID="liquid-next-destination">Next destination</Button>
              <Button onPress={sample} testID="liquid-sample">Sample frames</Button>
            </Row>
            <Typography testID="liquid-frame-readout">{frames}</Typography>
            <Tabs pills tabs={pills} active={pill} onSelect={setPill} disabled={disabled} testID="liquid-tabs" />
            <Typography testID="liquid-pill-readout">Pill: {pills[pill]}</Typography>
            <TabBar items={destinations} active={destination} onSelect={setDestination} testID="liquid-tab-bar" />
            <Typography testID="liquid-destination-readout">Destination: {destination}</Typography>
          </Column>
        </BackdropHost>
      </ThemeProvider>
    </Column>
  );
}
