---
"@ionizeio/canvas": patch
---

InputOTP can be focused by a tap on iOS again, and VoiceOver and TalkBack now find it. The one text input that captures the code sits over the cells and was hidden with `opacity: 0`, but iOS skips a view below 0.01 alpha when it decides what a touch hits, so a tap on a cell did nothing (no focus ring, no caret, no keyboard) and a long press opened no paste menu; and both iOS and Android leave a zero-alpha view out of the accessibility tree. On iOS and Android the input now stays opaque and hides its ink instead: a text and selection colour with zero alpha. It is `rgba(255, 255, 255, 0)`, not `transparent`, because React Native's Android renderer reads the integer 0 that `transparent` packs to as "no colour" and falls back to black, which is what once painted the raw code across the row there. The web keeps the see-through input, since a browser still hit-tests and exposes it and only opacity hides the fill a browser paints over an autofilled input. The platform entries pass the choice to the shared shell as a part, so no platform check enters the shell.

The input also turns autocorrect and spell-check off on every platform. A one-time code is entered exactly as shown; an alphanumeric code was being offered a correction into a word (iOS proposed "Greg" for "Gteh"), which a see-through input had hidden but would still have applied.
