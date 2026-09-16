import type React from "react";
import { createField } from "./field.shared.js";
import { webSkin } from "./field.styles.js";
import { Input } from "../../atoms/input/input.js";
import { Textarea } from "../../atoms/textarea/textarea.js";
import { Select } from "../../atoms/select/select.js";
import { Autocomplete } from "../../atoms/autocomplete/autocomplete.js";
import { PhoneInput } from "../phone-input/phone-input.js";

// The controls that own their own label anatomy. Field compares by reference against THIS
// platform's entries, so the delegation test is exact rather than name-based.
const LABEL_OWNERS = [Input, Textarea, Select, Autocomplete, PhoneInput] as unknown as React.ComponentType<never>[];

export const Field = createField(webSkin, LABEL_OWNERS);
export type { FieldProps } from "./field.shared.js";
