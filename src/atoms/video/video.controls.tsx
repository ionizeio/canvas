import { type ViewStyle } from "react-native";
import { GlassPane, paneStyle, useTheme, View } from "../../style/index.js";
import { Button as WebButton } from "../button/button.js";
import { Icon } from "../icon/icon.js";
import { Row } from "../layout/layout.js";
import { Slider as WebSlider } from "../slider/slider.js";
import { Typography } from "../typography/typography.js";

// The web's transport bar for <Video controls />, docked under the picture: play or
// pause, the elapsed time, a seek slider, the length, mute, and full screen, all kit
// controls in a Row so they take Dark Factory's look from their own web skins. iOS and Android never render it:
// their entries hand `controls` to the platform's own player controls.

/**
 * What the Video shell hands its control bar: the playback state and the handlers that
 * change it. An internal part contract, not public API (it is deliberately not named
 * `*Props`, which the docs generator publishes as a component's prop table).
 */
export interface VideoTransport {
  playing: boolean;
  muted: boolean;
  /** Seconds played. */
  currentTime: number;
  /** Length of the clip in seconds (0 until it has loaded). */
  duration: number;
  /** The clip's accessible name, used in the controls' own names. */
  label: string;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onToggleMute: () => void;
  onFullscreen: () => void;
  /** The bar's surface, from the platform skin. */
  style: ViewStyle;
  /** The platform's Button, taken as a part (the web build by default). */
  Button?: typeof WebButton;
  /** The platform's Slider, taken as a part (the web build by default). */
  Slider?: typeof WebSlider;
}

/** m:ss, the way players show a clip's time. */
export function clock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export function VideoControls(props: VideoTransport) {
  const { playing, muted, currentTime, duration, label } = props;
  const Button = props.Button ?? WebButton;
  const Slider = props.Slider ?? WebSlider;
  // The bar is a content pane under glass (the clip above it keeps its own pixels): the
  // node keeps its layout and drops its fill, and the pane paints the material behind it.
  const theme = useTheme();
  return (
    <View style={paneStyle(theme, props.style)}>
      <GlassPane layer="content" shape={props.style} />
      <Row tight alignCenter>
        <Button
          ghost
          icon
          accessibilityLabel={playing ? `Pause ${label}` : `Play ${label}`}
          iconLeft={playing ? <Icon pause size={16} /> : <Icon play size={16} />}
          onPress={props.onTogglePlay}
        />
        <Typography tiny muted>{clock(currentTime)}</Typography>
        <Slider
          small
          min={0}
          max={duration > 0 ? duration : 1}
          step={0.1}
          value={duration > 0 ? Math.min(currentTime, duration) : 0}
          disabled={duration <= 0}
          onChange={props.onSeek}
          accessibilityLabel={`Seek ${label}`}
        />
        <Typography tiny muted>{clock(duration)}</Typography>
        <Button
          ghost
          icon
          accessibilityLabel={muted ? `Unmute ${label}` : `Mute ${label}`}
          iconLeft={muted ? <Icon volumeX size={16} /> : <Icon volume2 size={16} />}
          onPress={props.onToggleMute}
        />
        <Button
          ghost
          icon
          accessibilityLabel={`Show ${label} full screen`}
          iconLeft={<Icon maximize size={16} />}
          onPress={props.onFullscreen}
        />
      </Row>
    </View>
  );
}
