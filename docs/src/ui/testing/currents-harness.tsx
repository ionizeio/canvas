import { useState } from "react";
import { useWindowDimensions } from "react-native";
import { BackdropHost, Button, Column, Row, ThemeProvider, Typography, type Energy } from "@ionizeio/canvas";
import { CanvasCurrents } from "../../brand/canvas-currents";
import { CURRENTS } from "../../brand/currents-tunables";
import { useFrameTrace } from "./frame-trace";

const energies: Energy[] = ["default", "calm", "energetic"];

// Keep the brand scene on its real backdrop surface so tuning exercises the same
// motion and material integration as the rest of the docs.
export function CurrentsHarness({ initialDark = true, initialEnergy, initialStill = false }: { initialDark?: boolean; initialEnergy?: Energy; initialStill?: boolean }) {
  const [running, setRunning] = useState(!initialStill);
  const [energy, setEnergy] = useState<Energy>(initialEnergy ?? CURRENTS.energy);
  const [dark, setDark] = useState(initialDark);
  const { trace, sample } = useFrameTrace();
  const { height } = useWindowDimensions();

  return (
    <Column testID="currents-harness" style={{ minHeight: height }}>
      <ThemeProvider glass dark={dark} light={!dark}>
        <BackdropHost>
          <CanvasCurrents still={!running} energy={energy} />
          <Column relaxed>
            <Typography h2>Spectral currents</Typography>
            <Typography testID="currents-mode">Currents {running ? "running" : "still"}</Typography>
            <Typography testID="currents-energy">Energy: {energy}</Typography>
            <Typography testID="currents-scheme">Scheme: {dark ? "dark" : "light"}</Typography>
            <Row snug wrap>
              <Button onPress={() => setRunning((value) => !value)} testID="currents-toggle">{running ? "Park" : "Resume"}</Button>
              <Button onPress={() => setEnergy((value) => energies[(energies.indexOf(value) + 1) % energies.length]!)} testID="currents-energy-next">Next energy</Button>
              <Button onPress={() => setDark((value) => !value)} testID="currents-scheme-toggle">Switch scheme</Button>
              <Button onPress={sample} testID="currents-sample">Sample 4 s</Button>
            </Row>
            <Typography testID="currents-trace">{trace}</Typography>
            <Typography small muted>
              Compare the flowing ribbons in both schemes and at each energy. Park and resume the scene, then sample four seconds to compare frame timing, page-wide style writes, and live CSS animations.
            </Typography>
          </Column>
        </BackdropHost>
      </ThemeProvider>
    </Column>
  );
}
