---
"@ionizeio/canvas": patch
---

The kit's `Pressable` keeps a `focusable={false}` Pressable out of the tab order on the web. react-native-web's Pressable renders a tab index of its own (0 unless disabled), which wins over `focusable`, so a surface that asked to be pointer-only stayed a keyboard stop. The kit's Pressable now spells the request as a tab index of -1 unless the caller sets one; React Native reads that as `focusable={false}` on iOS and Android, so nothing changes natively. In the DataTable, a pressable or selectable row was an unnamed tab stop in front of its activator button or checkbox (two presses of Tab per row, the first landing on the row), and each inline-editable cell of a pressable row was one more; in the Video, the picture under the web control bar was hidden from assistive technology yet still took keyboard focus. Tab now crosses only the named controls. The Pressable page says what `focusable={false}` does.
