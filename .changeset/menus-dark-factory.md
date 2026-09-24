---
"@ionizeio/canvas": patch
---

The web Dropdown and RowMenu take Dark Factory's menu: a card of bold 12.5 px rows 2 px apart at an 8 px corner that take the hover wash at once, an uppercase eyebrow over a section, the shortcut as a muted caption, 14 px icons, an 8 px standoff from the trigger, and a disabled row in the muted ink instead of a dim. The RowMenu trigger on the web is Dark Factory's plain icon button (a 28 px square with a muted glyph and the hover wash). iOS and Android keep their platform menus; a disabled RowMenu row now dims to each platform's own value (0.4 on iOS, 0.38 on Android) and the iOS RowMenu takes the kit's iOS menu corner. RowMenu's root now hugs its trigger through the kit's sizing instead of a fixed `alignSelf`. Anchored overlays with no fixed card width (menus, option lists) now stay inside their outlet: a card that would cross an edge shifts back by the width it rendered at, and one that fits stays where it was anchored.
