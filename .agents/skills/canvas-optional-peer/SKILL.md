---
name: canvas-optional-peer
description: Add or consume an OPTIONAL peer dependency in the Canvas RN kit so the package stays installable and buildable for consumers who skip it. Covers the guarded literal-require pattern, graceful labeled fallback, single dev warning, and package.json wiring. Use whenever a component needs a heavy or native third-party module (a QR renderer, a blur/glass native module, a chart lib) that not every consumer will install, or when a static import of such a module breaks the build for anyone who skipped it.
---

# Add or consume an optional peer dependency

Read `peerDependencies` and `peerDependenciesMeta` in `package.json` for the
current optional-peer inventory. The contract: a consumer who never installs the peer must
still `npm install` and BUILD `@ionizeio/canvas` cleanly, and the feature that
needs it degrades to a labeled placeholder instead of crashing. A static
`import "expo-blur"` breaks module resolution for EVERY consumer who skipped it,
so an optional peer is NEVER statically imported. Use the guarded literal require
below.

## The guarded literal require (copy this)

From `src/style/glass-surface/glass-surface.tsx`:

```ts
import type * as ExpoBlurTypes from "expo-blur"; // type-only: erased, never emitted

declare const require: (id: string) => unknown;
let BlurView: typeof ExpoBlurTypes.BlurView | undefined;
let supportsBlurTarget = false;
try {
  const mod = require("expo-blur") as {
    BlurView?: typeof ExpoBlurTypes.BlurView;
    BlurTargetView?: typeof ExpoBlurTypes.BlurTargetView;
  };
  BlurView = mod.BlurView;
  supportsBlurTarget = mod.BlurTargetView !== undefined;
} catch {
  BlurView = undefined;
}
```

Each line earns its place:
- `import type * as …`: annotates this private binding and is erased from emitted
  JavaScript. It still requires the peer's types while building Canvas. If retained
  in a public `.d.ts`, it also requires those types in consumers. Keep exported
  signatures independent of optional-peer types, as described below.
- `declare const require: …`: declares the symbol without pulling `@types/node`.
- The literal `require` sits directly inside the `try` block. Metro checks the
  FIRST enclosing block to classify an optional dependency. An intervening
  `if (typeof require === "function") { … }` makes the dependency required and
  breaks consumers who skip it. See `src/organisms/backdrop/skia-runtime.ts`.
  A pure-ESM runtime's missing `require` throws a `ReferenceError` that the same
  `catch` already handles.
- `require("expo-blur")` with a STRING-LITERAL id: a bundler that HAS the peer
  installed still statically sees the literal and includes it; a consumer without
  it can degrade when the bundler supports optional dependencies. Expo and the
  supported `@react-native/metro-config` defaults enable Metro's
  `allowOptionalDependencies`; custom Metro configurations must preserve that
  policy. The isolated consumer checks use the React Native defaults.
- `catch { … = undefined }`: a missing module throws at require time, so swallow
  it and leave the binding `undefined`.

Read additional exports from the same module binding inside the existing `try`.
Do not add a separate probe for every export.

## Public types must work without the peer

A type-only import removes a runtime dependency, not a declaration dependency.
Use small structural types built from React and React Native for exported APIs
that would otherwise retain optional-peer names. `src/style/safe-area.tsx` defines
its component props this way; `frostMethodProps` in
`src/style/glass-surface/glass-surface.shared.tsx` has an explicit structural return
type so inference cannot leak `expo-blur` into the published declaration graph.
Keep private implementation bindings typed from the real installed peer when useful.
Verify the emitted declarations with consumers that actually omit optional peers.

Default-export peers (like `react-native-qrcode-svg`) need interop: take the
`.default` if present, else the module itself
(`src/atoms/qrcode/qrcode.shared.tsx`):

```ts
import type RNQRCodeType from "react-native-qrcode-svg";

// These statements belong directly inside the existing try block.
const mod = require("react-native-qrcode-svg") as { default?: typeof RNQRCodeType } | typeof RNQRCodeType;
RNQRCode = (mod as { default?: typeof RNQRCodeType }).default ?? (mod as typeof RNQRCodeType);
```

Do NOT:
- static-import the peer (`import { BlurView } from "expo-blur"`): resolution
  fails at build for everyone who skipped it.
- use a computed/variable id (`require(pkgName)`): bundlers cannot follow it, so
  consumers who DO have the peer never get it bundled.
- `await import("expo-blur")`: turns the surface async and still hard-requires
  resolution in most bundler configs.

Per-platform peers live in the matching fork so other platforms never pull them:
`expo-glass-effect` (iOS-only Liquid Glass) is required only in
`glass-surface.ios.tsx` and `liquid-glass.ios.ts`; the base
`glass-surface.tsx` / `liquid-glass.ts` never mention it.

## Graceful fallback + one dev warning

When the binding is `undefined`, render a LABELED placeholder that holds layout,
never a crash:
- `QRCode` keeps its accessible frame and returns an empty `View` sized like the
  code (`width/height = sizeOf(props)`), so the layout does not collapse
  (`qrcode.shared.tsx`).
- `GlassSurface` returns `PlainSurface` with the skin's opaque fill, so the
  overlay still reads as a surface.

Warn AT MOST ONCE in dev, gated by a module-level flag plus the runtime-agnostic
`isDevMode()` (Metro defines `__DEV__`; web bundlers define
`process.env.NODE_ENV`; unknown runtimes default to dev). From
`qrcode.shared.tsx`:

```ts
let warnedMissing = false;
function isDevMode(): boolean {
  try { if (typeof __DEV__ !== "undefined") return __DEV__; } catch { /* not defined */ }
  try { return process.env.NODE_ENV !== "production"; } catch { return true; }
}
// …in the fallback branch:
if (isDevMode() && !warnedMissing) {
  warnedMissing = true;
  console.warn("[canvas] <QRCode /> requires the optional peer dependency react-native-qrcode-svg. Install it to render QR codes.");
}
```

The message names the EXACT package to install. Never bare `__DEV__` (it is
undefined in non-Metro bundlers); always route through `isDevMode()`.

## package.json wiring (both places, or npm treats it as required)

List the peer in TWO spots:
- `peerDependencies`: `"expo-blur": "*"` (use `*` when any version works, a real
  range like `">=6"` when it matters, e.g. `react-native-qrcode-svg`).
- `peerDependenciesMeta`: `"expo-blur": { "optional": true }`. This is what
  suppresses the missing-peer install warning/error for consumers who skip it.

Do NOT put an optional peer in `dependencies` (forces the install AND its bundle
weight on everyone). Do NOT add `"type": "module"` to package.json: dist mixes
the guarded `require` with ESM, and strict-ESM bundlers (webpack) drop a `require`
under `"type": "module"`. Canvas intentionally omits the `type` field.

New optional peer means a changeset (`.changeset/<slug>.md`): it changes the
public install contract.

## Verify

```bash
bun run build
bun run verify-package
bun test ./test ./tools
bun run verify-consumer-support --artifacts /absolute/path/to/sealed/artifacts
```

`scripts/verify-package.ts` checks resolvable relative specifiers, native output and
platform resolution, no raw source TypeScript, and no DOM-only public types. It
also rejects static or dynamic imports of optional peers and requires each optional
literal `require` to have a `try` with a `catch` as its first enclosing block.

`test/dist-smoke.test.tsx` imports and renders the built artifact in the local RNW
test environment. Its QRCode frame check must work whether the peer resolves or
not; it is not proof of an isolated installation without optional peers. Build
before the canonical unit suite so the artifact tests run.

`scripts/verify-consumer-support.mjs` verifies exact sealed package bytes in isolated
consumers, confirms every optional peer is absent, checks strict public declarations
and refs without `skipLibCheck`, and exercises the declared React 18 / React Native
0.74 floors and current versions, including web and native bundle resolution. Pass
the real sealed artifacts directory from the candidate workflow. Without
`--artifacts`, the command packs the local built package for development checks;
that does not replace verification of the exact release artifact.

Package verification and the sealed support matrix are CI gates. Never publish
locally; add a changeset and let CI release after verification.
