import { createAlertDialog } from "./alert-dialog.shared.js";
import { iosSkin } from "./alert-dialog.styles.js";
import { Button } from "../../atoms/button/button.ios.js";
import { Input } from "../../atoms/input/input.ios.js";

// iOS (iOS 27 / Liquid Glass alert) AlertDialog. Metro resolves this file on iOS;
// the docs import it for preview. The confirmation field (`withInput`) renders the
// iOS-styled Input (borderless, no focus-ring box) so the field reads native in the
// alert. The literal `.ios` import is required for the WEB docs 3-up, where a barrel
// import would resolve the web Input and paint a boxed, blue-focus-ring field.
export const AlertDialog = createAlertDialog(iosSkin, { Button, Input });
export type { AlertDialogProps } from "./alert-dialog.shared.js";
