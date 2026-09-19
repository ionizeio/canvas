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
| 2026-09-19 | The real docs page: the first Autocomplete example (the iOS skin on web) opened by a real pointer click on its chevron, closed with Escape, with the same per-frame DOM probe | Chromium headed via the repo's Playwright on `components/autocomplete` at the primary checkout's `bun run dev` Metro (8081), 1280x900, dark glass; machine load average 30 to 250 from peer sessions, so navigation waited for the lens definitions (the hydration signal: the dev server pre-renders the page and the server markup has no click handlers) and for the examples chunk to come back after hydration | f057b4ec (clean) | as above | not sampled (the recorder's 30 s navigation budget does not survive this load; the DOM trace is the evidence) | Click to the first material frame 20 ms after the click's frame: a 385 by 83 droplet (55% by 35% of the 716 by 240 resting pane, its top edge on the field's edge at y=320 throughout) with a 41 px corner and the rows at scale 0.35, opacity 0.36; rows at opacity 1 by +90 ms and at identity by +170 ms; the corner is the iOS skin's 26 by +120 ms; the pane past its resting height at +200 ms and settled by +240 ms. Escape: the rows fade to 0 over the first 70 ms of the shrink while the pane collapses into the field's edge over 140 ms, corner back to the droplet's 41 px. The settled screenshot shows the dense-layer glass list under the field with the page's lens rim. Same numbers as the harness run, so what the docs page shows is what the harness tuned. | `web-8081-verify` (`trace.json`, `open-300ms.png`, `open-settled.png`), `verify-8081.mjs` |

Not covered: Android (no emulator was available; the Android frost keeps the skin's
corners under the animated clip and the rim carries the edge, the same as the iOS
frost path), Reduce Motion on a device (the unit tests pin the snap), and a sealed
candidate build.
 and the rim carries the edge, the same as the iOS
frost path), Reduce Motion on a device (the unit tests pin the snap), and a sealed
candidate build.
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
