# Native tooling evidence fixtures

`maestro-2.10-carousel-ios.log` is the exact single `JsConsole` line captured on
2026-09-08 by Maestro 2.10.0 during the targeted immutable 2e1 iOS Carousel
measurement. No identifiers, whitespace or measurement fields were rewritten.

- Source candidate: `2e1abfa75575aba994726d6d23d1ebe48a8dd1e2`.
- Package: `@ionizeio/canvas@2.62.3`.
- Package SHA-256: `2fa63129118817e2ae81f28c94b079f579a91946790a1d3d00bab4c7b34b9c9e`.
- Source log line: 122, timestamp `09:56:17.129`.
- Full source log SHA-256: `4b222d94f163cfe473e7581bb4450ec75979645607688909279f6832ff24e8f5`.
- Captured-line SHA-256, including its final newline: `028d1f9136c1c5fae871276cb9b74c7cb6aca5aa9900a0646e1ee74c32eebb1d`.
- Original evidence: `/private/tmp/canvas-carousel-continuity-20260908/runs/ios/light/measurement.json`
  identifies the full flow-scoped source log and manifest.

Both targeted iOS phases passed. The enclosing scratch recorder failed its
separate installed-path equality check after phase A's original `clearState`
reinstalled identical app bytes under a new simulator container. That result
remains unchanged. This fixture proves the real logging format, not a complete
ordinary native or assistive-technology pass. The unit test creates a temporary
manifest around this real line; it does not represent that manifest as captured.
