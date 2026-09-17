import { expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = fileURLToPath(new URL("../../", import.meta.url));

test.skipIf(!existsSync(join(sourceRoot, "dist/index.js")))("release fixtures and subprocesses leave an inherited hook repository untouched", () => {
  const root = mkdtempSync(join(tmpdir(), "canvas-release-environment-"));
  const env = {
    ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_"))),
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    HUSKY: "0",
  };
  const git = (cwd: string, ...args: string[]) => execFileSync("git", args, {
    cwd, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  const digest = (file: string) => createHash("sha256").update(readFileSync(file)).digest("hex");

  try {
    const sentinel = join(root, "sentinel");
    const remote = join(root, "sentinel-origin.git");
    mkdirSync(sentinel);
    git(root, "init", "--bare", "--initial-branch=main", remote);
    git(sentinel, "init", "--initial-branch=main");
    git(sentinel, "config", "user.name", "Sentinel owner");
    git(sentinel, "config", "user.email", "sentinel@example.invalid");
    git(sentinel, "remote", "add", "origin", remote);
    writeFileSync(join(sentinel, "sentinel.txt"), "Committed sentinel content\n");
    git(sentinel, "add", ".");
    git(sentinel, "commit", "-m", "Protect this repository");
    git(sentinel, "push", "origin", "main");
    // A nonempty staged change proves the fixture does not overwrite the caller's index.
    writeFileSync(join(sentinel, "sentinel.txt"), "An unrelated staged edit\n");
    git(sentinel, "add", "sentinel.txt");
    const gitDir = join(sentinel, ".git");
    const snapshot = () => ({
      config: digest(join(gitDir, "config")),
      head: digest(join(gitDir, "HEAD")),
      index: digest(join(gitDir, "index")),
      worktree: digest(join(sentinel, "sentinel.txt")),
      refs: git(sentinel, "for-each-ref", "--format=%(refname) %(objectname)"),
      remotes: git(sentinel, "remote", "-v"),
      remoteConfig: digest(join(remote, "config")),
      remoteRefs: git(remote, "for-each-ref", "--format=%(refname) %(objectname)"),
    });
    const before = snapshot();
    // Run the real release suite in another process, never mutate this suite's
    // environment. It initializes fixtures, versions with Changesets, restores a
    // bundle, seals real npm tarballs and docs archive, and pushes local refs/tags.
    const childReport = join(root, "child-results.xml");
    const result = Bun.spawnSync([
      process.execPath, "test", join(sourceRoot, "tools/release/release.test.ts"),
      "--reporter=junit", `--reporter-outfile=${childReport}`,
    ], {
      cwd: sourceRoot,
      env: {
        ...env,
        GIT_DIR: gitDir,
        GIT_WORK_TREE: sentinel,
        GIT_COMMON_DIR: gitDir,
        GIT_INDEX_FILE: join(gitDir, "index"),
        GIT_OBJECT_DIRECTORY: join(gitDir, "objects"),
        GIT_ALTERNATE_OBJECT_DIRECTORIES: join(gitDir, "objects"),
        GIT_CONFIG: join(gitDir, "config"),
        GIT_CONFIG_PARAMETERS: "'core.bare=true'",
        GIT_CONFIG_COUNT: "2",
        GIT_CONFIG_KEY_0: "core.worktree",
        GIT_CONFIG_VALUE_0: sentinel,
        GIT_CONFIG_KEY_1: "remote.origin.url",
        GIT_CONFIG_VALUE_1: remote,
        GIT_NAMESPACE: "inherited-sentinel",
      },
      stdin: "ignore", stdout: "pipe", stderr: "pipe", timeout: 235_000,
    });
    // Check the sentinel before asserting child success, so a fixture escape is
    // reported as corruption even when the redirected command also failed.
    expect(snapshot()).toEqual(before);
    const diagnostics = result.stderr.toString();
    expect(result.exitCode, diagnostics.slice(-8000)).toBe(0);
    // Read the child's MACHINE-READABLE report, never its console reporter: bun
    // prints no per-test line for a passing test, so grepping stderr for a test
    // name silently stops proving anything. The JUnit file names every case that
    // ran and counts the skips, so a fixture that quietly skips still fails here.
    const report = readFileSync(childReport, "utf8");
    expect(report, diagnostics.slice(-8000)).toContain("seals real npm tarballs and docs archive");
    expect(report).toMatch(/<testsuites[^>]*\sskipped="0"/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}, 240_000);
