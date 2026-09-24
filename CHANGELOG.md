# @nannier/canvas

## 3.1.0

### Minor Changes

- 697dc4c: Minor because it adds public API: `ColorTokens` gains the optional `action` and `action-foreground` roles, the call-to-action fill and its ink. `<ThemeProvider tokens={{ action }}>` now recolors the primary Button (its fill, label, loading spinner and glass puck) and the split button's action half and chevron without touching `primary`, which keeps what is selected, checked, current, linked or focused. Omitted, actions paint with `primary` exactly as before, and a `tokens={{ primary }}` rebrand still repaints actions with its primary pair. This is the seam the Dark Factory palette uses to draw actions green and selection violet.
- 0f2505e: Button gains `raised`, a new option: the page's main call to action rests on a soft glow in its own colour (Dark Factory's raised button), on every platform, for a primary button only and never while disabled.

  The web Button takes Dark Factory's look. Every intent is a pill with a 1px border (none on the link): the call to action is the green `action` pill with an 800 label and Dark Factory's tracking, `destructive` its red sibling, `secondary` Dark Factory's violet outline (its label in `primary-text`, which holds 4.5:1 where Dark Factory's violet does not), `outline` its hairline button, `ghost` borderless and `link` bare with no underline. Small and base are Dark Factory's 29 and 36 px, large steps up to 40. Hovering washes the outline looks at once and dims a link; a primary still rises 1 px. A disabled web button shows Dark Factory's disabled look (transparent, a hairline, a muted label) instead of fading, and a loading one keeps its intent's look. Under glass only the filled web buttons are pucks, since the outline looks paint no surface. The iOS and Android buttons keep their platform shapes and colours.

- 5b3b39a: Adds `selection` to Checkbox, and makes a one-setting Checkbox the platform switch on iOS and Android. A Checkbox that turns one thing on or off (no `selection`, no `indeterminate`) now renders the iOS or Material 3 switch on those platforms, with the same props, value and callbacks, since neither platform uses a checkbox for a single setting; it stays a checkbox on the web. A Checkbox that picks items from a list takes the new `selection` prop (a select-all with `indeterminate` implies it) and stays a checkbox everywhere: the edit-mode selection circle on iOS (a 22 pt ring, the brand fill with a white check or dash when selected), the Material 3 box on Android and the box on the web. DataTable's bulk selection passes `selection`. On iOS and Android the accessibility role follows what renders: a one-setting Checkbox reports `switch` there. Minor: new public API (the `selection` prop). Stated assumption: the switch substitution is the owner's idiom decision (a new look and role on native, with no prop or value change), so it ships as a minor rather than a major; a consumer whose native tests query a one-setting Checkbox by the `checkbox` role adds `selection` or queries `switch`.
- c4f3221: Minor because it adds public API: `shadow(level, tokens?)` takes the active tokens and tints the shade by the palette's `shade` role (the call without tokens keeps working and uses the light palette's).

  On the web the ladder is now Dark Factory's: each level is cast straight down with a negative spread, so it pools under a surface's lower edge instead of haloing it (sm is DF's tile, the default its card, md its hovered card, lg its popover, xl its dialog, a black top-layer shade on every palette). On iOS and Android each level keeps its platform geometry, retinted from the ink to the palette's shade. Every component now passes its tokens, so shadows follow the palette and the scheme, and the `--shadow-*` properties spell the ladder over `var(--shade)`.

- 44d5a8d: Minor because it adds public API: `ColorTokens` gains optional translucent roles, with matching `--*` custom properties in `styles/canvas.css`: the soft washes `primary-soft`, `success-soft`, `warning-soft` and `destructive-soft`, the text-field fill `field-fill`, the modal backdrop `scrim`, the shadow tint `shade`, and the inverse surface pair `inverse` and `inverse-foreground`. Every modal backdrop (Dialog, AlertDialog, ActionSheet, Drawer) now dims the page with `scrim` when the theme carries it, and keeps its former black dim when a custom token map omits it.

  The default colors are now Dark Factory's, in light and dark, on every platform: a lavender-tinted page with white cards and indigo-gray ink in light, deep indigo surfaces in dark, `primary` in Dark Factory's violet (selection, links, focus) and `action` in its green (the primary Button and the split button's action). Each role is a Dark Factory value or a recorded rule over one (`tools/darkfactory/derive-tokens.ts`), solved to the kit's contrast floors where the raw value falls short; `bun run check-df` replaces the Riskora Figma parity check. The eight chart series are new, anchored on Dark Factory's hues and ordered so every neighbouring pair stays distinct for colorblind readers. Avatar initials take the better of white and near-black on their identity fill, so they keep 4.5:1 on the new series.

  `brandColors` and the `--orb-*` custom properties are deprecated: nothing in the kit reads them, and they keep their former values until a major removes them.

- 14d3d69: Minor because it adds public API: `shape` gains a `tile` corner role (12 on every platform, `--radius-tile` in the hand-off) for KPI cards, stat tiles and icon tiles, tighter than a content card.

  The web corners are now Dark Factory's: 8 on rectangular controls (icon buttons, menu rows, nav highlights, pagination tiles), 10 on fields, 12 on menus and popovers, 14 on cards, 18 on dialogs and toasts, 22 on sheets and drawers. iOS and Android keep their platform corners. `--radius-control-ios` now names the pill it always was in the skins (it read 10px), and the Skeleton card placeholder follows the card corner.

- 2cd6f93: Adds `hover`, Dark Factory's translucent hover wash, as a color role: the brand violet at 8% (10% in dark) that a hovered row or quiet control washes with, in every palette (`rgba(123, 108, 240, 0.08)` blush, `rgba(63, 127, 224, 0.08)` mint, `rgba(164, 150, 255, 0.1)` dark), as `ColorTokens.hover` and `--hover` in the CSS hand-off. It is translucent, so it reads on any surface and over glass; `accent` stays the same wash composited on `card`, and a token map without the role washes with `accent`. Minor: new public API (a color role and its custom property).
- b1cde5e: Adds Dark Factory's mint palette as a theming option. `<ThemeProvider mint>` paints the light scheme in mint (blush stays the default, and `dark` still wins, since Dark Factory has one dark palette); `ssrPalette` holds a server-rendered palette through hydration the way `ssrScheme` holds the scheme; `useTheme()` reports `palette`; `mintColors` and `colorsFor(palette, scheme)` expose the token sets; and on the web `setPalette("mint")` / `getPalette()` switch `data-palette="mint"`, whose block in the CSS hand-off (`styles/tokens/colors.css`, included by `styles/canvas.css`) carries the mint tokens and mint's frost tints; the block never matches in a dark context, on the root or on any wrapper, and the accessibility fallbacks now also reach palette and scheme wrappers inside a glass root. Minor: new public API (a ThemeProvider option, a server-rendering prop, two web helpers, a token set and its resolver).

  A new optional color role, `inverse-primary`, is the brand on the inverse surface. The Android snackbar now paints Dark Factory's toast pill (`inverse`, with `inverse-foreground` text) in both schemes, and its action takes `inverse-primary`, the active palette's own brand hue lightened to 4.5:1 on the pill, solid and under glass, instead of the other scheme's brand text. An app that recoloured the snackbar through `foreground` and `background` overrides now sets the three inverse roles instead; token maps without them keep the old inverted bar.

- c2667b6: Adds `statusColors(tokens, tone)`, the status colors every toned surface reads from the theme's roles: for `success`, `warning`, `error`, `info` and `neutral` it returns the `ink` that names the tone in text (4.5:1 or better over its wash and on a plain surface, in every palette), the translucent `wash` behind a toned pill or panel, and the solid `dot`. `info` rides the primary family, as Dark Factory's info is its violet accent, and a token map without the soft roles gets Dark Factory's wash alphas. Badge and Alert now read it and take Dark Factory's look on every platform: Badge's tones are Dark Factory's pills (the quiet surface pill by default, the solid call-to-action pill for `default`, a hairline pill for `outline`, the soft red pill for `destructive`, and for `status` the live-state pill whose leading dot carries the tone beside a foreground label), and a toned Alert is the soft panel (the tone's wash, its ink on the title, the foreground on the body, its solid color on the icon), with Dark Factory's 12px corner and dense type; the Icon's `success` reads the success role. Minor: new public API (`statusColors`, `StatusColors`, `StatusColorTone`).

### Patch Changes

- 6937b1f: Avatar's initials fallback is Dark Factory's identity disc on every platform: the name resolves to one of Dark Factory's ten stage hues through a stable hash, and the disc is that hue's 135 degree blend from a pale tint to a deeper, warmer neighbour (the same colours Dark Factory computes, bit for bit), drawn with react-native-svg so iOS, Android and the web paint one gradient. The initials are bold (800) at about a third of the disc (10px on `tiny`, 11px on `small`) in near-black, which holds 4.5:1 on both ends of every blend where Dark Factory's white initials measure about 1.8 to 2:1. Like a photo, the disc is identity content: it keeps its colours under glass, and only the neutral tile of an avatar with no name or initials takes the control material. The iOS and Android skins now alias the web one (no platform ships an avatar control), so the rounded square takes the 8px control corner everywhere, while the press feedback stays each platform's own (the Android ripple, the iOS and web dim). The docs gain an Identity colours example, and the stack examples pass full names so their discs differ.
- 4a5fb19: The Avatar documentation no longer says the initials are white: they take whichever of white or near-black reads better on the identity color, which is what the component draws since the Dark Factory palette landed.
- eecb765: AvatarMenu's trigger is Dark Factory's identity pill on every platform: bare at rest (no pane under glass), the `accent` fill under the pointer and while its menu is open, a 28 px disc in the viewer's violet glow ring, the name at 12 px bold over the email in Dark Factory's muted micro type, and a chevron that no longer turns. The menu it opens stays each platform's own Dropdown; on the web it stands off by Dark Factory's 8 px. Under glass a disabled pill's ink dims by each platform's own disabled dim.
- ef84b7f: Re-mints the Linux visual baselines for the identity-disc Avatar (and the pages that show it), the charts' status colours, and the FILL RadioGroup. No change to the package's behaviour.
- 380daf5: Re-mint the Linux visual baselines for the Dark Factory buttons, segmented control and pager.
- dc3fd21: Re-mints the Linux visual baselines for the Checkbox page, whose iOS and Android previews now draw the platform switch for a one-setting Checkbox, and for the FilterPanel page, whose iOS option rows now draw the edit-mode selection circle. No change to the package's behaviour.
- 4cd7d2d: Re-mints the Linux visual baselines for the Dark Factory Chip, Progress and Swatch: the Progress page's slim green meters, the Swatch page's tile corners, and the dark Chip page. No change to the package's behaviour.
- fa80d1c: The visual regression baselines now show the Dark Factory palette in Manrope. Test fixtures only; the package itself does not change.
- 05eae4d: Re-mint the Linux visual baselines for the Dark Factory menus: the web Dropdown, RowMenu and Listbox rows, the Popover panel and the Tooltip bubble, in light and dark. Test-only; nothing in the package changes.
- 19c6904: The visual regression baselines now show Dark Factory's palette-tinted elevation. Test fixtures only; the package itself does not change.
- d099410: Re-mints the Linux visual baselines for the open Select and Autocomplete's focus border and for the platform parts the docs' iOS and Android previews now draw (Dialog, AlertDialog, ActionSheet, Dropdown, Popover, Tooltip, Navbars, DragDrop). No change to the package's behaviour.
- 48f92a3: Re-mints the Linux visual baselines for the Dark Factory quiet atoms and status colors: the Badge and Alert pages, Command's key caps, and the Board, FilterPanel and GridList pages, whose badges are now Dark Factory's pills. No change to the package's behaviour.
- 4155f84: Re-mints the Linux visual baselines for the Radio page, whose iOS preview now draws the checkmark list, and for the Listbox and FilterPanel pages, whose iOS previews now mark a choice with a trailing check. No change to the package's behaviour.
- 7382563: The visual regression baselines now show Dark Factory's type scale and web corners. Test fixtures only; the package itself does not change.
- 4d3dce7: Brand-tinted glass pucks now solve their tint for the ink the component actually paints on them (the call-to-action, primary, destructive, success or warning pair), not the stronger of black and white. The two agree on today's palette, so nothing renders differently; they diverge on a brand color where the skin's ink is not the stronger one, which the Dark Factory violet is.
- 2a8d653: The web ButtonGroup is Dark Factory's segmented control: the options sit in a pill track (the `secondary` surface with a hairline, a 3px inset and a 2px gap) and the selected one rides a white thumb on Dark Factory's segment shadow, with bold labels in the foreground or the muted ink. The split button is the web Button's green call-to-action pill with its chevron half, and the stepper and the spaced peers are hairline pills the height of a Button beside them. Under glass the split is now its call to action's brand-tinted glass on every platform, as a primary Button is, instead of violet text on plain glass. The iOS and Android groups keep their platform shapes.
- 98e2ab8: The Dark Factory vendor script now defaults to the repository's new location, `../Argus` (it moved from `../Dark Factory`), and the repo instructions name that path.
- 2a984bd: The repo instructions record the Dark Factory design direction (tokens, web look, where native shapes stay, type, one job with a different control per platform, web frost, docs page look, examples, hover lifts), and AGENTS.md now carries the same text as CLAUDE.md, kept equal by a test. Documentation only; no component changes.
- 2301c7f: Records the Dark Factory reference cards (page look, frost material, hover lifts, avatar) that the coming Dark Factory restyle is tuned against. Tooling and evidence only; no component changes.
- c378f0a: Vendors Dark Factory's theme source (palettes, type scale, radii, shadows, materials, hue ramp) into `tools/darkfactory/theme.json` with `bun run df:vendor`, and pins the palette facts the coming token mapping relies on. Tooling only; no component changes.
- 28b5418: Typography's roles take Dark Factory's dense type scale: bold titles stepping from the display 24 down to the heading 14 (`h1` 20, `h2` 17, `h3` 16, `h4` 15, `h5` 14), body copy at 12.5 medium, `lead` at 14 medium, `small` and `muted` at 11.5 semibold, `tiny` at 11 semibold, and `caption` as Dark Factory's uppercase eyebrow at 10 bold. `code` and `mono` sit at 11.5 and 12 in Geist Mono. Every line height is a whole pixel, so text lays out the same on Android, iOS and the web. The `--role-*` custom properties carry the same values. The props are unchanged; only the sizes and weights they resolve to differ, so screens that use Typography render smaller and bolder titles.
- b181855: Web glass is now Dark Factory's plain frost on every browser: each surface paints its layer's tint over a 24px backdrop blur with no saturation shift, edged by a 1px inset hairline, with no refraction and no specular highlight. The Chromium lens (the SVG displacement filter) is removed, so glass renders the same in Chrome, Safari and Firefox. Text-entry fields and other clear surfaces draw an unblurred translucent fill, as Dark Factory's inputs do. The web tints are Dark Factory's (a white 0.52 shell in light, a near-clear shell in dark, denser content and menu panes); iOS Liquid Glass and the Android blur keep their material and tints, and `glassByScheme` keeps its values as the native set. In the CSS hand-off `--glass-lens` and `--glass-illumination` become deprecated aliases and `--surface-backdrop` is `none`.
- 1f37f10: Chip takes Dark Factory's look on the web and iOS (iOS ships no chip control, so its skin is the web skin): the neutral chip is Dark Factory's quiet borderless pill with an 11px bold label, a coloured chip is its soft pill (the status tones from `statusColors`, so a success chip matches a success Badge and Alert; a free palette hue at Dark Factory's soft alpha under its deep label, in solid and glass alike), `primary` is the primary color's soft pill instead of a fixed indigo, and a selected filter chip is the solid primary. Android keeps its Material 3 chip, recolored: the outlined idle chip and the tonal selected filter chip with its checkmark. `HUE_WASH` is deprecated: the kit no longer paints with it. No prop changes.
- 209a9ca: Progress, Emblem and Swatch take Dark Factory's look. A progress bar is a meter, so it fills with the call-to-action `action` color on every platform (Dark Factory fills its meters green), its `warning` and `danger` tones read their colors from `statusColors`, and the web bar is Dark Factory's slim meter (4, 6 or 8px, on its line color, in its dense label type); iOS and Android keep their bars, recolored. Emblem washes each tone with its soft role from `statusColors` (its monogram in the tone's text-grade ink) and takes Dark Factory's 10/12/14px tile corners, and Swatch the same corners; both render the web look on iOS and Android, which ship no such control. A `tokens` override that repaints `primary`, `success`, `warning` or `destructive` now repaints that tone's soft wash too, at Dark Factory's alpha for the scheme, unless the override sets the soft role itself. No prop changes.
- 2f1768c: The quiet atoms take Dark Factory's look: a labeled Divider sets its label in Dark Factory's eyebrow (10 px, bold, uppercase, wide tracking, muted), Kbd becomes Dark Factory's compact key cap (20 px, its 6 px key corner, a 10.5 px bold label), and the Skeleton's button placeholder is a pill like Dark Factory's buttons. The same look renders on iOS and Android, which have no control of their own for these. No prop changes.
- 9268cec: The docs dev server no longer runs out of memory after 50 to 100 pages. Every document it renders re-evaluates the web server bundle, and expo-updates, imported by the hidden diagnostics route, subscribed at evaluation time to a module object Expo keeps process-wide, so each render left a listener that pinned the whole previous bundle (about 20 MB). The diagnostics route now reads the update identity through a native-only module, so expo-updates stays out of the web bundles, and a docs test keeps it there. No change to the package's behaviour.
- bf239b1: Keep two end-to-end checks true after the Dark Factory buttons: the Navbar docs page now fits at 768, so its known-overflow record is gone, and the scrolled-overlay check scrolls the harness page itself instead of relying on it being taller than the viewport above its trigger.
- f70755d: Every field shows a keyboard focus state. The web Autocomplete field turns its border `ring` while focused as well as while its list is open (and stays so after Escape closes the list over a still-focused field); the web Stepper box turns its border `ring` while its value field holds focus, and a bare iOS or Android Stepper field keeps the themed focus ring; the Command search row's rule turns `ring` and thickens while the search field holds focus; the web Select trigger turns its border `ring` while its list is open, as Dark Factory's select does; a flush Textarea keeps the themed ring inside itself. Under Increase Contrast a border that shows a state (a focused or errored field, an open trigger, a focused slider knob) now keeps its colour instead of being overwritten by the contrasting hairline.
- f64b08b: The material end-to-end checks now recognize a text field's clear glass well (Dark Factory's unblurred tint and hairline) as the field's own material. Test fixtures only; the package itself does not change.
- ff8f019: Brings Dark Factory's hover feedback to the web. A pressable Card (one with `onPress`) rises 2 px over 180 ms while its resting shade deepens to the raised one in step, and settles back when the pointer leaves (a `raised` or `flat` card rises with its shade unchanged); a primary Button rises 1 px over 150 ms, never while disabled or loading; a Sidebar row's `hover` wash fades in over 150 ms in the rail, the collapsed rail and the drill-down, beneath the row, so its pressed and active fills still switch at once. While it lifts and settles, a card stacks above its neighbours (and lifts its Grid or Row span cell above theirs), so its deeper shade falls over the card below instead of under it, as Dark Factory's does. The browser runs each transition, so nothing re-renders per frame; hover is read on the control's wrapper, which never moves, so a lifted surface cannot slide out from under a resting pointer; a touch never hovers; Reduce Motion makes every change instant. iOS and Android keep their platform feedback (React Native delivers no pointer hover there by default). `RippleClip` forwards `onPointerEnter` and `onPointerLeave`, and `useReducedMotion` now shares one subscription among all its callers, which also stops react-native-web's reduced-motion listeners from leaking.
- e4d8ce2: The interaction evidence inventory no longer lists the removed Backdrop organism, so the CI registry check passes again and releases resume. No component changes.
- 753d247: On iOS, Listbox and FilterPanel mark a choice the way an iOS list does: every chosen Listbox row carries a trailing check in the brand color, in single and multi select alike, and is no longer filled for being chosen; a FilterPanel option row puts its label first, its count next and a trailing check on a chosen filter. The web and Android keep their leading marks (a checkmark and a filled row, or the platform's selection checkbox). Select, PhoneInput and the other pop-up menus keep the leading check, which is where an iOS menu puts it. No prop or value changes.
- a3465da: Listbox rows take Dark Factory's menu row on every platform: bold 12.5 px labels at an 8 px corner, 2 px apart, a muted micro second line, the bordered list in Dark Factory's panel corner, and the hover wash on the web. The chosen single-select row now reads in the selection violet (its label in `primary-text`, the checkmark in `primary`) with no fill, where it used to be filled; iOS keeps its trailing check with a plain label, and multi-select keeps each platform's selection checkbox.
- 0eeb352: The brand sans face is now Dark Factory's Manrope: `typeface.sans` names it and the web hand-off's `--font-sans` stack leads with it. Geist Mono stays the code face. An app registers Manrope 400 to 800 as static faces (`@expo-google-fonts/manrope`) and hands them to `<ThemeProvider fonts>`; the kit still ships no font files and still renders in the system face when no fonts are passed. The type scale itself is unchanged in this release.
- 9c2b27c: The scrolled-overlay e2e check scrolls the materials harness page by setting its scroller's `scrollTop`. It called the scroller's `scrollTo({ top })`, but react-native-web replaces that method with its ScrollView's `scrollTo({ x, y, animated })`, so the call animated the page back to the top and the check's precondition failed in CI. Test-only; nothing in the package changes.
- a138915: The glass material host and its runtime are split per platform: Android gets its own files (the canvas-blur capture and expo-blur frost), the web keeps the CSS frost and the Chromium lens, and each platform resolves its own glass tints. Nothing renders differently; an Android app no longer bundles the web lens (the Android Button fixture drops from 8.7 KB to 7.1 KB gzip).
- 9a25237: The web Dropdown and RowMenu take Dark Factory's menu: a card of bold 12.5 px rows 2 px apart at an 8 px corner that take the hover wash at once, an uppercase eyebrow over a section, the shortcut as a muted caption, 14 px icons, an 8 px standoff from the trigger, and a disabled row in the muted ink instead of a dim. The RowMenu trigger on the web is Dark Factory's plain icon button (a 28 px square with a muted glyph and the hover wash). iOS and Android keep their platform menus; a disabled RowMenu row now dims to each platform's own value (0.4 on iOS, 0.38 on Android) and the iOS RowMenu takes the kit's iOS menu corner. RowMenu's root now hugs its trigger through the kit's sizing instead of a fixed `alignSelf`. Anchored overlays with no fixed card width (menus, option lists) now stay inside their outlet: a card that would cross an edge shifts back by the width it rendered at, and one that fits stays where it was anchored.
- c95a293: Follow-ups to the Dark Factory menus. An anchored card too wide for the room left by its trigger is pinned by its far edge in one layout, instead of stepping sideways a frame at a time on the web. The RowMenu trigger keeps its own size, hover area and menu width inside parents that are not kit layout containers, such as a table cell. Every hover wash falls back to `accent` for a theme that omits the optional `hover` role. The AvatarMenu pill's hover is the web's only, as native pointer hover waits on the owner, and under glass its glow ring draws no opaque gap.
- 14fcc24: The responsive e2e suite's record of the Navbar page's known overflow at tablet width is re-measured for the Manrope face (124px, up from 106px). The defect itself, a topbar link row that does not collapse, is unchanged and still recorded.
- d643bc0: Document how typefaces pass through nested providers. The Theming page gains a "Typefaces and nested providers" section: register the faces once on the root provider's `fonts`, a nested `ThemeProvider` keeps them, and its scheme, palette, surface and tokens stay its own (pass the same `tokens` constant to carry a rebrand in, and both `dark={dark}` and `light={!dark}`, with `dark` from `useTheme()`, to follow the parent's scheme). The README's Theming list documents `fonts` and says a nested provider resolves only its own `tokens`, the Typography page says the faces hold under nested providers, and a docs search for fonts, typefaces or nested providers now reaches the Theming page. The Theming page's palette previews drop the `fonts` prop they repeated, since they now inherit the docs' faces.
- 8f0649e: A nested `ThemeProvider` that does not pass `fonts` now keeps the nearest parent provider's registered typefaces, instead of resetting every kit label under it, and every overlay it opens, to the platform's system face. The faces are an app-level registration (what the app loaded), so a provider nested inside the root one, or inside portaled content, paints in them too. An explicit `fonts` still wins, and it replaces the parent's map whole (the roles are not merged). `tokens`, the scheme, the palette and the surface stay per provider, as before: a nested provider is how a subtree shows its own palette or brand, so pass the same `tokens` constant again to carry a rebrand into one.

  This changes documented nested-provider behavior: the `fonts` prop said that omitting it renders the kit in the system face, and a nested provider that omitted it did exactly that. It ships as a patch on the stated assumption that no consumer relies on that reset (no known consumer passes `fonts` today). To keep a subtree in the system face on purpose, pass it an empty map, `fonts={{}}`, held in a module constant so the theme value stays stable.

- 5fa80c8: The docs' open source licences page treats `@ionizeio/canvas-blur` as first-party, like the kit itself: it is published from this repository, so it is named in the Canvas paragraph instead of the third-party list.
- 78ef4e9: Pagination takes Dark Factory's pager on every platform. The page numbers are bare pills at the Button's heights, the current page is the violet pill, and Previous and Next are hairline circles around chevron icons (the text glyphs are gone, and the arrows follow the reading direction). The rows-per-page trigger is a hairline pill with a chevron, the truncation gap an ellipsis icon, a resting cell takes the instant hover wash on the web, and a disabled pager shows Dark Factory's muted look instead of fading. Neither iOS nor Android ships a pagination control, so the native skins are the web skin, with each platform's own press feedback. Under glass only the current page paints a surface (a brand puck); the other pages and the hairline arrows stay bare. The with-size variant now reads the "Showing X-Y of N" range when `itemCount` is set, as its prop documents. The ButtonGroup split button's Don't example is redrawn in the green call-to-action look.
- e411eec: Every shell now takes the components it draws with that look different per platform as parts from its platform entry files, instead of importing their web builds: Dialog (Button, Input), AlertDialog (Button, Input, which Android now passes too), ActionSheet, Dropdown, Popover, Tooltip and GeoMap (Button), Navbar (Button and Avatar beside its Dropdown), Calendar (ButtonGroup), FilterPanel (its checkbox, Badge, Button and the narrow window's Drawer), Sidebar (Drawer and the row Badge) and MetricBreakdown (Chip). A device already resolved them by platform, so nothing changes there; the docs' iOS and Android previews now show those pieces in their own look. DescriptionList narrows its two-column term label when the list itself is phone-narrow, measured, instead of when the window is, so it narrows in a narrow panel on a desktop and not in a wide container on a phone. A new test holds the seams, and the docs' platform registry check shares its definition of a component that looks different per platform.
- 7f8f2e2: Popover and Tooltip take Dark Factory's type. The Popover heading and description are Dark Factory's heading over its body in the muted ink on every platform; on Android, which has no popover, the panel is now the web's Dark Factory card with its hairline and popover shadow, and iOS keeps the iPad popover with its beak. The Tooltip keeps its inverse bubble (dark in the light scheme, light in the dark one, since Dark Factory has no tooltip and its one-colour toast pill would all but vanish on the dark page) with its label in Dark Factory's 12 px label weight; iOS, which has no tooltip, shows the web bubble, and Android keeps the Material 3 plain tooltip.
- 8316a0d: RadioGroup takes the FILL sizing nature on every platform, as its iOS list section already did: it fills its parent's width, so a `row` group wraps its options inside it instead of growing to their combined width and running past its container (the Radio page's card example scrolled a phone-width page sideways). A two-column DescriptionList's value now shrinks and wraps beside its Update link, so a long id or email no longer runs past a narrow card on the web or natively. The docs' Do and Don't frames lay each example out in a definite-width column, the Playground's layout, so paragraphs and wrapping rows fit a phone; a Don't that demonstrates overflow is clipped at its frame, and a new phone-width pass keeps every docs page from scrolling sideways at 390px.
- e07d5ee: Radio on iOS is now a checkmark list, since iOS has no radio button: each option's label leads and the chosen option carries a trailing check in the brand color, and a RadioGroup's plain options form one inset-grouped section (44 pt rows, 16 pt insets, an inset hairline between two rows, the 26 pt continuous corner of the kit's iOS lists) that fills its parent and is a content-layer pane under glass. `card` options stay tiles and mark the choice with the same trailing check, and on iOS the list stays vertical when the group asks for a `row`. The web and Android keep the ring and dot, and the role is `radio` everywhere. RadioGroup is now built per platform from the Radio skin (it is exported from the same entry as Radio, with no change to its props), and the docs three-up shows its iOS and Android builds.
- 05cc5f0: The CSS hand-off's corner radii now match the components on every platform. Several `--p-*` radius properties had drifted from the skins they transcribe: on iOS the select, autocomplete and one-time-code fields now read 8 (the iOS field radius), the badge, tooltip, action-sheet card top and sidebar toggle declare their own iOS corners, and the swatch no longer overrides the web corners; on the web the segmented control, accordion card, drag handle, Tabs and TabBar capsules take the values the components draw; on Android the accordion card, command palette, data table, Tabs and TabBar declare the corners they previously inherited from the web.
- a2f2057: The liquid glass motion is gone. Every selection control (Tabs, TabBar, Sidebar, Navbar, Pagination, Calendar, Carousel, Switch, Slider and the ButtonGroup segment) paints its selected state in place: a static control-layer pane under glass (the brand puck for the Pagination page and the Calendar day, the skin's tint elsewhere) and the skin's own fill in solid mode, with no travelling surface. Every anchored popup (Dropdown and through it AvatarMenu and the collapsed Navbar menu, Select, Autocomplete, PhoneInput, Popover, RowMenu, Command, the split ButtonGroup, the Calendar peek and hover card) opens as a dense or functional glass card beside a trigger that stays painted; there is no droplet, no hand-off, no cover and no spring-back, and the Autocomplete's query echo is gone with them. Dialog, AlertDialog and the anchored cards appear in place: `Entrance` is a readiness hold with no spring and no longer takes `anchor` or `anchorBottom`; `AnchoredOverlay` no longer takes the internal `handoff` prop. The Backdrop organism (`Backdrop`, `Backdrop.Particles`, `Backdrop.Gradient`, `Backdrop.Shader`, `Backdrop.Custom`, `BackdropHost`) is removed together with the `@shopify/react-native-skia` optional peer it probed for; the owner ruled this non-breaking, as the kit has no consumers of it, and it ships under this patch. `GlassSurface` no longer takes a `hostRef`. Functional motion stays: the Spinner, the Skeleton shimmer, the indeterminate Progress sweep and the InputOTP caret on the loop primitive, the floating labels, the Accordion, Collapsible and Reveal transitions, the Drawer and ActionSheet slides and the Sidebar drill-down. Why: react-native-web's Animated JS driver commits through React every frame and React never expires a Suspense retry, so the sidebar pill's spring held every component page's body back 1.3 s per click; the animations were judged not worth that and removed rather than re-engineered. The whole-kit bundle shrinks from about 212 KB to 204 KB gzip, a Button consumer from 10.3 KB to 8.7 KB.
- ba644ea: Remove a stray copy of an old platform CSS hand-off (`ebp`) from the repository root. It was never part of the published package.
- 148b27d: The last status colors move onto the theme's roles through `statusColors`: every menu (the web Dropdown and every RowMenu, which painted a fixed palette red) draws a destructive row in the `destructive-text` role like the native Dropdowns already did, an ActionPanel's danger title takes the same error ink, a Stats or breakdown delta reads in the success color or the error ink, and the charts' status marks (the success and destructive bars and series, the waterfall's rises and falls, the status strip, the Gauge, ProgressRing and Sparkline tones) take the solid status colors, with MetricBreakdown's rate readout in the tone's ink. The CSS hand-off's `--p-menu-destructive`, `--panel-danger`, `--delta-up` and `--delta-down` now reference those roles instead of holding fixed values, so they follow the palette and any override. No prop changes.
- 9ac77b3: The text-entry end-to-end checks hold every web field under glass to Dark Factory's clear well (its own tint and hairline, no blur) instead of the removed lens filter. Test fixtures only; the package itself does not change.
- 19dbdca: Keyboard focus rings take the palette's `ring` colour and sit 2px off the control: the kit's `Pressable` hands the colour and offset to the browser's own ring (Chromium paints it; Firefox and Safari keep their own ring colour unless the page loads `styles/canvas.css`, whose new `:focus-visible` rule draws a solid 2px `--ring` ring everywhere). Controls that hid the ring without painting a focus state of their own now show it: the Accordion and Collapsible headers (drawn inside the header when the group sits in a card or the iOS inset group), the Calendar's day cells, chevrons and event blocks, the iOS-skin Pagination, Tabs, Navbar and Sidebar rows, and the drag handle.
- 94ba6d8: The web and iOS Toast take Dark Factory's toast pill: the deep `inverse` fill in every palette and scheme, a pill with no description (a long message wraps inside the capsule) and the sheet corner once a description sits under the message, a bold 12.5 px message in the pill's ink, and Dark Factory's toast shadow. The description, action and dismiss take the inks the Android snackbar uses on the same fill, and the intent glyphs the dark scheme's status inks, so every part reads on the pill; iOS keeps its 44 pt touch targets. Android keeps the Material 3 snackbar. `toast({ destructive: true })` from `useToast()` now shows the destructive intent; the provider used to drop it.

## 3.0.2

### Patch Changes

- 42ed633: Under the glass hand-off every anchored popup now rests OVER its trigger the way the iOS 26 menu rests over its button: the trigger vanishes whole into a compact droplet hanging under its box, the pane blooms up out of it over the spot the trigger held and settles there, its near edge on the trigger's near edge, and the trigger stays hidden until the close hands back. The droplet's seed is now the hanging drop exactly (the pane travels by its centre through it), on every owner: Dropdown and through it AvatarMenu and the collapsed Navbar menu, RowMenu, the triggered Popover, the split ButtonGroup, Command in trigger mode, and the field popups Autocomplete, Select and PhoneInput. The Autocomplete echoes the field's line at the top of its list (the query, the value or the placeholder, and the chevron) so what you type stays in view while the list covers the field; the editor keeps focus underneath, a press on the echo refocuses it and its chevron closes the list. A field's close keeps its deflation onto the box (its near edge held, the pane pinching to the droplet and re-widening into the box) and the field returns whole at the snap; a pill's close is unchanged. The open-state border of a covered field is not painted while the list rests over it. Solid mode, Reduce Motion and the inline fallback keep the gap under the trigger, where the trigger stays visible beside its popup.
- 06e5761: The liquid popup's dismiss now springs back up into its button the way the iOS 26 menu's does, checked on the real Dropdown docs page against the recorded reference: the pane's body flies back to the pill by its centre on a soft spring at the reference's pace (a quarter of the way at +99, half at +132, home by +300) instead of collapsing under the button and hopping onto it, narrowing to a drop that sinks into the pill's underside and vanishes there; the pill re-forms under the drop as a short fat oval on the travel itself (its step and its scale flip on the same native frame, so iOS no longer shows the pill whole for a frame), from a mark above the seed that only a close reads (a `closing` flag on the hand-off channel); its label fades back at full size over the pill while the last of the drop is still settling; and the dismissed rows retire as legible blurred ghosts through the pane's contraction. The other menu triggers (AvatarMenu, the Navbar hamburger, RowMenu, Popover, the split ButtonGroup, Command) take the same close; the field popups keep their absorb onto the box, now on the same pace.

## 3.0.1

### Patch Changes

- fabbaef: Bring the liquid popup's opening and dismiss onto the iOS 26 menu's frames, checked on the real docs pages against the recorded reference: the droplet hangs from the trigger's far edge with the pill's tone and a whole rim, its rows blurred and sharpening on their own clock (the blur is now a CSS filter string, which react-native-web applies; the object list was dropped on the web), the rows scale outside the scrollport so the first row is no longer clipped at birth, the pane grows as a capsule and relaxes to its corner only once it is full, and a dismiss ghosts the rows on its first frame, contracts the pane about its centre, goes sheer, narrows to a drop hanging under the trigger, re-forms the trigger's material as a small growing body above it and slides the drop onto the box before the label fades back over the merged glass. A Button, an Avatar or an AvatarMenu capsule that is the pill now fades its own foreground, so the owner's fader never sits over its material.

## 3.0.0

### Major Changes

- 7454886: A component never dictates its own width: the input-like controls are FILL and the
  parent layout container provides the bounds.

  Breaking. Input, Textarea, Select, Autocomplete, Listbox, Slider, and Progress no longer
  render at a fixed 320px (240 `narrow`, 480 `wide`); they fill the parent they are given
  (`width: 100%` plus the row-sharing pair, `src/style/sizing.ts`). The `block`, `narrow`,
  `wide`, and `fit` props are removed from those seven components, `useFieldWidth`,
  `FieldWidthProps`, and the `fieldWidths` tokens (`--field-*` in the CSS hand-off) are
  gone, and their `style` prop is now `LayoutStyle`: `ViewStyle` without `width`,
  `minWidth`, `maxWidth`, `flex`, `flexBasis`, `flexGrow`, `flexShrink`, and `alignSelf`,
  so a width shim at the call site is a type error. Form's two-column threshold moves from
  the 480px field width to the `lg` step of the width scale (512).

  Migration:

  - A bare field that used to be 320 wide now fills its column. Where the old measure was
    the point, wrap the field in a Container step: `<Container xs>` is the old default
    (320), `<Container lg>` the old `wide` (512 for 480), and `<Container sm>` (384) or a
    Row `span={n}` cover the rest. `narrow` (240) has no step: give the field a Row span.
  - Drop `block`: filling the container is now the only behaviour.
  - `fit` (a Select hugging its value) is a bare `<Column>` inside a `<Row>` (Bootstrap
    `.col-auto`): `<Row><Column><Select … /></Column></Row>`.
  - `style={{ maxWidth: … }}` / `style={{ width: … }}` on a field: move the bound to the
    parent (`Container`, `Column span`) and delete the style.
  - A field inside a bare Column inside a Row collapses to its content (it always did; the
    fixed width hid it). Give that Column `span={n}` or `fill`; `useFillStyle` warns in
    development when it sees the case.

  Also in this release: every non-layout component's `style` prop is `LayoutStyle` (the
  sizing keys are a type error; Row, Column, Grid, Container, the shells, and the floating
  overlays keep `StyleProp<ViewStyle>` because they are the bounds providers); Card, Feed,
  StackedList, ActionPanel, Skeleton, Sparkline, every SVG chart root, and the Calendar
  containers are FILL with no cap of their own (Alert loses `narrow`/`wide`/`block`,
  Sparkline its intrinsic 120px, the Calendar timelines their desktop widths); Skeleton
  text lines take `long` / `short` instead of a width; the width scale gains the `xxxs`
  (192) and `xxs` (256) tile steps; and the docs generator rejects `width` / `maxWidth` /
  `minWidth` in a `style` on any non-layout tag, so the showcase composes bounds with
  `Container`, Row `span`, and `Grid`.

  `Container` conforms to its parent by default: no cap and full width unless a step is
  named (`page` is now an explicit step, not the default). MediaObject, DescriptionList,
  EmptyState, Collapsible, Accordion, Form, Field, Stats, and DataTable are FILL too, and
  the docs examples render every component at the width its parent gives it; a Container
  step appears in a fence only where the measure is the lesson.

### Minor Changes

- 8998a7e: Add the clear material option to GlassSurface and GlassPane, preserving edge refraction with a lighter tint and minimal blur. This new reusable material capability justifies a minor release.

  Use the clear grade for web Input, Textarea, Autocomplete, InputOTP, Stepper, PhoneInput, and DataTable editors in glass mode. Preserve native field materials, solid and accessibility fallbacks, and normal focus, selection, and text editing. Fields have no click ripple or typing animation.

  Paint grouped focus and error borders above the refractive material so they stay crisp, and align flush Textarea material corners with its editor.

- 86416cb: `DataTable` takes `attached`: the header band squares its corners to a frame the parent draws.

  Minor because it adds a public option. On the web skin the header is Riskora's soft
  10px-cornered band, which is the look of a table standing on its own (the design floats
  it inside a padded card). A table flush inside a frame, a `flush` Card or a bordered panel
  that clips to its corners, now passes `attached`, and the band drops its own corners so
  the frame's clipped corners are the only rounded ones; before, the frame's fill peeked
  out under the band's bottom corners. `bordered` squares the band the same way for the
  table's own outline. iOS and Android bands were square already, so nothing changes there.

  ```tsx
  <Card flat flush style={{ overflow: "hidden" }}>
    <DataTable attached columns={columns} rows={rows} />
  </Card>
  ```

  The docs use it on every prop table, and the docs playground is now a fully rounded
  card sitting a gap above its source block in every example and at every simulated tier,
  instead of squaring its bottom edge into the code block.

- 71216c7: Draw the iOS field family to the iOS input-field reference, and give Input the
  password toggle and the clear button.

  Minor because it adds public capability: `Input` gains `passwordToggle` (a trailing
  eye that reveals and re-masks a `secureTextEntry` value, announced as "Show
  password" / "Hide password"), `clearable` (a trailing circled-x that empties the
  field while it holds text, in both the controlled and uncontrolled mode), and its
  `icon` now accepts ANY Canvas glyph name (`IconName`: phone, calendar, creditCard,
  mapPin, ... instead of six hard-coded names); `SelectOption` gains `leading`, a short
  glyph (a flag emoji, a currency sign) shown before the label in the trigger and in
  the option rows; and the token set gains `field-border`.

  The iOS skins of Input, Textarea, Select, Autocomplete, InputOTP and Field now follow
  the "iOS Mobile Input Fields" design (light and dark): a white `card` box, an 8pt
  corner (`shape.ios.field` is now 8, was 10), a 16pt value, a 14pt regular
  `muted-foreground` title 8 above the box, a 20px leading glyph, a boxed muted prefix
  or suffix addon with a divider (was inline affix text), a gray ▾ select caret (was the
  brand ⇅), and three states: focus tints the border, the glyph and the caret to the
  brand `ring`/`primary`; error tints the border and the glyph `destructive` and washes
  the box with a red-50 fill (`fieldErrorFill`, derived from `card` + `destructive`);
  rest paints the new `field-border` hairline.

  DISCLOSED ACCESSIBILITY TRADE-OFF. `field-border` (gray-300 `#d1d5db` light, systemGray4
  `#3a3a3c` dark) is about 1.5:1 against the field's own fill, BELOW the 3:1 WCAG 1.4.11
  boundary that the `input` token is held to. It is read only for the RESTING state of
  the iOS field skins (through `fieldBorder` in `src/style/field-colors.ts`, which falls
  back to `input` for a token map that omits it); the web and Android skins keep `input`,
  and the focus and error borders keep their full-strength tokens on every platform. The
  choice was made deliberately on 2026-09-16 so the iOS fields read as the iOS reference.

- 97b7c18: Layer the glass model: under glass EVERY surface renders through the material, each
  on the layer it belongs to, and the option lists, alert dialogs, toasts and tooltips
  take the densest tint instead of opting out.

  Minor because it adds public capability: `GlassSurface` gains `layer` ("functional"
  | "content" | "control" | "dense", the under-fill it paints beneath the material) and
  `brand` (a brand-tinted puck: the colour as the under-fill, solved by `brandTint` to
  stay as sheer as its ink's WCAG 4.5:1 allows, or the GlassView's own `tintColor` on
  iOS 26); the kit exports `GlassPane` (the material as a sibling BEHIND a node that
  owns its own interaction or semantics, with `paneStyle` and `PANE_SIBLING_INPUT`),
  `innerFill` / `withInnerFill` / `isGlass` / `inverseDenseTint` (`src/style/glass-fill`),
  the WCAG helpers `channelsOf`, `composite`, `relativeLuminance`, `contrastRatio` and
  `inkOn` (`src/style/color`), `HUE_WASH`, and three glass tokens beside `glass-tint`:
  `glass-tint-content`, `glass-tint-control` and `glass-tint-dense` (`--glass-tint-*` in
  the CSS hand-off). `AnchoredOverlay` gains `dense`; `opaque` remains for a consumer
  that wants the plain box and wins when both are passed.

  What a glass app looks like now, by layer:

  - FUNCTIONAL (sheer): Navbar, TabBar, Sidebar, Dialog, ActionSheet, Popover,
    Command, the calendar peek, a Tabs track, and the Drawer panel, which was the one
    overlay that painted an opaque card before.
  - CONTENT (denser, legible first): Card, DataTable, the lists, feeds, stats,
    description lists, grid-list tiles, board columns, calendars, code blocks,
    carousels, alerts, empty states, every chart, the bordered FilterPanel, the Skeleton
    card. A selected Card and a toned Alert pass their tint.
  - CONTROL (the bright puck): the field boxes (Input, Textarea, Select, Autocomplete,
    PhoneInput, Stepper, InputOTP), Button, Tabs pills, Pagination cells, Chip, Badge,
    Kbd, Switch tracks, Checkbox boxes, Radio rings and cards, Progress rails, Steps
    circles. A brand fill (a primary or destructive Button, a checked Switch or
    Checkbox, a selected tab, page, day or step) is brand-tinted glass with the intent's
    foreground on top; a hue wash (a status Badge, a coloured Chip) is the hue's mid
    step with the label one step deeper (800 in light, 300 in dark) so every palette
    hue holds 4.5:1 over the page, a content pane and a control puck; a control with no
    surface of its own (a ghost or link Button) stays bare.
  - DENSE (the densest tint): Dropdown, Select, Autocomplete, RowMenu, the SplitButton
    overflow, the PhoneInput country list, AvatarMenu, AlertDialog, Toast, Tooltip and
    the chart value flag. The inverse ones (the Tooltip bubble, the M3 snackbar) tint
    with the ink so their inverse text keeps its contrast.

  Fills inside a surface (a hovered or selected row, a header band, a stripe, a code
  pill, a Skeleton placeholder) become ink tints under glass; a state border (a focus
  ring, an error edge, an open trigger) stays over the pane while the resting hairline
  drops and the material's rim is the edge. Solid mode is untouched: every one of these
  renders the same tree it did before, and under Reduce Transparency or Increase
  Contrast every layer degrades to its opaque token.

  The named-import size budgets move (Button 8,704B, Input 39,936B, DataTable 46,080B
  gzip): a control is a glass surface now, so importing one carries the material stack
  a consumer used to pay for only with an overlay or a bar.

- 8f85af0: Add the `static` material option to shared GlassSurface and GlassPane primitives, separating a surface's material role from its readability density. Static surfaces use frost and functional surfaces use the available native liquid material or browser lens.

  Preserve live child state, focus, caret and layout when switching glass and solid. Resolve unsupported native targets and accessibility preferences to the complete solid skin, coordinate foreground and state fills with actual material capability, and release browser lens definitions when their last owner stops using glass.

  The minor release adds the public static material capability without changing component APIs or platform defaults.

- 7bfa999: The measure axis on components: the Container steps, on the field or button itself.

  Minor because it adds public API. `MeasureProps` (`src/style/sizing.ts`) is the boolean
  step axis `Container` already reads (`xxxs` 192, `xxs` 256, `xs` 320, `sm` 384, `md` 448,
  `lg` 512, `xl` 576, `xxl` 672, `xxxl` 768, `wide` 896, `wider` 1024, `widest` 1152, `page`
  1280, plus `start`), and eleven components now carry it: Input, Textarea, Select,
  Autocomplete, Listbox, Slider, Progress, Field, Form, Button, and ButtonGroup. So a short
  field or a call-to-action names its own measure without a wrapper:

  ```tsx
  <Autocomplete xs start options={people} />
  <Button md>Continue</Button>
  ```

  A step is not a width of the component's own. It is the FILL nature capped at that step
  of the shared width scale (`maxWidth`), so below the step the component still fills the
  parent it is given, exactly as `<Container xs>` around it would; without a step nothing
  changes (a field fills its parent, a button hugs its label). The grammar and the
  precedence are Container's: narrowest step wins when several are passed, a step centers
  the box in its column, `start` pins it to the leading edge. Two rules the component
  adds because it is not a layout container: inside a Row only the cap applies (there
  `alignSelf` is the cross axis and would pin a field to the top of the row, so the Row's
  own alignment places the box), and on Button and ButtonGroup a step wins over `block`
  (the segmented and spaced kinds flex their segments to equal shares under a step as they
  do under `block`; split and stepper ignore both with the same dev-only warning).
  `ContainerProps` extends `MeasureProps`, `stepOf` is the shared precedence, and
  `useFillStyle` / `useSizing` take the component's props so a new adopter is one line.

  Also: the design hand-off parity records for the field widths the layout tier removed
  (`narrow`, `wide`, `block` on Input, Select, Textarea, Autocomplete, Slider, and Alert),
  which the check had been failing on.

- 8a0f3c2: Add explicit `OverlayProvider viewport`, `viewportInsets`, and `separateWindow` options for bounded nested panels, measured header/footer occlusions, and custom native Modal windows. This minor adds public hosting capabilities: content-sized hosts inherit measured window bounds, while native-window hosts start a separate coordinate boundary.

  Fit anchored cards above or below their triggers and scroll long content inside the available height. Track resized Android root hosts and iOS keyboard frames, preserve trigger hierarchy while hosted menus open, and exclude touch-dismiss backdrops from keyboard and screen-reader focus. Keep option-list refs and keyboard navigation intact. Preserve Command's search and footer while scrolling results, fit its width to narrow hosts, and focus cards after placement is committed.

  Keep pinned-open cards attached to offscreen triggers. Aim the solid iOS Popover pointer using the rendered card width and trigger center, reserve its protrusion, and clamp wide trigger-matched cards to their host.

- e8e30f1: Add an optional accessibilityLabel to Select and Command so applications can name their purpose independently of visible labels or search prompts. Associate each control with its named result list. Select announces required fields without applying unsupported required metadata to a button. Command preserves the unhighlighted state and never points assistive technology at a nonexistent active option.

  This minor release adds the public accessibilityLabel option to both controls.

- 8f85af0: Add the optional Android capture renderer @ionizeio/canvas-blur and the Canvas integration for Android 12 or newer. This minor release adds a native material capability without requiring the new package for existing Canvas consumers. The module starts at 0.1.0 and uses Expo SDK 57 native APIs.
- c78c2b7: Run every looping animation on the native driver on iOS and Android, and add the cycle shapers that make that possible.

  New public API: `thereAndBack(easing)`, `holdThen(hold, easing)` and `keyframes(points)` in the motion helpers turn one `Animated.timing` into an out-and-back pulse, a hold followed by a sweep, or a keyframed schedule, so a loop can be a single native timing (React Native refuses an `Animated.sequence` inside a native loop and `Animated.delay` hardcodes the JS driver).

  The Backdrop clock, Spinner, the indeterminate Progress sweep, the Skeleton shimmer and the InputOTP caret now pass `useNativeDriver: supportsNativeDriver` (native off-thread, the JS driver on web). Under the New Architecture a JS-driven frame is a Fabric shadow-tree commit per animated view whose cost scales with the whole tree, so the JS-driven Backdrop alone saturated the JS thread of an idle screen (150% CPU and rAF near 3 frames per second on the iPhone 17 Pro simulator); natively driven it idles at a few percent with rAF at 60 frames per second. The Backdrop clock resumes a stopped flight from its wall-clock phase, since a natively driven value cannot report its position to JS. The channel shapes (a linear flight, an out-and-back twinkle and breath, a parked-then-sweep event) are unchanged.

- e629aaa: Add `PhoneInput`, a phone number field with a country segment.

  Minor because it ships a new component. `PhoneInput` is the Input's grouped box with a
  country segment at its start (the chosen country's flag and a caret that open a list of
  countries showing their flag, name and dial code) and that country's dial code inline
  before the number, which is typed on the phone keypad. The number (`value` /
  `defaultValue` / `onChangeText`) and the country (`country` / `defaultCountry` /
  `onCountryChange`, ISO alpha-2 codes) are each controlled or self-managed; the segment
  picks from the kit's curated, alphabetical `PHONE_COUNTRIES` list (66 countries with their
  ITU dial codes, exported with `flagOf` for the emoji flag of a code) or from a `countries`
  list of your own; `label`, `required`, `error`, `disabled`, `readOnly`, `small`/`large`
  and the measure axis work as on Input, and `Field` delegates its label, required mark and
  error into it. Each platform draws it with its own Input and Select skins (the box and
  the list), so on iOS it is the iOS input-field reference's phone field: the white box, a
  flag-and-caret segment whose divider takes the field's state colour, the dial code in
  the placeholder gray.

- 18ec75f: Add the optional `primary-text` color token so consumers can customize brand text separately from primary fills and their foreground labels. This new theme customization capability justifies the minor release. Built-in primary text now stays readable on the kit's neutral and layered tonal surfaces in both schemes, including Android selected tab pills and today's date within a Web Calendar range. Primary fills, standalone icon accents and filled-control foregrounds retain their colors.

  Existing complete `ColorTokens` literals remain valid. `ThemeProvider` preserves primary-only rebrands by using that override for text unless `primary-text` is also supplied. Custom brand contrast remains the consumer's responsibility. Raw CSS handoff rebrands must also set `--primary-text`; `--primary-text: var(--primary)` restores their previous text-color behavior. Nested providers retain their existing independent token and scheme resolution.

  Correct the Web ActionSheet CSS action and Cancel label aliases to match the existing neutral foreground used by its RN skin.

  The default text contrast checks cover solid and tonal surfaces. Glass materials depend on the content behind them and need verification in the rendered app.

- 1fc75ba: Rebrand the kit's foundation to the Riskora Dashboard UI Kit (Figma file
  `YLbmaRirWTzivAzXirDTmX`): the colour tokens, the type scale, the elevation ladder, and a
  new shape token set. This is the first of the phases that restyle the web look to that kit;
  iOS and Android keep their HIG / Material 3 shapes and take only the brand.

  Minor because it adds public API:

  - `ThemeProvider` gains a `fonts` prop (`ThemeFonts`: a `sans` and a `mono` entry, each one
    family name or a map from weight to the face registered for it), and the kit's `Text` and
    `TextInput` primitives now apply the registered face to every kit label. Omit it and the kit
    renders in the system face as before. `typeface` names the brand faces (Urbanist, Geist Mono);
    `resolveFontFace` / `fontStyle` are exported for custom text nodes.
  - `shape` (`ShapeTokens` per `PlatformKey`): the corner radii a platform's skins share
    (`control`, `field`, `card`, `dialog`, `menu`, `sheet`, `checkbox`, `pill`), mirrored as
    `--radius-field`, `--radius-dialog`, `--radius-menu`, `--radius-sheet`, `--radius-checkbox`
    in `styles/tokens/radius.css`. The web column is the Riskora shape (12 / 12 / 20 / 16 / 16 /
    30 / 6 / pill).

  Token changes (both schemes, CSS and JS): a sky/400 `primary` (`#3da3f5` light, `#68cdff`
  dark) whose label is the dark ink in both schemes (white-on-sky is 2.7:1), a charcoal-and-white
  neutral family on one hue (page `#f8fafe` / `#111213`, card `#ffffff` / `#18191c`, ink
  `#0d121b` / `#ffffff`, panel `#f6f7f8` / `#212327`), red/700 / green/800 / orange/800 status
  fills that carry white text, a re-seeded chart series (sky first, the bar-highlight orange
  second), and the sky family on the brand orbs (the `orb-*` keys are unchanged). Every pair is
  solved to the kit's contrast floors where the source falls short; `tools/figma/riskora-variables.json`
  vendors the source variables and the new `bun run check-figma` gate fails on drift or on a
  token without provenance. The Claude-Design render-parity leg (`check-render`,
  `tools/render-parity/`) is retired in its favour.

  Type: the Typography roles are the Riskora ladder in Urbanist, titles at the regular weight
  (display 64/70, h1 55/64, h2 40/48, h3 36/44, h4 28/36, h5 20/30, lead 20/30, body 16/24,
  small 14/20, tiny 12/16, caption 12/16 medium uppercase), and the `fontSize` scale gains a
  `7xl` step. Elevation: an ambient ladder in the ink with no offset (`0 0 20px` at 6% for the
  standard shade, `0 1px 2px` at 4% for `sm`), mirrored in `styles/tokens/shadows.css` and the
  `--p-*` transcriptions.

- 5a23745: Add a runnable independent Expo starter for web, iOS, and Android with published-package installation, workspace editing, controlled input selection, session preferences, and native overlay composition. This minor adds the user-visible starter capability and its setup guide without changing existing component APIs.
- af0419f: `Tabs` takes `wrap`: a row longer than its container lays out on further lines inside
  one track instead of panning in the overflow scroller, so every tab is on screen at once.

  Minor because it adds a public option. The capsule track (iOS and web) squares its
  corners off to the radius concentric with its pills when it wraps, since a capsule's
  9999 on a track taller than one pill would round its ends into semicircles across the
  corner pills; the Material 3 pills track does the same, and its underline tabs stack
  their lines on the one divider. `block` never overflows and wins over `wrap`; a
  `responsive` vertical rail honors `wrap` once it flattens. The docs example rail wraps
  at phone and tablet widths now, where the scroller used to show only the first few
  example labels with no scrollbar to say the rest were there.

- a8376cb: Add typed public React refs to Button, Select, Checkbox, Switch, Radio, and Slider. This minor release adds a public capability: consumers can access each control's interactive React Native host for focus, blur, and measurement, using object or callback refs. Select retains overlay measurement and Radio retains group focus navigation. Native focus delegates to the host and remains separate from accessibility focus. Document the actual inferred ref types in component API tables.

  Fix Space activation for Checkbox, Switch, and Radio on web, including key release, disabled and composition guards, and cancellation when focus leaves the control. Preserve Enter and pointer activation without duplicate callback ownership.

- 411410a: Add the layout tier that gives every component its width from its parent: a shared
  width scale, the sizing natures, and (in the same release) the `Container` atom and
  Row/Column twelfth spans.

  Minor because it adds public API: the `widths` token scale (`xs` 320 .. `page` 1280,
  Tailwind's `max-w` values copied by hand, no dependency) mirrored as `--width-*` in the
  CSS hand-off, and `src/style/sizing.ts` with the two sizing natures every component
  root now declares: `FILL` (`width: 100%` plus `flexShrink: 1` and `minWidth: 0`, so a
  field fills a Column, shares a Row with a hugging button, and splits a Row equally with
  another fill sibling) and HUG (`useHugStyle`, resolved against the nearest kit layout
  container because Yoga ignores `fit-content` against a stretching parent and a bare
  `alignSelf: flex-start` breaks cross-axis centering in Rows). `LayoutAxisProvider` /
  `useLayoutAxis` publish a container's axis, whether it stretches, and whether it is a
  content-sized cell; `useFillStyle` warns in development when a fill component sits in a
  bare Column inside a Row (the one layout that still collapses `width: 100%`). The
  `LayoutStyle` type (ViewStyle without the sizing keys) is the `style` a non-layout
  component accepts.

  The `Container` atom is the bounds provider (Bootstrap `.container` / `.container-fluid`):
  it spans its parent, caps at one step of the width scale (`xs` .. `page`, default `page`,
  `fluid` for no cap), centers itself (`start` pins it to the leading edge), and takes
  horizontal gutters from Row and Column's pad scale. Row children take `span={1..12}`
  (Bootstrap `.col-n`): the Row measures its own width and hands each spanning child a px
  cell with the gaps in the arithmetic (the DashboardGrid twelfths math, now shared as
  `spanWidth`), span rows wrap past twelve, and `stacks` ignores spans once stacked. Row,
  Column, Container, Grid cells, and DashboardGrid cells publish the layout-axis context.

### Patch Changes

- 5d74464: Retain full axe rule, node and check details in accessibility test attachments so failures show invalid attributes and measured contrast alongside concise summaries.
- fb0fbfd: Correct native smoke appearance validation to preserve Android's automatic mode
  and both writable custom subtypes. A shared parser rejects ambiguous or malformed
  output before device mutation, preventing an attempt with an unrestorable value.
  This is a tooling correction; product theme behavior is unchanged.
- 7b17d7a: Fit hosted overlays above the Android keyboard in full-screen edge-to-edge windows, where adjustResize leaves the root layout unchanged. Intersect native keyboard coordinates with measured bounds so legacy resized windows retain their existing geometry without subtracting the keyboard twice.
- 2b834a0: Preserve bounded passive Android CI host evidence around native smoke failures,
  including ADB executable identities, actual listener/process identities, resource
  samples and existing daemon-log tails. Capture failure state before appearance
  restoration while retaining the original test error, exit code or signal.

  This is a tooling observability correction. It does not change ADB lifecycle,
  trace settings, tool versions, build order or native test commands, and it does
  not retry failures or claim that the underlying transport disconnect is fixed.

- 005c8b8: Request native accessibility focus on the surviving Autocomplete input when an accessibility activation immediately closes its suggestions. Preserve text editing and keyboard state, and cancel stale requests after controlled-open refusal, disabling, detachment, reopening, or navigation. Add focused lifecycle and single-activation tests plus native acceptance scenarios.
- a22ca22: `Backdrop.Custom` layers can read the surface box they are laid out against:
  `useBackdropBox()` returns the surface's measured width and height and the scene's
  focus point (null outside a surface). The engine's own particle and gradient layers
  were already laid out against that box; a custom layer could only read the window,
  which put a scene's bespoke art off the visible area whenever the surface was smaller
  than the screen (a documentation stage, a card, a harness column). No change for scenes
  that keep reading the window.
- b25de07: Run the Backdrop and the Skeleton shimmer as compositor CSS animations on the web.
  react-native-web has no native animated module, so a looping `Animated.View` there
  re-renders through React on every animation frame: the docs sky cost one React commit
  and about forty inline style writes per frame at idle, enough to saturate the main
  thread in an unthrottled browser and starve a Suspense retry. A new loop primitive
  (`createLoopChannel`, `LoopView`) binds opacity and transform to a shared periodic
  channel through `inputRange` / `outputRange` tracks with a phase offset, rendering the
  natively driven interpolation graph on iOS and Android and a react-native-web
  `animationKeyframes` animation on the web, with the phase carried in the animation
  delay so a remounted surface continues mid-flight. The Backdrop clock's channels are
  now `LoopChannel`s (bind bespoke `Backdrop.Custom` art through `LoopView` rather than
  through `Animated.interpolate`), the SVG renderer nests twinkle buckets inside their
  layer, and the Skeleton shares one shimmer channel across every placeholder on screen.
- 98043d0: Validate focused keyboard journeys in Chromium, Firefox, and WebKit, plus mobile touch selection and nested Drawer menus in Chromium and WebKit, against the same docs artifact used by release validation.
- 4c97f02: Give the glass ButtonGroup selection a droplet stretch, squash, and settling wobble when switching segments. Keep native materials intact with React Native layout animation and snap to the selected segment under Reduce Motion.
- ef537ee: Make all ButtonGroup variants follow the Liquid Glass theme using Canvas's shared
  platform material. Segmented selection moves with a measured React Native spring,
  while split, stepper and spaced groups gain glass surfaces. Preserve native iOS
  and Android rendering, solid skins, press feedback and accessibility fallbacks.
- 62b844b: Expose selected Calendar day buttons as pressed on web while retaining the native selected trait, including date-range endpoints.
- 0773edd: Wait for the measured Carousel scrollport before checking real keyboard Tab entry in the browser regression test. Preserve all focus, paging, geometry and accessibility assertions. This corrects the test's initialization precondition without changing component behavior.
- 8f85af0: Resolve chart frames as stable glass with complete opaque capability and
  accessibility fallbacks, including the shared LineChart, AreaChart and
  ComposedChart frame. Preserve plain and intrinsic frameless charts, share dense
  inspection material with Heatmap, and keep MetricBreakdown's latest-value
  caption outside its plot so it needs no opaque patch over the data.
- f672ff9: Remove the repaired component accessibility exceptions. Every component page now uses the same serious/critical violation gate, with raw diagnostic evidence retained for failures.
- 72d6d66: Align field material regression coverage with the clear tint and complete synthetic pointer event lifecycles so text selection and press feedback remain isolated across the test suite.
- 9c78e8b: Form the hand-off droplet as a compact drop centred on the trigger, never wider than about half the card: a field that fills its column now vanishes into a drop the way the iOS 26 menu's button does, instead of a bar the field's full width, and a close re-widens the drop into the trigger's box before handing back.
- dd37f0b: Stabilize compiler verification by separating cold TypeScript setup from prop assertions and checking native watch rebuilds in the same process boundary used by development.
- 3a1561f: Correct the color stylesheet's provenance comment to reference the maintained native tokens and contrast contract.
- 8f85af0: Dismiss overlay Dialog and AlertDialog presentations with Android Back through their cancellation policy, preserving nested overlay ordering and contained catalogue panels. Give the shared material lifecycle fixture a viewport overlay host so scrolled dialogs stay visible and same-window glass has a safe capture target.
- 1c23758: Generalize internal liquid selection motion to both axes and add an explicitly activated popup material lifecycle. Preserve foreground hosts, focus readiness, nested dismissal ownership and reopening order. Fix the existing ButtonGroup solid-to-glass measurement gap. Public popup components retain their existing activation policy in this foundation release.
- 4188cf9: Make native docs preview links apply their explicit light/dark and solid/glass
  choices when the app is already running. Seed native launch appearance from the
  actual incoming URL, while preserving manual theme choices during ordinary
  in-app navigation and when an external link omits an appearance axis.
  Keep native status-bar icons legible through Expo's app-wide status-bar API,
  matching the docs' existing native configuration on both iOS and Android.
- 64dc87e: Restore accessible heading levels throughout the shared documentation layouts, including component references, guides, patterns, templates, and the home page. Give the component catalog its own visible page heading while preserving the existing heading typography.
- 4188cf9: Keep native documentation header titles readable when the preview appearance differs from the device appearance.
- 3397d37: Give the docs' animated background broader color bands through the content area
  and richer colors so glass surfaces have visible detail to blur and refract.
  Retain the same three animation layers, timing, hero and accessibility fallbacks.
- 64dc87e: Focus the documentation search input when its native Modal is shown, preserving the opener as the return target when search closes. Expose the desktop search trigger as a button without changing its appearance.
- 64dc87e: Expose the mobile documentation header and primary tabs as banner and navigation landmarks. Enforce document heading, landmark, and scroll-region accessibility separately from component WCAG checks, and remove the obsolete global scroll-focus exception.
- 0c998d1: Replace the docs' site-wide lattice background with quiet spectral currents while
  preserving the existing homepage hero. Shared SVG artwork follows the Backdrop
  clock through LoopView on web, iOS and Android, with independent ribbon motion,
  light and dark palettes, and accessibility fallbacks. Add a tuning fixture for
  the new scene and retain the lattice as a separate assembly demonstration.
- 9f9d68a: Split the docs web export: one chunk per route and one per component's examples and
  prop tables, so a component page ships its own docs instead of every component's. A
  hosted Backdrop ships only its floor in server markup; the star field lands after
  hydration instead of being drawn at zero size into every pre-rendered page.
- 01f23a4: Pre-render every docs page (the web export is static) so a page paints its content
  before its bundle runs, with the bundle fetched early and executed after the first
  contentful paint. Each page carries its own title and canonical link. Two kit changes
  make server rendering faithful: the glass material resolves to frost for a server
  render and the hydration render (the Chromium lens lands in the commit after), and a
  hosted Backdrop paints its surface inline in server markup until the host takes the
  claim after hydration, so a pre-rendered page ships its floor.
- a4ad0ec: The docs ship their seven Urbanist and Geist Mono faces cut down to the glyphs the
  docs can show, about 140 KB over the wire for all seven against 245 KB, since every
  one of them is preloaded ahead of the first paint.
- aa39bbd: Dropdown-class triggers hand off to their menu under glass: the outline button, the AvatarMenu capsule and the collapsed Navbar hamburger give their glass pill to the menu's material as it blooms on the pill's frame, and the menu shrinks back to re-form the pill before the label fades in on close, the way the iOS 26 menu behind a toolbar button opens and dismisses. One mechanism on the native Liquid Glass, the web lens and the frost; the field popups (Select, Autocomplete) keep their field visible and never hand off.
- 4256da8: Hand the Autocomplete, Select and PhoneInput fields' glass to their lists the way the Dropdown hands its pill to its menu: under glass the list pours out of the field's edge in the field's width, corner and tone, and on close absorbs back into the field's box, the field's text yielding only while the pane covers it, so a field that is typed into never vanishes. Solid mode and Reduce Motion keep the plain tree.
- 97965af: Correct focused and error floating-label contrast across the Material filled field family. Focused labels use the existing primary-text role; error labels and destructive action text use a separate destructive-text role while fills, indicators, icons and destructive-foreground remain unchanged. Android Textarea now uses the same opaque muted field surface as Input, Select and Autocomplete.

  The authored error-text colors protect the actual enabled capsule and pressed surfaces, including iOS ActionSheet's translucent neutral row and group opacity, beyond the four ordinary neutral surfaces. Fixed-red menus retain their independence from semantic theme overrides, with a darker existing palette step for light text.

  The optional token preserves old complete ColorTokens literals. A React Native destructive-only theme override keeps its existing text color; an explicit destructive-text overrides text independently. Raw CSS rebrands must also set --destructive-text; setting --destructive-text: var(--destructive) restores their legacy text rendering. This is an accessibility correction to existing components and states, released as a patch.

- 3bcc3ec: Make overflowing CodeBlock and DataTable content reachable by keyboard using the native ScrollView focus props. Add a tab stop only while content overflows, preserving ordinary arrow-key scrolling, table semantics, native touch scrolling, and code wrapping. Restore native and web heading semantics to token-reference page titles and sections.
- 8f85af0: Apply press and disabled feedback to control labels and icons while keeping their material stable. Preserve platform ripple, solid-mode feedback, semantic hosts and focused foreground state. Carry exact nested theme and accessibility settings through overlay portals without changing their safe native capture targets.
- de19a8a: Make overflowing Carousel viewports keyboard focusable and support Arrow, Home, and End navigation without taking keys from slide inputs. Give picker buttons valid current-slide semantics, visible focus and real platform-sized targets. Avoid duplicate requests for the current slide and silently clamp selection when items are removed. Preserve legacy custom-skin typing.
- 96f846d: Improve light glass message contrast using the existing popover foreground color for Dialog's built-in description and currency prefix, the web ActionSheet title and message, and the Android ActionSheet message. Preserve solid and dark styling, stronger title colors, the iOS ActionSheet's translucent foreground message, and each skin's typography, layout, actions and material.

  Use the default body text role in the custom Dialog examples and allow the three-action example to wrap on narrow screens.

- cc178b5: Grid tiles are equal-height and the grid spans its parent.

  The Grid root now carries the FILL nature (`width:"100%"`, sharing a Row with
  hugging siblings), so it reaches its parent's edges instead of measuring
  whatever width its own cells produced from the pre-measurement guess in a
  centering parent. Its cells stretch to the height of the row they wrapped
  onto, and a cell publishes the new `bounded` layout-axis fact
  (`GRID_CELL_AXIS` in `src/style/sizing.ts`), which a Card reads to grow to the
  row's height without `grow`: a row of cards shares a flush bottom edge however
  unevenly their content runs, CSS Grid's default `align-items: stretch`. A
  `GridItem` fills its cell the same way, so a wide hero card matches its
  neighbours. DashboardGrid cells publish the same fact, so a Card widget fills
  its tile without being asked; a field, a chart, or a hug component keeps its
  own height in either grid. Card's explicit `grow` is unchanged elsewhere.

- 98043d0: Track component interaction evidence by test declaration and input method, detect stale or missing registry entries, and distinguish browser checks from unrecorded native and screen reader verification.
- b43114e: Published under the `@ionizeio` scope. The GitHub org was renamed from
  `nannier-com` to `ionizeio` on 2026-09-15; the npm scope follows the same
  rename. `@nannier-com/canvas` is being deprecated in favor of this package.
- 34e2557: Preserve passive iOS native smoke build evidence that binds the embedded Hermes
  bundle to its pre-Hermes source and records the recognized compiled testing-route
  shape. Retain exact input/configuration hashes and unavailable observations without
  changing native build or navigation behavior. This is a tooling correction.
- 0edec27: Move the Calendar's selected day as one measured liquid surface under glass: it travels between the days of one month through the grid and along the week strip (a diagonal move stretches along both axes), while the numbers, event dots, today's tint and the pressed state stay fixed; a month, view, density or cell-size change re-measures and resets it in place instead of travelling between months. In `range` mode the start and end are independent surfaces (the start travels on a restart, the end appears in place on completion and withdraws on a restart, a one-day range keeps both on one cell). The day peek and the hover card open and close on the liquid popup material and stay mounted through their exits. Reduce Motion selects the final bounds at once; solid mode keeps the skin's own filled day.
- 18a79f1: Move the Carousel's active dot mark as one measured liquid marker under glass: it travels between the dots with stretch, recoil and settle, following the committed slide from a dot press, the arrows, the keyboard, a controlled `index` or a finished swipe, while the dots, their press targets and the slides stay still. The marker is ink like the dots and keeps the skin's own active dot size, a loop back to the first slide travels along the strip, a slide-set change resets it in place, and it is absent wherever the dot strip is. Reduce Motion selects the final bounds at once; solid mode keeps the static dots.
- 26481dc: Document the Switch's `toggle` and the Slider's `drag` liquid profiles in their entries (what moves, what stays fixed, Reduce Motion, disabled and solid behavior), and correct the Drawer, Toast and Listbox skin comments that still described their surfaces as never taking the glass material now that the layered model renders them through the functional, dense and content layers.
- 558af6e: Add real-frame motion recipes for existing glass controls, separate from reduced-motion visual baselines, with resource-lifecycle observations and native evidence guidance.
- d0faebf: Move the Navbar's active link fill as one measured liquid surface under glass: it travels between links with restrained stretch, recoil and settle while the labels, `aria-current`, focus and hit targets stay fixed; iOS carries its brand capsule as glass and keeps its inactive capsules, web and Android carry their tinted tile, a collapse retires the surface until the row measures again, Reduce Motion selects the final bounds at once and solid mode keeps the skin's own active tile. The material inventory names the delivered liquid profiles (moving-selection, liquid-popup) and requires their motion evidence.
- 6d5fc0e: Move the numbered Pagination's selected page puck as one measured liquid surface under glass: it travels between page cells with horizontal stretch, recoil and settle while the numbers, chevrons, `aria-current`, focus and hit targets stay fixed. Cells are tracked by page number, and a window shift re-measures them before the puck moves: it travels when the page it sits on kept its frame and resets in place when that page moved or left the window, so a shift never invents travel from a stale slot. The compact and with-size variants keep their anatomy, Reduce Motion selects the final bounds at once and solid mode keeps the skin's own selected cell.
- 865be6f: Open and close Dropdown and Select menus with the liquid popup material under glass: the menu grows out of the trigger's edge with a bounded contour overshoot, recoils and settles to the fitted shape, and stays visible briefly on close while its rows are already inert and out of the accessibility tree; selection and open state commit immediately, reopening during the exit continues from the retained material, Reduce Motion settles at once and solid mode keeps the ordinary entrance. AvatarMenu and the collapsed Navbar menu inherit the behavior from Dropdown.
- 977f38a: Open and close the remaining popups with the liquid popup material under glass: the triggered Popover, RowMenu (and Board's card menus), the split ButtonGroup menu, Autocomplete's suggestion list, PhoneInput's country list and the triggered Command palette grow out of their anchor edge, recoil and settle, and stay visible briefly on close while their content is already inert. Inline Popover cards and the bare Command palette stay static. A split ButtonGroup disabled while its menu is open now closes it, and a PhoneInput that becomes disabled or read-only while its country list is open closes the list.
- ca1c1bd: The moving glass selections whose surface is a brand puck (numbered Pagination,
  Calendar days, the Navbar's iOS brand skin) now keep their label readable through
  the flight: the label ink follows the travelling surface instead of switching to
  `primary-foreground` at the press, so a newly selected number stays in its resting
  ink until the puck is under it and the label the puck leaves takes its resting ink
  back as the puck departs. A target's own resting tile (the web page cell's border,
  the iOS neutral link capsule) dissolves under the arriving surface and re-forms
  behind it rather than popping. This is a shared measured-selection contract
  (`ink` / `uncovered` / `SelectionText`), so any future moving brand-puck selection
  inherits it.

  The brand fill of a glass puck now paints over the frost and lens material rather
  than beneath it, so the colour the contrast solver chose is the colour that
  renders: a settled `primary-foreground` label on a brand puck holds >= 4.5:1 on
  both schemes, fixing the too-dark settled puck the frost produced on the dark
  scheme (Calendar days and Pagination pages). Layer tints and explicit tints are
  unchanged, and iOS 26's native Liquid Glass path (the brand as its GlassView
  tintColor) is unchanged.

- 9da8d06: Move the glass selection of Tabs and TabBar as one measured surface with directional stretch, recoil and settle: filled Tabs selections (pills, the iOS segmented track, surfaced vertical rails) travel between triggers while labels, badges, focus and tap targets stay fixed, and the web and Android TabBar indicator travels between icon positions with restrained deformation; iOS keeps its tint-only TabBar selection. Reduce Motion selects the final bounds immediately and solid mode keeps the platform treatment. Adds the isolated liquid geometry probe to the materials fixture and the native motion evidence log.
- 3fe773a: Move the Sidebar's active row fill as one measured liquid surface under glass: it travels between rows, across sections and through the scroll body with vertical stretch, recoil and settle while icons, labels, badges, `aria-current`, focus and hit targets stay fixed; a row hidden in a closed section withdraws the surface, a collapse or density change resets it in place, Reduce Motion selects the final bounds at once and solid mode keeps the skin's own row fill. GlassSurface gains an internal host ref so a surface can serve as a measurement space.
- b4dfc61: Route lookout's docs sweep through each sidebar group's own path base. The Templates
  and Patterns groups live at `/templates/<slug>` and `/patterns/<slug>`, but
  `lookout.config.ts` filed every sidebar entry under `/components/`, so those 24 pages were
  never captured and the `calendar` template was folded into the Calendar component's
  route. Template and pattern pages render `MockupDocPage`, which has no preview card, so
  they are shot full-page; the component reference keeps its element shot and overlay
  states. No kit code changes.
- a22ca22: `LoopView` on the web now lands on the right phase when its channel is played again
  while already playing (`channel.play(phase)` on a running channel). A running CSS
  animation keeps the start time it began with, so handing it a new negative delay
  re-phased it relative to that start rather than to now: every view landed late by the
  animation's age (the Lattice harness's "jump to moment" driver arrived 1.6 s into a
  moment that should have started a second later). The view now remounts its node on
  such a re-phase so the new animation starts now at the delay computed for now. Park
  and resume are unchanged (a parked view keeps its node), and native was already right
  (the native loop restarts from the phase through its head timing).
- 4188cf9: Complete the CSS glass handoff's opaque print and accessibility fallbacks, including every material tint and decorative highlight. Reconcile material policy and theming documentation with role-based glass, solid fallback, and the existing surface and density CSS attributes.
- 2f2c030: Reconcile the solid, static glass and Liquid Glass material policy and maintain
  an exhaustive public-component inventory checked against exports and docs routes.
  The inventory records required verification rather than claiming native rendering
  or interaction passes, and preserves unpainted component anatomy.
- bc2cb16: Give every moving glass selection one measurement contract (`useMeasuredTargets`): targets report their frames in an ancestor space keyed by their own identity, a structural change re-measures them before any surface moves, and a surface holds meanwhile, then travels when the target it sits on kept its frame and resets in place when that target moved or left, without unmounting (a remount lingers on iOS, where the native material fades out). The Sidebar's shell shape now measures its rows against an ancestor body, which native `measureLayout` requires: on iOS the rail's active row had jumped instead of travelling. The Sidebar rides through an accordion closing the section it left, and a non-collapsible section's open state no longer counts as structure. Pagination, Calendar, Navbar, Sidebar and Carousel share the hook.
- a4b1cc3: Hand the RowMenu glyph, the Popover button, the split ButtonGroup and the Command search bar to their panes the way the Dropdown hands its pill to its menu: under glass the trigger fades and hides its glass in place as the droplet forms on its frame, the pane blooms from there, and on close the pane re-forms the trigger before its label fades back. Solid mode and Reduce Motion keep the plain tree.
- e8e30f1: Name Slider, Progress and overlay form examples using existing component label APIs, including accessible names in intentional layout counterexamples.
- fc58cff: Gate named-import distribution sizes for Button, Input, DataTable, and StackedList alongside the existing whole-kit budget, independently for web, iOS and Android. Use pinned esbuild with supported export conditions and platform extension ordering, verify those choices with a real package fixture, preserve component exports, and fail on missing or invalid output. Required and optional peers are externalized; these measurements budget Canvas distribution code, not complete native application sizes. Stock Metro package validation remains separate.

  Record Bun 1.4.0 in packageManager and use that version throughout CI so build measurements and verification do not change when the latest runtime changes. Keep all existing gzip ceilings and document the measured sizes and bundler version beside them.

- 200b8f4: A hosted anchored card that opens ABOVE its trigger on iOS and Android now sits directly above it. The card's scrollport declared no growth of its own and inherited React Native's ScrollView `flexGrow: 1`; while Yoga measured the card's absolutely positioned wrapper (which has no height of its own) it turned the card's height cap into an at-most constraint, and under the legacy stretch errata React Native keeps on the growing scrollport filled it, so the wrapper came out as tall as the cap with the content-sized card at its top. Under a `top` anchor that was invisible; under the `bottom` anchor of a card opened above its trigger the card floated up to the top of the visible band, away from its trigger, on both a page-body host and a viewport host (the docs Page scroller, the `/testing/popup` Dropdown). The scrollport now declares `flexGrow: 0`, so the wrapper is exactly the card's height on every platform; nothing changes on the web, where a growing child never inflated a content-sized card.
- 397ac67: Add isolated native candidate smoke infrastructure with shared input and public-ref
  fixtures, on-device package identity checks and explicit screen-reader verification
  records. Verify the independent registry starter's saved state and nested menus
  across browser engines and touch input.
  Keep candidate-only routes outside the ordinary starter and offer a Canvas missing-page
  screen with navigation back to the workspace.
- 2d5f3e8: Measure the current native smoke Carousel card immediately before its paging gesture. Validate fresh, visible bounds and platform coordinate units, then perform one in-card drag across more than half the page while retaining painted-page and callback assertions. This corrects the test gesture without changing production Carousel behavior.
- 77dcdf0: Align native fixture test module maps and import validation with the package name
  used by the maintained starter fixtures, restoring the native regression gate.
  Keep the package-install documentation sources consistent with the published
  package name and their generated examples.
- 602d3e9: Validate native smoke flows with the pinned Maestro command parser before builds,
  use a supported measured Carousel gesture, and preserve separate test provenance
  when rerunning corrected tooling against an unchanged native candidate. Retain
  journey and appearance-restoration failures in fresh evidence directories.
- 2e1abfa: Exercise built-in Dialog messages and ActionSheet headers in the shared glass test scenario. Capture both surfaces from the sealed native consumer in light and dark appearance, keeping pixel evidence separate from automated visibility checks.
- 6ddc5e0: Correct native acceptance flows to dismiss a Drawer input with its iOS keyboard Return action and observe Command closure after selection. Verify the exact appended query before and after selection, and capture the visible final result before tapping it.
- 866d610: Verify native Carousel paging with a measured, strictly in-card drag. Preserve
  two sequential Maestro phases, reject stale geometry before the gesture, and
  parse their generated commands before execution without changing app layout.
- b88f204: Measure safe-area insets inside Drawer and ActionSheet native Modal windows, keeping content clear of the status bar, notch and home indicator. Apply only the insets for the edges each panel touches. The optional safe-area peer remains optional; without it the existing plain-view fallback is preserved. When an app has no root safe-area provider, modal content waits for its first native inset measurement before mounting.
- 90d3f1f: Honor iOS accessibility escape on existing overlay content hosts. Dismiss the
  foremost active child before its parent, preserve controlled cancellation policy,
  and share ownership with native modal close requests without changing layout.
  Route focused Input and Textarea Escape through the same overlay policy while
  preserving consumer handlers, local editing cancellation and IME candidates.
- 8f85af0: Preserve the original Android host background, borders, corners and overflow while sampling its native paint. Keep visible content separate from sampled paint to avoid doubled translucent fills, and require the complete optional native integration before enabling capture.
- a3809bd: Extend the shared native smoke fixtures and accessibility protocol to verify inactive Dropdown, Listbox, Tabs and Radio activation, including disabled controls and exact selection callbacks. Keep ordinary native tap results separate from actual spoken-feedback verification.
- 2a8b653: Wait for the native starter home screen before opening the first smoke route, preventing Android startup from dropping the verification link. Store screenshots under Maestro's run output directory using its supported relative paths. Select native Listbox rows by their accessible names between surrounding controls, supporting native layout flattening without relying on DOM ancestry.
- 19a9689: Make the native smoke navigator follow the Canvas background token so dark-mode fixtures retain readable text on every nested screen.
- 7dcd0b6: Handle iOS first-use app-link confirmation in native smoke checks and verify Command text entry without relying on an inaccurate iOS focused attribute. Require the last Command result to lie above its footer before tapping. Record actual keyboard events and overlay coordinates, and exercise Drawer input and ActionSheet action/cancel hit targets for native safe-area acceptance.
- 69a8d8b: Make AvatarMenu's hosted alignment regression wait for the actual mounted menu and positioned wrapper, preserving default, leading-edge and precedence assertions without relying on a fixed animation delay.
- 366f954: Correct optional-peer development guidance to preserve Metro optional resolution,
  keep public declarations independent of omitted peer types, and verify the exact
  sealed package in isolated consumers.
- 8f85af0: Resolve organism surfaces against their actual material capabilities: content
  panels use stable frost, while selected calendar days, carousel actions, navigation
  controls and overlays keep their functional material. Preserve complete solid
  fallbacks, unfilled step rings and underline tabs. Keep DataTable's content host
  stable so material changes retain an active editor, its draft, focus and caret.
  Restore the inherited DashboardGrid edit-cell fill when content frost is unavailable.
  Keep carousel arrow glyphs in the foreground above their decorative material,
  and dim their disabled or pressed ink without fading the liquid material.
- 04218cc: Split browser validation into four complete-suite shards and an independent registry-starter job so the growing suite can finish within its existing job limit. Preserve candidate verification in every shard and retain separately named reports without changing test coverage, retries, or per-test timeouts.
- 1f05b00: Glass popups now open the way the iOS 26 menu does: the Autocomplete list, the Dropdown menu, the Select and the other option lists start as a glass droplet at their anchor with the rows already inside it, grow a few percent past their resting size and settle while the rows scale up and sharpen, and on close the rows vanish at once while the pane shrinks back into the anchor edge. The corner eases from the droplet's to the skin's on the material's clip, its lens and rim, and the native iOS 26 glass. Solid mode and Reduce Motion are unchanged.
- bcd43a2: Anchored cards (the Dropdown and Select menus, the Autocomplete list, Popover, RowMenu, the calendar peek and every other hosted overlay) open sooner after their trigger is pressed. The overlay now measures its trigger, its outlet and the visible band together from a layout effect instead of one after another on the next animation frame, and the portal outlet re-renders in the same commit sequence as the owner that published into it, so the card mounts and reveals with fewer hops between the press and its first frame; on iOS and Android the trigger's box lands inside the opening render itself. A card that the fitter moves to the other side of its trigger (a list opened near the bottom of the screen) now waits for its layout under the new height cap before the glass opening starts, instead of beginning at the height it had on the first side and re-targeting mid-motion.
- fefceee: Run the liquid popup presentation (the droplet every glass option list and menu opens from, its travel, overshoot and close, and the Dropdown-class hand-off) on the native animation driver on iOS and Android. The material's frame is now a transform of its resting box plus a uniform corner radius instead of an animated width, height and offset, so the springs no longer commit a shadow tree per animated view per frame: the JS thread is idle between frames and the seed frame's flush costs nothing there. The corner stays exact on the seed shape's shorter side (a capsule at the droplet, the skin's own radius at rest) and follows the scale on the other; a closed pane now leaves on the animation frame after it has handed the pill back, so the trigger's glass is painting before the pane uncovers it. The web keeps the same graph on its JS driver; solid mode and Reduce Motion are unchanged.
- cd43ccd: Preserve GlassSurface landmark roles when Reduce Transparency or Increase Contrast replaces glass with an opaque surface. Navigation and banner landmarks remain available with either accessibility setting, including the iOS material implementation.
- 6444e69: Restore native screen-reader touch exploration and activation for Autocomplete suggestions and inactive Dropdown, Listbox, Tabs, and RadioGroup options. Keep browser roving tab stops and input focus behavior while preserving each control's disabled state.
- 2fd2318: Use the popover foreground for ordinary web ActionSheet actions and Cancel so their small text stays readable in both light and dark schemes. Destructive actions retain their semantic color.
- b1952e8: Correct five resting foreground pairs while preserving their intent fills: light muted-foreground #71717b to #6d6d77, light success-foreground #ffffff to #042812, light warning-foreground #ffffff to #451a03, dark primary-foreground #fafafa to #ffffff, and dark destructive-foreground #fafafa to #460809. Validate semantic foreground pairs at 4.5:1 with a one-channel rounding margin, plus rendered Button, Badge and Alert text. Transient press opacity and ripple behavior are unchanged; these checks cover resting text.

  Four-digit hex token overrides now parse correctly in alpha(). Validate hex shapes and finite opacity while preserving the existing opacity replacement for eight-digit hex and passthrough for functional colors. Document that mixOklab accepts opaque hex only and leaves translucent inputs unchanged.

  Deduplicate visual capture routes when a component appears in multiple navigation groups.

- c8cf5ff: Refresh Linux visual baselines after reviewing all 150 changed before/after pairs
  from workflow 34247263672 at source 18ec75fa. These capture corrected semantic
  foreground contrast, Carousel picker targets, Popover field labels and previously
  obstructed captures. No screenshot thresholds or assertions change.
- 137ccfa: Refresh the Linux visual baselines for the Riskora restyle from workflow 35048401372 at
  source 8809fa3a: all 226 component, overlay and token captures change (the new palette,
  Urbanist, the 12 / 16 / 20px corners and the ambient shadow ladder), and the two Container
  captures are minted for the first time. No screenshot thresholds or assertions change.
- 8809fa3: Restyle every web skin to the Riskora Dashboard UI Kit (the iOS and Android skins keep their
  HIG and Material 3 shapes and take only the brand).

  Controls: buttons are 12px-cornered and 44px tall (36 / 52) with matching icon squares;
  every field (Input, Textarea, Select, Autocomplete, InputOTP) is a white `card` box with
  the 12px corner, 48px tall (40 / 56), a 16px inset and the 3:1 `input` boundary; select
  lists, autocomplete lists, dropdowns, row menus, popovers and the command palette share a
  16px menu card with an 8px inset and 10px-cornered 40px rows. Checkbox is a 20px box with
  a 6px corner, Radio a 20px ring, Switch a 44x24 pill, Progress a 12px capsule on the soft
  panel, Slider an 8px rail with a 20px thumb, badges and chips fully rounded pills, Kbd a
  24px cap, Avatar's square a 12px tile.

  Surfaces: cards, stats tiles, empty states, description lists, feeds, stacked lists, media
  objects, calendars, board columns and the filter panel take the 20px card corner with the
  ambient standard shade; the stat tile carries a 16px muted label over a 36px regular
  headline. Dialogs and alert dialogs are 16px cards under a 60% scrim; toasts and the
  action sheet share the corner; drawers and sheets round their content-facing edge at 30px
  under the xl shade.

  Navigation and data: the DataTable has a soft 10px-cornered header band with sentence-case
  medium labels, 56px rows on dashed hairlines and 36px row-action tiles; the Navbar is a
  72px bar with 12px link pills; the Sidebar a 20px column with 12px-cornered 48px rows;
  pill Tabs become card tabs (a 16px bar of 12px-cornered hairline segments, the selected
  one on a sky tint); pagination tiles are 40px with the 12px corner. Charts sit on the 20px
  surface with 8px bar caps and dashed gridlines. The `--p-*` web block of `platforms.css`
  transcribes every value.

- 98043d0: Make internal verification routes reachable in native docs navigation and expose the running bundle's source, package, and runtime identity separately from the latest published release badge.
- 8f85af0: Share bounded geometry motion across segmented selection, slider thumbs, and switch thumbs while retaining each platform's skin and native material. Keep drag values and hit targets authoritative, preserve focus through material changes, and cancel deformation immediately for solid fallback, disabled controls, Reduce Motion, Reduce Transparency, or Increase Contrast.
- 8f85af0: Gate Android native smoke on the capture module's instrumentation tests using sealed installed production sources and test inputs from the same candidate revision. Preserve JUnit, native test configuration, source identity, and failure logs while keeping generated build output outside the installed package.
- 1f25555: Avoid React 18 server-rendering warnings from shared overlay, accessibility, and scrolling effects. Preserve synchronous layout-effect ordering in browsers and native apps while using passive effects during web server rendering.
- 2835ea3: Give each FilterPanel option one accessible checkbox and tab stop by sharing noninteractive Checkbox content. Space toggles on release, while Enter, row clicks, labels and counts retain one shared selection path and each platform keeps its existing visual anatomy.
- 8f85af0: Paint Android capture-host backgrounds once so translucent fills retain their authored appearance while remaining available to native blur sampling.
- d573737: Keep Spinner skin visuals decorative so screen readers encounter one named loading indicator, including the web ActivityIndicator renderer.
- be4d1cc: The composite Skeleton scaffolds (`card`, `list`, `table`) now announce their loading state to assistive technology once, the way the single shapes already do. Their wrapper kept the `progressbar` role and label but also carried the flags meant to hide the inner muted blocks, and react-native-web forwards only the `aria-hidden` alias, so the wrapper hid its own progressbar and a screen reader never heard that content was loading (Android's `no-hide-descendants` hid the host node the same way). The hide flags now sit on an inner wrapper around the blocks; the outer node keeps the role, the label and the busy state, and the rendered look is unchanged.
- a86ccfe: Keep native glass overlays visible when their entrance opens by retaining one animated transform graph and keeping ancestor opacity at one. Hold an unmeasured anchored surface outside hit testing and accessibility without remounting its content, preserve corner placement on resize, and coordinate descendant focus callbacks with inherited entrance readiness. Centered panels remain ready without requiring their own size event, and reduced motion settles at the final frame.

  Popover preserves the original opener while waiting for layout, then moves focus into its existing panel. Refitting the same panel retains its focus session, and closing restores focus through the existing controller.

  Native pixel and interaction verification used React Native 0.86. The declared React Native 0.74 floor is covered by public-API source review, types and native bundles, not a device run.

- 4348e87: Unblock the release pipeline after the npm scope migration. The ordinary starter stays on the scope the registry serves Canvas from today (`@nannier-com/canvas@2.62.1`) and compiles against it, the sealed native candidate is installed under that declared dependency name so the smoke fixtures exercise the candidate, and the starter journey resolves the declared package instead of a hardcoded scope.
- de2bdb2: Replace the placeholder boilerplate guide with runnable setup commands, real session flows, and accurate platform and package requirements.
- 4b56905: Correct the standalone starter's Expo JSI Swift 6.2 host-callback captures while preserving synchronous pointer lifetimes and the existing concurrency checks.
- 8f85af0: Keep editing wells and inline metadata on stable glass, reserve liquid materials for action controls, and preserve complete platform surfaces when materials cannot render. Keep outline metadata unfilled and retain field focus, text selection, and segmented-control state while changing surface modes.
- 8f85af0: Render avatar initials, avatar overflow counts, and emblems with static glass across platforms while preserving photos, platform geometry, and solid fallbacks. Give the account-menu capsule the functional Liquid Glass role without inferring a liquid identity material from pressability.
- 8f85af0: Resolve cards, metric tiles, bordered identity rows, alerts and phone fields to static frost with complete solid skins when a material is unavailable. Preserve live editors when changing appearance, and keep list/code/empty-state inner fills consistent with the actual material and accessibility preferences.
- 8f85af0: Preserve the Switch track's measured native host across solid and glass changes
  so its rounded background and thumb coordinate space survive material updates.
  Keep the segmented ButtonGroup coordinate host stable for the same reason,
  including when it has no test ID. Preserve control state and layout instead
  of replacing either host.
- acab4a1: Keep optional blur types out of public declarations so strict TypeScript consumers can omit expo-blur. Add isolated packed-consumer checks for React 18.0 on the web, the React Native 0.74 and React 18.2 host pair, and the current locked peers, including real web interaction checks and stock Metro iOS/Android bundles with optional peers absent.
- d357504: The web field skins rest on the same `field-border` hairline as the iOS ones.

  Input, Textarea, Select, Autocomplete, InputOTP, Stepper, PhoneInput and the Command
  trigger no longer draw their resting border with the 3:1 `input` boundary on the web,
  which read as a white frame around every field on the dark card; they rest on the
  `field-border` hairline (gray-300 light, systemGray4 dark) exactly as the iOS skins do,
  through the same `fieldBorder()` helper. Focus (`ring`) and error (`destructive`) borders
  are unchanged, the non-field controls (checkbox, radio, switch, pagination, the outline
  button) keep `input`, and Android's fields keep their Material underline. The
  accessibility trade-off disclosed for the iOS fields (a resting boundary below WCAG
  1.4.11's 3:1) now covers the web fields too, at the user's request.

- 578d52e: The web Liquid Glass lens keeps one filter definition while a popup's material animates.

  A glass popup's pane (Autocomplete, Select, Dropdown, AvatarMenu, Command, Popover, the
  calendar peek) is resized by its opening spring on almost every frame, and the lens layer
  used to acquire a fresh sized `<filter>` for each of those sizes: a new data-URI SVG
  document for Chromium to parse, plus two commits on the layer, per frame. The lens layer
  now takes the bounds the pane settles at (the card's measured size, carried with the
  material's frame through the material motion context) and holds that one definition
  through the travel and the close, so an opening costs one definition instead of thirty
  to forty and the resting definition is exactly the one the settled layout would have
  acquired. Surfaces that do not move keep measuring themselves on layout as before.

- ddd7bb4: The web Tabs and TabBar now share the iOS liquid-glass anatomy, and the iOS TabBar takes the iOS 26 floating bar.

  Tabs on the web are the iOS capsule segmented control: a gray capsule track with a raised pill in solid mode, and under glass the same track as a functional-layer pane with the selection travelling as the liquid-glass puck. Both the default and the pill looks take the anatomy (the underline rule and the hairlined segment bar are gone on web); Android keeps its Material underline. The browser's keyboard focus ring stays.

  TabBar on iOS and web is the iOS 26 floating tab bar: a capsule inset from the sides that hovers above the content (which scrolls beneath it), the safe-area inset kept under the capsule, and the selected destination raised as a capsule covering its whole cell, which under glass is the measured liquid surface that travels between destinations. The skin contract gained `fill`, `floating` and `pillCovers` for that; Android's docked Material 3 bar and its icon pill are unchanged.

## 2.62.3

### Patch Changes

- 3961897: Cache DataTable sorting, pagination, and selection summaries across draft edits and other local interactions. Document immutable row and column updates, and verify large-data work counts, sorted immutable edits, and stable original-row callback indices.

## 2.62.2

### Patch Changes

- deae1cd: Avoid constructing offscreen StackedList row elements when virtualization is active. Keep default, unbounded, and reorderable lists eager, and cover the distinction with large-data construction tests.

## 2.62.1

### Patch Changes

- 0f9bddc: Let drawers expose an accessible modal name, with the built-in trigger label as the default.

## 2.62.0

### Minor Changes

- 66a262b: Add Autocomplete's public `onValueChange` callback so controlled consumers can observe both option selection and clearing with an empty string. This additive public capability justifies the minor release; `onSelect` continues to report selections only.

  Add keyboard suggestion navigation and selection, accessible active-option relationships, and native ScrollView scrolling. Preserve IME composition and let an active suggestion consume Enter before a surrounding Form submits.

  Give the disclosure button a real platform-sized touch target, including a 44pt minimum height for small iOS fields.

### Patch Changes

- a9135a6: Record the reviewed Linux screenshots for Autocomplete's platform-sized disclosure targets in light and dark, with the list closed and open. The intended pixel changes are limited to the chevrons' positions; field dimensions and option-list layout are preserved.
- 6132645: Make manual visual baseline generation capture current screenshots for review, including intentional differences within the normal comparison tolerance. Keep the regular visual regression gate's tolerance unchanged.

## 2.61.0

### Minor Changes

- 2b2befb: Add `Listbox.accessibilityLabel` so applications can name single-select lists and multi-select checkbox groups for assistive technology.

  Correct multi-select semantics and remove hidden interactive checkbox indicators while preserving platform checkbox artwork and row actions. Ensure each complete Enter or Space press changes selection once.

### Patch Changes

- 95c8f23: Keep Drawer child overlays inside the drawer's Modal window so Dropdown and Select menus remain visible above its panel. Preserve measured anchoring, outside-tap dismissal, nested Escape handling, and safe blur targets without requiring an extra consumer OverlayProvider.
- 78225b8: Fix published native module resolution so stock Metro selects iOS and Android
  skins and material helpers. Preserve the web ESM build and public declarations,
  watch both outputs during local development, and verify the sealed package in an
  isolated native consumer with optional peers omitted before CI publication.
- 8c3b6c3: Update registered local consumer overlays with the package's native entry metadata after its compiled targets exist, preserving package versions and dependency ranges. Retain exact source-map positions when native builds shorten relative module requests for Metro platform resolution.

## 2.60.5

### Patch Changes

- 217f701: Install the Bun runtime in the Cloudflare delivery job so Wrangler can deploy the validated web archive using the docs workspace's package manager. This new patch follows the successful 2.60.4 npm publication and its failed web delivery.

## 2.60.4

### Patch Changes

- 1b59a50: Correct optional dependency fallbacks, source development instructions, repository links, privacy copy and the distinct licenses for the npm package and repository source. Document the validated artifact release process and route the release script through its CI-only guard.
- 023b721: Suppress Select option lists and interaction callbacks while disabled, including when a controlled or already-open Select becomes disabled. Preserve stored open and selection state across re-enabling and expose consistent native and web accessibility states.
- 212c559: Assign Escape to the foremost overlay with explicit ancestry preserved across hosted content. Keep local editor cancellation, TextInput event handling, held keys and native Modal dismissal coordinated so one key closes one layer and preserves its parent.
- ab0c66b: Remove Stepper's resolved accessibility exceptions so CI requires a clean scan. Give the real package-sealing integration test a bounded subprocess budget while preserving its full archive and artifact checks.
- eb53b18: Fit the browser viewport to each measured component preview before taking a screenshot. Cover tall Calendar and GridList previews as well as opened overlays so captures cannot introduce blank areas or transient responsive navigation inside the image.
- d3ca471: Activate dialog and popover focus management when their panels actually attach, including delayed portal and measurement mounts. Preserve the public object-ref API, modal Tab trapping, nonmodal focus behavior, and restoration across nested panels, reopening, replacement, and unmount.
- ce3e842: Clear inherited repository-selection variables from release subprocesses so their explicit working directory remains authoritative. Isolate release test fixtures from Git hook environments and verify that adversarial inherited settings cannot modify another repository's configuration, refs, index, staged content or remote.
- a906439: Normalize Stepper decimal arithmetic before storage and callbacks, preserving decimal offsets and exponent-form increments. Expose a named spinbutton with keyboard adjustment on web inside a noninteractive group, while retaining the existing native adjustable View actions and unchanged platform layouts.
- ae3336c: Provide Changesets its local main reference when CI checks out a pinned commit in detached mode. Keep the reference at the triggering source SHA and validate the resulting version candidate before delivery.
- 0129449: Preserve open overlays and form drafts when the docs navigation and playground change responsive layouts. Scope overlay checks to their own preview and size screenshot viewports from the actual opened stage so browser capture cannot trigger a transient responsive layout.
- 907de7f: Prepare release versions before validating a frozen candidate, then publish only its tested npm tarball and docs archive. Reject stale candidates without rebasing or publishing, enforce the major-version guard for manual and automatic runs, and report actual delivery outcomes. Prepare Cloudflare asset paths in the shared docs build before browser tests.
- fd4fe0e: Refresh 45 individually reviewed Linux screenshot baselines after fixing oversized element capture. The corrected images contain the full previews without transient navigation headers or blank clipped areas; the other 181 baselines are unchanged.
- a27b784: Break the Sidebar's require cycle by giving the nav row its own module.

  `sidebar.shared` builds the narrow drill-down from a skin, and the drill-down
  imported `SidebarItemBadge` back from `sidebar.shared`, so the two modules
  required each other. Metro allows that and warns on every app start ("Require
  cycle: sidebar.shared -> sidebar.drilldown -> sidebar.shared"), because
  whichever module loads second sees the first half-initialized. It was harmless
  only because every value crossing the cycle is read inside a render, by which
  time both modules have finished loading; a value read at module scope would
  have evaluated as `undefined` far from the line that caused it.

  `SidebarItem`, `SidebarSection` and `SidebarItemBadge` now live in
  `sidebar.item`, which both presentations import and which imports neither of
  them back. `sidebar.shared` re-exports the two types, so the public API is
  unchanged: `SidebarItem` and `SidebarSection` are still exported from the kit
  and from each per-OS entry point, and no consumer import changes.

  The warning is gone from the docs app on iOS, verified on the simulator.

## 2.60.3

### Patch Changes

- bbc6f2e: Restore guarded development hook installation in fresh and moved checkouts. Run local checks fail-fast against freshly built package output, and skip hook setup in CI, production, and published-package installs.

## 2.60.2

### Patch Changes

- 766f715: Autocomplete and Select: a capped option list now clips and scrolls instead of
  spilling out of its card.

  Both cap the open option list with a `maxHeight` on the popover card, but that cap
  bounded the card alone: React Native Views are `overflow: visible` and
  `flexShrink: 0` by default, so a list taller than the cap painted its extra rows
  past the card, onto the bare page, with no fill, border or shadow behind them. The
  iOS and Android skins hit this on a seven-option list (326pt and 344dp of rows
  under 260/280 caps); the web skin fit its 240 cap by eight pixels, so a single
  extra option would have tipped it over too.

  The card now clips to its own rounded corners, and the rows sit in a scrollport
  that may shrink to the capped card, so the options past the cap scroll into reach
  rather than being clipped away unreachable.

## 2.60.1

### Patch Changes

- 29d4c1a: Two corrections to changes made earlier in this batch, both found by reviewing them
  adversarially rather than by a user hitting them.

  **Autocomplete.** Escape closed the option list and left the field in a state it could
  not get out of: the caret stayed in the input, so the focus handler that opens the list
  could never fire again, and clicking the field it was already focused in did nothing.
  Recovery meant typing another character or finding the chevron. ArrowDown now reopens,
  which is the standard combobox key and the other half of the Escape contract, and a
  press on an already-focused field reopens it too. Escape is also gated on the list
  being open, so a closed field no longer reports a spurious close to a controlled parent.

  The chevron's touch target is reverted. It is 7pt wide, which is genuinely too small,
  but the editable text is its immediate neighbour: a symmetric 18pt of hit slop took the
  last 18pt of the field, which is exactly where you tap to put the caret at the end of
  what you typed. A too-small target is better than one that steals its neighbour's. The
  measurement and the reason are recorded in the touch-target coverage test; fixing it
  properly means widening the control, which is a layout decision of its own.

  **Badge.** A named status badge took `role="img"` so its label had a role to sit on.
  That is right for a bare dot standing in for a word, and wrong for a badge that also
  renders text, because img is a leaf role: it would have replaced the visible text in
  the accessibility tree with the label. A badge with text and an explicit label is a
  group now, which accepts a name and keeps its children readable. All three cases are
  covered by tests.

## 2.60.0

### Minor Changes

- 0d56788: The package now ships `DESIGN.md`: the kit's design system, written to be read.

  Minor justification: this is a new file in the published package, so a consumer, or
  more often an agent working in a consumer's repository, can read the kit's actual
  values and rules without a network round trip to the docs site.

  Its frontmatter follows the schema the design-md library uses for the production
  systems it documents, so a tool that can read one of those can read this: the colour
  tokens for both schemes, the ten type roles with size, weight and line height, the
  spacing, radius, elevation, motion, breakpoint and field-width scales, both platforms'
  touch minimums, and per-platform component recipes.

  All of that is GENERATED, from `src/style/tokens.ts` and `styles/tokens/*.css`, with a
  `--check` gate in CI, so it cannot describe a previous release. The prose is authored,
  because none of it is derivable from a number: that every visual variation is a
  semantic boolean prop and string enums do not exist, that there is no style escape
  hatch, that glass is a theming mode rather than a per-component look, that a control
  owns the text it labels, and that responsiveness goes intrinsic first, container
  second, viewport only for the shell.

## 2.59.1

### Patch Changes

- a273386: Three accessibility fixes found by running axe over every component page in a real
  browser.

  **RowMenu** rendered its rows as `menuitem` with no `menu` container around them. ARIA
  requires a menuitem to be owned by a menu, so each row was an orphan: axe files it as
  `aria-required-parent`, and a screen reader reads a loose control rather than "menu, N
  items". Dropdown has carried that container since it shipped. The panel now has one
  too, named from the section label or the trigger, so a screen-reader user hears which
  menu opened. A menu of links, which is what `links` makes, correctly gets no menu role.

  **A named status Badge** put its `accessibilityLabel` on a bare View. ARIA prohibits
  naming a generic element, so the label was being discarded rather than announced,
  which is the opposite of what a status dot standing in for a word needs. It now
  carries `role="img"`, the same role Swatch already uses for the same reason, and only
  when it actually has a name: a decorative dot beside its own text label stays silent.

  **Kbd** had the same problem by a different route: it set `accessibilityRole="text"`,
  which react-native-web maps to no DOM role at all, leaving the chord's name on a
  generic div. It is `role="img"` now, so "⌘+K" is announced once as a unit rather than
  cap by cap, which was always the intent.

## 2.59.0

### Minor Changes

- 20c830f: New public API: the touch-target helpers, and five controls that now use them.

  Minor justification: `TOUCH_TARGET`, `platformMinTarget()`, `minTargetSlop()`,
  `useMinTargetSlop()` and the `TouchTargetSkin` shape are exported from the package
  root, so an app building its own pressable can meet the platform minimum the same way
  the kit does:

  ```tsx
  const target = useMinTargetSlop(TOUCH_TARGET.ios);
  <Pressable {...target} onPress={onPress}>
    …
  </Pressable>;
  ```

  Apple asks for 44pt and Material 3 for 48dp, and plenty of controls are smaller than
  that on purpose: an icon square, a step circle, a chevron. Growing them would be the
  wrong fix, because the minimum is about the area a finger can hit, not the area the
  design should occupy. So the shape stays and the touch area grows: the skin declares
  its platform's minimum, the shell measures what actually rendered, and hitSlop makes
  up the shortfall symmetrically. Nothing moves.

  Five controls that were short now reach it. The Autocomplete's chevron was the worst,
  at 7pt wide. The Switch row is 28pt tall on iOS, the Steps circles are 32pt, the
  RowMenu trigger is 32pt on iOS and 40dp on Android, and the CodeBlock copy chip is
  26pt. None of them changes size or position.

  The pattern was Button's alone; it moves to `src/style/touch-target.ts` so every
  pressable can use it and so a coverage test has one thing to look for. That test
  enumerates every component with a pressable and requires each to declare a target, or
  to be listed with how else it reaches the minimum, or to be listed as a measured gap.
  Fourteen components are in that last list today, each with the size measured in a real
  browser against its own platform skin.

## 2.58.1

### Patch Changes

- 26c62bc: Autocomplete: Escape closes the option list when the caret is in the field.

  The shared `useEscapeKey` hook listens on the document, which covers focus on the
  chevron or anywhere else on the page. It never covered the case that matters most for
  a combobox: someone typing a query and pressing Escape to abandon it.
  react-native-web's TextInput does not let an Escape keydown out of the input, so the
  document listener never heard it and the list stayed open, with `aria-expanded` stuck
  at true.

  Two test suites asserted Escape worked and both passed, because both opened the list
  by clicking the chevron, which leaves focus on a button. Driving a real browser is
  what surfaced it. The field now handles the key itself through React Native's own
  `onKeyPress` channel, so every way in has a way out, on every platform that reports a
  key.

## 2.58.0

### Minor Changes

- 68ae11a: New public API: `tabularNums()`, a text style that gives every digit the same width.

  Minor justification: this adds a capability consumers can use directly, exported from
  the package root beside `shadow()` and `alpha()`. Spread it into any text style that
  shows numbers read down a column or watched as they change:
  `{ ...tabularNums(), fontSize: 14 }`.

  It exists because the two platforms spell this differently and the kit only knew one
  spelling. `fontVariant: ["tabular-nums"]` is React Native's API and works on iOS and
  Android; react-native-web DROPS it, emitting no inline style, no generated class and no
  warning, so the element renders exactly as if nothing had been asked for. Every
  tabular-figure call site in the kit, in Progress, Slider and seven charts, was therefore
  a no-op in a browser. The web branch emits `font-variant-numeric`, the CSS property that
  actually does this, and all eighteen call sites now go through the helper.

  Two components gain the treatment they were missing. A DataTable column marked `numeric`
  now uses tabular figures in its cells and in its inline editor, so a column of amounts
  lines up on the decimal instead of drifting, and opening a cell to edit does not reflow
  the number under the caret. Stats does the same for its headline value and its delta, so
  a figure that updates in place stops jittering as its digits change.

  Unrelated, in the same neighbourhood: the Heatmap's weekday gutter labels were 9px,
  below the 10px the platforms themselves treat as the floor and smaller than the month
  labels directly above them. They are 10px now, and the gutter widened to fit them.

## 2.57.4

### Patch Changes

- 91a92bd: The web CSS hand-off no longer paints Stats and EmptyState with iOS values.

  An iOS fragment had been pasted inside the web block of `styles/tokens/platforms.css`,
  several lines below the correct web declarations, where the cascade silently replaced
  them. A web surface reading the hand-off got the iOS Stats card (12px radius, 18px
  inset, no shadow, 12px gap, SF tracking) instead of the web one (8px, 20px, shadow-sm,
  14px), the iOS EmptyState corner instead of the web one, and `--p-min-target: 44px` on
  the one platform whose minimum is zero. The iOS block, meanwhile, declared none of
  them and inherited the values that had been misfiled into web, so both blocks resolved
  to plausible numbers and nothing failed. Each side now declares its own.

  Two smaller repairs in the same layer: the spacing scale ships its top five steps
  (`--space-36` through `--space-64`), which `src/style/tokens.ts` has always carried and
  the CSS stopped short of; and the Android block no longer declares `--p-nav-rule` twice.

  The Icon stroke weight now comes from one exported constant that the native menu-glyph
  raster generator reads too, so the baked PNGs beside a live Icon cannot drift to a
  second weight.

## 2.57.3

### Patch Changes

- 2b113c7: TabBar: draw Material 3's active-indicator pill on web, not only on Android. Web
  is the one platform where a bottom bar and a nav rail are the same app seen at two
  widths, since an app shell swaps `Sidebar` for `TabBar` across a breakpoint and the
  user carries the memory of one across the resize. `Sidebar` marks its active row
  with a filled surface behind the row, so a tint-only bar made "you are here" change
  species at that breakpoint, which a consumer's visual audit caught. The pill is the
  M3 one by construction, tonal brand tint and all, scaled to 48x28 for the 12pt
  shorter web bar. The iOS skin is untouched: a phone app has no rail to disagree
  with, so this stays a web departure rather than a change to the HIG look.

## 2.57.2

### Patch Changes

- 133dcfd: DashboardGrid: a board's rows sit flush, and a grown Card fills the box it is given

  DashboardGrid laid its cells out with `alignItems: "flex-start"`, so every cell
  hugged its own content. That is invisible while the widgets in a row happen to
  run the same height and reads as a hole in the board the moment one of them is
  short: on the Ionize console's overview, a widget with nothing to draw sat in a
  158px tile beside a 427px neighbour, and the 269px underneath it was page
  background rather than anything the board had put there. Cells now stretch to
  the height of the row they wrapped onto, and the customize-mode chrome (the drag
  wrapper and the dashed edit ring) passes that height on, so a tile that fills its
  cell keeps filling it while the board is unlocked.

  Stretching the CELL is all that changed. The widget inside still sizes itself, so
  a board of widgets that hug their content renders exactly as it did before; a
  widget that wants the tile's full height now has a box to grow into, which was
  not reachable from outside the kit.

  `Card`'s `grow` reached the surface alone, which made it the wrong half of that
  pair: a card stretched to stand beside a taller neighbour drew its content in a
  box it did not fill and left its footer floating in the middle of the surface.
  The body section now takes up whatever slack the growth won. This is inert on a
  card that is already exactly as tall as its sections, which is every card that
  was not asked to grow.

## 2.57.1

### Patch Changes

- 6355a6e: DataTable: a pressable row is a row, not a button

  `onRowPress` rolled the data row `button`, which react-native-web renders as a
  real `<button>`. That stranded every `role="cell"` outside a row, so the table
  stopped reading as a table (`aria-required-parent`, `aria-required-children`),
  and it swallowed every control the row carried: the kit's own select checkbox,
  and anything a caller put in a cell. A row menu in a cell became a `<button>`
  inside a `<button>`, which is invalid DOM and logs a React nesting error on
  every row (found on the Ionize console's Identities table).

  The row is now always `role="row"` and keeps the press as a pointer convenience
  outside the accessibility tree, so clicking anywhere on it still acts. The
  action itself moves to a real button inside the row's first data cell, named
  from the row's plain text cells (or, when the row has none, by that cell's own
  content). It is a sibling of everything else in the row, so nothing nests, the
  row is one tab stop, and a screen reader announces it as the row's action.

  Callers passing `onRowPress` should keep their own controls out of the first
  column, which is where the activator goes.

## 2.57.0

### Minor Changes

- b8d5d4a: `Stats` can frame every metric's strip, so a row of them scans evenly.

  Without a frame each strip draws only its marks, and in a row that is not a
  neutral choice: a metric whose series is quiet draws a few faint marks beside a
  metric whose bar is full, so the densities run from blank to solid with nothing
  tying them together. The eye lands on the fullest tile rather than scanning the
  row, and the quiet tiles read as charts that failed to load rather than as
  charts sitting at zero.

  - `Stats.framed` puts every strip on the muted track, in one bounded band: the
    frame is the same whatever the data, so the fill is the only thing that
    varies, and a flat series reads as a chart at zero.
  - `Sparkline.track` paints the plot area with the muted track. Use it where
    strips sit side by side; a lone sparkline in running text is usually better
    without.
  - `StackedBar.tall` takes the 24 band a Sparkline plots in, with the chart bar
    radius rather than the pill, so a composition and a trend draw as one family.
  - `StackedBar.subtle` washes the segments to the density a Sparkline gives its
    own marks, for a bar that supports a headline rather than being one. `Stats`
    now draws a tile's `share` this way, framed or not: inside a tile the strip
    supports the value rather than being it.

  All additive, and every default is unchanged. Found on the Ionize dashboard's
  four-metric row, where the solid composition bar outweighed its three quiet
  neighbours.

## 2.56.1

### Patch Changes

- ae6a2f0: Stand a `Stats` composition strip on the trend strip's floor.

  `share` reserved the trend strip's height and centred its bar in it, so in a row
  that mixes the two the composition bar floated seven pixels above its
  neighbours' baseline: a Sparkline's bars sit on the bottom of the band
  (`alignItems: "flex-end"`). The strip is bottom-aligned now, so every tile in a
  row shares one floor. Seen on the Ionize dashboard's four-metric row.

## 2.56.0

### Minor Changes

- 3012c30: `Stats` can draw a metric's composition where it has no trend, so a row of tiles
  fills to one line.

  New capability, three additions, all backward compatible:

  - `StatItem.share` takes `StackedSegment[]` and draws them in the SAME slot as
    `spark`, as a proportional strip over a muted rail. Ignored when `spark` is
    set.
  - `StatItem.sparkLabel` names what the trend strip plots. It still defaults to
    `"<label> trend"`, which is right whenever the strip is the value's own
    history; set it when the strip plots the supporting line instead, so a screen
    reader is not told the strip is something it is not.
  - `StackedBar.track` paints the unfilled remainder as a muted rail, which is
    what lets a composition of nothing (a queue at zero, a metric at zero) read as
    a bar rather than as blank space. The all-zero dev warning now speaks only for
    the trackless case, since the track is how that state is drawn on purpose.

  Why it was needed: cards in a Stats row stretch to the tallest sibling, so a row
  where one metric carries a strip left every other tile with a band of blank space
  under its text and read as an unfinished component rather than a deliberate one.
  The kit offered no honest way to fill the rest, because a metric with no trend
  had nothing to put in the slot. Most such metrics still decompose, and `share`
  draws that decomposition, at the trend strip's reserved height so the row keeps
  one card height. Found on the Ionize dashboard's four-metric row, where only
  "Total identities" had a series to plot.

## 2.55.2

### Patch Changes

- 04e7f0a: Trim the `--input` note in `styles/tokens/colors.css` back under its size budget.

  2.55.1 explained the `input` / `border` split in a long comment inside the
  shipped stylesheet, which pushed `styles/tokens/colors.css` from 1856B to 2368B
  gzipped, past the 2048B per-file budget `check-size` enforces. `styles/` ships
  to consumers, so those were real bytes on every install.

  The note is now three lines and the full reasoning moved to `src/style/tokens.ts`
  beside the values themselves, where it costs no shipped CSS. No token value
  changes: `validate-tokens` and the render-parity check both still pass.

## 2.55.1

### Patch Changes

- 8a65d9e: `input` now meets the WCAG 3:1 control-boundary minimum in both schemes.

  `input` and `border` shipped the same hairline value (`#e4e4e7` light,
  `#27272a` dark). That is right for `border`, which separates two surfaces of
  differing fill and is read against that difference, but wrong for `input`: it
  is the boundary an unfilled control draws itself with, and WCAG 2.2 SC 1.4.11
  holds exactly that to 3:1 against its surroundings. On the page background the
  shared value measured 1.27:1 in light and 1.34:1 in dark, so an outline Button
  or a bare text field had a silhouette the eye could not find, and an unchecked
  switch hid its own thumb.

  `input` becomes `#88888b` in light and `#747478` in dark, the lightest values
  on the existing border hue that still clear 3:1 against all three surfaces a
  control is placed on: the page, a card or popover, and a muted panel. `border`
  is unchanged, so card edges, dividers and table rules keep their hairline
  weight. Every control that reads `input` gains the visible boundary: Button
  (outline), Input, Textarea, TextInput, Select, Autocomplete, Checkbox, Radio,
  Switch, InputOTP, Stepper, Pagination and Avatar.

  The iOS Switch keeps its hard-coded systemGray3 off-track. That constant is a
  HIG fidelity match to the real UISwitch rather than a contrast choice, and it
  still sits under the 3:1 floor; moving it is a platform question, not a token
  one.

## 2.55.0

### Minor Changes

- 4a4efdc: Row and Column gain a `shrink` modifier, the new public option this release adds.

  React Native gives every box `flexShrink: 0`, the opposite of the web's flex
  default, so a Row child sized by a long sentence keeps that sentence's full
  single-line width and spills past the row's edge, where the nearest clipping
  ancestor cuts it mid-word. Until now the layout primitives had no way to say
  "this child may give way": `fill` (flex: 1) also zeroes the flex basis, which
  pulls every child of a `wrap` row back onto one line, and the kit's own
  molecules reached for a raw `flexShrink: 1` internally instead.

  `<Column shrink>` sets `flexShrink: 1` and leaves the basis at the content size,
  so a wrapping row still breaks where it did and only the over-wide child gives
  way. Opt-in and backward compatible: nothing changes for layouts that do not
  pass it.

## 2.54.1

### Patch Changes

- 2777522: The kit declares its own client boundary: `dist/index.js` now carries a `"use client"` prologue. Canvas is a react-native-web kit whose exports reach React context on module evaluation, so importing it from a React Server Component (Next.js App Router) threw `createContext only works in Client Components` and every consumer had to remember its own wrapper. Patch, not minor: no new component, prop, or API, only the packaging declaration that makes the existing surface importable from a server component.

## 2.54.0

### Minor Changes

- eacab35: `Typography` gains `href`, `hrefAttrs`, and `onPress`: inline text renders as a real browser link on the web (announced as a link; the link role wins over a heading role), native navigates through `onPress`, and `underline` remains the link look. Minor because it is new public Typography API, completing the link affordance `Button` gained for button-shaped navigation.

## 2.53.0

### Minor Changes

- 039d0c8: `Button` gains `href` and `hrefAttrs`: with `href` the web render is a real `<a>` (middle-click, new tab, crawlable, announced as a link), `hrefAttrs` forwards `target`/`rel`/`download`, native keeps `onPress` navigation, and a disabled or loading button suppresses the anchor. Minor because it is new public Button API: the kit's first link affordance, closing the long-standing "no link affordance" consumer gap.
- df066b9: GeoMap: `zoomable`, with bubbles that aggregate and split as you zoom.

  Minor because it adds user-visible capability: a new `zoomable` boolean and the
  `zoom` / `defaultZoom` / `onZoomChange` controlled trio, plus `onSelectPlaces`.
  The wheel zooms about the pointer, two fingers pinch, a drag pans once zoomed,
  and a zoom control pair plus the arrow keys give the same reach with no pointer
  at all. Places too close together to draw separately merge into one bubble
  carrying their summed count, and that bubble splits into its members as the map
  is driven in.

  Opt-in, so nothing changes for anyone who does not ask for it. Without
  `zoomable` the camera is the world verbatim, there are no links, and the cut
  degenerates to one bubble per point in input order, taking the identical code
  path it always did.

  `onSelect` keeps its exact meaning, a point index. Pressing a group reports its
  largest member, which for a single place is today's value, and `onSelectPlaces`
  carries every member alongside.

  Aggregation cuts one minimum spanning tree, built per data set, at a threshold
  that halves per zoom level. That makes each grouping a refinement of the one
  above it, so a group can only split and no place can migrate: the anti-flicker
  guarantee is structural rather than tuned. The threshold is exactly zero at the
  deepest zoom, so any data separates fully.

  Also fixes a pre-existing bug: React Native Web gives every Pressable
  tabIndex 0 regardless of `accessible={false}`, so the map carried a second,
  nameless tab stop that announced nothing.

## 2.52.6

### Patch Changes

- 0556bc1: GeoMap: sharper coastlines and country borders.

  The world data now comes from Natural Earth 1:50m instead of 1:110m, and the
  generator emits a second path holding the mesh of boundaries that two countries
  share (coastlines excluded, since the land path already draws those). The viewBox
  widens from 1000 to 2000 units, so the geometry stays crisp when the map is drawn
  wider than 1000px, which it is wherever a caller passes `width: "100%"`.

  Land now carries a coastline stroke and borders a fainter one, both in the muted
  foreground token, so the silhouette reads against the card surface in both schemes
  instead of sitting a couple of steps away from it on the ramp.

  No API change: every prop keeps its meaning, so no call site needs touching. The
  bubble radius constants doubled because they are expressed in viewBox units and the
  box did, which leaves every bubble exactly the size it was.

  This costs bytes: `geo-map.world.ts` goes from 5.6KB to 23.8KB gzip and the measured
  bundle from 161.5KB to 180.8KB, so the JS size budget moves from 160KB to 192KB. The
  whole increase is one generated data module of two string constants, and it
  tree-shakes out for consumers who never import GeoMap.

## 2.52.5

### Patch Changes

- c32e642: `check-parity` now fails on a DEAD RECORD: a divergence recorded for a prop the
  kit already declares under the hand-off's own name, or for a component the kit
  already exports.

  A divergence is consulted only while the hand-off prop is ABSENT from the kit, so
  shipping the capability makes its record unreadable, and the report row simply
  disappears on the next regeneration with nothing pointing at the record left
  behind. Six have been deleted by hand in two sweeps (`Tooltip.children`,
  `Input.onBlur`, `Input.maxLength`, `Textarea.maxLength`, `ActionPanel.children`,
  `Navbar.actions`), and every one had gone false by the time it was found, still
  denying a capability the kit shipped. This is the same guarantee the broken
  redirect guard gives from the other end: that one catches a record naming a prop
  the kit lacks, this one a record about a prop the kit has.

  Scoped to claims about the kit. A `global` record is the fallback for any
  component prop no component-level record claims, so being unread is its resting
  state, and a record under a component the kit has not shipped stays live for the
  day it lands.

  Tooling only, with no runtime effect. `HANDOFF-PARITY.md` picks up a paragraph
  describing the new guard; the counts are unchanged (733 props compared, 526
  present, 151 settled, 56 open gaps).

## 2.52.4

### Patch Changes

- a69821f: Two more dead records leave the hand-off parity ledger
  (`tools/handoff-parity/divergences.json`): `ActionPanel.children` and
  `Navbar.actions`.

  Both were `renamed` records, and both are false about the kit as it ships today.
  `ActionPanel.children` claimed the hand-off's body slot is spelled `description`
  here; ActionPanel has carried its own `children` slot since
  "feat(action-panel): support embedded children", under the hand-off's own name
  and for the hand-off's own purpose. `Navbar.actions` claimed the trailing
  controls arrive as `actionLabel` plus `onAction` "rather than a ReactNode";
  `NavbarProps.actions` is a ReactNode slot, added in "feat(navbar): brand element
  and trailing actions slots". The report was refreshed when those props landed,
  which dropped their two rows, but the records themselves stayed behind: the check
  consults a divergence only when the hand-off prop is ABSENT from the kit, so
  neither had been read since.

  This is the same rot the four dead open-gap records carried, in the settled half
  of the ledger: a record nothing reads still reads as current adjudication to
  anyone opening the file. Tooling data only, with no runtime effect.
  `HANDOFF-PARITY.md` regenerates byte-identical (733 props compared, 526 present,
  151 settled, 56 open gaps), because a record the check never reads never reached
  the report.

  The two remaining unreachable records, `global.value` and `global.defaultValue`,
  stay: a global record is a fallback for any component whose hand-off prop no
  component-level record claims, so it is unread whenever every such prop happens
  to be adjudicated elsewhere, not wrong.

## 2.52.3

### Patch Changes

- 21991ad: Drag & drop now reads in the layout direction: a `horizontal` DropZone mirrors
  under RTL, and the two horizontal arrows swap roles.

  The geometry had no direction handling at all. `insertionIndexFor` treated a
  larger X as a later data index, so a pointer dropped visually to the RIGHT of a
  target in a right-to-left locale resolved to "after" in data order, which renders
  to its LEFT; `zonesInReadingOrder` sorted each row by ascending X, the reverse of
  how the zones actually read. The two agreed with each other, so the keyboard
  cursor was consistently wrong rather than inconsistently wrong.

  The axis is now mirrored, following how the rest of the kit resolves direction:
  `flexDirection: "row"` mirrors under RTL, so data index 0 is the RIGHTMOST card
  and "later in data order" means further left. `sortByMainAxis` returns the row in
  data order (descending X under RTL), `insertionIndexFor` counts the midpoints the
  pointer has passed along the reading direction, and `zonesInReadingOrder`
  reverses only the within-row sweep (rows still run top to bottom, because the
  block axis never mirrors). Vertical zones and the up/down arrows are unchanged in
  both directions.

  `insertionOffset` now measures from the zone's LEADING edge along the reading
  axis, and the horizontal indicator anchors with the logical `insetInlineStart`
  rather than a physical `left`, so the line meets the correct edge of a mirrored
  row on every platform with no branch. In a left-to-right layout that resolves to
  the same `left` inset as before, so nothing about the existing look changes.

  ArrowLeft and ArrowRight swap roles under RTL (Right Arrow moves to the previous
  item, per the WAI-ARIA practices), the same flip `useRovingFocus` applies to a
  tablist and the Slider applies to its step. The keyboard cursor's opening
  position, which already reads a `horizontal` zone along its own axis, now reads
  that axis in the layout direction too.

  Direction reaches the geometry as a parameter, never a global read: the shell
  reads `isRTL()` and hands the answer in, which keeps the whole module unit-
  testable with no renderer.

## 2.52.2

### Patch Changes

- c9789b7: Four dead open-gap records are removed from the hand-off parity ledger
  (`tools/handoff-parity/divergences.json`): `Tooltip.children`, `Input.onBlur`,
  `Input.maxLength` and `Textarea.maxLength`.

  Every one of those props is declared on its component's props interface today.
  `Tooltip.children` shipped in "feat(tooltip): arbitrary element trigger", and the
  three field props come in through the `TextEntryProps` slice that `InputProps`
  and `TextareaProps` both extend. `check-handoff-parity.ts` reads a divergence
  record only when the hand-off prop is ABSENT from the kit, so none of the four
  had been consulted for some time; they sat in the file claiming a capability was
  missing while the kit shipped it. `Tooltip.children`'s reason was the loudest
  about it, asserting that Canvas's Tooltip "cannot attach to a caller's node".

  Tooling data only, with no runtime effect: `HANDOFF-PARITY.md` regenerates
  byte-identical, because a record the check never reads never reached the report.
  Phase 4's validation work stays tracked through the props that really are absent
  (`Input.validate`, `validateOn`, `messages`, `submitted`, `showValid`,
  `onValidate`, `minLength`, `pattern`, `min`, `max`). The now-empty `Textarea`
  component key goes with its last record.

## 2.52.1

### Patch Changes

- 1a6bc36: Grabbing a card by keyboard inside a horizontal `DropZone` now starts the cursor
  at the card's left-to-right position instead of a position read down the wrong
  axis.

  `startKeyboardDrag` sorted the source zone's measured cards along the VERTICAL
  axis unconditionally, even when that zone was registered `horizontal`. Ranking a
  row's cards by their top edge says nothing about the order it reads in: cards of
  unequal height rank by how they sit on the cross axis rather than left to right,
  and a row whose tops all agree is a pile of ties that resolves to whatever order
  the measurement pass happened to build. The cursor therefore opened on the wrong
  card, announced the wrong position, and dropped at the wrong index. Everything
  else in the drag layer already read the zone's own `horizontal` flag through
  `zoneCards`, so the pointer path and the insertion indicator were never affected,
  which again left the accessible path as the broken one.

  The starting index now reads that same flag, so both paths agree on one axis per
  zone. No kit component reached this: DashboardGrid's horizontal zones hold a
  single card each and Board's lanes are vertical, so the fix lands for consumers
  composing a horizontal `DropZone` with several `Draggable`s of their own.

## 2.52.0

### Minor Changes

- 77345e2: Icon: the `blend` glyph joins the curated set (414 glyphs).

  Minor justification (new public API): `<Icon blend />` is a boolean that did not
  exist before, and `"blend"` becomes a new member of the exported `IconName` union,
  so every data-driven `icon` slot that types against it (Dropdown, Command, Sidebar,
  RowMenu, Feed, ButtonGroup, Stats) can now name it. Code written against 2.51.x
  does not compile against the glyph today; after this release it does.

  Lucide's `blend` is two overlapping circles, the standard glyph for mixing two
  surfaces. It is the honest icon for a glass/solid surface toggle, which previously
  had to borrow `sparkles` (a magic-wand metaphor that names an effect, not a
  material). Nothing existing changes: the set only grows, every prior glyph name is
  untouched, and the `<Icon set />` gallery picks the new entry up automatically
  because it renders from the generated `NAMES` table.

  The set is generated, so the change is one name added to `tools/icongen/icons.ts`
  plus a `bun run icons:gen`; `src/atoms/icon/icon.glyphs.ts` is the regenerated
  output. The new `test/icon-glyphs.test.ts` pins that output against both of its
  inputs (the curated source list and lucide-static's `icon-nodes.json`), so a name
  added without a regenerate now fails a test instead of surfacing as a missing
  glyph at a call site.

## 2.51.3

### Patch Changes

- 79b1113: `DashboardWidget.title` is documented for what it actually is: the widget's
  accessible name, not a header the grid paints.

  It was described as "Widget header label", which promised chrome that has never
  existed. Cells render bare on purpose (a widget arrives with its own surface, so
  a second heading would double up), and the field is what customize mode uses to
  name the widget's drag grip and its drop zone, which is what the drag
  announcements read out. Locked, nothing reads it at all, though it stays required
  because the board can be unlocked at any time.

  Documentation only: the behaviour was right and is unchanged, so no board looks
  or acts differently. The `.md` gains a Do/Don't pair teaching it, since a slug or
  placeholder title costs nothing visually and leaves keyboard and screen-reader
  users dragging "widget-2" around.

## 2.51.2

### Patch Changes

- 1f165dc: A `storageKey` DashboardGrid no longer breaks hydration: the saved layout is
  adopted in the first commit after hydration instead of during it.

  The stored order was read on the FIRST render, which on the web is the hydration
  render. A user who had reordered their board therefore hydrated markup the server
  never sent, and React does not patch that up: it discards the server tree and
  rebuilds the whole subtree on the client. The first render now seeds from the
  declared `defaultOrder` (or the `items` order), which is exactly what the server
  shipped, and the saved layout takes over one render later.

  The gate is the kit's existing hydration helper, lifted out of
  `src/style/container.ts` into `src/style/use-hydrated.ts` so both callers share
  one implementation: false for the server render and the hydration render, true
  from the first commit on. It stays kit-internal, imported by path, and the window
  fallback in `useContainerWidth` / `useContainerBreakpoint` behaves exactly as
  before. `ThemeProvider`'s `ssrScheme` gives the colour axis the same contract.

  Client-only apps are unchanged: with no hydration pass the first render already
  reads storage.

## 2.51.1

### Patch Changes

- 6f0dd12: Keyboard reordering now follows the arrangement on screen, so a second move on
  an already-reordered DashboardGrid goes the way the arrow key points.

  The drag layer's keyboard cursor walked the zone REGISTRY, which is mount order
  and never changes again: React reuses a keyed DropZone when the board reorders,
  so nothing re-registers. From the second keyboard reorder onward, the cursor
  therefore stepped to whichever zone had mounted next rather than to the one
  beside the widget on screen, and the widget landed somewhere the user did not
  ask for. The pointer path was never affected, because it hit-tests the measured
  rects, which meant the broken path was the accessible one.

  The measurement pass already measures every zone's rect at grab time, so the
  cursor now sorts those rects into reading order (row by row, left to right;
  `zonesInReadingOrder` in `drag-drop.geometry.ts`) and walks that instead. Rows
  are swept rather than bucketed by a tolerance, so lanes of very different heights
  still read as one row, and an unmeasured board degrades to the order it was given.
  Zone hit-testing keeps using registration order, which is paint order: that is
  what decides the top-most zone when two overlap.

  Board carried the same latent bug (a consumer that reorders its `columns` moved
  the lanes without re-registering them) and is fixed by the same change.

## 2.51.0

### Minor Changes

- 64876a4: DashboardGrid spells its collection prop `items`, matching every other
  collection-taking component in the kit; `widgets` keeps working as a deprecated
  alias.

  Minor justification: `items` is a new public prop on `DashboardGridProps`, so
  this adds a user-visible capability rather than fixing one. Nothing that already
  shipped changes shape: `widgets` still renders exactly the board it always did.

  Sidebar, StackedList, DescriptionList, Feed, Stats, GridList, Board, Carousel,
  Command, Dropdown, Listbox, TabBar and the rest all take their collection as
  `items`, and DashboardGrid was the single outlier. It now accepts `items` as the
  documented, canonical spelling, and `widgets` resolves to the same board while
  warning once in development toward the new name. `items` wins if both are passed,
  which also warns. Both props are optional, so a board configured with neither
  renders empty rather than throwing.

  The docs, the `.md` examples, and the tests all teach `items` now; the generated
  prop table carries `widgets` with its deprecation note beside it.

## 2.50.0

### Minor Changes

- f1f1627: New GeoMap chart: a token-themed world map with area-encoded coordinate bubbles,
  press to inspect, and a build-time precomputed land silhouette (no runtime fetch,
  no runtime dependencies).

  Minor justification: this adds a new public component to `@nannier/canvas`
  (`GeoMap`, with the `GeoMapPoint` and `GeoMapProps` types), which is a new
  user-visible capability rather than a fix to an existing one. Nothing that
  already shipped changes shape.

  The land is one muted path in the Natural Earth I projection, baked at build time
  by `bun run geomap:gen` and drawn in the generated viewBox's own units, so the
  coastlines, the bubble centers, and the bubble radii share one coordinate space
  and every size follows the rendered width. Each point's AREA carries its count
  (radius proportional to the square root of the share, with a floor that keeps a
  tiny count visible), circles take the primary token over a surface-colored ring so
  overlapping bubbles stay readable, and every colour comes from `useTheme()`, so
  light and dark work with no per-scheme code. Pure react-native-svg: no DOM and no
  `Platform.OS` branch.

  Single-identity encoding, so there is no tone axis and no legend; density
  (`compact`) is the only style axis. The map holds the projection's aspect ratio
  from its own measured width, never the window. Pressing a bubble sets the
  controlled selection, flags the label and formatted count through the shared chart
  value flag, and announces it; the plot's accessible name folds in the title, the
  place count, the biggest places with their values, and a "+N more" tail, because a
  screen reader user cannot see bubbles.

## 2.49.1

### Patch Changes

- 5fba543: Groundwork for the GeoMap chart: the renderer-free Natural Earth I forward
  projection (`projectNaturalEarth`, `NATURAL_EARTH_ASPECT`, `naturalEarthHeight`)
  plus the pre-projected world land silhouette it generates, with unit tests.

  Patch, not minor: nothing is exported from the charts barrel yet, so the
  package's public API is unchanged. The component that consumes this lands next.

  The land data is computed at BUILD time by `bun run geomap:gen`, which reads the
  Natural Earth 1:110m land topology (public domain data, ISC packaging via the
  `world-atlas` devDependency) and projects it through the very same projection
  module the chart will place its bubbles with, so the coastlines and the data
  points cannot drift out of register. The kit therefore ships map geometry with
  no runtime dependency, no network fetch, and no parsing at import: one 5.7KB
  gzip string constant.

## 2.49.0

### Minor Changes

- 54ddb7e: New DashboardGrid organism: a 12-column, container-responsive widget board with locked
  and customize modes, controlled or uncontrolled order, and kit drag reordering (pointer,
  keyboard, screen reader).

  Minor justification: this adds a new public component to `@nannier/canvas`
  (`DashboardGrid`, plus the `clearStoredDashboardOrder` helper and the `DashboardGrid`
  ordering and span exports), which is a new user-visible capability rather than a fix to
  an existing one. Nothing that already shipped changes shape.

## 2.48.1

### Patch Changes

- f705d03: Groundwork for the DashboardGrid organism: the renderer-free layout logic module
  (`orderedWidgets`, `moveWidget`, `effectiveSpan`) plus the `DashboardWidget` and
  `DashboardTier` types, with unit tests.

  Patch, not minor: nothing is exported from the organisms barrel yet, so the
  package's public API is unchanged. The component that consumes this lands next.

  The order functions reconcile rather than throw, because a consuming app persists
  the widget order server-side as ids alone and that array outlives the widget list
  it was captured from: ids missing from the stored order append in their declared
  order, ids matching no widget drop out, and a move naming an unknown id is a
  no-op.

## 2.48.0

### Minor Changes

- 77b479c: Tooltip accepts an arbitrary element trigger (children), showing on the child's
  hover and focus without claiming its press.

  Minor justification (new public capability): `TooltipProps` gains `children`, so
  a tip can hang off a control the app ALREADY has (an icon `Button`, a `Chip`)
  instead of one of Tooltip's three built-in triggers. A console's "Glass on" /
  "Glass off" icon Button can carry a tooltip and keep its own `onPress`, which
  was impossible before: the tip had to be a separate trigger beside the control.

  Trigger precedence, first match wins: `children`, then `iconTrigger`, then
  `textTrigger`, then the default text Button. Passing no children leaves every
  existing call site rendering exactly as before.

  The child renders as-is. The only node Tooltip adds is its root view, which
  takes NO accessibility role and no tab stop, installs no press responder, and
  listens only for hover (RN's `onPointerEnter` / `onPointerLeave`, touch pointers
  skipped) and focus. So the child stays the single interactive, labelled element:
  a `Button` child keeps its `onPress`, never lands inside a second button (which
  would be invalid markup and an ambiguous control), and the tip does not toggle
  on tap.

  The disclosure sits on the ROOT view rather than a wrapper hugging the child on
  purpose. The bubble renders in flow, so opening it pushes the trigger over by
  the bubble's height; a child-hugging hover region would be shoved out from under
  a stationary pointer and the browser's post-layout hover recompute would close
  the tip the instant it appeared (observed in Chrome). The root spans the bubble
  too, so the tip stays up and hovering the bubble itself keeps it up.

  Native fires no hover at all and an element trigger has no tap toggle, so the
  controlled `open` prop remains the native and touch path; the `.md` says so.

## 2.47.0

### Minor Changes

- cd3ac70: Chart: stacked grouped columns.

  Minor justification (new public capability): Chart grouped mode gains stacked
  columns (categories by series accumulating per column) for composition-over-time
  bars. Passing `stacked` alongside `labels` + `series` turns each category's
  cluster into ONE column whose segments accumulate, so "token issuance by client,
  split by grant type" reads as each client's total and its composition instead of
  four bars to compare by eye. AreaChart already had `stacked`; this is the same
  idiom for bars.

  The axis follows the per-category TOTALS rather than the largest single value,
  since the column now encodes the sum. Segments abut with no gap (StackedBar's
  convention) and sit bottom-series-first (the stacked AreaChart's band order);
  only the topmost non-empty segment takes the bar's rounded cap, an empty segment
  paints nothing rather than the 2px minimum a clustered bar keeps, a negative
  value counts as 0, and the running sum is clamped to the plot so a `max` below
  the true total cannot overflow the column. The legend, the press/scrub value
  flag, and the dimming all keep working, and a stacked column's accessible item
  names the category total after its segments (the column height is the total's
  only visual channel).

  `stacked` is grouped-mode only: passing it to a single-series `data` chart
  devWarns and renders unchanged. Omitting it renders the existing clustered
  columns byte-identically.

## 2.46.0

### Minor Changes

- 4c29dd4: Charts: per-series semantic tones.

  Minor justification (new public capability): `ChartSeries` accepts per-series
  `success` and `destructive` tones so semantic multi-series charts colour by
  meaning; unset series keep the chart-1..8 ramp. A sign-ins chart can now paint
  "Granted" green and "Denied" red instead of handing both series the next two
  positions in the categorical ramp, which said nothing about what either series
  means.

  The resolution lives in ONE place, `seriesColor(tokens, series, i, tone)` in
  `charts.styles.ts`: a series' own tone first (success > destructive, the
  chart-level precedence), then the chart-level tone for a single-series chart,
  then the ramp position. It mirrors `rowFill`'s slot > tone > ramp resolution,
  and every consumer of a `ChartSeries` colour routes through it: the shared
  cartesian `colorOf` (LineChart, AreaChart, ComposedChart, RangeAreaChart), the
  grouped Chart's bars, value flag, and legend, RadarChart's polygons, and
  CandlestickChart's overlays. So the plot, the flag, and the legend cannot drift
  apart.

  A series that sets neither boolean renders byte-identically to before, and the
  chart-LEVEL tone props stay single-series-only: their dev warning now points at
  the per-series booleans, which are the sanctioned channel for that intent.

## 2.45.0

### Minor Changes

- 7e6910a: Navbar: brand element and trailing actions slots.

  Minor justification (new public capability): Navbar gains brandContent and a
  free-form trailing actions slot for console topbars; existing
  brand/links/actionLabel/avatar API unchanged. `brandContent` takes any ReactNode
  and LEADS the existing left cluster, so a logo mark renders ahead of the `brand`
  wordmark or stands in for it entirely; `actions` takes any ReactNode and LEADS
  the existing right cluster, ahead of the built-in `actionLabel` button and
  `avatar`, so a bar can carry a ghost search button with a Kbd chip, ghost icon
  buttons, a notification dropdown and an AvatarMenu. Both slots are direct
  children of the group rows already in the skins, so they take those rows' own
  gap and no skin field changed.

  `links` and `brand` are now optional. A bar with no middle nav renders neither
  the links row nor the narrow menu button that stands in for it, so the automatic
  at-and-below-`sm` collapse can no longer produce a hamburger opening an empty
  menu; with links present the collapse is unchanged, and a trailing `actions`
  slot never folds into that menu. Every existing call site renders exactly as
  before.

## 2.44.0

### Minor Changes

- 8753225: Sidebar: error-tone item badges.

  Minor justification (new public capability): Sidebar item badges can carry the
  error status tone for alert counts (badgeError), defaulting to secondary. A
  `SidebarItem` may now set `badgeError` beside its `badge`, and the row renders
  that count through the Badge atom's error status pill (`<Badge status error>`,
  the red dot-and-label form) instead of the default secondary metadata pill, so a
  Security row can report lockouts as a problem rather than a volume. The flag is
  an item-level boolean on the data object, following `RowMenuItem.destructive`,
  and it reaches both presentations of the same row: the rail and the narrow
  drill-down leaf. A row that omits it, or sets it with no `badge`, renders exactly
  as before, and the collapsed rail still folds the count into the row's accessible
  name.

## 2.43.0

### Minor Changes

- 39f1acd: ActionPanel: embedded children between the copy and the action.

  Minor justification (new public capability): ActionPanel accepts children
  rendered between its copy and action, so settings panels can embed field rows.
  `ActionPanelProps.children` is a `ReactNode`, and where it lands follows the
  layout the panel already resolves: stacked, it joins the panel's gap column
  between the copy and the action, so each element of the block is spaced by the
  skin's stacked gap; inline and in toggle mode the action stays pinned beside the
  copy, so the block renders full width below that row on the same rhythm. No skin
  field was added, and a panel that passes no children renders exactly as before.

## 2.42.0

### Minor Changes

- d2d6fa2: Feed: optional icon lead in the connector node.

  Minor justification (new public capability): Feed items may lead with a kit icon
  glyph in the connector node (icon over initials over dot); actor/action/target
  untouched. `FeedItem.icon` names a glyph from the kit icon set
  (`items={[{ icon: "shieldCheck", ... }]}`, typed `IconName`) and renders through
  the `Icon` atom, muted and decorative at 16pt inside the existing 28pt node, so
  an audit or automation stream no longer has to spell a system event as a pair of
  initials. The avatar lead ignores `icon` and keeps leading with the person; items
  that pass no `icon` render exactly as before.

## 2.41.1

### Patch Changes

- 871beea: Container measurement stops breaking hydration in server-rendered apps.

  `useContainerWidth` fell back to the window width before the first layout, and
  `useContainerBreakpoint({ seedViewport: true })` seeded from it the same way.
  On a server render there is no window, so the fallback resolved to 0 and a
  `Grid` shipped its cells with no width; on the client the window is available
  during the hydration render, so the very same cells resolved an explicit pixel
  width. React reported a hydration mismatch and, as it warns, did not patch the
  attributes up.

  Both now withhold the window value for one render, so the hydration pass is
  byte-identical to the server markup and the real width lands in the commit
  immediately after. This is the contract `ThemeProvider`'s `ssrScheme` already
  gives the colour axis. Client-only apps are unaffected: they see the fallback
  from their first commit exactly as before.

## 2.41.0

### Minor Changes

- 6129f30: `BreakpointOverride`: pin the viewport tier for a subtree.

  Minor justification (new public API): wrapping a subtree in
  `<BreakpointOverride value="sm">` makes the `useBreakpoint` / `useResponsive`
  / `useFormFactor` consumers under the provider resolve that bucket instead of
  the real window, so a preview stage or a test can exercise a phone or tablet
  branch inside a desktop window; `value={null}` clears the simulation. Two
  boundaries: mount it ABOVE your OverlayProvider when portaled overlay content
  should simulate too (the kit Portal renders overlays at the provider's
  outlet), and pair it with a width constraint on the same subtree, since
  container-measured components follow their real measured width (the docs
  playground's form-factor switcher does both).

- 9e1f1a7: ButtonGroup: icon segments.

  Minor justification (new public capability): an item may pair its label with a
  kit glyph (`items={[{ label, icon }]}`, new `ButtonGroupItem` type; strings
  keep working untouched), and the group-level `iconsOnly` boolean renders each
  segment as its glyph alone with the label as the segment's ACCESSIBLE name, so
  an icon-only segmented control (a view switcher, the docs' form-factor
  switcher) needs no hand-rolled look-alike. Glyph color tracks each platform
  skin's segment label treatment (new `segmentIconColor` skin field); the
  stepper and split kinds cycle the labels and ignore icons, with dev-only
  warnings on misuse.

## 2.40.5

### Patch Changes

- 43a4d67: Fix Steps `stacks` falsely stacking inside a row parent. The `stacks`
  measurement was attached to the horizontal root itself, but in a row parent
  that root hugs its content, so the first real layout measured the hugged width
  (well below the `sm` breakpoint) and Steps stacked vertically even in a wide
  container, flickering back through the horizontal layout on every relayout
  because the stacked branch spans full width. The measurement now rides the
  out-of-flow `containerProbe` sibling (the Tabs `responsive` fix's mechanism),
  rendered in both states so the stacked branch also tracks the real container
  width and un-stacks when the container widens.

## 2.40.4

### Patch Changes

- 712a574: The web hand-off's base rules move into `@layer base`, so an app can override them.

  `styles/tokens/base.css` emitted `*`, `body`, `a`, and `a:hover` unlayered. An
  unlayered rule outranks every layered one regardless of order, so a consuming
  app could not restyle an anchor at all: `a{color:var(--primary)}` beat
  `.text-primary-foreground`, and an anchor carrying a button's fill painted its
  label in the link colour, which is invisible on a primary fill. The same rules
  inside `@layer base` still win over a framework reset (they are imported after
  it, and layers resolve in declaration order) while losing to the component and
  utility layers. The `@keyframes` blocks stay unlayered, since layers order
  keyframe-name resolution too.

## 2.40.3

### Patch Changes

- f77ad4f: Fix responsive vertical Tabs flattening in wide containers. The `responsive`
  measurement was attached to the vertical rail itself, but the rail hugs its
  content (~180px), so the first real layout always measured at or below the `sm`
  breakpoint and the rail latched into the horizontal underline look even in a
  wide desktop container. The measurement now rides an out-of-flow container
  probe (a zero-height, absolutely positioned sibling that spans the parent,
  shared as `containerProbe` in the style layer), rendered in both states so the
  flattened row also tracks the real container width and restores the rail when
  the container widens.

## 2.40.2

### Patch Changes

- 2ae18cb: Tabs: a non-block underline/pills row longer than its container now pans
  horizontally instead of clipping (an inert-when-fitting horizontal scroller,
  no new prop; effective at any container width). Selecting a tab by press,
  roving arrow key, or a controlled `active` change scrolls it fully into view
  with a neighbor peek, honoring reduced motion. `block` and `vertical` are
  unchanged, and a flattened `responsive` vertical gains the same treatment.

## 2.40.1

### Patch Changes

- dc7bdc8: Docs examples never overflow a phone: 29 fixed-width example style objects
  across 7 component `.md` files (reveal, skeleton, divider, card, slider, chart,
  stacked-bar) now carry `maxWidth:"100%"`, and a new docgen guardrail hard-fails
  any future fence that pins a numeric width of 280 or more without a `maxWidth`
  (the existing `docgen-allow-style` opt-out still applies).

## 2.40.0

### Minor Changes

- ca16126: Pointer-capability hooks: `usePointerCoarse()` and `useHoverCapable()`.

  Minor justification (new public API): the input half of the desktop form
  factor (macOS via the web skin, and desktop web). Native iOS/Android resolve
  as touch-first constants; the web reads the standard `(pointer: coarse)` and
  `(hover: hover)` media features live, so an iPad browser, a touch laptop, and
  a mouse plugged into a tablet all resolve correctly. SSR and the pre-effect
  first frame default desktop-first (fine pointer, hover-capable). Capability
  only: no component behavior changes.

## 2.39.0

### Minor Changes

- d40e41b: Structural narrow modes: Navbar auto-collapse, Steps `stacks`, Tabs
  `responsive`, FilterPanel `responsive` drawer, GridList container basis.

  Minor justification (new capabilities and props):

  - Navbar now collapses AUTOMATICALLY at and below the `sm` container width: the
    links row swaps for a kit-owned menu button opening the platform Dropdown
    (active link checkmarked; `active`/`onSelect` unchanged). No new prop, and a
    deliberate default-behavior decision: the previous narrow rendering was a
    plain row clipping links off-screen, so there was no working behavior to
    preserve. GlassSurface gained an `onLayout` passthrough to support the bar
    measuring itself.
  - Steps: opt-in `stacks` + `stackBreakpoint` (default `sm`) renders the
    EXISTING vertical layout when the component's own container is narrow
    (horizontal layout only; `vertical`/`progress` unaffected).
  - Tabs: opt-in `responsive` renders a vertical rail as the existing horizontal
    underline look at and below `sm` container width.
  - FilterPanel: opt-in `responsive` + `drawerBreakpoint` (default `sm`) collapse
    the docked panel to a kit-owned "Filters (n)" outline Button opening the
    panel in a start-edge Drawer; `open`/`defaultOpen`/`onOpenChange` drive it
    for controlled use.
  - GridList's narrow collapse now measures its OWN container (viewport-seeded)
    instead of the window, so grids inside narrow desktop columns collapse too.

## 2.38.0

### Minor Changes

- 6c6147b: Responsive layout primitives: Row `stacks` and the new `Grid`.

  Minor justification (new public capability):

  - `Row` gains `stacks` (+ `stackBreakpoint`, default `sm`): the row renders as
    a Column when its OWN container is at or below the breakpoint,
    container-measured with a viewport seed, so it stacks inside a narrow desktop
    column too. When stacked the Row is exactly the Column with the same props
    (gap/justify/align/padding apply to the new axes, `wrap` is inert). Children
    keep their own sizing, which makes `stacks` the tool for content-sized rows
    (toolbars); ignored with a DEV warning on Column.
  - New `Grid` + `GridItem`: the container-measured auto-fit tile grid.
    `minTileWidth` (default 240) sets the floor, `columns` caps the desktop
    count, the gap scale is Row/Column's own booleans, and `GridItem wide` spans
    two cells. Pure math (`gridColumns` / `gridCellWidth`, exported) resolves the
    count from the measured container: no breakpoints at the call site, one
    measurement per grid, zero hooks per tile.

## 2.37.4

### Patch Changes

- da32627: Form `twoColumn` stacks by CONTAINER width; Sidebar warns on phone-width rails.

  - Form's two-column collapse now measures the form's own row wrapper instead of
    the window, with a threshold of one `wide` field (480px): a two-up split
    narrower than that cannot give each column a usable field. Behavior change,
    flagged: a `twoColumn` form inside a narrow desktop column (a split pane, a
    docs 3-up) now stacks where it previously stayed two-up and crushed; forms
    560px and wider keep their two-up layout everywhere. New public hook riding
    along: `useContainerWidth()` (own width with a window fallback until the
    first layout).
  - Sidebar: a non-`responsive` sidebar rendering at a phone-width viewport now
    logs a one-time DEV warning pointing at the `responsive` prop; the rail is
    unusable chrome there and the drawer needs a consumer-wired hamburger, so the
    gap is surfaced instead of silently rendering a 240px column.

## 2.37.3

### Patch Changes

- 0c5e629: GridList: the virtualized path now collapses to one full-width column at phone
  widths, matching the eager path; previously it kept 2-3 FlatList columns of
  100%-wide tiles. The grid also resolves its responsive tile width once at the
  parent instead of once per tile, so an N-tile grid carries one viewport
  subscription instead of N.

## 2.37.2

### Patch Changes

- 62ff81b: Measured narrow-container fixes for Calendar, DataTable, DescriptionList, and
  Board.

  - Calendar month: the grid container is now capped at 100% of its parent and
    the seven day cells shrink fluidly (32px floor) when the measured container
    is narrower than the natural grid, so a month calendar fits a 320pt phone
    instead of overflowing. Week/day timelines are untouched (they already
    flexed).
  - DataTable: the 320px minimum-width floor now drops once the table has
    measured a container narrower than the sm breakpoint, where the existing
    collapse/pan machinery guarantees readability; previously the floor clipped
    on 320pt devices.
  - DescriptionList `twoColumn`: the fixed 160px term column narrows to 120px at
    phone widths (restores the pre-refactor behavior lost when Field's display
    rows moved here), keeping the value column readable.
  - Board: lanes now fit a measured narrow board (lane fills the width minus a
    32pt peek of the next lane, 240px floor) instead of staying at the configured
    300px regardless of screen size; `columnWidth` still sets the desktop lane.

## 2.37.1

### Patch Changes

- 29b6955: Fix fixed-width surfaces overflowing narrow containers (phone screens).

  - AnchoredOverlay now clamps a width-aware card to its outlet: when the outlet
    is narrower than the card plus its edge insets, the card renders at outlet
    width minus the insets instead of running off-screen. Popover passes its card
    width through (new `cardWidth` field on `PopoverSkin`), so popover cards and
    the calendar peek both fit phone-width outlets; the popover skins also carry
    `maxWidth:"100%"` for the inline mode.
  - FilterPanel's fixed panel (280 web/iOS, 256 Android) and the Sidebar rail
    (240) gain `maxWidth:"100%"`, so they shrink inside narrower parents.
  - Vertical Tabs' fixed 180px rail now flexes down (96px floor, never past 40%
    of the row) and its labels truncate to one line, keeping the panel usable in
    narrow containers.

## 2.37.0

### Minor Changes

- 9a2f024: Container-measurement primitives: `useMeasuredWidth()` and
  `useContainerBreakpoint()`.

  Minor justification (new public API): the middle tier of the responsiveness
  system. `useMeasuredWidth` measures the element its `onLayout` is attached to
  (stable handler, re-renders only on rounded-width changes);
  `useContainerBreakpoint` resolves a `Responsive` map against the element's OWN
  width instead of the window, with an optional `seedViewport` for
  above-the-fold grids. Components that switch layout should measure their
  container, not the viewport: a component cannot know whether it is on a phone
  or in a 320px desktop panel.

  Internal adoption, no behavior change: the six components that hand-rolled the
  identical trigger-measurement handler (Dropdown, Select, Autocomplete,
  Popover, RowMenu, ButtonGroup) and DataTable's own-width measurement now ride
  these hooks.

## 2.36.0

### Minor Changes

- fb55fe0: Responsive core: shared viewport breakpoint store and form-factor tier.

  Minor justification (new public API): `useBreakpoint()` (the active viewport
  bucket), `FormFactor` / `formFactor(width)` / `useFormFactor()` (the semantic
  phone / tablet / desktop tier over the breakpoints, where desktop covers macOS
  and desktop web), and a `ssrBreakpoint` prop on `ThemeProvider` (the
  `ssrScheme` contract applied to the viewport axis).

  Behavior fixes riding along:

  - `responsive()` / `useResponsive()` now resolve a non-positive width (SSR and
    the pre-layout first frame, where react-native-web reports 0) to `base`, the
    desktop variant. Previously width 0 matched the smallest declared breakpoint,
    so servers and first frames rendered the PHONE branch of every consumer on
    desktop. The kit is desktop-first; unknown viewport now means desktop.
  - All viewport hooks share ONE Dimensions subscription and re-render consumers
    only when the active breakpoint bucket changes, not on every resize event.
  - `breakpoints` is now typed `Record<BreakpointKey, number>`, so indexing it
    with an arbitrary string is a compile-time error instead of a silent
    `undefined`.

## 2.35.3

### Patch Changes

- 53b9aef: InputOTP no longer paints its raw code across the middle of the row on Android.

  The single text input that captures the keystrokes sits over the whole segmented
  row and is meant to be invisible, with the cells doing the drawing. It was
  hidden with `color: "transparent"`, which Android does not honour, so the code
  being typed was painted in the default text colour across the centre of the
  field, on top of the cells. It is hidden with `opacity: 0` now, which every
  platform honours and which changes nothing else: an opacity-0 view still takes
  touches, still focuses, and is still read by assistive tech.

  Caught by the landing-page hero capture, which had been shipping the artefact in
  `input-otp-android.webp` for as long as those shots have existed.

## 2.35.2

### Patch Changes

- 36e45ce: Add a render-based colour check: `bun run check-render`.

  The kit already had two colour guards and both were structurally blind to the same class of error.
  `validate-tokens` compares `styles/tokens/colors.css` to `src/style/tokens.ts`, and `check-parity`
  compares the built types to a committed snapshot. Both sides of both checks live behind this
  commit, so they can only prove the kit is internally consistent. That is exactly how the `--ring`
  error survived: the CSS and the JS agreed with each other while both diverged from the design
  source, and nothing could see it for as long as they agreed.

  This check renders the hand-off's own colour guideline cards in chromium and reads the painted
  pixels, then compares them against the shipped tokens. One side of the comparison is an input
  nobody here can edit into agreement. Rendering rather than parsing also matters: a text parse gets
  `var()` chains, `color-mix(in oklab, …)` and out-of-gamut clipping wrong, while the browser
  resolves all three and a painted pixel is what a user actually sees.

  Verified by faithfully reproducing the ring bug — putting the wrong light `--ring` into BOTH the
  CSS and the JS so they agree, as they historically did. `validate-tokens` passes, `check-parity`
  passes, and this check reports the drift.

  Two legs, and the difference is stated wherever a reader will meet it. `--handoff <path>` renders
  the real export and is authoritative; the default renders a vendored copy under
  `tools/render-parity/handoff/` so CI can run at all. The vendored copy is itself behind this commit,
  so a green CI proves only that the kit has not drifted from the snapshot — refreshing that copy when
  the hand-off changes is where the real comparison happens.

  One accepted difference is recorded in `baseline.json`: dark `warning` is one step apart on the blue
  channel at a rounding boundary, where the exact conversion gives 9.4506 and Chrome paints 10.

  Patch: repository tooling, no change to the published package.

## 2.35.1

### Patch Changes

- 0311e9b: StackedList: the row divider takes `pointerEvents` from a style rather than the
  deprecated prop.

  The hairline between ruled rows was rendered as `<View pointerEvents="none">`.
  React Native has deprecated that prop in favour of `style.pointerEvents`, so
  every render of a ruled list logged "props.pointerEvents is deprecated. Use
  style.pointerEvents", including once per run of the kit's own console gate in
  `test/no-console-violations.test.tsx`.

  The declaration now comes from a module-level `StyleSheet.create`, composed onto
  the divider alongside the skin's hairline style. That is the kit's existing
  convention for this property (see `src/charts/shared/chart-inspect.tsx` and
  `src/organisms/toast/toast.shared.tsx`): react-native-web compiles
  `pointerEvents` into an atomic class only from a registered stylesheet entry and
  silently drops it from an inline style literal, so the registered form is the one
  that keeps the hairline inert to touch on web.

  Behaviour is unchanged on every platform. The divider still carries
  pointer-events none, verified in the rendered web output.

## 2.35.0

### Minor Changes

- ab32446: Backdrop: `twinkle` now scintillates individual bodies instead of fading the whole
  layer, and adds a `scintillate` channel to the exported clock.

  The minor is for the new public API: `BackdropClock` gains `scintillate`, a linear
  0..1 sawtooth at the flare period that an application's own `Backdrop.Custom` art
  can bind to the same way it already binds `flight`, `drift` and `event`.

  The effect itself was close to invisible, and the reason was structural rather than
  a matter of tuning. A twinkling layer multiplied ONE shimmer value into its single
  wrapper, so every body in the field rose and fell together over a 0.55..0.95 range.
  A field that changes brightness as a unit is a global luminance change, and the eye
  adapts straight through it; widening the range would only have made the whole sky
  pulse.

  Twinkling is now differential. A twinkling field is dealt into nine phase buckets by
  a hash of the body index (a hash, not `i % k`, because fields are generated on
  lattices and every k-th body would otherwise land on a regular sub-grid that flashes
  as a pattern). Each bucket is its own Animated.View over its own static Svg, riding
  the shared `scintillate` ramp at its own offset, through a flare curve with a fast
  attack and a long rest. Neighbouring bodies therefore flare at unrelated moments.
  Bodies big and bright enough to have earned one also carry a diffraction glint and a
  white core that ride the same curve, so a flaring star briefly grows spikes and goes
  hot rather than merely getting less transparent, which is what makes the effect read
  at two or three pixels across.

  The flare peaks exactly AT the layer's prominence cap rather than above it, so the
  legibility budget in `backdrop.styles.ts` still means what it says; the added
  contrast comes from the resting floor. Aggregate luminance behind text goes down,
  not up. The Reduce Motion poster still fans the buckets across the flare curve, so
  the still frame is a sky of bright and faint stars rather than one flat field.

## 2.34.0

### Minor Changes

- b38abbf: InputOTP matches the design hand-off's contract and pins its caret.

  Minor because it adds four public capabilities to `InputOTP`:

  - `groups`: split the run into dash-separated chunks (`length={6} groups={3}`
    reads 123-456). On the web skin, which connects cells within a run, each
    chunk now closes and rounds its own ends.
  - `alphanumeric`: accept letters as well as digits and ask for the text
    keyboard. The hand-off spells this as `numeric` with a `true` default, which
    reads backwards against the semantic-prop rule that passing a prop turns it
    on, so Canvas names the inverse (the `hideLegend` / `hideGrid` precedent).
    The default is unchanged: digits only.
  - `defaultValue`: seed the uncontrolled field, cleaned exactly as typed input
    is. Brings InputOTP in line with Input, Select, Autocomplete and Accordion.
  - `autoFocus`: focus on mount, matching Input's `TextEntryProps`.

  It also fixes a behaviour bug. One invisible text input spans the whole
  segmented row, so a tap dropped the native caret wherever the pointer landed,
  which on a partly-entered code is the middle of the string: typing 12, clicking
  the first cell and typing 9 produced 912 rather than 129. The selection now
  sits at the end of the code, so a keystroke always lands in the first unfilled
  cell. A full-range select-all is left alone, so pasting still replaces a
  complete code.

## 2.33.3

### Patch Changes

- fa3f618: ActionSheet: the backdrop now fades in instead of sliding up with the sheet.

  React Native's `Modal animationType="slide"` transforms the whole modal window,
  and the dimmed scrim lives inside it, so the backdrop used to travel up from the
  bottom edge along with the sheet. ActionSheet now drives the motion itself
  (`animationType="none"`, matching Drawer): a stationary full-screen dim layer
  fades from transparent to the skin's alpha while only the sheet slides on
  translateY. The Modal stays mounted through the exit so the slide-out is visible,
  then unmounts, and reduced-motion settings collapse both to zero duration.

## 2.33.2

### Patch Changes

- a177642: Move `Sparkline` from atoms to charts. It is the only component in `atoms` that took a data series
  (`values: number[]`); everything else there renders a single value or none. It now sits beside the
  other bare marks it belongs with, `StackedBar` and `BarList`.

  No API change: the export, its props and its rendering are untouched, and `/components/sparkline`
  is still its docs URL. What moves is the source directory, the barrel it exports from, and its
  grouping in the docs sidebar.

  This is a deliberate divergence from the design hand-off, which files `Sparkline` under atoms. The
  hand-off's own line puts anything needing a legend to be read (`StackedBar`, `Gauge`, `Heatmap`) in
  charts and leaves `Sparkline` out because it shows shape rather than values. That line is
  defensible, but plotting a series is the stronger signal, and grouping the kit's only
  series-plotting atom away from every other series-plotting component made it hard to find. Note
  that `check-parity` compares the prop surface only and does not compare tiers, so this divergence is
  recorded here rather than in `HANDOFF-PARITY.md`.

## 2.33.1

### Patch Changes

- 73e0024: `CodeBlock` paints an opaque surface.

  Its fill was `alpha(muted, 0.5)`, translated literally from a Tailwind `bg-muted/50` in the kit's shadcn-era origins, so a code block sitting over any backdrop showed it straight through the code: a photo, a gradient, or the glass surface mode's own aurora wash. The design hand-off paints this surface flat `var(--muted)`, and a code block is a content surface, which the kit's glass model deliberately leaves solid. The zebra tints, the inline code chip and the terminal chrome are unchanged; only the block's own panel fill moved.

## 2.33.0

### Minor Changes

- 6a57060: Menus are opaque cards in glass mode, and glass stops rewriting a semantic token.

  Glass used to work by overriding one semantic token: `popover` became translucent, and since `GlassSurface` takes its under-fill from that token and `AnchoredOverlay` renders every anchored card through it, every option-list menu in the kit inherited the translucency. Measured on a rendered page, a menu painted `rgba(255, 255, 255, 0.72)` over an SVG lens that deliberately keeps its centre optically flat, so the page behind read straight through between the rows. The design hand-off never did this: its `--popover` is opaque in both schemes, and glass paints from a separate `--glass-tint`.

  So the material now carries its own fill. `glassByScheme` publishes `glass-tint` (`rgba(255, 255, 255, 0.20)` light, `rgba(22, 22, 28, 0.30)` dark, both read from `styles/tokens/colors.css` and cross-checked by `validate-tokens` so the two layers cannot drift), `GlassSurface` defaults its under-fill to that instead of to `popover`, and `popover` and `card` keep their opaque values in every mode. The shipped CSS matches: the `[data-surface="glass"]` popover swap in `styles/tokens/surface.css` is gone, which also means the reduced-transparency and increased-contrast fallbacks genuinely turn the material off now, where before they resolved back to the translucent value.

  Which surfaces take the material follows the hand-off. Popovers, dialogs, action sheets, the command palette, navbars, tab bars and the sidebar are glass. The option-list menus (Dropdown, Select, Autocomplete, AvatarMenu, SplitButton's overflow menu), alert dialogs, toasts and chart tooltips are opaque cards, because a surface a reader picks rows from has to stay legible over whatever is behind it. Content surfaces stay solid as before.

  Breaking for one caller shape, which is why this is a minor rather than a patch: `glassByScheme` changed from `Record<ColorScheme, Partial<ColorTokens>>` to a `GlassTokens` family, so code reading `glassByScheme.light.popover` should read the opaque `colorsByScheme.light.popover` instead. The internal `ToastSkin.solidSurface` flag was removed, which is a skin field rather than a component prop.

## 2.32.0

### Minor Changes

- 072a91e: `Avatar` gains a `tiny` size step, and `AvatarMenu` now hangs its menu from the pill's trailing edge by default.

  New user-visible capabilities (the reason this is a minor, not a patch): a fourth boolean on Avatar's size axis, and a new `alignStart` boolean on AvatarMenu.

  - **`Avatar tiny`** is the 24px disc, joining `small` (28), the default (40), and `large` (48). Precedence on the axis is `tiny` > `small` > `large`. It keeps the 12px initials rather than scaling on down, because a proportional 10px pair of initials stops reading at that diameter. `AvatarGroup` takes it too, with its own overlap row, so a stack of tiny avatars stays uniform.
  - **`AvatarMenu` uses it for the pill's disc**, which is the fix this step exists for: the capsule is 32 / 36 / 40 tall on web / iOS / Android, so a 24px disc restores the intended 4 / 6 / 8 inset. With the 28px `small` disc it had been using, the web pill left only 2 and read as a tight ring around the photo.
  - **`AvatarMenu alignStart`** hangs the menu from the pill's leading edge.

  Behavior change to note when upgrading: `AvatarMenu`'s alignment default is now the TRAILING edge, where it was the leading edge in 2.30.0. A topbar parks the account pill at the trailing edge, and a leading-aligned menu there runs off the surface, so the trailing edge is what the design calls for and what almost every call site was already passing `alignEnd` to get. `alignEnd` still works and still means the same thing (it now spells out the default); pass the new `alignStart` for the old behavior. Plain `Dropdown` is untouched and still defaults to its leading edge.

  Also corrected against the design hand-off: the pill's open fill on web is now the real `color-mix(in oklab, ...)` (computed through a new `mixOklab` colour helper) instead of an sRGB channel lerp that landed 2/255 per channel too light in both schemes, and a disabled `Dropdown` trigger or row on iOS now dims to 0.4, the platform's own disabled opacity, instead of the web's 0.5.

### Patch Changes

- 072a91e: `AvatarMenu` opens its own platform's menu, and stands off by the hand-off's 6px.

  The pill rendered per platform while the menu under it did not: `avatar-menu.shared.tsx` imported `Dropdown` from the barrel, and a bare import resolves the web module in a browser bundler, so the docs' iOS and Android rows opened the web menu. Measured on the page before the fix, all three rows reported the web row metrics (0 min-height, 6px/8px padding, 2px row radius) where the plain Dropdown page reported three distinct skins (44pt iOS rows, 48dp Android, web). `createAvatarMenu` now takes the Dropdown to render, and each avatar platform entry builds it from that platform's own dropdown skin, the same injection `createEmptyState(iosSkin, ButtonIOS)` already uses. On a device Metro resolved this correctly either way, so this was the web preview and any web consumer, not native.

  The menu's standoff moves onto `DropdownSkin` as `menuGap` (4 on all three skins, the value the shell used to hard-code) and the account pill's menu is built at the hand-off's 6. It is skin-owned deliberately: a caller-facing pixel spacing prop on a public component is the re-spacing escape hatch the kit bans, and "6 instead of 4" has no honest boolean name.

- 072a91e: `Dropdown`: the menu takes focus when it opens, hands it back when it closes, and names itself.

  Three accessibility defects in the WAI-ARIA menu pattern, all on the path every app and docs page runs (an overlay host is mounted, so the menu is portaled):

  - **Focus never entered the open menu.** Focus was moved in the same commit that flipped `open`, but a portaled card is held back until the trigger measurement lands, so there was no row to focus yet: the roving arrow keys were dead and the menu sat at the end of the tab order. `AnchoredOverlay` now reports `onCardMount`, fired from an effect inside the card's own subtree (after every row's ref is attached) on both the portaled and inline paths, and the first enabled row takes focus there. No polling, no timeout guess. The focus move passes `preventScroll`, so a menu that renders open from its first commit never yanks the page to itself.
  - **Closing dropped focus on `document.body`.** Escape, a row press, an outside tap, and a controlled close now all return focus to the trigger. A close that did not orphan focus (the app closes the menu after the user has tabbed on) leaves focus exactly where the user put it.
  - **The menu had no accessible name and its identity header was loose generic text.** The menu is named from the header's title, falling back to the section `label`; the header is a `group` (a valid child of `menu`) named from its two lines. It stays unfocusable and out of the roving-focus count, which is still `items.length`.

## 2.31.1

### Patch Changes

- 1612852: Hand-off parity: record the differences the check cannot detect, and state that limit in the report.

  `check-parity` compares the prop SURFACE. Where a name exists on both sides it counts the prop
  satisfied no matter what that name resolves to, so a scale or spacing drift passes silently. That
  blind spot is now written into the report rather than left implied, alongside the second limit:
  the check reads a committed snapshot of the hand-off, so it cannot tell you the snapshot itself has
  fallen behind the design source.

  The first entry is Avatar. The kit's diameters are `tiny 24 / small 28 / default 40 / large 48`
  against the hand-off's `small 24 / default 32 / large 40`, so the scale sits one step high
  throughout. `small` and `large` exist on both sides, which is exactly why the prop check reported
  them satisfied. It was found by measuring rendered avatars, not by this tool. Re-scaling shipped
  avatars would be a visual break for every consumer, so it is tracked rather than done.

  Patch: repository tooling and a generated report, no change to the published package.

## 2.31.0

### Minor Changes

- 2ee9b65: `Dropdown` takes `triggerLabel`, the accessible name for a custom trigger.

  New user-visible capability (the reason this is a minor, not a patch): a custom trigger passed as `children` is a View, so nothing named the button that wraps it. The browser then names it from its contents, which reads the trigger's text nodes back to back with no punctuation and repeats the label of anything nested inside. An account pill announced as "Rachel Chenrachel.chen@example.com Rachel Chen" rather than "Rachel Chen, rachel.chen@example.com". `triggerLabel` puts the name on the button itself, where assistive tech reads it; omit it and the platform's own name-from-contents still applies, so triggers that read fine on their own are unchanged. The default `trigger` button is unaffected: its own text names it.

  `AvatarMenu` now passes its account name through this prop instead of labelling the capsule inside the button, which fixes the same announcement on every AvatarMenu.

## 2.30.0

### Minor Changes

- 914d333: Add `Field`, the form row that owns the message no control renders on its own.

  New user-visible capability (the reason this is a minor, not a patch): nothing in the kit could
  display a validation message. Every field family already owns its label, but helper and error text
  had no home, so callers hand-stacked a `Text` under an `Input` and drifted on the caption scale,
  the destructive tone, and the announcement. `Field` owns that slot: `helper` for the muted hint,
  `error` for the message, and `error` replaces `helper` in place so the row never changes height and
  nothing below it jumps.

  The load-bearing behavior is label delegation. When the row wraps a single field-family control
  (`Input`, `Textarea`, `Select`, `Autocomplete`) that carries no label of its own, `Field` hands the
  label and `required` down to it rather than drawing one alongside, so each platform still places it
  per its own contract: a static title above on web and iOS, the Material 3 in-container floating
  label on Android. A label rendered beside such a control could never float, which is exactly the
  Android divergence this avoids. Any other child (a `Switch`, a group) keeps the static label above.
  Delegation needs all three conditions — one element child, a label-owning control, and no label of
  its own — so two children, a plain view, or a control that already names itself all fall back
  safely rather than being clobbered.

  `Field` also delegates the error STATE, not just the text, so the control paints its destructive
  border while the row paints the message under it; an errored field that showed red text under a
  neutral box read as unfinished. The message is wired to the control with `aria-describedby` and
  announced with `role="alert"`, which the hand-off's own Field does not do.

  This supersedes 93dd68a9 ("remove Field and Fieldset"), and deliberately so. That removal was right
  about the component it removed: the old `Field` wrapped `Input` directly and carried a `rows`
  display mode that `DescriptionList` had already absorbed. This is a different component with a
  different reason to exist — the message slot and the label delegation, neither of which the removed
  one had. `Fieldset` stays removed.

## 2.29.0

### Minor Changes

- 8be8ba3: Add `AvatarMenu`, the account identity pill, to the Avatar family.

  New user-visible capability (the reason this is a minor, not a patch): the kit
  now ships the account-menu anatomy itself, so no app or topbar hand-composes one
  out of an `Avatar`, a hand-rolled name column, and a chevron. `AvatarMenu` is a
  single capsule trigger holding the avatar, the person's name over their email,
  and a trailing chevron that rotates while the menu is open, wired to the kit's
  own `Dropdown` for the menu (including its new identity header, so the name and
  email repeat above the rows).

  Boolean props follow the kit's semantic grammar: `compact` drops the name block
  for a topbar, `alignEnd` hangs the menu off the pill's trailing edge, and
  `disabled` makes the pill inert. The open state has the usual controlled and
  uncontrolled duality (`open` plus `onOpenChange`, interactive out of the box with
  neither), and `items` reuses the existing `DropdownItem` type.

  Per-OS metrics come from the platform skins: a 32px `secondary` capsule on web
  (with an `input`-coloured hairline and a 6% lifted fill when open), a 36pt
  hairline-outlined capsule on iOS that fills with `secondary` when open, and a
  40dp Material 3 tonal pill on Android (`primary` at 12%, 20% when open). The
  trigger announces itself as a menu button and takes its accessible name from the
  account holder, so a screen reader hears the person, not "button".

- 8be8ba3: Alert, Chip, and Toast take `destructive` for the danger tone.

  New user-visible capability (the reason this is a minor, not a patch): `destructive` is the name the intent axis already uses everywhere else in the kit, on Button, on AlertDialog, and on every chart, and it is the name the design hand-off uses on these three components too. Until now these three alone spelled it `error`, so a call site moving between a destructive Button and a destructive Alert had to change vocabulary mid-form.

  `error` keeps working, marked deprecated, and resolves through the same branch as `destructive`, so it paints exactly the same tone and no existing call site changes. Passing both is redundant rather than ambiguous: they share one branch, so the result is the danger tone either way, and the rest of the axis (`success`, `warning`, `info`, and the neutral default) is untouched.

- 8be8ba3: Give `Dropdown` an identity header, trailing-edge alignment, and a disabled trigger.

  Three new user-visible capabilities (the reason this is a minor, not a patch),
  all additive: a Dropdown that passes none of them renders exactly as before.

  `title` and `description` add an identity header block above the menu's rows: the
  title in the popover foreground, the description muted underneath, closed off by
  the card's own hairline before the first row. It coexists with the existing
  `label` section heading, which still sits between the header and the rows. The
  header is plain text, not a menu item, so it takes no tab stop and never enters
  the roving-focus count. The skins carry the gutter per platform (8 x 6 on web,
  16 x 6 on iOS, 16 x 8 on Android, each matching that skin's own section-label
  gutter) over one shared type scale.

  `alignEnd` hangs the menu off the trigger's trailing edge instead of its leading
  edge, for a trigger parked at the end of a bar where a leading-aligned menu would
  run off the surface. It holds on both paths: the inline anchor flips from a
  logical `start` inset to an `end` one, and the portalled path pins the card by an
  inset from the outlet's own edge (so no card measurement and no second layout
  pass). Both are logical, so a right-to-left locale mirrors them.

  `disabled` makes the whole control inert: the trigger dims by each platform's own
  disabled opacity, the press is a no-op, and a controlled `open` cannot force the
  menu out of a disabled Dropdown. The trigger carries `accessibilityState` and its
  `aria-disabled` alias, and both trigger forms now announce `aria-haspopup="menu"`
  alongside `aria-expanded`.

## 2.28.1

### Patch Changes

- 82b8a03: Add a hand-off parity check, so the component layer is guarded the way the token layer already is.
  `validate-tokens` compares every colour and metric against the design hand-off by value, but
  nothing compared the COMPONENT surface, which is how `Field`, `DashboardGrid` and `ChartFrame` sat
  absent from the kit without anything noticing.

  `bun run check-parity` compares the kit's built type surface against a committed snapshot of the
  hand-off's prop contracts and regenerates `HANDOFF-PARITY.md`. It deliberately does not demand
  identical prop names: Canvas's semantic-boolean rule rejects the string-enum props the hand-off
  uses freely, and React Native has no `onClick`. Every difference is adjudicated once in
  `tools/handoff-parity/divergences.json` as either settled (renamed, boolean axis, web-only, not
  offered) or an acknowledged open gap, and the check fails only on a difference recorded in
  neither place, so a hand-off revision surfaces loudly instead of silently.

  Resolving `extends` chains on the kit side is what makes the comparison meaningful:
  `AreaChartProps extends CartesianSeriesProps`, so an own-members-only read reports every inherited
  prop as missing and the result is noise rather than signal.

  Current state: 75 hand-off components, 72 present; 719 props compared, 503 matching by name, 151
  settled divergences, 65 tracked open gaps, 0 unclassified.

  Patch, not minor: this adds no capability to the published package. It is repository tooling plus
  a generated report.

## 2.28.0

### Minor Changes

- 69dac3f: Web hand-off: ship the `surface` and `density` theming axes, which the kit's own
  public API already assumed existed. `setSurface()` and `setDensity()` (exported
  from the package, alongside `getSurface`/`getDensity`) write `data-surface` and
  `data-density` onto the document element, but `styles/canvas.css` shipped no rule
  that responded to either attribute, so on the web both helpers were inert: they
  set an attribute and nothing changed. `styles/tokens/surface.css` and
  `styles/tokens/density.css` are now part of the stylesheet, imported between
  `platforms` and `motion` exactly as the design hand-off orders them.

  With them in place `data-surface="glass"` switches `--popover` to the translucent
  glass fill, sets `--surface-mode`, paints the orb backdrop the frosted panes
  refract, and carries the accessibility fallbacks that turn translucency off under
  `prefers-reduced-transparency`, `prefers-contrast: more`, and `print`.
  `data-density="compact" | "comfy"` remaps the padding steps (`--p-card-pad`,
  `--p-card-gap`, `--p-table-cell-pad-y`) to the values each platform skin already
  declares for that level, so compact under `data-platform="ios"` is iOS's own
  compact metric. Density moves padding only, never type size and never radius.

  Also adds the three z-index reserve tokens the hand-off carries in
  `spacing.css` (`--z-raised: 10`, `--z-dropdown: 40`, `--z-overlay: 50`), so a web
  consumer can layer against the same shallow scale the components use.

  Minor because it adds user-visible capability to a published export path: two
  theming axes a web consumer can now actually switch, and three new tokens. No
  existing token changed value. Verified by diffing all 2214 declarations in the
  hand-off against the shipped CSS (zero mismatches, zero missing) and by reading
  the computed custom properties out of a browser with each attribute applied.

## 2.27.1

### Patch Changes

- 404899a: Colors hand-off: condense the Liquid Glass commentary in `styles/tokens/colors.css`
  so the file fits its 2KB per-file gzip budget again. The file had crossed to 2089B
  against the 2048B cap, failing `check-size` on main. No token changed: all 78
  declarations are byte-identical, and only comment prose was removed.

  The block that shrank was the ~1KB Liquid Glass explanation, which restated at
  length what `src/style/glass-surface` implements and what the glass section of
  `CLAUDE.md` already documents. What a reader of the stylesheet actually needs
  stays: that glass is the functional layer's material and content surfaces remain
  solid, that it is a lens rather than a frost with the bend concentrated at the
  rim, and what `--glass-lens` and `--glass-frost` each are. The file now measures
  1834B gzip, so it carries 214B of headroom rather than the 34B it had before,
  which is what let a single comment edit push it over.

  A per-file exception was considered and rejected: `check-size.ts` justifies the
  `platforms.css` override precisely on the grounds that the 2KB guard must keep
  biting on `colors.css`, so excepting this file would undercut the reason the
  mechanism exists. Since the stylesheet ships to consumers, prose duplicated
  elsewhere is a cost every consumer pays to download.

## 2.27.0

### Minor Changes

- 4cd0950: Treemap: a new chart component for part-of-whole area tiles. Flat one-level `data` lays out through the shared squarified algorithm (Bruls; largest first, near-square aspect ratios, each rect staying attached to its datum's index), rendered as pure Views with no SVG: ramp-colored tiles separated by a card-colored hairline, with the label and formatted value rendered inside only when the tile fits them (measured through the shared text estimator; the card token contrasts with every chart fill). Pressing a tile selects it (the others dim to the shared inspection opacity), flags its value and share, and announces both; pressing between tiles clears; selection is controlled via `selected`/`onSelect` or uncontrolled via `defaultSelected`; `compact` shortens the plot and `formatValue` shapes the values. Nesting and drill-down are deferred scope, named here and in the docs. Minor because it ships a new user-visible chart component, `Treemap`, exported from `@nannier/canvas` (with the `TreemapDatum` type); no existing API changes. Like `Chart` it is a Shared platform treatment (identical on iOS, Android, and the web). Accessibility: the composition lives in the accessible name with values and shares ("Storage: Media 620 (62%), Backups 340 (34%), ..."), independent of which labels fit their tiles. devWarns cover empty `data`, more than 24 tiles, and negative values (zero area).

## 2.26.0

### Minor Changes

- c3a1a2c: FunnelChart: a new chart component for stage-by-stage conversion. Ordered `stages` render as a column of centered trapezoids through the shared funnel layout: each stage's top width proportional to its value, tapering to the next stage's width, the last stage rectangular, ramp-colored with real-text annotations centered on each stage (label, formatted value, and the conversion percent; the annotation text paints the card token, which the palette gates at 3:1 against every chart fill). The percent reads against the previous stage by default; `share` reads every stage against the first. Pressing a stage selects it by its vertical band (the others dim) with deduped announcements; selection is controlled or uncontrolled; `compact` shortens the funnel and `formatValue` shapes the values. Minor because it ships a new user-visible chart component, `FunnelChart`, exported from `@nannier/canvas`; no existing API changes. Like `Chart` it is a Shared platform treatment (identical on iOS, Android, and the web). Accessibility: the funnel is one image whose name walks the stages ("Signup funnel: Visits 1k, Signups 400 (40% of Visits), Paid 120 (30% of Signups)"). devWarns cover empty `stages` and a stage exceeding its predecessor.
- c3a1a2c: RadarChart: a new chart component for polygonal multi-axis comparison. Spoke labels come from `axes` (clockwise from 12 o'clock); each series draws one closed polygon through the shared polar helpers, ramp-stroked over a soft matching wash, on concentric polygon rings at nice tick fractions with a spoke per axis; the outer bound is a nice value above the data max, or the `max` override. Spoke labels render as real RN Text just beyond the outer ring, positioned from the same polar coordinates as the plot (never SVG text, matching the kit's chart typography rule). The tone axis applies to single-series charts (success > destructive, default primary); multi-series charts paint the chart-1..8 ramp with a reachable legend outside the plot image; `compact`, `hideLegend`, `hideGrid`, and `formatValue` behave as elsewhere. Press-to-inspect is deferred scope for this chart, named here and in the docs; the accessible name already carries every value. Minor because it ships a new user-visible chart component, `RadarChart`, exported from `@nannier/canvas`; no existing API changes. Like `Chart` it is a Shared platform treatment (identical on iOS, Android, and the web). Accessibility: the plot's name folds every axis and value per series ("Casey: Coding 8, Design 6, Comms 9; Jordan: ..."). devWarns cover empty `series`, fewer than three axes, an axes/values length mismatch, more than four overlapping polygons, and tone props on multi-series data.
- c3a1a2c: RadialBarChart: a new chart component for concentric attainment rings. One ring per `data` entry, innermost first: a muted full-circle track under a chart-1..8 ramp arc revealed clockwise from 12 o'clock (each ring is a stroked two-half-arc path, since an SVG circle's dash origin sits at 3 o'clock), all sweeping against one `max` (the largest entry by default) so the rings compare attainment rather than shares. A column legend carries the formatted values via `formatValue`; `compact` shrinks the disc; `hideLegend` drops the legend and hoists the image role to the root, StackedBar-style. Pressing a ring selects it by press radius (the others dim to the shared inspection opacity) and announces its share; pressing outside the rings clears; selection is controlled via `selected`/`onSelect` or uncontrolled via `defaultSelected`. Minor because it ships a new user-visible chart component, `RadialBarChart`, exported from `@nannier/canvas`; no existing API changes. Like `Chart` it is a Shared platform treatment (identical on iOS, Android, and the web). Accessibility: the composition lives in the accessible name ("Platform activation: iOS 64%, Android 48%, Web 82%"). devWarns cover empty `data` and more than six rings.

## 2.25.1

### Patch Changes

- 33f5213: The light `ring` token is the hand-off's indigo-500 (`#615fff`, `oklch(0.585 0.233 277.117)`) again, the same value the dark scheme already carried. An earlier pass read the shared value as a dark-mode leak and pointed light `ring` at the light `primary`, which made a focus outline the same colour as the primary fill it often sits on, so the ring vanished on exactly the control it was marking. The ring is deliberately one value in both schemes: it has to read against a light page, a dark page, and the primary fill. Both the CSS custom property and the JavaScript token now carry it, so a React Native call site and the web token layer agree.

## 2.25.0

### Minor Changes

- a688631: BoxPlot: a new chart component for comparing distributions. Each `data` category carries raw `values`; the chart computes the Tukey five-number summary (quartiles by linear interpolation, whiskers at the most extreme data inside the 1.5 IQR fences, outliers beyond) and draws the box, whisker spine with caps, median line, and hollow outlier dots per category on the cartesian frame, with the y domain hugging whisker ends and outliers rather than zero. Scrubbing a category flags Max/Q3/Median/Q1/Min and dims the others, with deduped announcements; selection is controlled or uncontrolled as on every cartesian chart. The tone axis resolves success > destructive (default primary); `compact`, `hideGrid`, `hideAxes`, and `formatValue` behave as elsewhere. Minor because it ships a new user-visible chart component, `BoxPlot`, exported from `@nannier/canvas` (with the `BoxSample` type); no existing API changes. Like `Chart` it is a Shared platform treatment (identical on iOS, Android, and the web). Accessibility: the plot's name gives each category its full summary ("us-east: median 46, quartiles 42 to 49, range 38 to 58, 1 outlier"). devWarns cover empty `data` and categories with fewer than 5 finite samples.
- a688631: Histogram: a new chart component for auto-binned frequency distributions. Pass raw sample `values`; the chart bins them into nice-edged uniform buckets (Sturges' rule by default, `bins` to override) and draws contiguous top-rounded bars on the cartesian frame's numeric x axis, with bars and press/scrub hit-testing both going through the frame's x scale (the frame nices the numeric domain, so bins neither start at pixel 0 nor tile the plot). Press or drag-scrub a bar to flag its range and count, with deduped announcements; selection is controlled via `selected`/`onSelect` or uncontrolled via `defaultSelected`, and the other bars dim while one is inspected. The tone axis resolves success > destructive (default primary); `compact`, `hideGrid`, `hideAxes`, and `formatValue` behave as on the other cartesian charts, with `formatValue` shaping bin edges in ticks, the flag, and the accessible name. Minor because it ships a new user-visible chart component, `Histogram`, exported from `@nannier/canvas`; no existing API changes. Like `Chart` it is a Shared platform treatment (identical on iOS, Android, and the web). Accessibility: the plot's name lists every bin with its bounds and tally ("Latency ms: 30 samples in 6 bins: 30 to 40 4, ..."). devWarns cover empty `values` and input with no finite samples.
- a688631: WaterfallChart: a new chart component for the running-total bridge (a P&L walk, a headcount bridge). Each step floats from the running total by its signed `value`; a `total` step draws an absolute bar from zero, either snapshotting the running total (omit `value` or pass 0) or opening/re-basing it to a non-zero `value` (the "Q2 total, then the walk, then Q3 total" authoring shape). The coloring is fixed semantics rather than a prop, so every bridge reads the same way: rises green, falls red, totals the brand primary; hairline connectors link each bar's end to the next bar's start. Scrubbing a step flags its change and running total (totals flag just the total) and dims the others, with deduped announcements; selection is controlled or uncontrolled as on every cartesian chart; `compact`, `hideGrid`, `hideAxes`, and `formatValue` behave as elsewhere. Minor because it ships a new user-visible chart component, `WaterfallChart`, exported from `@nannier/canvas` (with the `WaterfallStep` type); no existing API changes. Like `Chart` it is a Shared platform treatment (identical on iOS, Android, and the web). Accessibility: the plot's name walks the bridge ("Q2 total 4.2k, New up 980 to 5.2k, Churn down 540 to 4.6k, Q3 total 4.6k"). devWarn on empty `steps`.

### Patch Changes

- a688631: Colors: align every semantic color token in `src/style/tokens.ts` with the web
  hand-off (`styles/tokens/colors.css`), which is the source of truth for what the
  tokens ARE. The hand-off authors its values in `oklch()`; the JS token set carried
  hand-transcribed Tailwind v3 hexes instead, so the two sides had drifted on 13
  values and a component painted one color natively while the CSS published another.
  Six of those were plainly visible: `destructive` was `#dc2626` light / `#ef4444`
  dark against the hand-off's `#e7000b` / `#ff6467`, and `primary` (with `ring`,
  which tracks it) was `#4f46e5` / `#6366f1` against `#4f39f6` / `#615fff`. The rest
  were sub-perceptual: `primary-foreground` and `destructive-foreground` resolve to
  `#fafafa` rather than pure white, and `muted-foreground` and `warning` shift by one
  or two 8-bit steps. Every token now carries the exact sRGB rendering of its
  hand-off `oklch()`, so a native build and a web build paint the same pixel.

  The `chart-1..8` series, the fixed brand constants, and the Tailwind v3 `palette`
  steps were already in agreement and are unchanged.

  `scripts/validate-tokens.ts` now cross-checks the two sides by VALUE, converting
  each `oklch()` declaration back to sRGB and failing the build on any difference.
  It previously checked only that every JS token NAME existed in the CSS, which is
  what let the values drift apart unnoticed.

  Patch, not minor: no new component, API, option, or platform. This corrects
  existing token values to the specification they were always meant to carry.

## 2.24.0

### Minor Changes

- 0bb0f0e: ComposedChart: a new chart component for mixed marks on one categorical axis. Each series extends `ChartSeries` with per-series `line` and `area` booleans (precedence line > area > bars, first match wins): bar-kind series split each band as grouped columns with the 2px spacer, area-kind series paint a gradient wash behind everything, and line-kind series stroke on top, with `dots` marking line/area data points (auto-suppressed when bands drop under 14px, matching LineChart) and `curved` bending the paths. The chart rides the shared cartesian core, so it inherits the whole contract: one zero-based y axis (a dual axis is named deferred scope), the chart-1..8 series colors, scrub-to-inspect with the value flag and deduped announcements, controlled and uncontrolled selection, the reachable legend outside the plot image, `compact`, `hideLegend`/`hideGrid`/`hideAxes`, and `formatValue` flowing into the accessible name that folds every series and value. Minor because it ships a new user-visible chart component, `ComposedChart`, exported from `@nannier/canvas` (with the `ComposedSeries` type); no existing API changes. Like `Chart` it is a Shared platform treatment (identical on iOS, Android, and the web). The docs point bar-only grouped data at the bar `Chart`'s grouped mode; composed earns its keep when the marks mix.
- 0bb0f0e: RangeAreaChart: a new chart component for min/max envelopes (forecast bands, error envelopes, daily ranges). Each label carries a `{ low, high, mid? }` range: the band renders as a translucent tone wash between the low and high edges (`areaBandPath`), the optional mid values draw a solid line through it, and `curved` bends both with the monotone cubic. The y domain hugs the data rather than anchoring at zero, since an envelope is a range idiom; the frame nices it. Scrub-to-inspect selects a column and flags High, Mid, and Low with deduped announcements, controlled via `selected`/`onSelect` or uncontrolled via `defaultSelected`. The tone axis resolves success > destructive (default primary); `compact`, `hideGrid`, `hideAxes`, and `formatValue` behave as on the other cartesian charts. Minor because it ships a new user-visible chart component, `RangeAreaChart`, exported from `@nannier/canvas` (with the `RangePoint` type); no existing API changes. Like `Chart` it is a Shared platform treatment (identical on iOS, Android, and the web). Accessibility: the plot's name folds every range ("p50 to p99: Jan 42 to 118 around 61, ..."), summarizing past 24 points. devWarns cover empty or mismatched `labels`/`data` and an inverted pair (`low` > `high`), which is swapped after warning.

## 2.23.0

### Minor Changes

- 73c67e3: BulletChart: a new chart component for goal-attainment rows. Each `data` row is a leading label, a track holding qualitative background bands (`ranges`, ascending bounds painted in fading muted washes, widest first so the denser washes sit on top), the tone-colored measure bar, an optional vertical `target` tick, and the trailing formatted value; following the classic bullet-graph anatomy each row carries its own scale (its largest value, target, or bound), and `max` forces one shared scale when the rows genuinely share a unit. The measure tone resolves success > destructive (first match wins, default primary); `compact` tightens rows and thins bars; `formatValue` formats values (default compact k/M/B). Minor because it ships a new user-visible chart component, `BulletChart`, exported from `@nannier/canvas` (with the `BulletDatum` type); no existing API changes. Like `Chart` it is a Shared platform treatment (identical on iOS, Android, and the web). Accessibility: each row is one accessible item composing value and target ("Revenue: 275 of target 300"); bands, bar, and tick are decorative. devWarns cover empty `data`, out-of-order `ranges`, and data exceeding an explicit `max`.
- 73c67e3: ProgressRing: a new chart component, the full-circle sibling of the semicircular Gauge. A muted track ring and a tone-colored value arc revealed clockwise from 12 o'clock with rounded caps (the ring is a stroked path built from two half arcs, because an SVG circle's dash origin sits at 3 o'clock), the whole-percent readout centered inside, and an optional `label` below the graphic. The API mirrors Gauge exactly: `value` 0-100 (clamped with a devWarn outside the range), the tone axis `primary` / `success` / `warning` / `destructive` with precedence success > warning > destructive, and the same rounding split (the readout and the accessible name round while the arc keeps the fraction). `compact` shrinks the graphic from 120 to 96; per-instance sizing remains a separate, deferred item, as on Gauge. Minor because it ships a new user-visible chart component, `ProgressRing`, exported from `@nannier/canvas`; no existing API changes. Like `Gauge` it is a Shared platform treatment (identical on iOS, Android, and the web). The accessible name announces "label: N%" with the same number the eye sees.

## 2.22.0

### Minor Changes

- 33ac55e: ServiceHealthList: a new chart component for the status-overview card. One row per service: a status dot (per-item booleans resolving down > degraded, first match wins, operational otherwise), the truncating service name, an optional right-aligned `detail` string ("99.98%"), and, when the item carries `periods`, an embedded mini uptime strip on a second line rendered by the same internal strip module `UptimeBar` uses, so the two components never drift (both export the `UptimePeriod` type). `onPressItem` turns each row into a drill-in button with the platform press affordance; `compact` hides the embedded strips and tightens the rows; `plain` strips the card surface for nesting inside an existing card, mirroring `Stats`. Minor because it ships a new user-visible chart component, `ServiceHealthList`, exported from `@nannier/canvas`; no existing API changes. Like `Chart` it is a Shared platform treatment (identical on iOS, Android, and the web). Accessibility: each row composes label, status, and detail into one accessible name ("Dashboard: degraded, 99.92%"), the embedded strip carries its own tallying summary, and the status dot is decorative. devWarn on empty `items`.
- 33ac55e: UptimeBar: a new chart component for the statuspage strip. A single row of per-period status pills, oldest on the left, each period a plain object whose status booleans resolve down > degraded > unknown (first match wins; an unmarked period is operational), colored through the shared status hues so a degraded pill reads the same amber as a warning badge. An optional `caption` summarizes the strip above it ("99.98% uptime"), and `startLabel` / `endLabel` caption the strip's physical edges below; `compact` shortens the pills. The strip is a time axis, so pills and edge captions keep physical left-to-right ordering even under native RTL, matching the plot convention of the cartesian charts. Minor because it ships a new user-visible chart component, `UptimeBar`, exported from `@nannier/canvas` (with the `UptimePeriod` type); no existing API changes. Like `Chart` it is a Shared platform treatment (identical on iOS, Android, and the web). Accessibility: the strip is one image whose name tallies every status with zero counts omitted ("API uptime, 90 periods: 87 operational, 2 degraded, 1 down"); the caption and edge labels are real text outside it. devWarn on empty `periods`.

## 2.21.0

### Minor Changes

- 8ba9073: BarList: a new chart component for the ranked label/value list (top pages, referrers, sign-up sources). Each row carries a color swatch, a truncating label, a right-aligned formatted value, an optional Stats-style `delta` string toned by `down` (with `steady` for qualifiers, muted, taking precedence), and a proportional track bar. Bars size against the largest row by default; `share` sizes them against the sum of the rows and appends muted percent readouts. Row colors follow the chart-1..8 ramp by index, with per-row `chart1`..`chart8` boolean slot overrides; a list-level `success` or `destructive` tone paints single-hue lists (precedence success > destructive; a row's slot beats the tone, with a devWarn when both are passed). `onPressItem` turns every row into a drill-in button with the platform press affordance; `compact` tightens the rows; `plain` strips the card surface for nesting inside an existing card, mirroring `Stats`. `formatValue` formats values (default compact k/M/B). Minor because it ships a new user-visible chart component, `BarList`, exported from `@nannier/canvas`; no existing API changes. It complements rather than replaces the bar `Chart`: `Chart horizontal` compares magnitudes on a shared axis, while BarList is the ranked list idiom with deltas, shares, slots, and drill-in. Like `Chart` it is a Shared platform treatment (identical on iOS, Android, and the web). Accessibility: every row is one accessible item whose name folds the label, formatted value, share percent (in `share` mode), and the delta with its direction spelled out; the swatch and track are decorative. devWarns cover empty `items` and negative row values (treated as 0 by the bars).
- 8ba9073: MetricBreakdown: a new chart component for the decomposed-metric dashboard card. It stacks a preformatted headline `value` and `label`, an optional secondary `rate` readout with `rateLabel` (toned by the slot-scoped `rateSuccess` / `rateWarning` / `rateDestructive` booleans, first match wins, default muted; slot-scoped because the tone colors the rate readout, not the card), an optional trend strip (`spark`) rendered through the kit `Sparkline` line variant with a floating latest-value tag suffixed by `sparkUnit` (the tag inherits the rate tone when one is set), per-category `breakdown` rows with proportional share bars and Stats-style `delta` strings toned by `down`/`steady`, and a `chips` footer rendered with the kit `Chip` atom behind an optional `chipsLabel` (no default: a kit component does not assume the domain). Row colors follow the chart-1..8 ramp by index with per-row `chart1`..`chart8` boolean overrides; the v2-era chart-1 spark color is deliberately dropped in favor of the Sparkline's default primary tone. `compact` tightens density; `plain` strips the card surface for nesting inside another card, mirroring `Stats`; `formatValue` formats row values and the spark tag. Every section is independently optional. Minor because it ships a new user-visible chart component, `MetricBreakdown`, exported from `@nannier/canvas`; no existing API changes. Like `Chart` it is a Shared platform treatment (identical on iOS, Android, and the web). Accessibility: the card is text-first; the headline, captions, and rate are real text, each breakdown row is one accessible item announcing label, formatted value, and share of the total, the trend carries a data-derived accessible name, and the floating tag, swatches, and tracks are decorative. devWarns cover a single-point `spark` (skipped) and negative row values.

## 2.20.1

### Patch Changes

- bf6d623: Alert resolves its width measure axis `block` > `wide` > `narrow`, the order the design hand-off uses; v2.20.0 shipped the axis with the reverse first-match order. The order only decides what happens when a call site passes more than one measure, which the docs already tell you not to do, so nothing that passes a single measure changes. `block` leading is also the better reading: asking a banner to fill its container is the most specific of the three instructions, so it should not lose to a cap.

## 2.20.0

### Minor Changes

- b0863db: Alert gains the width measure axis, a new public capability: boolean props `narrow` (320px cap), `wide` (640px cap), and `block` (fill the container, no cap) around the default 480px cap. Every measure is a maximum, never a floor: the banner rides width 100% under the cap and still shrinks to its container, so a column of alerts is the same measure top to bottom. The caps sit one step up the field width ladder (narrow 320 matches a base-width field, the default 480 matches a wide one), so a banner over a form lines up with its fields. Axis precedence is first-match narrow > wide > block.
- b0863db: DataTable: the hand-off's row-interaction suite. Passing `onRowEdit` and/or `onRowDelete` adds a trailing actions column of icon buttons at each platform's touch-target size (28px web, 44pt iOS, 48dp Android with a borderless ripple). The pencil opens the row's edit mode: every string cell becomes a skin-styled field (the first takes focus) with a trailing Save/Cancel pair, and Save fires `onRowCommit(rowIndex, cells)` with the edited cells in place while custom ReactNode cells pass through unchanged. Delete is second-press confirm: the first press arms the bin (it turns destructive and its accessible name changes to "Confirm delete ..."), a second press within the confirm window fires `onRowDelete(rowIndex)`, and any other table press or the window lapsing disarms. The new `inlineEdit` boolean lets a string cell be pressed straight into a field: Enter or blur commits via `onCellCommit(rowIndex, colIndex, next)` when the value changed, Escape restores the cell. All indices report ORIGINAL `rows` positions, stable under sorting and paging, and the action buttons fold the row's first cell text into their accessible names. Minor because it adds new public API to a shipped component: the `inlineEdit` boolean plus the `onRowEdit`, `onRowDelete`, `onRowCommit`, and `onCellCommit` callback props. Everything existing is unchanged; tables without the new props render exactly as before.
- b0863db: Gauge: the chart is now the hand-off's semicircle anatomy. The full-circle ring with the value and label centered inside is replaced by a 180 degree top semicircular arc (muted track plus a tone-colored value arc with rounded caps), the percent readout sitting in the open center of the semicircle, and the label below the graphic. The readout (and the accessible name with it) now rounds to a whole percent, matching the hand-off; the arc still fills by the exact fractional value. Minor because it changes the user-visible rendered look of a shipped chart to the design hand-off's geometry. The API is unchanged: `value`, `label`, `testID`, `style`, and the tone axis (default primary; precedence success > warning > destructive) all work as before. The graphic keeps its fixed 120 width; per-instance sizing remains a separate, deferred item.

## 2.19.1

### Patch Changes

- 0629dd5: Fix the web glass lens blanking the page under a Trusted Types CSP

  `glass-lens.ts` injected its SVG filter defs by assigning markup strings to
  `innerHTML`. Under a `require-trusted-types-for 'script'` Content-Security-Policy,
  Chromium throws a `TypeError` on that assignment, and because the shared
  `#cds-glass-lens` def is injected at module-import time the throw escaped the
  module factory before React could mount: every consumer serving that CSP rendered
  a blank page instead of an app. The published docs site did exactly that.

  Both defs are now built as DOM nodes with `createElementNS` and `setAttribute`,
  which touches no Trusted Types sink and needs no policy, so the lens renders
  identically under every CSP. The filter geometry moved from markup-string builders
  to pure spec builders (`sizedLensFilterSpec`, `sharedLensFilterSpec`) that describe
  the tree; rendered output, rim geometry, and the displacement-map data URI are
  unchanged. Kit source is now linted against every Trusted Types sink so this class
  of failure cannot reach a release again.

## 2.19.0

### Minor Changes

- 9823224: ButtonGroup gains a `block` boolean, an orthogonal layout modifier matching the hand-off's ButtonGroup axis: the group stretches to the container width and the segments share the space equally (`flex: 1` gives each a zero flex-basis, so labels of different lengths still split evenly). It applies to the segmented and spaced kinds; the split and stepper kinds are fixed-width chrome (a chevron trigger, prev/next arrow cells), so they ignore it with a dev-only warning.

  Minor justification: new public API (the `block` prop on ButtonGroup), not a fix to existing behavior.

- 9823224: Emblem gains a `warning` tone boolean on the existing tone axis (primary / destructive / success / warning / muted): the amber caution emblem from the hand-off. It follows the same recipe as the other tones, a 12 percent wash of the `warning` token behind the square and the solid token on the glyph or monogram, and slots into the fixed tone precedence after `success`.

  Minor justification: new public API (the `warning` prop on Emblem), not a fix to existing behavior.

- 9823224: Gauge: new `warning` tone boolean on the tone axis. `<Gauge warning />` fills the arc with the kit's shared warning amber (the same statusHues hue a warning badge or alert reads), for dials like a budget-used gauge. Minor because it adds a new public prop, a user-visible tone capability; the existing tones and the default primary fill are unchanged. Tone precedence within the axis is success > warning > destructive (first match wins).
- 9823224: Tabs items accept a per-item `disabled` flag: an item may now be `{ label, badge?, disabled? }`, and a disabled trigger renders through the skin's dimmed disabled treatment, is not pressable, sits out of the tab order, is skipped by the roving arrow-key navigation (Home/End redirect to the nearest enabled tab), and announces itself via `accessibilityState.disabled` plus the `aria-disabled` alias.

  Minor justification: new user-visible capability on the public Tabs API (individually disabled tab triggers on the existing `tabs` items array).

## 2.18.1

### Patch Changes

- a314646: Fix the web Liquid Glass lens's displacement geometry. The shared percentage-sized filter silently mis-rendered in Chromium's reference-filter path: the ramp images did not cover the element, most of the surface sampled a transparent-black map, and the two displacement passes compounded that into a large position-dependent smear (content under a glass bar appeared shifted tens of pixels, and content entering at an edge read unblurred before snapping to frost). The lens is now generated per surface size with pixel-unit geometry (`filterUnits="userSpaceOnUse"`, a map image whose intrinsic size is the filter region), acquired on layout and refcounted so equal sizes share one def and resizes clean up after themselves. Rims are now a constant 12px like the real material instead of proportional to the element, a single dual-channel displacement pass replaces the two-pass chain, and the shared `#cds-glass-lens` def the CSS token points at carries the blur+saturate grade only, so raw-CSS consumers get a correct frost rather than a broken lens.

## 2.18.0

### Minor Changes

- 9af2828: ThemeProvider speaks the color scheme in boolean grammar: `<ThemeProvider dark>` forces the dark scheme, `<ThemeProvider light>` the light one, and passing neither follows the OS appearance, matching the glass/solid surface axis and every component axis (the prop name is the value). Axis first-match: `dark` wins over `light`, and both win over the legacy `scheme` value prop, which stays supported for config-driven code that already holds a scheme value (a stored preference, an `<html>` hook). `ssrScheme` and the resolved `useTheme().scheme` are untouched.

  Minor justification: new public API on ThemeProvider (the dark/light boolean axis), not a fix to existing behavior.

## 2.17.0

### Minor Changes

- 3ed5114: Glass surface mode now renders as a real Liquid Glass LENS on Chromium web: an SVG displacement filter (refraction concentrated at the rim, the centre optically flat, with the blur + saturation built in) injected once per document and applied as the glass material's backdrop-filter through GlassSurface. It needs no optional module, sits above the expo-blur frost in the material ladder (the frost stays the tier for non-Chromium web, Android, and iOS < 26, and the translucent popover fill stays the last resort), matches the shipped CSS token `--glass-lens: url(#cds-glass-lens)`, and keeps the Reduce Transparency / Increase Contrast opaque rungs intact.

  Minor justification: new user-visible capability of the published web glass material (the lens tier), not a fix to existing behavior.

## 2.16.0

### Minor Changes

- c37c7df: ThemeProvider speaks the surface mode in boolean grammar: `<ThemeProvider glass>`

  The one string-valued switch left on the provider joins the kit's semantic
  boolean axis convention. `glass` forces the translucent functional layer on,
  `solid` forces the flat look, and passing neither keeps the platform default
  (glass on iOS 26+, solid everywhere else). Axis first-match: `glass` wins over
  `solid`, and both win over the legacy prop.

  This is the minor's user-visible capability: a new public prop pair on
  `ThemeProvider`, making the provider's call-site grammar match every component
  axis (`<ThemeProvider scheme="dark" glass>` beside `<Button primary large>`).

  `surface="solid" | "glass"` remains supported unchanged, for back-compat and for
  config-driven code that already holds a `Surface` value; the resolved value the
  theme context carries (`useTheme().surface`) and the web DOM helper
  (`setSurface("glass")`) are untouched.

## 2.15.0

### Minor Changes

- 37cbbe9: Add `brandColors` and `statusHues` to the token layer, and fix the light-mode `--ring`

  **New public API, which is what makes this a minor.** Two exports join the style
  foundation, both reachable from the package root:

  - `brandColors` (with its `BrandColors` type): the three fixed brand constants
    that do NOT flip with the scheme, `orb-indigo` / `orb-violet` / `orb-cyan`.
    The CSS layer has shipped these as `--orb-*` since the token handoff, but there
    was no JavaScript equivalent, so a React Native surface (and any docs page)
    had to hard-code the hexes. Keys are the CSS custom-property names verbatim, so
    `brandColors["orb-indigo"]` and `var(--orb-indigo)` name the same token, and
    `bun run validate-tokens` now fails when a key here has no matching `--name` in
    the shipped CSS (the guard `lightColors` already had). That guard checks the
    name EXISTS, not that the two layers carry the same value; cross-checking values
    is a separate change, since the CSS states colors in oklch and the JavaScript in
    hex.
  - `statusHues` (with its `StatusTone` type): the one status-tone to palette-hue
    map, `success` to green, `warning` to amber, `error` to red, `info` to blue.
    Alert, Badge and Chip each carried a private, identical copy; all three now read
    this one, so a toned Alert, a status Badge and a status Chip cannot drift apart. It names the hue only,
    never a step, so each component keeps its own step ladder. No rendered color
    changes.

  **Fix:** the light-mode `--ring` in `styles/tokens/colors.css` shipped the DARK
  primary (`oklch(0.585 0.233 277.117)`) in both `:root` and `.dark`. Ring tracks
  primary per scheme, which the JS tokens have always done (`#4f46e5` light,
  `#6366f1` dark), so `:root --ring` is now the light primary
  `oklch(0.511 0.262 276.966)`. Focus rings on a light web surface pick up the
  slightly deeper indigo they were always meant to have; dark is unchanged.

- 37cbbe9: Add the `Swatch` atom: a color sample built from a filled rounded block plus the
  label column it owns (the token name as `children`, a primary mono `value` line, an
  optional secondary mono `detail` line), the anatomy a design-system color sheet
  repeats down a page.

  New user-visible capability (why this is a minor, not a patch): a new exported
  component with its own boolean axes, `small` / `large` for the block edge, `circle`
  for the shape, `inline` to move the label column beside the block, and `block` for a
  full-width ramp bar whose size reads as its height. The block always carries a
  `border`-token hairline, so a sample of `background` or `foreground` stays visible
  against the surface behind it in both schemes, and the root ships a data-carrying
  accessible name assembled from the name and value (falling back to the color string),
  since its image role hides the rendered lines from assistive tech.

## 2.14.0

### Minor Changes

- 9094fed: Ship the design tokens as plain CSS, and drop Tailwind from the stylesheet

  `styles/canvas.css` is now a manifest of nine token files under `styles/tokens/`
  (colors, palette, typography, spacing, radius, shadows, platforms, motion, base).
  It is plain CSS custom properties end to end: no `@import "tailwindcss"`, no
  `@theme`, no `@custom-variant`, no build step. A bare `<link>` resolves it.

  New capability, which is what makes this a minor: the published stylesheet now
  carries the **platform skin layer**, 732 `--p-*` custom properties that switch
  the whole look from one attribute, so a web surface can render the iOS 26 / HIG
  and Material 3 skins alongside the Canvas web look:

  ```html
  <div data-platform="ios">…</div>
  <div data-platform="android">…</div>
  ```

  That takes the shipped token surface from 71 properties to 932, adds the glass,
  delta and panel token families, and completes the radius scale (`--radius-none`
  through `--radius-3xl`, plus the per-platform shape aliases). Every existing
  token keeps its name and value; the one change is `--radius-sm`, now 2px inside
  the full scale, where it used to be 4px as part of a four-step set.

  Scheme still keys off `.dark` on the root element. The browser floor drops,
  because the layer now needs only `oklch()` and `color-mix()`: Firefox 113
  instead of 128, since `@property` and cascade layers are gone.

  `hsl(name)` (the web token helper) returned `hsl(oklch(…))`, invalid in every
  browser, because token values stopped being HSL triplets. It now returns the
  token value as-is, and applies alpha with `color-mix()`.

  **Migration, required for apps that use Tailwind utility classes.** Canvas's
  stylesheet used to be the Tailwind entry point by side effect, so importing it
  generated every utility in the consuming app. It no longer does. An app that
  writes `className="flex p-6 text-muted-foreground"` must own its own Tailwind
  setup: add these above the Canvas import in your global stylesheet.

  ```css
  @import "tailwindcss";
  @import "@nannier/canvas/styles/canvas.css";

  @custom-variant dark (&:where(.dark, .dark *));

  /* Canvas tokens as Tailwind colours, so bg-primary and friends resolve. */
  @theme inline {
    --color-background: var(--background);
    --color-foreground: var(--foreground);
    --color-card: var(--card);
    --color-card-foreground: var(--card-foreground);
    --color-popover: var(--popover);
    --color-popover-foreground: var(--popover-foreground);
    --color-primary: var(--primary);
    --color-primary-foreground: var(--primary-foreground);
    --color-secondary: var(--secondary);
    --color-secondary-foreground: var(--secondary-foreground);
    --color-muted: var(--muted);
    --color-muted-foreground: var(--muted-foreground);
    --color-accent: var(--accent);
    --color-accent-foreground: var(--accent-foreground);
    --color-destructive: var(--destructive);
    --color-destructive-foreground: var(--destructive-foreground);
    --color-success: var(--success);
    --color-success-foreground: var(--success-foreground);
    --color-warning: var(--warning);
    --color-warning-foreground: var(--warning-foreground);
    --color-border: var(--border);
    --color-input: var(--input);
    --color-ring: var(--ring);
    --color-chart-1: var(--chart-1);
    --color-chart-2: var(--chart-2);
    --color-chart-3: var(--chart-3);
    --color-chart-4: var(--chart-4);
    --color-chart-5: var(--chart-5);
    --color-chart-6: var(--chart-6);
    --color-chart-7: var(--chart-7);
    --color-chart-8: var(--chart-8);
  }
  ```

  Apps that only use Canvas components and `var(--token)` need no change.

## 2.13.0

### Minor Changes

- 880b4c2: ThemeProvider: new `ssrScheme` prop, the SSR/SSG hydration contract for scheme-aware colors.

  Minor justification: new public API capability. Server-rendered apps (Next.js
  static export and the like) can now tell the provider which scheme the server
  resolved. The provider renders that scheme on the server and for the hydration
  render, so the client's first render matches the server HTML exactly, then
  applies the real `scheme` right after mount; the switch re-renders every
  consumer, which writes the correct colors to the DOM. Without this, a client
  whose scheme differs from the server default (stored preference, OS dark mode)
  hits a React hydration attribute mismatch, and React keeps the server's inline
  colors on any component that never re-renders again: kit components appear
  stuck in the server's scheme after a refresh. Omitting the prop keeps the
  existing single-pass behavior; client-only apps and native are unaffected.

## 2.12.0

### Minor Changes

- 9e4cbc2: Card owns its rhythm: a padded surface now also spaces its flat children (padding implies gap), so a stack of Typography lines inside a Card needs no layout wrapper. The gap follows the platform density table: 16 on web and iOS, 12 on Android at the default density (the compact and comfortable steps already carried their own). `CardContent` picks up the same 16px flat-child rhythm. `flush` opts out of both the inset and the gap, sectioned cards are untouched (their sections pad themselves), and a single-child card renders pixel-identical since gap is inert with one child.

  Minor justification: new user-visible layout capability on the public Card API; padded cards and CardContent now space flat children without a Row or Column wrapper.

- 9e4cbc2: Collapsible and Accordion gain `card` and `description`, both backward compatible. `description` renders a muted secondary line under the title in the default trigger anatomy (on Accordion it lives per item, on `AccordionItem`); title truncation is unchanged. `card` wraps the disclosure (or the whole group) in an outlined card surface: an 8px-radius hairline card with 20px insets on web, the Material 3 outlined-card equivalent with 16dp insets on Android, and a documented no-op on iOS, where the default skin already renders the inset-grouped card.

  Minor justification: two new public props on Collapsible and Accordion (card surface variant and per-title description line), a user-visible API capability addition.

## 2.11.3

### Patch Changes

- 158d39e: dev-sync now mirrors straight into consumers' `node_modules/@nannier/canvas` overlays (stamped with `.origin`) instead of the former repo-root `.canvas` directories. Re-testing under clean conditions showed Turbopack live-watches real directories inside node_modules, so the `.canvas` indirection and consumer-side aliases were unnecessary.

## 2.11.2

### Patch Changes

- 2cafc58: `bun run dev` now pairs the tsc watch with a consumer sync watcher: it mirrors `dist/` and `styles/` into every sibling repo whose git-ignored `.canvas` marker points at this checkout, keeping locally linked consumers live-reloading while the kit is edited. Consumers overlay a real directory in node_modules because Next 16 Turbopack refuses out-of-repo symlinks there.

## 2.11.1

### Patch Changes

- 3be32c9: Add a root `dev` script (tsc watch on tsconfig.build.json) so locally linked consumers get live rebuilds of `dist/` while editing the kit.

## 2.11.0

### Minor Changes

- 3eb4265: Add the `Reveal` atom and `RevealGroup`: a scroll-triggered content entrance.

  New user-visible capability, which is what makes this a minor: the kit had no
  in-view primitive at all. Its only animation component, `Entrance`, fires on mount,
  is spring-only opacity plus scale, and has no delay, duration, direction, or trigger,
  so every app that wanted content to arrive as it scrolled into view had to reach
  outside the kit for it. `Reveal` is that capability, and it is additive: no existing
  export changes shape, and `Entrance` and the four overlays built on it are untouched.

  `<Reveal>` wraps content, holds it slightly offset and transparent, then travels it
  into place and fades it in when the element reaches the viewport, once. The API is
  semantic booleans on four axes and carries no numbers: direction (`fromBelow`, the
  default, plus `fromAbove`, `fromLeft`, `fromRight`), distance (`pronounced`), speed
  (`brisk`), and threshold (`deepInView`).

  `<RevealGroup>` makes stagger structural instead of numeric: it hands each child the
  next ordinal in document order and the child turns that into its own delay, so a
  mapped list cascades without any call site computing a per-item delay. It renders no
  host element, so it can sit between a grid and the items the grid lays out without
  disturbing the layout.

  Detection is a shared throttled ticker that measures only elements still waiting,
  and stops dead when the last one arrives, so a fully revealed page holds no timer.
  Every path that cannot produce a trustworthy measurement reveals the content: an
  entrance primitive must never be able to leave content invisible. Under Reduce
  Motion the whole mechanism is skipped, not merely shortened (no registration, no
  measurement, no timer), the final frame renders immediately, and the stagger is
  dropped with the motion, since delaying a static frame would only withhold content.

## 2.10.2

### Patch Changes

- 7ba848f: Count only the changesets that changesets itself will read.

  The release workflow decides whether to version, commit and tag by counting pending
  changesets with a shell `find`, and that `find` did not match changesets' own filter,
  which is `!file.startsWith(".") && file.endsWith(".md") && !/^README\.md$/i.test(file)`.
  It was missing the dotfile exclusion and its README check was case-sensitive.

  The consequence is small but confusing: a repo whose only pending entry is a scratch
  `.changeset/.draft.md` counted as one pending release, so the workflow took the
  version-and-tag path with nothing behind it and produced a no-op re-tag of the
  current version, which the existing `|| echo "Release already exists"` then hid.

  Over-counting is the safe direction, since the worst case is a wasted no-op, whereas
  under-counting would skip a real release. This change only ever removes entries
  changesets refuses to read, so it cannot cause a missed release. Verified against
  every filename case: a dotfile draft, a lowercase readme, a legacy directory
  changeset, and two real changesets.

  Found by adversarially reviewing a changeset guard in daedalus, then confirmed
  identical in all seven repos.

## 2.10.1

### Patch Changes

- 30c4385: DragDrop: never arm a pointer drag whose grip was already released. Arming is
  async (the zone/card measure spans a few macrotasks), so a grip tapped, or
  dragged and released, before the measure landed would arm a drag no pointer
  owned and leave the drop ring and source dim stuck until the next interaction.
  A per-grab session guard now invalidates any measure that finishes after
  release or after a newer grab.

## 2.10.0

### Minor Changes

- ffab6fc: Minor justification: two new user-visible capabilities ship on the public API.

  New `Board` organism: a data-driven kanban board composed from the kit's own
  DragDropProvider/DropZone/Draggable/DragHandle plus Card, Badge, and RowMenu.
  Columns scroll horizontally and are drop zones; cards carry a drag grip, an
  optional trailing badge, a 2-line muted description, a free-form `chips` slot,
  and an optional kebab menu. Works controlled (`items` + `onMove`, with
  `applyBoardMove` exported as the standard reducer and `BoardMove` reporting the
  insertion index plus `afterId`/`beforeId` neighbors) or uncontrolled
  (`defaultItems` + `onItemsChange`). Keyboard and screen-reader drag come from
  the DnD family (Space grabs, arrows move, Space drops, Escape cancels).

  `StackedList` gains `reorderable` + `onReorder` (rows get a leading drag grip
  and the list becomes a drop zone; order stays controlled by the consumer's
  items array) and a per-item `trailing` ReactNode slot rendered before the
  badge/meta cluster for inline controls. A bare StackedList renders exactly as
  before.

  Also: `DragHandle` now refuses pan-responder termination mid-drag, so a
  surrounding ScrollView (a board's lanes, a scrollable page) can no longer
  steal an in-flight drag on native.

## 2.9.1

### Patch Changes

- 9f00da3: Stop BackHandler console.error noise on web: Drawer, ActionSheet, and the Sidebar drill-down now wire Android hardware-back through a shared useHardwareBack hook that subscribes only while the overlay is open and never on web, where react-native-web's BackHandler shim logs "BackHandler is not supported on web" on every addEventListener call. Native behavior is unchanged.

## 2.9.0

### Minor Changes

- d86b6de: `StatItem` gains `steady`, which renders the delta muted rather than as a rise
  or a decline.

  A metric's second line is not always a change. It is often a qualifier: "last 30
  days", "8 M2M / 4 user". Colouring those green reads as good news the caller is
  not claiming. `steady` takes precedence over `down`, and omitting it leaves
  today's rise/decline behaviour exactly as it was.

## 2.8.0

### Minor Changes

- 79b8182: `Stats` gains a per-metric icon, header control and accent; `StackedList` gains a
  per-row badge tone.

  Minor rather than patch because both are new user-visible capabilities.

  `StatItem` takes `icon` (a glyph naming what the metric counts), `actions` (a
  control in the metric's header, a period selector or a filter) and one of
  `chart1` through `chart8`, which accents the headline value from the same
  categorical ramp the charts use, so a dashboard's tiles are tellable apart and a
  metric can carry the identity of the series it summarises. The accent recolors
  only the value: the delta keeps its own rise and decline semantics.

  `StackedListItem` takes `success`, `error`, `warning`, `info` or `neutral`,
  which tone its trailing `badge` as the kit's status pill. A service-health list
  can now say healthy, degraded and down in colour instead of three identical grey
  badges.

  Backward compatible throughout. A metric with no icon, control or accent renders
  exactly as before, and an untoned badge keeps its original `secondary` look.
  Both new axes are mutually exclusive with a documented first-match precedence.

## 2.7.0

### Minor Changes

- d3ce53e: `Card` now renders its header and footer sections beside raw children.

  Minor rather than patch because this is a new user-visible capability: a card
  can express a titled header, an icon, a header action and a footer ABOVE
  arbitrary children (a data table, a form, a list). Previously those props were
  silently dropped the moment children were passed, and the header only rendered
  on the data-driven path, where the body has to be a `string`.

  Backward compatible. A plain card, one with children and no section props, is
  untouched down to its computed surface style; the data-driven string path is
  unchanged; and children still win over a string `body` when both are passed.

  A sectioned card pads through its sections rather than its surface, so `padded`
  and the density booleans do not apply there and now emit a dev warning instead
  of being silently ignored.

## 2.6.2

### Patch Changes

- 55d79fd: Fix optional peers being treated as required by Metro.

  The kit loads its optional peers through a guarded `require()` wrapped in
  `if (typeof require === "function")`. That `if` defeats the mechanism it was
  meant to support: Metro's `isOptionalDependency` walks up from the require and,
  at the first enclosing block statement, returns whether that block belongs to a
  `TryStatement`, without climbing further. The `if`'s own block answers no, so
  Metro registered a required edge and any consumer who skipped the peer failed to
  bundle with "Unable to resolve module".

  Every one of the nine sites now places the require directly inside the try. The
  runtime behaviour is unchanged: where `require` is undefined the ReferenceError
  lands in the same catch that already absorbed a missing module.

  Consumers who install every optional peer see no difference. Consumers who skip
  one, which is the documented and supported case, can now bundle under Metro.

## 2.6.1

### Patch Changes

- 2f3461d: Backdrop: add the optional GPU-backend capability layer, inert for now.

  Declares `@shopify/react-native-skia` as an OPTIONAL peer dependency and adds a
  guarded capability probe behind it, so a later release can upgrade `Backdrop` to
  a GPU renderer for the effects `react-native-svg` structurally cannot express
  (procedural noise, real blur, thousands of bodies in one draw call).

  Deliberately a patch rather than a minor: this adds no user-visible capability.
  The GPU renderer does not exist yet, so every backdrop renders exactly the same
  SVG baseline as before, on every platform, with or without the peer installed.
  What ships is the plumbing and its guarantees.

  The probe asks a capability question ("can this runtime allocate a Skia object
  right now?"), never a platform question, so the eventual upgrade is progressive
  enhancement rather than a platform fork. It resolves the peer through a guarded
  `require`, which `verify-package` now enforces for this specifier alongside the
  existing optional peers: a consumer without the package installed must never hit
  an unresolved module.

  Two new exports for apps that load a backend themselves, notably on web where
  CanvasKit is fetched at runtime: `refreshBackdropRenderer()` re-runs the probe
  and notifies mounted backdrops, and `useGpuBackdrop()` reports whether one is
  live. Loading the backend stays the application's job, exactly as installing
  `expo-blur` is, which keeps the WebAssembly glue out of the kit's module graph.

## 2.6.0

### Minor Changes

- fed7369: Add `Backdrop`, the engine for a full-screen animated background.

  New user-visible capability: a consuming application can now ship an animated
  background through the kit instead of hand-rolling one. Canvas owns the surface,
  the shared clock, the per-platform frame budget and the accessibility ladder; the
  application owns the scene, composed from `Backdrop.Particles`,
  `Backdrop.Gradient`, `Backdrop.Shader` and `Backdrop.Custom` layers. The kit ships
  no artwork of its own, so the animation belongs to the app: point the same engine
  at different children and it renders something else entirely.

  Also exports `BackdropHost`, which lets one surface serve every `Backdrop` in an
  app (so a stack of screens shares a single drawing surface rather than one each),
  and `backdropClock`, so bespoke app-supplied art can bind to the same timeline as
  the declared layers.

  Semantic boolean axes: `energetic`/`calm` (rate), `dense`/`sparse` (field detail,
  which is also the frame-budget lever), `vivid`/`subtle` (weight), plus `still`.
  Reduce Motion renders a poster frame from the first paint, Reduce Transparency
  drops the translucent washes, and Increase Contrast paints the background token
  alone.

## 2.5.0

### Minor Changes

- 748111d: **`AlertDialog` gained the `overlay` presentation**, matching `Dialog`.

  It had the same in-flow default: a scrim sized for the docs preview, no
  positioning, no portal, and `aria-modal` asserted anyway. That is the wrong
  default for the component's main job, which is guarding a destructive action:
  the confirm appeared wherever it happened to be mounted while the page behind it
  stayed scrollable and clickable, so a user could reach the thing they were being
  asked to confirm destroying.

  With `overlay` it teleports into the nearest `OverlayProvider` and fills it. The
  contained behaviour is unchanged and remains the default, and with no provider in
  the tree it still renders in place rather than vanishing.

## 2.4.0

### Minor Changes

- e6c4638: **`Dialog` gained `accessibilityLabel`.** New capability: a dialog whose body is
  supplied as `children` can now carry an accessible name.

  Children REPLACE the built-in title and description, so there is no element left
  for `aria-labelledby` to reference and the dialog was announced with no name at
  all. That is poor for a `dialog` and invalid for the `alertdialog` that a
  `destructive` confirm renders, and there was no way to fix it from the call site
  because the prop did not exist. Dialogs using the data-driven `title` path are
  unaffected and keep naming themselves.

## 2.3.0

### Minor Changes

- 46088bd: Three capabilities the kit was missing, each found by building a real app against
  it rather than by reading the catalogue.

  **`Select` accepts `{ value, label }` options.** It previously took `options:
string[]`, so the stored value was always the visible text. Any list keyed by an
  id (a project id, a region slug, a workspace name) could not be expressed, and
  two separate apps grew the same wrapper independently. Bare strings still work
  and still mean the value is the label, so this is backward compatible.

  **`Card` gained `icon` and `actions` header slots.** `Card` already carried
  `title` and `description`; what consumers kept rebuilding around it was a leading
  glyph and a trailing action in the same header row.

  **`Dialog` gained an `overlay` presentation.** The existing dialog renders inline
  in normal flow with a scrim sized for the docs preview, which is right for the
  catalogue and wrong for an application: it appends a backdrop wherever the
  component happens to be mounted, leaves the page behind scrollable and clickable,
  and still asserts `aria-modal`. In a consumer app that meant a delete
  confirmation appearing at the bottom of the page while the page behind it stayed
  interactive. With `overlay`, the dialog teleports into the nearest
  `OverlayProvider` and fills it, so `aria-modal` is true rather than aspirational.
  The contained behaviour is unchanged and remains the default; with no provider in
  the tree an overlaid dialog still renders in place rather than vanishing.

## 2.2.1

### Patch Changes

- 0bfb91f: Fix the stale package-entry comment that still listed Image among the raw
  primitives; Image graduated to a Canvas atom. No runtime change.

## 2.2.0

### Minor Changes

- f77bb67: The published package is now MIT licensed.

  Canvas was previously published as `UNLICENSED` with no licence file, which in npm's
  vocabulary means proprietary, all rights reserved. Anyone who installed it therefore had
  no grant of rights to use it at all, despite the project being described publicly as open
  source. That is now fixed for consumers: `license` is `MIT`, and the MIT text ships inside
  the tarball.

  The grant is deliberately scoped to the distributed package. The source repository stays
  all rights reserved, so the licence file is generated at pack time by `tools/licensegen`
  rather than committed, because a `LICENSE` at the repository root is exactly how GitHub
  decides a repository's licence and committing it would extend MIT to the source too.

  Nothing about the API, the build output or the runtime changes; this only adds the
  permission to use what was already being published.

## 2.1.0

### Minor Changes

- 0f90a3c: Sidebar now declares itself as the navigation landmark, and GlassSurface accepts a `role`.

  A sidebar of nav rows is the page's navigation, but the shell rendered as an
  unlabelled stack of views, so every row inside it sat outside any landmark. Screen
  reader users had no way to jump to the navigation or skip past it, and axe's `region`
  rule flagged the contents. The shell now carries `role="navigation"` in both its plain
  and header/footer forms.

  That was only possible because `GlassSurface` took a closed set of props, so it has
  gained an optional `role` that forwards to the root element, threaded through the web,
  Android and iOS materials as well as the plain and degraded fallbacks. It is spelled
  with React Native's universal `role` prop, which React Native Web renders as the
  matching HTML element and native maps onto its own traits, so no per-platform branch is
  involved. Reach for it on any glass surface that is a structural shell, for example
  `role="banner"` on a top bar; leave it off decorative surfaces like popovers and menus,
  which already carry a role of their own.

  Both changes are additive and backward compatible: existing markup gains a landmark it
  did not have, and no visual output or layout changes.

## 2.0.1

### Patch Changes

- 0988c64: Sidebar now marks its active row with `aria-current="page"` instead of `aria-selected`.

  ARIA permits `aria-selected` only on roles that carry a selected state, such as
  `option`, `tab` and `row`. A sidebar row is a `button`, so browsers discarded the
  attribute as invalid and assistive technology announced every row as unselected,
  including the current page. The row is navigation, so it now uses the same spelling
  Navbars, Breadcrumb and Pagination already use.

  The native `accessibilityState={{ selected }}` is unchanged, since a selected state is
  valid on iOS and Android and is what VoiceOver and TalkBack read.

  If you query the DOM for the active row, match on `[aria-current="page"]` rather than
  `[aria-selected="true"]`.

## 2.0.0

### Major Changes

- 94be12a: Remove the `Overlay` component (and its `OverlayProps` type). It was a redundant
  umbrella that re-implemented three surfaces the kit already ships as real,
  `Modal`-backed components: use `Drawer` for an edge or bottom panel, `Dialog` for
  a centered modal, and `ActionSheet` for a bottom action sheet. Unlike those,
  `Overlay` only painted a contained inline mock, so it could not present as a true
  floating overlay. Migration: replace `<Overlay drawer />` / `<Overlay sheet />`
  with `Drawer`, and `<Overlay modal />` with `Dialog`.

### Minor Changes

- d7968fa: Give the iOS Slider a real Liquid Glass handle. On iOS 26+ the slider handle
  "transforms into liquid glass during interaction" (WWDC25); the kit now renders
  the iOS thumb through the shared `GlassSurface` primitive, so when glass is the
  active surface (the platform default on iOS 26) the knob is a genuine Apple
  Liquid Glass control. It stays a bright puck (matching the system handle) whose
  Liquid Glass edge-lensing and specular show on physical iOS 26 hardware, and it
  springs up on press (Apple's scale/bounce). The press grow is an animated
  width/height resize, NOT a `transform: scale`, because a scale transform on the
  GlassView's ancestor degrades the Liquid Glass material. Under a solid surface,
  Reduce Transparency, or Increase Contrast it degrades to the previous opaque
  white capsule, and the Android and web handles are unchanged.

  Note: Apple's Liquid Glass only renders its blur/refraction on physical devices;
  on the iOS Simulator the handle shows as a bright capsule with a subtle rim.

  `GlassSurface` also gains an optional `tint` prop that overrides the translucent
  under-fill painted behind the material (default: the `popover` token), so a
  small glass control such as the slider knob can read as a bright puck rather
  than a popover-tinted panel.

### Patch Changes

- 5568134: Dialog, AlertDialog, and Popover no longer scroll the page when they open. Their
  focus management now moves focus into the panel with `focus({ preventScroll: true })`,
  so a modal that opens (or a `<Dialog open>` rendered inline mid-page) keeps focus for
  accessibility without yanking the surrounding scroll container to the panel.
- ae363cc: Dialog and AlertDialog panels now shrink to fit a narrow screen instead of
  overflowing. Their outer wrapper fills the available width (and the backdrop can
  shrink below the card's content width), so the panel's `maxWidth: "100%"` caps it
  to the container: on a phone the panel fits the viewport rather than running off
  the right edge, while on desktop it still renders at its per-size width, centered.
  The optional trigger button keeps its natural width.
- b810a87: Fix the Drawer bottom sheet's dimmed backdrop sliding up with the sheet. The
  bottom sheet was the only edge still using React Native Modal's native
  `animationType="slide"`, which transforms the whole modal (the scrim dim
  included), so the backdrop rose from the bottom instead of taking over the
  surface. Every edge now shares one manual slide path: a stationary full-screen
  dim that fades in while only the panel travels (the bottom sheet rises on
  `translateY` from `+panelHeight` to `0`, mirroring the top sheet). This makes the
  bottom sheet consistent with the left, right, and top variants.
- 21440d8: Fix the Drawer sliding in from the wrong side on the web (a left drawer opened
  "backward", sliding leftward into the edge instead of entering from off-screen
  left). React Native Web's `I18nManager` has no direct `isRTL` property, so
  `I18nManager.isRTL` read `undefined` on the web and the direction comparison
  `(edge === "right") !== I18nManager.isRTL` was always true, forcing every side
  drawer to the right-hand slide origin. All RTL checks now route through a new
  shared `isRTL()` helper backed by `I18nManager.getConstants().isRTL`, which is
  implemented on both native and web. This also corrects the same latent web bug in
  Dropdown, Listbox, Slider, Tabs, and Breadcrumb, whose right-to-left handling was
  silently skipped on the web.
