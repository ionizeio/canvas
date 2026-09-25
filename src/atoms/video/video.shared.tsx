import type * as ExpoVideoTypes from "expo-video";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { type ImageSourcePropType, type StyleProp, type ViewStyle } from "react-native";
import { devWarn } from "../../style/dev-warn.js";
import { inertProps } from "../../style/inert.js";
import { Pressable, View, radius as radiusScale, useFillStyle, useReducedMotion, useTheme, type LayoutStyle } from "../../style/index.js";
import { Emblem as WebEmblem } from "../emblem/emblem.js";
import { Icon as WebIcon } from "../icon/icon.js";
import { Image } from "../image/image.js";
import { type ImageRadius } from "../image/image.shared.js";
import { Spinner as WebSpinner } from "../spinner/spinner.js";
import { VideoControls as WebVideoControls, type VideoTransport } from "./video.controls.js";
import { type VideoSkin } from "./video.styles.js";

// expo-video is an OPTIONAL peer (a native module), loaded with a guarded literal
// require: consumers who never render a Video skip the install and the native build
// step; consumers who use it install the peer. When absent, Video keeps its labeled
// frame (with the poster, if one is given) so layout holds, and warns once in dev.
declare const require: (id: string) => unknown;
type ExpoVideoModule = typeof ExpoVideoTypes;
let ExpoVideo: ExpoVideoModule | undefined;
try {
  // Directly in the try block: an intervening `if` makes Metro treat this as a
  // REQUIRED dependency. See src/style/glass-surface/material-runtime.ts.
  ExpoVideo = require("expo-video") as ExpoVideoModule;
} catch {
  ExpoVideo = undefined;
}

// Shared Video shell. The clip plays through expo-video (AVPlayer on iOS, Media3 on
// Android, the browser's media element on the web, all inside that library), so the kit
// draws only the frame, the poster and its own controls.
//
// Without `controls` it is an inline player: the whole picture is one play/pause
// control, a play emblem sits over the paused picture, and a spinner shows while the
// clip loads. With `controls` each platform shows transport the way it does itself: the
// iOS and Android entries hand the frame to the platform's own player controls (both
// ship the real control for this job), and the web draws the kit's control bar
// (video.controls.tsx) in Dark Factory's look. Which one renders is decided by the
// platform entry's parts, never by a platform check here.
//
// Boolean-prop API:
//
//   <Video source={clip} poster={still} />                    inline, tap to play
//   <Video source={clip} controls />                          with transport controls
//   <Video source={clip} autoplay muted loop cover />         a looping muted preview

/** A clip: a remote `{ uri }`, or a bundled asset from `require(...)`. */
export type VideoSource = { uri: string } | number;

/** Corner radius steps: the kit's radius scale, as on Image. */
export type VideoRadius = ImageRadius;

export interface VideoProps {
  /** The clip: a remote `{ uri }`, or a bundled asset from `require(...)`. */
  source: VideoSource;
  /** A still shown until the clip's first frame is on screen: a remote `{ uri }` or a bundled asset. */
  poster?: ImageSourcePropType;
  // Fit (pick one; default `contain`). How the picture fills the frame; first match wins.
  /** Fit: show the whole picture, letterboxed on black. The default (pick one). */
  contain?: boolean;
  /** Fit: fill the frame, cropping the overflow (pick one). */
  cover?: boolean;
  /** Fit: fill the frame by distorting the aspect ratio (pick one). */
  stretch?: boolean;
  /**
   * Start playing as soon as the clip is ready, unless the system asks to reduce
   * motion. Browsers autoplay only muted clips, so pair it with `muted` on the web.
   */
  autoplay?: boolean;
  /** Play again from the start at the end. */
  loop?: boolean;
  /** Play without sound. */
  muted?: boolean;
  /** Transport controls: the platform's own player controls on iOS and Android, the kit's control bar on the web. */
  controls?: boolean;
  /** Width over height of the clip; the frame fills its parent's width at this ratio (default 16 / 9). */
  aspectRatio?: number;
  /** Corner radius from the kit's radius scale (pick one): none, sm, md, lg, xl, 2xl, 3xl, full. */
  radius?: VideoRadius;
  /** The clip's accessible name, used in the names of its controls (default "video"). */
  accessibilityLabel?: string;
  /** Called when playback starts or stops. */
  onPlayingChange?: (playing: boolean) => void;
  /** Called when the clip plays to its end (each time round, when looping). */
  onEnd?: () => void;
  /** E2E hook forwarded to the frame. */
  testID?: string;
  /** Composition within a parent only, never a restyle hook and never a width: the parent layout container provides the bounds. */
  style?: LayoutStyle;
}

/** Build a Video component from a platform skin and its platform parts. */
export interface VideoParts {
  /** `controls` hands the frame to the platform's own player controls (iOS, Android). */
  nativeControls?: boolean;
  /** The kit's control bar, drawn when `controls` is on and the platform has none of its own. */
  Controls?: ComponentType<VideoTransport>;
  Emblem?: typeof WebEmblem;
  Icon?: typeof WebIcon;
  Spinner?: typeof WebSpinner;
  /** The platform's Button and Slider for the kit's bar (the web builds by default). */
  Button?: VideoTransport["Button"];
  Slider?: VideoTransport["Slider"];
}

type Fit = "contain" | "cover" | "fill";
type Status = "idle" | "loading" | "readyToPlay" | "error";

// Fit precedence when more than one boolean is passed: first match wins. Defaults to
// `contain`, the convention of every player: a clip is shown whole unless asked otherwise.
function fitOf(p: VideoProps): Fit {
  if (p.contain) return "contain";
  if (p.cover) return "cover";
  if (p.stretch) return "fill";
  return "contain";
}

function fitFlags(fit: Fit) {
  return { contain: fit === "contain", cover: fit === "cover", stretch: fit === "fill" };
}

interface Kit {
  Controls: ComponentType<VideoTransport>;
  Button?: VideoTransport["Button"];
  Slider?: VideoTransport["Slider"];
  Emblem: typeof WebEmblem;
  Icon: typeof WebIcon;
  Spinner: typeof WebSpinner;
}

interface PlayerProps {
  api: ExpoVideoModule;
  props: VideoProps;
  skin: VideoSkin;
  kit: Kit;
  nativeControls: boolean;
  frame: StyleProp<ViewStyle>;
  picture: StyleProp<ViewStyle>;
  label: string;
}

function Player({ api, props, skin, kit, nativeControls, frame, picture, label }: PlayerProps) {
  const { source, poster, autoplay, loop, muted, controls, testID } = props;
  const { tokens } = useTheme();
  const reducedMotion = useReducedMotion();
  const platformControls = !!controls && nativeControls;
  const kitBar = !!controls && !nativeControls;
  const fit = fitOf(props);

  const player = api.useVideoPlayer(source, (p) => {
    p.loop = !!loop;
    p.muted = !!muted;
  });
  const view = useRef<ExpoVideoTypes.VideoView>(null);
  const [status, setStatus] = useState<Status>(player.status);
  const [playing, setPlaying] = useState(player.playing);
  const [isMuted, setMuted] = useState(!!muted);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(player.duration > 0 ? player.duration : 0);
  const [firstFrame, setFirstFrame] = useState(false);
  const [requested, setRequested] = useState(false);
  const handlers = useRef(props);
  handlers.current = props;

  useEffect(() => {
    player.loop = !!loop;
  }, [player, loop]);
  useEffect(() => {
    player.muted = !!muted;
    setMuted(!!muted);
  }, [player, muted]);
  // Time updates feed only the kit's bar; without it the player sends none.
  useEffect(() => {
    player.timeUpdateEventInterval = kitBar ? 0.25 : 0;
  }, [player, kitBar]);

  useEffect(() => {
    const subscriptions = [
      player.addListener("statusChange", (event) => {
        setStatus(event.status);
        // The web player reports the clip's length only through `duration` (it sends no
        // sourceLoad), so read it once the clip is ready; native players send both.
        if (event.status === "readyToPlay" && player.duration > 0) setDuration(player.duration);
      }),
      player.addListener("playingChange", (event) => {
        setPlaying(event.isPlaying);
        handlers.current.onPlayingChange?.(event.isPlaying);
      }),
      player.addListener("mutedChange", (event) => setMuted(event.muted)),
      player.addListener("timeUpdate", (event) => setCurrentTime(event.currentTime)),
      player.addListener("sourceLoad", (event) => setDuration(event.duration)),
      player.addListener("playToEnd", () => handlers.current.onEnd?.()),
    ];
    return () => {
      for (const subscription of subscriptions) subscription.remove();
    };
  }, [player]);

  // Autoplay once the clip is ready, and never when the system asks to reduce motion.
  const autoplayed = useRef(false);
  useEffect(() => {
    if (!autoplay || reducedMotion || autoplayed.current || status !== "readyToPlay") return;
    autoplayed.current = true;
    setRequested(true);
    player.play();
  }, [autoplay, reducedMotion, status, player]);

  const togglePlay = () => {
    if (player.playing) {
      player.pause();
    } else {
      setRequested(true);
      player.play();
    }
  };
  const seek = (seconds: number) => {
    player.currentTime = seconds;
    setCurrentTime(seconds);
  };
  const toggleMute = () => {
    player.muted = !player.muted;
    setMuted(player.muted);
  };
  const fullscreen = () => {
    void view.current?.enterFullscreen();
  };

  const failed = status === "error";
  const loading = !failed && status === "loading" && (requested || playing);
  const { Controls, Emblem, Icon, Spinner } = kit;
  const bar = kitBar ? (
    <Controls
      playing={playing}
      muted={isMuted}
      currentTime={currentTime}
      duration={duration}
      label={label}
      onTogglePlay={togglePlay}
      onSeek={seek}
      onToggleMute={toggleMute}
      onFullscreen={fullscreen}
      style={skin.bar(tokens)}
      Button={kit.Button}
      Slider={kit.Slider}
    />
  ) : null;
  const overlayName = failed ? `${label} cannot be played` : playing ? `Pause ${label}` : `Play ${label}`;
  // Inline, the picture is the clip's one control. Beside the web bar it is a pointer
  // convenience only, hidden from assistive technology: the bar's own play button is the
  // named, focusable one, so a screen reader never hears two.
  const overlayAccessibility = kitBar
    ? {
        accessible: false,
        focusable: false,
        "aria-hidden": true,
        accessibilityElementsHidden: true,
        importantForAccessibility: "no-hide-descendants" as const,
      }
    : {
        accessibilityRole: "button" as const,
        role: "button" as const,
        accessibilityLabel: overlayName,
        "aria-label": overlayName,
      };
  // Wherever the kit draws the clip's controls, the clip surface and its poster are a
  // picture and nothing more, so they sit in an inert layer: out of the tab order and
  // the accessibility tree, never the target of a press (the control above takes it).
  // The web needs this said: the surface is expo-video's <video>, which takes no tab
  // index or ARIA prop, and Firefox makes a <video> without the browser's controls a tab
  // stop of its own, with no role or name, in front of the kit's controls.
  // react-native-web renders `inert` as the HTML attribute (see style/inert.ts); React
  // Native has no such prop and drops it. Full screen is a request on the <video> itself
  // and still works from inside the layer.
  const surfaceLayer = platformControls ? null : inertProps();

  return (
    <View style={frame} testID={testID}>
      <View style={picture}>
        <View style={skin.layer} {...surfaceLayer}>
          <api.VideoView
            ref={view}
            player={player}
            style={skin.layer}
            contentFit={fit}
            nativeControls={platformControls}
            fullscreenOptions={{ enable: true }}
            playsInline
            onFirstFrameRender={() => setFirstFrame(true)}
          />
          {poster && !firstFrame ? (
            <Image source={poster} style={skin.layer} {...fitFlags(fit)} accessible={false} importantForAccessibility="no-hide-descendants" />
          ) : null}
        </View>
        {platformControls ? null : (
          <Pressable
            style={skin.overlay}
            onPress={failed ? undefined : togglePlay}
            disabled={failed}
            {...overlayAccessibility}
            testID={testID ? `${testID}-toggle` : undefined}
          >
            {failed ? (
              <Emblem circle large destructive>
                <Icon circleAlert />
              </Emblem>
            ) : loading ? (
              <Spinner large primary />
            ) : playing ? null : (
              <Emblem circle large primary>
                <Icon play />
              </Emblem>
            )}
          </Pressable>
        )}
      </View>
      {bar}
    </View>
  );
}

export function createVideo(skin: VideoSkin, parts: VideoParts = {}) {
  const kit: Kit = {
    Controls: parts.Controls ?? WebVideoControls,
    Button: parts.Button,
    Slider: parts.Slider,
    Emblem: parts.Emblem ?? WebEmblem,
    Icon: parts.Icon ?? WebIcon,
    Spinner: parts.Spinner ?? WebSpinner,
  };
  const nativeControls = parts.nativeControls === true;

  return function Video(props: VideoProps) {
    const fill = useFillStyle("Video");
    const label = props.accessibilityLabel ?? "video";
    const frame: StyleProp<ViewStyle> = [
      skin.frame,
      props.radius ? { borderRadius: radiusScale[props.radius] } : null,
      fill,
      props.style,
    ];
    const picture: StyleProp<ViewStyle> = [skin.picture, { aspectRatio: props.aspectRatio ?? 16 / 9 }];

    if (!ExpoVideo) {
      devWarn(true, "[canvas] <Video />: the optional peer dependency expo-video is not installed, so the clip cannot play. Install expo-video to play video.");
      return (
        <View style={frame} testID={props.testID} accessible accessibilityRole="image" role="img" accessibilityLabel={label} aria-label={label}>
          <View style={picture}>
            {props.poster ? <Image source={props.poster} style={skin.layer} {...fitFlags(fitOf(props))} /> : null}
          </View>
        </View>
      );
    }
    return <Player api={ExpoVideo} props={props} skin={skin} kit={kit} nativeControls={nativeControls} frame={frame} picture={picture} label={label} />;
  };
}
