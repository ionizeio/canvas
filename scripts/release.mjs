// CI release transaction. The candidate is never rebased or rebuilt at publication.
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

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
  if (!SHA.test(c.source) || !SHA.test(c.candidate) || !VERSION.test(c.version) ||
      c.name !== "@nannier-com/canvas" || typeof c.release !== "boolean" ||
      !["ready", "no-changesets", "not-requested", "blocked-major"].includes(c.status) ||
      c.tag !== `v${c.version}` || (c.release !== (c.status === "ready")) ||
      (!c.release && c.source !== c.candidate)) throw new Error("Invalid release candidate metadata");
  return c;
}

export function assertCandidate(cwd, c) {
  if (git(cwd, "rev-parse", "HEAD") !== c.candidate) throw new Error("Checkout does not match the candidate");
  if (git(cwd, "status", "--porcelain", "--untracked-files=no")) throw new Error("Candidate has modified tracked files");
  const pkg = read(path.join(cwd, "package.json"));
  if (pkg.name !== c.name || pkg.version !== c.version) throw new Error("Package metadata does not match the candidate");
  if (c.release) {
    if (git(cwd, "rev-parse", "HEAD^") !== c.source) throw new Error("Version commit must directly follow its validated source");
    const previous = JSON.parse(git(cwd, "show", `${c.source}:package.json`));
    assertReleaseVersion(previous.version, c.version);
  }
}

export function prepare(cwd, dir, source, publish) {
  if (!SHA.test(source) || git(cwd, "rev-parse", "HEAD") !== source) throw new Error("Prepare requires the triggering source SHA");
  if (git(cwd, "status", "--porcelain", "--untracked-files=no")) throw new Error("Prepare requires clean tracked files");
  fs.mkdirSync(dir, { recursive: true });
  const before = read(path.join(cwd, "package.json"));
  let status = "not-requested";
  if (publish) {
    // checkout(ref: SHA) is detached and creates no local main branch. Changesets
    // reads its configured baseBranch even when calculating all pending entries.
    // Supply that name at the pinned source without moving HEAD or any existing ref.
    if (!git(cwd, "branch", "--list", "main")) git(cwd, "branch", "main", source);
    const planFile = path.join(dir, "changeset-plan.json");
    run(cwd, "bun", ["run", "changeset", "status", "--output", planFile]);
    const plan = read(planFile);
    const major = plan.releases.some((r) => r.type === "major");
    if (major && authorizedMajor() !== nextMajor(before.version)) {
      status = "blocked-major";
    } else if (plan.releases.some((r) => r.name === before.name && r.type !== "none")) {
      run(cwd, "bun", ["run", "version-packages"]);
      assertReleaseVersion(before.version, read(path.join(cwd, "package.json")).version);
      git(cwd, "add", "--", "package.json", "CHANGELOG.md", ".changeset");
      git(cwd, "-c", "user.name=github-actions[bot]", "-c", "user.email=41898282+github-actions[bot]@users.noreply.github.com", "commit", "-m", "chore: version validated release [skip ci]");
      git(cwd, "bundle", "create", path.join(dir, "candidate.bundle"), `${source}..HEAD`);
      status = "ready";
    } else {
      status = "no-changesets";
    }
  }
  const pkg = read(path.join(cwd, "package.json"));
  const c = { source, candidate: git(cwd, "rev-parse", "HEAD"), name: pkg.name, version: pkg.version, tag: `v${pkg.version}`, release: status === "ready", status };
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
  run(cwd, "node", ["tools/licensegen/generate.mjs"]);
  const [pack] = JSON.parse(run(cwd, "npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", artifactDir, "--cache", path.join(artifactDir, "..", "npm-cache")]));
  if (pack.name !== c.name || pack.version !== c.version || path.basename(pack.filename) !== pack.filename) throw new Error("Packed a different package");
  const required = ["LICENSE", "dist/index.js", "dist/index.d.ts", "dist/native/index.js", "package.json"];
  if (!required.every((name) => pack.files.some((file) => file.path === name))) throw new Error("Package is missing a required distribution file");
  // Verify the unpacked bytes, including specifier/platform checks, before sealing.
  const unpacked = fs.mkdtempSync(path.join(artifactDir, "unpacked-"));
  try {
    run(cwd, "tar", ["-xzf", path.join(artifactDir, pack.filename), "-C", unpacked]);
    run(cwd, "bun", ["scripts/verify-package.ts", path.join(unpacked, "package")]);
    run(cwd, "diff", ["-r", "dist", path.join(unpacked, "package/dist")]);
    run(cwd, "diff", ["-r", "styles", path.join(unpacked, "package/styles")]);
  } finally {
    fs.rmSync(unpacked, { recursive: true, force: true });
  }
  run(cwd, "tar", ["-czf", path.join(artifactDir, "docs.tgz"), "-C", "docs/dist", "."]);
  assertCandidate(cwd, c);
  const files = [pack.filename, "docs.tgz"].map((name) => ({ name, sha256: hash(path.join(artifactDir, name)) }));
  write(path.join(artifactDir, "manifest.json"), { ...c, packageFile: pack.filename, files });
}

export function verifyArtifacts(cwd, candidateDir, artifactDir) {
  const c = readCandidate(candidateDir);
  assertCandidate(cwd, c);
  const m = read(path.join(artifactDir, "manifest.json"));
  for (const [key, value] of Object.entries(c)) if (m[key] !== value) throw new Error(`Artifact ${key} does not match candidate`);
  if (!Array.isArray(m.files) || m.files.length !== 2 || typeof m.packageFile !== "string" ||
      !m.packageFile.endsWith(".tgz") || m.packageFile === "docs.tgz" ||
      m.files.map((f) => f.name).sort().join("\n") !== [m.packageFile, "docs.tgz"].sort().join("\n")) throw new Error("Invalid artifact manifest");
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
    npmPublish(path.join(artifactDir, m.packageFile));
    git(cwd, "tag", m.tag, m.candidate);
    git(cwd, "push", "origin", `refs/tags/${m.tag}:refs/tags/${m.tag}`);
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
