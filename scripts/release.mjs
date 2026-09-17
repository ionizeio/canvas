// CI release transaction. The candidate is never rebased or rebuilt at publication.
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_PATHS = { "@ionizeio/canvas": ".", "@ionizeio/canvas-blur": "packages/canvas-blur" };
const packageTag = (name, version) => name === "@ionizeio/canvas" ? `v${version}` : `canvas-blur@${version}`;
function packages(cwd) {
  return Object.entries(PACKAGE_PATHS).filter(([, directory]) => fs.existsSync(path.join(cwd, directory, "package.json")))
    .map(([name, directory]) => {
      const pkg = read(path.join(cwd, directory, "package.json"));
      if (pkg.name !== name) throw new Error(`Unexpected package at ${directory}`);
      return { name, directory, version: pkg.version };
    });
}
const SHA = /^[0-9a-f]{40}$/;
const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
let localGitVariables;
function commandEnvironment() {
  if (!localGitVariables) {
    // Git hooks export repository selectors that override cwd. Ask Git which
    // variables are local using a clean environment, even if inherited config
    // points at an invalid or unrelated repository.
    const clean = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")));
    localGitVariables = new Set(execFileSync("git", ["rev-parse", "--local-env-vars"], {
      encoding: "utf8",
      env: { ...clean, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    }).trim().split("\n"));
    // Namespace selects different refs but is not included in Git's local list.
    localGitVariables.add("GIT_NAMESPACE");
  }
  // Keep SSH, askpass and other transport settings. Clear indexed config values
  // alongside GIT_CONFIG_COUNT, which Git includes in its local-variable list.
  return {
    ...Object.fromEntries(Object.entries(process.env).filter(([key]) =>
      !localGitVariables.has(key) && !/^GIT_CONFIG_(KEY|VALUE)_\d+$/.test(key))),
    HUSKY: "0",
  };
}
const run = (cwd, cmd, args) => execFileSync(cmd, args, { cwd, encoding: "utf8", env: commandEnvironment() }).trim();
const git = (cwd, ...args) => run(cwd, "git", args);
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const write = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
const hash = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const output = (key, value) => {
  console.log(`${key}=${value}`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
};

// The one way a major ships: a human dispatches the deploy workflow with the
// `major` box ticked AND the exact next major version typed into `major_version`
// (RELEASE_MAJOR here). Nothing automatic, and no generic checkbox, ever bumps a
// major; a typed version that is not exactly `<current major + 1>.0.0` authorizes
// nothing.
export function authorizedMajor() {
  const v = process.env.RELEASE_MAJOR ?? "";
  return VERSION.test(v) ? v : "";
}

/** The only major `before` may move to: the next major at .0.0. */
export function nextMajor(before) {
  return `${Number(before.split(".")[0]) + 1}.0.0`;
}

export function assertReleaseVersion(before, after, authorized = authorizedMajor()) {
  if (!VERSION.test(before) || !VERSION.test(after)) throw new Error("Releases require stable semantic versions");
  const a = before.split(".").map(Number);
  const b = after.split(".").map(Number);
  if (a[0] !== b[0]) {
    if (after === nextMajor(before) && authorized === after) return;
    throw new Error("Major releases require separate explicit authorization and are blocked in this workflow");
  }
  if (b[1] < a[1] || (b[1] === a[1] && b[2] <= a[2])) throw new Error("Release version must increase");
}

export function readCandidate(dir) {
  const c = read(path.join(dir, "candidate.json"));
  const entries = c.packages;
  if (!SHA.test(c.source) || !SHA.test(c.candidate) || !VERSION.test(c.version) ||
      c.name !== "@ionizeio/canvas" || typeof c.release !== "boolean" ||
      !["ready", "no-changesets", "not-requested", "blocked-major"].includes(c.status) ||
      c.tag !== `v${c.version}` || (c.release !== (c.status === "ready")) ||
      (!c.release && c.source !== c.candidate) || !Array.isArray(entries) || !entries.length ||
      new Set(entries.map((p) => p.name)).size !== entries.length ||
      entries.some((p) => !Object.hasOwn(PACKAGE_PATHS, p.name) || PACKAGE_PATHS[p.name] !== p.directory ||
        !VERSION.test(p.version) || typeof p.release !== "boolean" || p.tag !== packageTag(p.name, p.version)) ||
      entries[0].name !== c.name || entries[0].version !== c.version ||
      c.release !== entries.some((p) => p.release)) throw new Error("Invalid release candidate metadata");
  return c;
}

export function assertCandidate(cwd, c) {
  if (git(cwd, "rev-parse", "HEAD") !== c.candidate) throw new Error("Checkout does not match the candidate");
  if (git(cwd, "status", "--porcelain", "--untracked-files=no")) throw new Error("Candidate has modified tracked files");
  const actual = packages(cwd);
  if (JSON.stringify(actual) !== JSON.stringify(c.packages.map(({ name, directory, version }) => ({ name, directory, version })))) {
    throw new Error("Package metadata does not match the candidate");
  }
  if (c.release) {
    if (git(cwd, "rev-parse", "HEAD^") !== c.source) throw new Error("Version commit must directly follow its validated source");
    for (const pkg of c.packages) {
      const previous = JSON.parse(git(cwd, "show", `${c.source}:${path.posix.join(pkg.directory, "package.json")}`));
      if (pkg.release) assertReleaseVersion(previous.version, pkg.version, pkg.directory === "." ? authorizedMajor() : "");
      else if (previous.version !== pkg.version) throw new Error("Unreleased package version changed");
    }
  }
}

export function prepare(cwd, dir, source, publish) {
  if (!SHA.test(source) || git(cwd, "rev-parse", "HEAD") !== source) throw new Error("Prepare requires the triggering source SHA");
  if (git(cwd, "status", "--porcelain", "--untracked-files=no")) throw new Error("Prepare requires clean tracked files");
  fs.mkdirSync(dir, { recursive: true });
  const before = packages(cwd);
  let status = "not-requested";
  if (publish) {
    if (!git(cwd, "branch", "--list", "main")) git(cwd, "branch", "main", source);
    const planFile = path.join(dir, "changeset-plan.json");
    run(cwd, "bun", ["run", "changeset", "status", "--output", planFile]);
    const releases = read(planFile).releases.filter((r) => r.type !== "none");
    if (releases.some((r) => !before.some((p) => p.name === r.name))) throw new Error("Unregistered package in release plan");
    if (releases.some((r) => r.type === "major" &&
        (r.name !== before[0].name || authorizedMajor() !== nextMajor(before[0].version)))) {
      status = "blocked-major";
    } else if (releases.length) {
      run(cwd, "bun", ["run", "version-packages"]);
      for (const pkg of packages(cwd)) {
        const old = before.find((p) => p.name === pkg.name);
        if (old.version !== pkg.version) assertReleaseVersion(old.version, pkg.version, pkg.directory === "." ? authorizedMajor() : "");
      }
      // Freeze versioned workspace metadata and lockfile in the same candidate.
      if (fs.existsSync(path.join(cwd, "bun.lock"))) run(cwd, "bun", ["install", "--lockfile-only", "--ignore-scripts"]);
      const stage = before.flatMap((p) => [path.join(p.directory, "package.json"), path.join(p.directory, "CHANGELOG.md")])
        .filter((file) => fs.existsSync(path.join(cwd, file)));
      if (fs.existsSync(path.join(cwd, "bun.lock"))) stage.push("bun.lock");
      git(cwd, "add", "--", ...stage, ".changeset");
      git(cwd, "-c", "user.name=github-actions[bot]", "-c", "user.email=41898282+github-actions[bot]@users.noreply.github.com", "commit", "-m", "chore: version validated release [skip ci]");
      git(cwd, "bundle", "create", path.join(dir, "candidate.bundle"), `${source}..HEAD`);
      status = "ready";
    } else status = "no-changesets";
  }
  const entries = packages(cwd).map((p) => ({ ...p, tag: packageTag(p.name, p.version),
    release: status === "ready" && before.find((old) => old.name === p.name).version !== p.version }));
  const pkg = entries[0];
  const c = { source, candidate: git(cwd, "rev-parse", "HEAD"), name: pkg.name, version: pkg.version,
    tag: pkg.tag, release: status === "ready", status, packages: entries };
  write(path.join(dir, "candidate.json"), c);
  assertCandidate(cwd, readCandidate(dir));
  output("status", status);
  return c;
}

export function restore(cwd, dir, source) {
  const c = readCandidate(dir);
  if (c.source !== source || git(cwd, "rev-parse", "HEAD") !== source) throw new Error("Candidate belongs to a different triggering source");
  if (c.release) {
    git(cwd, "fetch", path.join(dir, "candidate.bundle"), "HEAD");
    git(cwd, "checkout", "--detach", c.candidate);
  }
  assertCandidate(cwd, c);
  return c;
}

export function seal(cwd, candidateDir, artifactDir) {
  const c = readCandidate(candidateDir);
  assertCandidate(cwd, c);
  fs.mkdirSync(artifactDir, { recursive: true });
  const packageFiles = {};
  for (const pkg of c.packages) {
    const directory = path.join(cwd, pkg.directory);
    run(cwd, "node", ["tools/licensegen/generate.mjs", directory]);
    const [pack] = JSON.parse(run(directory, "npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", artifactDir, "--cache", path.join(artifactDir, "..", "npm-cache")]));
    if (pack.name !== pkg.name || pack.version !== pkg.version || path.basename(pack.filename) !== pack.filename) throw new Error("Packed a different package");
    const required = ["LICENSE", "dist/index.js", "dist/index.d.ts", "package.json",
      ...(pkg.directory === "." ? ["dist/native/index.js"] : ["expo-module.config.json", "android/build.gradle", "android/src/main/AndroidManifest.xml"])];
    if (!required.every((name) => pack.files.some((file) => file.path === name))) throw new Error("Package is missing a required distribution file");
    const unpacked = fs.mkdtempSync(path.join(artifactDir, "unpacked-"));
    try {
      run(cwd, "tar", ["-xzf", path.join(artifactDir, pack.filename), "-C", unpacked]);
      const root = path.join(unpacked, "package");
      run(cwd, "bun", [pkg.directory === "." ? "scripts/verify-package.ts" : "scripts/verify-blur-package.mjs", root]);
      for (const child of pkg.directory === "." ? ["dist", "styles"] : ["dist", "android/src/main", "android/build.gradle", "expo-module.config.json", "README.md"]) {
        run(cwd, "diff", ["-r", path.join(directory, child), path.join(root, child)]);
      }
    } finally { fs.rmSync(unpacked, { recursive: true, force: true }); }
    packageFiles[pkg.name] = pack.filename;
  }
  run(cwd, "tar", ["-czf", path.join(artifactDir, "docs.tgz"), "-C", "docs/dist", "."]);
  assertCandidate(cwd, c);
  const files = [...Object.values(packageFiles), "docs.tgz"].map((name) => ({ name, sha256: hash(path.join(artifactDir, name)) }));
  write(path.join(artifactDir, "manifest.json"), { ...c, packageFile: packageFiles[c.name], packageFiles, files });
}

export function verifyArtifacts(cwd, candidateDir, artifactDir) {
  const c = readCandidate(candidateDir);
  assertCandidate(cwd, c);
  const m = read(path.join(artifactDir, "manifest.json"));
  for (const [key, value] of Object.entries(c)) if (JSON.stringify(m[key]) !== JSON.stringify(value)) throw new Error(`Artifact ${key} does not match candidate`);
  const packageFiles = m.packageFiles;
  if (!packageFiles || Object.keys(packageFiles).sort().join() !== c.packages.map((p) => p.name).sort().join() ||
      m.packageFile !== packageFiles[c.name] ||
      Object.values(packageFiles).some((name) => typeof name !== "string" || !name.endsWith(".tgz") || name === "docs.tgz")) throw new Error("Invalid artifact manifest");
  const names = [...Object.values(packageFiles), "docs.tgz"];
  if (!Array.isArray(m.files) || new Set(names).size !== names.length || m.files.length !== names.length ||
      m.files.map((f) => f.name).sort().join("\n") !== names.sort().join("\n")) throw new Error("Invalid artifact manifest");
  for (const file of m.files) {
    if (typeof file.name !== "string" || path.basename(file.name) !== file.name ||
        hash(path.join(artifactDir, file.name)) !== file.sha256) throw new Error("Artifact checksum mismatch");
  }
  return m;
}

// The push is the acceptance operation. An advance between ls-remote and push is
// rejected by Git itself. Never merge/rebase/retry it into an untested candidate.
export function accept(cwd, c, beforePush = () => {}) {
  assertCandidate(cwd, c);
  const tip = git(cwd, "ls-remote", "origin", "refs/heads/main").split(/\s/)[0];
  if (tip !== c.source) return false;
  if (!c.release) return true;
  beforePush();
  const pushed = spawnSync("git", ["push", "origin", "HEAD:refs/heads/main"], { cwd, encoding: "utf8", env: commandEnvironment() });
  if (pushed.status === 0) return true;
  const latest = git(cwd, "ls-remote", "origin", "refs/heads/main").split(/\s/)[0];
  if (latest !== c.source) return false;
  throw new Error(`Candidate push failed: ${pushed.stderr}`);
}

export function publish(cwd, candidateDir, artifactDir, npmPublish) {
  const m = verifyArtifacts(cwd, candidateDir, artifactDir);
  if (m.status === "blocked-major") {
    output("status", "blocked-major");
    output("accepted", "false");
    return "blocked-major";
  }
  if (!accept(cwd, m)) {
    output("status", "stale");
    output("accepted", "false");
    return "stale";
  }
  // Set acceptance before npm: docs may deploy its validated artifact even when
  // registry publication fails. Summaries retain each independent stage's result.
  output("accepted", "true");
  if (m.release) {
    output("status", "publishing");
    // Publish the optional implementation before the Canvas release that can use it.
    // Tag only after every registry operation succeeds; a partial release needs a
    // new changeset and candidate, never a retry of this accepted transaction.
    const releases = m.packages.filter((p) => p.release).sort((a, b) => Number(a.directory === ".") - Number(b.directory === "."));
    for (const pkg of releases) npmPublish(path.join(artifactDir, m.packageFiles[pkg.name]));
    for (const pkg of releases) git(cwd, "tag", pkg.tag, m.candidate);
    git(cwd, "push", "origin", ...releases.map((pkg) => `refs/tags/${pkg.tag}:refs/tags/${pkg.tag}`));
    output("status", "published");
    return "published";
  }
  output("status", m.status);
  return m.status;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, candidateDirArg, extra] = process.argv.slice(2);
  const cwd = process.cwd();
  const dir = path.resolve(candidateDirArg ?? ".release-candidate");
  if (command === "prepare") prepare(cwd, dir, process.env.SOURCE_SHA, process.env.RELEASE_NPM === "true");
  else if (command === "restore") restore(cwd, dir, process.env.SOURCE_SHA);
  else if (command === "seal") seal(cwd, dir, path.resolve(extra));
  else if (command === "verify") verifyArtifacts(cwd, dir, path.resolve(extra));
  else if (command === "publish") {
    if (process.env.GITHUB_ACTIONS !== "true" || process.env.GITHUB_REF !== "refs/heads/main") throw new Error("Publication is restricted to CI on main");
    publish(cwd, dir, path.resolve(extra), (file) => run(cwd, "npm", ["publish", file, "--ignore-scripts", "--access", "public", "--registry", "https://registry.npmjs.org"]));
  } else throw new Error("Expected prepare, restore, seal, verify or publish");
}
