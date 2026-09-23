import { createDialog } from "./dialog.shared.js";
import { androidSkin } from "./dialog.styles.js";
import { Button } from "../../atoms/button/button.android.js";
import { Input } from "../../atoms/input/input.android.js";

// Material 3 (basic dialog) Dialog. Metro resolves this file on Android; the docs import it for preview.
export const Dialog = createDialog(androidSkin, { Button, Input });
export type { DialogProps } from "./dialog.shared.js";
