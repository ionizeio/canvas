// Loads the kit's React Native modules under plain Bun, the way every React Native Web
// consumer does: happy-dom supplies the DOM react-native-web renders into,
// `react-native` resolves to `react-native-web` (Bun cannot parse react-native's
// Flow-typed entry), and the optional native peers are stubbed. The `bun test` preload
// (test/setup.ts) imports it, and so does any tool that reads the kit's skins outside a
// test run: `bun --preload ./tools/rnw-preload.ts <script>` (the Dark Factory token
// solver, tools/darkfactory/derive-tokens.ts).
import { GlobalRegistrator } from "@happy-dom/global-registrator";
if (!(globalThis as { document?: unknown }).document) GlobalRegistrator.register();

import { plugin } from "bun";

plugin({
  name: "react-native-web-alias",
  setup(build) {
    build.module("react-native", () => ({
      exports: require("react-native-web"),
      loader: "object",
    }));
    // expo-blur / expo-glass-effect are OPTIONAL peers (they pull in expo-modules-core,
    // which needs RN internals RNW lacks). Stub them so GlassSurface takes its documented
    // complete opaque native fallback under test when those peers are unavailable.
    // Browser material capability is resolved separately from native optional peers.
    build.module("expo-blur", () => ({ exports: {}, loader: "object" }));
    build.module("expo-glass-effect", () => ({ exports: {}, loader: "object" }));
    // react-native-svg's native entry imports deep RN internals RNW lacks; stub it with
    // no-op elements (the kit's Icon/Spinner/Popover draw with it, but behavior tests assert
    // logic/interaction, not the rendered vector paths).
    build.module("react-native-svg", () => {
      const React = require("react");
      const stub = (props?: { children?: unknown }) => React.createElement(React.Fragment, null, props?.children ?? null);
      const svg = {
        default: stub, Svg: stub, Path: stub, Circle: stub, Ellipse: stub, Line: stub,
        Polygon: stub, Polyline: stub, Rect: stub, G: stub, Defs: stub, ClipPath: stub,
        LinearGradient: stub, RadialGradient: stub, Stop: stub, Mask: stub, Text: stub,
      };
      return { exports: svg, loader: "object" };
    });
  },
});
