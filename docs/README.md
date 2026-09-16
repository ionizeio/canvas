# Canvas docs (Expo Router)

The universal Canvas documentation app runs on iOS, Android, and the web from one
Expo Router codebase. The published `@ionizeio/canvas` package contains compiled
`dist/` output. This app develops against the checkout's live `src/` instead:
`postinstall` creates one `node_modules/@ionizeio/canvas` symlink to the repository
root, and `metro.config.js` resolves the package import to `src/index.ts` through
that symlink. Metro also watches the source and resolves the native skin files.
Generated documentation and examples live in-tree at `src/core`, with no second
symlink.

## Develop

Start from the repository root:

```sh
bun install
cd docs
bun install            # links the live kit checkout into this app
bun run dev            # Metro on :8081 and native preview opener on :8790
```

The web docs are at <http://localhost:8081/>. The preview opener routes HTTP links
to a booted iOS simulator or Android emulator with the docs development app
installed. Use `bun run dev --clear` if Metro needs its cache cleared.

From `docs/`, the platform and export commands are:

```sh
bun run web            # Metro web development without the preview opener
bun run ios            # build and run natively with Xcode
bun run android        # build and run natively with the Android SDK
bun run build:web      # complete static web artifact in dist/
```

`build:web` runs the Expo export and then adds font preloads, inlines CSS, and
prepares asset paths for Cloudflare Pages. Run this script when checking the
shipping web artifact; a bare Expo export omits those preparation steps.

iOS builds need a UTF-8 locale for CocoaPods:

```sh
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 bun run ios
```

## Validation and web deployment

The **Deploy** workflow in `.github/workflows/deploy.yml` runs for main pushes and
supports manual runs on main. It prepares version metadata before calling the
shared validation workflow. Validation builds the package and web docs, checks
their types and generated sources, and runs the unit and browser suites.

Publication accepts the frozen candidate only while its source is still the
current main revision. If main advances, the candidate is discarded and the newer
main run prepares another. Cloudflare Pages receives the same prepared web
artifact that the browser tests exercised, at <https://canvas.nannier.com/>.
The npm release publishes the validated tarball through CI. See the repository's
[contribution guide](../CONTRIBUTING.md) for changeset and recovery rules.

`EXPO_BASE_URL` remains available for deployments under a subpath through
`app.config.js`. Production and local development use the root path.

## Native builds (EAS)

For native builds, run **Deploy** manually on main, select the `ios` and/or
`android` input, and choose an EAS profile. These jobs use the accepted, validated
source. The workflow queues builds with `--no-wait`; successful queueing is not a
completed device build or store submission. Follow the EAS links in the run
summary for those results.

- `production` creates store builds and automatically submits iOS to App Store
  Connect. Android submission to the Play internal draft track additionally
  requires `PLAY_SUBMIT_ENABLED=true` and its configured service-account key.
- `preview` and `development` create internal-distribution builds. The preview
  profile produces an Android APK and a device iOS build; development includes
  the development client. Neither profile submits to stores.

Native jobs require the repository's `EXPO_TOKEN` secret and `EAS_ENABLED=true`
variable, plus the signing and store credentials configured in EAS. Project and
profile configuration live in `app.json` and `eas.json`; current store setup and
submission notes live in [store/SUBMISSION.md](../store/SUBMISSION.md).

The app uses the generated Canvas C mark, not Expo template branding. Regenerate
icons through `bun run appicon:gen` from the repository root.
