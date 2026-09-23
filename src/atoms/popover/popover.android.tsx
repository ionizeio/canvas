import { createPopover } from "./popover.shared.js";
import { androidSkin } from "./popover.styles.js";
import { Button } from "../button/button.android.js";

// Android (elevated surface) Popover. Material 3 has no native popover, so this
// uses an elevated menu/dialog-style surface. Metro resolves this file on Android;
// the docs import it for preview.
export const Popover = createPopover(androidSkin, { Button });
export type { PopoverProps } from "./popover.shared.js";
