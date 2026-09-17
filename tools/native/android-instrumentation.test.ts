import { afterEach, expect, test } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { tmpdir } from "node:os";
import { androidGradleArguments, androidInstrumentationPaths, assertAndroidInstrumentationInputs, preserveAndroidInstrumentation, successfulAndroidInstrumentationReports } from "./android-instrumentation.mjs";
import { appInventory, assertInstalledPackage, sha256 } from "./candidate.mjs";

const temporary: string[] = [];
const root = path.resolve(import.meta.dir, "../..");
const cleanEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")));
afterEach(() => { for (const dir of temporary.splice(0)) fs.rmSync(dir, { recursive: true, force: true }); });
function temporaryDirectory() {
  const directory = fs.realpathSync(fs.mkdtempSync(path.join(tmpdir(), "canvas-instrumentation-")));
  temporary.push(directory);
  return directory;
}
function write(file: string, value: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value);
}
function candidate(withManifest = true) {
  const repo = temporaryDirectory();
  const git = (...args: string[]) => execFileSync("git", args, { cwd: repo, env: cleanEnv, encoding: "utf8" }).trim();
  git("init", "-q");
  git("config", "user.name", "Canvas tests");
  git("config", "user.email", "canvas-tests@example.invalid");
  const source = "packages/canvas-blur/android/src/androidTest/java/io/ionize/canvas/blur/CaptureTest.kt";
  write(path.join(repo, source), "package io.ionize.canvas.blur\nclass CaptureTest\n");
  if (withManifest) write(path.join(repo, "packages/canvas-blur/android/src/androidTest/AndroidManifest.xml"), '<manifest package="io.ionize.canvas.blur.test"/>');
  write(path.join(repo, "tools/native/canvas-blur-test.init.gradle"), fs.readFileSync(path.join(root, "tools/native/canvas-blur-test.init.gradle"), "utf8"));
  git("add", ".");
  git("commit", "-qm", "Candidate inputs");
  return { repo, revision: git("rev-parse", "HEAD"), source };
}

test("instrumentation snapshots the candidate revision, including manifest, and detects drift", () => {
  const { repo, revision, source } = candidate();
  const output = temporaryDirectory();
  write(path.join(repo, source), "uncommitted later test");
  const inputs = preserveAndroidInstrumentation(repo, output, revision);
  const paths = androidInstrumentationPaths(output);
  expect(fs.readFileSync(path.join(paths.inputs, source), "utf8")).toContain("class CaptureTest");
  expect(Object.keys(inputs.files)).toContain("packages/canvas-blur/android/src/androidTest/AndroidManifest.xml");
  expect(() => assertAndroidInstrumentationInputs(output, { candidateRevision: revision }, inputs)).not.toThrow();
  expect(() => assertAndroidInstrumentationInputs(output, { candidateRevision: "a".repeat(40) }, inputs)).toThrow("differ");
  write(path.join(paths.inputs, source), "altered preserved test");
  expect(() => assertAndroidInstrumentationInputs(output, { candidateRevision: revision }, inputs)).toThrow("differ");
  expect(() => preserveAndroidInstrumentation(repo, temporaryDirectory(), "main")).toThrow("exact candidate revision");
});

test("release and instrumentation share the sealed module and external build directory", () => {
  const output = temporaryDirectory();
  const app = path.join(output, "app with spaces");
  const paths = androidInstrumentationPaths(output, app);
  for (const instrument of [false, true]) {
    const args = androidGradleArguments(output, app, instrument);
    expect(args).toContain(`-Dcanvas.blur.consumer=${path.join(app, "android")}`);
    expect(args).toContain(`-Dcanvas.blur.module=${paths.module}`);
    expect(args).toContain(`-Dcanvas.blur.build=${paths.build}`);
    expect(args).toContain(paths.init);
    expect(paths.build.startsWith(app + path.sep)).toBe(false);
    expect(args.includes(`-Dcanvas.blur.tests=${paths.tests}`)).toBe(instrument);
    expect(args[0]).toBe(instrument ? "canvasBlurConnectedDebugAndroidTest" : ":app:assembleRelease");
  }
});

const passingXml = '<testsuite name="CaptureTest" tests="2" failures="0" errors="0" skipped="0"><testcase name="geometry" classname="CaptureTest"/><testcase name="lifecycle" classname="CaptureTest"/></testsuite>';
test("Android JUnit requires real passing cases and rejects missing, skipped, failed, or duplicated evidence", () => {
  const directory = temporaryDirectory();
  expect(() => successfulAndroidInstrumentationReports(directory)).toThrow("No Android instrumentation");
  const file = path.join(directory, "debug/device/TEST-CaptureTest.xml");
  write(file, passingXml);
  expect(successfulAndroidInstrumentationReports(directory)).toMatchObject({ tests: 2, cases: ["CaptureTest#geometry", "CaptureTest#lifecycle"] });
  for (const xml of [
    passingXml.replace('tests="2"', 'tests="0"'), passingXml.replace('tests="2"', 'tests="3"'),
    passingXml.replace('failures="0"', 'failures="1"'), passingXml.replace('errors="0"', 'errors="1"'),
    passingXml.replace('skipped="0"', 'skipped="1"'), passingXml.replace('/></testsuite>', '><skipped/></testcase></testsuite>'),
    passingXml.replace('name="lifecycle"', 'name="geometry"'), `<!DOCTYPE testsuite>${passingXml}`,
  ]) {
    write(file, xml);
    expect(() => successfulAndroidInstrumentationReports(directory)).toThrow();
  }
});

function runnerFixture(mode: string) {
  const { repo, revision } = candidate(mode !== "pass-no-manifest");
  const output = temporaryDirectory();
  const app = path.join(output, "app");
  const files = androidInstrumentationPaths(output, app);
  const inputs = preserveAndroidInstrumentation(repo, output, revision);
  const name = "@ionizeio/canvas-blur";
  const unpacked = path.join(output, "unpacked", name, "package");
  write(path.join(unpacked, "package.json"), JSON.stringify({ name, version: "0.1.0" }));
  write(path.join(unpacked, "android/src/main/Production.kt"), "sealed production");
  fs.mkdirSync(path.dirname(path.dirname(files.module)), { recursive: true });
  fs.cpSync(unpacked, path.dirname(files.module), { recursive: true });
  const binary = path.join(app, "android/app/build/outputs/apk/release/app-release.apk");
  write(binary, "sealed release binary");
  write(path.join(app, "package.json"), "{}");
  write(path.join(output, "blur.tgz"), "sealed archive fixture");
  const identity = { candidateRevision: revision, sourceRevision: revision, packageName: "@ionizeio/canvas", packageVersion: "2.0.0" };
  write(path.join(output, "context.json"), JSON.stringify({ schema: 2, identity, appSources: appInventory(app),
    packages: [{ name, version: "0.1.0", filename: "blur.tgz", sha256: sha256(path.join(output, "blur.tgz")) }], androidInstrumentation: inputs }));
  write(path.join(output, "android-build.json"), JSON.stringify({ identity, binary, digest: sha256(binary) }));
  const adb = path.join(output, "bin/adb");
  write(adb, `#!${process.execPath}\nconsole.log(process.argv.at(-1) === 'ro.build.version.sdk' ? '35' : 'test/fingerprint');\n`);
  fs.chmodSync(adb, 0o755);
  const gradle = path.join(app, "android/gradlew");
  write(gradle, `#!${process.execPath}
const fs = require('node:fs'), path = require('node:path');
const prop = name => process.argv.find(arg => arg.startsWith('-Dcanvas.blur.' + name + '=')).split('=').slice(1).join('=');
const build = prop('build'), moduleDirectory = prop('module'), metadata = prop('metadata');
if (process.env.ANDROID_SERIAL !== 'emulator-test') throw Error('device not scoped');
fs.mkdirSync(build, {recursive:true});
const testRoot = fs.realpathSync(prop('tests')), manifest = path.join(testRoot,'AndroidManifest.xml');
fs.writeFileSync(metadata, JSON.stringify({projectDirectory:${mode === "wrong-target" ? "process.cwd()" : "fs.realpathSync(moduleDirectory)"},buildDirectory:fs.realpathSync(build),runner:'androidx.test.runner.AndroidJUnitRunner',testJava:[path.join(testRoot,'java'),path.join(testRoot,'kotlin')],testManifest:fs.existsSync(manifest)?manifest:null}));
const dir = path.join(build,'outputs/androidTest-results/connected/debug'); fs.mkdirSync(dir,{recursive:true});
${mode === "empty" ? "" : `fs.writeFileSync(path.join(dir,'TEST-CaptureTest.xml'),${JSON.stringify(mode === "skip" ? passingXml.replace('skipped="0"', 'skipped="1"') : passingXml)});`}
${mode === "mutate" ? "fs.writeFileSync(path.join(moduleDirectory,'src/main/Production.kt'),'modified production');" : ""}
console.log('Gradle test-double output');
${mode === "fail" ? "process.exit(7);" : ""}
`);
  fs.chmodSync(gradle, 0o755);
  return { output, files, unpacked, env: { ...cleanEnv, PATH: path.join(output, "bin") + path.delimiter + process.env.PATH } };
}

for (const mode of ["pass", "pass-no-manifest", "pass-alias"]) test(`native runner preserves reports and proves sealed bytes (${mode}) without a device in tooling tests`, () => {
  const { output, files, unpacked, env } = runnerFixture(mode);
  const requested = mode === "pass-alias" ? path.join(temporaryDirectory(), "candidate") : output;
  if (mode === "pass-alias") fs.symlinkSync(output, requested);
  const result = spawnSync(process.execPath, [path.join(root, "scripts/native-smoke.mjs"), "instrument", "--output", requested, "--platform", "android", "--device", "emulator-test"], { env, encoding: "utf8" });
  expect(result.status).toBe(0);
  const evidence = JSON.parse(fs.readFileSync(path.join(files.evidence, "result.json"), "utf8"));
  expect(evidence).toMatchObject({ status: "passed", sealedProductionUnchanged: true, productionVariant: "debug", junit: { tests: 2 }, deviceApi: "35" });
  expect(fs.readFileSync(path.join(files.evidence, "junit/debug/TEST-CaptureTest.xml"), "utf8")).toBe(passingXml);
  expect(() => assertInstalledPackage(unpacked, path.dirname(files.module))).not.toThrow();
  expect(fs.existsSync(path.join(files.module, "build"))).toBe(false);
});

for (const mode of ["empty", "skip", "fail", "mutate", "wrong-target"]) test(`native runner cannot pass ${mode} instrumentation and retains the failure`, () => {
  const { output, files, env } = runnerFixture(mode);
  const result = spawnSync(process.execPath, [path.join(root, "scripts/native-smoke.mjs"), "instrument", "--output", output, "--platform", "android", "--device", "emulator-test"], { env, encoding: "utf8" });
  expect(result.status).not.toBe(0);
  const evidence = JSON.parse(fs.readFileSync(path.join(files.evidence, "result.json"), "utf8"));
  expect(evidence.status).toBe("failed");
  expect(evidence.logSha256).toMatch(/^[a-f0-9]{64}$/);
  expect(fs.readFileSync(path.join(files.evidence, "gradle.log"), "utf8")).toContain("Gradle test-double output");
  if (mode === "mutate") expect(evidence.integrityError).toContain("bytes differ");
  else expect(evidence.sealedProductionUnchanged).toBe(true);
});

test("CI gates the same Android emulator on instrumentation before Maestro and archives its inputs", () => {
  const workflow = Bun.YAML.parse(fs.readFileSync(path.join(root, ".github/workflows/native-smoke.yml"), "utf8")) as { jobs: { smoke: { steps: { name?: string; with?: { script?: string; path?: string } }[] } } };
  const steps = workflow.jobs.smoke.steps;
  const commands = steps.find(step => step.name === "Build and exercise the Android candidate")!.with!.script!.trim().split("\n");
  expect(commands).toHaveLength(3);
  for (const [index, command] of ["build", "instrument", "test"].entries()) expect(commands[index]).toContain(`native-smoke.mjs ${command} --output`);
  expect(commands.every(command => command.includes("--device emulator-5554"))).toBe(true);
  const artifacts = steps.find(step => step.name === "Preserve candidate identity, build observations and native interaction evidence")!.with!.path!;
  expect(artifacts).toContain("android-instrumentation-inputs/");
  expect(artifacts).toContain("*-evidence/");
});
