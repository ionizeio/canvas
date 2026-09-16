---
"@ionizeio/canvas": minor
---

Add `PhoneInput`, a phone number field with a country segment.

Minor because it ships a new component. `PhoneInput` is the Input's grouped box with a
country segment at its start (the chosen country's flag and a caret that open a list of
countries showing their flag, name and dial code) and that country's dial code inline
before the number, which is typed on the phone keypad. The number (`value` /
`defaultValue` / `onChangeText`) and the country (`country` / `defaultCountry` /
`onCountryChange`, ISO alpha-2 codes) are each controlled or self-managed; the segment
picks from the kit's curated, alphabetical `PHONE_COUNTRIES` list (66 countries with their
ITU dial codes, exported with `flagOf` for the emoji flag of a code) or from a `countries`
list of your own; `label`, `required`, `error`, `disabled`, `readOnly`, `small`/`large`
and the measure axis work as on Input, and `Field` delegates its label, required mark and
error into it. Each platform draws it with its own Input and Select skins (the box and
the list), so on iOS it is the iOS input-field reference's phone field: the white box, a
flag-and-caret segment whose divider takes the field's state colour, the dial code in
the placeholder gray.
