import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { supportMatrix, validatePeerCoverage, sealedPackage, assertNativeGraph } from "./contract.mjs";

describe("isolated support matrix", () => {
  test("the CLI is import-safe for tooling and tests", async () => {
    const cli = await import("../../../scripts/verify-consumer-support.mjs");
    expect(typeof cli.verifyConsumerSupport).toBe("function");
  });

  test("keeps the declared web floor distinct from RN's required React pair", () => {
    const rows = supportMatrix((name: string) => `installed:${name}`);
    expect(rows.map((row) => row.name)).toEqual(["web-floor", "native-floor", "current"]);
    expect(rows[0]).toMatchObject({ native: false, web: true, dependencies: { react: "18.0.0", "react-dom": "18.0.0", "react-native-web": "0.19.13" } });
    expect(rows[1]).toMatchObject({ native: true, web: false, dependencies: { react: "18.2.0", "react-native": "0.74.0", "react-native-svg": "14.0.0", metro: "0.79.1" } });
    expect(rows[2].dependencies.react).toBe("installed:react");
    expect(rows[2].dependencies["@react-native/metro-config"]).toBe("installed:@react-native/metro-config");
  });

  test("new required peers cannot silently escape matrix coverage", () => {
    const metadata = { peerDependencies: { react: ">=18", required: "*", optional: "*" }, peerDependenciesMeta: { optional: { optional: true } } };
    expect(() => validatePeerCoverage(metadata, { react: "18.0.0" })).toThrow("required peer required");
    expect(() => validatePeerCoverage(metadata, { react: "18.0.0", required: "1", optional: "1" })).toThrow("omit optional peer optional");
    expect(validatePeerCoverage(metadata, { react: "18.0.0", required: "1" })).toEqual(["optional"]);
  });

  test("uses sealed tarball bytes and refuses missing or mismatched checksums", () => {
    const root = mkdtempSync(join(tmpdir(), "canvas-support-manifest-"));
    try {
      writeFileSync(join(root, "canvas.tgz"), "sealed package bytes");
      const manifest = { packageFile: "canvas.tgz", files: [{ name: "canvas.tgz", sha256: createHash("sha256").update("sealed package bytes").digest("hex") }] };
      writeFileSync(join(root, "manifest.json"), JSON.stringify(manifest));
      expect(sealedPackage(root)).toBe(join(root, "canvas.tgz"));
      writeFileSync(join(root, "canvas.tgz"), "modified package bytes");
      expect(() => sealedPackage(root)).toThrow("hash mismatch");
      writeFileSync(join(root, "manifest.json"), JSON.stringify({ packageFile: "canvas.tgz" }));
      expect(() => sealedPackage(root)).toThrow("hash mismatch");
      writeFileSync(join(root, "manifest.json"), JSON.stringify({ packageFile: "../canvas.tgz" }));
      expect(() => sealedPackage(root)).toThrow("filename");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  test.each(["ios", "android"])("%s sourcemap must prove platform entries and reject web leakage", (platform) => {
    const prefix = "/app/node_modules/@ionizeio/canvas/dist/native/";
    const files = [
      `atoms/button/button.${platform}.js`, `atoms/listbox/listbox.${platform}.js`, `organisms/drawer/drawer.${platform}.js`,
      platform === "ios" ? "style/glass-surface/liquid-glass.ios.js" : "style/glass-surface/glass-blur-target.android.js",
      platform === "ios" ? "style/glass-surface/glass-surface.ios.js" : "style/glass-surface/glass-surface.android.js",
    ].map((name) => prefix + name);
    expect(() => assertNativeGraph(files, platform)).not.toThrow();
    for (const removed of files) expect(() => assertNativeGraph(files.filter((name) => name !== removed), platform)).toThrow("did not select");
    expect(() => assertNativeGraph([...files, "/app/node_modules/@ionizeio/canvas/dist/index.js"], platform)).toThrow("web distribution");
    expect(() => assertNativeGraph([...files, prefix + "atoms/button/button.js"], platform)).toThrow("web Button");
  });
});
