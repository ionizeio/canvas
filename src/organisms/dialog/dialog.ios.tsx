import { createDialog } from "./dialog.shared.js";
import { iosSkin } from "./dialog.styles.js";
import { Button } from "../../atoms/button/button.ios.js";
import { Input } from "../../atoms/input/input.ios.js";

// iOS (HIG alert) Dialog. Metro resolves this file on iOS; the docs import it for preview.
export const Dialog = createDialog(iosSkin, { Button, Input });
export type { DialogProps } from "./dialog.shared.js";
