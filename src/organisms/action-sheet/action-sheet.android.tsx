import { createActionSheet } from "./action-sheet.shared.js";
import { androidSkin } from "./action-sheet.styles.js";
import { Button } from "../../atoms/button/button.android.js";

// Material 3 (modal bottom sheet) ActionSheet. Metro resolves this file on
// Android; the docs import it for preview.
export const ActionSheet = createActionSheet(androidSkin, { Button });
export type { ActionSheetProps, ActionSheetAction } from "./action-sheet.shared.js";
