# Canvas starter

A small Expo application using the published Canvas package: `@nannier-com/canvas` today, `@ionizeio/canvas` once that scope's first release is on the registry. It runs on web, iOS, and Android with one component tree and Expo's default Metro resolution. It has its own dependency manifest and lockfile and does not import the Canvas checkout or docs app.

## Run

With access to the source repository:

```sh
git clone https://github.com/ionizeio/canvas.git
cd canvas/examples/starter
bun install --frozen-lockfile
bun run web
```

The terminal prints the development URL. For native builds, install the relevant platform toolchain first, then run one of:

```sh
bun run ios
bun run android
```

`bun run start` starts Metro without choosing a platform. The native commands create the ignored `ios/` or `android/` project and build the application on a connected device or simulator/emulator. iOS requires macOS, compatible Xcode and CocoaPods; Android requires the Android SDK and a supported JDK. No EAS project or cloud account is configured.

The locked Expo Modules JSI 57.0.8 dependency carries a compiler compatibility patch in `patches/`. Apple clang 17 rejects Swift's retained-return annotation on these constructors; the patch omits that annotation only for affected compilers and keeps it on clang 18 and newer. It also rebinds call-scoped pointers inside the synchronous host-context closure, so the actor closure captures those local bindings. This preserves their lifetime, the existing concurrency checks, and the callback's allocation behavior. Bun applies the patch during installation.

The pointer correction was verified with the exact failing compiler invocation: Swift 6.2.4, Xcode 26.3 build 17C529, and the iPhoneSimulator 26.2 SDK. The unchanged source produced four capture errors; the corrected source compiled successfully. The docs app's separately locked JSI 57.0.5 has no intervening host-context closure and does not need this pointer correction. Full native application verification still runs through the candidate smoke workflow.

```sh
bun run typecheck
bun run build:web
```

The web export is written to `dist/`. Deploy it with an SPA fallback to `index.html` so `/preferences` works on a direct visit.

## What works

- Workspace editing with required name/city/workstream validation, controlled Autocomplete selection and multi-selection.
- A saved summary that updates only when the workspace is saved.
- Appearance selection, including the device's current light/dark preference, and a switch that controls the workspace summary.
- Immediate preference previews, explicit save and cancel actions, and a Drawer containing a working nested navigation menu.
- Session reset from the Drawer, restoring the sample data and default preferences.

All state lives in React memory. Saving means **saved for this session**. Reloading or terminating the application restores sample values. There is no backend, account, network submission, notification service or persistent storage.

## Structure

| File | Purpose |
| --- | --- |
| `src/app/_layout.tsx` | Expo Router stack, SafeAreaProvider, ThemeProvider, overlay host, Canvas Navbar and Drawer |
| `src/app/index.tsx` | Workspace form and saved summary |
| `src/app/preferences.tsx` | Theme and layout preferences |
| `src/state/session.tsx` | Immutable draft/saved values, validation, save, cancel and reset |
| `src/app-frame/screen.tsx` | Scroll viewport, readable page width and page overlay host |

Controls, typography and layouts are Canvas components using semantic props. The small app frame owns the screen's safe area, scrolling and navigation viewport. Canvas's default component typography uses the platform/system font stack. This app loads no Geist or other custom font assets and does not replace global Text behavior; `expo-font` remains an Expo framework dependency.

## Published dependency and candidate checks

`package.json` pins the registry package to `@nannier-com/canvas@2.62.1`, the scope the registry serves Canvas from today, and pins the SDK57 React19.2.3 / React Native0.86.2 pair. The package's own name is now `@ionizeio/canvas`; the dependency line, lockfile and imports here move to that scope once its first release is published, because this app must install from the registry as it is. Run installation inside this directory. There are no source aliases, custom Canvas Metro resolvers, package links or development overlays. To use Canvas in an existing app, install the package and its required peers there instead of copying this starter's SDK dependency versions into an unrelated project.

Maintainer candidate checks use a temporary copy of this app and install the sealed package tarball in that copy, under the dependency name this app declares for Canvas, so every import in the copy resolves to the candidate. They do not replace the dependency committed here. Preparation copies only the reviewed files in `smoke/manifest.json` into the temporary app before typechecking against the candidate. The shared fixture bodies and route templates stay outside ordinary `src`, so unreleased APIs never enter its registry typecheck or route graph.

Setting `EXPO_PUBLIC_CANVAS_SMOKE=1` selects the smoke identity and enables the prepared routes; it does not add those routes to the ordinary app. The ordinary app uses `com.nannier.canvas.starter` and the `canvas-starter` URL scheme, while that opt-in build uses the separate `com.nannier.canvas.starter.smoke` ID and `canvas-smoke` scheme. Build identity is supplied by the verification tooling, not fabricated by the app.

## Terms

The source repository, including this starter, remains all rights reserved. This example does not add a license grant. The compiled Canvas package distributed through npm has its own MIT license and notice; its grant does not extend to this repository's source.
