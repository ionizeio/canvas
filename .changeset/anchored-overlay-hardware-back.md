---
"@ionizeio/canvas": patch
---

Android's hardware back now closes an open menu, list or popover instead of navigating away underneath it. Every card that floats beside its trigger (the Dropdown and AvatarMenu, RowMenu, Select, Autocomplete, Popover, Command, the PhoneInput country list, the ButtonGroup split menu and the Calendar day peek) subscribes to back while it is open, closes on it and consumes it, so the next back belongs to the page again. A card open inside another one closes first. A card pinned open with no `onOpenChange`, which cannot close, leaves back to the page, and the web never subscribes.
