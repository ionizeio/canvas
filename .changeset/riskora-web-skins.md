---
"@nannier-com/canvas": patch
---

Restyle every web skin to the Riskora Dashboard UI Kit (the iOS and Android skins keep their
HIG and Material 3 shapes and take only the brand).

Controls: buttons are 12px-cornered and 44px tall (36 / 52) with matching icon squares;
every field (Input, Textarea, Select, Autocomplete, InputOTP) is a white `card` box with
the 12px corner, 48px tall (40 / 56), a 16px inset and the 3:1 `input` boundary; select
lists, autocomplete lists, dropdowns, row menus, popovers and the command palette share a
16px menu card with an 8px inset and 10px-cornered 40px rows. Checkbox is a 20px box with
a 6px corner, Radio a 20px ring, Switch a 44x24 pill, Progress a 12px capsule on the soft
panel, Slider an 8px rail with a 20px thumb, badges and chips fully rounded pills, Kbd a
24px cap, Avatar's square a 12px tile.

Surfaces: cards, stats tiles, empty states, description lists, feeds, stacked lists, media
objects, calendars, board columns and the filter panel take the 20px card corner with the
ambient standard shade; the stat tile carries a 16px muted label over a 36px regular
headline. Dialogs and alert dialogs are 16px cards under a 60% scrim; toasts and the
action sheet share the corner; drawers and sheets round their content-facing edge at 30px
under the xl shade.

Navigation and data: the DataTable has a soft 10px-cornered header band with sentence-case
medium labels, 56px rows on dashed hairlines and 36px row-action tiles; the Navbar is a
72px bar with 12px link pills; the Sidebar a 20px column with 12px-cornered 48px rows;
pill Tabs become card tabs (a 16px bar of 12px-cornered hairline segments, the selected
one on a sky tint); pagination tiles are 40px with the 12px corner. Charts sit on the 20px
surface with 8px bar caps and dashed gridlines. The `--p-*` web block of `platforms.css`
transcribes every value.
