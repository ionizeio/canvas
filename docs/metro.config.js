// Metro config for the universal Canvas docs app (iOS / Android / web from one
// React Native codebase). The PUBLISHED @ionizeio/canvas is a compiled dist
// package, but the docs develop against the LIVE SOURCE via a symlink (see
// package.json postinstall):
//   - the resolver pins the bare "@ionizeio/canvas" import to src/index.ts, so
//     docs never load a stale dist build during development;
//   - watchFolders sees the out-of-tree source;
//   - nodeModulesPaths + disableHierarchicalLookup force a single react/RN/svg copy;
//   - the resolver maps the library's NodeNext ".js" specifiers to their .ts/.tsx
//     source (which also restores per-OS .ios/.android skin resolution on native).
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const { createHash } = require("node:crypto");
const { readBuildInfo } = require("./scripts/build-info.cjs");

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

// Expo embeds Constants.expoConfig in its web transform. That transform does not
// track dynamic app-config inputs such as Git revision or package metadata.
// Include the same identity in Metro's cache key so a new candidate never reuses
// a prior candidate's embedded manifest, on either a local export or CI.
config.cacheVersion = `${config.cacheVersion ?? ""}:canvas-${createHash("sha256")
  .update(JSON.stringify(readBuildInfo(repoRoot))).digest("hex")}`;

config.watchFolders = [repoRoot];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules")];
config.resolver.disableHierarchicalLookup = true;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Live-source pin: the package's main/exports point at dist (the publish
  // artifact), but docs development must track src edits without a rebuild.
  if (moduleName === "@ionizeio/canvas") {
    // Resolve through the node_modules symlink path (docs/node_modules/@ionizeio/
    // canvas -> repoRoot), NOT a raw repoRoot path: Metro's file map indexes the kit
    // under the node_modules path it crawls, so the raw out-of-tree path misses on the
    // Linux CI runner and `expo export` fails "Failed to get the SHA-1 for src/index.ts".
    return {
      type: "sourceFile",
      filePath: path.join(projectRoot, "node_modules", "@ionizeio", "canvas", "src", "index.ts"),
    };
  }
  // No stub is needed for the kit's optional peers, and adding one back would hide a
  // real regression. The kit loads them through a require sitting DIRECTLY inside a
  // try block, which is the shape Metro's isOptionalDependency recognises, so an
  // absent peer resolves to nothing and the runtime catch takes over. This app
  // deliberately installs no Skia, so a successful `expo export` here is the proof
  // that the optional-peer mechanism still works.
  if (moduleName.endsWith(".js") && (moduleName.startsWith("./") || moduleName.startsWith("../"))) {
    try {
      return context.resolveRequest(context, moduleName, platform);
    } catch {
      return context.resolveRequest(context, moduleName.slice(0, -3), platform);
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
