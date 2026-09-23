---
"@ionizeio/canvas": patch
---

The brand sans face is now Dark Factory's Manrope: `typeface.sans` names it and the web hand-off's `--font-sans` stack leads with it. Geist Mono stays the code face. An app registers Manrope 400 to 800 as static faces (`@expo-google-fonts/manrope`) and hands them to `<ThemeProvider fonts>`; the kit still ships no font files and still renders in the system face when no fonts are passed. The type scale itself is unchanged in this release.
