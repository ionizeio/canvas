---
"@ionizeio/canvas": patch
---

The docs' pre-rendered Carousel "Default index" page (/components/carousel/defaultindex) now hydrates without React error #418. Expo's static export rendered every page at a location it derived from the file name by stripping a trailing `index`, and it stripped those letters from any last segment that merely ends in "index", so that page was rendered for /components/carousel/default and shipped with no examples and a canonical link to a page that does not exist. The docs now patch Expo's CLI to strip only a whole `index` segment, `check:patches` runs the export's path function over such a name, and an e2e behavior test loads the page. Docs build only; nothing in the package changes.
