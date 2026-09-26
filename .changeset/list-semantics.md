---
"@ionizeio/canvas": minor
---

`StackedList`, `Feed` and `GridList` are lists to a screen reader, as the Tailwind UI lists they port are, and take a new `label` option that names the list. Minor, for that new option: `label?: string` on all three names the list for assistive technology ("Recent activity, list, 12 items").

On the web the rows had no list semantics at all: they were plain elements (a clickable row was a button), so a screen reader announced no list, no item count and offered no list navigation. Now the rows sit in a `list` and each row is a `listitem`, which react-native-web renders as a `<ul>` of `<li>` elements. A clickable row, a pressable event and a tappable tile stay buttons, each inside its item. A `StackedList`'s header `title` names its list; `label` names one without a title (the title wins when both are set). In a `reorderable` list each item wraps its draggable row, so the preview a pointer drag lifts carries no list item, and a list with no string title gives its drop zone the `label` for a name.

A `virtualized` list with a bounded height is itself the list and the keyboard stop, where the stop was an unnamed group. It mounts only the rows near its viewport, so each rendered row carries `aria-setsize` and `aria-posinset` and a screen reader counts the whole list, not the rows it has rendered. Focused, a list with no name is named in Chromium from the text of every row it has rendered, so a windowed list needs a `title` or a `label`, and the kit warns in development when it has neither.

Natively, React Native's role parser accepts both roles. iOS gives a list and a list item no trait, so VoiceOver reads the rows as before. On Android, TalkBack reads a windowed list's scroller and a `GridList`'s root as a list (`android.widget.AbsListView`), with `label` as its description, where they were plain view groups; a list item maps to no Android role.
