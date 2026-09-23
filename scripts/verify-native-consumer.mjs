// Bundle the real npm artifact in an isolated, ordinary React Native consumer.
// No source aliases, extension resolver, optional peer stubs, or linked workspace.
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rootRequire = createRequire(path.join(repo, "package.json"));
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const run = (cwd, command, args) => execFileSync(command, args, { cwd, encoding: "utf8", env: { ...process.env, HUSKY: "0" }, stdio: ["ignore", "pipe", "pipe"] });
// Metro indexes canonical paths. macOS exposes its temp directory via /var's
// symlink to /private/var, so canonicalize the fixture before creating its config.
const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "canvas-native-consumer-")));
try {
  let tarball;
  if (process.argv[2] === "--artifacts") {
    const directory = path.resolve(process.argv[3]);
    const { packageFile } = read(path.join(directory, "manifest.json"));
    if (typeof packageFile !== "string" || path.basename(packageFile) !== packageFile) throw new Error("Invalid sealed package filename");
    tarball = path.join(directory, packageFile);
  } else if (process.argv[2]) tarball = path.resolve(process.argv[2]);
  if (!tarball) {
    const [pack] = JSON.parse(run(repo, "npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", root, "--cache", path.join(root, "npm-cache")]));
    tarball = path.join(root, pack.filename);
  }
  const unpacked = path.join(root, "unpacked");
  fs.mkdirSync(unpacked);
  run(root, "tar", ["-xzf", tarball, "-C", unpacked]);
  const metadata = read(path.join(unpacked, "package/package.json"));
  const optional = Object.keys(metadata.peerDependencies).filter((name) => metadata.peerDependenciesMeta?.[name]?.optional);
  const required = Object.keys(metadata.peerDependencies).filter((name) => !optional.includes(name));
  const fixture = path.join(root, "app");
  fs.mkdirSync(fixture);
  const dependencies = Object.fromEntries([...required, "@react-native/metro-config", "@react-native/babel-preset", "metro"].map((name) => [name, rootRequire(`${name}/package.json`).version]));
  dependencies[metadata.name] = `file:${tarball}`;
  fs.writeFileSync(path.join(fixture, "package.json"), JSON.stringify({ name: "canvas-native-consumer", private: true, version: "1.0.0", dependencies }, null, 2));
  console.log("Installing packed Canvas with required peers and stock Metro tooling...");
  run(fixture, "bun", ["install", "--ignore-scripts", "--no-progress"]);
  const require = createRequire(path.join(fixture, "package.json"));
  for (const name of optional) {
    let found = false;
    try { require.resolve(`${name}/package.json`); found = true; } catch {}
    if (found) throw new Error(`Consumer fixture must omit optional peer ${name}`);
  }
  const installed = path.join(fixture, "node_modules", metadata.name);
  run(root, "diff", ["-r", path.join(unpacked, "package/dist"), path.join(installed, "dist")]);
  fs.writeFileSync(path.join(fixture, "babel.config.js"), 'module.exports = { presets: ["module:@react-native/babel-preset"] };\n');
  fs.writeFileSync(path.join(fixture, "metro.config.js"), 'module.exports = require("@react-native/metro-config").getDefaultConfig(__dirname);\n');
  // Retain every public export so the graph exercises the whole installed kit.
  fs.writeFileSync(path.join(fixture, "index.js"), 'import * as Canvas from "@ionizeio/canvas";\nglobalThis.canvasConsumer = Canvas;\n');
  const { loadConfig, runBuild } = require("metro");
  for (const [platform, exportsEnabled] of [["ios", true], ["android", true], ["ios", false], ["android", false]]) {
    // Use Metro's normal config loader, which includes projectRoot in its file
    // map roots before bundling. Calling getDefaultConfig alone omits that step.
    const config = await loadConfig({ cwd: fixture, config: path.join(fixture, "metro.config.js") });
    config.maxWorkers = 2;
    config.resolver.useWatchman = false;
    config.resolver.unstable_enablePackageExports = exportsEnabled;
    config.reporter = { update() {} };
    const { code, map } = await runBuild(config, { entry: "index.js", platform, dev: false, minify: true, sourceMap: true });
    if (!code.length) throw new Error(`${platform}: bundle is empty`);
    const sources = JSON.parse(map).sources.map((source) => source.replaceAll("\\", "/"));
    const contains = (suffix) => sources.some((source) => source.endsWith(`/@ionizeio/canvas/dist/native/${suffix}`));
    const forks = [
      `atoms/button/button.${platform}.js`,
      `atoms/listbox/listbox.${platform}.js`,
      `organisms/drawer/drawer.${platform}.js`,
      platform === "ios" ? "style/glass-surface/liquid-glass.ios.js" : "style/glass-surface/glass-blur-target.android.js",
      platform === "ios" ? "style/glass-surface/glass-surface.ios.js" : "style/glass-surface/glass-surface.android.js",
    ];
    for (const fork of forks) if (!contains(fork)) throw new Error(`${platform}: bundle did not select ${fork}`);
    if (sources.some((source) => /\/@ionizeio\/canvas\/dist\/(?!native\/)/.test(source))) throw new Error(`${platform}: bundle leaked into the web distribution`);
    if (contains("atoms/button/button.js")) throw new Error(`${platform}: Button selected its web entry`);
    console.log(`${platform} (${exportsEnabled ? "exports condition" : "legacy field"}): packed package bundles successfully, native skins/material helpers selected, ${optional.length} optional peers absent (${sources.length} modules)`);
  }
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
