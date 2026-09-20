// The ordinary starter stays registry-pinned. All candidate installs, generated
// native projects and build outputs belong to a fresh isolated output directory.
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { verifyArtifacts } from "./release.mjs";
import { appInventory, assertInstalledPackage, fileInventory, packageArtifacts, packageIdentity, sha256 } from "../tools/native/candidate.mjs";
import { installSmokeFixtures } from "../tools/native/fixtures.mjs";
import { createEvidenceDirectory, recordNativeAttempt, successfulMaestroReport } from "../tools/native/evidence.mjs";
import { createCarouselContinuation, createCarouselMeasurementCommands, readCarouselEvidence } from "../tools/native/gesture.mjs";
import { verifyNativeFlow } from "./verify-native-flow.mjs";
import { observeIosBundleEvidence } from "../tools/native/ios-bundle-evidence.mjs";
import { parseAndroidNightMode } from "../tools/native/appearance.mjs";
import { androidGradleArguments, androidInstrumentationPaths, assertAndroidInstrumentationInputs, preserveAndroidInstrumentation, preserveAndroidInstrumentationReports, successfulAndroidInstrumentationReports } from "../tools/native/android-instrumentation.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
const env = (identity) => ({
  ...Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith("GIT_"))),
  HUSKY: "0", CI: "1", EXPO_PUBLIC_CANVAS_SMOKE: "1", CANVAS_SMOKE_IDENTITY: JSON.stringify(identity),
  MAESTRO_CLI_NO_ANALYTICS: "1", MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED: "true",
});
function run(cwd, command, args, identity, capture = false) {
  return execFileSync(command, args, { cwd, env: env(identity), encoding: "utf8", stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit" });
}

// The ordinary starter pins Canvas under the scope the registry serves it from
// today, and its sources import that name. The candidate replaces exactly that
// dependency, so every import in the copied app resolves to the sealed package
// even while the registry name lags a scope migration. The identity still names
// the package by its own name.
function declaredCanvasDependency(metadata) {
  const names = Object.keys(metadata.dependencies ?? {}).filter((name) => /^@[a-z0-9-]+\/canvas$/.test(name));
  if (names.length !== 1) throw new Error("The starter must declare exactly one Canvas package");
  return names[0];
}

export function prepareNativeSmoke(candidate, artifacts, output) {
  const manifest = verifyArtifacts(repo, candidate, artifacts);
  const identity = packageIdentity(manifest);
  if (fs.existsSync(output)) throw new Error("Native smoke output must be a new directory");
  fs.mkdirSync(output, { recursive: true });
  const app = path.join(output, "app");
  fs.mkdirSync(app);
  // Copy only the candidate's committed tree. An ignored .env file or untracked
  // fixture in a developer checkout must not alter the app attributed to HEAD.
  const starterArchive = path.join(output, "starter.tar");
  run(repo, "git", ["archive", "--format=tar", "--output", starterArchive, "HEAD", "examples/starter"], identity);
  run(output, "tar", ["-xf", starterArchive, "-C", app, "--strip-components=2"], identity);
  run(app, "bun", ["install", "--frozen-lockfile"], identity);
  const metadataFile = path.join(app, "package.json");
  const metadata = read(metadataFile);
  const inputs = packageArtifacts(manifest).map((input) => ({ ...input,
    installedAs: input.name === manifest.name ? declaredCanvasDependency(metadata) : input.name }));
  for (const input of inputs) {
    const tarball = path.join(output, input.filename);
    fs.copyFileSync(path.join(artifacts, input.filename), tarball);
    if (sha256(tarball) !== input.sha256) throw new Error("Copied candidate checksum changed");
    const unpacked = path.join(output, "unpacked", input.name);
    fs.mkdirSync(unpacked, { recursive: true });
    run(output, "tar", ["-xzf", tarball, "-C", unpacked], identity);
    metadata.dependencies[input.installedAs] = `file:${tarball}`;
  }
  write(metadataFile, metadata);
  run(app, "bun", ["install", "--ignore-scripts"], identity);
  for (const input of inputs) {
    assertInstalledPackage(path.join(output, "unpacked", input.name, "package"), path.join(app, "node_modules", input.installedAs));
    const installed = read(path.join(app, "node_modules", input.installedAs, "package.json"));
    if (installed.name !== input.name || installed.version !== input.version) throw new Error("Installed package differs from the candidate");
  }
  // Resolve from this isolated app, never from the repository's source link.
  if (inputs.some((input) => input.name === "@ionizeio/canvas-blur")) {
    const autolinking = JSON.parse(run(app, "bunx", ["--no-install", "expo-modules-autolinking", "resolve", "--platform", "android", "--json"], identity, true));
    const linked = autolinking.modules.find((module) => module.packageName === "@ionizeio/canvas-blur");
    const expected = path.join(app, "node_modules/@ionizeio/canvas-blur/android");
    if (!linked?.projects.some((project) => fs.realpathSync(project.sourceDir) === fs.realpathSync(expected)
      && project.modules.some((module) => module.classifier === "io.ionize.canvas.blur.CanvasBlurModule"))) {
      throw new Error("Sealed Android capture package did not autolink from the independent consumer");
    }
    write(path.join(output, "android-autolinking.json"), { identity, autolinking });
  }
  // These templates can exercise new candidate APIs that the registry starter's
  // published pin does not have yet. Typecheck them only against the sealed install.
  installSmokeFixtures(app);
  run(app, "bun", ["run", "typecheck"], identity);
  const configuration = JSON.parse(run(app, "node", ["node_modules/expo/bin/cli", "config", "--type", "public", "--json"], identity, true));
  if (configuration.ios?.bundleIdentifier !== "com.nannier.canvas.starter.smoke"
    || configuration.android?.package !== "com.nannier.canvas.starter.smoke"
    || configuration.scheme !== "canvas-smoke" || JSON.stringify(configuration.extra?.canvasBuild) !== JSON.stringify(identity)) {
    throw new Error("Smoke app ID, scheme or runtime identity is incorrect");
  }
  const androidInstrumentation = inputs.some((input) => input.name === "@ionizeio/canvas-blur")
    ? preserveAndroidInstrumentation(repo, output, identity.candidateRevision) : undefined;
  write(path.join(output, "context.json"), { schema: 2, identity, appSources: appInventory(app), packages: inputs, tarball: manifest.packageFile,
    ...(androidInstrumentation ? { androidInstrumentation } : {}) });
  console.log(`Prepared independent native candidate ${identity.packageVersion} (${identity.packageSha256}) in ${output}`);
}

function context(output) {
  const context = read(path.join(output, "context.json"));
  const app = path.join(output, "app");
  if (context.schema !== 2 || !Array.isArray(context.packages)) throw new Error("Native smoke candidate changed");
  if (JSON.stringify(appInventory(app)) !== JSON.stringify(context.appSources)) throw new Error("Starter source changed after candidate preparation");
  for (const input of context.packages) {
    if (sha256(path.join(output, input.filename)) !== input.sha256) throw new Error("Native smoke candidate changed");
    assertInstalledPackage(path.join(output, "unpacked", input.name, "package"), path.join(app, "node_modules", input.installedAs ?? input.name));
  }
  if (context.packages.some((input) => input.name === "@ionizeio/canvas-blur")) {
    assertAndroidInstrumentationInputs(output, context.identity, context.androidInstrumentation);
  }
  return { ...context, app };
}

export function buildNativeSmoke(output, platform, device) {
  const { app, identity, androidInstrumentation } = context(output);
  run(app, "node", ["node_modules/expo/bin/cli", "prebuild", "--platform", platform, "--no-install"], identity);
  let binary;
  let bundleEvidence;
  if (platform === "ios") {
    run(app, "pod", ["install", "--project-directory=ios"], identity);
    const workspaces = fs.readdirSync(path.join(app, "ios")).filter((name) => name.endsWith(".xcworkspace"));
    if (workspaces.length !== 1) throw new Error("Expected one generated iOS workspace");
    const workspace = path.join(app, "ios", workspaces[0]);
    const scheme = workspaces[0].slice(0, -".xcworkspace".length);
    run(app, "xcodebuild", ["-workspace", workspace, "-scheme", scheme, "-configuration", "Release", "-sdk", "iphonesimulator",
      "-destination", `id=${device}`, "-derivedDataPath", path.join(output, "ios-build"), "CODE_SIGNING_ALLOWED=NO", "ONLY_ACTIVE_ARCH=YES", "build"], identity);
    binary = path.join(output, "ios-build/Build/Products/Release-iphonesimulator", `${scheme}.app`);
    const buildEnvironment = env(identity);
    bundleEvidence = observeIosBundleEvidence({ app, binary, output: path.join(output, "ios-bundle-evidence"), identity,
      smokeFlag: buildEnvironment.EXPO_PUBLIC_CANVAS_SMOKE, identityProvided: Boolean(buildEnvironment.CANVAS_SMOKE_IDENTITY) });
  } else {
    run(path.join(app, "android"), "./gradlew", androidInstrumentation
      ? androidGradleArguments(output, app) : [":app:assembleRelease", "--no-daemon"], identity);
    binary = path.join(app, "android/app/build/outputs/apk/release/app-release.apk");
  }
  if (!fs.existsSync(binary)) throw new Error(`Native release output missing: ${binary}`);
  const digest = platform === "ios" ? fileInventory(binary) : sha256(binary);
  context(output);
  write(path.join(output, `${platform}-build.json`), { identity, binary, digest, ...(bundleEvidence ? { bundleEvidence } : {}) });
  console.log(`Built embedded ${platform} candidate: ${binary}`);
}

export function instrumentNativeSmoke(output, device) {
  const { app, identity, androidInstrumentation, packages } = context(output);
  if (!androidInstrumentation) throw new Error("Android instrumentation requires the sealed capture package");
  const files = androidInstrumentationPaths(output, app);
  // A fresh evidence directory and clean connected reports prevent a previous
  // successful result from qualifying a command that did not execute tests.
  fs.mkdirSync(files.evidence);
  for (const relative of ["outputs/androidTest-results/connected", "reports/androidTests/connected"]) {
    fs.rmSync(path.join(files.build, relative), { recursive: true, force: true });
  }
  const build = read(path.join(output, "android-build.json"));
  const result = { schema: 1, identity, device, startedAt: new Date().toISOString(), status: "failed",
    package: packages.find((pkg) => pkg.name === "@ionizeio/canvas-blur"),
    productionVariant: "debug", releaseBinaryDigest: build.digest, testInputs: androidInstrumentation,
    contextSha256: sha256(path.join(output, "context.json")), buildManifestSha256: sha256(path.join(output, "android-build.json")),
    command: ["./gradlew", ...androidGradleArguments(output, app, true)] };
  result.testInfrastructure = {
    revision: run(repo, "git", ["rev-parse", "HEAD"], identity, true).trim(),
    dirty: run(repo, "git", ["status", "--porcelain", "--untracked-files=all"], identity, true).trim() !== "",
    files: Object.fromEntries(["scripts/native-smoke.mjs", "tools/native/android-instrumentation.mjs", "tools/native/candidate.mjs"]
      .map((file) => [file, sha256(path.join(repo, file))])),
  };
  const log = path.join(files.evidence, "gradle.log");
  let failure;
  try {
    if (JSON.stringify(build.identity) !== JSON.stringify(identity) || sha256(build.binary) !== build.digest) {
      throw new Error("Android release binary changed or belongs to another candidate");
    }
    result.deviceApi = run(app, "adb", ["-s", device, "shell", "getprop", "ro.build.version.sdk"], identity, true).trim();
    result.deviceFingerprint = run(app, "adb", ["-s", device, "shell", "getprop", "ro.build.fingerprint"], identity, true).trim();
    const descriptor = fs.openSync(log, "wx");
    try {
      execFileSync(result.command[0], result.command.slice(1), { cwd: path.join(app, "android"),
        env: { ...env(identity), ANDROID_SERIAL: device }, stdio: ["ignore", descriptor, descriptor] });
    } finally { fs.closeSync(descriptor); }
    const configuration = read(path.join(files.evidence, "configuration.json"));
    const testRoot = fs.realpathSync(files.tests);
    if (configuration.projectDirectory !== fs.realpathSync(files.module)
      || configuration.buildDirectory !== fs.realpathSync(files.build)
      || configuration.runner !== "androidx.test.runner.AndroidJUnitRunner"
      || !Array.isArray(configuration.testJava)
      || JSON.stringify([...configuration.testJava].sort()) !== JSON.stringify([path.join(testRoot, "java"), path.join(testRoot, "kotlin")].sort())
      || configuration.testManifest !== (fs.existsSync(path.join(files.tests, "AndroidManifest.xml"))
        ? fs.realpathSync(path.join(files.tests, "AndroidManifest.xml")) : null)) {
      throw new Error("Instrumentation did not target the installed sealed capture module");
    }
    result.configuration = configuration;
    result.junit = successfulAndroidInstrumentationReports(path.join(files.build, "outputs/androidTest-results/connected"));
    result.status = "passed";
  } catch (error) {
    failure = error;
    result.error = String(error);
  } finally {
    try {
      result.reports = preserveAndroidInstrumentationReports(output);
      context(output);
      if (sha256(build.binary) !== build.digest) throw new Error("Instrumentation changed the Android release binary");
      result.sealedProductionUnchanged = true;
    } catch (error) {
      result.status = "failed";
      result.integrityError = String(error);
      failure = failure ? new AggregateError([failure, error], "Instrumentation and integrity verification failed") : error;
    }
    if (fs.existsSync(log)) {
      result.logSha256 = sha256(log);
      process.stdout.write(fs.readFileSync(log).subarray(-65536).toString("utf8"));
    }
    result.finishedAt = new Date().toISOString();
    write(path.join(files.evidence, "result.json"), result);
  }
  if (failure) throw failure;
  console.log(`Verified ${result.junit.tests} Android instrumentation cases against the sealed capture package`);
}

export function testNativeSmoke(output, platform, device, maestro, requestedEvidence) {
  const { app, identity } = context(output);
  const build = read(path.join(output, `${platform}-build.json`));
  const digest = platform === "ios" ? fileInventory(build.binary) : sha256(build.binary);
  if (JSON.stringify(build.identity) !== JSON.stringify(identity) || JSON.stringify(digest) !== JSON.stringify(build.digest)) throw new Error("Native binary changed or belongs to another candidate");
  const evidence = createEvidenceDirectory(output, platform, requestedEvidence);
  const startedAt = new Date().toISOString();
  const flow = path.join(evidence, "candidate.yaml");
  const postFlow = path.join(evidence, "after-carousel.yaml");
  const result = { schema: 2, platform, device, identity, binaryDigest: digest, startedAt, status: "failed", voiceOver: "not-run", talkBack: "not-run" };
  const verifyFlowInputs = () => {
    for (const [file, expected] of Object.entries(result.flowInputs)) {
      if (sha256(path.join(evidence, file)) !== expected) throw new Error("Preserved native flow changed during execution");
    }
  };
  const appearanceCommand = platform === "ios"
    ? ["xcrun", ["simctl", "ui", device, "appearance"]]
    : ["adb", ["-s", device, "shell", "cmd", "uimode", "night"]];
  const setAppearance = (value) => run(app, appearanceCommand[0], [...appearanceCommand[1], value], identity);
  const observeFailure = platform === "android" && process.env.CANVAS_ANDROID_DIAGNOSTICS ? (stage) => {
    const diagnostics = path.join(output, "android-host-diagnostics");
    if (path.resolve(process.env.CANVAS_ANDROID_DIAGNOSTICS) !== diagnostics) throw new Error("Diagnostic output differs from this native attempt");
    // Host-only capture happens before appearance restoration can issue another
    // ADB command. Its bounded failure is recorded without replacing the journey.
    return JSON.parse(execFileSync(process.execPath, [path.join(repo, "scripts/android-host-diagnostics.mjs"), "capture",
      "--output", diagnostics, "--stage", stage], { encoding: "utf8", timeout: 5000, maxBuffer: 16384, stdio: ["ignore", "pipe", "pipe"] }));
  } : undefined;
  recordNativeAttempt(evidence, result, () => {
    // The authored segments are self-contained. Snapshot both before building
    // the attempt-specific measurement export and literal continuation.
    result.flowInputs = {};
    for (const file of ["candidate.yaml", "after-carousel.yaml"]) {
      const preserved = path.join(evidence, file);
      fs.copyFileSync(path.join(repo, "tools/native/flows", file), preserved, fs.constants.COPYFILE_EXCL);
      result.flowInputs[file] = sha256(preserved);
    }
    const inputs = ["scripts/native-smoke.mjs", "scripts/verify-native-flow.mjs", "scripts/release.mjs",
      "tools/native/candidate.mjs", "tools/native/evidence.mjs", "tools/native/gesture.mjs", "tools/native/ParseFlow.java", "tools/native/maestro.json",
      "scripts/android-host-diagnostics.mjs", "tools/native/android-host-diagnostics.mjs", "tools/native/ios-bundle-evidence.mjs",
      "tools/native/appearance.mjs"];
    result.testInfrastructure = {
      revision: run(repo, "git", ["rev-parse", "HEAD"], identity, true).trim(),
      dirty: run(repo, "git", ["status", "--porcelain", "--untracked-files=all"], identity, true).trim() !== "",
      files: Object.fromEntries(inputs.map((file) => [file, sha256(path.join(repo, file))])),
    };
    result.artifactOutput = fs.realpathSync(output);
    result.binaryPath = fs.realpathSync(build.binary);
    result.evidencePath = evidence;
    result.contextSha256 = sha256(path.join(output, "context.json"));
    result.buildManifestSha256 = sha256(path.join(output, `${platform}-build.json`));
    result.staticFlowParsers = [flow, postFlow].map((file) => verifyNativeFlow({ maestro, flow: file }));
    result.maestroVersion = result.staticFlowParsers[0].maestroVersion;
    result.javaVersion = result.staticFlowParsers[0].javaVersion;
    const initial = run(app, appearanceCommand[0], appearanceCommand[1], identity, true).trim();
    const previous = platform === "ios" ? initial : parseAndroidNightMode(initial);
    if (!previous || (platform === "ios" && !["light", "dark"].includes(previous))) throw new Error("Cannot safely restore the device's appearance");
    return previous;
  }, setAppearance, () => {
    if (platform === "ios") {
      run(app, "xcrun", ["simctl", "install", device, build.binary], identity);
      result.deviceMetadata = JSON.parse(run(app, "xcrun", ["simctl", "list", "devices", "--json"], identity, true));
    } else {
      run(app, "adb", ["-s", device, "install", "-r", build.binary], identity);
      result.deviceMetadata = run(app, "adb", ["-s", device, "shell", "getprop", "ro.build.fingerprint"], identity, true).trim();
    }
    result.schemes = {};
    result.journeys = {};
    for (const scheme of ["light", "dark"]) {
      verifyFlowInputs();
      result.schemes[scheme] = "failed";
      setAppearance(platform === "ios" ? scheme : scheme === "dark" ? "yes" : "no");
      const directory = path.join(evidence, scheme);
      fs.mkdirSync(directory);
      const expected = { nonce: randomUUID(), candidateRevision: identity.candidateRevision,
        packageSha256: identity.packageSha256, packageVersion: identity.packageVersion, platform, scheme };
      const journey = result.journeys[scheme] = { expected, phases: [] };
      const executePhase = (name, file) => {
        verifyFlowInputs();
        const phaseDirectory = path.join(directory, name);
        fs.mkdirSync(phaseDirectory);
        const phase = { name, status: "failed", flow: file, flowSha256: sha256(file) };
        journey.phases.push(phase);
        phase.reportPath = path.join(phaseDirectory, "report.xml");
        phase.parser = verifyNativeFlow({ maestro, flow: file });
        phase.artifacts = path.join(phaseDirectory, "maestro");
        run(app, maestro, ["--device", device, "test", "--format", "junit", "--output", phase.reportPath,
          "--test-output-dir", phase.artifacts, "-e", `CANDIDATE=${identity.candidateRevision}`,
          "-e", `PACKAGE_SHA256=${identity.packageSha256}`, "-e", `PACKAGE_VERSION=${identity.packageVersion.replaceAll(".", "\\.")}`,
          "-e", `SCHEME=${scheme}`, file], identity);
        phase.report = successfulMaestroReport(phase.reportPath);
        if (sha256(file) !== phase.flowSha256) throw new Error("Native phase changed during execution");
        verifyFlowInputs();
        phase.status = "passed";
        return phase;
      };
      const measurementFlow = path.join(directory, "measurement.yaml");
      const exportCommands = createCarouselMeasurementCommands(expected).map((command) => "- " + JSON.stringify(command)).join("\n");
      fs.writeFileSync(measurementFlow, fs.readFileSync(flow, "utf8") + exportCommands + "\n", { flag: "wx" });
      const measuredPhase = executePhase("measurement", measurementFlow);
      const measured = readCarouselEvidence({ artifactRoot: measuredPhase.artifacts, expected });
      // Keep the original log and manifest where Maestro wrote them. Record
      // their identities and exact executed line, without duplicating log bytes.
      journey.measurement = {
        record: measured.record, gesture: measured.gesture, source: measured.source,
        manifest: { path: measured.manifest.path, sha256: measured.manifest.sha256 },
        log: { path: measured.log.path, sha256: measured.log.sha256 },
      };
      write(path.join(directory, "measurement.json"), journey.measurement);
      const continuation = createCarouselContinuation({ expected, measurement: measured.measurement, postFlow });
      const continuationFlow = path.join(directory, "continuation.yaml");
      fs.writeFileSync(continuationFlow, continuation.yaml, { flag: "wx" });
      journey.postFlow = continuation.postFlow;
      // No launch, navigation or appearance change between these invocations.
      // The continuation proves retained generation 1, then remeasures once.
      executePhase("continuation", continuationFlow);
      result.schemes[scheme] = "passed";
    }
    verifyFlowInputs();
  }, observeFailure);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, ...args] = process.argv.slice(2);
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index]?.replace(/^--/, "");
    if (!["candidate", "artifacts", "output", "platform", "device", "maestro", "evidence"].includes(key)
      || key in options || !args[index + 1] || args[index + 1].startsWith("--")) throw new Error("Expected unique named native smoke arguments");
    options[key] = args[index + 1];
  }
  if (!options.output) throw new Error("--output is required");
  if (options.evidence && command !== "test") throw new Error("--evidence is only valid for test");
  const output = path.resolve(options.output);
  if (command === "prepare") {
    if (!options.candidate || !options.artifacts) throw new Error("prepare requires --candidate and --artifacts");
    prepareNativeSmoke(path.resolve(options.candidate), path.resolve(options.artifacts), output);
  } else {
    if (!["ios", "android"].includes(options.platform) || !options.device) throw new Error("build/test/instrument requires --platform and --device");
    if (command === "build") buildNativeSmoke(output, options.platform, options.device);
    else if (command === "test") testNativeSmoke(output, options.platform, options.device, options.maestro ?? "maestro", options.evidence);
    else if (command === "instrument" && options.platform === "android") instrumentNativeSmoke(output, options.device);
    else throw new Error("Expected prepare, build, test or Android instrument");
  }
}
