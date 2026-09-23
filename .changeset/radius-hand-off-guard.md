---
"@ionizeio/canvas": patch
---

The CSS hand-off's corner radii now match the components on every platform. Several `--p-*` radius properties had drifted from the skins they transcribe: on iOS the select, autocomplete and one-time-code fields now read 8 (the iOS field radius), the badge, tooltip, action-sheet card top and sidebar toggle declare their own iOS corners, and the swatch no longer overrides the web corners; on the web the segmented control, accordion card, drag handle, Tabs and TabBar capsules take the values the components draw; on Android the accordion card, command palette, data table, Tabs and TabBar declare the corners they previously inherited from the web.
