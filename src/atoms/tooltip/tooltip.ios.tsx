import { createTooltip } from "./tooltip.shared.js";
import { iosSkin } from "./tooltip.styles.js";
import { Button } from "../button/button.ios.js";

// iOS Tooltip (no native tooltip; a small rounded inverse label). Metro resolves
// this file on iOS; the docs import it for preview.
export const Tooltip = createTooltip(iosSkin, { Button });
export type { TooltipProps } from "./tooltip.shared.js";
