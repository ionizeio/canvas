import { useEffect, useRef, useState, type ComponentRef } from "react";
import { Autocomplete, Button, ButtonGroup, Card, Column, Command, Dialog, Drawer, Dropdown, Input, InputOTP, PhoneInput, Row, Select, Slider, Switch, ThemeProvider, Typography, useReducedMotion } from "@nannier-com/canvas";

type Stats = { hosts: number; activeHosts: number; recordings: number; frostViews: number; frameListeners: number };
declare const require: (name: string) => unknown;
let capture: { available?: boolean; getCaptureStats?: () => Stats } | undefined;
try {
  capture = require("@ionizeio/canvas-blur") as typeof capture;
} catch { /* Omitted in the optional-peer consumer matrix. */ }

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

// The code field's cells and caret: a driver focuses the field (a tap cannot reach its
// capture input on iOS), and the readout names the Reduce Motion preference, which holds
// the caret's blink.
function CodeField() {
  const field = useRef<ComponentRef<typeof InputOTP>>(null);
  const reduced = useReducedMotion();
  const [code, setCode] = useState("");
  return <Card>
    <Column snug>
      <Typography testID="material-otp-state">Reduce Motion: {reduced ? "on, the caret holds" : "off"}; code: {code || "empty"}</Typography>
      <InputOTP ref={field} value={code} onChangeText={setCode} testID="material-otp" />
      <Row snug wrap>
        <Button onPress={() => field.current?.focus()} testID="material-otp-focus">Focus the code field</Button>
        <Button onPress={() => setCode("")} testID="material-otp-clear">Clear the code</Button>
      </Row>
    </Column>
  </Card>;
}

export function MaterialsBody() {
  const [glass, setGlass] = useState(false);
  const [dark, setDark] = useState(false);
  // The palette driver: Dark Factory's mint against its blush, for the frost's mint row.
  const [mint, setMint] = useState(false);
  const [nested, setNested] = useState(false);
  const [message, setMessage] = useState("Ready");
  const [scheduledFrom, setScheduledFrom] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingFocus = useRef(false);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
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
  return <ThemeProvider glass={glass} solid={!glass} dark={dark} light={!dark} mint={mint}>
    <Column relaxed>
      <Typography h3>Material lifecycle</Typography>
      <Typography testID="material-mode">Mode: {glass ? "glass" : "solid"}; scheme: {dark ? "dark" : "light"}</Typography>
      <Typography testID="material-palette">Palette: {mint ? "mint" : "blush"}</Typography>
      <Row snug wrap>
        <Button onPress={() => setGlass((value) => !value)} testID="material-toggle">Switch material</Button>
        <Button onPress={() => setDark((value) => !value)}>Switch scheme</Button>
        <Button onPress={() => setMint((value) => !value)} testID="material-palette-toggle">Switch palette</Button>
        <Button onPress={schedule} testID="material-schedule">Switch after focusing editor</Button>
        <Button onPress={inspect} testID="material-inspect">Inspect capture</Button>
      </Row>
      <Typography testID="material-timer">{message}</Typography>
      <Typography testID="material-focus-mode">{scheduledFrom ? `Focus began in ${scheduledFrom}` : "No focused switch yet"}</Typography>
      <Typography testID="material-native">Native capture: {capture?.available ? "available" : "unavailable"}</Typography>
      <Typography testID="material-capture-stats">{stats ? `Hosts: ${stats.hosts}; active: ${stats.activeHosts}; recordings: ${stats.recordings}; frost: ${stats.frostViews}; listeners: ${stats.frameListeners}` : "Capture not inspected"}</Typography>
      <LiveEditor onFocus={focusEditor} />
      <Dropdown trigger="Material menu" items={[{ label: "Keep editor" }, { label: "Review settings" }]} />
      <Dialog trigger="Material dialog" title="Live dialog" withBody overlay />
      <Drawer trigger="Material drawer" right><Column relaxed><Typography h3>Native window</Typography><Input label="Drawer editor" defaultValue="Retain me" onFocus={focusEditor} /><Dropdown trigger="Drawer menu" items={[{ label: "Nested choice" }]} /><Button onPress={schedule}>Switch after focusing editor</Button></Column></Drawer>
      <Switch checked={nested} onChange={setNested} testID="material-nested">Nested glass</Switch>
      <ThemeProvider glass={nested} solid={!nested}>
        <Card><Typography>Nested glass remains active while its parent is solid.</Typography></Card>
      </ThemeProvider>
      {/* The field wells: under web glass the Select trigger, the Autocomplete, PhoneInput and
          the Command's search trigger are the clear well the Input is, the option lists the
          dense menu, and the Command's palette the functional panel. */}
      <Card>
        <Column snug>
          <Select label="Material select" options={["Keep editor", "Review settings"]} defaultValue="Keep editor" testID="material-select" />
          <Autocomplete label="Material search" options={["Ada Lovelace", "Grace Hopper"]} defaultValue="Grace Hopper" testID="material-search" />
          <PhoneInput label="Material phone" defaultCountry="GB" testID="material-phone" />
          <Command trigger footer testID="material-command" groups={[{ heading: "Editor", items: [{ label: "Keep editor", icon: "file", shortcut: "Ctrl+K" }, { label: "Review settings", icon: "settings" }] }]} />
        </Column>
      </Card>
      <CodeField />
    </Column>
  </ThemeProvider>;
}
