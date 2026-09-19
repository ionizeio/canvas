import { useEffect, useRef, useState } from "react";
import { Autocomplete, Backdrop, BackdropHost, Button, Card, Column, Dropdown, Row, ThemeProvider, Typography } from "@nannier-com/canvas";

// The same list the form-autocomplete fixture offers, declared here because a
// fixture body may import only React and the kit (tools/native/shared-fixtures).
const fruit = [
  "Apple", "Apricot", "Banana", "Cherry", "Dates", "Elderberry", "Fig", "Grapefruit",
  "Guava", "Kiwi", "Lemon", "Mango", "Nectarine", "Orange", "Papaya", "Peach",
  "Pear", "Pineapple", "Plum", "Raspberry", "Strawberry", "Tangerine", "Watermelon",
];
const blobs = [
  { color: "#1264d7", cx: 0.2, cy: 0.3, r: 0.5, o: 0.8, end: 1 },
  { color: "#d62e73", cx: 0.8, cy: 0.6, r: 0.5, o: 0.75, end: 1 },
];
const actions = [
  { label: "Open" },
  { label: "Rename" },
  { label: "Duplicate" },
  { label: "Archive", separatorBefore: true },
  { label: "Delete", destructive: true },
];

// How many open-and-close pairs the cycle driver runs, and how far apart: far
// enough for an opening to settle before its close, close enough that a run of
// five fits one recording, with the last close landing mid-exit of nothing.
const CYCLE_PAIRS = 5;
const CYCLE_STEP_MS = 700;

// The liquid popup harness: the real Autocomplete suggestion list and the real
// Dropdown menu, opened and closed by controlled drivers so a recording or a
// native runner can trigger an opening, a close, a reopen mid-exit and a burst of
// cycles without a precise tap on a chevron. Under glass the popup policy grows
// the material from a droplet at the anchor with the rows scaling in, and shrinks
// it back on close; solid mode keeps the ordinary entrance, which the material
// driver switches between. It starts solid and light unless the route says
// otherwise, so a recording captures the switches on purpose. The readouts carry
// test ids so a check reads state instead of pixels.
export function PopupBody({ glass: initialGlass = false, dark: initialDark = false }: { glass?: boolean; dark?: boolean }) {
  const [glass, setGlass] = useState(initialGlass);
  const [dark, setDark] = useState(initialDark);
  const [listOpen, setListOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cycles, setCycles] = useState(0);
  const [cycling, setCycling] = useState(false);
  const cycle = useRef<ReturnType<typeof setInterval> | null>(null);
  // A four-second requestAnimationFrame trace, read from the readout after the
  // drivers: the numeric half of a recorded run on platforms with no page probe.
  const [frames, setFrames] = useState("Frames: not sampled");
  const trace = useRef<{ handle: number; timer: ReturnType<typeof setTimeout> } | null>(null);
  useEffect(() => () => {
    if (cycle.current) clearInterval(cycle.current);
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
  // Open and close the list in a fixed rhythm: the resource and reversal check
  // (listeners, lens definitions, a reopen landing while the exit is still
  // painting) that a hand-driven run cannot time repeatably.
  const runCycles = () => {
    if (cycle.current) return;
    let step = 0;
    setCycling(true);
    cycle.current = setInterval(() => {
      step += 1;
      setListOpen(step % 2 === 1);
      if (step % 2 === 0) setCycles((count) => count + 1);
      if (step >= CYCLE_PAIRS * 2 && cycle.current) {
        clearInterval(cycle.current);
        cycle.current = null;
        setCycling(false);
      }
    }, CYCLE_STEP_MS);
  };
  // The host paints its scene across its parent's box, so a Column of its own
  // keeps the gradient behind this section instead of behind the whole fixture.
  return (
    <Column testID="popup-harness">
      <ThemeProvider glass={glass} solid={!glass} dark={dark} light={!dark}>
        <BackdropHost>
          <Backdrop calm vivid still><Backdrop.Gradient blobs={blobs} /></Backdrop>
          <Column relaxed>
            <Typography h3>Liquid popup</Typography>
            <Typography testID="popup-mode">Mode: {glass ? "glass" : "solid"}; scheme: {dark ? "dark" : "light"}</Typography>
            <Row snug wrap>
              <Button onPress={() => setGlass((value) => !value)} testID="popup-material">Switch material</Button>
              <Button onPress={() => setDark((value) => !value)} testID="popup-scheme">Switch scheme</Button>
              <Button onPress={() => setListOpen(true)} testID="popup-open-list">Open list</Button>
              <Button onPress={() => setListOpen(false)} testID="popup-close-list">Close list</Button>
              <Button onPress={() => setListOpen((value) => !value)} testID="popup-toggle-list">Toggle list</Button>
              <Button onPress={() => setMenuOpen((value) => !value)} testID="popup-toggle-menu">Toggle menu</Button>
              <Button onPress={runCycles} disabled={cycling} testID="popup-cycle">Cycle list</Button>
              <Button onPress={sample} testID="popup-sample">Sample frames</Button>
            </Row>
            <Typography testID="popup-frame-readout">{frames}</Typography>
            <Typography testID="popup-list-readout">List: {listOpen ? "open" : "closed"}; cycles: {cycles}</Typography>
            <Autocomplete label="Fruit" options={fruit} open={listOpen} onOpenChange={setListOpen} testID="popup-autocomplete" />
            <Typography testID="popup-menu-readout">Menu: {menuOpen ? "open" : "closed"}</Typography>
            <Dropdown trigger="Fruit actions" items={actions} open={menuOpen} onOpenChange={setMenuOpen} testID="popup-dropdown" />
            {/* Room for the list below the field, so the fitter keeps it under the
                anchor instead of flipping it above on a short page. */}
            <Card>
              <Column snug>
                <Typography h4>Reading a run</Typography>
                <Typography small muted>Open: the pane starts as a droplet at the anchor with the rows already in it, grows past its resting size, and settles while the rows sharpen.</Typography>
                <Typography small muted>Close: the rows fade first, then the pane shrinks back into the anchor edge. A reopen mid-exit grows from wherever the pane is.</Typography>
                <Typography small muted>Cycle: five open-and-close pairs at a fixed rhythm, for the resource counters and the reversal case.</Typography>
              </Column>
            </Card>
          </Column>
        </BackdropHost>
      </ThemeProvider>
    </Column>
  );
}
