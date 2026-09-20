import { useEffect, useRef, useState } from "react";

// The numeric half of a recorded tuning run, shared by the docs' harnesses: four
// seconds of requestAnimationFrame intervals (p50, p95 and the maximum), the inline
// style writes per second on the web (the cost of driving motion through React each
// frame, which should be zero for a loop on the kit's loop primitive) and the live CSS
// animations the web engine runs on the compositor instead. A harness may add one
// counter of its own (React commits, say) and the readout reports its rate.
//
// The web globals are looked up at run time so the body compiles for the native app
// too (no DOM lib) and reports "n/a" there.

type Observer = { observe: (target: unknown, init: object) => void; disconnect: () => void };
type MutationRecordLike = { type: string; attributeName: string | null };
const web = globalThis as unknown as {
  MutationObserver?: new (callback: (records: MutationRecordLike[]) => void) => Observer;
  document?: { body: unknown; getAnimations?: () => unknown[] };
};

export interface FrameTraceCounter {
  /** How the readout names the rate, e.g. "commits". */
  label: string;
  /** The running total; the readout reports its change over the window per second. */
  read: () => number;
}

export interface FrameTrace {
  /** The readout line: "Trace: not sampled", "Trace: sampling for 4 s", or the numbers. */
  trace: string;
  /** Start a four-second sample; a no-op while one runs. */
  sample: () => void;
}

const WINDOW_MS = 4000;

export function useFrameTrace(counter?: FrameTraceCounter): FrameTrace {
  const [trace, setTrace] = useState("Trace: not sampled");
  const sampling = useRef<{ handle: number; timer: ReturnType<typeof setTimeout>; observer: Observer | null } | null>(null);
  useEffect(() => () => {
    if (!sampling.current) return;
    cancelAnimationFrame(sampling.current.handle);
    clearTimeout(sampling.current.timer);
    sampling.current.observer?.disconnect();
  }, []);

  const sample = () => {
    if (sampling.current) return;
    setTrace("Trace: sampling for 4 s");
    const intervals: number[] = [];
    let previous: number | null = null;
    let styleWrites = 0;
    const counted = counter?.read() ?? 0;
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
      const seconds = WINDOW_MS / 1000;
      const writes = observer ? `${Math.round(styleWrites / seconds)}` : "n/a";
      const animations = web.document?.getAnimations ? `${web.document.getAnimations().length}` : "n/a";
      const extra = counter ? `; ${counter.label}/s: ${Math.round((counter.read() - counted) / seconds)}` : "";
      setTrace(`Frames: ${sorted.length}; p50 ${at(0.5).toFixed(1)} ms; p95 ${at(0.95).toFixed(1)} ms; max ${(sorted.at(-1) ?? 0).toFixed(1)} ms; style writes/s: ${writes}; css animations: ${animations}${extra}`);
    }, WINDOW_MS);
    sampling.current = { handle: requestAnimationFrame(tick), timer, observer };
  };

  return { trace, sample };
}
