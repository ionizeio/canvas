---
"@ionizeio/canvas": minor
---

Add an optional accessibilityLabel to Select and Command so applications can name their purpose independently of visible labels or search prompts. Associate each control with its named result list. Select announces required fields without applying unsupported required metadata to a button. Command preserves the unhighlighted state and never points assistive technology at a nonexistent active option.

This minor release adds the public accessibilityLabel option to both controls.
