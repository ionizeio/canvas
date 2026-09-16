---
name: canvas-controllable-state
description: Wire the controlled + uncontrolled duality contract into a stateful Canvas component using the useControllableState hook (value/defaultValue/onChange). Use whenever a component owns interactive state (toggle, selection, open/close, text, active index), when a bare <Component /> must be interactive out of the box, or when adding a controlled prop to a control that is currently controlled-only.
---

# Controlled + uncontrolled duality

Every stateful Canvas control obeys one contract, implemented once by
`useControllableState` (`src/style/use-controllable-state.ts`, re-exported from
`src/style/index.js` at line 18). A control accepts BOTH a controlled prop plus a
change callback AND an uncontrolled `default*` seed:

- `<Switch checked={on} onChange={setOn} />` controlled (parent owns state).
- `<Switch defaultChecked onChange={log} />` uncontrolled (component owns it).
- `<Switch />` uncontrolled, interactive out of the box (must toggle, not sit inert).

Rules the hook enforces: controlled when the controlled prop `!== undefined`, else
internal state seeded ONCE from `defaultValue`; the change callback fires in BOTH
modes; the mode is latched from the first render (React itself warns on switching).

## The hook API

```ts
useControllableState<T>(
  controlled: T | undefined,   // the controlled prop; undefined = uncontrolled
  defaultValue: T,             // seed for uncontrolled use (needs a concrete fallback)
  onChange?: (next: T) => void // fired in BOTH modes
): [T, (next: T) => void]      // [current value, setter]
```

Internally: `isControlled` is latched via `useRef(controlled !== undefined).current`;
`value` is `controlled` when provided else `internal`; `setValue` calls
`setInternal` only when uncontrolled, then always `onChange?.(next)`.

## Wire it (recipe)

1. Declare the prop trio on the interface: the controlled prop named for the
   concept (`checked`/`value`/`open`/`active`/`query`), a `default<Concept>` seed,
   and an `on<Concept>Change` (or a domain verb) callback. All optional.
2. Import `useControllableState` from `../../style/index.js`.
3. Call it with the RAW props, one call per independent state axis:
   `const [value, setValue] = useControllableState<T>(props.value, props.defaultValue ?? FALLBACK, onChange);`
4. Read `value` for rendering; call `setValue(next)` on every user interaction.
   Never `setState` a parallel copy or read `props.default*` again after mount.

## Naming conventions (per the kit's adopters)

| component | controlled | seed | callback | slot-3 type |
|---|---|---|---|---|
| Switch / Checkbox | `checked` | `defaultChecked` | `onChange` (+ `onValueChange`) | `boolean` |
| Slider / NumberInput | `value` | `defaultValue` | `onChange` | `number` |
| Select (value) | `value` | `defaultValue` | `onSelect` | `string` |
| Select (open) | `open` | `defaultOpen` | `onOpenChange` | `boolean` |
| Combobox | `query` | `defaultQuery` | `onQueryChange` | `string` |
| Tabs | `active` | `defaultActive` | `onChange` | `number` |
| TabBar | `active` | `defaultActive` | `onSelect` | `string` |

## Real adopters

Switch (`src/atoms/switch/switch.shared.tsx`, ~L72) fans two callbacks through the
single `onChange` slot:

```tsx
const [checked, setChecked] = useControllableState<boolean>(
  props.checked,
  props.defaultChecked ?? false,
  (next) => { onChange?.(next); onValueChange?.(next); },
);
// handlePress: setChecked(!checked)
```

Select (`src/atoms/select/select.shared.tsx`, ~L77) drives TWO orthogonal axes
with two calls, open and value:

```tsx
const [open, setOpen] = useControllableState<boolean>(props.open, props.defaultOpen ?? false, onOpenChange);
const [value, setValue] = useControllableState<string>(props.value, props.defaultValue ?? "", onSelect);
```

## Gotchas

- Pass the RAW controlled prop into slot 1. Do NOT destructure it with a default
  (`const { checked = false } = props`) or coalesce it (`props.checked ?? false`)
  before the hook: that turns an absent prop into a concrete value, so the hook
  reads it as permanently controlled and a bare `<Switch />` goes inert. Switch and
  Select deliberately read `props.checked` / `props.open` directly instead of
  destructuring them.
- Slot 2 (the seed) DOES need a concrete fallback (`props.defaultChecked ?? false`,
  `props.defaultValue ?? min`) because it becomes the initial state when uncontrolled.
- The seed is read ONCE (first render only). Changing `default*` later does nothing,
  by design. Do not treat `default*` as a live prop.
- Mode is latched at mount. Never flip a component between controlled and
  uncontrolled across renders (do not swap `value={x}` for `value={undefined}`).
- One hook call per independent scalar axis. Where open state must interleave with
  focus/typing side effects (Combobox, `src/atoms/combobox/combobox.shared.tsx`),
  the hook drives `query` while `open` uses the same contract hand-rolled
  (`openProp ?? internalOpen`); keep the contract identical either way.
- New stateful component ⇒ it ships in `@ionizeio/canvas`, so add a changeset
  (see the `canvas-new-component` skill).

## Verification

```bash
bun run typecheck   # tsc --noEmit; the hook's [T, setter] tuple type-checks the wiring
bun test            # forms.test.tsx: controlled toggling; behavior.test.tsx: uncontrolled
```

`test/forms.test.tsx` asserts controlled toggling (Switch/Checkbox report the next
value); `test/behavior.test.tsx` (~L53) asserts the uncontrolled path (a bare
Combobox is typeable and seeds from `defaultQuery`). A new control needs both a
controlled test and a bare-component-is-interactive test.
