import { useState } from "react";
import { Button, Card, Column, Row, Sidebar, ThemeProvider, Typography, useReducedMotion } from "@nannier-com/canvas";

// The hover-feedback harness, the inner loop for Dark Factory's hover lifts (the
// `df-hover-lift` reference card in tools/native/liquid-motion.md): the real controls the
// feedback runs on, through the public API, under the palette, scheme and material
// drivers it has to hold in. The pointer is the driver: the recorder's action module
// moves it over each target, as the reference's recording did. The readouts name the live
// mode and whether Reduce Motion has made every change instant. Hover exists on the web
// only (React Native delivers no pointer hover on iOS or Android by default), so the
// native smoke app shows the same controls at rest.

function Readouts({ glass, dark, mint, presses }: { glass: boolean; dark: boolean; mint: boolean; presses: number }) {
  const reduced = useReducedMotion();
  return <>
    <Typography testID="hover-mode">Mode: {glass ? "glass" : "solid"}; scheme: {dark ? "dark" : "light"}; palette: {mint ? "mint" : "blush"}</Typography>
    <Typography testID="hover-reduced-motion">Reduce Motion: {reduced ? "on, changes are instant" : "off"}</Typography>
    <Typography testID="hover-presses">Presses: {presses}</Typography>
  </>;
}

export function HoverBody() {
  const [glass, setGlass] = useState(false);
  const [dark, setDark] = useState(false);
  const [mint, setMint] = useState(false);
  const [presses, setPresses] = useState(0);
  const press = () => setPresses((count) => count + 1);
  return <ThemeProvider glass={glass} solid={!glass} dark={dark} light={!dark} mint={mint}>
    <Column relaxed>
      <Typography h3>Hover feedback</Typography>
      <Readouts glass={glass} dark={dark} mint={mint} presses={presses} />
      <Row snug wrap>
        <Button onPress={() => setGlass((value) => !value)} testID="hover-material-toggle">Switch material</Button>
        <Button onPress={() => setDark((value) => !value)} testID="hover-scheme-toggle">Switch scheme</Button>
        <Button onPress={() => setMint((value) => !value)} testID="hover-palette-toggle">Switch palette</Button>
      </Row>
      <Row relaxed stacks>
        <Card onPress={press} title="Scout" description="A pressable card: rises 2 px, its shade deepens" testID="hover-card" />
        <Card raised onPress={press} title="Mint" description="A raised pressable card: rises, shade kept" testID="hover-card-raised" />
        <Card title="Static" description="Not pressable: no hover feedback" testID="hover-card-static" />
      </Row>
      <Row snug wrap>
        <Button primary onPress={press} testID="hover-primary">Approve</Button>
        <Button primary disabled onPress={press} testID="hover-primary-disabled">Disabled</Button>
        <Button secondary onPress={press} testID="hover-secondary">Review</Button>
        <Button outline onPress={press} testID="hover-outline">Details</Button>
      </Row>
      <Sidebar
        bordered
        defaultActive="Roster"
        testID="hover-sidebar"
        items={[
          { label: "Board", icon: "layoutGrid" },
          { label: "Roster", icon: "users" },
          { label: "Runs", icon: "activity" },
          { label: "Inbox", icon: "inbox", badge: "3" },
        ]}
      />
    </Column>
  </ThemeProvider>;
}
