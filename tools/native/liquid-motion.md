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
| 2026-09-18 | Dropdown popup open, close, reopen mid-exit (popup profile: travel 650/42 open, 720/42 close, contour 320/15) | Chromium headed via the repo's Playwright, 1280x800, light glass, 20 fps sampling, machine load average 36 to 60 during the run | d811052b + the Dropdown/Select policy switch (dirty) | unchanged | 7.8 / 11.8 / 267 over 530 frames (one stall) | Rows are concealed until the material settles and retire the instant Escape is pressed (focus ring back on the trigger in the same frame) while the pane lingers; the reopen mid-exit grew from the retained pane in one visible partial frame. The first open and the first close showed no intermediate frames at 50 ms sampling and the pane lingered 350 ms static before leaving: consistent with the 267 ms JS stall under load, not with the springs. The second close took 100 ms with one shrinking frame. At 50 ms sampling the open reads as a fast pop with the 5.5% contour stretch invisible; a re-tune of the travel springs needs a quiet machine and is pending. | `/tmp/canvas-liquid-motion-2026-09-18/web-dropdown-01` (strips 464-475, 490-501, `mid.png`, `close1.png`, `trace.json`) |
| 2026-09-18 | Navbar active link travel (`navigation` profile; iOS skin carries the brand capsule as glass, web/Android their tinted tile) | Chromium headed via the repo's Playwright on `components/navbars`, dark glass, 20 fps sampling, load average about 16 | 865f67a6 (clean) | unchanged | not sampled | Three hops (Dashboard, Users, Settings, Dashboard) on the iOS example: the capsule stretches horizontally between links for one to two frames and settles under the destination label; no growth into the label lane; labels and the bar stay still; inactive iOS capsules keep their fill. | `/tmp/canvas-liquid-motion-2026-09-18/web-navbar-01` (`coarse.png` at 100 ms) |
| 2026-09-18 | Sidebar active row travel (`selection` profile) on the docs shell's own Sidebar | Chromium headed on `components/navbars`, dark glass, 20 fps sampling | 865f67a6 (clean) | unchanged | not sampled | Board, Carousel, ActionSheet in turn: the surface stretches vertically across the rows between source and destination (one visible mid-travel frame per hop at 150 ms sampling), then settles on the destination row; icons, labels and the section header stay still. | `/tmp/canvas-liquid-motion-2026-09-18/web-sidebar-01` (`coarse.png` at 150 ms) |
| 2026-09-18 | Pagination numbered selection travel (`selection` profile), the window-shift rule: travel when the page the puck sits on keeps its frame, reset when it moves or leaves | Chromium headed via the repo's Playwright on `components/pagination` (the web-skin preview row), dark glass, 20 fps sampling, load average about 6 | 0303e0fe (clean) | unchanged | not sampled | 2 to 3 (window grows to `1 2 3 4 … 12`): one held frame with the "3" label already in selected ink, then the puck stretches from 2 across to 3 and lands in about 200 ms (frames 61 to 64 of `strip-056-071.png`); 3 to 2 and 2 to 1 (window shrinks): the same held frame then a glide back (`strip-076-087.png`); 1 to 12 (`1 2 … 12` to `1 … 11 12`, page 1 keeps its frame): a travel across the gap, the puck stretched over two slots mid-flight (`strip-120-131.png`); 12 to 11 and 11 to 10 (page 12 moves a slot): the puck appears on the new page at once, no travel. The row re-centres as the window grows, so every cell moves on screen but not inside the row, which is the space the cells are measured in. An in-page sampler (probe-hold2) put the first surface movement 10 to 20 ms after the click; the first recording's apparent 400 ms hold was the recorder clicking the iOS compare preview's cells and its clip drifting, not the component. | `/tmp/canvas-liquid-motion-2026-09-18/web-pagination-01` (`strip-056-071.png`, `strip-076-087.png`, `strip-120-131.png`, `zoom-060-063.png`), `actions-pagination.mjs` |
| 2026-09-18 | Pagination numbered selection travel and window-shift resets on the native material | iPhone 17 Pro simulator, iOS 26.3, dark glass, docs dev app on Metro, taps through the simulator tool, 20 fps sampling of a simctl recording | 0303e0fe (clean) | unchanged | not sampled (the docs app's JS thread is usable again since c78c2b76) | 1 to 2 and 2 to 3 (window grows each time): the tinted GlassView puck holds one frame on the old page, then stretches across to the new page with the selection profile's lift (about 1.5x the cell height at the peak) and settles in about 250 ms (`strip-071-078.png`, `strip-108-115.png`); 3 to 12, 12 to 11 and 11 to 1 (the anchored page leaves or moves): the puck appears on the new page in the next frame with no travel. Labels, chevrons and the ellipsis never move. | `/tmp/canvas-liquid-motion-2026-09-18/ios-pagination-01` |

Not covered by these runs: Android, Reduce Motion, a sealed candidate build, the
pressed lift and drag profiles, and the popup profile on iOS (the docs app's JS
thread ran near 3 frames per second there until c78c2b76 fixed its idle CPU; the
Pagination iOS row above is the first native run since). The native frame-interval trace exists but is
dominated by the docs shell (see the iOS row); a clean native number needs the
smoke app rebuilt with this fixture, which has no shell.

### Recording the docs pages in Playwright's headed Chromium

Since the docs gained the animated Backdrop, a component page opened in
Playwright's headed Chromium keeps its "Loading the examples" skeleton: the docs
chunk arrives (a 200 in the network log) but React never re-renders the Suspense
boundary until some other state update lands. Verified 2026-09-18: the skeleton
stayed for 60 s, `requestIdleCallback` only fired at its 3 s timeout while
`setTimeout`, `MessageChannel` and rAF were prompt, the page loaded at once under
`reducedMotion: "reduce"` (the Backdrop still), and the desktop app's own browser
pane and the headless shell load the same page fine. Treat it as a recording
quirk of that Chromium under the Backdrop's per-frame style writes (about 8,400
inline-style mutations a second at 100 fps): the actions module nudges the
Solid/Glass toggle until the examples are on the page
(`actions-pagination.mjs`), and clicks go through `page.mouse` at the cell's
centre because `locator.click()` scrolled the page to "reveal" a cell and moved
the clip. Anchor a row on an element handle: a locator anchored on a page number
drifts to another row once the window changes.

## Idle CPU of the docs app on iOS, 2026-09-18 (native-driver loops)

The docs dev app (`com.nannier.canvas`) sat at 150 to 170% CPU on the iPhone 17 Pro
simulator (iOS 26.3.1) on every route while the sealed smoke app idled at 0%. Attributed
with `sample` and Instruments' Time Profiler on the running process, then A/B'd through a
second `iPhone 17 Pro` device (`simctl create`) running the same `Canvas.app` build
against a worktree Metro (`RCT_jsLocation`), so the user's device was never touched.
Artifacts under `/tmp/canvas-liquid-motion-2026-09-18/`: the recordings in their own
folders and the call trees, screenshots, Instruments trace and the summarizer scripts in
`idle-cpu/`.

| Date | Effect and profile | Runtime and device | Revision (dirty?) | Values tried | rAF p50 / p95 / max (ms) | What the trace showed | Artifacts |
|---|---|---|---|---|---|---|---|
| 2026-09-18 | Baseline: the Backdrop clock, the Home hero orbit and the Components catalog pulse, all `Animated.loop` on the JS driver | iPhone 17 Pro simulator, iOS 26.3.1, docs dev app on Metro, home and `/testing/tabs` | b9ee50ab (peer's dirty tabs work in the primary checkout; identical backdrop code) | JS driver (`useNativeDriver: false`) | 293 / 303 / 305 over 13 frames in 4 s (JS thread saturated) | Process 150 to 170% CPU. Time Profiler over 12 s: 62.6% of samples on the JS thread, 36.5% on the main thread. `sample` call tree: the JS thread 100% busy, 89% of it inside `UIManager::setNativeProps_DEPRECATED` (the JS driver's per-frame path on Fabric): 49% in `RootShadowNode::layoutIfNeeded`, of which 43% is Yoga's `roundLayoutResultsToPixelGrid` walking the WHOLE tree (about 1000 react-native-svg nodes), and 35% cloning `ViewShadowNode`s along the path and their siblings. The main thread 54% busy, all of it `RCTMountingManager performTransaction`: 30% of the thread in `RCTScrollViewComponentView _remountChildren` (every ScrollView re-walks its subtree on every transaction) and 11% in `calculateShadowViewMutations`. Hermes GC and bundle evaluation did not register, so the development bundle is not the cost. | `baseline.trace`, `baseline-sample.txt`, `perf-home-baseline-sample.txt` |
| 2026-09-18 | Attribution: universe `still`, hero orbit stopped (probe edits, reverted) | second iPhone 17 Pro simulator, worktree Metro, home and `/testing/tabs` | b9ee50ab (probe edits) | universe still only: 160 to 170%; universe still and orbit stopped: 35 to 40% | not sampled | With only the universe stopped the JS thread stayed saturated (the orbit alone commits enough), so the cost is the commits per frame, not the view count. The residual 40% after both was the catalog pulse (`docs/src/catalog/patterns.tsx`) on the Components tab, which native tabs keep mounted on every route: 20% JS thread and 43% main thread in the same `setNativeProps` and `_remountChildren` paths. Nothing visible moved (screenshots 10 s apart identical). | `perf-e1b-relaunch-sample.txt`, `perf-e1-*.png` |
| 2026-09-18 | Fix: every loop on the native driver where there is one (`useNativeDriver: supportsNativeDriver`), each ONE `Animated.timing` shaped by its easing (`thereAndBack`, `holdThen`, `keyframes`), the Backdrop flight resumed from a wall-clock phase | second iPhone 17 Pro simulator, iOS 26.3.1, worktree Metro, dark glass, home and `/testing/tabs` | this commit (clean worktree, pre-rebase; re-measured after, see below) | native driver | 16.7 / 17.9 / 18.2 over 240 frames in 4 s (`Sample frames` on `/testing/tabs`, solid) | Home 19 to 21% CPU, `/testing/tabs` 26 to 33% (two screen surfaces mounted). JS thread 100% idle in every sample (0 of 3769 samples busy on home, 0 of 3663 on tabs, 0 of 2853 after toggling the surface solid and back). Main thread 23% busy on home, all `RCTNativeAnimatedNodesManager stepAnimations` to `synchronouslyUpdateViewOnUIThread` (direct prop updates on about forty animated views; no shadow-tree commits, no ScrollView re-walks). 8 s at 4 fps on home: the badges orbit and stay upright, the rainbow glow rotates, the star shells and streaks travel outward, glints flare at unrelated moments, a comet sweeps; full-size frames 250 ms apart show no snap or seam. Surface toggled solid (11.7%) and back to glass: the sky resumes mid-flight (the head timing then the loop) and keeps moving. | `ios-idle-native-01` (movie, sheet, strip 001-004), `fix-home-sample.txt`, `fix-tabs-sample.txt`, `fix-tabs-sampled.png`, `toggle-*.png` |
| 2026-09-18 | Spinner, Skeleton, Progress and InputOTP caret loops on the native driver | second iPhone 17 Pro simulator, docs component pages | this commit | native driver, single timings | not sampled | Spinner (`/components/spinner`, 2 s at 8 fps): the spokes advance about 50 degrees per 125 ms and keep turning past the first 900 ms iteration. Skeleton (`/components/skeleton`, 2.5 s at 8 fps): the line's brightness traces 26.7, 29.1, 26.4, 28.9, 26.4 over 10-frame periods, an out-and-back with no snap across two cycles. Progress: indeterminate renders the kit Spinner on iOS (verified above); the translateX sweep runs on Android and web only. InputOTP caret: NOT verified on the simulator, the docs example field took no focus from an idb tap (no keyboard, typed digits ignored; pre-existing, not touched here); the schedule is pinned by unit tests and the mechanism (a natively driven opacity loop on an Animated.View) is the one the Skeleton run exercises. | `ios-spinner-native-01` (`spinner-strip.png`), `ios-skeleton-native-01` (`skeleton-peak-vs-trough.png`), `ios-otp-caret-native-01` |
| 2026-09-18 | Web (JS driver, unchanged path, restructured loops) | Chromium (the built-in browser), docs at the worktree Metro | this commit | JS driver on web | not sampled | 33 of 72 animated nodes changed inline opacity or transform within 1.5 s and 26 transforms plus 23 opacities changed over 5 s, past the 3.2 s scintillate and 4.8 s twinkle cycle boundaries, so the head-then-loop resume and the easing-shaped cycles iterate on the JS driver too. | DOM samples in the session transcript |

| 2026-09-18 | Android: the same native-driver bundle | `canvas_pixel` emulator, Android 15, docs dev app pointed at the worktree Metro (`debug_http_host`), software GL | this commit (pre-rebase) | native driver | not sampled | The scene renders and moves (4562 px changed over 3 s). `top -H`: the JS thread (`mqt_js`) absent from the consumers, the main thread 2%, `RenderThread` 83 to 96%: the emulator's software GL rasterizing about five hundred SVG views at 60 frames per second, which the JS-driven build never reached (it drew 3 frames per second). The emulator's own SystemUI was ANR-ing during the run, so this is an observation of where the work sits, not a budget. A hardware-accelerated device and the Android skin's field trim are the levers for that cost, which is outside this run. | `android-*.png` |

The final numbers above were re-taken after rebasing onto origin/main a4ad0ec7 (the
liquid Tabs, TabBar and popup work): Home 21 to 23% CPU, `/testing/tabs` 28 to 30%
with the sampler at 240 frames, 16.7 / 18.1 / 24.8 ms, the JS thread 100% idle.

Not covered: Reduce Motion, a sealed candidate build, the InputOTP caret on a device,
and the remaining native-driver cost per animated view (about 0.5% CPU each on the
simulator), which is the framework's price for direct view updates and scales with the
scene's bucket count rather than with the tree.
