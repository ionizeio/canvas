import { createActionSheet } from "./action-sheet.shared.js";
import { iosSkin } from "./action-sheet.styles.js";
import { Button } from "../../atoms/button/button.ios.js";

// iOS (HIG action sheet) ActionSheet. Metro resolves this file on iOS; the docs
// import it for preview.
export const ActionSheet = createActionSheet(iosSkin, { Button });
export type { ActionSheetProps, ActionSheetAction } from "./action-sheet.shared.js";
