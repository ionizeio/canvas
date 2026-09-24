import { Emblem } from "../emblem/emblem.android.js";
import { Icon } from "../icon/icon.android.js";
import { Spinner } from "../spinner/spinner.android.js";
import { createVideo } from "./video.shared.js";
import { androidSkin } from "./video.styles.js";

// Material 3 Video. Metro resolves this file on Android; the docs import it for preview.
// Android ships the real control for this job, so `controls` hands the frame to Media3's
// own player controls; the inline player keeps the kit's play emblem and spinner in their
// Material looks.
export const Video = createVideo(androidSkin, { nativeControls: true, Emblem, Icon, Spinner });
export type { VideoProps, VideoRadius, VideoSource } from "./video.shared.js";
