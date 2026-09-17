import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const metadata = (relative: string) => JSON.parse(readFileSync(new URL(relative, import.meta.url), "utf8"));

test("optional native implementation remains independent of Canvas installation", () => {
  const root = metadata("../../package.json");
  const blur = metadata("../../packages/canvas-blur/package.json");
  expect(root.workspaces).toContain(".");
  expect(root.workspaces).toContain("packages/*");
  expect(root.peerDependenciesMeta[blur.name]).toEqual({ optional: true });
  expect(root.dependencies?.[blur.name]).toBeUndefined();
  expect(root.dependencies?.["expo-modules-core"]).toBeUndefined();
  expect(root.peerDependencies?.["expo-modules-core"]).toBeUndefined();
  expect(blur.peerDependencies["expo-modules-core"]).toBeDefined();
  expect(blur.peerDependenciesMeta?.["expo-modules-core"]?.optional).not.toBe(true);
});

test("docs autolink the local module without pinning consumer dependencies to source", () => {
  const docs = metadata("../../docs/package.json");
  const starter = metadata("../../examples/starter/package.json");
  expect(docs.expo.autolinking.nativeModulesDir).toBe("../packages");
  expect(docs.dependencies["@ionizeio/canvas-blur"]).toBeUndefined();
  expect(starter.dependencies["@ionizeio/canvas-blur"]).toBeUndefined();
  for (const pkg of [docs, starter]) {
    expect(Object.values(pkg.dependencies).some((value) => /^(file|link|workspace):/.test(String(value)))).toBe(false);
  }
});
