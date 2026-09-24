---
"@ionizeio/canvas": patch
---

RadioGroup takes the FILL sizing nature on every platform, as its iOS list section already did: it fills its parent's width, so a `row` group wraps its options inside it instead of growing to their combined width and running past its container (the Radio page's card example scrolled a phone-width page sideways). A two-column DescriptionList's value now shrinks and wraps beside its Update link, so a long id or email no longer runs past a narrow card on the web or natively. The docs' Do and Don't frames lay each example out in a definite-width column, the Playground's layout, so paragraphs and wrapping rows fit a phone; a Don't that demonstrates overflow is clipped at its frame, and a new phone-width pass keeps every docs page from scrolling sideways at 390px.
