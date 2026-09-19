import { createBackdrop } from "./backdrop.shared.js";
import { iosSkin } from "./backdrop.styles.js";

// iOS Backdrop: the full field. Apple's tile-based GPUs carry it comfortably.
export const Backdrop = createBackdrop(iosSkin);
export type { BackdropProps } from "./backdrop.shared.js";
export { BackdropHost, type BackdropHostProps } from "./backdrop-host.js";
export type { Particle, ParticleSprite, GradientBlob, ParticlesProps, GradientProps, ShaderProps, CustomProps } from "./backdrop-layers.js";
export { backdropClock, type BackdropClock, type Energy } from "./backdrop-clock.js";
export { useGpuBackdrop, refreshBackdropRenderer } from "./skia-runtime.js";
// A Backdrop.Custom layer reads the surface box it is laid out against.
export { useBackdropBox, type BackdropBox } from "./backdrop-box.js";
