// Exercise one built npm artifact against the declared floors and current peers.
// All installs are outside this checkout, with no source overlays or optional peers.
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { assertInstalledPackage } from "../tools/native/candidate.mjs";
import { supportMatrix, validatePeerCoverage, sealedPackage, assertNativeGraph } from "../tools/package/consumer-support/contract.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = path.join(repo, "tools/package/consumer-support");
const rootRequire = createRequire(path.join(repo, "package.json"));
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
function run(cwd, command, args) {
  try {
    return execFileSync(command, args, { cwd, encoding: "utf8", env: { ...process.env, HUSKY: "0" }, stdio: ["ignore", "pipe", "pipe"] });
  } catch (error) {
    throw new Error(`${command} ${args.join(" ")} failed:\n${error.stdout ?? ""}${error.stderr ?? ""}`, { cause: error });
  }
}

function checkTypes(app, require) {
  fs.copyFileSync(path.join(fixtures, "consumer.tsx"), path.join(app, "consumer.tsx"));
  // Native's globals and lib.dom declare competing URL, FormData and XHR types
  // on RN 0.74. Use the native ES lib so every reachable Canvas declaration is
  // checked without suppressing declaration errors using skipLibCheck.
  const ts = require("typescript");
  const options = {
    target: ts.ScriptTarget.ES2020, lib: ["lib.es2020.d.ts"], jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
    strict: true, skipLibCheck: false, noEmit: true, esModuleInterop: true,
    types: ["react"], typeRoots: [path.join(app, "node_modules/@types")],
  };
  const program = ts.createProgram([path.join(app, "consumer.tsx")], options);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (file) => file, getCurrentDirectory: () => app, getNewLine: () => "\n",
  }));
}

async function checkNative(app, require, label) {
  fs.writeFileSync(path.join(app, "babel.config.js"), 'module.exports = { presets: ["module:@react-native/babel-preset"] };\n');
  fs.writeFileSync(path.join(app, "metro.config.js"), 'module.exports = require("@react-native/metro-config").getDefaultConfig(__dirname);\n');
  fs.writeFileSync(path.join(app, "index.js"), 'import * as Canvas from "@ionizeio/canvas";\nglobalThis.canvasConsumer = Canvas;\n');
  const { loadConfig, runBuild } = require("metro");
  for (const [platform, exportsEnabled] of [["ios", true], ["android", true], ["ios", false], ["android", false]]) {
    const config = await loadConfig({ cwd: app, config: path.join(app, "metro.config.js") });
    config.maxWorkers = 2;
    config.resolver.useWatchman = false;
    config.resolver.unstable_enablePackageExports = exportsEnabled;
    config.reporter = { update() {} };
    const { code, map } = await runBuild(config, { entry: "index.js", platform, dev: false, minify: true, sourceMap: true });
    if (!code.length) throw new Error(`${label}/${platform}: empty native bundle`);
    const sources = JSON.parse(map).sources;
    assertNativeGraph(sources, platform);
    console.log(`${label}: ${platform} ${exportsEnabled ? "exports condition" : "legacy field"} passed (${sources.length} modules)`);
  }
}

async function checkServer(app, require, expectedReact, label) {
  fs.copyFileSync(path.join(fixtures, "ssr.jsx"), path.join(app, "ssr.jsx"));
  const result = await require("esbuild").build({
    absWorkingDir: app, entryPoints: ["ssr.jsx"], outfile: "ssr.cjs", bundle: true,
    platform: "node", format: "cjs", metafile: true,
    alias: { "react-native": "react-native-web" },
    resolveExtensions: [".web.tsx", ".web.ts", ".web.jsx", ".web.js", ".tsx", ".ts", ".jsx", ".js", ".json"],
    define: { "process.env.NODE_ENV": '"development"', __DEV__: "true" }, logLevel: "silent",
  });
  const inputs = Object.keys(result.metafile.inputs);
  if (!inputs.some((file) => file.endsWith("@ionizeio/canvas/dist/index.js"))) throw new Error("SSR did not use the installed public package");
  if (inputs.some((file) => file.includes("@ionizeio/canvas/dist/native/"))) throw new Error("SSR selected native Canvas output");
  const proof = JSON.parse(run(app, "node", ["ssr.cjs"]));
  if (proof.reactVersion !== require("react").version || proof.layoutWarnings !== 0 || !(proof.htmlLength > 0)) {
    throw new Error("SSR used the wrong React runtime or lost its rendered content/effect guarantee");
  }
  console.log(`${label}: React ${expectedReact} server rendering without layout-effect warnings passed`);
}

async function checkWeb(app, require, expectedReact, label) {
  await checkServer(app, require, expectedReact, label);
  fs.copyFileSync(path.join(fixtures, "web.jsx"), path.join(app, "web.jsx"));
  // These are ordinary RNW consumer settings, including web sibling selection
  // for react-native-svg. Nothing aliases Canvas, rewrites .js requests or stubs peers.
  const result = await require("esbuild").build({
    absWorkingDir: app, entryPoints: ["web.jsx"], outfile: "web-dist/app.js", bundle: true,
    platform: "browser", format: "esm", minify: true, metafile: true,
    alias: { "react-native": "react-native-web" },
    resolveExtensions: [".web.tsx", ".web.ts", ".web.jsx", ".web.js", ".tsx", ".ts", ".jsx", ".js", ".json"],
    define: { "process.env.NODE_ENV": '"production"', __DEV__: "false" }, logLevel: "silent",
  });
  const inputs = Object.keys(result.metafile.inputs);
  if (!inputs.some((file) => file.endsWith("@ionizeio/canvas/dist/index.js"))) throw new Error("Web bundle did not use the installed public package");
  if (inputs.some((file) => file.includes("@ionizeio/canvas/dist/native/"))) throw new Error("Web bundle selected native Canvas output");
  const script = fs.readFileSync(path.join(app, "web-dist/app.js"));
  if (!script.length) throw new Error("Empty web bundle");
  const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Canvas consumer compatibility</title></head><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>';
  const server = createServer((request, response) => {
    if (request.url === "/app.js") { response.writeHead(200, { "Content-Type": "text/javascript" }); response.end(script); }
    else if (request.url === "/") { response.writeHead(200, { "Content-Type": "text/html" }); response.end(html); }
    else { response.writeHead(204); response.end(); }
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  let browser;
  try {
    browser = await rootRequire("@playwright/test").chromium.launch();
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    const { expect } = rootRequire("@playwright/test");
    await expect(page.getByRole("heading", { name: "Consumer compatibility" })).toBeVisible();
    // React 18.0.0's published runtime reports a build suffix in React.version.
    // Compare with that exact installed runtime; package.json versions are
    // checked separately, so neither a peer override nor a bundled copy can pass.
    if (await page.evaluate(() => window.canvasReactVersion) !== require("react").version) throw new Error("Web runtime loaded the wrong React version");
    const exports = await page.evaluate(() => Object.entries(window.canvasExports).map(([name, value]) => [name, value !== undefined]));
    if (!exports.length || exports.some(([, defined]) => !defined)) throw new Error("Web package contains missing runtime exports");
    await page.getByRole("button", { name: "Focus workspace" }).click();
    await expect(page.getByRole("textbox", { name: "Workspace" })).toBeFocused();
    await page.getByRole("textbox", { name: "Workspace" }).fill("Research");
    await page.getByRole("checkbox", { name: "Subscribe to updates" }).press("Space");
    await expect(page.getByRole("checkbox", { name: "Subscribe to updates" })).toHaveAttribute("aria-checked", "true");
    await page.getByRole("button", { name: "City" }).click();
    await page.getByRole("option", { name: "Montreal" }).click();
    await page.getByRole("textbox", { name: "Workspace" }).press("Enter");
    await expect(page.getByTestId("saved-workspace")).toHaveText("Research: Montreal: subscribed");
    await expect(page.getByRole("img", { name: "Optional QR renderer fallback" })).toBeVisible();
    if (errors.length) throw new Error(`Web runtime errors:\n${errors.join("\n")}`);
    console.log(`${label}: React ${expectedReact} web form, keyboard toggle, select, host focus and absent-peer fallback passed (${exports.length} exports)`);
  } finally {
    await browser?.close();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

export async function verifyConsumerSupport(args = process.argv.slice(2)) {
  // Metro needs the canonical /private/var path on macOS, not the /var symlink.
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "canvas-consumer-support-")));
  try {
    let tarball;
    if (args[0] === "--artifacts" && args.length === 2) tarball = sealedPackage(path.resolve(args[1]));
    else if (args.length === 1 && !args[0].startsWith("--")) tarball = path.resolve(args[0]);
    else if (args.length) throw new Error("Usage: verify-consumer-support.mjs [package.tgz | --artifacts directory]");
    if (!tarball) {
      if (!fs.existsSync(path.join(repo, "dist/index.js"))) throw new Error("Build Canvas before verifying consumer support");
      const [pack] = JSON.parse(run(repo, "npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", root, "--cache", path.join(root, "npm-cache")]));
      tarball = path.join(root, pack.filename);
    }
    const unpacked = path.join(root, "unpacked");
    fs.mkdirSync(unpacked);
    run(root, "tar", ["-xzf", tarball, "-C", unpacked]);
    const packageRoot = path.join(unpacked, "package");
    const metadata = read(path.join(packageRoot, "package.json"));
    if (metadata.name !== "@ionizeio/canvas") throw new Error("Expected a packed @ionizeio/canvas package");
    for (const row of supportMatrix((name) => rootRequire(`${name}/package.json`).version)) {
      const optional = validatePeerCoverage(metadata, row.dependencies);
      const app = path.join(root, row.name);
      fs.mkdirSync(app);
      fs.writeFileSync(path.join(app, "package.json"), JSON.stringify({ name: `canvas-${row.name}-consumer`, version: "1.0.0", private: true, dependencies: { ...row.dependencies, [metadata.name]: `file:${tarball}` } }, null, 2));
      console.log(`${row.name}: installing Canvas ${metadata.version} with ${optional.length} optional peers absent`);
      run(app, "bun", ["install", "--ignore-scripts", "--no-progress"]);
      const require = createRequire(path.join(app, "package.json"));
      const installed = path.join(app, "node_modules", metadata.name);
      assertInstalledPackage(packageRoot, installed);
      const consumerRequire = createRequire(path.join(installed, "package.json"));
      for (const name of optional) {
        let found = false;
        try { consumerRequire.resolve(name); found = true; } catch (error) {
          if (error.code !== "MODULE_NOT_FOUND") throw error;
        }
        if (found) throw new Error(`Consumer unexpectedly installed optional peer ${name}`);
      }
      for (const [name, version] of Object.entries(row.dependencies)) {
        if (read(path.join(app, "node_modules", name, "package.json")).version !== version) throw new Error(`Consumer installed the wrong ${name} version`);
      }
      checkTypes(app, require);
      console.log(`${row.name}: strict public declarations and consumer refs passed`);
      if (row.web) await checkWeb(app, require, row.dependencies.react, row.name);
      if (row.native) await checkNative(app, require, row.name);
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await verifyConsumerSupport();
}
