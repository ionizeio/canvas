---
"@ionizeio/canvas": patch
---

Make native docs preview links apply their explicit light/dark and solid/glass
choices when the app is already running. Seed native launch appearance from the
actual incoming URL, while preserving manual theme choices during ordinary
in-app navigation and when an external link omits an appearance axis.
Keep native status-bar icons legible through Expo's app-wide status-bar API,
matching the docs' existing native configuration on both iOS and Android.
