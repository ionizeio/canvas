---
name: canvas-new-component
description: Add a new component (or extend one) in the Canvas RN UI kit — the full validated recipe from shared shell + per-OS skins through docs registration, changeset, and the verification battery. Use whenever creating a kit component, adding a semantic boolean prop, or wiring a component into the docs.
---

# Add or extend a Canvas kit component

Canvas components are built once as a shared shell + per-OS skins, registered in
four places, documented via a co-located `.md`, and shipped with a changeset.
Skipping any registration step hard-fails the build, so follow all of it.

## 0. Decide what you're building

- Kit already has the component? Use it. Almost-fits? EXTEND it
  (backward-compatibly) instead of creating a sibling. Only create new when the
  capability has no home. (AGENTS.md "Dogfood the kit".)
- Styling API is flat BOOLEAN props only — one boolean per choice, grouped into
  mutually-exclusive axes with a documented first-match precedence
  (`toneOf`/`sizeOf` resolver functions). NEVER `variant="..."`/`size="lg"`.
- No `style` escape hatches: `style` may exist for sizing/composition only
  (width/maxWidth); the docgen guardrail hard-fails examples that pass banned
  style keys.

## 1. The file recipe (src/atoms|molecules|organisms/<name>/)

Six files, modeled on `src/atoms/badge/` (Light treatment) or
`src/atoms/typography/` (Shared treatment):

- `<name>.shared.tsx` — `create<Name>(skin)` factory: structure, prop interface,
  axis resolvers (first-match precedence, largest/most-specific first), semantic
  token colors, accessibility. All logic lives here ONCE.
- `<name>.styles.ts` — the `<Name>Skin` interface + `webSkin`/`iosSkin`/`androidSkin`.
  - "Shared" treatment (layout/data-viz, platform-neutral): all three skins
    reference the SAME object — intentional, comment it.
  - "Light" treatment: per-OS deltas only (radius, label type/tracking, press
    feedback: Android `ripple` config vs iOS/web `pressedOpacity` — never both).
- `<name>.tsx` / `<name>.ios.tsx` / `<name>.android.tsx` — thin:
  `export const <Name> = create<Name>(webSkin)` etc. Metro resolves by extension;
  web bundlers fall back to the base file. Export types from each.
- `<name>.md` — the docs source (see §3).

Conventions inside the shell:
- Import primitives/theme from `../../style/index.js` (with `.js` suffixes — ESM).
- Colors from `useTheme()` tokens; scheme-dependent palette picks use the
  `{ tokens, dark } = useTheme()` + `palette["hue-step"]` pattern (see Badge).
- Accessibility: role + label + state, AND the RNW dual-alias (`aria-*`
  alongside `accessibilityState`) because react-native-web drops
  accessibilityState (see `test/a11y-state.test.tsx`).
- `role="img"` not `"image"` (RN Role type).
- Android bounded ripple on a ROUNDED node needs `overflow:"hidden"` or the
  `rippleClip()` helper (`src/style/ripple.ts`), else it bleeds past corners.

## 2. Registration (all four, or the build fails)

1. Barrel: `src/atoms/index.ts` (or molecules/organisms) —
   `export * from "./<name>/<name>.js";` (alphabetical).
2. Docs example scope: `docs/src/core/live-scope.ts` — add to BOTH the import
   list and the `LIVE_SCOPE` object. Missing ⇒ `docs:gen` throws tagViolations.
3. Docs catalog: `docs/src/core/data/components.ts` — `{ slug, name,
   description, category }`; use `dir:` when the slug differs from the source
   directory (e.g. slug `row-column`, dir `layout`).
4. Nav: `docs/src/data/nav.config.json` — add the slug to its category group.
   `cd docs && bun run check:nav` must pass (it cross-checks 3↔4).

## 3. The .md grammar (parsed by tools/docgen/parse-md.ts)

```
# Title
One-paragraph description.
## Usage
one ```tsx fence
## Variants
### <label>        (each heading followed by exactly ONE fence, no prose between)
## Do & Don't
### <topic>
**Do** — caption.
fence
**Don't** — caption.
fence
```

- Every JSX tag in a fence must be in LIVE_SCOPE; fences are type-checked by
  `tsc` against the real exports.
- Usage/Variants/Do fences must be shim-free (guardrail hard-fails banned
  `style={{…}}` keys). `Don't` fences are exempt on purpose.
- Justified rare exception: a `// docgen-allow-style: <reason>` comment on the
  line where the style begins.

## 4. Changeset

Anything exported from `@ionizeio/canvas` ships with a changeset:
`.changeset/<slug>.md`, `"@ionizeio/canvas": minor` for new
components/props, `patch` for fixes. Never `npm publish` locally — CI releases.

## 5. Verification battery (run all; each must be green)

```bash
bun run typecheck                                  # kit
bun run docs:gen                                   # regenerates + guardrail (hard-fail)
bunx tsc --noEmit -p docs/src/core/tsconfig.json   # generated example modules
cd docs && bun run check:nav                       # nav ↔ catalog sync
```

Commit the REGENERATED `docs/src/core/{examples/**,registry.ts,raw-md.ts}` with
your change — the pre-push hook runs `docs:gen:check` (`git diff --quiet`) and
rejects stale codegen.

## 6. Visual QA

Metro does NOT hot-watch the symlinked kit: restart the docs app with
`cd docs && npx expo start --clear` or the running bundle is stale. Verify the
component page in light AND dark before calling it done. If no browser/app is
reachable, say so explicitly — green typechecks are not visual verification.
