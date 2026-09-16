# Canvas

Canvas is a React Native UI kit, published as `@nannier-com/canvas`. It runs
universally: native on iOS and Android, and on the web through React Native Web.

## React-Native-everywhere principle

Everything here is built in React Native, so one codebase renders on iOS, Android,
and the web (through React Native Web). This holds for the kit AND its docs app:
write components from React Native primitives (`react-native`, `react-native-svg`,
and the kit's own primitives), never from web-only building blocks.

No web-only escape hatches. Do not reach into the DOM, set raw CSS on a node, branch
on `Platform.OS === "web"` to render different markup, or use a `.web.tsx` fork to get
an effect working on web alone. When React Native lacks a primitive the design needs
(for example a conic gradient, a blur, or a shadow with spread), implement it
cross-platform: build it from `react-native-svg` (sectors, masks, `FeGaussianBlur`,
`FeColorMatrix`), the `boxShadow`/`filter` style props, or math, so the same code
produces the same result natively and on the web. A web-only DOM/CSS trick is a
shortcut (see the global no-shortcuts directive): get explicit authorization first.

## Native approach on iOS and Android

On iOS and Android, Canvas renders through the platform's own native machinery, never
through a web emulation of it. The per-OS skin files (`<name>.ios.tsx`,
`<name>.android.tsx`) and the native modules they route through are the real
implementation: Apple's Liquid Glass via `expo-glass-effect` on iOS 26+, a real
frosted blur via `expo-blur`, native `BackHandler` / hardware-back behavior, native
scroll and press feedback, real HIG and Material 3 metrics from the skins.

The CSS layer in `styles/` is the WEB hand-off only. Its custom properties, including
the `--p-*` platform-skin tokens switched by `data-platform`, exist so a web surface
(and the design-system mirror) can render the three looks in a browser. A native build
must never take its look from that CSS, and an iOS or Android behavior must never be
approximated in CSS when the platform exposes the real thing.

So when a design calls for a platform behavior, reach for the native API first and let
the web fall back, rather than implementing the web trick everywhere and calling it
cross-platform. This sharpens, and does not contradict, the React-Native-everywhere
principle above: one component API and one codebase, with each platform's own material
underneath. Why: an emulated iOS or Android surface is a look-alike, and the kit's
whole claim is that it is the real thing on each OS.

## Dogfood the kit: every UI element is a Canvas component

A claude prime global directive. Every UI element used anywhere in this repo, the
docs app included, must be a Canvas component (or one of the kit's primitives:
`View`, `Text`, `Pressable`, `TextInput`, `ScrollView`), never a hand-rolled
look-alike. (`Image` graduated from a primitive to a Canvas atom that wraps RN's
Image with boolean fit props, so it now counts as a Canvas component.) The rule,
in order:

- Need a control the kit already exports? Import and use it.
- The kit has no such component? CREATE IT IN THE KIT (`src/atoms` | `molecules` |
  `organisms`, with its skins/styles), export it, then use it. Add a changeset, since
  it ships in `@nannier-com/canvas`.
- A Canvas component almost fits but lacks a capability (an icon slot, a `ReactNode`
  cell, a prop, a variant)? EXTEND that kit component (backward-compatibly) rather
  than re-implementing it in the docs. (This is how `Button` got `iconLeft`/`iconRight`
  and `DataTable` got `ReactNode` cells.)

A hand-rolled button / badge / card / table / toggle / keycap / input in the docs is a
bug: replace it with the real component, or add/extend the kit component first. The
only bespoke UI allowed is genuinely docs-only infrastructure with no kit equivalent
(the playground/compare harness, the live-example frame, brand illustrations) plus the
authorized platform escape hatches. Why: the docs are the kit's own showcase and proof
of the API; a duplicated control both misrepresents how to build with Canvas and hides
a missing kit feature.

## Highly responsive

Canvas is highly responsive by default. Every component must adapt cleanly across
the full range of viewport sizes, from large desktop down to phone.
Responsiveness is a core requirement of every component, not an optional add-on.

Author desktop-first: lay out and size each component for the desktop case first,
then add the responsive variants that scale it down to tablet and phone. This is
the inverse of mobile-first.

### Sizing: the parent provides the bounds

A component never dictates its own width. Every component root declares a sizing
nature from `src/style/sizing.ts`, and the nearest layout container provides the
bounds, which is Bootstrap's contract (`.container` > `.row` > `.col-*` size the
box, `.form-control` is `width: 100%`):

- **FILL** (`useFillStyle` / `FILL`: `width:"100%"`, `flexShrink:1`, `minWidth:0`):
  fills a Column, shares a Row with hugging siblings (a field beside a button takes
  the remainder), splits a Row equally with other fill siblings, takes its own line
  in a wrap Row. Fields, cards, alerts, lists, tables, charts, feeds, forms, the
  calendar.
- **HUG** (`useHugStyle` / `useSizing({ block })`): the content's own width. Button,
  Badge, Chip, Kbd, ButtonGroup, Dropdown, Tooltip, QRCode, Stepper, InputOTP, the
  Typography code role; `block` turns the hug components that offer it into FILL.
  HUG resolves against the layout-axis context the kit containers publish:
  `alignSelf:"flex-start"` inside a stretching Column and nothing anywhere else,
  because Yoga ignores `width:"fit-content"` against a stretching parent and a bare
  `alignSelf` pins a Row child to the top of a centered Row (both verified on iOS).
  Never write a static `alignSelf:"flex-start"` on a component root.

Only the **layout containers** carry widths, from the one width scale (`widths` in
`src/style/tokens.ts`: Tailwind's `max-w` values copied by hand, `xxxs` 192 through
`page` 1280): `Container` (full width by default; a step caps and centers it, `start`
pins it), Row
children's `span={1..12}` (container-measured px cells with the gaps in the math,
`stacks` ignores spans once stacked), `Grid` tiles, and the shells and floating
overlays (Sidebar, FilterPanel, Dialog, AlertDialog, Popover, Command) that are
bounds providers for their own content. Non-layout components take `LayoutStyle`
for `style` (ViewStyle without width, min/max width, flex, and alignSelf), so a
width shim at a call site is a type error; the docs generator rejects the same keys
in a fence on any non-layout tag; and `test/design-rules-source.test.ts` keeps the
render-at-a-width pair (`{ width: N, maxWidth: "100%" }`) and off-scale caps out of
the kit. The one parent that still collapses `width:"100%"` is a content-sized cell
(a bare Column or Row inside a Row); `useFillStyle` warns there in development, and
a Select opts out because hugging its value is the toolbar cell (`.col-auto`).

The **measure axis** (`MeasureProps` in `src/style/sizing.ts`) is the one way a
component names a width of its own, and it is Container's cap moved onto the
component, not a width: the same step booleans (`xxxs` .. `page`) and `start`, on
Input, Textarea, Select, Autocomplete, Listbox, Slider, Progress, Field, Form,
Button, and ButtonGroup. `<Input sm start>` is FILL capped at 384 (`maxWidth`),
fluid below it, exactly what `<Container sm start>` around it gives; without a step
nothing changes. The precedence is Container's (narrowest wins, `stepOf` reads the
scale's own order), a step centers and `start` pins, and two rules follow from the
component not being a layout container: inside a Row only the cap applies
(`alignSelf` is the cross axis there), and on the hug components a step wins over
`block`. A new adopter extends `MeasureProps` and passes its props to
`useFillStyle` / `useSizing`; do not add a second width vocabulary (`narrow`,
`wide` as a field width, a pixel prop) beside it.

### The responsiveness system (three mechanisms, in order of preference)

1. **Intrinsic sizing** (default, zero JS): FILL or HUG on the component, bounds
   from the parent (a Container step, a Row span, a Grid cell), `minWidth` floors
   plus `flexWrap` (Stats). Zero re-renders, correct in any DEFINITE container,
   correct on frame one and on the server. Never give a component root a fixed
   width, and never make a parent content-sized where a fill child must resolve
   (the old `field-width.ts` post-mortem: a text field in such a parent re-sized on
   every keystroke; the docs stage is definite for exactly that reason).
2. **Container measurement** (components that switch layout): measure the
   component's OWN width via `useContainerBreakpoint` / `useMeasuredWidth` /
   `useContainerWidth` (`src/style/container.ts`), never the window; a component
   cannot know whether it is on a phone or in a 320px desktop panel. Render the
   `base` (desktop) variant on the unmeasured frame; gate on `measured` only
   where the base variant is unrenderable (chart geometry).
3. **Viewport breakpoints** (window-level chrome only): `useBreakpoint`,
   `useFormFactor` (phone <= sm 640 / tablet <= lg 1024 / desktop above; macOS
   and desktop web ARE the desktop form factor), `useResponsive`
   (`src/style/responsive.tsx`, one shared subscription, bucket-granular
   re-renders; width <= 0 resolves to `base`; SSR apps pass ThemeProvider's
   `ssrBreakpoint`). Only the Sidebar/FilterPanel drawer modes and app shells
   qualify. Pointer capability comes from `usePointerCoarse` /
   `useHoverCapable` (`src/style/pointer.ts`).

Layout at call sites: a measure is a `Container` step (never a `maxWidth` on a
component or a raw `View`); a two-up split is a Row of `span` children; equal-width
tiles that renumber columns are `Grid` (`minTileWidth` floor + `columns` cap,
container-measured); content-sized rows that stack at narrow widths are `Row stacks`
(+ `stackBreakpoint`); a hugging toolbar cell is a bare `Column` inside a Row.
Responsive props follow the boolean grammar (`stacks`, `responsive`) with
`BreakpointKey`-valued config props (`stackBreakpoint`, `drawerBreakpoint`);
`Responsive<T>`-valued component props are rejected (compose the public hooks
in app code instead), and so are per-breakpoint spans (a stacked Row is the
`col-12 col-md-6` idiom; finer reflow is Grid's). Rule of thumb: viewport for the
shell, container for the components, intrinsic wherever possible.

## Semantic prop styling

Semantic prop styling is the way to change a component's style, and Canvas does it
with flat boolean props. Each style choice is its own prop, named for the meaning
it carries; passing the prop turns it on. The prop name is the value.

Do this:

```jsx
<Button primary large>Save</Button>
<Button destructive>Delete</Button>
<Button ghost small>Cancel</Button>
<Card raised>...</Card>
```

Not this:

```jsx
<Button variant="primary" size="lg">Save</Button>
<Button tone="destructive">Delete</Button>
<Card elevation="raised">...</Card>
```

The boolean form reads like natural language ("a primary, large button") and is
the only accepted styling API. String-valued enum props (`variant="..."`,
`size="lg"`, `tone="..."`, `elevation="..."`) are rejected: do not add them and do
not document them.

### Axes

Style props are grouped into axes. Props on different axes are orthogonal and
combine freely; props within one axis are mutually exclusive, and you pass at most
one:

- Intent: `primary`, `secondary`, `destructive`, `ghost`, `outline`, `link`
  (pass none for the default look).
- Size: `small`, `large` (pass none for the default, medium size).
- Density: `compact`, `comfortable` (omit for the default density).
- State and layout, orthogonal booleans that stack: `loading`, `disabled`,
  `block` (full width), `rounded`, and the like.

So `<Button primary large loading block>` is four props drawn from four axes, all
applied together.

Glass is NOT a per-component axis: it is a theming-level surface mode, like the
light/dark scheme, and the `ThemeProvider` spells it in the same boolean grammar as
every component axis: `<ThemeProvider glass>` forces it on (the lens or frost
material on non-iOS-26 platforms), `<ThemeProvider solid>` forces the flat look, and passing neither
resolves to the PLATFORM DEFAULT: **glass on iOS 26+** (Apple makes Liquid Glass the
system material for the functional layer there, so a Canvas app matches the OS), and
**solid everywhere else** (web, Android, iOS < 26, Reduce Transparency). `glass`
wins if both are passed. The legacy `surface="solid" | "glass"` value prop remains
supported for config-driven code holding a `Surface` value, and on the web the DOM
helper is `setSurface("glass")` / `setSurface("solid")`. The scheme axis speaks the
same grammar: `<ThemeProvider dark>` / `<ThemeProvider light>` force a scheme
(`dark` wins if both are passed), omitting both follows the OS appearance, and the
legacy `scheme` value prop is likewise supported. The platform default is computed from
`liquidGlassAvailable()` (exported from the kit). Following Apple's Liquid Glass model,
glass is the material for the FUNCTIONAL layer only: overlays (popovers, menus,
dropdowns, selects, autocompletes, dialogs, alert dialogs, sheets, drawers, command)
and the bar/sidebar shells (navbars, sidebar) read as glass. The `card` token stays
SOLID, so content surfaces (cards, lists, tables, calendars, charts) do NOT go glass
(Apple: "don't use Liquid Glass in the content layer").

Those functional-layer surfaces render through the shared `GlassSurface` primitive
(`src/style/glass-surface`), which paints the active material per platform: Apple's
real native Liquid Glass via `expo-glass-effect` on iOS 26+, a real LENS on Chromium
web (an SVG displacement filter applied as the material's backdrop-filter, refraction
concentrated at the rim; `glass-lens.ts`, no module needed), a genuine frosted blur
via `expo-blur` on non-Chromium web, Android, and iOS < 26, and the translucent
`popover` fill as a fallback when no material is available. So glass mode IS real iOS
Liquid Glass on iOS, a real lens on Chromium web, and a real frost elsewhere, not a
per-component effect.
Do not add a per-component `glass` prop and do NOT hand-paint glass (backdrop-filter,
specular edges) onto individual components: route any new functional-layer surface
through `GlassSurface` (pass it the skin's shape style; it strips the fill and
supplies the material), and leave content-layer surfaces solid.

### Conflicts

Any boolean can be passed, so an axis may receive more than one (for example
`<Button primary ghost>`). Each component defines a fixed precedence order per
axis and resolves to the single highest-precedence prop that is set; it never
stacks two intents or two sizes. Document that precedence in the component's entry,
and prefer not to pass conflicting props at the call site.

### Resolution

Each boolean maps to a curated internal set of React Native style objects: the
per-platform skin functions in the component's `*.styles.ts` files, built from the
design tokens. Canvas reads the active booleans, applies the axis and precedence
rules above, and produces the final style. Components consume these props
internally; they do not forward unknown style props to the underlying host
element, and consumers never pass raw style overrides to restyle a component.

Every visual variation a component supports must be exposed as a boolean prop on
one of these axes.

## No styling escape hatches

There is no styling escape hatch in Canvas, period. A component's look and its
in-context layout come from its semantic boolean props (see "Semantic prop
styling") and from the kit's own layout primitives, never from a raw `style={{…}}`
override at the call site.

Banned at every call site (app code, the docs, AND the kit's own `.md`
examples, which are the showcase):

- Restyling through `style`: `backgroundColor`, `borderWidth`/`borderColor`,
  `borderRadius`, `color`, `fontSize`/`lineHeight`/`fontWeight`/`letterSpacing`,
  `opacity`, shadows, gradients, and the like, to change how a component or
  primitive looks.
- Re-spacing / repositioning through `style`: `margin*` (including negative
  margins), `padding`, `gap`, absolute positioning, and hand-set `width`/`height`
  to nudge a component around (e.g. `marginLeft: -12` to overlap avatars).
- Hand-composing a missing widget out of a primitive + raw style: a chip, pill,
  tag, card, identity row, avatar stack, "+N" overflow counter, divider, and so
  on.

Reaching for a style shim is a signal, not a solution: it means the kit is
missing a capability. The fix is always to add that capability to the kit and use
it, never to shim at the call site:

- Missing a visual variation? Add the semantic boolean prop to the component.
- Missing an arrangement? Use or extend a layout primitive (a `Row`/`Column` with
  a `tight`/`snug`/`relaxed`/`loose` gap and boolean alignment, an avatar group
  with overlap), never a hand-rolled `flexDirection` + `gap` + `margin` `View`.
- Missing a composite (chip, identity row, avatar group, icon tile)? Add it to
  the kit per "Dogfood the kit" above, then use it.

This extends the "Resolution" rule ("consumers never pass raw style overrides
to restyle a component") to ALL styling and layout, and it binds the kit's own
`.md` examples: an example that hand-shims is a bug. No component may expose a
`style` prop documented as an "escape hatch"; where one existed (`Avatar`'s
overlap margin), the real capability replaced it (`AvatarGroup` owns overlap).

This is the STYLING escape-hatch ban. It is separate from, and additional to,
the ban on web-only DOM/CSS platform escape hatches in the
"React-Native-everywhere principle" above.

## Components own their label anatomy

A component is the parent node of everything it labels. When a control carries
text, the text goes through the control's own API, never beside it: the title is
`children`, the muted secondary line is the `description` prop (a ReactNode).
The component owns the label typography, the stacked title/description column,
the alignment of its indicator to the first text line, and the whole-row tap
target. Checkbox, Radio, and Switch all follow this contract; it is the standard
for any future control that pairs an indicator with text (an option row, a
selectable card, a chip with a sublabel).

Do this:

```jsx
<Checkbox defaultChecked description="Get notified when activity happens.">
  Email notifications
</Checkbox>
```

Not this:

```jsx
<Row snug alignStart>
  <Checkbox defaultChecked />
  <Column tight>
    <Typography small medium>Email notifications</Typography>
    <Typography tiny muted>Get notified when activity happens.</Typography>
  </Column>
</Row>
```

The hand-composed form is a bug wherever it appears (app code, docs examples,
templates), except inside an intentional Don't fence: it splits the tap target
(only the box toggles), drifts from the control's canonical type scale, and
hides a missing kit capability. If a control lacks the text slot the design
needs (a description, an inline hint, a trailing detail), add it to the kit
component per "Dogfood the kit" (backward-compatibly, following the
`description` precedent), then use it. This extends "Dogfood the kit" and "No
styling escape hatches":
those ban rebuilding a component's look; this bans rebuilding a component's
anatomy around it.

## Preview links on every completed piece of work

Whenever a piece of work is complete, end the report with a "Preview" block of three
clickable links (Web, iOS, Android) that open the feature on each platform, so it can
be eyeballed without hunting for the route. This is in addition to (not a replacement
for) the "Visually inspect UI after changes" global directive; the links are how the
user jumps straight to what changed.

All three are real `http://` links, so every one is clickable from a terminal (a raw
`canvas://` deep link is not: the OS looks for a Mac handler and never reaches a
simulator). The native two point at the local preview opener started by `bun run dev`
(`docs/scripts/preview-server.mjs`), which runs the deep link on the booted simulator
or emulator via `simctl` / `adb`.

Resolve the feature's docs route first, then emit exactly these three links. The route
is the expo-router path in `docs/src/app`, most commonly `components/<slug>` (where
`<slug>` is the component name, e.g. `components/button`), and otherwise
`patterns/<slug>`, `templates/<slug>`, `tokens/<name>`, or a home route such as
`theming`. Substitute the route for `<route>`, and format each as a Markdown link so
it is clickable:

- **Web**: `http://localhost:8081/<route>` (loads the docs in the browser)
- **iOS**: `http://localhost:8790/ios?route=<route>` (opener runs it on the booted iOS simulator)
- **Android**: `http://localhost:8790/android?route=<route>` (opener runs it on the booted Android emulator)

These assume `bun run dev` is running in `docs/` (it starts Metro on 8081 and the
opener on 8790) and, for the native two, a simulator/emulator booted with the Canvas
docs dev app installed. If the opener cannot reach a device it returns the exact
`xcrun` / `adb` command to run by hand.

If the completed work does not map to a docs route (pure tooling, CI, build, or an
internal refactor with no screen), say so in place of the block rather than inventing
a link. When several routes are affected, list a block per route.

## Local consumer linking: node_modules overlay in dev, npmjs package in prod

Consuming repos (dashboard, auth, site, deploy, DarkFactory) overlay their
`node_modules/@nannier-com/canvas` with a REAL-directory copy of this checkout's
package.json, `dist/`, and `styles/`, stamped with an `.origin` file naming
this checkout (their guarded `postinstall` does the copy). A symlink is not
an option: Next 16 Turbopack refuses to resolve a node_modules symlink whose
realpath is outside the consumer's repo. Real directories in node_modules ARE
live-watched (Turbopack and Metro natively; DarkFactory's webpack needs its
two conditional overrides), so no aliases or extra links are involved.

- When editing canvas alongside a consumer, keep `bun run dev` running here.
  It pairs the tsc watch (rebuilds `dist/`) with `scripts/dev-sync.ts`, which
  mirrors dist/ and styles/ into every overlay whose `.origin` points at this
  checkout. Consumers resolve built output, not `src/`.
- The overlay is a local-dev mechanism only. Consumers pin the published
  npmjs version in their package.json, and CI/prod installs that real package
  because no sibling checkout exists there. Never switch a consumer's
  dependency to `link:`/`file:`, and never commit anything under
  node_modules.
