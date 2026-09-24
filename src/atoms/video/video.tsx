import { createVideo } from "./video.shared.js";
import { webSkin } from "./video.styles.js";

// Web Video (the base; Metro falls back to it on native, web bundlers resolve it). With
// `controls` the web draws the kit's control bar in Dark Factory's look.
export const Video = createVideo(webSkin);
export type { VideoProps, VideoRadius, VideoSource } from "./video.shared.js";
