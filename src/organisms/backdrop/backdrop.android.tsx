import { createBackdrop } from "./backdrop.shared.js";
import { androidSkin } from "./backdrop.styles.js";

// Android Backdrop: the trimmed field. The mid-range Adreno and Mali floor is the
// real constraint, and a decorative layer must never be why a scroll drops frames.
export const Backdrop = createBackdrop(androidSkin);
export type { BackdropProps } from "./backdrop.shared.js";
export { BackdropHost, type BackdropHostProps } from "./backdrop-host.js";
export type { Particle, ParticleSprite, GradientBlob, ParticlesProps, GradientProps, ShaderProps, CustomProps } from "./backdrop-layers.js";
export { backdropClock, type BackdropClock, type Energy } from "./backdrop-clock.js";
export { useGpuBackdrop, refreshBackdropRenderer } from "./skia-runtime.js";
// A Backdrop.Custom layer reads the surface box it is laid out against.
export { useBackdropBox, type BackdropBox } from "./backdrop-box.js";
