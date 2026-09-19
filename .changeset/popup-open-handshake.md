---
"@ionizeio/canvas": patch
---

Anchored cards (the Dropdown and Select menus, the Autocomplete list, Popover, RowMenu, the calendar peek and every other hosted overlay) open sooner after their trigger is pressed. The overlay now measures its trigger, its outlet and the visible band together from a layout effect instead of one after another on the next animation frame, and the portal outlet re-renders in the same commit sequence as the owner that published into it, so the card mounts and reveals with fewer hops between the press and its first frame; on iOS and Android the trigger's box lands inside the opening render itself. A card that the fitter moves to the other side of its trigger (a list opened near the bottom of the screen) now waits for its layout under the new height cap before the glass opening starts, instead of beginning at the height it had on the first side and re-targeting mid-motion.
