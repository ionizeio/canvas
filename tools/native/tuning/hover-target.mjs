// A record-motion.mjs actions module for the hover feedback (the `df-hover-lift` card in
// tools/native/liquid-motion.md). It drives the pointer the way the reference's own
// modules did (Dark Factory's tuning/actions/hover-card.mjs and hover-target.mjs): rest
// beside the target, move onto it in a few steps, hold, move off, hold. Each animation
// frame it samples the label's top edge (a lift moves it) and the traced node's
// transform, background and box shadow, and writes them beside the recording as
// trace.json, in the reference traces' shape, with the pointer's arrival and departure
// as marks. A live millisecond clock is stamped into the frames so a tile's true time can
// be read even where the video holds a frame.
//
//   HOVER_TEXT  the label to hover, exact text ("Scout", "Approve", "Runs")
//   TRACE       what to sample: "surface" (the nearest ancestor that paints a shadow,
//               the card), "control" (the nearest role=button or anchor, the button), or
//               "frame" (the parent of the row's focusable node, where the wash paints)
//   FROM        where the pointer rests before and after: "below" (120 px below the
//               label, the reference's primary and nav runs) or "left" (200 px left of it,
//               the reference's card run)
//   CLIP        the recorded region around the label: "wide" (900 x 240, the reference's
//               card run) or "tight" (320 x 120, its primary and nav runs)
//   HOLD        milliseconds the pointer rests on the target before leaving (default 1200,
//               the reference's); lengthen it to move the leave clear of the frames the
//               screencast encoder ghosts (103 and 104, and every 103 frames after)
//   NTH         which rendered label to use, counting every one on the page in document
//               order from 1 (default 1); it must sit inside the traced kind of control. A
//               docs component page previews each example per platform, iOS, Android, then
//               web, so its web preview is the third
//
// Usage, from the repo root with the docs dev server up:
//   HOVER_TEXT=Scout TRACE=surface FROM=left node ~/.claude/skills/tuning-harness/scripts/record-motion.mjs \
//     --platform web --url http://localhost:8081/testing/hover --width 1280 --height 800 \
//     --seconds 6 --fps 20 --actions tools/native/tuning/hover-target.mjs --out <dir>
import { writeFileSync } from "node:fs";
import { join } from "node:path";

export default async function actions(page, info) {
  const label = process.env.HOVER_TEXT ?? "Scout";
  const traced = process.env.TRACE ?? "surface";
  const from = process.env.FROM ?? "below";
  // The dev server's hydration notice would sit over the page; it is not part of the kit.
  await page.evaluate(() => document.getElementById("error-overlay")?.remove());
  // The first rendered label inside the kind of control being traced, never a code sample's
  // token of the same text (a docs page shows each example's source beside it).
  await page.waitForFunction(({ label, traced, nth }) => {
    const candidates = [...document.querySelectorAll("div,span,button,a")].filter((e) => e.childElementCount === 0 && e.textContent.trim() === label && !e.closest("pre,code"));
    const inside = (e) => {
      if (traced === "control") return e.closest('[role="button"],button,a') != null;
      if (traced === "frame") return e.closest("[tabindex]") != null;
      for (let n = e; n; n = n.parentElement) if (getComputedStyle(n).boxShadow !== "none") return true;
      return false;
    };
    const el = candidates[nth - 1];
    if (!el || !inside(el)) return false;
    document.querySelectorAll("[data-hover-target]").forEach((n) => n.removeAttribute("data-hover-target"));
    el.setAttribute("data-hover-target", "");
    return true;
  }, { label, traced, nth: Number(process.env.NTH ?? 1) }, { timeout: 60000 });
  const text = page.locator("[data-hover-target]");
  await text.scrollIntoViewIfNeeded();
  const box = await text.boundingBox();
  await page.evaluate(({ x, y }) => {
    const el = document.createElement("div");
    Object.assign(el.style, { position: "fixed", left: `${x}px`, top: `${y}px`, font: "11px/1 monospace", background: "#000", color: "#fff", padding: "1px 3px", zIndex: 99999, pointerEvents: "none" });
    document.body.appendChild(el);
    const start = performance.now();
    const tick = () => { el.textContent = String(Math.round(performance.now() - start)); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }, process.env.CLIP === "tight" ? { x: Math.max(0, box.x - 78), y: Math.max(0, box.y - 38) } : { x: Math.max(0, box.x - 118), y: Math.max(0, box.y - 58) });
  await page.evaluate(({ traced }) => {
    const el = document.querySelector("[data-hover-target]");
    let target = el;
    if (traced === "surface") while (target && getComputedStyle(target).boxShadow === "none") target = target.parentElement;
    else if (traced === "control") target = el.closest('[role="button"],button,a') ?? el.parentElement;
    else target = el.closest("[tabindex]")?.parentElement ?? el.parentElement;
    window.__trace = [];
    window.__traceStart = performance.now();
    const tick = () => {
      const cs = getComputedStyle(target);
      window.__trace.push({ t: Math.round(performance.now() - window.__traceStart), top: +el.getBoundingClientRect().top.toFixed(2), transform: cs.transform, bg: cs.backgroundColor, shadow: cs.boxShadow });
      if (!window.__traceStop) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, { traced });
  const rest = from === "left" ? { x: box.x - 200, y: box.y + 40 } : { x: box.x + box.width / 2, y: box.y + 120 };
  await page.mouse.move(rest.x, rest.y);
  await page.waitForTimeout(1000);
  await page.evaluate(() => { window.__marks = { hoverIn: Math.round(performance.now() - window.__traceStart) }; });
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
  await page.waitForTimeout(Number(process.env.HOLD ?? 1200));
  await page.evaluate(() => { window.__marks.hoverOut = Math.round(performance.now() - window.__traceStart); });
  await page.mouse.move(rest.x, rest.y, { steps: 4 });
  await page.waitForTimeout(1000);
  const trace = await page.evaluate(() => { window.__traceStop = true; return { marks: window.__marks, samples: window.__trace }; });
  writeFileSync(join(info.out, "trace.json"), JSON.stringify(trace));
  return process.env.CLIP === "tight"
    ? { clip: { x: Math.max(0, Math.round(box.x - 80)), y: Math.max(0, Math.round(box.y - 40)), width: 320, height: 120 } }
    : { clip: { x: Math.max(0, Math.round(box.x - 120)), y: Math.max(0, Math.round(box.y - 60)), width: 900, height: 240 } };
}
