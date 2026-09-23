import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";

const COMMON_TOOLS = { esbuild: "0.25.11", typescript: "5.9.3" };
const FLOOR = {
  "react-native": "0.74.0", "react-native-svg": "14.0.0", "react-native-web": "0.19.13",
  "@types/react": "18.2.79", "@react-native/metro-config": "0.74.0",
  "@react-native/babel-preset": "0.74.0", metro: "0.79.1",
};
const CURRENT = ["react", "react-dom", ...Object.keys(FLOOR)];

export function supportMatrix(installedVersion) {
  return [
    // RNW supports React 18.0. RN is present for the public declarations only;
    // this row does not claim React 18.0 is a valid native RN 0.74 host pair.
    { name: "web-floor", native: false, web: true, dependencies: { ...COMMON_TOOLS, ...FLOOR, react: "18.0.0", "react-dom": "18.0.0" } },
    // RN 0.74 itself requires React 18.2 exactly.
    { name: "native-floor", native: true, web: false, dependencies: { ...COMMON_TOOLS, ...FLOOR, react: "18.2.0", "react-dom": "18.2.0" } },
    { name: "current", native: true, web: true, dependencies: { ...COMMON_TOOLS, ...Object.fromEntries(CURRENT.map((name) => [name, installedVersion(name)])) } },
  ];
}

export function validatePeerCoverage(metadata, dependencies) {
  const optional = Object.keys(metadata.peerDependencies ?? {}).filter((name) => metadata.peerDependenciesMeta?.[name]?.optional);
  const required = Object.keys(metadata.peerDependencies ?? {}).filter((name) => !optional.includes(name));
  for (const name of required) if (!dependencies[name]) throw new Error(`Support matrix must cover required peer ${name}`);
  for (const name of optional) if (dependencies[name]) throw new Error(`Support matrix must omit optional peer ${name}`);
  return optional;
}

export function sealedPackage(directory) {
  const manifest = JSON.parse(readFileSync(join(directory, "manifest.json"), "utf8"));
  const name = manifest.packageFile;
  if (typeof name !== "string" || !name.endsWith(".tgz") || basename(name) !== name) throw new Error("Invalid sealed package filename");
  const expected = manifest.files?.find((file) => file.name === name)?.sha256;
  const file = join(directory, name);
  const actual = createHash("sha256").update(readFileSync(file)).digest("hex");
  if (expected !== actual) throw new Error("Sealed package hash mismatch");
  return file;
}

export function assertNativeGraph(sources, platform) {
  const normalized = sources.map((source) => source.replaceAll("\\", "/"));
  const contains = (suffix) => normalized.some((source) => source.endsWith(`/@ionizeio/canvas/dist/native/${suffix}`));
  for (const file of [
    `atoms/button/button.${platform}.js`, `atoms/listbox/listbox.${platform}.js`,
    `organisms/drawer/drawer.${platform}.js`,
    platform === "ios" ? "style/glass-surface/liquid-glass.ios.js" : "style/glass-surface/glass-blur-target.android.js",
    platform === "ios" ? "style/glass-surface/glass-surface.ios.js" : "style/glass-surface/glass-surface.android.js",
  ]) if (!contains(file)) throw new Error(`${platform}: native graph did not select ${file}`);
  if (normalized.some((source) => /\/@ionizeio\/canvas\/dist\/(?!native\/)/.test(source))) throw new Error(`${platform}: native graph selected the web distribution`);
  if (contains("atoms/button/button.js")) throw new Error(`${platform}: native graph selected the web Button`);
}
