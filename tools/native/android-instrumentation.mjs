import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileInventory, sha256 } from "./candidate.mjs";

const sourcePath = "packages/canvas-blur/android/src/androidTest";
const initPath = "tools/native/canvas-blur-test.init.gradle";

export function androidInstrumentationPaths(output, app = path.join(output, "app")) {
  const inputs = path.join(output, "android-instrumentation-inputs");
  return {
    inputs, tests: path.join(inputs, sourcePath), init: path.join(inputs, initPath),
    module: path.join(app, "node_modules/@ionizeio/canvas-blur/android"),
    build: path.join(output, "android-capture-build"),
    evidence: path.join(output, "android-instrumentation-evidence"),
  };
}

/** Git archive binds verification sources to the restored, sealed candidate. */
export function preserveAndroidInstrumentation(repo, output, revision) {
  if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error("Instrumentation requires an exact candidate revision");
  const inputs = androidInstrumentationPaths(output).inputs;
  fs.mkdirSync(inputs);
  const archive = path.join(output, "android-instrumentation-inputs.tar");
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith("GIT_")));
  execFileSync("git", ["archive", "--format=tar", "--output", archive, revision, sourcePath, initPath], { cwd: repo, env });
  execFileSync("tar", ["-xf", archive, "-C", inputs], { env });
  const files = fileInventory(inputs);
  if (!Object.keys(files).some((file) => file.startsWith(sourcePath + "/") && /\.(?:kt|java)$/.test(file)) || !files[initPath]) {
    throw new Error("Candidate has no Android instrumentation sources or init script");
  }
  return { revision, archiveSha256: sha256(archive), files };
}

export function assertAndroidInstrumentationInputs(output, identity, inputs) {
  if (inputs?.revision !== identity.candidateRevision
    || sha256(path.join(output, "android-instrumentation-inputs.tar")) !== inputs.archiveSha256
    || JSON.stringify(fileInventory(androidInstrumentationPaths(output).inputs)) !== JSON.stringify(inputs.files)) {
    throw new Error("Android instrumentation inputs differ from the sealed candidate");
  }
}

/** Output redirection also applies to release builds: node_modules stays sealed. */
export function androidGradleArguments(output, app, instrument = false) {
  const files = androidInstrumentationPaths(output, app);
  const args = [instrument ? "canvasBlurConnectedDebugAndroidTest" : ":app:assembleRelease", "--no-daemon", "--console=plain",
    "--init-script", files.init, `-Dcanvas.blur.consumer=${path.join(app, "android")}`,
    `-Dcanvas.blur.module=${files.module}`, `-Dcanvas.blur.build=${files.build}`];
  if (instrument) args.push(`-Dcanvas.blur.tests=${files.tests}`, `-Dcanvas.blur.metadata=${path.join(files.evidence, "configuration.json")}`);
  return args;
}

/** Gradle's per-class JUnit XML must contain actual successful, unskipped cases. */
export function successfulAndroidInstrumentationReports(directory) {
  const files = fileInventory(directory);
  const reports = [];
  const cases = new Set();
  for (const file of Object.keys(files).filter((file) => file.endsWith(".xml"))) {
    const xml = fs.readFileSync(path.join(directory, file), "utf8");
    const suites = [...xml.matchAll(/<testsuite\s([^>]+)>/g)];
    const testcases = [...xml.matchAll(/<testcase\s([^>]+)>/g)];
    const attribute = (text, name) => new RegExp(`\\b${name}="([^"]*)"`).exec(text)?.[1];
    const count = suites.length === 1 ? Number(attribute(suites[0][1], "tests")) : 0;
    if (!Number.isInteger(count) || count < 1 || testcases.length !== count
      || ["failures", "errors", "skipped"].some((name) => ![undefined, "0"].includes(attribute(suites[0]?.[1] ?? "", name)))
      || /<(?:failure|error|skipped)\b|<!DOCTYPE|<!ENTITY/.test(xml)) {
      throw new Error(`Expected nonempty passing Android instrumentation JUnit: ${file}`);
    }
    for (const testcase of testcases) {
      const name = attribute(testcase[1], "name");
      const classname = attribute(testcase[1], "classname");
      const key = `${classname}#${name}`;
      if (!name || !classname || cases.has(key)) throw new Error(`Missing or duplicated Android instrumentation case: ${file}`);
      cases.add(key);
    }
    reports.push({ file, sha256: files[file], tests: count });
  }
  if (!reports.length) throw new Error("No Android instrumentation JUnit reports were produced");
  return { reports, tests: cases.size, cases: [...cases].sort() };
}

/** Copy complete reports even on a failed Gradle invocation. */
export function preserveAndroidInstrumentationReports(output) {
  const { build, evidence } = androidInstrumentationPaths(output);
  const reports = {};
  for (const [name, relative] of [["junit", "outputs/androidTest-results/connected"], ["html", "reports/androidTests/connected"]]) {
    const source = path.join(build, relative);
    if (!fs.existsSync(source)) continue;
    const target = path.join(evidence, name);
    fs.cpSync(source, target, { recursive: true, errorOnExist: true, force: false });
    reports[name] = fileInventory(target);
  }
  return reports;
}
