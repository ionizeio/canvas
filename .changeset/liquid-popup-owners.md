---
"@ionizeio/canvas": patch
---

Open and close the remaining popups with the liquid popup material under glass: the triggered Popover, RowMenu (and Board's card menus), the split ButtonGroup menu, Autocomplete's suggestion list, PhoneInput's country list and the triggered Command palette grow out of their anchor edge, recoil and settle, and stay visible briefly on close while their content is already inert. Inline Popover cards and the bare Command palette stay static. A split ButtonGroup disabled while its menu is open now closes it, and a PhoneInput that becomes disabled or read-only while its country list is open closes the list.
