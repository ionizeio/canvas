---
"@ionizeio/canvas": patch
---

Correct focused and error floating-label contrast across the Material filled field family. Focused labels use the existing primary-text role; error labels and destructive action text use a separate destructive-text role while fills, indicators, icons and destructive-foreground remain unchanged. Android Textarea now uses the same opaque muted field surface as Input, Select and Autocomplete.

The authored error-text colors protect the actual enabled capsule and pressed surfaces, including iOS ActionSheet's translucent neutral row and group opacity, beyond the four ordinary neutral surfaces. Fixed-red menus retain their independence from semantic theme overrides, with a darker existing palette step for light text.

The optional token preserves old complete ColorTokens literals. A React Native destructive-only theme override keeps its existing text color; an explicit destructive-text overrides text independently. Raw CSS rebrands must also set --destructive-text; setting --destructive-text: var(--destructive) restores their legacy text rendering. This is an accessibility correction to existing components and states, released as a patch.
