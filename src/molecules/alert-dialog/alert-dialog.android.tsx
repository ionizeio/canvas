import { createAlertDialog } from "./alert-dialog.shared.js";
import { androidSkin } from "./alert-dialog.styles.js";
import { Button } from "../../atoms/button/button.android.js";
import { Input } from "../../atoms/input/input.android.js";

// Material 3 AlertDialog. Metro resolves this file on Android; the docs import it for preview.
export const AlertDialog = createAlertDialog(androidSkin, { Button, Input });
export type { AlertDialogProps } from "./alert-dialog.shared.js";
