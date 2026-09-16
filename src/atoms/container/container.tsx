import { createContainer } from "./container.shared.js";
import { webSkin } from "./container.styles.js";

// Web Container (the base; Metro falls back to it on native, web bundlers
// resolve it). Layout is a Shared treatment, so all three platform skins carry
// the same padding scale.
export const Container = createContainer(webSkin);
export { containerStyle, measureOf, FLUID } from "./container.shared.js";
export type { ContainerProps, Measure } from "./container.shared.js";
