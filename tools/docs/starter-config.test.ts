import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../../examples/starter/app.config.js", import.meta.url), "utf8");
const identity = {
  schema: 1, inputMode: "package", sourceRevision: "a".repeat(40), candidateRevision: "b".repeat(40),
  packageVersion: "2.62.1", packageSha256: "c".repeat(64), packageName: "@ionizeio/canvas", sourceDirty: false,
};

function config(env: Record<string, string> = {}) {
  const module = { exports: {} as { expo: { ios: { bundleIdentifier: string }; scheme: string; extra: { canvasBuild?: unknown } } } };
  runInNewContext(source, { process: { env }, module });
  return module.exports.expo;
}

describe("starter verification identity", () => {
  it("keeps ordinary builds free of verification identity, even if unrelated env is present", () => {
    const ordinary = config({ CANVAS_SMOKE_IDENTITY: "not valid JSON" });
    expect(ordinary.ios.bundleIdentifier).toBe("com.nannier.canvas.starter");
    expect(ordinary.scheme).toBe("canvas-starter");
    expect(ordinary.extra.canvasBuild).toBeUndefined();
  });

  it("does not invent provenance for an opt-in smoke build without an identity", () => {
    const smoke = config({ EXPO_PUBLIC_CANVAS_SMOKE: "1" });
    expect(smoke.ios.bundleIdentifier).toBe("com.nannier.canvas.starter.smoke");
    expect(smoke.scheme).toBe("canvas-smoke");
    expect(smoke.extra.canvasBuild).toBeUndefined();
  });

  it("preserves a verified manifest identity and valid semver prerelease/build fields", () => {
    for (const version of ["0.0.0", "2.62.1", "2.63.0-beta.1+build.004"]) {
      const payload = { ...identity, packageVersion: version };
      expect(config({ EXPO_PUBLIC_CANVAS_SMOKE: "1", CANVAS_SMOKE_IDENTITY: JSON.stringify(payload) }).extra.canvasBuild).toEqual(payload);
    }
    const { packageName: _name, sourceDirty: _dirty, ...minimal } = identity;
    expect(config({ EXPO_PUBLIC_CANVAS_SMOKE: "1", CANVAS_SMOKE_IDENTITY: JSON.stringify(minimal) }).extra.canvasBuild).toEqual(minimal);
  });

  for (const raw of ["{", "null", "[]", '"identity"', "1"]) {
    it(`rejects a non-object or malformed payload: ${raw}`, () => {
      expect(() => config({ EXPO_PUBLIC_CANVAS_SMOKE: "1", CANVAS_SMOKE_IDENTITY: raw })).toThrow("CANVAS_SMOKE_IDENTITY");
    });
  }

  const invalid = [
    ["schema", "1"], ["inputMode", "artifact"], ["sourceRevision", "a".repeat(39)], ["candidateRevision", "z".repeat(40)],
    ["packageSha256", "c".repeat(63)], ["sourceRevision", `${"a".repeat(40)}\n`], ["packageName", "other-package"], ["sourceDirty", true],
    ...["2.62", "v2.62.1", "02.62.1", "2.62.1-beta.01", "2.62.1-", "2.62.1+", "2.62.1+bad value", "2.62.1\n"].map((value) => ["packageVersion", value]),
  ];
  for (const [field, value] of invalid) {
    it(`rejects invalid ${field}: ${value}`, () => {
      expect(() => config({ EXPO_PUBLIC_CANVAS_SMOKE: "1", CANVAS_SMOKE_IDENTITY: JSON.stringify({ ...identity, [String(field)]: value }) })).toThrow(`invalid ${field}`);
    });
  }
});
