import { createAutocomplete } from "./autocomplete.shared.js";
import { iosSkin } from "./autocomplete.styles.js";

// iOS Autocomplete: iOS ships no autocomplete control, so its skin is the web's (Dark
// Factory's field and menu). Metro resolves this file on iOS.
export const Autocomplete = createAutocomplete(iosSkin);
export type { AutocompleteProps } from "./autocomplete.shared.js";
