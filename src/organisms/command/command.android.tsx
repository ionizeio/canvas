import { createCommand } from "./command.shared.js";
import { androidSkin } from "./command.styles.js";

// Android Command: Material 3 ships no command palette, so its skin is the web's (Dark
// Factory's palette). Metro resolves this file on Android.
export const Command = createCommand(androidSkin);
export type { CommandProps, CommandItem, CommandGroup } from "./command.shared.js";
