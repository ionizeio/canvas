import { createContext, useContext } from "react";
import { type GestureResponderEvent } from "react-native";
import { type RovingItemProps } from "../../style/index.js";

// Shared context that lets a RadioGroup own the single-select state and a child
// Radio read it. A radio, unlike a checkbox, cannot be the source of its own
// on/off state (radios don't un-check themselves); the GROUP holds "which one is
// chosen". This context carries the chosen value down and the select action back
// up, so a `<Radio value="…">` inside a `<RadioGroup>` reflects and moves the
// selection without the caller wiring any state. A Radio with no surrounding
// group falls back to its own controlled `checked`/`selected` props.

export interface RadioGroupContextValue {
  /** The value of the currently selected option in the group. */
  value: string | number | undefined;
  /** Select an option's value (called by a child Radio on press). */
  select: (value: string | number, event: GestureResponderEvent) => void;
  /** When true, every radio in the group is disabled. */
  disabled?: boolean;
  /** Roving-focus props for the radio with this value (the group's arrow-key nav);
   *  undefined when the group is disabled or the value is not a known option. */
  itemProps?: (value: string | number) => RovingItemProps | undefined;
  /** The options are the rows of one inset-grouped list (iOS), so each plain option
   *  takes the list's cell insets and row highlight. */
  list?: boolean;
}

export const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

/** Read the enclosing RadioGroup, or null when a Radio is used standalone. */
export function useRadioGroup(): RadioGroupContextValue | null {
  return useContext(RadioGroupContext);
}
