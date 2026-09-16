import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const sha256 = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");

export function packageIdentity(manifest) {
  const digest = manifest.files?.find((file) => file.name === manifest.packageFile)?.sha256;
  if (manifest.name !== "@ionizeio/canvas" || !/^\d+\.\d+\.\d+$/.test(manifest.version)
    || !/^[a-f0-9]{40}$/.test(manifest.source) || !/^[a-f0-9]{40}$/.test(manifest.candidate)
    || !/^[a-f0-9]{64}$/.test(digest ?? "")) throw new Error("Invalid native candidate identity");
  return {
    schema: 1, inputMode: "package", packageName: manifest.name,
    sourceRevision: manifest.source, candidateRevision: manifest.candidate,
    packageVersion: manifest.version, packageSha256: digest,
  };
}

export function fileInventory(root, excluded = new Set()) {
  const result = {};
  function visit(directory, prefix = "") {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (!prefix && excluded.has(entry.name)) continue;
      const name = prefix + entry.name;
      const file = join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Linked input is not an independent consumer: ${name}`);
      if (entry.isDirectory()) visit(file, name + "/");
      else if (entry.isFile()) result[name] = sha256(file);
      else throw new Error(`Unsupported consumer input: ${name}`);
    }
  }
  visit(root);
  return result;
}

export function assertInstalledPackage(unpacked, installed) {
  if (lstatSync(installed).isSymbolicLink() || existsSync(join(installed, ".origin"))) {
    throw new Error("A local source overlay cannot qualify as a packed native consumer");
  }
  const expected = fileInventory(unpacked);
  const actual = fileInventory(installed, new Set(["node_modules"]));
  if (JSON.stringify(expected) !== JSON.stringify(actual)) throw new Error("Installed package bytes differ from the sealed tarball");
}

export const appInventory = (app) => fileInventory(app, new Set(["node_modules", ".expo", "ios", "android", "dist", "expo-env.d.ts"]));
