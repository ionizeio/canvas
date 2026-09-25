---
"@ionizeio/canvas": patch
---

Form takes Dark Factory's form on the web and Android. Its rows sit 18px apart, and the actions row is one more row at that rhythm, with no extra margin above it: the cancel is now a ghost button and the submit a raised primary button, 10px apart. A two-column form's cells sit 14px apart and go side by side once the form is 414px wide (two 200px cells and the gap), where they used to wait for 513px; a two-column form now keeps two cells to a line at any width, where a wide one used to fit three, and once it stacks its cells fill the form's width, where they used to stay 200px wide. A FormSection's title is Dark Factory's 14px bold heading and its description a 12px medium muted line. Android keeps its Material 3 buttons in that row. iOS keeps its own section type, its 20px rhythm, an outline cancel and a plain primary submit.
