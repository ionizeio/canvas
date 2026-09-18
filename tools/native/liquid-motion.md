# Liquid motion evidence

The `motion` Playwright project runs the existing material lifecycle fixture with
Reduce Motion disabled. Other projects retain their deterministic reduced-motion
baseline. Run against the running docs app, or omit `E2E_BASE_URL` to use the web
export after building it:

```sh
E2E_BASE_URL=http://localhost:8081 bunx playwright test --project motion --workers 1 --output /tmp/canvas-liquid-motion
```

Each pilot interaction records real `requestAnimationFrame` bounds, the semantic
host's bounds, browser identity, viewport, motion preference, scheme and root font
size. A video plus rest/settled screenshots remain in the chosen output directory.
The JSON is also saved directly, so choosing a console-only reporter does not
discard it. No fake animation clock, forced endpoint, screenshot animation
disabling or browser skin label establishes the motion result.

The tests cover ButtonGroup selection and held lift, Switch toggle, and Slider
drag in light and dark glass. They verify actual shape change, immediate selected
or value semantics, still final geometry, retained material hosts and no increase
in the number of retained browser lens definitions. ButtonGroup also checks that
the semantic row's origin and height remain fixed. This does not establish native
material fidelity, GPU allocation totals, focus behavior or every responsive case.

`captureMaterialMotion` in `e2e/support/material-evidence.ts` can sample the
decorative host of each new motion owner. Keep the foreground locator on the
actual semantic panel or control, not an animated wrapper. Start observation before
input. For popup opening, arrange the harness so it can observe initial material
mounting as well as visible bounds. A retained exit needs a separate recording
that checks logical closure and semantic exclusion while decoration remains.

## Native capture

Use the actual installed app, not an iOS or Android browser skin. The existing
`/testing/materials` route exposes the same shared fixture in the docs and sealed
candidate app. It starts solid and light regardless of the outer docs appearance.
Use its `Switch material` and `Switch scheme` controls, and confirm `material-mode`
before recording. This mode marker prevents a reload from silently invalidating
the exercise. The candidate flow in `flows/after-carousel.yaml` demonstrates the
accessible selectors and Android capture assertions.

1. Record the exact app build or development checkout, dirty state, source hashes,
   device identifier, OS/API, pixel ratio, font scale and motion/accessibility
   preferences. A development bundle is not sealed candidate evidence.
2. Wait for an edit-free recording window. Fast Refresh can reset fixture state;
   any reset invalidates the affected run. Do not describe such a capture as a
   baseline for a particular revision.
3. Record the screen with `xcrun simctl io <udid> recordVideo` or `adb -s <serial>
   shell screenrecord`, then drive the real controls by current accessibility
   bounds or inspected screen coordinates. Preserve rest, engage, travel, maximum
   shape, recoil and settle. Extract contact sheets from the original video,
   retaining the movie so sampled frames cannot hide clipping or interruption.
4. On Android, `Native capture: available` establishes module availability only.
   Inspect actual blur against the live backdrop and retain `material-capture-stats`
   before/after repeated interactions. Confirm frost views and listeners return
   to baseline and reach zero after switching the fixture to solid. Host counts
   may include the docs shell, so compare the same route and view composition.
5. Capture a matched solid run. Collect Android `dumpsys gfxinfo` after resetting
   its counters, and retain raw frame stats. Native screen-recording frame rate is
   the recorder's output cadence, not the app's rendering performance. Native
   allocation and iOS frame-time profiling need their own instruments.
6. Exercise a real menu-sized panel's opening, closing, reversal and repeated
   resizing once its production path exists. Confirm native glass never becomes
   an opaque transformed ancestor, stable foreground readability and a complete
   solid fallback. Pilot-sized motion alone cannot pass this gate.

## Initial observations, 2026-09-17

Artifacts were captured under `/tmp/canvas-liquid-motion-2026-09-17`. These are
development observations during the rollout, not a release certification.

| Runtime | Evidence | Result and limit |
|---|---|---|
| Chromium on macOS | Six real-frame traces and videos, light/dark | Pilot behavior passes. Browser rAF p95 was 16.7 to 17.5 ms; maximum observed interval was 42 ms. These numbers include screen recording and the docs shell. |
| Chromium lens lifecycle | Mutation observations around each pilot | 13 definitions at start and end of each trace; 7 to 38 new definitions during an interaction. No retained growth in these finite samples; regeneration churn remains a panel-sizing risk. |
| Lookout browser captures | 28 shots across desktop/phone, light/dark and rest/held states | Zero deterministic findings; contact sheet inspected. Native skin rows are browser evidence only. |
| iOS 26.3, iPhone 17 Pro simulator | Rest/menu screenshots and pilot movie | Runtime and real native controls available; visible lift/deformation captured. Concurrent Fast Refresh and development slowness prevent a final performance or revision-specific pass. |
| Android 15/API 35, `canvas_pixel` ARM64 | Glass screenshot and capture diagnostics | Runtime available with native capture. Observed 4 hosts, 1 active host, 1 recording, 18 frost views and 18 listeners. This is one observation, not a leak test. |

The first browser test found missing ButtonGroup selection after solid-to-glass:
the layout callback appeared only in glass, and unchanged RNW hosts did not emit
a new layout. The shared measurement fix keeps the callback attached in both
modes. The motion recipe deliberately continues to enter through this transition.

For the current desktop development baseline, investigate a p95 rAF interval over
33.4 ms or an interval over 100 ms in an edit-free run; do not hide such a regression
behind retries. These are local comparison thresholds, not universal device
budgets. Native budget approval remains pending a stable matched glass/solid run.
The initial Android docs process showed severe jank before counter reset, so those
uncorrelated process totals cannot establish the cost of a new popup animation.

Before enabling broad panel motion, require no persistent lens/capture growth,
still decorative geometry after settlement, a measured supported-device frame
budget, and actual iOS/Android menu-sized evidence. Record every unavailable or
failed dimension explicitly rather than promoting source coverage to a runtime pass.

## Runs, 2026-09-18 (tuning-harness skill)

The `/testing/tabs` fixture gained the liquid selection harness: a material
switch, `Next tab` and `Next destination` drivers, the pill `Tabs` and a `TabBar`
on a still gradient scene, with `liquid-mode`, `liquid-pill-readout` and
`liquid-destination-readout` readouts. Recorded with
`~/.claude/skills/tuning-harness/scripts/record-motion.mjs`; each artifact folder
holds the movie, the contact sheet, the strips and `meta.json` (frames are re-extracted from the movie with ffmpeg). Development
bundle on a dirty tree (revision 67de7274 plus the uncommitted tabs and tab-bar
work), so these are observations, not a revision-specific pass.

| Date | Effect and profile | Runtime and device | Revision (dirty?) | Values tried | rAF p50 / p95 / max (ms) | What the sheet showed | Artifacts |
|---|---|---|---|---|---|---|---|
| 2026-09-18 | Tabs pills selection travel (`selection`), TabBar indicator travel (`navigation`), solid to glass first | Chromium headed via the repo's Playwright, 1280x800, light, 20 fps sampling | 67de7274 (dirty) | current `PROFILES` and springs, unchanged | 10 / 10.7 / 39.6 over 626 frames, tab fronted | Label ink changes one frame before the puck moves; the puck stretches across both labels (1 frame), lands with a slight overshoot (1 frame), settles by the fourth; three hops All, Active, Archived, Drafts all alike. TabBar Search to Profile: indicator visible mid-travel for 3 frames, restrained (no growth into the label lane), settles behind Profile. No clipping, no snap. Selected tint present at glass rest before the first travel (checked against the earlier ButtonGroup relayout bug). | `/tmp/canvas-liquid-motion-2026-09-18/web-tabs-01` (movie, sheet, strips 068-079 and 150-161, `trace.json`; 203 frames re-extractable from the movie) |
| 2026-09-18 | Tabs pills selection travel (`selection`) | iPhone 17 Pro simulator, iOS 26.3, dark scheme, docs dev app on Metro, 20 fps sampling of a simctl recording | 67de7274 (dirty) | unchanged | JS rAF from the fixture's `Sample frames` readout: idle 293 / 303 / 305 over 13 frames in 4 s, during three hops 302 / 312 / 372 over 12 frames; the docs dev app sits at about 150% CPU and 1 GB RSS in the foreground on ANY route (the sealed smoke app idles at 0%), so the JS thread runs near 3.4 frames per second before the effect does anything and this build cannot price the effect | Same order as web: label ink first, one stretched frame spanning both labels, arrival slightly wide, settled by the third frame after the tap; three hops alike. TabBar stays tint-only on iOS as designed; the clip cut most of the bar, so only the icon tint change was seen. | `/tmp/canvas-liquid-motion-2026-09-18/ios-tabs-01` (movie, sheet, strip 090-101; 278 frames re-extractable) |
| 2026-09-18 | Materials fixture: material switch, ButtonGroup selection (`selection`), backdrop drift | Chromium headed and headless (web), iPhone 17 Pro simulator (iOS) | 67de7274 (dirty) | unchanged | not sampled | Recorder smoke runs. Headless Chromium rendered no glass puck at all for the ButtonGroup; headed rendered it. A 200 px tile hid the puck travel that the full-size frames showed. | `/tmp/canvas-liquid-motion-2026-09-18/run-01..03` and `ios-01` |

Not covered by these runs: Android, Reduce Motion, a sealed candidate build, and
the pressed lift and drag profiles. The native frame-interval trace exists but is
dominated by the docs shell (see the iOS row); a clean native number needs the
smoke app rebuilt with this fixture, which has no shell.
