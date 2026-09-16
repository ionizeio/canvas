# Security Policy

## Supported versions

Security fixes are released against the latest published version of
`@nannier-com/canvas` on npm. Please upgrade to the latest release before
reporting an issue.

## Reporting a vulnerability

Please report vulnerabilities **privately**, not through a public issue.

Open a private security advisory through GitHub:
[Create a private advisory](https://github.com/ionizeio/canvas/security/advisories/new).

Include the affected version, a description of the issue, and, where possible,
a minimal reproduction. You can expect an initial acknowledgement within a few
business days.

Because Canvas is a UI component library with **no runtime dependencies** (it
ships only compiled JavaScript and CSS, with React / React Native and the
optional peers resolved by the consumer), most security-relevant surface is in
the build/dev toolchain and the peer dependencies rather than in shipped runtime
code. Reports about the published package, its types, or its CSS are all in
scope.
