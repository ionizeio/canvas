import { Profiler, useRef, useState } from "react";
import { BreakpointOverride, Button, Column, Row, ThemeProvider, Typography } from "@ionizeio/canvas";
import { HeroOrbit } from "../../brand/hero-orbit";
import { ORBIT } from "../../brand/orbit-tunables";
import { useFrameTrace } from "./frame-trace";

// The hero orbit harness: the home page's orbit, the real component, with the drivers a
// tuning run needs. Park and resume the loops, switch between the desktop orbit and the
// stacked one a phone gets, switch the scheme, and sample the frame trace: the
// requestAnimationFrame intervals, the inline style writes per second and the live CSS
// animations on the web, plus the React commits per second the orbit's subtree costs,
// which is the number the port to the loop primitive exists to take to zero (the
// JS-driven Animated loops committed about 115 times a second on the web).
//
// This lives in the docs rather than the shared smoke fixtures because the orbit is
// the docs' brand art.

export function OrbitHarness({ initialDark = true, initialStill = false, initialStacked = false }: { initialDark?: boolean; initialStill?: boolean; initialStacked?: boolean }) {
  const [running, setRunning] = useState(!initialStill);
  const [stacked, setStacked] = useState(initialStacked);
  const [dark, setDark] = useState(initialDark);
  // Every commit that includes the orbit's subtree, counted through React's own profiler.
  const commits = useRef(0);
  const { trace, sample } = useFrameTrace({ label: "commits", read: () => commits.current });

  return (
    <Column relaxed testID="orbit-harness">
      <Typography h3>Hero orbit</Typography>
      <Typography testID="orbit-mode">Orbit {running ? "running" : "still"}</Typography>
      <Typography testID="orbit-layout">Layout: {stacked ? "stacked (phone)" : "desktop"}</Typography>
      <Typography testID="orbit-scheme">Scheme: {dark ? "dark" : "light"}</Typography>
      <Typography testID="orbit-periods">
        Periods: orbit {ORBIT.orbitPeriod} ms, glow {ORBIT.glowPeriod} ms, breath {ORBIT.glowPeriodBreath} ms to {ORBIT.glowFloor}
      </Typography>
      <Row snug wrap>
        <Button onPress={() => setRunning((value) => !value)} testID="orbit-toggle">{running ? "Park" : "Resume"}</Button>
        <Button onPress={() => setStacked((value) => !value)} testID="orbit-layout-toggle">{stacked ? "Desktop orbit" : "Stacked orbit"}</Button>
        <Button onPress={() => setDark((value) => !value)} testID="orbit-scheme-toggle">Switch scheme</Button>
        <Button onPress={sample} testID="orbit-sample">Sample 4 s</Button>
      </Row>
      <Typography testID="orbit-trace">{trace}</Typography>
      <ThemeProvider dark={dark} light={!dark}>
        {/* The stacked orbit sizes itself to the column it sits in; the override puts the
            kit's bucket hooks on the phone tier without resizing the window. */}
        <BreakpointOverride value={stacked ? "sm" : "base"}>
          <Column testID="orbit-stage" style={{ maxWidth: stacked ? 412 : undefined }}>
            <Profiler id="orbit" onRender={() => { commits.current += 1; }}>
              <HeroOrbit still={!running} />
            </Profiler>
          </Column>
        </BreakpointOverride>
      </ThemeProvider>
      <Typography small muted>
        Sample while running and while parked: a running orbit on the loop primitive writes no styles, runs its animations on the compositor (three tracks: the badge orbit and its six counter-rotations, the glow's spin, the glow's breath) and commits nothing per frame; a parked orbit runs no animations at all.
      </Typography>
    </Column>
  );
}
