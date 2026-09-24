import { afterAll, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lookupPackage, packageOfSource, repoPath } from "./locate.ts";

const serverRoot = "/repo/docs";

describe("packageOfSource", () => {
  it("attributes a nested copy to the inner package and its own directory", () => {
    expect(packageOfSource("/node_modules/dom-serializer/node_modules/entities/lib/index.js", serverRoot)).toEqual({
      name: "entities",
      dir: "/repo/docs/node_modules/dom-serializer/node_modules/entities",
    });
  });

  it("attributes a hoisted copy to the top-level directory", () => {
    expect(packageOfSource("/node_modules/entities/dist/esm/index.js", serverRoot)).toEqual({
      name: "entities",
      dir: "/repo/docs/node_modules/entities",
    });
  });

  it("keeps the scope of a scoped package", () => {
    expect(packageOfSource("/node_modules/@babel/runtime/helpers/esm/extends.js", serverRoot)).toEqual({
      name: "@babel/runtime",
      dir: "/repo/docs/node_modules/@babel/runtime",
    });
  });

  it("resolves a path outside the server root through its '..', so a root copy stays distinct", () => {
    expect(
      packageOfSource("/../node_modules/.bun/lucide-static@1.24.0/node_modules/lucide-static/icon-nodes.json", serverRoot),
    ).toEqual({
      name: "lucide-static",
      dir: "/repo/node_modules/.bun/lucide-static@1.24.0/node_modules/lucide-static",
    });
    expect(packageOfSource("/../node_modules/entities/index.js", serverRoot)?.dir).toBe("/repo/node_modules/entities");
  });

  it("ignores first-party files and virtual modules", () => {
    expect(packageOfSource("/../src/index.ts", serverRoot)).toBeNull();
    expect(packageOfSource("/src/app/_layout.tsx", serverRoot)).toBeNull();
    expect(packageOfSource("\0polyfill:external-require", serverRoot)).toBeNull();
    expect(packageOfSource("\0shim:react-native-web/dist/exports/AppRegistry/AppContainer.js", serverRoot)).toBeNull();
    expect(packageOfSource("__prelude__", serverRoot)).toBeNull();
  });
});

const root = mkdtempSync(join(tmpdir(), "noticegen-locate-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

function install(at: string, name: string) {
  mkdirSync(join(root, at), { recursive: true });
  writeFileSync(join(root, at, "package.json"), JSON.stringify({ name, version: "1.0.0" }));
}

describe("repoPath", () => {
  it("writes a directory inside the repository relative to it, with forward slashes", () => {
    expect(repoPath(join(root, "docs", "node_modules", "entities"), root)).toBe("docs/node_modules/entities");
  });

  it("accepts the real path of a repository reached through a symlink", () => {
    const real = join(root, "real-repo");
    mkdirSync(join(real, "docs"), { recursive: true });
    const link = join(root, "linked-repo");
    symlinkSync(real, link, "dir");
    // The build tools report real paths, while the repository may be named through the link.
    expect(repoPath(realpathSync(join(real, "docs")), link)).toBe("docs");
  });

  it("throws for a directory outside the repository", () => {
    expect(() => repoPath(join(root, "..", "elsewhere"), root)).toThrow(/outside the repository/);
    expect(() => repoPath(root, root)).toThrow(/outside the repository/);
  });
});

describe("lookupPackage", () => {
  install("node_modules/lucide-static", "lucide-static");
  install("node_modules/@expo-google-fonts/manrope", "@expo-google-fonts/manrope");
  install("docs/node_modules/@expo-google-fonts/manrope", "@expo-google-fonts/manrope");
  mkdirSync(join(root, "tools", "icongen"), { recursive: true });
  mkdirSync(join(root, "docs", "scripts"), { recursive: true });

  it("walks up from the generator's directory to the first node_modules holding the package", () => {
    expect(lookupPackage("lucide-static", join(root, "tools", "icongen"), root)).toBe(
      join(root, "node_modules", "lucide-static"),
    );
  });

  it("prefers the nearer copy, as Node's resolver does", () => {
    expect(lookupPackage("@expo-google-fonts/manrope", join(root, "docs", "scripts"), root)).toBe(
      join(root, "docs", "node_modules", "@expo-google-fonts", "manrope"),
    );
  });

  it("returns null when no node_modules up to the stop directory holds the package", () => {
    expect(lookupPackage("not-installed", join(root, "docs", "scripts"), root)).toBeNull();
  });
});
