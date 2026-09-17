# Contributing to Canvas

Thanks for your interest in Canvas. This guide covers setting up a development
environment, the checks your change must pass, and the design principles every
contribution is reviewed against.

## Repo layout

The kit source lives in `src/` (`atoms/`, `molecules/`, `organisms/`, `charts/`,
`style/`, plus the theme and token modules). Build tooling lives in `tools/`
(docgen, icongen, favicongen, rastergen) and one-off scripts in `scripts/`. The CSS
foundation is in `styles/`, the test suite in `test/`, and the documentation app,
a universal Expo Router app that runs on iOS, Android, and web and doubles as the
published docs site, in `docs/` with its own `package.json`. Compiled output goes
to `dist/` (gitignored).

## Setup

Canvas uses [Bun](https://bun.sh) for everything: install, scripts, and tests.

```bash
bun install            # root: kit dependencies
cd docs && bun install # docs app; its postinstall symlinks the kit source into place
```

The root install also installs the development-only Husky hooks through the
guarded `prepare` script. Git uses the relative `.husky/_` path, so hooks keep
working when the checkout moves or is used as a linked worktree. Run `bun run
prepare` from the root to repair an older checkout's hook configuration. CI,
production installs, and installs without Husky or a Git checkout skip this step;
the published package does not contain the hook installer.

To run the docs app (the kit's live showcase and your development harness):

```bash
cd docs && bun run dev # Metro on http://localhost:8081, native preview opener on :8790
```

Component edits hot-reload into the docs. Note that Metro does not hot-watch the
symlinked kit source in every case; if a kit edit does not show up, restart with
`bun run dev --clear`.

## Checks

The pre-push hook runs the following local checks in order and stops on the first
failure. Building before verification and tests ensures they use fresh compiled
output:

```bash
bun run typecheck         # kit TypeScript
bun run typecheck:e2e     # end-to-end suite TypeScript
bun run lint              # ESLint, including docs and tests
bun run build             # refresh the published package's compiled output
bun run verify-package    # compiled entry points, imports, and public types
bun run test              # unit tests and compiled-package smoke tests
bun run docs:gen:check     # generated docs match their source
bun run raster:gen:check   # generated native menu glyphs match their source
bun run designmd:gen:check # generated design reference matches its source
bunx tsc --noEmit -p docs/src/core/tsconfig.json # generated example TypeScript
```

CI remains the release authority. It also checks the complete docs app and web
export, browser behavior, theme tokens, design parity, and size budgets. The local
hook does not run the browser suite or deploy anything.

Use `bun run test` to run every unit test under `test/` and `tools/`, with the
shared React Native Web preload from `bunfig.toml`. For a focused run, use a path
starting with `./`, for example `bun test ./test/behavior.test.tsx`. Rooted paths
keep Bun's discovery within the test trees instead of scanning the entire
checkout and retaining enough directory handles to break subprocess tests on
macOS.

## Changesets and releases

Add a changeset for every commit, including documentation and tooling changes:

```bash
bun run changeset
```

Use `patch` by default. A `minor` needs a written justification naming the new
user-visible capability, such as a component, public API, option, or platform.
Major releases require the owner's explicit authorization and are blocked by
both automatic and manual release jobs. Write the summary for a consumer reading
the changelog.

Work directly on `main` unless the owner explicitly requests a branch or pull
request. Verify each phase, then commit and push it without force-pushing main.
Publication goes through CI; do not run `npm publish` locally. The `release`
script is CI-only and requires the prepared candidate and validated artifact
directories.

The main-push Deploy workflow prepares the versioned candidate before the shared
validation jobs run. CI validates the candidate, packs both npm packages, and tests
the prepared web artifact. Publication uses a normal fast-forward candidate push
and the validated tarballs. If main advances, it discards the candidate without
publishing; the newer main run prepares and validates another. Cloudflare receives
the tested docs artifact. The manual workflow uses the same gates.

The workspace includes the root Canvas package and `packages/canvas-blur`.
Changesets can version either package independently; include each changed package
in its changeset. A compatible optional-peer update does not force a Canvas major.
The candidate retains a version and release decision for every package. CI seals
both tarballs, verifies their hashes and installed bytes, then publishes changed
packages with the capture module first. Canvas keeps `v<version>` tags; the module
uses `canvas-blur@<version>`. Tags are pushed only after all publications succeed.
The optional-peer omission matrix continues to install Canvas alone; the native
smoke app installs both sealed packages and checks Android autolinking.

If a release fails after any publication step, fix the cause and add a new
changeset for the next version. Do not republish an old version or release a
locally rebuilt artifact.

## Design principles

Canvas is opinionated, and contributions are reviewed against these rules. The
full versions live in [AGENTS.md](./AGENTS.md).

- **React Native everywhere.** Components are built from React Native primitives
  (`react-native`, `react-native-svg`, the kit's own primitives) so one codebase
  renders on iOS, Android, and web. No web-only escape hatches: no reaching into the
  DOM, no raw CSS on nodes, no `Platform.OS === "web"` markup forks. If React Native
  lacks a primitive, build the effect cross-platform (SVG, style props, math).
- **Semantic boolean props.** Styling is expressed as flat boolean props named for
  meaning (`<Button primary large>`), never string enums (`variant="primary"`).
  Props group into axes (intent, size, density, state); one prop per axis.
- **No styling escape hatches.** A component's look comes from its semantic props
  and the kit's layout primitives, never from `style={{...}}` overrides at the call
  site. If a capability is missing, add it to the kit as a prop or component.
- **Dogfooding.** Every UI element in this repo, docs included, is a Canvas
  component or kit primitive. If the kit lacks something, create or extend the kit
  component rather than hand-rolling a look-alike.
- **Responsive, desktop-first.** Every component adapts from large desktop down to
  phone; author the desktop case first, then scale down.

## Reporting issues

Use the issue templates for bugs and feature requests. For security reports, see
[SECURITY.md](./SECURITY.md); please do not open public issues for vulnerabilities.
