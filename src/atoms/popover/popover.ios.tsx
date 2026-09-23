import { createPopover } from "./popover.shared.js";
import { iosSkin } from "./popover.styles.js";
import { Button } from "../button/button.ios.js";

// iOS (HIG popover) Popover. Metro resolves this file on iOS; the docs import it for preview.
export const Popover = createPopover(iosSkin, { Button });
export type { PopoverProps } from "./popover.shared.js";
