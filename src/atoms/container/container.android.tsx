import { createContainer } from "./container.shared.js";
import { androidSkin } from "./container.styles.js";

// Material 3 Container. Metro resolves this file on Android. Layout is a Shared
// treatment: androidSkin references the same padding scale as the web skin.
export const Container = createContainer(androidSkin);
export { containerStyle, measureOf, FLUID } from "./container.shared.js";
export type { ContainerProps, Measure } from "./container.shared.js";
