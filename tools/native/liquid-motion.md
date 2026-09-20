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
| 2026-09-18 | Calendar selected day travel (`selection` profile) through the month grid: diagonal, horizontal and vertical | Chromium headed via the repo's Playwright on `components/calendar` (the web-skin preview, scrolled into view once before any geometry is read), dark glass, 20 fps sampling | working tree on 53e8e7c3 (the Calendar commit that follows) | unchanged | not sampled | 24 to 12 (two rows up, five columns left): the puck leaves 24 and crosses the grid as one swollen blob over 22 and 13 before settling on 12 in about 250 ms; the day numbers, today's tint on 23 and the weekday row never move (`strip-067-074.png`). 16 to 3 and 3 to 24 (the column's three rows): the blob glides down the column through 10 and 17 with the same swell and recoil (`strip-145-152.png`). The lift is the selection profile's (about 1.5x the cell at the peak), which on a 36 px circle covers the neighbouring numbers it passes for one or two frames. | `/tmp/canvas-liquid-motion-2026-09-18/web-calendar-01` (`strip-067-074.png`, `strip-145-152.png`), `actions-calendar.mjs` |
| 2026-09-18 | Calendar selected day travel on the native material: diagonal and vertical | iPhone 17 Pro simulator, iOS 26.3, dark glass, docs dev app on Metro, taps through the simulator tool, 20 fps sampling of a simctl recording | working tree on 53e8e7c3 | unchanged | not sampled | 24 to 12: the tinted GlassView blob glides diagonally via 21 and 13 to 12 and settles in about 300 ms (`strip-079-086.png`); 3 to 24: down the column through 10 and 17 (`strip-198-205.png`). Two observations for the material owners rather than the motion: the newly selected number flips to `primary-foreground` the moment it is pressed, so it is unreadable on the bare cell for the ~150 ms flight (the same transient as the Pagination and the Navbar's iOS brand skin), and on iOS 26 in the dark scheme the brand-tinted GlassView renders so sheer that the dark `primary-foreground` label sits on a dark teal puck once settled (frames 203 to 205), a legibility gap the pre-liquid selected day already had. | `/tmp/canvas-liquid-motion-2026-09-18/ios-calendar-01` |
| 2026-09-18 | Carousel dot marker travel (`selection` profile on an ink marker the size of the skin's active dot) | Chromium headed via the repo's Playwright on `components/carousel` (the web-skin preview's dot strip), dark glass, 20 fps sampling | working tree on c5633f93 (the Carousel commit that follows) | unchanged | not sampled | Dot 1 to 3: the 18 px capsule leaves dot 1, stretches to about 26 px as it crosses dot 2 and settles on dot 3 in about 200 ms (`zoom-063-070.png`, frames 63 to 70 stacked); 3 to 2, 2 to 1 and 1 to 3 the same. The dots and the slides never move, and the strip at rest is pixel-for-pixel the skin's static strip (one brand capsule, the dot under it inactive). | `/tmp/canvas-liquid-motion-2026-09-18/web-carousel-01`, `actions-carousel.mjs` |
| 2026-09-18 | Carousel dot marker travel on iOS (equal-sized 7 pt dots) | iPhone 17 Pro simulator, iOS 26.3, dark glass, docs dev app on Metro, taps through the simulator tool, 20 fps sampling of a simctl recording | working tree on c5633f93 | unchanged | not sampled | Dot 1 to 3: the brand dot glides across dot 2, swelling to about 1.5x on the way, and settles on dot 3 in four frames (`zoom-077-084.png`); 3 to 1 and 1 to 2 the same. | `/tmp/canvas-liquid-motion-2026-09-18/ios-carousel-01` |
| 2026-09-18 | Dropdown popup open, dismiss, reopen on the native material (popup profile) | iPhone 17 Pro simulator, iOS 26.3, dark glass, docs dev app on Metro, taps through the simulator tool, 20 fps sampling | 459064fa (clean) | unchanged | not sampled | Open: the GlassView material rises from a low pill under the trigger to the full card in four frames (about 200 ms), then the rows appear (`strip-077-084.png`); dismiss: the rows retire at once, the material collapses back toward the trigger over three frames and is gone (`strip-159-166.png`). The first popup evidence on iOS since the docs app's JS thread was freed. | `/tmp/canvas-liquid-motion-2026-09-18/ios-dropdown-01` |
| 2026-09-18 | Navbar active link travel on the native brand capsule (`navigation` profile) | iPad Pro 11-inch (M5) simulator, iOS 26.3, dark glass, the docs dev app installed from the iPhone's bundle and pointed at Metro (`RCT_jsLocation`), taps through `idb ui tap`, 20 fps sampling | 459064fa (clean) | unchanged | not sampled | Users to Settings: the capsule leaves Users, stretches across to Settings and lands in three frames (`strip-012-019.png`); the Settings label flips to the capsule's ink two frames before the capsule arrives (the known transient). The docs app is portrait-locked, so the iPad's width is what gives the Navbar its links row on iOS. | `/tmp/canvas-liquid-motion-2026-09-18/ios-navbar-01` |
| 2026-09-18 | Sidebar rail active row travel on the native material, before and after the measured-targets contract | iPad Pro 13-inch (M5) simulator, iOS 26.3 (the 1032 pt portrait width is the desktop form factor, so the AppShell example renders the rail), dark glass, docs dev app on Metro, taps through `idb ui tap`, 20 fps sampling | 459064fa then the working tree of 067d6ba9 | unchanged | not sampled | Before: every selection jumped with no travel (`ios-sidebar-01`, first run): the shell shape measured its rows against a sibling node, which Fabric's measureLayout rejects. With the body made an ancestor, Inbox to Dashboard travels with the vertical stretch (`ios-sidebar-01/strip-046-053.png`) and Inbox to Analytics crosses the Reports header in five frames (`ios-sidebar-02/strip-126-133.png`), but a selection that made the single-open accordion close the section it left still held 300 ms on the old row and then jumped (`ios-sidebar-02/strip-222-229.png`: the reset unmounted the surface and the native material faded out). With the contract (hold, then travel or reset, no unmount) the same Traffic to Dashboard press travels (`ios-sidebar-03/strip-155-162.png`) after a 200 ms pause in which nothing on the rail changes, which the web run of the same sequence does not show (`web-sidebar-02/strip-132-143.png`: the collapse and the travel start on the next frame), so the pause is the dev bundle's re-render cost on the simulator, not the motion logic. | `/tmp/canvas-liquid-motion-2026-09-18/ios-sidebar-01`, `ios-sidebar-02`, `ios-sidebar-03`, `web-sidebar-02`, `actions-sidebar-accordion.mjs` |

Not covered by these runs: Android, Reduce Motion, a sealed candidate build and
the pressed lift and drag profiles. The popup profile on iOS has the Dropdown row
above (the docs app's JS thread ran near 3 frames per second there until c78c2b76
fixed its idle CPU). The native frame-interval trace exists but is
dominated by the docs shell (see the iOS row); a clean native number needs the
smoke app rebuilt with this fixture, which has no shell.

### Per-component verification record, 2026-09-18 (end of the phase 6 to 9 run)

A manifest entry is never evidence; each cell names what was actually run. "Logic"
is the focused test suite on the RNW harness with the real spring engine.
"Browser motion" and "iOS" are recorded runs in this log (contact sheets and frame
strips under `/tmp/canvas-liquid-motion-2026-09-18/`). Android was out of this
run's scope: its skins build and pass the suites but no emulator run was made.
"AT" is what the suites assert (roles, `aria-current`, `aria-pressed`, the retired
rows' `aria-hidden` and inert pointer events); no screen reader session was run.

| Component (profile) | Implementation | Logic | Browser motion | iOS material and motion | Android | AT |
|---|---|---|---|---|---|---|
| Tabs pills, TabBar (`selection`, `navigation`) | 9da8d06c | `test/tabs-liquid`, `test/tab-bar-liquid` | web-tabs-01 | ios-tabs-01 (JS thread then throttled) | not run | asserted |
| ButtonGroup segments (`selection`), Switch (`toggle`), Slider (`drag`) | pilots before this run | their suites | run-01 to run-03 (materials fixture) | ios-01 | not run | asserted |
| Dropdown, Select, AvatarMenu, collapsed Navbar menu (popup) | 977f38a3 and earlier | `test/popup-consumers-liquid` | web-dropdown-01, journeys `navbar-collapsed-menu` | ios-dropdown-01 | not run | asserted |
| Popover, RowMenu (+Board), split ButtonGroup, Autocomplete, PhoneInput, Command (popup) | 977f38a3 | `test/popup-consumers-liquid` | journeys (`popover-triggered`, `data-table-row-menu`, `board-card-menu`, `command-typed`, `phone-input-country`, `autocomplete-typed`) | not recorded (same policy and material as the Dropdown row) | not run | asserted |
| Navbar links (`navigation`) | d0faebfd | `test/navbars-liquid` | web-navbar-01 | ios-navbar-01 (iPad 11) | not run | asserted |
| Sidebar rows (`selection`) | 3fe773a6, fixed in 067d6ba9 | `test/sidebar-liquid` | web-sidebar-01, web-sidebar-02 | ios-sidebar-01 to 03 (iPad 13) | not run | asserted |
| Pagination numbered (`selection`) | 0303e0fe | `test/pagination-liquid` | web-pagination-01 | ios-pagination-01 | not run | asserted |
| Calendar selected day and range endpoints (`selection`), day peek and hover card (popup) | c85e2509 | `test/calendar-liquid` | web-calendar-01, journeys `calendar-peek` | ios-calendar-01 | not run | asserted |
| Carousel dot marker (`selection`, ink) | d20b6f70 | `test/carousel-liquid` | web-carousel-01 | ios-carousel-01 | not run | asserted |

Integration journeys, 2026-09-18 (`journeys.mjs`, headed Chromium, glass, no page
or console errors in any scenario; screenshots under `journeys/`): the collapsed
Navbar's Dropdown menu at 390 px opens and closes on Escape; the docs shell's own
Sidebar drawer at 390 px opens and closes on Escape (the drill-down group could not
be located by name, so the drill itself was not exercised); a DataTable RowMenu on
`components/row-menu` opens, its first item picks and the menu retires; a Board
card's kebab menu opens and closes on Escape; the triggered Popover with a text
Input keeps the typed value through a solid/glass toggle while open and closes on
Escape; the triggered Command palette filters nine options on "ne" and retires
on a pick; the PhoneInput country list and the Autocomplete list open, pick and
retire; the Calendar day peek opens on the event day and a tap elsewhere dismisses
it before the next selection; the FilterPanel drawer at 390 px opens with its four
checkboxes and closes on Escape. Every intermediate frame captured 120 ms after an
open shows the material alone with its content still concealed (`*-opening.png`),
and the settled frame the readable content (`*-open.png`); the surface toggle is
not in the header at phone width, so the mode change during an open drawer was
only exercised at desktop widths.

Resource check, 2026-09-18: twelve Dropdown open and close cycles on
`components/dropdown` in headed Chromium, a third of them interrupted mid-entrance
or mid-exit, left the DOM at 2,647 nodes, 11 SVG lens filters and 60 hidden nodes
before and after (`probe-leaks.mjs`); the only idle DOM work on the page is the
docs' Backdrop (about 5,000 inline-style writes a second at Playwright's
unthrottled frame rate, see the recording note below).

### Recording the docs pages in Playwright's headed Chromium

Until 2026-09-19, a component page opened in Playwright's headed Chromium kept its
"Loading the examples" skeleton: the docs chunk arrived (a 200 in the network log)
but React never re-rendered the Suspense boundary until some other state update
landed. Verified 2026-09-18: the skeleton stayed for 60 s, `requestIdleCallback`
only fired at its 3 s timeout while `setTimeout`, `MessageChannel` and rAF were
prompt, the page loaded at once under `reducedMotion: "reduce"` (the Backdrop
still), and the desktop app's own browser pane and the headless shell loaded the
same page fine. The cause was the Backdrop's per-frame style writes AND the
Skeleton's own shimmer, both JS-driven `Animated` loops that react-native-web turns
into one React commit per animation frame (see the 2026-09-19 section below: the
skeleton alone starved the retry with the sky unmounted). Both now run as
compositor CSS animations through the loop primitive, and every page in the
five-page load check resolves its examples with no nudge, headed and headless.
The nudge loop in `actions-pagination.mjs` and `journeys.mjs` (`settleDocs`) is no
longer needed; it stays harmless where it exists. Clicks still go through
`page.mouse` at the cell's centre because `locator.click()` scrolled the page to
"reveal" a cell and moved the clip, and a row is still anchored on an element
handle: a locator anchored on a page number drifts to another row once the window
changes.

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

## The moving brand puck's label ink follows the surface, 2026-09-19

The moving glass selections whose surface is a brand puck (numbered Pagination,
Calendar days, the Navbar's iOS brand skin) switched the newly selected label to
`primary-foreground` from the press, so it sat unreadable on the bare cell for the
~150 ms flight, and settled on a puck the frost had dyed too dark on iOS 26 dark
(the two open items in [[measured-targets-contract]], recorded in the Calendar and
Pagination rows of 2026-09-18). The fix drives the label ink from the surface's
coverage of each target through the shared measured-selection contract, and paints
the brand fill OVER the frost/lens so the ink solver's colour is the rendered one.

The `/testing/tabs` liquid harness gained a scheme switch, a numbered Pagination
and a month Calendar with `Jump page` / `Jump day` drivers and readouts (long,
alternating hops so a 20 fps strip shows each flight; one Calendar hop lands on
today's tinted cell; endpoint days carry events so the inverted dot's ink is
exercised). Recorded with the skill's recorder against the worktree Metro on 8093;
`actions-ink.mjs` writes the cell frames and the readouts beside each movie, and
`ink-trace.py` reads, per frame, each label's ink and the puck's coverage of its
cell so the ink is judged against the surface, not by eye alone. Development bundle,
so these are observations, not a sealed-candidate pass.

| Date | Effect and profile | Runtime and device | Revision (dirty?) | Values tried | rAF p50 / p95 / max (ms) | What the strip and trace showed | Artifacts |
|---|---|---|---|---|---|---|---|
| 2026-09-19 | Pagination + Calendar brand-puck label ink follows the surface (`selection`), dark glass, brand fill over the lens | Chromium headed via the repo's Playwright on `/testing/tabs`, 1280x800, dark, 20 fps sampling | 26e4c36f then f25f8481 (clean worktree) | `INK_FOLLOW { covered 0.4, clear 0.9 }`, `brandOverMaterial`; `PROFILES` unchanged | 7.8 / 8.0 / 51 over 1584 frames (the max is the solid-to-glass switch) | Pagination hops 2,5,3,6: the arriving number stays white until the puck's coverage of its cell passes ~0.5, then turns navy (`ink-trace.py`: on every hop `24`/`5`/`3`/`6` reads white with puck=0 and navy only at puck>=0.5); the departing number takes white back as coverage drops (`2` stays navy while puck>0, white after); a number the flight only crosses is never driven. Settled puck 4.5-5.6:1 to the navy label (was ~2:1 under-material on the earlier frost path). The web bordered tile's border dissolves under the arriving puck and re-forms behind it (`row-104-115.png`). Calendar hops 3,24,12,23: same, the event dot inverts with the number. | `/tmp/canvas-liquid-motion-2026-09-19/web-ink-02`, `web-ink-03` (movie, sheet, `row-104-115.png`, `hops-zoom.png`, `calendar-hops.png`, `trace.json`), `actions-ink.mjs`, `ink-trace.py` |
| 2026-09-19 | The same in LIGHT glass | Chromium headed via the repo's Playwright on `/testing/tabs`, 1280x800, light, 20 fps sampling | f25f8481 (clean) | as above | 7.8 / 8.4 / 35 over 1378 frames | Light was never the defect (both inks are the same dark navy there), and it stays correct: bright sky pucks with dark labels throughout, the resting tile dissolving and re-forming the same way (`row-hop1.png`). Confirms the over-material fill did not regress light. | `/tmp/canvas-liquid-motion-2026-09-19/web-ink-04-light` (movie, sheet, `row-hop1.png`) |
| 2026-09-19 | Pagination + Calendar brand-puck ink on the native frost material | iPhone 17 Pro simulator (a throwaway `simctl create`, the user's device untouched), iOS 26.3, dark glass, the docs dev app installed from the primary device's bundle and pointed at the worktree Metro (`RCT_jsLocation`), taps through `idb ui tap`, 20 fps sampling of a simctl recording | f25f8481 (clean) | as above | not sampled | The moving selections are `static` GlassSurfaces, so on iOS 26 they render the expo-blur frost, not the native Liquid Glass; the brand fill now paints over that frost. Pagination 2->5->3->6 and Calendar 3->24->12->23->3: the arriving label stays white until the puck arrives then settles navy at 5.27:1 (was 1.9:1 under-material on 2026-09-18); the departing `3` keeps its navy ink while the puck covers it (frames 168-169), dims for a single 50 ms crossover frame (170), then white (171+) (`cell3-zoom.png`, `calendar-hops.png`, `row-hops.png`). No unreadable flight window remains. | `/tmp/canvas-liquid-motion-2026-09-19/ios-ink-01` (movie, sheet, `cell3-zoom.png`, `calendar-hops.png`, `row-hops.png`) |
| 2026-09-19 | The native Liquid Glass `tintColor` path itself (a non-static brand puck): a primary Button on iOS 26 dark | iPhone 17 Pro simulator, iOS 26.3, dark, docs `components/button` | f25f8481 | none (measurement only) | not sampled | The task's second finding named "the GlassView tintColor path", but the moving selections do not use it (they are `static` frost, above). The genuine native GlassView path, a primary Button, was measured over its opaque page: puck (96,204,252), label ink (8,16,24), 10.5:1. Legible, so `brandTint` was not the constraint there and the native path is left unchanged. The dark-teal settled puck the finding described was the frost-under-material rendering, which change (2) fixes. | `/tmp/canvas-liquid-motion-2026-09-19/ios-button-dark.png`, `ios-button-crop.png` |
| 2026-09-19 | Navbar iOS brand capsule: active link travel, label ink follows, resting capsules dissolve | Chromium headed via the repo's Playwright on `components/navbars` (the iOS compare column, which renders the iOS skin's brand capsule on web), dark glass, 20 fps sampling | f25f8481 (clean) | as above | not sampled | Dashboard->Users->Settings->Dashboard: the sky capsule travels, its label stays navy while the capsule covers it and returns to the brand-blue resting ink as it leaves; the neutral resting capsules of the two flight endpoints dissolve under the surface and re-form, the uninvolved `Settings` keeps its capsule the whole time; one crossover frame where both labels dim (`hop1.png`). | `/tmp/canvas-liquid-motion-2026-09-19/web-navbar-01` (movie, sheet, `hop1.png`), `actions-navbar.mjs` |

## The web Tabs and TabBar take the iOS liquid-glass anatomy, 2026-09-18

The owner's call: the web tab is to look like the iOS tab with liquid glass, in both
modes, and the TabBar too. The Tabs shell already derives the glass track and the
travelling puck from the skin's fills, so the web Tabs change is the skin: the capsule
segmented control shared with iOS (`capsuleSkin` in `tabs.styles.ts`), the browser
focus ring kept. Recorded with the skill's recorder against the worktree Metro on 8082
and `actions-capsule-tabs.mjs` (beside the other actions modules in the artifact root).

| Date | Effect and profile | Runtime and device | Revision (dirty?) | Values tried | rAF p50 / p95 / max (ms) | What the sheet showed | Artifacts |
|---|---|---|---|---|---|---|---|
| 2026-09-18 | Web Tabs as the capsule segmented control: default and pill variants, solid to glass, three pill hops, two workspace hops | Chromium headed via the repo's Playwright, 1280x800, dark, 20 fps sampling | Phase 1 commit (clean worktree) | `capsuleSkin` shared with iOS; `PROFILES` unchanged | 17.1 / 32.8 / 1366 over 573 frames; the maximum is the solid-to-glass switch (lens definitions regenerate for every surface on the page), the hops themselves stayed under 33 ms | Capsule track with the material rim, a lighter glass puck with a bright specular edge, on-foreground labels, the disabled tab dimmed: the same anatomy as the iOS row in the docs' three-up. Label ink changes one frame before the puck lands; the puck sits on the new tab by the second frame and stays put (strip 476-487). Solid mode on the docs Tabs page: iOS and web rows identical in light and dark (gray track, raised white pill; lifted gray pill in dark), Android keeps the underline; badge counts, six-tab overflow and the block layout render as on iOS. | `web-capsule-tabs-01` (movie, sheet, `strip-476-487.png`, `frame-487-zoom.png`, `trace.json`) |
| 2026-09-18 | TabBar as the iOS 26 floating capsule on web: solid to glass, three pill hops, two workspace hops, two destination hops (`navigation` profile) | Chromium headed via the repo's Playwright, 1280x800, dark, 20 fps sampling | Phase 2 commit (clean worktree) | `floating { horizontal 16, bottom 8, clearance 12 }`, bar 58 with a 4 inset, the cell capsule `background` / lifted `muted` thumb at the selection tint ceiling; `PROFILES` unchanged | 7.6 / 11.7 / 35.2 over 1247 frames | A floating capsule with the material rim over the page, icons over labels, the selected cell a lighter glass capsule with the specular edge. Search to Profile: the puck stretches across both cells for one frame, lands wide on Profile, settles by the fourth (strip 213-220, `tabbar-230.png`). On the docs TabBar page the iOS and web rows are identical in glass and in solid, light and dark (muted capsule, white raised cell, ambient shadow); Android keeps the docked bar and the icon pill (`web-shots/tabbar-desktop-*.png`). | `web-capsule-tabbar-01` (movie, sheet, `strip-213-220.png`, `tabbar-*.png`, `trace.json`), `web-shots/` |
| 2026-09-18 | The kit TabBar on iOS: the floating capsule with real Liquid Glass, three taps (Home, Search, Profile, Home) | second iPhone 17 Pro simulator, iOS 26.3.1, docs dev app on the worktree Metro, dark glass, 20 fps sampling of a simctl recording | Phase 2 commit | as above | not sampled | The docs TabBar example renders the floating capsule with the system material and the Home cell as a lighter glass capsule, beside the app's own system tab bar, which it now matches. Home to Search: the Search ink turns first, the puck stretches from Home across to Search (one frame), lands slightly wide, settles by the fourth (strip 048-055); the two later hops alike. | `ios-capsule-tabbar-01` (movie, sheet, `strip-048-055.png`), `ios-tabbar-page.png` |
| 2026-09-18 | The docs' narrow web shell overlays the floating bar; pages keep an 80 bottom inset | Chromium via Playwright, 390x844, dark glass and light solid | Phase 3 commit | `CONTENT_BOTTOM_INSET` 80 on web | not sampled | The capsule floats 8 px above the bottom edge with the page scrolling beneath it: under glass the lens refracts the text passing under the bar, in solid the capsule sits on the page with its ambient shadow and the last row scrolls clear of it. | `web-shots/shell-*.png`, `web-shots/shell-bottom-pair.png`, the `shots.mjs` that took them |

## The Backdrop and the Skeleton shimmer on the loop primitive, 2026-09-19 (web compositor animations)

The docs' animated Backdrop cost a lot on the web at idle. react-native-web has no
native animated module, so the JS driver's per-frame path is `AnimatedProps.update()`
to a `useReducer` dispatch: every `Animated.View` re-renders through React on every
animation frame, and the native-driver flag that fixed iOS (c78c2b76) is a no-op
there. The kit now has a loop primitive (`createLoopChannel` and `LoopView` in
`src/style/loop.tsx`): a channel is a shared periodic phase with a wall-clock epoch,
a track maps it onto opacity or a transform component as `inputRange` /
`outputRange` plus a phase offset, and the view renders the natively driven
interpolation graph on iOS and Android and a plain View carrying a CSS keyframe
animation on the web, compiled through react-native-web's own `animationKeyframes`
style with the phase in an inline `animation-delay`. The Backdrop clock's channels,
the SVG renderer (twinkle buckets nested inside their layer so opacity multiplies
through nesting), the docs' galaxy core and comets, and the Skeleton shimmer all bind
through it. Probes, screenshots and recordings all sit in
`/tmp/canvas-liquid-motion-2026-09-19/`: `probe-backdrop.mjs` (React commits via a
DevTools hook shim, style mutations, a CDP CPU profile), `trace-backdrop.mjs`
(main-thread time by category from a Chromium trace plus per-process CPU from
`SystemInfo.getProcessInfo`), `load-check.mjs` (a quiet six-second load, one read),
`frame-diff.py` (pixels changed per frame of a recording), `harness-run.mjs` and
`actions-backdrop.mjs` (the harness drivers), and the web and iOS harness recordings.

| Date | Effect and profile | Runtime and device | Revision (dirty?) | Values tried | rAF p50 / p95 / max (ms) | What the trace showed | Artifacts |
|---|---|---|---|---|---|---|---|
| 2026-09-19 | Baseline: the docs sky on the JS driver, `/components/badge` at idle | Chromium headed via the repo's Playwright, 1280x800, light glass, rAF unthrottled at 254 fps, 3 s window | cd7c36af (clean) | JS driver | 3.9 / 4.0 / 47 | 1.02 React commits per frame (260 a second), 9,267 inline `style` writes a second (36.5 per frame across 33 wrapper divs). Chromium trace: main thread 99.8% busy, 2,446 of 3,004 ms scripting of which 2,420 ms is React's `performWorkUntilDeadline` and 107 ms the Animated `onUpdate` rAF callback, 259 ms painting; renderer process 154% CPU, GPU process 153%. Headless: 96.5 fps, one commit per frame, 3,395 writes a second, main thread 100% busy. Reduced motion (the sky still): 2 commits a second, 1 write a second, main thread 20% busy. With the sky unmounted (`?surface=solid`) the Skeleton shimmer alone still drove 255 commits a second and starved the docs chunk's Suspense retry, so the fix had to cover both. | `probe-backdrop.mjs`, `trace-backdrop.mjs` |
| 2026-09-19 | Pricing the compositor path: the same 33-layer sky as static SVG under pure CSS keyframe animations | Chromium headed, 1280x800, device scale 1 and 2, 250 fps | (throwaway page) | CSS `animation` on transform and opacity | not sampled | 0 DOM mutations a second, 33 live animations; renderer 19% CPU, GPU 33% at both scales (against 154% / 153% for the React-driven sky at the same frame rate). Go for the CSS path. | `proto-css-sky.html`, `probe-proto.mjs` |
| 2026-09-19 | The Backdrop harness `/testing/backdrop` (docs shell solid, so only the harness sky animates): running, then parked | Chromium headed, 1280x800, light, 254 fps, the fixture's own 4 s sampler | before: cd7c36af; after: this commit | JS driver, then the loop primitive | before 3.9 / 4.0 / 66.7; after 3.9 / 4.5 / 11.7 | Before: 6,512 style writes a second while running, 0 parked, 0 CSS animations. After: 0 style writes a second running AND parked, 35 CSS animations running and 0 parked. Recorded fly, park, resume (`web-backdrop-before-01`, `web-backdrop-after-01`, 8 fps): about 300 px change per 125 ms frame while running in both, 0 while parked in both, the park jump to the poster and the resume jump back alike, and the full-size frames 20-23 (after) against 80-83 (before) show the same field, glints, streaks and nebula at the same positions. | `/tmp/canvas-liquid-motion-2026-09-19/web-backdrop-{before,after}-01` (movie, sheet, `strip-020-023.png`, `strip-080-083.png`), `frame-diff.py` |
| 2026-09-19 | After: the docs sky and the Skeleton on the loop primitive, `/components/badge` at idle | Chromium headed, 1280x800, light glass, 229 to 237 fps, 3 s window | this commit (clean worktree) | loop primitive (CSS keyframes) | 3.9 / 4.5 / 12 | 6.7 to 10.7 React commits a second (0.03 per frame, the page settling), 43 style writes a second (one re-render of 45 elements when the docs chunk landed, none per frame after), 43 live CSS animations, main thread 63% idle from a profile that was 0.2% idle before. Computed-style sampling of the 30 animated wrappers: 13 distinct opacities at one instant (the buckets are differential), 28 of 30 changed over 3 s (the two still ones are the parked comet and the 180 s drift at 250 ms resolution). The docs chunk's examples appear at 1.1 to 1.4 s with no nudge. | `probe-backdrop.mjs`, `probe-computed.mjs`, `badge-{before,after}-dark.png` |
| 2026-09-19 | The no-nudge load check: five component pages, one quiet read after six seconds | Chromium headed (rAF 255 to 257 fps) and headless via the repo's Playwright | before: cd7c36af; after: this commit | as above | not sampled | Before: badge, popover, dropdown, navbars at 390x844 and calendar/daypeek all still on their skeleton after 6 s headed; headless 3 of 5 resolved. After: all ten resolved (polling the page every 100 ms had masked the starvation on the old code, so the check reads once). | `load-check.mjs` |
| 2026-09-19 | The Backdrop harness on the native driver: fly, park, resume, sample | second iPhone 17 Pro simulator (`simctl create`, the docs app installed from the user's device and pointed at the worktree Metro on 8095, deleted afterwards), iOS 26.3, dark glass, taps through `idb ui tap`, 8 fps sampling of a simctl recording | this commit | loop primitive (native driver, linear phase timings with the shape as an interpolation) | 16.7 / 16.8 / 25.3 over 232 frames in 4 s (the fixture sampler) | The harness sky and the app's root universe both move (6 to 9k px change per frame below the readouts); Park drops the harness sky to its poster and the change halves to the root universe alone; Resume brings it back. Process 31 to 34% CPU on the harness route (two skies), 17 to 23% on Home (one sky, the same as the 2026-09-18 native-driver number). `sample`: the JavaScript thread idle in 2598 of 2598 samples, the main thread 49% busy and all of it `RCTNativeAnimatedNodesManager stepAnimations` to `synchronouslyUpdateViewOnUIThread`; no `setNativeProps_DEPRECATED`, no `_remountChildren`, no Yoga pixel-grid walk. | `/tmp/canvas-liquid-motion-2026-09-19/ios-backdrop-after-01`, `ios-sample-harness.txt`, `ios-home-after.png` |

Not covered: Android (the emulator's software rasterizer dominated the 2026-09-18 run
and nothing here changes what it rasterizes), Reduce Motion end to end on a device, and
the other JS-driven loops that remain on the web (the Home hero orbit, the catalog pulse,
Spinner, the indeterminate Progress sweep, the InputOTP caret), which are the next
adopters of the primitive.

## The popup opens from a droplet with its rows inside, 2026-09-19 (the iOS 26 menu presentation)

The user asked for the Autocomplete list to open the way the iOS 26 menu behind the
docs header's hamburger does. That menu is a native `UIMenu`, so the reference is a
recording of it on the user's iPhone 17 Pro simulator (the first row below), read at
30 fps: the button's pill vanishes and a glass droplet about 45% wide and 35% tall
appears with the rows already inside it, scaled down and faint; it reaches full size
in four to five frames, overshoots a few percent and settles over the next 150 ms
while the rows sharpen; on dismiss the rows vanish in one frame and the pane shrinks
back into the pill over about five frames and merges with it. The kit's popup policy
(`usePopupMotion`, shared by every glass option list and menu) grew an EMPTY pane from
a zero-height sliver in two frames and popped the rows in at full opacity once the
spring settled (the web baseline row), which is the difference the user saw.

The change: `POPUP_PRESENTATION` in `src/style/popup-motion.tsx` is the one table
(travel springs, the droplet seed, the across fraction, the droplet radius and where
the skin's returns, the rows' fade marks, the contour). An opening from the closed
state seats progress at the seed (0.35) so the first paint is the droplet; the open
spring is underdamped (650/38, about 3% past rest) and the close stays clamped
(720/42); the pane's corner starts at half the droplet's shorter side and is the skin's
again by progress 0.85, carried to the material's clip, its lens, its rim and the
native GlassView through `MaterialShapeContext` (`useMaterialFill` /
`useSpecularRim`); the rows render from the first frame inside an animated wrapper
(scale = progress, centred across the anchor axis, opacity 0 to 1 between progress
0.15 and 0.7, identity at rest) and stay inert and hidden from assistive tech until
progress first reaches 1; on close the rows still retire at once and the pane keeps
its measured size while it shrinks (the freeze is close-only now). The button merge
(the pill absorbing the menu) is not part of this: the Autocomplete's field stays
visible for typing, and the merge is a UIKit-private effect. Blur-to-sharp is out too
(`filter: blur` is Android and web only in react-native 0.86). The harness is
`/testing/popup` (`examples/starter/smoke/fixtures/popup.tsx`): the real Autocomplete
and Dropdown under controlled Open / Close / Toggle / Cycle drivers, material and
scheme switches, a frame readout, `?mode=glass&scheme=dark` to start there. The web
actions module (`actions-popup.mjs`, beside the others in the artifact root) records
the pane's material bounds and corner and the rows' opacity and transform every
animation frame into `trace.json`; `probe-cycles.mjs` counts lens definitions across
ten cycles.

| Date | Effect and profile | Runtime and device | Revision (dirty?) | Values tried | rAF p50 / p95 / max (ms) | What the strip and trace showed | Artifacts |
|---|---|---|---|---|---|---|---|
| 2026-09-19 | REFERENCE: the native iOS 26 `UIMenu` behind the docs header's hamburger (`unstable_headerRightItems` menu), open and dismiss | the user's iPhone 17 Pro simulator, iOS 26.3, dark glass, taps through `idb ui tap`, 30 fps sampling of a simctl recording | f3c37402 (the harness commit; the menu is UIKit's) | none (measurement) | not sampled | Open (frames 074 to 088): the header pill is gone at 075 and a droplet about 45% wide and 35% tall sits under the button with the rows inside it, small, faint and blurred; 076 to 078 it grows with the rows scaling up and sharpening; 079 full and slightly past rest; 080 to 084 a settle while the corner relaxes to the menu's radius; sharp rows from 081. Dismiss (166 to 180): the rows vanish and blur in one frame (167) with the pane still full; 169 to 171 the pane shrinks toward the button as a narrowing blob; 172 to 173 it merges into the re-forming pill with a liquid bridge; 174 to 176 the pill's icons fade back. | `/tmp/canvas-liquid-motion-2026-09-19/ios-native-menu-01` (movie, sheet, `open-073-090.png`, `dismiss-165-182.png`) |
| 2026-09-19 | BASELINE: the Autocomplete list on the docs page under the previous popup policy (travel 650/42 clamped from a 0 by 72% sliver, rows concealed until settle) | Chromium headed via the repo's Playwright on `components/autocomplete` at the user's 8081 Metro, 1280x800, dark glass, 25 fps sampling | 2fe2c83b (the worktree behind 8081; popup sources identical to main) | previous values | not sampled | Open: click at 096, a partial empty pane at 098, the pane full and still EMPTY at 099 and 100, the rows pop in at full opacity at 101: two frames of growth too fast to read, two frames of empty pane, then a pop. Close (Escape): rows gone at 137 with the pane full, 138 shrinking, 139 gone. | `web-autocomplete-baseline-01` (movie, sheet, `open-095-106.png`, `close-136-143.png`), `actions-autocomplete-baseline.mjs` |
| 2026-09-19 | The new presentation on the harness: list open, close, open, close, reopen mid-exit, menu open and close, with the geometry probe | Chromium headed via the repo's Playwright on `/testing/popup?mode=glass&scheme=dark` at the primary checkout's Metro (8097), 1280x1100, dark, 25 fps sampling | working tree of the phase-2 commit (clean apart from it) | the table's initial values, derived from the reference: travel open 650/38, close 720/42, seed 0.35, across 0.3, radius droplet 0.5 settled 0.85, rows fade 0.15 to 0.7, contour unchanged; kept | 7.8 / 11.9 / 82.4 over 1744 frames (the max is the first opening's lens definitions); the harness readout at idle after the run 7.7 / 8.5 / 23.0 | Trace: the pane appears as a 536 by 98 droplet (55% by 35% of 973 by 280) with a 49 px corner, the rows at scale 0.35 and opacity 0.36, its top edge on the field's edge at y=554 throughout; full height 160 ms later, 2.1% past rest at +200 ms, settled within 0.1% by +300 ms; the rows reach opacity 1 at +90 ms and identity at +170 ms; the corner is the skin's 16 by +105 ms. Close: 55 ms after Escape the rows are gone and the pane shrinks to 1 px in 137 ms, then unmounts. Menu: a 109 by 81 droplet at the trigger's centre (rows translated 20 px toward the anchor), full in 160 ms, 2.1% overshoot, 140 ms shrink on close. Strips: the list's droplet under the field with tiny rows at 111, rows readable at 113, full and sharp at 115 (`open-109-120.png`); rows-gone ghost at 145, shrink into the field's edge 146 to 148 (`close-144-151.png`); the menu's droplet with tiny rows at 273, full at 276, settle to 278 (`menu-open-273-284.png`). A reopen landing after the exit finished is a fresh droplet opening; one landing mid-exit grows on from wherever the pane is (run 01: from 2.8 px). Click-to-droplet latency 100 to 120 ms (the hosted overlay's measure-then-mount handshake, unchanged by this work; the native menu shows its droplet one frame after the tap). | `web-popup-02` (movie, sheet, `trace.json`, the strips above), `web-popup-01` (the same run before the clip and the Escape close were fixed: the list opened above the field at 800 px and the close driver sat under it), `actions-popup.mjs` |
| 2026-09-19 | Resource check: ten open-and-close cycles on the harness (two Cycle bursts) | Chromium headed via the repo's Playwright on the harness, 1280x1100, dark glass | as above | as above | not sampled | Lens filter definitions 13 before, 13 after five cycles, 13 after the pane had left, 13 after ten; no listbox left mounted after either burst. The per-frame corner animation adds no definitions of its own (the layers share the clip's def by size). | `probe-cycles.mjs` |
| 2026-09-19 | The list on the native material: two openings and closes through the drivers | a throwaway iPhone 17 Pro simulator (`simctl create`, deleted afterwards; the user's device untouched), iOS 26.3, dark glass, the docs dev app installed from the user's device bundle and pointed at Metro 8097 (`RCT_jsLocation`), taps through `idb ui tap`, 30 fps sampling of a simctl recording | as above | as above | not sampled | The pane is the native GlassView with the dense tint. Open (077 to 088): 078 the droplet under the field with its corner visibly rounder than the resting 26 pt and the rows tiny inside it; 079 to 080 the rows scale up; 081 full and slightly wide; settled by 084. Close (148 to 155): rows gone at 149 with the pane full; 150 to 152 the pane shrinks into the field's edge; 153 gone. The Dropdown's menu in this harness landed at the top of the screen instead of above its trigger: reproduced with the kit changes stashed and with the viewport host, so it is a pre-existing placement fault of the hosted overlay's above side inside a scrolled Page on iOS, outside this work. | `ios-popup-01` (movie, sheet, `open-077-088.png`, `close-148-155.png`), `menu/placement-before-menu.png`, `menu/placement-after-menu.png`, `menu/viewport-menu.png` |
| 2026-09-19 | The Dropdown menu on the native material: open, backdrop dismiss, reopen | the same throwaway simulator on the docs `components/dropdown` page (the stage host, where placement is right), dark glass, 30 fps sampling | as above | as above | not sampled | Open (071 to 082): 071 a droplet under the Actions pill, rounder than the menu's corner, with the three rows tiny inside it; 072 to 073 the rows scale up; 074 full and slightly wide; settled by 076. Dismiss (151 to 158): rows gone at 152 with the ghost pane full; 153 shrunk to about 60%; 154 a small pill under the trigger; 156 a sliver; 157 gone. Reopen (224 to 235) the same bloom. This is the hamburger's presentation on the kit's menu, minus the pill merge. | `ios-popup-menu-01` (movie, sheet, `open-071-082.png`, `dismiss-151-158.png`, `reopen-224-235.png`) |

Not covered: Android (no emulator was available; the Android frost keeps the skin's
corners under the animated clip and the rim carries the edge, the same as the iOS
frost path), Reduce Motion on a device (the unit tests pin the snap), and a sealed
candidate build.

## The hosted overlay's opening handshake, 2026-09-19 (click to droplet)

The previous section put the click-to-droplet latency of the liquid popup at 100
to 120 ms on the docs dev build against the native menu's one frame. That figure
was the actions module's "open" mark to the first sized material sample, and the
mark was stamped BEFORE Playwright's own round trip (`boundingBox()`, then
`mouse.click()`); measured from the DOM click event itself (a capture listener in
the page, `profile-open.mjs` and `actions-popup-latency.mjs` in the artifact
root), a warm opening on the harness was about 53 ms and the cold first one about
150 ms in unthrottled headed Chromium, and the harness's own re-render (the
controlled drivers set PopupBody's state, so the whole fixture renders before the
Autocomplete does) was 17 to 30 ms of it.

Where the rest went, from React's commits (a `__REACT_DEVTOOLS_GLOBAL_HOOK__` shim),
patched `setTimeout` / `requestAnimationFrame` / `ResizeObserver`, and temporary
`performance.mark` calls in the kit (removed again): the passive Portal publish and
the Outlet commit that mounted the dismiss backdrop; a `requestAnimationFrame`
before the first measurement; three CHAINED `measureInWindow` calls (trigger,
outlet, root outlet), each a `setTimeout(0)` on react-native-web 0.21 (its
`UIManager.measureInWindow` and `measure` both wrap the DOM read in a timer), with
the per-frame retry issuing a second chain while the first was still in flight;
the rect render, a passive publish and the Outlet commit that mounted the card
(7 ms warm, 26 ms cold); the ResizeObserver at the next rendering opportunity and
28 per-node measure timers (the card, the scrollport, and the rows' own onLayout);
the sizes render, a passive publish and the Outlet commit that flipped `ready`;
the spring's layout effect and the seed flush commit; the next frame. Nine commits
and three frame-aligned waits. On iOS (the dev bundle on a simulator, traced
through Metro's console) the same shape took 150 ms after the click commit, of
which the card mount was 45 to 60 ms, each Outlet re-render 10 to 40 ms and the
`requestAnimationFrame` about 20 ms; Fabric's `measureInWindow` answers
synchronously (`UIManagerBinding.cpp` calls the callback inline), so the chain
itself was free there. The iOS trace also showed that at the harness's default
scroll the list flips ABOVE the field: the card mounted under the below cap (85 pt),
the reports flipped the fit, and the spring started at 85 pt and re-targeted 260 pt
78 ms later, a droplet growing toward a size and edge it was about to leave.

The change (`src/style/anchored-overlay.tsx`, `src/style/portal.tsx`; the
`POPUP_PRESENTATION` table is untouched): the hosted overlay measures from a
layout effect with the three reads issued together and joined (one timer hop on
the web instead of three; on Fabric the rect lands inside the opening commit and
the card mounts in the same JS task), an in-flight attempt gets three frames
before another is issued, `Portal` publishes and retires from a layout effect so
the Outlet re-renders in the same commit sequence as its owner (the retire had to
move with it: a provider that swaps its host shares one registry), a viewport host
reads its parent's band and its own box together, and readiness waits for the
second layout only when the fit's new cap is bound to change the card's height
(taller than the new cap, or standing at the old cap with content that wants the
room), on the first reveal only, so a filter that flips the side mid-interaction
never hides the card. The harness gained an uncontrolled Dropdown on its own
trigger (`popup-dropdown-own`, readout `popup-own-readout`), the consumer path,
where an opening re-renders the Dropdown alone.

What it bought, and what it did not. On iOS the recording shows the droplet ONE
frame after the click's commit where the baseline showed it five and three frames
after (the rows below): the rect lands inside the click's own commit, the card
mounts in that task, and only the layout events and the reveal wait for the next
turn. On the web the reads per opening went from 8 to 12 (two or three chains) to
4 and the overlay's animation-frame waits from 2 to 4 to 1, but the commit count
stayed at 9 and the measured click-to-droplet did not move outside the noise on
this machine: it was thrashing throughout the runs (24 GB RAM, 17.8 GB of swap in
use, load average 600 to 900 with three simulators and Chrome), so warm openings
ranged 47 to 131 ms in both arms (interleaved baseline / after pairs, medians
about 75 and 71 ms in bundled Chromium and 72 and 68 ms in Google Chrome); on a
display-bound browser the removed animation-frame wait is worth up to a frame, an
inference, not a measurement here. The flip case now starts at the right size on
both. The remaining time is React render work in the dev bundle (the click render,
the card mount, two Outlet re-renders, the sizes render) and, on iOS, the JS-driven
Animated seed flush: on Fabric `createAnimatedPropsHook` calls `setNativeProps` per
animated view, a shadow-tree commit each, 35 to 114 ms between `motion:start` and
the next layout effect on the simulator, then a debounced re-render every 48 ms
while the spring runs. Those, not the handshake, are what still separate the kit's
droplet from the native menu's frame; a native-driver presentation (transform
based, one animated node) is the next lever and a change to the presentation
table, not to this handshake.

| Date | Effect and profile | Runtime and device | Revision (dirty?) | Values tried | rAF p50 / p95 / max (ms) | What the strip and trace showed | Artifacts |
|---|---|---|---|---|---|---|---|
| 2026-09-19 | PROFILE of the opening handshake before the change: React commits, timers, animation frames, ResizeObserver callbacks and kit marks from the DOM click to the first sized material sample | Chromium headed via the repo's Playwright on `/testing/popup?mode=glass&scheme=dark` at this worktree's Metro (8099), 1280x1100, dark glass; the iOS dev app on a throwaway iPhone 17 Pro simulator pointed at the same Metro, traced through Metro's console | f057b4ec with the temporary marks (removed before the commit) | none (measurement) | not sampled | Web, warm list opening (53 ms): click render 17 ms; Outlet commit with the backdrop; a 2 ms wait for the animation frame; the chained measures 7 ms with the retry's second chain interleaved; rect render, passive publish, card mount 7 ms; ResizeObserver, 28 measure timers, sizes render 5 ms; passive publish, Outlet commit with `ready` 7 ms; seed flush; the next frame. Cold first opening 151 to 157 ms: 30 ms click render, a 47 ms untraced BeginMainFrame before the animation frame, a 26 ms card mount, 14 ms of per-row measure timers. iOS, below placement: click commit at 84 to 146 ms after the tap (the fixture's own render), then 152 to 154 ms to `motion:start` (animation frame 20 ms, card mount 45 to 60 ms, each Outlet re-render 10 to 40 ms); at the default scroll the list flips above and the spring started at 85 pt, re-targeting 260 pt 78 ms later. | `profile-open.mjs`, `analyze-trace.mjs`, `trace-cold-open.mjs` and the traces under the session scratchpad (`profile-baseline/`, `trace-cold/`, `ios-baseline-trace.txt`, `ios-baseline-below-trace.txt`) |
| 2026-09-19 | The handshake after the change, same probe, interleaved with the baseline on one Metro (the source toggled in place between runs) | bundled Chromium headed, three baseline / after pairs, three page loads each with three list openings, three own-trigger openings and two menu openings; then two pairs in the installed Google Chrome | working tree of this commit (clean apart from it) | measure in a layout effect, the three reads joined, PATIENCE 3 frames, layout-effect Portal publish and retire, the side-flip readiness hold | 7.9 / 15.5 / 184.5 over 2451 frames in the recorded run below (the max is the page's first opening) | Per opening the overlay's reads went from 8 to 12 (two or three chains) to 4 and its animation-frame waits from 2 to 4 to 1; the commits stayed at 9 in both arms. The machine was thrashing throughout (17.8 GB of swap in use, load average 600 to 900), so warm click-to-droplet ranged 47 to 131 ms in BOTH arms: medians about 75 ms before and 71 ms after in bundled Chromium, 72 and 68 ms in Google Chrome, inside the noise. The own-trigger openings (no harness re-render) sat at 49 to 90 ms before and 52 to 88 ms after. | `profile-ab/` in the session scratchpad (`baseline-1..3`, `after-1..3`, `chrome-baseline-1..2`, `chrome-after-1..2`, each `.json` and `.txt`), `ab2.sh`, `ab3.sh` |
| 2026-09-19 | The recorded web run after the change: three list openings, three own-trigger openings, two menu openings, with the click stamped by the page's own listener | Chromium headed via the repo's Playwright on the harness at Metro 8099, 1280x1100, dark glass, 25 fps sampling | as above | as above | 7.9 / 15.5 / 184.5 | Click to droplet: list 98 (cold), 64, 62 ms; own trigger 68, 55, 52 ms; menu 53, 69 ms. Every opening's first frame is the droplet (536 by 98 px for the list, 109 by 81 for the menus, corner 49 / 40 px, rows at opacity 0.36). Strip (`strip-328-343.png`, 40 ms tiles): the droplet under the field with tiny rows at 338, growing at 339, near full at 340, settled from 341. | `web-popup-latency-01` (movie, sheet, `trace.json`, the strip), `actions-popup-latency.mjs` |
| 2026-09-19 | The same two list openings on iOS, baseline and after, from a recording (no kit marks in either) | the throwaway iPhone 17 Pro simulator (`iPhone 17 Pro popup`, deleted afterwards), iOS 26.3, dark glass, the harness scrolled so the list opens below the field, taps through `idb ui tap`, 30 fps sampling of a simctl recording | baseline: f057b4ec's overlay and portal written in place; after: this commit | as above | not sampled | Baseline (`ios-popup-latency-baseline-01`): the click commit shows at 111 (the readout flips to "List: open" and the field's focus border appears) and the droplet at 116/117, FIVE frames later; the second opening 355 to 358, three frames. After (`ios-popup-latency-01`): the click commit at 128 and the droplet at 129, ONE frame later; the second opening 396 to 397, one frame. The droplet then grows to full in three frames and settles by the sixth, unchanged. On iOS the rect now lands inside the click's own commit (Fabric answers `measureInWindow` synchronously), the card mounts in that task, and its layout events and reveal follow on the next turn. | `ios-popup-latency-baseline-01` (movie, sheet, `strip-108-123.png`, `zoom-106-111.png`, `zoom-111-117.png`, `zoom-353-361.png`), `ios-popup-latency-01` (movie, sheet, `strip-122-137.png`, `zoom-127-132.png`, `zoom-393-401.png`) |

## The Lattice: the docs' background scene, 2026-09-19

The docs' background is no longer the starfield. It is a periodic table of components
(`docs/src/brand/canvas-lattice.tsx`, roster in `lattice-scene.ts`, every coefficient in
`lattice-tunables.ts`): a lattice of cells across the page, cells lighting at unrelated
moments with a primitive inside (the slow glows on the flight channel in ten buckets, the
quick blinks on the scintillation channel in three), neighbours bonding into small
molecules, and two ASSEMBLY moments in which lit cells lift their primitives out and
compose them into an organism, a search field once per flight and a card once per drift,
hold, and settle back. All of it is `Backdrop.Custom` art bound to the engine's clock
through `LoopView`, so it costs what the sky cost: nothing per frame. The harness is
`/testing/lattice` (`docs/src/ui/testing/lattice-harness.tsx`): park and resume, step the
energy, switch the scheme, jump the flight or the drift to just before a moment, read the
phases, and the 4 s sampler. Recorded with the skill's recorder against the worktree
Metro on 8098 (the docs shell solid through `?surface=solid`, so only the harness scene
animates), actions in the session scratchpad's `lattice-actions.mjs` (it returns a clip
around the moment's organism from the harness box and the scene's own `at`), frames
located with the 2026-09-19 `frame-diff.py`, artifacts under `/tmp/canvas-lattice-2026-09-19/`.

Two kit changes came out of the loop. `useBackdropBox()` (a patch): a custom layer could
only read the window, and the harness column is not the window. And a web defect in
`LoopView`: `channel.play(phase)` on a channel that was already playing handed the running
CSS animation a new negative delay, which the browser applies against the start time the
animation already had, so every view landed late by the animation's age (run 02 below:
the atoms were 1.6 s into a moment that should have started a second later). The view now
remounts on such a re-phase (`test/loop.test.tsx` pins it); park and resume keep their node.

| Date | Effect and profile | Runtime and device | Revision (dirty?) | Values tried | rAF p50 / p95 / max (ms) | What the sheet showed | Artifacts |
|---|---|---|---|---|---|---|---|
| 2026-09-19 | First look: the resting lattice, dark and light, on the harness | Chromium headed via the repo's Playwright, 1280x800, stills | worktree, uncommitted | glow fraction 0.14 with a 12.5% lit window, blink 0.025, glow halo 0.30 | not sampled | 425 cells for the window, 61 glow cells in 10 buckets, 9 blink cells, 26 loop views. Too quiet: at any instant 3 to 4 cells lit on a 1280x800 page, the halo barely there. Light reads as pale hairlines with pastel cells, the right weight. | `scratchpad/shots/run-01` |
| 2026-09-19 | Field moment, first recording (full frame) | Chromium headed, 8 fps sampling, dark | as above | as above; field `at` (0.72, 0.30) | not sampled | The moment landed under the harness readouts (the roster line and the buttons), unreadable in the sheet; the lit cells changed 300 to 1000 px per frame, the sky was alive. Moved the field moment to (0.74, 0.60), below the text. | `web-field-01` (movie, sheet, `strip-096-111.png`) |
| 2026-09-19 | Field moment after the density change, clipped to the organism | Chromium headed, 8 fps, dark, 480x260 clip | as above | glow fraction 0.20 with a 19% window, blink 0.04, halo 0.42 | not sampled | The clip showed no travel at all, and the atom trace (`atom-trace.mjs`: computed transforms every 0.5 s after the jump) showed why: at t=0 the atoms were already 19 px out and arrived at 2.2 s, a phase of 0.58 where the jump had asked for 0.53. The CSS keyframes themselves were exact (dumped: 56% home, 64.16% slot, 81.84% slot, 90% home). The re-phase defect above. | `web-field-02`, `atom-trace.mjs` |
| 2026-09-19 | Field moment with the LoopView re-phase fix | Chromium headed, 8 fps, dark, clip | fix applied, uncommitted | as above; window [0.56, 0.90], out/hold/back 0.24/0.52/0.24 | not sampled (the trace: home and invisible at 0 s, lit by 1 s, travel 1.0 to 3.6 s, hold to 9.0 s, back to 11.6 s, dark by 12.7 s, exactly the table) | Every phase in order: the home cells light (row 1), the atoms lift out and the cells dim behind them (row 2), the three glide on eased straight lines and the field's pill outline appears as they land (rows 3 and 4 of `strip-164-187`), the field holds for 5.7 s, then the outline fades and the atoms glide home and the cells re-light (`strip-228-251`). No clipping, no snap at either end. The outline read faint at 0.35. | `web-field-03` (movie, sheet, `strip-164-187.png`, `strip-196-201.png`, `strip-228-251.png`) |
| 2026-09-19 | Card moment on the drift | Chromium headed, 8 fps, dark, clip | as above | card window [0.30, 0.56] on the 180 s drift | not sampled | Six atoms (ring, two bars, dot, pill, square) leave cells up to seven pitches away and converge on the card outline; correct, but the travel alone took 11 s and the hold 24 s, too slow to read as a moment. Window tightened to [0.30, 0.42] (5.2 s out, 11 s hold). | `web-card-03` (movie, sheet, `strip-352-375.png`, `strip-400-423.png`) |
| 2026-09-19 | The sampler while running, parked and resumed | Chromium headed, the harness's own 4 s sampler, the docs shell in glass (its own 43 animations counted) | as above | as above | running 7.5 / 11.6 / 35.7; parked 7.5 / 11.8 / 51.2; resumed 7.5 / 11.8 / 34.6 | Style writes per second 0 in all three states; live CSS animations 78 running (the shell's 43 plus the scene's 35: thirteen bucket opacities, nine atoms with opacity and transform, four assembly groups), 43 parked, 78 resumed; 26 animated wrappers, the roster's 26 loop views. | `sample-trace.mjs` |
| 2026-09-19 | Park, sample, resume with the docs shell solid | Chromium headed, 8 fps, full frame | as above | as above | not sampled | Frames change while running, zero for the parked stretch, change again on resume; the parked poster is the composed still the clock parks on (flight 0.35: two glow buckets lit, one blink bucket mid-fade, both moments home). | `web-park-04` (movie, sheet) |
| 2026-09-19 | Field moment with the shipped table, dark | Chromium headed, 8 fps, dark, 480x260 clip, `--timeout 240000` (the recorder gained the flag; the loaded machine served the page in 30 to 55 s) | the committed table | field window [0.52, 0.92] (3.2 s out, 6.4 s hold, 3.2 s back), outline 0.45 over a 0.06 fill, scene alpha 0.8 | not sampled (the sampler row above is the trace) | Frames 537 to 559 the travel out, 560 to 614 the hold, 615 to 641 the travel back: the home cells light, the ring, bar and pill lift out and the cells dim, the three glide in on eased lines, the pill outline and its two bonds appear as they land and now read at a glance, hold, fade, the atoms glide home, the cells re-light. Nothing clips or snaps. | `web-field-05` (movie, sheet, `strip-536-559.png`, `strip-614-637.png`) |
| 2026-09-19 | Card moment with the shipped table | Chromium headed, 8 fps, dark, clip | as above | card window [0.30, 0.42] on the 180 s drift (5.2 s out, 11 s hold, 5.2 s back) | not sampled | Frames 521 to 559 the six atoms converge from cells up to seven pitches away and the card outline appears, the hold, then 644 to 669 the outline fades and they glide home while the cyan and pink cells re-light. The pace now reads as a moment rather than a drift. | `web-card-05` (movie, sheet, `strip-524-547.png`, `strip-646-669.png`) |
| 2026-09-19 | Field moment in LIGHT | Chromium headed, 8 fps, light, clip | as above | light ink: scene 0.55, hairline 0.12, outline 0.4 | not sampled | The same phases on the paper floor: pastel cells, atoms in their hue, the faint pill outline over the hold (`strip-402-425`, row 4). Fainter by design (dark text sits on it); every phase still legible in the strip. | `web-field-05-light` (movie, sheet, `strip-402-425.png`, `strip-474-497.png`) |
| 2026-09-19 | The docs shell with the scene mounted | Chromium headed stills, 1280x800, home and `components/button`, dark and light glass | the committed scene | as above | not sampled | The lattice sits behind the hero, the sidebar and the navbar; the glass panels frost it, the lit cells keep to the brand hues, body text stays legible over it in both schemes (`scratchpad/shots/run-02`). | `run-02/1-surface-glass-scheme-dark.png`, `2-surface-glass-scheme-light.png`, `3-components-button-surface-glass-scheme-dark.png` |
| 2026-09-19 | The Lattice on iOS: the harness route, the field moment, the sampler | iPhone 17 Pro simulator, a throwaway `simctl create` ("iPhone 17 Pro lattice", iOS 26.3.1), the docs dev app installed from the user's device's bundle and pointed at the worktree Metro on 8098 through the per-device `RCT_jsLocation` default (the user's device untouched), taps through `idb ui tap`, 8 fps sampling of a `simctl io recordVideo` movie | the committed table | as above | 16.6 / 17.8 / 28.3 over 206 frames in 4 s (the harness sampler; style writes and CSS animations read n/a natively) | The route renders the same roster for the phone box (180 cells, 40 glow cells in 10 buckets with 13 bonds, 6 blink cells, 9 atoms, 26 loop views). Jump to field, page scrolled so the organism sits mid-screen: the pink bar, the green bar and the amber ring lift out of their cells and glide on eased lines (`crop-strip-54-77.png`), the pill outline holds over them (`crop-strip-148-171.png`, row 1), then fades and they glide home while the cells re-light. Same phases as the web, on the native driver. App process 22 to 25% CPU by `ps` while the scene runs (one 44% reading on the sampler tap), 7% by an instantaneous `top`, 89 MB RSS. | `/tmp/canvas-lattice-2026-09-19/ios-field-03` (movie, sheet, `crop-strip-54-77.png`, `crop-strip-96-140.png`, `crop-strip-148-171.png`), `ios-rest-01`, `ios-home-lattice.png`, `ios-state-scrolled.png`, `ios-sample.sh` |

Not covered: Android (no emulator was running; the `canvas_pixel` AVD cold-boots with SystemUI ANRs for minutes and its software rasterizer dominates any number it would give, see the 2026-09-18 note), Reduce Motion end to end on a device (the poster is the clock's parked still, checked on the web only), and the card moment on iOS (recorded on the web; the same tracks bind natively).

Two recorder notes for the next run. A `simctl io recordVideo` starts about four seconds after it is spawned, so a 10 s window keeps roughly 6 s of frames: ask for the length you need plus five. And the recorder must run in the FOREGROUND of a shell script with the tap in a background subshell: a background job inherits an ignored SIGINT, so the recorder can never stop simctl and no movie is written.

## The Dropdown-class trigger hands its pill to the menu, 2026-09-19 (the button-to-menu hand-off)

The user asked for the other half of the native menu's presentation on the Dropdown,
the AvatarMenu and the collapsed Navbar menu, and not on the field popups: in the
reference (`ios-native-menu-01`, `open-073-090.png`, `dismiss-165-182.png`) the
header's pill vanishes with its icons the frame the droplet appears (075), and on
dismiss the pane narrows toward the button (169 to 171), a droplet re-forms at the
pill (170 to 171), the two merge with a liquid bridge (172 to 173) and the icons fade
back while the last of the bump absorbs (174 to 176). The popup presentation above
grew the pane from a sliver on the card's own top edge, the trigger stayed painted
under the droplet, and the card's material could not have reached the trigger's frame
anyway (the iOS menu skin clips its card for its row highlights).

The change is one mechanism on every material, `src/style/popup-handoff.tsx` plus
the `handoff` table in `POPUP_PRESENTATION`. The Dropdown owns ONE travel value for
its whole life (`usePopupHandoff`) and shares it with both sides: the pane's motion
seats and springs it, the trigger's subtree reads it. With an `origin` (the trigger's
measured frame in card coordinates, `popupOrigin` in anchored-overlay, and the corner
its largest GlassPane reported) `usePopupMotion` lerps the material between the
pill's box and the resting card: the across extent holds the pill's width until
`widen` (0.45) so the droplet is pill-wide and a closing pane is the pill's width
before its height is gone (the drop absorbing upward is the bridge); the corner goes
pill, droplet (seed), skin (0.85); the rows scale from the pill's centre; the close
runs on `handoff.close` (520/40). The trigger's GlassPane hides in place on a hard
step (`material`: 1 only at progress 0 exactly, `HANDOFF_RETURN`) and the trigger's
foreground rides `label`, a value on its own short fades (out over `hideMs` as the
pane appears, back over `returnMs` once it has left, native-driven where the platform
has the driver), both through `PopupHandoffForeground` and the `PopupHandoffContext`
the Dropdown provides around either trigger shape. The
pane's material is now a SIBLING of the semantic card inside the Entrance wrapper
(`materialShapeStyle` on an absolute fill, the card a `PlainSurface` wearing
`hostStyleBesideMaterial`), so it can travel outside the card's clip; solid mode is
byte-identical. Under a hand-off the material paints the trigger's layer as a second
under-fill cross-fading with its own on `tint` (0.55, `MaterialOriginContext`), so
the pill that vanishes and the pill that re-forms are the bright control puck, not a
menu-tinted copy of it. Gated on the trigger's material resolving to glass, motion
allowed and a hosted overlay; Reduce Motion, solid mode and the inline fallback keep
the trigger's tree byte for byte. What the reference has and this does not: the
two-body merge of frame 172 (the pill re-forming as a separate droplet and a neck
joining it). A backdrop-filter material cannot union two shapes without a web-only
clip path, and Apple's container effect cannot take in the trigger's own GlassView
from the portal, so the kit draws one body on every material, the native GlassView
included (its frame and corner already animate through style). The harness is
`/testing/popup` with the AvatarMenu and a Navbar collapsed by an xs Container beside
the Dropdown and the Autocomplete; `actions-handoff.mjs` records the trigger's
material and fader opacities and the pane's box, corner and rows every animation
frame (`handoff-trace.py` reads a trace).

| Date | Effect and profile | Runtime and device | Revision (dirty?) | Values tried | rAF p50 / p95 / max (ms) | What the strip and trace showed | Artifacts |
|---|---|---|---|---|---|---|---|
| 2026-09-19 | The hand-off on the three triggers: button open, close, open, close, reopen mid-close; account open and close; hamburger open and close | Chromium headed via the repo's Playwright on `/testing/popup?mode=glass&scheme=dark` at this worktree's Metro (8097), 1280x1100, dark, 25 fps sampling; the machine at a load average of 500 to 900 from peer sessions' batteries and simulators throughout | working tree of the hand-off commit (harness commit def1744a plus the kit change) | widen 0.45, label 0.02 to 0.3, close 520/40, `HANDOFF_RETURN` 1e-4, no under-fill blend | 7.9 / 12.3 / 118.0 over 2589 frames; the harness readout after the run 7.8 / 12.1 / 39.9 | Trace, button open: the pill's material wrapper and fader both read 0 on the frame the pane first paints, the pane a 112 by 106 droplet at the pill's width with a 52.8 px corner, its top 27 px above the card's top (over the pill's lower half), the rows at scale 0.35 and opacity 0.36; the width holds 112 until progress 0.45 (+308 ms) and is 200 by +441; the corner is the skin's 16 by +374; 1.7% past the resting height, settled by +600. Close (Escape): the rows retire at +106 (the JS turn under load), the width narrows 200 to 112 by +172 while the height goes 231 to 116, then the drop holds the pill's width and absorbs 116 to 38 over 160 ms with the corner 48.7 to 12; the fader climbs from progress 0.3 (+196) to 1 at +294 while the drop is 89 to 41 px tall; the material returns at +341. TWO FINDINGS: (1) the frame before the return painted the trigger's material at 0.92, because the clamped close spring crosses 0 with velocity and its last value (8e-6) was inside the 1e-4 step, one frame of double material; (2) the droplet and the re-formed pill wore the menu's dense tint (dark) where the pill is the bright control puck, a tonal pop at both ends (frames 661 to 662 and 703 to 704). Account: both panes (capsule and disc) hide at the seed, the drop re-forms the 210 by 32 capsule with a 16 px corner. Hamburger: the pane shrinks to a 20 by 20 circle at the icon. Click-to-droplet latency 249 ms (100 to 120 in the previous section's runs; the load). Strips: `open-660-671.png` (pill at 661, droplet at 662, full at 665), `close-694-709.png` (rows gone 697, the pill-wide drop at 699 to 700, the pill re-formed 701, the tone pop 703 to 704). Frame 667 loses the backdrop blur for one frame at the readable flip, which the previous section's `web-popup-02` frame 277 shows too: pre-existing, not this work's. | `web-handoff-01` (movie, sheet, `trace.json`, the strips above), `actions-handoff.mjs`, `handoff-trace.py`, `strip.py` |
| 2026-09-19 | The same sequence with the two findings fixed | as above | working tree, `HANDOFF_RETURN` 1e-9 and the under-fill blend added | widen 0.45, label 0.02 to 0.3, close 520/40, tint 0.55 (new), `HANDOFF_RETURN` 1e-9 | 7.9 / 12.4 / 117.8 over 2340 frames; readout 7.8 / 12.1 / 46.8 | Trace: the material return has no partial frame (0 at +295 with the pane still 112 by 38, 1 at +302 with the pane gone); the fader is back at +259 while the drop is 42 px tall and the material returns 43 ms later; the reopen mid-close grows on from the drop. Strips: the droplet at 513 to 519 is the bright puck swollen pill-wide (`open-511-522.png`), the re-forming pill at 552 to 553 is the same bright capsule the pill is at 554 (`close-547-554.png`). The video held the droplet for 280 ms and skipped the growth frames while the trace shows the growth took 55 ms: the compositor was starved by the machine's load (the GPU process of a peer's app at 127%), so this run's timing is the DOM trace's and the strip is read for shape and tone only. Click-to-droplet 300 to 400 ms this run (the load). A THIRD FINDING, from the iOS run below and visible here at 552 to 553: the label fading in on the travel sits UNDER the standing-in pane (the overlay outlet is above the trigger), so it reads dimmed and blurred through the pane's glass until the swap; the reference's icons fade over the merged glass because they are the button's own content inside it. | `web-handoff-02` (movie, sheet, `trace.json`, the strips above) |
| 2026-09-19 | The label's return moved AFTER the pane has left: a timed fade on the trigger's own material | as above | working tree, the label a timed return | widen 0.45, close 520/40, tint 0.55, label return 140 ms after the snap (the travel-driven 0.02 to 0.3 range dropped) | 7.9 / 15.5 / 141.4 over 2360 frames; readout 7.9 / 12.4 / 78.6 | Trace, close: the pane narrows and the drop absorbs with the fader at 0 throughout; the material is back at +341 with the pane gone and the fader still 0; the fader rises from +349 to 0.94 by +451 (the 140 ms fade). No partial material frame. | `web-handoff-03` (movie, sheet, `trace.json`) |
| 2026-09-19 | The native GlassView: the three triggers open and dismiss (button, account capsule, hamburger) by tap | a throwaway iPhone 17 Pro simulator (`simctl create`, deleted afterwards; the user's device untouched), iOS 26.3, dark glass, the docs dev app installed from the user's device bundle and pointed at this worktree's Metro (8097, `RCT_jsLocation`), taps through `idb ui tap`, 30 fps sampling of a simctl recording, the harness scrolled so the triggers sit at 207 to 364 pt with the card below | working tree as `web-handoff-02` (before the label's timed return) | as `web-handoff-02` | not sampled | Open (`open-117-128.png`): 118 the native capsule pill; 119 the LABEL gone but the pill's native glass still painted and no droplet yet, one bare-pill frame; 120 the droplet, Apple's glass pill-wide with the tiny rows and the control blend; 121 to 122 growing; 123 full and past rest; settled by 125. The native glass trails the label's commit by a frame (the effect view's capture, and the pane's GlassView applying its effect on its first layout), where the web paints both in the same frame. Close (`close-188-199.png`): 189 rows gone; 191 narrowing; 192 the drop, pill-wide and round; 193 the drop nearly the pill; 194 to 197 the label at a fraction under the standing-in pane's glass (the third finding: dimmed, blurred); 198 the pill's own glass and label back. Account (`account-open-257-268.png`): the capsule, its disc, name and chevron and its glass all gone at 259 with the droplet there, capsule-wide, so the bare frame is a race the button lost and the capsule won. | `ios-handoff-01` (movie, sheet, the strips above) |
| 2026-09-19 | The native GlassView with the label's timed return | as above | working tree as `web-handoff-03` | as `web-handoff-03` | not sampled | Close (`close-188-203.png`): 189 to 190 rows gone; 191 narrowing; 192 the drop; 193 the drop merging into the pill; 194 to 199 an EMPTY pill for six frames (the spring's tail, the swap, and the label's JS-driven return fade not yet painting: the JS thread had the pane's unmount to commit); 200 the label near full. The empty-pill hold is the same shape the reference's bump absorbs in, but 200 ms is twice its 100, and the fade jumped rather than rose. The bare-pill frame on open (119) is unchanged. | `ios-handoff-02` (movie, sheet, the strips above) |
| 2026-09-19 | The label on its own native-driven fades: out over 50 ms as the pane appears, back over 140 ms after it has left | as above (iOS), and Chromium headed as `web-handoff-01` | working tree of the final commit | widen 0.45, close 520/40, tint 0.55, label hide 50 ms and return 140 ms (native-driven where the platform has the driver); BAKED | web 7.9 / 15.4 / 109.8 over 2191 frames; readout 7.9 / 12.3 / 31.3 | Web trace: on open the material is 0 at the pane's first frame (+226) while the label fades 1, 0.77, 0.46, 0.19, 0.06 over 55 ms under the droplet; on close the material is back at +324 and the label rises from +331 to 1 by +461; a reopen landing during the return turns the label back out (0.94 to 0.34 over three frames). iOS open (`open-118-125.png`): 118 the pill; 119 the pill with its label at half, its glass still whole (no bare frame); 120 the droplet with a faint ghost of the label under it; 121 to 122 growing; settled by 125. iOS close (`close-185-200.png`): 186 to 187 rows gone; 188 narrowing; 189 the drop, round; 190 the drop nearly the pill; 191 to 193 the pill re-formed and empty (about 100 ms: the spring's tail and the swap); 194 the label at half; 195 full: the reference's 172 to 176 sequence, minus its two-body neck. | `web-handoff-04` (movie, sheet, `trace.json`), `ios-handoff-03` (movie, sheet, the strips above) |
| 2026-09-19 | The same web sequence after rebasing onto main's hosted-overlay handshake work (bcd43a20: joined layout-phase measures, a side-flip readiness hold) and its second, uncontrolled "Own trigger" Dropdown on the harness | Chromium headed as above, the machine now at a load average of about 20 | the rebased final commit | the baked values | 7.8 / 12.1 / 102.7 over 2384 frames; readout 7.8 / 12.0 / 70.3 | The hand-off is unchanged over the new handshake: the pill's material and label hidden on the pane's first frame (+316), the material back at +305 after the close with the label rising to 1 by +427; the account and hamburger the same. Click-to-droplet 130 to 300 ms on this run (the harness's own re-render sits in front of the driver's open; the peer's Own trigger measures the consumer path). | `web-handoff-05` (movie, sheet, `trace.json`) |

Not covered for the hand-off: Android (no emulator; on the Android frost the trigger's
GlassPane hides through the same opacity wrapper and the pane's frost takes the same
frame, and the main-window trigger resolves to its solid skin without a capture target,
in which case the Dropdown does not hand off at all), Reduce Motion and solid mode on a
device (the unit tests pin the byte-identical trigger tree), the unhosted inline fallback
(it keeps the anchor-edge bloom by design), and the two-body neck of the reference's
frame 172, which no backdrop-filter material can draw and Apple's container effect
cannot draw across the portal.

## The web lens holds one definition while a popup's material moves, 2026-09-20

The handshake profile above left one per-frame cost on the web: the lens layer
(`GlassLensLayer`) acquired a sized `<filter>` for its own layout size, and inside a
liquid popup that box is the material wrapper the opening spring resizes on almost
every frame, so every frame of an opening built a new definition, each carrying a
fresh `data:image/svg+xml` map that Chromium parses as an isolated SVG document, with
`setSize` and `setUrl` commits on the layer around it. The baseline row below measured
it: 32 to 44 definitions per opening and 19 to 35 per close, 256 over the run's eight
phases, 216 isolated SVG documents in the Chrome trace.

The change (`src/style/popup-motion.tsx`, `glass-surface.shared.tsx`,
`glass-surface.tsx`, `anchored-overlay.tsx`; the lens geometry and grade in
`glass-lens.ts` are untouched, only its header describes the rule): the material
motion a popup provides now carries the bounds the frame settles at beside the frame
(`MaterialMotion { frame, rest }`, `rest` being the card's measured size), GlassBox
hands the layers `MaterialShapeContext { radius, rest }`, and a lens layer under a
motion sizes its one definition for `rest` and drops its onLayout measurement, so the
definition is exactly the one the settled layout would have acquired and nothing is
built during the travel, the overshoot or the close. Surfaces that do not move measure
themselves as before. Before choosing this, a static-HTML probe in headed Chromium
(`probe-chromium/`, the kit's own `sizedLensFilterSpec`) tested the alternatives on
their pixels: four mirrored percentage quadrants sharing one definition, the only
arrangement that would keep the rim correct at every size, show visible seams at the
centre lines (Chromium's backdrop-filter does not sample across a sibling's clip edge);
the pending CSS frost differs from the SVG definition over the whole interior (max
12/255), so holding the frost through the motion would swap every pixel of the pane at
settle; and a droplet-sized box under the resting-size definition differs from its own
definition only in the right and bottom rim bands (max 29/255 on a bright grid), the
bands the map anchors at the far edge of the resting box, which sit past the droplet's
edge while it grows and up to ~2% inside it at the overshoot's peak. That is what the
change trades, and the stills below could not find it on the harness.

| Date | Effect and profile | Runtime and device | Revision (dirty?) | Values tried | rAF p50 / p95 / max (ms) | What the strip and trace showed | Artifacts |
|---|---|---|---|---|---|---|---|
| 2026-09-20 | PROBE of the candidate arrangements on static HTML: one 300 by 160 box under its own definition, four mirrored 50% quadrants under that definition, a 150 by 70 droplet under its own definition, under the resting one, and under the pending frost; plus the resting box under the frost | headed Chromium via the repo's Playwright, `file://` pages, 1x and 2x, a grid-and-text backdrop over two gradient blobs, pixel diffs in PIL | aa39bbd3 (the probe is outside the kit) | the arrangements listed | not applicable | Quadrants against the single layer: 7% of the region differs, max 20, with the diff concentrated on the two centre seams, a line through the pane (the amplified `diff-rest-quad@2x.png`), so the shared-definition quadrant idea is out. Droplet under the resting definition against its own: 4% differ, max 29, all of it in the right and bottom rim bands (`diff-drop-restdef@2x.png`); at 2x zoom the three droplets are indistinguishable (`cmp-drop-zoom.png`). Frost against the lens at rest: max 25 on the rim and max 12 across the interior (`cmp-rest-frost.png`), so a frost held through the motion would change the whole pane at settle. Every rounded corner clipped correctly on the layer's own radius. | `/tmp/canvas-liquid-motion-2026-09-20/probe-chromium/` (`probe.mjs`, `shots/`) |
| 2026-09-20 | BASELINE: list open and close (twice), menu open and close (the hand-off), own-trigger open and close, then the harness's frame sample, with the definition observer and a Chrome trace | Chromium headed via the repo's Playwright on `/testing/popup?mode=glass&scheme=dark` at this worktree's Metro (8099), 1280x1100, dark glass, 25 fps sampling, machine load 5 | aa39bbd3 (clean) | none (measurement) | 4.0 / 8.1 / 78.4 over 2569 frames (during the openings 8.0 / 12.0, the 120 Hz cadence); readout 3.9 / 7.9 / 35.5 | Definitions added per phase: list open 39, close 20, second open 44, close 19, menu open 32, close 35, own trigger open 32, close 35 (256 added, 256 removed; 17 live at idle, 18 with a pane up). Chrome trace: 256 `ResourceFetcher::requestResource` (248 ms, mean 0.97), 216 `IsolatedSVGDocumentHost` constructions (140 ms) with 216 `createFrame` (72 ms), 10579 `FunctionCall` (2564 ms), 1505 `Layout`, 3759 `UpdateLayoutTree`. The lens during the first opening: the pending grade for a frame, then a new `url(#cds-glass-lens-WxH)` on nearly every frame until `973x280` at rest. Strip: the droplet under the field with tiny rows at 151, growing 152 to 153, full and past rest at 154, settled from 155 (`strip-149-156.png`). | `web-lens-baseline-01` (movie, sheet, `trace.json`, `chrome-trace.json`, the strip), `actions-lens.mjs` |
| 2026-09-20 | The same sequence with the lens sizing its definition for the resting bounds (runs 1 and 2 on the first cut, run 3 with the two modes as two component types, run 4 on the committed code, one lens component keyed on its mode so a change of mode remounts the node) | as above, load 5 to 11 | working tree of this commit (clean apart from it) | the rule (no tunable value changes) | run 1: 4.4 / 11.0 / 102.7 over 2379 frames, run 2: 7.2 / 8.6 / 47.2 over 2312, run 3: 4.3 / 8.3 / 66.6 over 2387, run 4: 4.7 / 11.2 / 102.2 over 2307 (during the openings 8.0 / 12.0 in all four, as the baseline); readouts 4.0 / 8.0 / 32.0, 4.1 / 8.0 / 31.4, 4.0 / 8.0 / 27.5 and 4.0 / 8.0 / 30.9 | One definition added per opening and one removed per close in every run (4 and 4 over the run; 17 live at idle, 18 with a pane up). Chrome trace: 4 `ResourceFetcher::requestResource` (5.3, 3.6 ms), 2 isolated SVG documents (the second list and menu openings hit Chromium's memory cache for the same map), `FunctionCall` down to 8089, 7996, 7800 and 7567 (1948 and 1950 ms in the first two), `Layout` 1059, 1072, 1108 and 1080, `UpdateLayoutTree` 2986, 2913 and 2913. The lens on the first opening: the pending grade while the wrapper is unmeasured (one to four frames at width 0), then `url(#cds-glass-lens-973x280)` from the 530 by 98 droplet through the settle and the close; the menus `200x231` from their 112 by 106 droplet. Strip: droplet at 132, growing 133 to 134, full at 135, settled from 136, the same phases as the baseline (`compare-list-open.png`); the hand-off close narrows to the pill, absorbs upward, re-forms the pill and fades the label back the same in both runs (`compare-menu-close.png`). | `web-lens-after-01` to `web-lens-after-04` (movie, sheet, `trace.json`, `chrome-trace.json`), `compare-list-open.png`, `compare-menu-close.png` |
| 2026-09-20 | Lossless stills of the list's opening at 40 to 1200 ms after the click, three openings per build, baseline and change | headed Chromium, the harness at Metro 8099, the same page and viewport, the sources toggled in place | aa39bbd3 written in place for the baseline set, then this commit's working tree | as above | not sampled | At 600 and 1200 ms after the click every still is pixel-identical between the builds (0 of 404460 pixels differ in each of the three pairs, the same as two openings of one build against each other): the resting look is the settled layout's own definition, byte for byte. Mid-travel stills land where the spring is when the capture runs (a 40 ms request captured at 534 to 986 px wide), so no two are at the same width; at 3x zoom on the pane's right and bottom edges during the overshoot (about 985 px) the baseline and the change look the same, and no detached or missing band reads on this dark backdrop (`compare-stills-edges.png`). The probe's numbers bound what a brighter backdrop could show: the two far bands, max 29/255, while the pane is short of its rest. | `stills-baseline/`, `stills-after/` (`stills.json` with the pane's bounds before and after each capture), `shots-open.mjs`, `compare-stills-edges.png` |

Not covered: iOS and Android (the change is the web lens's definition lifecycle; the
native GlassView and the frosts take the frame's radius through the same
`MaterialShapeContext` and never acquire definitions, and the unit tests pin the
shape they receive), the light scheme on the harness (the probe's bright grid is the
harsher case for the rim), Reduce Motion (no motion, so no `rest`, the layer measures
itself), and a card whose measured size changes while open (one definition per new
rest, pinned by `test/popup-motion.test.tsx`).

## The droplet presentation on the native animation driver, 2026-09-20 (transforms and a sampled radius)

The handshake profile above left the JS-driven presentation itself as the largest term
between a tap and the droplet on iOS: `usePopupMotion` animated the material wrapper's
`width`, `height`, `left` and `top`, layout props the classic native animated module
cannot take (`NativeAnimatedAllowlist.js` admits them only behind the off-by-default
`useSharedAnimatedBackend` flag), so every spring ran on the JS driver and, on Fabric,
`createAnimatedPropsHook` called `setNativeProps` on each animated view per frame, a
shadow-tree commit each, plus the seed frame's flush before the first paint and a
debounced re-render every 48 ms. The allowlist does admit `transform`, `opacity` and
every `border*Radius`, and on iOS Fabric those reach the component view through
`synchronouslyUpdateViewOnUIThread` and `updateProps` (no commit; `GlassView.swift`
reads `borderRadius` as a prop and applies it to the effect view's corner
configuration), so the presentation was rewritten on those props.

The change (`src/style/popup-motion.tsx`, `popup-handoff.tsx`; the table's values are
untouched): the frame is a transform of the material's resting box (`scaleX`/`scaleY`
and the translation that keeps the anchor edge, or the trigger's centre, where it is;
each term exactly the identity at rest) plus a uniform corner radius the clip and the
layers wear, and every spring passes `useNativeDriver: supportsNativeDriver`. The
travel and contour values (and the hand-off's shared value and label) are native from
construction, the way `entrance.tsx` does it, so the seed flush is native too; a value
made native only by its first spring would have flushed the seed through the JS driver.
The current position is read from the value's own listener (a native value answers
`stopAnimation`'s callback asynchronously). The corner: a box scaled by (sx, sy) shows
a corner of radius R as an ellipse of (R·sx, R·sy), and the droplet's aspect differs
from the card's, so a circular corner throughout is not available to a transform;
`radiusTable` samples R(p) = displayed(p) / scale(p) on a 20-step grid plus the marks
the curve turns at, exact on the seed shape's shorter side (a capsule at and below the
seed, the skin's own corner at rest) with the other side following the ratio of the
two scales. What that trades is visible only under a hand-off: at progress 0 the pane
is the pill's box with a lozenge corner (rx about 57, ry 16 on the harness's 112 by 36
pill) rather than the capsule, so the last frames of a hand-off close are an ellipse-
ended drop where the previous presentation re-formed the pill exactly. The first iOS run
also showed one EMPTY frame between that drop and the returned pill (the trigger's
material steps to opacity 1 at exactly 0, and the native glass under it takes a frame
to paint), so a closed pane now leaves on the animation frame after its hand-back
instead of in the task that snapped it home. Under a transform the web lens layer's
layout never changes, so the resting-size definition the previous section introduced
is the layer's own layout size for the whole travel; Chromium applies the reference
filter in the layer's local space, so its 12 px rim bands and 6 px blur scale down with
the pane (about 4 px and 2 px at the 35% droplet, a thinner and crisper edge than the
per-frame definitions drew for those few frames, back to full at rest; the previous
section's held definition under a resized wrapper put the far bands past the edge
instead), see the compare strip in the final web row. `test/popup-motion.test.tsx` reads the displayed box back off the transform,
pins the driver flag on every spring and the box never being re-laid out;
`test/design-rules-source.test.ts` refuses a literal driver flag or an animated layout
key in the two popup files.

| Date | Effect and profile | Runtime and device | Revision (dirty?) | Values tried | rAF p50 / p95 / max (ms) | What the strip and trace showed | Artifacts |
|---|---|---|---|---|---|---|---|
| 2026-09-20 | The list (open, close, open, close, reopen mid-exit), the hand-off button (open, close, open, close, reopen mid-close), the account and the hamburger, with a page probe recording the painted box (`getBoundingClientRect` reads the transformed box), the DISPLAYED corner (the clip's radius times each axis's scale from the computed transform), the rows and the triggers' opacities every frame | Chromium headed via the repo's Playwright on `/testing/popup?mode=glass&scheme=dark` at this worktree's Metro (8097), 1280x1100, dark glass, 25 fps sampling, machine load 11 | working tree of the first cut (before the hand-back hold and the rebase onto 578d52ee) | the table's values unchanged; the radius table (20 steps plus the marks), exact on the seed shape's shorter side | 4.0 / 7.9 / 451.6 over 4319 frames (the max is the page's first, cold opening); readout 3.9 / 7.8 / 23.6 | The list's droplet is 530 by 98 (55% by 35%) with displayed corners 76 by 49 (R 140 on the clip, the 49 a capsule on the height), the rows at scale 0.35 and opacity 0.36; full at +145 ms, 102.1% past rest, the rows opaque at +75, the skin's 16 by +125; the resting transform is `translateX(0px) translateY(0px) scaleX(1) scaleY(1)` with R 16. Click to droplet 84 (cold), 38 ms; own-trigger menus 30 to 38 ms; the reopen mid-exit grows on from a 500 by 85 pane. The hand-off: a 112 by 106 droplet (corners 65 by 53) at the pill with its material hidden and its label fading; on close the width narrows to 112 by +118 ms, the drop absorbs with the width held, the material is back at +275 and the fader rises over 140 ms from +283. The account's droplet is a full 210 by 97 ellipse (both radii at half the box); the hamburger's a 20 by 75 lozenge. Strips: the droplet as an oval-ended blob with tiny rows at 215, larger at 216, full at 218 (`list-open-214-219-crop.png`); the hand-off close's last three frames a flattening oval, then the pill (`button-close-3-zoom.png`); the account (`account-open-zoom.png`) and hamburger (`hamburger-open-zoom.png`) openings. | `web-native-01` (movie, sheet, `trace.json`, the strips), `actions-native-popup.mjs`, `native-trace.py` |
| 2026-09-20 | The list from its own chevron three times, the hand-off button twice, the account and the hamburger, on the native GlassView | a throwaway iPhone 17 Pro simulator (`simctl create`, deleted afterwards; the user's device untouched), iOS 26.3, dark glass, the docs dev app installed from the user's device bundle and pointed at Metro 8097, the harness scrolled so the list opens below the field with the "List:" readout visible, taps through `idb ui tap`, 30 fps sampling of a simctl recording | as above | as above | not sampled | Opening 1 (`open-1-216-223.png`, `list-open-zoom-216-220.png`): the readout flips to "List: open" at 217 and the droplet, Apple's glass as an oval blob under the field with the tiny rows inside, is in the SAME frame; 218 grown with the rows at about 0.6; 219 near full; 220 full; settled by 222. Openings 2 and 3 the same frame and one frame after. The hand-off (`handoff-open-593-600.png`): 594 the readout, 595 the droplet on the pill's frame with the label's ghost fading, full at 597, settled by 599. Its close (`handoff-close-703-710.png`, `handoff-close-706-711-zoom.png`): 704 rows gone, 705 narrowing, 706 the round drop, 707 to 710 the drop flattening into a lens on the pill's box, 711 EMPTY (neither the pane nor the pill's glass), 712 the pill with its label already rising. The FINDING behind the hand-back hold. The hamburger opens from its icon as a narrow tall blob (957 to 964). The account tap missed (the script's fixed coordinates; corrected below), and a reopen mid-close is not reachable with idb's tap latency. | `ios-native-01` (movie, sheet, the strips above), `ios-run.sh`, `find-events.py` |
| 2026-09-20 | BASELINE on the same device: the previous presentation (aa39bbd3's popup-motion and popup-handoff written in place under the same Metro), the same drive | as above, the buttons read from the accessibility tree at start | aa39bbd3's two files in place | the previous values | not sampled | The droplet against the closed reference frame (`droplet-frames.py`): opening 1 readout 209, droplet 210 (one frame after); opening 2 readout 294, droplet 294; opening 3 readout 381, droplet 381. The native arm: 217/217, 317/317, 421/422 (a partial at 421). At 30 fps sampling on this unloaded machine (load 11, not the 600 to 900 of the profile above) both arms land within 0 to 1 frames of the click's commit, so the recording cannot separate them; the profile rows below can. The growth then takes the same three frames in both (`list-open-2-293-298.png` against `list-open-2-316-321.png`). | `ios-baseline-01` (movie, sheet, the strips), `ab/popup-motion.baseline.tsx` |
| 2026-09-20 | PROFILE of the seed frame on both arms: temporary `performance.now()` marks around `progress.setValue(SEED)` and the springs' start inside the layout effect, logged through Metro, four openings each (the marks removed again) | the same simulator and Metro | the profiled copies in `ab/` | as above | not sampled | Baseline: the seed flush 5.7 to 7.2 ms and the springs' start 6.5 to 9.1 ms of synchronous JS-thread work per opening (the `setNativeProps` commits per animated view), 13 to 16 ms in all on this machine (35 to 114 ms in the loaded profile above). Native: 0.0 ms and 0.1 ms (1.3 once). | `ios-seed-profile-baseline.txt`, `ios-seed-profile-native.txt`, `ab/*.profiled.tsx` |
| 2026-09-20 | The per-frame cost: the harness's own 4 s `requestAnimationFrame` trace (the "Sample frames" driver) around two list openings and closes, with `sample` on the app process for the same 4 s, both arms | the same simulator, the drivers scrolled into view (the list opens above here; the cost is the same) | baseline: aa39bbd3's files in place; native: this commit's working tree | as above | baseline 16.6 / 29.8 / 334.5 over 164 frames; native 16.6 / 19.8 / 165.6 over 207 frames | JS thread (`sample-threads.py` over 2736 and 2865 samples): baseline 19.2% in `ShadowTree::commit`, 18.0% under `setNativeProps`, 16.7% in Yoga, 35.3% in Hermes, 64.4% idle; native 1.4% commit (the card mounts), 1.4% Yoga, 12.2% Hermes, 87.5% idle. Main thread: the mount share 33.2% against 17.9% (the JS-driven commits' transactions), the native animated step 27.9% against 25.9% and `synchronouslyUpdateViewOnUIThread` 22.5% against 20.7% in both arms (the Lattice's native loops run in both; the popup's six extra native views do not register above them). Inside the native update the cost is `cloneProps` rebuilding a full `ViewShadowNodeProps` per view per frame, React Native's own price for the classic driver on Fabric. The max frame in both arms is the card's mount commit. | `ios-cost-baseline-01`, `ios-cost-native-02` (`sample.txt`, `threads.txt`, `readout.txt`), `ios-cost.sh` |
| 2026-09-20 | The same drive on iOS with the hand-back hold, rebased onto 578d52ee (the resting-size lens definition) | as the second row, positions read from the accessibility tree | working tree of this commit | as above plus the hold: a closed pane leaves on the next animation frame | not sampled | The hand-off close (`handoff-close-556-567-zoom.png`): 558 narrowing, 559 the round drop, 560 to 564 the drop flattening into the lens on the pill's box, 565 the pill with its label at a fraction, 566 brighter, 567 full: no empty frame. The list (readouts 210, 295, 380; droplets one frame after in this run's phase), its close a shrink into the field's edge over five frames (`list-close-257-263.png`), the account's ellipse droplet on the capsule (`account-open-648-655.png`). BAKED. | `ios-native-02` (movie, sheet, the strips), `ios-scroll-to.sh` |
| 2026-09-20 | The final web run of the same sequence, and the resource probe across two Cycle bursts | Chromium headed as the first row, load 11 | working tree of this commit | as above, baked | 4.3 / 8.2 / 86.0 over 3916 frames; readout 4.0 / 8.0 / 27.3 | The same geometry and timing as the first row (droplet 530 by 98 with 76 by 49 corners, full at +137 to 145 ms, 102.1% past rest, the skin's corner by +118); click to droplet 98 (cold), 47, own triggers 34 to 49, the hamburger 13 ms. The hold shows as the trigger's material back at +278 with the pane gone at +282, one frame of the lens over the returned pill. Lens definitions 17 before, 17 after five cycles, 17 after the pane left, 17 after ten; no listbox left mounted. The droplet's left end at 3x against the previous section's run 4 (`droplet-rim-compare.png`, frames 142 and 162 with the frame after each): the transform's droplet is ellipse-ended where the layout-based one was circle-cornered, and its rim reads thinner and its backdrop crisper for the two droplet frames (the scaled filter); at rest both are the same pane. | `web-native-02` (movie, sheet, `trace.json`, `droplet-rim-compare.png`), `probe-cycles.mjs` |
| 2026-09-20 | Android: the list open and close twice, the hand-off button twice and the account, through the harness drivers | the `canvas_pixel` emulator (software GL), the debug docs app from the primary checkout's build pointed at Metro 8097 (`debug_http_host`), dark glass, `adb shell input tap`, 30 fps sampling of a screenrecord | working tree of this commit | as above | not sampled | The emulator renders about four frames a second during a spring (the readout flips at 166, the droplet at 183, growth at 192 and 200, settled by 207), so timing is not readable here; the shapes are: the frost under the scale transform paints the droplet as an oval blob with the tiny rows inside, grows and settles (`list-open-close.png`), the close shrinks into the field's edge, and the hand-off hides the pill, blooms a pill-wide droplet, narrows and re-forms the pill (`menu-open-close.png`). | `android-native-01` (movie, sheet, the strips), `android-run.sh` |

Not covered: a reopen mid-close on a device (idb's tap latency; the web trace and
`test/popup-motion.test.tsx` pin it), a capsule corner at the hand-off's progress 0
(not available to a transform of one box; the hold covers the swap), the light
scheme, Reduce Motion on a device (the unit tests pin the snap), and a sealed
candidate build.

## The hero orbit on the loop primitive, 2026-09-20

The home page's orbit (docs/src/brand/hero-orbit.tsx) ran its three loops through
`Animated.loop` with `useNativeDriver: supportsNativeDriver`: the native driver on iOS
and Android, the JS driver on the web, where react-native-web re-renders every
Animated.View through React on every frame. A React commit counter on the exported home
page read about 90 to 115 commits a second on an idle screen, with 805 inline style
writes a second, and Lighthouse's main-thread total for the page stood at 4.4 s (the
mobile pass simulates a 4x slower CPU) against 2.7 s with reduce-motion forced. The
port binds the same three loops to `LoopView` tracks on module-scope channels
(docs/src/brand/orbit-tunables.ts holds the periods and the breath's floor): the badge
revolution and its six counter-rotations, the glow's spin, the glow's breath. The
harness is /testing/orbit (docs/src/ui/testing/orbit-harness.tsx): park and resume,
desktop or stacked orbit, scheme, and the shared frame sampler (frame-trace.ts) with a
React Profiler commit counter around the real component.

| Date | Effect and profile | Runtime and device | Revision (dirty?) | Values tried | rAF p50 / p95 / max (ms) | What the sheet showed | Artifacts |
|---|---|---|---|---|---|---|---|
| 2026-09-20 | BASELINE, web: the previous orbit (three `Animated.loop` timings on the JS driver) on the exported home page, recorded for 8.9 s | Chromium headless through the repo's Playwright, 1280x800, the export of 698eb809 served by the e2e static server on 8123 (gzip, the `_headers` policy), 8 fps sampling of the Playwright video, clipped to the orbit's box (396x416) | 698eb809 (the export; clean) | the shipped periods: orbit 30 s, glow 6 s, breath 3.4 s to 0.85 | 8.4 / 16.8 / 18.0 over 346 frames in a 4 s window after hydration; 91 React commits/s and 805 inline style writes/s in the same window (a page-level MutationObserver and the devtools commit hook) | 75 tiles, 125 ms apart: the six badges revolve about a third of a turn over the strip with every logo upright, the rainbow glow turns through a full cycle every 48 tiles and breathes, the disc and the dashed ring hold still. Continuous, no snap. | `/private/tmp/claude-501/-Users-bnannier-Workspaces-canvas/15b0b96c-c06a-49b2-8225-b2774967df8a/scratchpad/orbit-before` (movie.webm, frames/, contact-sheet.png, meta.json), `/private/tmp/claude-501/-Users-bnannier-Workspaces-canvas/15b0b96c-c06a-49b2-8225-b2774967df8a/scratchpad/style-writes.mjs` |
| 2026-09-20 | The port: the same three loops as `LoopView` tracks, recorded on the harness for 9.4 s | Chromium headless, 1280x800, the dev server of this working tree on 8111 (the paint-first dev document), same sampling and clip | working tree of this commit | orbit 30 s, glow 6 s, breath 3.4 s to 0.85 (unchanged; the table is the previous values) | harness sampler, running: 9.5 / 17.0 / 25.1 over 324 frames, style writes/s 0, css animations 44 (the orbit's 9 on top of the Lattice's 35), commits/s 0; parked: 10.4 / 17.5 / 25.3 over 316 frames, 0 writes, 35 animations, 0 commits. The home page in the same 4 s window as the baseline: 7 commits/s and 7 style writes/s (startup residue: the Lattice's assemblies and the lens settling), against 91 and 805. | 79 tiles: the same three motions at the same rates as the baseline sheet (a third of a turn of the badges over the strip, the glow's full cycle in 48 tiles, the breath), logos upright, no snap at the channel's seam. The first seven tiles are the page loading. | `/private/tmp/claude-501/-Users-bnannier-Workspaces-canvas/15b0b96c-c06a-49b2-8225-b2774967df8a/scratchpad/orbit-after`, `/private/tmp/claude-501/-Users-bnannier-Workspaces-canvas/15b0b96c-c06a-49b2-8225-b2774967df8a/scratchpad/orbit-probe.mjs`, `/private/tmp/claude-501/-Users-bnannier-Workspaces-canvas/15b0b96c-c06a-49b2-8225-b2774967df8a/scratchpad/orbit-actions.mjs` |
| 2026-09-20 | The port on iOS: the home screen's stacked orbit on the native driver | iPhone 17 Pro simulator (iOS 26.3), the installed docs dev app pointed at this working tree's Metro on 8111 through the per-device `RCT_jsLocation` default (deleted again afterwards), 8 s of `simctl io recordVideo` at 8 fps, clipped to the orbit (1000x1100 device px) | working tree of this commit | as above | not sampled (the home screen carries no sampler; the native cost of a LoopView is the Backdrop rows' above) | 67 tiles: the badges revolve with the logos upright, the glow spins and breathes, the Lattice's assemblies animate beside it. The same phases as the web. | `/private/tmp/claude-501/-Users-bnannier-Workspaces-canvas/15b0b96c-c06a-49b2-8225-b2774967df8a/scratchpad/orbit-ios` (movie.mp4, frames/, contact-sheet.png) |

Not covered: Android (no emulator was booted), a reduce-motion device (the harness's
Park driver stands in: it parks the same channels the ladder parks), and the light
scheme on a device.

## Spectral currents for the docs background, 2026-09-20

The docs shell now uses `docs/src/brand/canvas-currents.tsx` in place of the
lattice. The homepage hero and its clock are unchanged. Three static SVG ribbon
layers bind transform and opacity to the existing Backdrop channels through
LoopView. The browser runs CSS keyframes; native uses the native animated driver.
`currents-tunables.ts` owns the ranges, alpha, blur, overscan and sampling density;
`/testing/currents` provides Park/Resume, energy, scheme and the shared frame trace.
The lattice remains available as a separate assembly fixture.

| Date | Effect and profile | Runtime and device | Revision (dirty?) | Values tried | rAF p50 / p95 / max (ms) | What the screenshots and trace showed | Artifacts |
|---|---|---|---|---|---|---|---|
| 2026-09-20 | Spectral currents, running and parked for four seconds each, then resumed | Codex in-app browser, Chromium, `/testing/currents?scheme=dark&surface=glass`, desktop | working tree of this commit | Default energy; 32/36/45 second cool/warm/violet cycles; dark/light art alpha 0.85/0.55; blur 6/7/9; overscan 14% of the longer edge; 24 samples per cosine cycle; center veil 0.72 | Running: 3.9 / 4.1 / 7.9 over 1016 frames. Parked: 3.9 / 4.2 / 7.8 over 1019 frames. These are this development browser's callback intervals, not a device refresh-rate claim. | Zero inline style writes/s in both samples. The page's two scenes total 12 CSS animations running and zero parked. Resume restores the ribbons' animation names and live transform. Solid removes the scene entirely (zero `canvas-currents` hosts); Glass restores it. Hero source and tunables have no diff. | `/testing/currents` readouts and CUA observations in the task; Lookout evidence below |
| 2026-09-20 | Homepage, Button docs and tuning fixture, both schemes, desktop and phone | Lookout web capture at Metro 8081; 1440x900 desktop and 390x844 phone, DPR 2 | working tree of this commit | Same values; changed the center gradient to portable SVG `r` and the fixture's heading to h2 after review | not sampled | All 12 screenshots captured and visually inspected. Subtle cyan/jade at upper left and lower right, warm/violet along the opposite edges; center copy and controls stay readable. Hero orbit intact; no clipped background bounds on phone. Zero layout/accessibility warnings. One unrelated console finding: the existing npm latest-version lookup returns 404 at registry.npmjs.org/@ionizeio/canvas/latest. | `.lookout/workspace/capture-report.json`, run `web-20260920-130113`; `.lookout/workspace/web/currents/`; `.lookout/workspace/contact-sheet.png` |
| 2026-09-20 | Native Button docs in dark/light and homepage in light | Lookout iOS capture, iPhone 17 Pro simulator, iOS 26.3, docs dev app at Metro 8081 | working tree of this commit | Same shared artwork and values | not sampled | Three screenshots captured and visually inspected: the native SVG gradients and ribbon edges render behind the clear header and content; both schemes remain readable. No capture findings on these shots. The first dark-home capture could not obtain a fresh painted frame and is not counted as verified. | `.lookout/workspace/capture-report.json`, run `web-20260920-125921-native`; `.lookout/workspace/ios/native-glass/` |

Not covered: Android (the installed SDK's `adb devices` reports no connected
emulator/device), native dark homepage (capture limitation above), on-device frame
cost, and native accessibility-setting toggles. Reduce Motion and Increase Contrast
use Backdrop's existing policy; the custom artwork explicitly hides itself for
Reduce Transparency. The Park driver verifies the shared poster-clock path on web.

### More color behind the glass, 2026-09-20

The requested second pass keeps the motion's timing and three LoopViews, but adds
one broad ribbon per layer through the content area. The original edge-only scene
left most glass controls sampling almost-uniform charcoal. Broader coverage solves
that spatial gap; stronger ink and a lighter center veil preserve the new detail.
No material renderer, hero, clock, or accessibility policy changed.

| Date | Effect and profile | Runtime and device | Revision (dirty?) | Values tried | rAF p50 / p95 / max (ms) | What the screenshots and trace showed | Artifacts |
|---|---|---|---|---|---|---|---|
| 2026-09-20 | Broader spectral currents, four-second running sample | Codex in-app browser, `/testing/currents?scheme=dark&surface=glass` | working tree following 0c998d14 | Dark/light ink 1/0.8 (was 0.85/0.55); veil opacity/center 0.28/0.6 (was 0.72/0.88); added ribbon wash/body/contour widths 100/42/1.2 at alpha 0.22/0.62/0.65; stronger gradient stops; unchanged 32/36/45 second cycles | 4.0 / 8.1 / 23.0 over 763 callbacks in this development browser | Zero inline style writes/s; still 12 CSS animations for the two scenes, with no extra animated layer. | `/testing/currents` readout in the task |
| 2026-09-20 | Homepage, Button docs and tuning fixture, desktop/phone, dark/light | Lookout web capture at Metro 8081; direct live Button-page inspection at 818px wide | same working tree | same values | not sampled | Twelve screenshots captured and visually inspected. Color bands now pass behind the tabs, preview panels, code panel and bottom navigation; the selected pills and glass diffusion are easier to distinguish. Copy and labels remain readable in both schemes, with no new overflow. No layout/accessibility warnings. Console findings: existing npm latest-version lookup 404; one Metro development WebSocket closing message. | `.lookout/workspace/capture-report.json`, run `web-20260920-132232`; `.lookout/workspace/web/currents/` |

Native re-capture was attempted on the iPhone simulator, but run
`web-20260920-132446-native` caught a blank startup frame for dark and a loading
skeleton for light. Those images do not verify the revised artwork. Android still
has no connected device. The verified visual scope for this tuning pass is web.
