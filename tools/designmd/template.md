---
generated: replaced wholesale by tools/designmd
---

<!-- The frontmatter above and the token tables below are GENERATED from
     src/style/tokens.ts and styles/tokens/*.css by tools/designmd. Edit those, or
     tools/designmd/template.md for the prose, then run `bun run designmd:gen`. -->

# Canvas

One component API, three native looks. Canvas is a React Native UI kit that renders
natively on iOS and Android and, through React Native Web, in a browser, from a single
codebase. Each component ships a shared shell and a skin per platform, so a Button is
an iOS capsule with a semibold label, a Material 3 stadium with a ripple, and a
12px-rounded web control in Dark Factory's colors (a green call to action, a violet
selection color, white cards on a lavender page), without the caller choosing between
them.

The rest of this document is what an agent or a developer needs to build with the kit
and get it right: the values, and the four rules that are easy to break by accident.

## Components

**Every visual variation is a boolean prop, named for what it means.** Passing the prop
turns it on; the prop name IS the value.

```jsx
<Button primary large>Save</Button>
<Button destructive>Delete</Button>
<Button ghost small>Cancel</Button>
<Card raised>…</Card>
```

String-valued enum props are not part of this API and never will be. `variant="primary"`,
`size="lg"`, `tone="destructive"` and `elevation="raised"` do not exist; passing one does
nothing, silently, because React drops unknown props.

Props are grouped into axes. Different axes combine freely; within one axis you pass at
most one:

- **Intent**: `primary`, `secondary`, `destructive`, `ghost`, `outline`, `link`. Pass
  none for the default look.
- **Size**: `small`, `large`. Pass none for the default.
- **Density**: `compact`, `comfortable`. Pass none for the default.
- **State and layout**, orthogonal booleans that stack: `loading`, `disabled`, `block`,
  `rounded`, and the like.

So `<Button primary large loading block>` is four props from four axes, all applied. If
two props from one axis arrive, the component resolves to one by a documented
precedence and never stacks them.

**A component owns the text it labels.** The title is `children`, the muted second line
is the `description` prop. The component owns the label typography, the stacked column,
the alignment of its indicator to the first line, and the whole-row tap target.

```jsx
<Checkbox defaultChecked description="Get notified when activity happens.">
  Email notifications
</Checkbox>
```

Composing that out of a Row, a Checkbox and two Typography nodes splits the tap target
so only the box toggles, drifts from the control's type scale, and is a bug wherever it
appears.

## Colors

Semantic tokens, one set per scheme, derived from Dark Factory's palettes (blush for
light, its single dark palette for dark; the source is vendored at
`tools/darkfactory/theme.json`). Every role is a Dark Factory value or a recorded rule over
Dark Factory values in `tools/darkfactory/derive-tokens.ts`, which solves a role to the
kit's contrast floors where the raw value falls short; `bun run check-df` holds the shipped
values to that derivation. Components read them through `useTheme()`; the scheme follows
the OS unless `<ThemeProvider dark>` or `<ThemeProvider light>` forces one. On the web the
same values ship as custom properties in `styles/canvas.css`, where dark keys off a `.dark`
class on the root rather than `prefers-color-scheme`.

Two roles carry the brand, and they differ on purpose. `primary` is the selection color:
checked, selected and current states, links and the focus ring. `action` is the
call-to-action fill: primary buttons, meters, count badges. A theme that overrides
`primary` alone repaints both, since `action` follows an overriding `primary` unless the
theme sets it too. `scrim` dims the page behind every modal. The `-soft` washes, `shade`
(the shadow tint), `inverse` and `inverse-foreground` (the surface of a tooltip or a
snackbar) and `field-fill` are optional roles the skins adopt as they take the Dark
Factory look; a theme that omits them keeps the older fallbacks.

<!-- @generated:colors -->
<!-- @/generated -->

The chart series is a fixed assignment: series one is always `chart-1`, and filtering a
series out never renumbers the rest.

**Glass is a theming mode, not a component prop.** `<ThemeProvider glass>` forces the
material on, `<ThemeProvider solid>` forces the flat look, and passing neither resolves
to the platform default: glass on iOS 26 and above, where Apple makes Liquid Glass the
system material, and solid everywhere else. Under glass every surface renders through
the material, layered, each layer with its own under-fill: the functional shells and
overlays (navbars, the tab bar, the sidebar, dialogs, sheets, drawers, popovers, the
command palette) take the sheer `glass-tint`; the content panes (cards, lists, tables,
calendars, charts, alerts) the denser `glass-tint-content`, so their text keeps its
contrast; the controls (fields, buttons, tabs, chips, badges, switches, checkboxes)
the bright `glass-tint-control` puck, brand-tinted where the fill is the brand; and
the surfaces a user reads and acts on (menus, selects, alert dialogs, toasts, tooltips)
the densest `glass-tint-dense`. Fills inside a surface become ink tints, a brand
puck stays as sheer as its ink's 4.5:1 allows, and solid mode is untouched. There is
no per-component `glass` prop, and hand-painting the material onto a component is not
a supported way to get one.

## Typography

Two faces, Manrope and Geist Mono, and one scale: Dark Factory's dense one, bold titles
stepping down from the display 24 to the heading 14, body copy at 12.5 medium. The
semantic roles below are what the Typography component renders. Headings lead tighter
than body copy. Reading copy sits at 12px or above and small labels at 11 (the smallest
reading and label styles iOS and Material 3 define), and the roles under that, `tiny` and
the uppercase `caption` eyebrow at 10, are for metadata and labels rather than for
anything a reader has to work through. Dynamic Type, Android font scale and browser zoom
all still apply.

<!-- @generated:typography -->
<!-- @/generated -->

## Layout

The spacing scale, in pixels:

<!-- @generated:spacing -->
<!-- @/generated -->

Layout is composed from the kit's own primitives rather than from raw flex styles. A
`Row` or `Column` takes a gap by name (`tight`, `snug`, `cozy`, `relaxed`, `loose`) and
alignment as booleans. Equal-width tiles that renumber their columns are a `Grid`, with
a `minTileWidth` floor and a `columns` cap. Content-sized rows that stack when narrow
are a `Row stacks`.

## Shapes

Corner radius and the platform touch minimums, which differ by design: iOS rounds to a
continuous 10 to 12, Material 3 uses its medium shape and a full pill on buttons, and
the web follows Dark Factory: 8 on rectangular controls, 10 on fields, 12 on menus and
tiles, 14 on cards, 18 on dialogs, 22 on sheets and the app shell, and a pill on every
capsule (`shape` in `src/style/tokens.ts`).

<!-- @generated:shapes -->
<!-- @/generated -->

A nested surface is never rounder than what contains it. Where a control is smaller
than its platform's minimum touch target, the shape stays and the TOUCH area grows: the
kit measures the rendered control and extends it with hitSlop, so nothing moves.
`useMinTargetSlop` and `TOUCH_TARGET` are exported for building your own.

## Elevation and depth

One ladder, Dark Factory's: each shade is cast straight down with a negative spread, so
it pools under a surface's lower edge rather than haloing it, in the palette's own
`shade` (a violet wash in light, black in dark). No horizontal offset, the shade never
rises, and as rendered its darkest point beside a surface stays within 1.6:1 of that
surface (the old 0.2 opacity cap's own limit), so a shadow reads as depth rather than as
a border. The values below are the light palette's; `xl`, the dialog's shade, is a black
top-layer separator on every palette.

<!-- @generated:elevation -->
<!-- @/generated -->

Cards rest at `sm`, raised cards at `md`, overlays at `lg` and `xl`. iOS surfaces are
flat by convention and take no shadow at all.

## Motion and interaction

<!-- @generated:motion -->
<!-- @/generated -->

Canvas animates sparingly and functionally: entrance fades, an accordion height, a
skeleton shimmer, a spinner. Under `prefers-reduced-motion` every duration above goes
to zero, while information-bearing motion (a spinner, a determinate progress bar) is
left intact. Animate only `transform` and `opacity`, which is both the React Native
native-driver constraint and the only thing a compositor can do cheaply.

Press feedback is the platform's own: iOS dims, Material 3 ripples, the web tints. Every
interactive component ships hover, press, focus and disabled states, and a data-bearing
one ships loading and empty states as well.

## Responsive behavior

Canvas is authored desktop-first: size a component for the desktop case, then add the
variants that scale it down. There are three mechanisms, in order of preference.

1. **Intrinsic sizing**, which costs no JavaScript: a fixed width plus
   `maxWidth: "100%"`, or a `minWidth` floor plus wrapping. Never swap a fixed width for
   `width: "100%"` below a threshold; in a content-sized parent the element then tracks
   its own content.
2. **Container measurement**, for a component that changes layout: measure the
   component's OWN width with `useContainerBreakpoint` or `useMeasuredWidth`. A component
   cannot know whether it is on a phone or in a 320px panel on a desktop.
3. **Viewport breakpoints**, for window-level chrome only: `useBreakpoint`,
   `useFormFactor`, `useResponsive`. Only app shells and drawer modes qualify.

Viewport for the shell, container for the components, intrinsic wherever possible.

## Do's and Don'ts

**Do** pass a semantic boolean for every variation, and add one to the kit when the
variation you need is missing.

**Don't** restyle through `style`. There is no styling escape hatch: no `backgroundColor`,
`borderRadius`, `color`, `fontSize`, `opacity`, shadow or gradient override at a call
site, and no `margin`, `padding`, `gap` or absolute positioning to nudge a component
around. Reaching for one means the kit is missing a capability, and the fix is to add
that capability.

**Don't** hand-compose a widget out of a primitive and raw styles. A chip, a pill, an
identity row, an avatar stack, a "+N" counter, a divider: if the kit does not have it,
add it to the kit.

**Don't** put a label beside a control that has a text slot. Use the slot.

**Don't** branch on the platform to render different markup, or reach into the DOM to
get an effect working on the web alone. When React Native lacks a primitive the design
needs, build it cross-platform from `react-native-svg`, the `boxShadow` and `filter`
style props, or arithmetic.

**Don't** read the CSS layer on a native build. `styles/` is the web hand-off, including
the `--p-*` platform variables that let a browser paint all three looks. On iOS and
Android the skins are the implementation.

## Iteration guide

Change a colour in `styles/tokens/colors.css`, mirror the resolved sRGB hex into
`src/style/tokens.ts`, and run `bun run validate-tokens`, which compares the two sides
including the oklch conversion. Change a component's metrics in its `*.styles.ts` skin
and mirror them into `styles/tokens/platforms.css`. Then run `bun run designmd:gen` so
this document keeps up, and `bun test`, whose design-rule suites assert most of what is
written above.

## Known gaps

Three lists in the repository record what is known to be wrong, each entry with a
measurement rather than an adjective, and each checked in both directions so it cannot
go stale: `e2e/responsive/component-widths.e2e.ts` holds the pages that still overflow
their column at tablet width, `test/touch-target-coverage.test.ts` holds the controls
below their platform's touch minimum and how every other one reaches it, and
`e2e/a11y/components.e2e.ts` holds the accessibility findings that stand. A fourth,
`HANDOFF-PARITY.md`, tracks where the prop surface diverges from the design hand-off.
None of those four ships in the package; they are in the repository.
