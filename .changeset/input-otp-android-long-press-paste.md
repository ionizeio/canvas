---
"@ionizeio/canvas": patch
---

InputOTP offers Paste on a long press on Android, and on an iPhone once the field holds a code.

On Android the editor opens its Paste popup only while the text cursor is on, and the field switched the cursor off (`caretHidden`), which also turns off the editor's long-press insertion handling. From Android 10 the cursor now stays on and paints nothing: the cursor and its handles take the same zero-alpha colour as the rest of the hidden input, `rgba(255, 255, 255, 0)`. Older Android keeps the cursor off, because React Native cannot recolour the cursor or its handles before Android 10, so a cursor left on would paint the theme's accent over the cells.

The hidden input's text now sits at the start of the row instead of its centre, so a press anywhere past the code lands at the end of the code, where the next character belongs. Centred, a press to the left of the code landed before it, and the field moved the caret back to the end; on Android that correction rewrites the text, which the editor treats as an edit, so it closed the Paste popup a long press on a filled cell had opened, and on a field that had never been focused the correction never came and a paste went in before the code. On an iPhone the same correction dismissed the edit menu, so a long press on a filled code showed nothing; past the code it now shows Paste.

A long press at the start of the row on Android selects the code and opens the selection toolbar (Cut, Copy, Paste). The field hands the input its selection so that a keystroke lands in the first empty cell, and it used to push that caret back over the new selection, which closed the toolbar before it appeared. A selection the platform makes is now kept exactly where it is, on Android and the web, so the toolbar stays up and a paste over a selected code replaces it; a code changed by a parent lets go of any selection. A tap still puts the caret back at the end of the code. iOS and Android before 10 still push a selection back to the end, as before, because there the selection band or handles show whatever colour they are given and would sit off the cells.
