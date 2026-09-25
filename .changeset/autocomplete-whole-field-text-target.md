---
"@ionizeio/canvas": patch
---

The Autocomplete's text now fills its field's height, as an Input's does, so a press anywhere in the field focuses it and opens the suggestions; a press above or below the line of text used to do nothing. On iOS, which takes the web's Autocomplete, the field grows to the 44pt minimum (46pt at the large size) like its suggestion rows, and the disclosure dims while pressed again. Under glass, a Dropdown row with a shortcut now presses to a lighter tint than the other rows, as a PhoneInput country row does, so its muted shortcut keeps 4.5:1 contrast; every menu takes that rule from one place.
