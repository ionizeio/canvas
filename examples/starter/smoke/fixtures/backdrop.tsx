import { useEffect, useRef, useState } from "react";
import { Backdrop, BackdropHost, Button, Column, Row, ThemeProvider, Typography } from "@nannier-com/canvas";

// The Backdrop harness: the engine's idle cost and its motion, judged on the real
// surface. The scene has the SHAPE of a production sky (a pinned twinkling field, a
// drifting gradient, travelling shells on the quarters, twinkling glints and streaks
// between them) with generic art, so the wrapper count and the channel bindings match
// what an app mounts on every page. The drivers park and resume the clock and step the
// energy; the sampler reads the numbers a check needs from the readout instead of
// pixels: the requestAnimationFrame trace, the inline style writes per second on the
// web (the cost of driving the sky through React each frame), and the live CSS
// animations the web engine runs on the compositor instead.

// Deterministic fields (mulberry32 from a fixed seed) so every run and platform draws
// the same sky. Deliberately plain: no brand palette, this is the engine's fixture.
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const next = rng(7);
const field = (count: number, radius: number) => Array.from({ length: count }, () => {
  const angle = next() * Math.PI * 2;
  const distance = Math.pow(next(), 1.4) * 0.5;
  return { x: 0.5 + Math.cos(angle) * distance, y: 0.5 + Math.sin(angle) * distance, r: 0.6 + Math.pow(next(), 3) * radius, a: 0.2 + next() * 0.8 };
});
const deep = Array.from({ length: 160 }, () => ({ x: next(), y: next(), r: 0.5 + Math.pow(next(), 3) * 2.6, a: 0.2 + next() * 0.8 }));
const shells = Array.from({ length: 4 }, () => field(48, 3));
const glints = Array.from({ length: 2 }, () => Array.from({ length: 8 }, () => ({ ...field(1, 1)[0]!, r: 6 + next() * 10, rot: (next() - 0.5) * 24 })));
const streaks = Array.from({ length: 2 }, () => Array.from({ length: 24 }, () => {
  const angle = next() * Math.PI * 2;
  const distance = 0.12 + Math.pow(next(), 1.2) * 0.38;
  return { x: 0.5 + Math.cos(angle) * distance, y: 0.5 + Math.sin(angle) * distance, dx: Math.cos(angle), dy: Math.sin(angle), len: 0.012 + distance * 0.05, r: 1.4, a: 0.3 + next() * 0.5 };
}));
const blobs = [
  { color: "#1264d7", cx: 0.3, cy: 0.3, r: 0.5, o: 0.3, end: 0.62 },
  { color: "#d62e73", cx: 0.7, cy: 0.6, r: 0.45, o: 0.28, end: 0.6 },
];

const energies = ["default", "calm", "energetic"] as const;
type EnergyName = (typeof energies)[number];

// The web globals the sampler reads, looked up at run time so the body compiles for
// the native app too (no DOM lib) and reports "n/a" there.
type Observer = { observe: (target: unknown, init: object) => void; disconnect: () => void };
type MutationRecordLike = { type: string; attributeName: string | null };
const web = globalThis as unknown as {
  MutationObserver?: new (callback: (records: MutationRecordLike[]) => void) => Observer;
  document?: { body: unknown; getAnimations?: () => unknown[] };
};

export function BackdropBody() {
  const [running, setRunning] = useState(true);
  const [energy, setEnergy] = useState<EnergyName>("default");
  const [trace, setTrace] = useState("Trace: not sampled");
  const sampling = useRef<{ handle: number; timer: ReturnType<typeof setTimeout>; observer: Observer | null } | null>(null);
  useEffect(() => () => {
    if (!sampling.current) return;
    cancelAnimationFrame(sampling.current.handle);
    clearTimeout(sampling.current.timer);
    sampling.current.observer?.disconnect();
  }, []);

  // Four seconds of requestAnimationFrame intervals, inline style writes and live CSS
  // animations, then one readout line: the numeric half of a recorded run.
  const sample = () => {
    if (sampling.current) return;
    setTrace("Trace: sampling for 4 s");
    const intervals: number[] = [];
    let previous: number | null = null;
    let styleWrites = 0;
    const tick = (now: number) => {
      if (previous !== null) intervals.push(now - previous);
      previous = now;
      if (sampling.current) sampling.current.handle = requestAnimationFrame(tick);
    };
    let observer: Observer | null = null;
    if (web.MutationObserver && web.document) {
      observer = new web.MutationObserver((records) => {
        for (const record of records) if (record.type === "attributes" && record.attributeName === "style") styleWrites++;
      });
      observer.observe(web.document.body, { attributes: true, subtree: true, attributeFilter: ["style"] });
    }
    const timer = setTimeout(() => {
      if (sampling.current) cancelAnimationFrame(sampling.current.handle);
      observer?.disconnect();
      sampling.current = null;
      const sorted = [...intervals].sort((a, b) => a - b);
      const at = (q: number) => sorted[Math.floor((sorted.length - 1) * q)] ?? 0;
      const writes = observer ? `${Math.round(styleWrites / 4)}` : "n/a";
      const animations = web.document?.getAnimations ? `${web.document.getAnimations().length}` : "n/a";
      setTrace(`Frames: ${sorted.length}; p50 ${at(0.5).toFixed(1)} ms; p95 ${at(0.95).toFixed(1)} ms; max ${(sorted.at(-1) ?? 0).toFixed(1)} ms; style writes/s: ${writes}; css animations: ${animations}`);
    }, 4000);
    sampling.current = { handle: requestAnimationFrame(tick), timer, observer };
  };

  // The host paints across its parent's box, so the Column keeps the sky behind this
  // section rather than behind the whole fixture page.
  return (
    <Column testID="backdrop-harness">
      <ThemeProvider glass>
        <BackdropHost>
          <Backdrop vivid still={!running} calm={energy === "calm"} energetic={energy === "energetic"}>
            <Backdrop.Particles field={deep} depth={0} sprite="disc" twinkle alpha={0.75} />
            <Backdrop.Gradient blobs={blobs} depth={0.1} size={720} at={{ x: 0.6, y: 0.4 }} drift alpha={0.7} />
            {shells.map((shell, i) => <Backdrop.Particles key={`s${i}`} field={shell} depth={1} phase={i * 0.25} sprite="halo" bloom />)}
            {glints.map((glint, i) => <Backdrop.Particles key={`g${i}`} field={glint} depth={1} phase={0.375 + i * 0.5} sprite="spark" twinkle />)}
            {streaks.map((streak, i) => <Backdrop.Particles key={`t${i}`} field={streak} depth={1.6} phase={0.125 + i * 0.5} sprite="streak" />)}
          </Backdrop>
          <Column relaxed>
            <Typography h3>Backdrop engine</Typography>
            <Typography testID="backdrop-mode">Backdrop {running ? "running" : "still"}</Typography>
            <Typography testID="backdrop-energy">Energy: {energy}</Typography>
            <Row snug wrap>
              <Button onPress={() => setRunning((value) => !value)} testID="backdrop-toggle">{running ? "Park" : "Resume"}</Button>
              <Button onPress={() => setEnergy((value) => energies[(energies.indexOf(value) + 1) % energies.length]!)} testID="backdrop-energy-next">Next energy</Button>
              <Button onPress={sample} testID="backdrop-sample">Sample 4 s</Button>
            </Row>
            <Typography testID="backdrop-trace">{trace}</Typography>
            <Typography small muted>Park then resume: the sky continues mid-flight rather than restarting. Sample while running and while parked; a parked sky writes no styles and runs no animations.</Typography>
          </Column>
        </BackdropHost>
      </ThemeProvider>
    </Column>
  );
}
