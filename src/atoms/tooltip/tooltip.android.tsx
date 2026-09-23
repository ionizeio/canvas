import { createTooltip } from "./tooltip.shared.js";
import { androidSkin } from "./tooltip.styles.js";
import { Button } from "../button/button.android.js";

// Material 3 (plain tooltip) Tooltip. Metro resolves this file on Android; the docs import it for preview.
export const Tooltip = createTooltip(androidSkin, { Button });
export type { TooltipProps } from "./tooltip.shared.js";
