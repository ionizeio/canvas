# Material coverage

Run `bun run check:materials` from the repository root, or add `--json` to inspect
the resolved export declarations. The gate reads the TypeScript public export
graph and the generated component docs catalog. It catches added, removed or
misclassified API ownership and route drift without importing React Native at
runtime. Named components, React classes, forwarded refs, aliases and compound
members participate. Public types, constants, hooks and React context objects do
not count as component entries.

`manifest.ts` is an authored design inventory. Each public renderable declares
its family, docs route, owned surface context, material roles, custom-motion
profile, unfilled variants and required verification recipes. Roles are internal
tooling metadata, not public string-valued styling props:

- `static`: stable frost for an intentionally surfaced content or input region.
- `liquid`: functional material appropriate to its context and native capability.
- `inherited`: content, layout or data ink that does not own a separate pane.

Every owned surface also follows `solidMaterialContract`: complete opaque
appearance, no glass rendering work, and state-preserving switching in both
directions. A liquid role does not imply custom deformation. The selection pilot
is separately named; native feedback is the default elsewhere.

When adding or changing an export, update its exact entry after reviewing the
source and docs. Do not assign roles by substring matching component names:
`Row` is not `RowMenu`, and `Grid` is not `GridList`. Structural compound parts
such as CardHeader and ToastProvider retain their own inherited classification.
`materialComponentRoutes()` projects unique component routes for QA, including
inherited-only routes that need composition checks. Existing docs examples and
overlay recipes determine the state to capture; the manifest does not fabricate
example URLs or force a frame onto an intrinsic chart.

The initial inventory covers 99 product families, 104 component docs entries and
142 public renderable APIs, including four Backdrop compound members. These are
descriptive counts, not hard-coded limits: future public APIs must be classified.

Verification IDs record obligations, not executed tests or proof of renderer
support. The checker explicitly reports runtime evidence as `not-recorded`.
Lookout, real browser interactions, native device checks and separate screen-reader
evidence must establish those results against an identified candidate. A browser
preview of an iOS skin is still a browser result.
