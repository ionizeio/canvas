---
"@ionizeio/canvas": minor
---

Add the clear material option to GlassSurface and GlassPane, preserving edge refraction with a lighter tint and minimal blur. This new reusable material capability justifies a minor release.

Use the clear grade for web Input, Textarea, Autocomplete, InputOTP, Stepper, PhoneInput, and DataTable editors in glass mode. Preserve native field materials, solid and accessibility fallbacks, and normal focus, selection, and text editing. Fields have no click ripple or typing animation.

Paint grouped focus and error borders above the refractive material so they stay crisp, and align flush Textarea material corners with its editor.
