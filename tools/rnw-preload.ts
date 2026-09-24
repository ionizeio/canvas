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
    // expo-video is an OPTIONAL peer too (native players, and on the web a player built on
    // expo-modules-core's shared objects). Stub it with a scriptable fake so Video's tests
    // drive status, time and playback: every player the stub makes is kept in
    // globalThis.__expoVideoPlayers, `emit` fires an event at its listeners, and the fake
    // VideoView records the props it was rendered with on its player.
    build.module("expo-video", () => {
      const React = require("react");
      const { View } = require("react-native-web");
      type Listener = (payload: unknown) => void;
      class FakePlayer {
        loop = false;
        muted = false;
        playing = false;
        currentTime = 0;
        duration = 0;
        status = "idle";
        timeUpdateEventInterval = 0;
        fullscreenRequests = 0;
        viewProps: Record<string, unknown> = {};
        private listeners = new Map<string, Set<Listener>>();
        constructor(public source: unknown) {}
        addListener(event: string, listener: Listener) {
          const set = this.listeners.get(event) ?? new Set<Listener>();
          set.add(listener);
          this.listeners.set(event, set);
          return { remove: () => set.delete(listener) };
        }
        emit(event: string, payload?: unknown) {
          for (const listener of this.listeners.get(event) ?? []) listener(payload);
        }
        play() {
          if (this.playing) return;
          this.playing = true;
          this.emit("playingChange", { isPlaying: true });
        }
        pause() {
          if (!this.playing) return;
          this.playing = false;
          this.emit("playingChange", { isPlaying: false });
        }
      }
      const holder = globalThis as { __expoVideoPlayers?: FakePlayer[] };
      const players = (holder.__expoVideoPlayers ??= []);
      function useVideoPlayer(source: unknown, setup?: (player: FakePlayer) => void) {
        const [player] = React.useState(() => {
          const made = new FakePlayer(source);
          setup?.(made);
          players.push(made);
          return made;
        });
        return player;
      }
      class VideoView extends React.Component {
        declare props: { player: FakePlayer } & Record<string, unknown>;
        enterFullscreen() {
          this.props.player.fullscreenRequests += 1;
          return Promise.resolve();
        }
        exitFullscreen() {
          return Promise.resolve();
        }
        render() {
          this.props.player.viewProps = this.props;
          return React.createElement(View, { testID: "expo-video-view" });
        }
      }
      return { exports: { useVideoPlayer, VideoView }, loader: "object" };
    });
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
