import { useEffect, useRef, useState } from "react";
import { Backdrop, BackdropHost, Button, ButtonGroup, Card, Column, Dialog, Drawer, Dropdown, Input, Row, Slider, Switch, ThemeProvider, Typography } from "@nannier-com/canvas";

type Stats = { hosts: number; activeHosts: number; recordings: number; frostViews: number; frameListeners: number };
declare const require: (name: string) => unknown;
let capture: { available?: boolean; getCaptureStats?: () => Stats } | undefined;
try {
  capture = require("@ionizeio/canvas-blur") as typeof capture;
} catch { /* Omitted in the optional-peer consumer matrix. */ }

const blobs = [
  { color: "#1264d7", cx: 0.2, cy: 0.3, r: 0.5, o: 0.8, end: 1 },
  { color: "#d62e73", cx: 0.8, cy: 0.6, r: 0.5, o: 0.75, end: 1 },
];
let nextEditor = 0;

function LiveEditor({ onFocus }: { onFocus: () => void }) {
  const [identity] = useState(() => ++nextEditor);
  const [edits, setEdits] = useState(0);
  return <Card>
    <Column snug>
      <Input label="Material editor" defaultValue="Keep this selection" onFocus={onFocus} onChangeText={() => setEdits((count) => count + 1)} testID="material-editor" />
      <Typography testID="material-editor-identity">Editor instance: {identity}; edits: {edits}</Typography>
      <Switch defaultChecked testID="material-switch">Live updates</Switch>
      <Slider defaultValue={40} accessibilityLabel="Material intensity" testID="material-slider" />
      <ButtonGroup items={["Overview", "Activity", "Settings"]} defaultActive={1} testID="material-segments" />
    </Column>
  </Card>;
}

export function MaterialsBody() {
  const [glass, setGlass] = useState(false);
  const [dark, setDark] = useState(false);
  const [nested, setNested] = useState(false);
  const [moving, setMoving] = useState(false);
  const [message, setMessage] = useState("Ready");
  const [scheduledFrom, setScheduledFrom] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingFocus = useRef(false);
  const motionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (motionTimer.current) clearTimeout(motionTimer.current);
  }, []);
  // A finite live scene exercises capture, then becomes idle for native
  // accessibility-driven input and focus checks on the same mounted editor.
  const animateBackdrop = () => {
    if (motionTimer.current) clearTimeout(motionTimer.current);
    setMoving(true);
    motionTimer.current = setTimeout(() => {
      setMoving(false);
      motionTimer.current = null;
    }, 3000);
  };
  const schedule = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    pendingFocus.current = true;
    setMessage("Focus an editor to start the switch");
  };
  const focusEditor = () => {
    if (!pendingFocus.current) return;
    pendingFocus.current = false;
    setScheduledFrom(glass ? "glass" : "solid");
    setMessage("Switch scheduled");
    timer.current = setTimeout(() => {
      setGlass((value) => !value);
      setMessage("Switch complete");
      timer.current = null;
    }, 3000);
  };
  const inspect = () => setStats(capture?.getCaptureStats?.() ?? null);
  return <ThemeProvider glass={glass} solid={!glass} dark={dark} light={!dark}>
    <BackdropHost>
      <Backdrop calm vivid still={!moving}><Backdrop.Gradient blobs={blobs} drift /></Backdrop>
      <Column relaxed>
        <Typography h3>Material lifecycle</Typography>
        <Typography testID="material-mode">Mode: {glass ? "glass" : "solid"}; scheme: {dark ? "dark" : "light"}</Typography>
        <Row snug wrap>
          <Button onPress={() => setGlass((value) => !value)} testID="material-toggle">Switch material</Button>
          <Button onPress={() => setDark((value) => !value)}>Switch scheme</Button>
          <Button onPress={schedule} testID="material-schedule">Switch after focusing editor</Button>
          <Button onPress={inspect} testID="material-inspect">Inspect capture</Button>
          <Button onPress={animateBackdrop} testID="material-animate">Animate backdrop</Button>
        </Row>
        <Typography testID="material-timer">{message}</Typography>
        <Typography testID="material-focus-mode">{scheduledFrom ? `Focus began in ${scheduledFrom}` : "No focused switch yet"}</Typography>
        <Typography testID="material-backdrop-motion">Backdrop {moving ? "moving" : "still"}</Typography>
        <Typography testID="material-native">Native capture: {capture?.available ? "available" : "unavailable"}</Typography>
        <Typography testID="material-capture-stats">{stats ? `Hosts: ${stats.hosts}; active: ${stats.activeHosts}; recordings: ${stats.recordings}; frost: ${stats.frostViews}; listeners: ${stats.frameListeners}` : "Capture not inspected"}</Typography>
        <LiveEditor onFocus={focusEditor} />
        <Dropdown trigger="Material menu" items={[{ label: "Keep editor" }, { label: "Review settings" }]} />
        <Dialog trigger="Material dialog" title="Live dialog" withBody overlay />
        <Drawer trigger="Material drawer" right><Column relaxed><Typography h3>Native window</Typography><Input label="Drawer editor" defaultValue="Retain me" onFocus={focusEditor} /><Dropdown trigger="Drawer menu" items={[{ label: "Nested choice" }]} /><Button onPress={animateBackdrop} testID="material-drawer-animate">Animate behind drawer</Button><Typography testID="material-drawer-motion">Backdrop {moving ? "moving" : "still"}</Typography><Button onPress={schedule}>Switch after focusing editor</Button></Column></Drawer>
        <Switch checked={nested} onChange={setNested} testID="material-nested">Nested glass</Switch>
        <ThemeProvider glass={nested} solid={!nested}>
          <Card><Typography>Nested glass remains active while its parent is solid.</Typography></Card>
        </ThemeProvider>
      </Column>
    </BackdropHost>
  </ThemeProvider>;
}
