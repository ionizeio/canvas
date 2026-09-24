import { useState } from "react";
import { Avatar, AvatarGroup, Button, Card, Column, Row, ThemeProvider, Typography } from "@nannier-com/canvas";

// The identity-disc harness, the inner loop for the Avatar's Dark Factory look (the
// `df-avatar` reference card in tools/native/liquid-motion.md): the real Avatar through the
// public API, under the palette, scheme and material drivers the disc has to hold in. The
// first row mirrors the reference's: one initial on each of Dark Factory's ten stage hues,
// reached through names that resolve to them (test/avatar-harness.test.ts holds every name
// to its hue). The rest walks ten people across the ten hues, the sizes, the rounded
// square, the separator ring in a stack, a pressable disc, and the neutral glyph-less
// tile, the one Avatar that takes the control material. The discs sit on a Card, the
// surface the docs stage and the reference's playground both show them on.

/** A name that resolves to each stage hue, in the reference's order, all initialled "M". */
export const STAGES = [
  { hue: 20, name: "Mason Bao" },
  { hue: 45, name: "Mason Moreau" },
  { hue: 335, name: "Mason Chen" },
  { hue: 285, name: "Mason Novak" },
  { hue: 255, name: "Mason Nakamura" },
  { hue: 225, name: "Mason Kim" },
  { hue: 195, name: "Mason Tanaka" },
  { hue: 155, name: "Marcus Rossi" },
  { hue: 115, name: "Mason Okafor" },
  { hue: 70, name: "Mason Lovelace" },
] as const;

/** Ten people, one on each stage hue, with their own initials. */
export const PEOPLE = [
  { hue: 20, name: "Ada Ito" },
  { hue: 45, name: "Rachel Tanaka" },
  { hue: 335, name: "Liang Kim" },
  { hue: 285, name: "Kira Okafor" },
  { hue: 255, name: "Marcus Singh" },
  { hue: 225, name: "Noor Novak" },
  { hue: 195, name: "Sofia Bao" },
  { hue: 155, name: "Theo Lovelace" },
  { hue: 115, name: "Omar Moreau" },
  { hue: 70, name: "Priya Haddad" },
] as const;

export function AvatarBody() {
  const [glass, setGlass] = useState(false);
  const [dark, setDark] = useState(false);
  const [mint, setMint] = useState(false);
  const [presses, setPresses] = useState(0);
  const press = () => setPresses((count) => count + 1);
  return <ThemeProvider glass={glass} solid={!glass} dark={dark} light={!dark} mint={mint}>
    <Column relaxed>
      <Typography h3>Identity discs</Typography>
      <Typography testID="avatar-mode">Mode: {glass ? "glass" : "solid"}; scheme: {dark ? "dark" : "light"}; palette: {mint ? "mint" : "blush"}</Typography>
      <Typography testID="avatar-presses">Presses: {presses}</Typography>
      <Row snug wrap>
        <Button onPress={() => setGlass((value) => !value)} testID="avatar-material-toggle">Switch material</Button>
        <Button onPress={() => setDark((value) => !value)} testID="avatar-scheme-toggle">Switch scheme</Button>
        <Button onPress={() => setMint((value) => !value)} testID="avatar-palette-toggle">Switch palette</Button>
      </Row>
      <Card>
        <Column relaxed>
          <Row relaxed wrap testID="avatar-stages">
            {STAGES.map((stage) => <Column tight alignCenter key={stage.hue}>
              <Avatar large initials="M" name={stage.name} testID={`avatar-stage-${stage.hue}`} />
              <Typography caption muted>Stage {stage.hue}</Typography>
            </Column>)}
          </Row>
          <Row snug wrap testID="avatar-people">
            {PEOPLE.map((person) => <Avatar key={person.hue} name={person.name} testID={`avatar-person-${person.hue}`} />)}
          </Row>
          <Row relaxed alignCenter wrap>
            <Avatar tiny name="Ada Ito" testID="avatar-size-tiny" />
            <Avatar small name="Ada Ito" testID="avatar-size-small" />
            <Avatar name="Ada Ito" testID="avatar-size-default" />
            <Avatar large name="Ada Ito" testID="avatar-size-large" />
            <Avatar rounded name="Sofia Bao" testID="avatar-rounded" />
            <Avatar large rounded name="Kira Okafor" testID="avatar-rounded-large" />
          </Row>
          <Row relaxed alignCenter wrap>
            <AvatarGroup max={4} total={9} testID="avatar-stack">
              <Avatar name="Liang Kim" />
              <Avatar name="Noor Novak" />
              <Avatar name="Theo Lovelace" />
              <Avatar name="Priya Haddad" />
            </AvatarGroup>
            <Avatar onPress={press} name="Marcus Singh" testID="avatar-pressable" />
            <Avatar onPress={press} accessibilityLabel="Account" testID="avatar-neutral" />
          </Row>
        </Column>
      </Card>
    </Column>
  </ThemeProvider>;
}
