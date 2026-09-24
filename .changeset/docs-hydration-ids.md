---
"@ionizeio/canvas": patch
---

Docs site: pre-rendered pages now hydrate with the same `useId` ids the server wrote. Expo's static renderer rendered the app inside the `+html` document, which shifted every id under `#root` away from the ids the client builds, and Expo's development wrapper put a toast beside the app on the development client, which shifted that client's ids away from the server's. React reported the mismatch on 13 of the 18 template pages on the dev server, and on the published site an Autocomplete's `aria-controls` named a listbox id that did not exist. The docs now patch both Expo files, a docs check fails if a later Expo upgrade leaves a patch behind, and an end-to-end test checks the hydrated ids on the export. No change to the published package.
