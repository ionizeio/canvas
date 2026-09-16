import type React from "react";
import { createField } from "./field.shared.js";
import { androidSkin } from "./field.styles.js";
import { Input } from "../../atoms/input/input.android.js";
import { Textarea } from "../../atoms/textarea/textarea.android.js";
import { Select } from "../../atoms/select/select.android.js";
import { Autocomplete } from "../../atoms/autocomplete/autocomplete.android.js";
import { PhoneInput } from "../phone-input/phone-input.android.js";

// The controls that own their own label anatomy. Field compares by reference against THIS
// platform's entries, so the delegation test is exact rather than name-based.
const LABEL_OWNERS = [Input, Textarea, Select, Autocomplete, PhoneInput] as unknown as React.ComponentType<never>[];

export const Field = createField(androidSkin, LABEL_OWNERS);
export type { FieldProps } from "./field.shared.js";
