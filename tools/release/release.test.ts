import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { accept, assertReleaseVersion, prepare, publish, readCandidate, restore, seal, verifyArtifacts } from "../../scripts/release.mjs";
import { preparePages } from "../../docs/scripts/prepare-pages.mjs";

const roots: string[] = [];
const root = () => { const dir = fs.mkdtempSync(path.join(os.tmpdir(), "canvas-release-")); roots.push(dir); return dir; };
const git = (cwd: string, ...args: string[]) => execFileSync("git", args, {
  cwd,
  encoding: "utf8",
  env: {
    ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_"))),
    HUSKY: "0",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
  },
  stdio: ["ignore", "pipe", "pipe"],
}).trim();
const write = (file: string, data: unknown) => fs.writeFileSync(file, JSON.stringify(data));
afterEach(() => { for (const dir of roots.splice(0)) fs.rmSync(dir, { recursive: true, force: true }); });

function fixture(bump = "patch") {
  const dir = root();
  const remote = path.join(dir, "origin.git");
  const repo = path.join(dir, "repo");
  fs.mkdirSync(repo);
  git(dir, "init", "--bare", "--initial-branch=main", remote);
  git(repo, "init", "--initial-branch=main");
  git(repo, "config", "user.name", "Release test");
  git(repo, "config", "user.email", "release@example.test");
  git(repo, "config", "core.hooksPath", path.join(dir, "no-hooks"));
  git(repo, "remote", "add", "origin", remote);
  const { main, types, exports, peerDependencies, peerDependenciesMeta, "react-native": nativeEntry } = JSON.parse(fs.readFileSync(path.resolve("package.json"), "utf8"));
  write(path.join(repo, "package.json"), { name: "@ionizeio/canvas", version: "2.3.4", main, types, exports, "react-native": nativeEntry, peerDependencies, peerDependenciesMeta, files: ["dist", "styles"], scripts: { changeset: "changeset", "version-packages": "changeset version" } });
  fs.writeFileSync(path.join(repo, "CHANGELOG.md"), "# Changes\n");
  fs.mkdirSync(path.join(repo, ".changeset"));
  fs.copyFileSync(path.resolve(".changeset/config.json"), path.join(repo, ".changeset/config.json"));
  if (bump) fs.writeFileSync(path.join(repo, ".changeset/fix.md"), `---\n"@ionizeio/canvas": ${bump}\n---\n\nCorrect a behavior.\n`);
  git(repo, "add", ".");
  git(repo, "commit", "-m", "source");
  git(repo, "push", "origin", "main");
  const source = git(repo, "rev-parse", "HEAD");
  fs.symlinkSync(path.resolve("node_modules"), path.join(repo, "node_modules"));
  const candidateDir = path.join(dir, "candidate");
  const artifacts = path.join(dir, "artifacts");
  return { dir, repo, remote, source, candidateDir, artifacts };
}

function artifacts(f: ReturnType<typeof fixture>, c: ReturnType<typeof readCandidate>) {
  fs.mkdirSync(f.artifacts);
  const files = ["package.tgz", "docs.tgz"].map((name) => {
    const bytes = Buffer.from(name);
    fs.writeFileSync(path.join(f.artifacts, name), bytes);
    return { name, sha256: createHash("sha256").update(bytes).digest("hex") };
  });
  write(path.join(f.artifacts, "manifest.json"), { ...c, packageFile: "package.tgz", files });
}

function advance(f: ReturnType<typeof fixture>) {
  const other = path.join(f.dir, "other");
  git(f.dir, "clone", f.remote, other);
  git(other, "config", "user.name", "Other contributor");
  git(other, "config", "user.email", "other@example.test");
  fs.writeFileSync(path.join(other, "test-only.txt"), "New test source\n");
  git(other, "add", ".");
  git(other, "commit", "-m", "test-only advance");
  git(other, "push", "origin", "main");
  return git(other, "rev-parse", "HEAD");
}

describe("frozen release transaction", () => {
  test("prepares from a pinned detached CI checkout with no local main ref", () => {
    const f = fixture();
    git(f.repo, "checkout", "--detach", f.source);
    git(f.repo, "branch", "-D", "main");
    const c = prepare(f.repo, f.candidateDir, f.source, true);
    expect(c.status).toBe("ready");
    expect(c.version).toBe("2.3.5");
    expect(git(f.repo, "rev-parse", "main")).toBe(f.source);
    expect(git(f.repo, "rev-parse", "HEAD^")).toBe(f.source);
  });

  // This integration case runs Changesets, copies the complete distribution,
  // invokes npm pack and verifies unpacked files. Give those subprocesses their
  // own bounded budget instead of Bun's five-second unit-test default.
  test.skipIf(!fs.existsSync(path.resolve("dist/index.js")))("seals a real npm tarball and docs archive, then verifies their unpacked bytes", () => {
    const f = fixture();
    const c = prepare(f.repo, f.candidateDir, f.source, true);
    fs.cpSync(path.resolve("dist"), path.join(f.repo, "dist"), { recursive: true });
    fs.cpSync(path.resolve("styles"), path.join(f.repo, "styles"), { recursive: true });
    fs.mkdirSync(path.join(f.repo, "scripts"));
    fs.copyFileSync(path.resolve("scripts/verify-package.ts"), path.join(f.repo, "scripts/verify-package.ts"));
    fs.mkdirSync(path.join(f.repo, "tools/licensegen"), { recursive: true });
    fs.copyFileSync(path.resolve("tools/licensegen/generate.mjs"), path.join(f.repo, "tools/licensegen/generate.mjs"));
    fs.mkdirSync(path.join(f.repo, "docs/dist"), { recursive: true });
    fs.writeFileSync(path.join(f.repo, "docs/dist/index.html"), "Validated docs bytes");
    seal(f.repo, f.candidateDir, f.artifacts);
    const m = verifyArtifacts(f.repo, f.candidateDir, f.artifacts);
    expect(m.version).toBe(c.version);
    const packed = execFileSync("tar", ["-xOf", path.join(f.artifacts, m.packageFile), "package/package.json"], { encoding: "utf8" });
    expect(JSON.parse(packed).version).toBe("2.3.5");
    expect(execFileSync("tar", ["-xOf", path.join(f.artifacts, "docs.tgz"), "./index.html"], { encoding: "utf8" })).toBe("Validated docs bytes");
    expect(execFileSync("tar", ["-xOf", path.join(f.artifacts, m.packageFile), "package/LICENSE"], { encoding: "utf8" })).toContain("MIT License");
  }, 30_000);

  test("prepares version metadata first and restores the identical commit from its bundle", () => {
    const f = fixture();
    const c = prepare(f.repo, f.candidateDir, f.source, true);
    expect(c.version).toBe("2.3.5");
    expect(c.release).toBe(true);
    expect(git(f.repo, "ls-remote", "origin", "refs/heads/main")).toStartWith(f.source);
    const validation = path.join(f.dir, "validation");
    git(f.dir, "clone", f.remote, validation);
    expect(restore(validation, f.candidateDir, f.source).candidate).toBe(c.candidate);
    expect(git(validation, "rev-parse", "HEAD")).toBe(c.candidate);
    expect(fs.existsSync(path.join(validation, ".changeset/fix.md"))).toBe(false);
  });

  test("major is blocked regardless of manual npm request; no changesets is a no-op", () => {
    const f = fixture("major");
    const c = prepare(f.repo, f.candidateDir, f.source, true);
    expect(c.status).toBe("blocked-major");
    expect(c.candidate).toBe(f.source);
    artifacts(f, c);
    expect(publish(f.repo, f.candidateDir, f.artifacts, () => { throw new Error("must not publish"); })).toBe("blocked-major");
    const empty = fixture("");
    expect(prepare(empty.repo, empty.candidateDir, empty.source, true).status).toBe("no-changesets");
    expect(() => assertReleaseVersion("2.3.4", "3.0.0")).toThrow("Major");
    expect(() => assertReleaseVersion("2.3.4", "2.3.4")).toThrow("increase");
  });

  test("a human-typed exact next major authorizes the major; anything else still blocks", () => {
    const withMajor = (value: string, run: () => void) => {
      const previous = process.env.RELEASE_MAJOR;
      process.env.RELEASE_MAJOR = value;
      try { run(); } finally {
        if (previous === undefined) delete process.env.RELEASE_MAJOR; else process.env.RELEASE_MAJOR = previous;
      }
    };
    // The wrong version (a skipped major, a minor, a typo) authorizes nothing: the
    // pure assertion covers the shapes, one fixture proves prepare still parks.
    for (const wrong of ["4.0.0", "3.1.0", "3.0.1", "3", "next"]) {
      withMajor(wrong, () => expect(() => assertReleaseVersion("2.3.4", "3.0.0")).toThrow("Major"));
    }
    withMajor("3.1.0", () => {
      const f = fixture("major");
      expect(prepare(f.repo, f.candidateDir, f.source, true).status).toBe("blocked-major");
    });
    // The exact next major, typed by a human on the dispatch, versions and readies the candidate.
    withMajor("3.0.0", () => {
      expect(() => assertReleaseVersion("2.3.4", "3.0.0")).not.toThrow();
      expect(() => assertReleaseVersion("2.3.4", "4.0.0")).toThrow("Major");
      const f = fixture("major");
      const c = prepare(f.repo, f.candidateDir, f.source, true);
      expect(c.status).toBe("ready");
      expect(c.version).toBe("3.0.0");
      expect(c.release).toBe(true);
      // Restoring the candidate re-runs the version assertion with the same authorization.
      const validation = path.join(f.dir, "validation");
      git(f.dir, "clone", f.remote, validation);
      expect(restore(validation, f.candidateDir, f.source).version).toBe("3.0.0");
    });
  }, 60_000);

  test("a test-only main advance publishes nothing and pushes no tag", () => {
    const f = fixture();
    const c = prepare(f.repo, f.candidateDir, f.source, true);
    artifacts(f, c);
    const newer = advance(f);
    let calls = 0;
    expect(publish(f.repo, f.candidateDir, f.artifacts, () => { calls++; })).toBe("stale");
    expect(calls).toBe(0);
    expect(git(f.repo, "ls-remote", "origin", "refs/heads/main")).toStartWith(newer);
    expect(git(f.repo, "ls-remote", "origin", "refs/tags/*")).toBe("");
    expect(git(f.repo, "rev-parse", "HEAD")).toBe(c.candidate);
  });

  test("a race after freshness check is rejected by normal push without rebase", () => {
    const f = fixture();
    const c = prepare(f.repo, f.candidateDir, f.source, true);
    expect(accept(f.repo, c, () => advance(f))).toBe(false);
    expect(git(f.repo, "rev-parse", "HEAD")).toBe(c.candidate);
    expect(git(f.repo, "ls-remote", "origin", "refs/tags/*")).toBe("");
  });

  test("publishes the tested file only after candidate push, then pushes only its tag", () => {
    const f = fixture();
    const c = prepare(f.repo, f.candidateDir, f.source, true);
    artifacts(f, c);
    git(f.repo, "tag", "unrelated-local-tag");
    const files: string[] = [];
    expect(publish(f.repo, f.candidateDir, f.artifacts, (file: string) => {
      expect(git(f.repo, "ls-remote", "origin", "refs/heads/main")).toStartWith(c.candidate);
      expect(git(f.repo, "ls-remote", "origin", "refs/tags/*")).toBe("");
      files.push(file);
    })).toBe("published");
    expect(files).toEqual([path.join(f.artifacts, "package.tgz")]);
    expect(git(f.repo, "ls-remote", "origin", "refs/tags/*")).toBe(`${c.candidate}\trefs/tags/v2.3.5`);
  });

  test("artifact corruption or candidate mismatch stops before acceptance", () => {
    const f = fixture();
    const c = prepare(f.repo, f.candidateDir, f.source, true);
    artifacts(f, c);
    expect(verifyArtifacts(f.repo, f.candidateDir, f.artifacts).candidate).toBe(c.candidate);
    fs.appendFileSync(path.join(f.artifacts, "docs.tgz"), "tampered");
    expect(() => publish(f.repo, f.candidateDir, f.artifacts, () => {})).toThrow("checksum");
    expect(git(f.repo, "ls-remote", "origin", "refs/heads/main")).toStartWith(f.source);
    expect(() => restore(f.repo, f.candidateDir, "a".repeat(40))).toThrow("different");
  });

  test("partial npm failure leaves no tag and cannot silently republish that candidate", () => {
    const f = fixture();
    const c = prepare(f.repo, f.candidateDir, f.source, true);
    artifacts(f, c);
    expect(() => publish(f.repo, f.candidateDir, f.artifacts, () => { throw new Error("registry failed"); })).toThrow("registry failed");
    expect(git(f.repo, "ls-remote", "origin", "refs/tags/*")).toBe("");
    expect(publish(f.repo, f.candidateDir, f.artifacts, () => { throw new Error("do not retry"); })).toBe("stale");
  });
});

test("shared Pages preparation makes vendor fonts uploadable before browser validation", () => {
  const dist = root();
  fs.mkdirSync(path.join(dist, "assets/node_modules/font"), { recursive: true });
  fs.mkdirSync(path.join(dist, "privacy"));
  for (const name of ["_redirects", "_headers", "privacy/index.html"]) fs.writeFileSync(path.join(dist, name), "fixture");
  fs.writeFileSync(path.join(dist, "assets/node_modules/font/a.ttf"), "font bytes");
  fs.writeFileSync(path.join(dist, "index.html"), '<link rel="preload" as="font" href="/assets/node_modules/font/a.ttf">');
  fs.writeFileSync(path.join(dist, "app.js"), 'const font="/assets/node_modules/font/a.ttf";');
  preparePages(dist);
  preparePages(dist);
  expect(fs.readFileSync(path.join(dist, "app.js"), "utf8")).toContain("assets/vendor");
  expect(fs.existsSync(path.join(dist, "assets/node_modules"))).toBe(false);
  fs.rmSync(path.join(dist, "assets/vendor/font/a.ttf"));
  expect(() => preparePages(dist)).toThrow();
});
