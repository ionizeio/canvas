import { createCommand } from "./command.shared.js";
import { iosSkin } from "./command.styles.js";

// iOS Command: iOS ships no command palette, so its skin is the web's (Dark Factory's
// palette). Metro resolves this file on iOS.
export const Command = createCommand(iosSkin);
export type { CommandProps, CommandItem, CommandGroup } from "./command.shared.js";
