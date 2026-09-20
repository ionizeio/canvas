import { useState } from "react";
import { useWindowDimensions } from "react-native";
import { BackdropHost, Button, Column, Row, ThemeProvider, Typography, backdropClock, type Energy } from "@ionizeio/canvas";
import { CanvasLattice } from "../../brand/canvas-lattice";
import { LATTICE } from "../../brand/lattice-tunables";
import { buildLattice } from "../../brand/lattice-scene";
import { useFrameTrace } from "./frame-trace";

// The Lattice harness: the docs' background scene on the engine's real surface, with
// the drivers a tuning run needs. Park and resume the clock, step the energy, switch
// the scheme, jump each assembly moment to just before its window so a recording
// catches the whole moment without waiting a flight (or three minutes of drift), read
// the channel phases, and sample the frame trace: the requestAnimationFrame intervals,
// the inline style writes per second on the web (the cost of driving a scene through
// React each frame, which should be zero) and the live CSS animations the web engine
// runs on the compositor instead (the sampler is shared with the orbit harness,
// frame-trace.ts).
//
// This lives in the docs rather than the shared smoke fixtures because the scene is
// the docs' brand art; the smoke app's fixture keeps the engine's generic sky.

const energies: Energy[] = ["default", "calm", "energetic"];

/** How far before an assembly's window a jump lands, in cycles of its channel. */
const JUMP_LEAD = 0.03;

export function LatticeHarness({ initialDark = true, initialEnergy, initialStill = false }: { initialDark?: boolean; initialEnergy?: Energy; initialStill?: boolean }) {
  const [running, setRunning] = useState(!initialStill);
  const [energy, setEnergy] = useState<Energy>(initialEnergy ?? LATTICE.energy);
  const [dark, setDark] = useState(initialDark);
  const [phases, setPhases] = useState("Phases: not read");
  const { trace, sample } = useFrameTrace();
  const { width, height } = useWindowDimensions();
  const clock = backdropClock(energy);
  // The roster the scene mounts for the window box (the surface box is the harness
  // column, so the counts here are for the window and may differ by a row or two).
  const stats = buildLattice({ width, height }).stats;

  const readPhases = () => {
    setPhases(`Phases: flight ${clock.flight.position().toFixed(3)}, drift ${clock.drift.position().toFixed(3)}, scintillate ${clock.scintillate.position().toFixed(3)}`);
  };

  const jump = (name: string) => {
    const spec = LATTICE.assemblies.find((a) => a.name === name);
    if (!spec) return;
    setRunning(true);
    const channel = spec.channel === "drift" ? clock.drift : clock.flight;
    channel.play(Math.max(0, spec.window[0] - JUMP_LEAD));
    readPhases();
  };

  // The host paints across its parent's box, so the Column keeps the scene behind this
  // section rather than behind the whole fixture page, and the section is kept at least
  // a window tall so the lattice has a full box to fill.
  return (
    <Column testID="lattice-harness" style={{ minHeight: height }}>
      <ThemeProvider glass dark={dark} light={!dark}>
        <BackdropHost>
          <CanvasLattice still={!running} energy={energy} />
          <Column relaxed>
            <Typography h3>Lattice scene</Typography>
            <Typography testID="lattice-mode">Lattice {running ? "running" : "still"}</Typography>
            <Typography testID="lattice-energy">Energy: {energy}</Typography>
            <Typography testID="lattice-scheme">Scheme: {dark ? "dark" : "light"}</Typography>
            <Typography testID="lattice-stats">
              Roster for the window: {stats.cells} cells, {stats.glowCells} glow cells in {LATTICE.glow.buckets} buckets with {stats.bonds} bonds, {stats.blinkCells} blink cells, {stats.atoms} atoms in {LATTICE.assemblies.length} assemblies, {stats.animatedViews} loop views
            </Typography>
            <Row snug wrap>
              <Button onPress={() => setRunning((value) => !value)} testID="lattice-toggle">{running ? "Park" : "Resume"}</Button>
              <Button onPress={() => setEnergy((value) => energies[(energies.indexOf(value) + 1) % energies.length]!)} testID="lattice-energy-next">Next energy</Button>
              <Button onPress={() => setDark((value) => !value)} testID="lattice-scheme-toggle">Switch scheme</Button>
              <Button onPress={() => jump("field")} testID="lattice-jump-field">Jump to field</Button>
              <Button onPress={() => jump("card")} testID="lattice-jump-card">Jump to card</Button>
              <Button onPress={readPhases} testID="lattice-phases-read">Read phases</Button>
              <Button onPress={sample} testID="lattice-sample">Sample 4 s</Button>
            </Row>
            <Typography testID="lattice-phases">{phases}</Typography>
            <Typography testID="lattice-trace">{trace}</Typography>
            <Typography small muted>
              Jump to field lands the flight just before the search-field moment; Jump to card does the same on the drift. Park then resume: the lattice continues rather than restarting. Sample while running and while parked; a parked scene writes no styles and runs no animations.
            </Typography>
          </Column>
        </BackdropHost>
      </ThemeProvider>
    </Column>
  );
}
