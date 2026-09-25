---
"@ionizeio/canvas": patch
---

InputOTP offers Paste on a long press on Android again. Two things stood in the way, one for each place a long press can land.

On an empty field, or beside the digits, Android's editor opens its Paste popup only while the text cursor is on, and the field switched the cursor off (`caretHidden`), which also turns off the editor's long-press insertion handling. On Android the cursor now stays on and paints nothing: the cursor and its handles take the same zero-alpha colour as the rest of the hidden input, `rgba(255, 255, 255, 0)`. Android 9 keeps the cursor off, because React Native cannot recolour the cursor or its handles on that version, so a cursor left on would paint over the cells.

On the digits, a long press selects the code and Android opens its selection toolbar (Cut, Copy, Paste) when the finger lifts. The field hands the input its selection so that a keystroke always lands in the first empty cell, and React Native re-applied that caret over the new selection by writing the text back, which Android's editor treats as an edit that ends the toolbar before it appears. A selection the platform makes is now kept exactly where it is, so the toolbar stays up and a paste over a selected code replaces it. A tap still puts the caret back at the end of the code. iOS keeps pushing a selection back to the end, as before, because its selection band and grabbers show whatever colour they are given and would sit in the middle of the row, off the cells.
