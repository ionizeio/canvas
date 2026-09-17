# Material evidence

The maintained `tools/materials/manifest.ts` supplies every component reference
route to Lookout and `materials.e2e.ts`. Captures include inherited and unpainted
components so a theme change cannot silently add an unwanted surface. They do
not introduce new component frames or claim that every variant appears in the
default example.

Existing `components.e2e.ts` and `overlays.e2e.ts` retain the Linux solid PNG
baselines. The material matrix captures light and dark glass at desktop and phone
widths, opens the shared overlay recipes, and attaches PNG plus computed browser
material diagnostics. Glass pixels are evidence for review, not portable GPU
baselines. The subsequent solid pass asserts zero active backdrop effects in the
component row and opened overlay host. A passing count does not establish
composited text contrast; review the screenshots and run Lookout.

Lookout keeps its fixed-viewport rest captures and adds `full-content` evidence
for every glass route. This state fits viewport height to the complete preview
while preserving its requested width, then restores the viewport. The extra
evidence avoids an element crop photographing blank space or fixed navigation
over a tall nested scrollport. Use rest shots to judge the actual viewport and
full-content shots to inspect all three browser skin rows.

`material-states.e2e.ts` uses the real docs appearance controls to exercise both
directions of a live material change. It checks the user's draft, input host
identity, selected segment and removal of solid-mode backdrop work. Clicking the
appearance control intentionally changes focus, so these tests do not claim
focus preservation inside an overlay. That contract requires a controlled
ThemeProvider fixture or native integration test that changes mode without
outside-dismiss input.

```sh
bun run typecheck:e2e
E2E_BASE_URL=http://localhost:8081 bunx playwright test --project=visual e2e/visual/material-coverage.e2e.ts e2e/visual/materials.e2e.ts e2e/visual/material-states.e2e.ts
```

Use `--grep` to select a bounded evidence run while implementing a family. The
full matrix is a coverage sweep. Rest captures request Reduce Motion; the
Lookout `button-group-held` recipe explicitly enables ordinary motion and
restores the preference afterward. A held screenshot is evidence of lift only,
not travel, recoil, settle or interruption.

## Actual native capture

Lookout supports one native target per run and currently captures resting deep
links only. Its native driver does not apply target-level query parameters or
execute browser state recipes. The dedicated targets therefore put
`surface=glass` or `surface=solid` in every route path. Native routes are marked
iOS/Android-only so web captures cannot be mistaken for native evidence.

```sh
lookout capture --targets glass --platforms web
lookout capture --targets native-glass --platforms ios,android
CANVAS_LOOKOUT_NATIVE_SURFACE=solid lookout capture --targets native-solid --platforms ios,android
```

Use the configured Lookout CLI on the machine if `lookout` is not on PATH. Set
`ADB` to the Android SDK's executable when needed. Both native runs require
booted devices with `com.nannier.canvas` installed and the docs service running.
The configuration does not boot devices, install apps or start services.

A native resting capture does not establish open-overlay behavior, material
capability, fluid motion, Dynamic Type, TalkBack/VoiceOver or platform preference
fallbacks. Verify those on the actual runtime and report unavailable coverage
explicitly. The iOS and Android rows inside a browser screenshot remain browser
skin previews.
