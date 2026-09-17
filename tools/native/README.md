# Native candidate verification

The smoke app is an isolated copy of `examples/starter`. Its checked-in dependency
stays pinned to npm. Candidate preparation verifies the release seal, installs the
exact Canvas and optional capture module tarballs only in the copy, and compares
installed package bytes before building
or testing. No source resolver, workspace link, `.origin` overlay or optional-peer
stub is allowed. Both package hashes and versions are retained in the identity.
Preparation also proves Android autolinking resolves the isolated installed module,
and preserves that result in `android-autolinking.json`. These fixtures are outside the library's published `files` set.

Reviewed fixture bodies and route templates live in `examples/starter/smoke`,
outside the ordinary app's source and route graph. Preparation copies only the
entries listed in `smoke/manifest.json` into the temporary app after installing the
candidate, then typechecks the resulting app against that exact package. The docs
import those same bodies. This permits a candidate fixture to exercise a new API
without requiring the registry-pinned starter to compile against an unpublished API.
The smoke environment flag selects the app identity and enables prepared routes;
the flag alone does not install routes into the ordinary app.

The runner requires a clean checkout of the identified candidate, its `candidate`
directory, and the sealed `artifacts` directory. Use task-local output paths:

```sh
node scripts/native-smoke.mjs prepare --candidate /tmp/candidate --artifacts /tmp/artifacts --output /tmp/native-candidate
node scripts/install-maestro.mjs /tmp/native-tools
node scripts/verify-native-flow.mjs --maestro /tmp/native-tools/maestro/bin/maestro
node scripts/native-smoke.mjs build --output /tmp/native-candidate --platform ios --device SIMULATOR_UDID
node scripts/native-smoke.mjs test --output /tmp/native-candidate --platform ios --device SIMULATOR_UDID --maestro /tmp/native-tools/maestro/bin/maestro
```

For Android, replace `ios` and `SIMULATOR_UDID` with `android` and an explicit adb
serial. Set `JAVA_HOME`, `ANDROID_HOME` and `PATH` for that command if the SDK/JDK
is not already configured. The runner does not alter shell profiles or SDK
installations. The journey installs `com.nannier.canvas.starter.smoke`, preserving
the ordinary starter and docs apps. Maestro installs its native automation driver.

Android CI also runs the capture module's device instrumentation before Maestro:

```sh
node scripts/native-smoke.mjs build --output /tmp/native-candidate --platform android --device emulator-5554
node scripts/native-smoke.mjs instrument --output /tmp/native-candidate --platform android --device emulator-5554
node scripts/native-smoke.mjs test --output /tmp/native-candidate --platform android --device emulator-5554 --maestro /tmp/native-tools/maestro/bin/maestro
```

Preparation archives the candidate revision's entire
`packages/canvas-blur/android/src/androidTest` tree and the Gradle init script into
`android-instrumentation-inputs`. They are verification inputs, intentionally
absent from the published module. The init script locates the installed sealed
module by its canonical project directory, attaches those preserved test sources
to `androidTest`, and redirects generated output to `android-capture-build` outside
`node_modules`. The same output redirection is used by the app's release build.
Production files remain byte-for-byte equal to the sealed archive before and
after either operation. No installed source is replaced or excluded from that
comparison, and the app's release APK digest must remain unchanged.

Instrumentation installs the module's test APK and runs its debug native variant
on the same explicit emulator serial. It checks the sealed production source;
Maestro separately checks the app's release binary. These are distinct proofs.
The gate requires nonempty JUnit cases with no failures, errors, skips, or duplicate
identities. A failed command cannot pass because a report exists, and previous
connected-test reports are removed before the attempt. Candidate/module hashes,
preserved test inventories, current tooling hashes, device API/fingerprint, actual
Gradle project/source configuration, logs, and XML/HTML reports are retained in
`android-instrumentation-evidence`. CI uploads that directory and its input archive
even when the gate fails. This reuses the independent consumer and emulator;
it does not build a second docs project or claim all supported Android versions.

The release builds contain embedded JavaScript, so they do not require Metro.
Before input, the flow reads the actual runtime candidate revision and tarball hash,
compares the version bundled from the installed package's own `package.json`, and
rejects an HTTP Metro bundle URL. Form selection must fire once without submitting;
explicit submit must fire once; Listbox row taps must toggle once; and a Drawer
must host and select its child Autocomplete in the native window.

The shared public-ref fixture checks six attached hosts, positive Slider measurement,
cleanup and reattachment, and that focus requests do not activate controls. Radio,
Checkbox and Switch taps then exercise their change callbacks. A recorded focus request does
not prove native non-text focus or screen-reader focus; those depend on the OS and
React Native configuration and require their own observed checks.

The flow also selects the second Dropdown row (Archive) over the Drawer editor,
an unselected single Listbox option, an unchecked multi Listbox row, an inactive
Tab and an unchecked Radio. It checks identity or state and one callback per
activation. Disabled Archive, both disabled Listboxes, an individually disabled
Tab, whole disabled Tabs and a disabled RadioGroup retain their counters. The
disabled fixture query creates a fresh body, so previous selections cannot leak
into those checks. These are ordinary native taps, not proof of TalkBack hover
targeting or accessibility activation. The separate screen-reader protocol uses
these same controls in both appearances.

Each platform runs the flow in light and dark appearance, verifies the resolved
theme in diagnostics, and restores the device's prior appearance. It writes
`*-evidence/result.json`, separate JUnit reports, Maestro command logs and
screenshots. A result is written as passed only after both complete flows succeed.
Binary digests and app source inventories prevent an old binary or edited fixture
from being reused as candidate evidence. Preserve these files with the candidate
artifact. Device API level, OS and framework versions identify what was exercised;
one device run does not prove every supported OS version.

To exercise an unchanged binary after correcting test infrastructure, pass
`--evidence /tmp/native-candidate/ios-evidence-flow-fix` to `test`. The requested
directory must be a fresh direct child of the candidate output, named
`ios-evidence-<label>` (or `android-evidence-<label>`). Existing files, directories
and links are rejected. Earlier results remain intact. The new result records
the current test revision, dirty state and tooling hashes separately from the
original candidate identity and binary digest. It preserves both authored flow
segments and each generated phase with its parser result and checksum. This does not claim that an older binary was built from
the newer test revision; changed package or app inputs require a new build.

The preflight invokes the installed, pinned Maestro command parser through a
small Java 17 source launcher before any device action. CI also runs it before
building. Maestro 2.10's `check-syntax` only deserializes YAML and can accept
commands that fail during conversion, including interpolated swipe coordinates.
The Carousel journey therefore uses two official CLI invocations per appearance.
The first completes the earlier scenarios and measures the current card. It emits
one validated console record with the candidate identity, appearance and a unique
attempt nonce. The runner requires a successful process and JUnit case, finds the
actual flow log through Maestro's artifact manifest, and rejects missing,
ambiguous, malformed or mismatched records. It does not scrape command source or
reuse a prior run's coordinates.

The second invocation continues the same app state. Before a gesture it checks
the retained page, zero change callbacks and measurement generation 1, then asks
for generation 2 exactly once. All geometry, screen, scale and platform values
must match. The runner generates literal coordinates from 80% to 20% of that
card at its vertical center, using iOS points or Android physical pixels. The
fresh guard recomputes those integers and requires both endpoints strictly inside
the card, with travel greater than half its width. One 400 ms swipe must produce
page 3 and one change callback; the picker then produces page 6 and two callbacks.
All later authored scenarios run from the preserved `after-carousel.yaml`.

There is no launch, reset, navigation or appearance change between the phases.
Lost state or changed geometry fails the attempt before dragging. The complete
command parser checks both authored segments and every generated phase, including
the eagerly parsed nested post-flow. CI tests generated examples before building.
The result records both phase reports, flow hashes and original measurement log
identity; a scheme passes only when both phases succeed. Appearance restoration
covers a failure in either phase.

Parser success does not establish selector availability or gesture behavior;
the native journey still checks page identity and callback count.

These flows exercise real native input and accessibility selectors. They do not
run VoiceOver or TalkBack. Their fields remain `not-run`; follow
[the screen-reader protocol](accessibility.md) for separate spoken-feedback checks.

Maestro is installed from an official release archive using the SHA256 in
`maestro.json`. Java17+ is required by the
[official CLI installation instructions](https://docs.maestro.dev/maestro-cli/how-to-install-maestro-cli).

## Passive Android CI host evidence

The Android workflow records `android-host-diagnostics/` alongside the native
result. Its pre-emulator hook inventories executable ADB paths, hashes and local
`adb version` output. It leaves server ownership, trace settings, SDK versions,
build order and device commands unchanged. It does not open an ADB connection,
start a server, reconnect a transport or replay a failed command.

A task-owned collector samples the actual TCP 5037 listener inode and owning
PID/file descriptor, verifies the descriptor still references that socket, and
records process start ticks/executable. It also records the `canvas_candidate`
emulator process, host memory/load/pressure and the observer's cgroup memory
fields. Existing daemon logs are read through bounded tails, using verified
listener stdout/stderr files and the documented ADB log path. The server may have
a different environment, so log discovery and trace coverage remain explicit
limitations. Missing tools, permissions or files are recorded as unavailable.

History uses two segments totaling at most 2 MiB; four current daemon tails retain
at most 256 KiB each. Up to 32 bounded lifecycle/failure snapshots preserve selected
log tails and source identities. Every record has host UTC and monotonic time.
Five-second sampling cannot exclude a brief intermediate process/transport event,
and guest log timestamps are not assumed synchronized with the host. Log offsets,
inodes and discarded-byte counts distinguish truncation and replacement.

On a journey failure, host-only capture runs before the runner restores device
appearance. This matters because restoration itself uses ADB. Capture has a
five-second process deadline; its kernel journal read is capped at 400 lines,
256 KiB and three seconds. It issues no new ADB status or shell command, since
ordinary ADB clients can start or replace a server. Unavailable kernel evidence
does not mean that no OOM or process exit occurred. Original journey/restoration
errors and the wrapped child's exit code or signal survive diagnostic failures.
Setup or finalization failures, including a rejected observation host/path, report
unavailable diagnostics without changing the native job outcome. Rejected guards
perform no observation I/O; a validated run still executes its native child once.
Malformed or duplicate command arguments remain fatal. Diagnostics do not create
the native candidate parent directory that preparation requires to be new.

The collector startup handshake is bounded to three seconds. A timeout records
unavailable startup acknowledgement; it does not start another collector or stop
the native attempt. The original collector can become ready later. The finalizer
uses its recorded owner identity even after that timeout, verifies PID start
identity, then requests its final flush and stop with a bounded acknowledgement. It never signals ADB or the emulator. Partial diagnostics
are uploaded with the normal 14-day artifact retention. A hard runner loss can
prevent finalization/upload. These records improve diagnosis; they do not fix a
transport disconnect or make one later successful run proof of its cause.

## iOS compiled-route build evidence

After Xcode succeeds, the runner retains the exact pre-Hermes bundle, embedded
bytecode, embedded Expo configuration and Info.plist in `ios-bundle-evidence/`.
The build manifest records the report path and checksum; CI uploads this directory
with the native evidence even when a later journey fails. Observation failures
remain explicit and do not change the build outcome.

The installed Babel parser and lexical bindings identify the compiled
`TestingLayout` within the full Metro bundle. Only recognized unconditional JSX
returns classify as smoke-enabled or redirect; missing, minified, ambiguous or
unrecognized forms remain unavailable or unclassified. Dependency exports and
route table entries are supporting syntax evidence, not proof of execution.

The installed official Hermes decoder reads its source hash header, then the
observer deliberately stops that process. Actual exit/signal, retained header,
timeouts and truncation are recorded separately. A binding requires the header's
SHA1 to match the retained plain bundle, with original and retained bundle bytes
unchanged. A mismatch stays a mismatch. This does not compile another bundle.

The report includes parser/compiler identities, embedded scheme/app identifier,
candidate identity comparison, and only the runner's smoke flag and identity
presence. Xcode script-phase environment inheritance remains unobserved. An
enabled compiled route does not prove URL delivery or navigation; a compiled
redirect does not establish where an incorrect build value originated.

## Android appearance restoration

Before installing the candidate or changing appearance, the runner validates the
captured `cmd uimode night` output with the shared appearance parser. It preserves
all five writable values: `yes`, `no`, `auto`, `custom_schedule` and
`custom_bedtime`. Bare `custom`, unknown values and malformed output stop the
attempt before mutation. Restoration replays the exact captured mode and subtype;
this does not claim to restore every historical automatic-policy override.
