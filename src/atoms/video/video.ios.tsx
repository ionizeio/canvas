import { Emblem } from "../emblem/emblem.ios.js";
import { Icon } from "../icon/icon.ios.js";
import { Spinner } from "../spinner/spinner.ios.js";
import { createVideo } from "./video.shared.js";
import { iosSkin } from "./video.styles.js";

// iOS Video. Metro resolves this file on iOS; the docs import it for preview. iOS ships
// the real control for this job, so `controls` hands the frame to AVKit's own player
// controls; the inline player keeps the kit's play emblem and spinner in their iOS looks.
export const Video = createVideo(iosSkin, { nativeControls: true, Emblem, Icon, Spinner });
export type { VideoProps, VideoRadius, VideoSource } from "./video.shared.js";
