---
"@ionizeio/canvas": patch
---

On iOS, Listbox and FilterPanel mark a choice the way an iOS list does: every chosen Listbox row carries a trailing check in the brand color, in single and multi select alike, and is no longer filled for being chosen; a FilterPanel option row puts its label first, its count next and a trailing check on a chosen filter. The web and Android keep their leading marks (a checkmark and a filled row, or the platform's selection checkbox). Select, PhoneInput and the other pop-up menus keep the leading check, which is where an iOS menu puts it. No prop or value changes.
