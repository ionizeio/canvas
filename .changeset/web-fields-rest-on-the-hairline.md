---
"@ionizeio/canvas": patch
---

The web field skins rest on the same `field-border` hairline as the iOS ones.

Input, Textarea, Select, Autocomplete, InputOTP, Stepper, PhoneInput and the Command
trigger no longer draw their resting border with the 3:1 `input` boundary on the web,
which read as a white frame around every field on the dark card; they rest on the
`field-border` hairline (gray-300 light, systemGray4 dark) exactly as the iOS skins do,
through the same `fieldBorder()` helper. Focus (`ring`) and error (`destructive`) borders
are unchanged, the non-field controls (checkbox, radio, switch, pagination, the outline
button) keep `input`, and Android's fields keep their Material underline. The
accessibility trade-off disclosed for the iOS fields (a resting boundary below WCAG
1.4.11's 3:1) now covers the web fields too, at the user's request.
