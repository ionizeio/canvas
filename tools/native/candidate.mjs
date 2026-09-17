import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const sha256 = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");

export function packageArtifacts(manifest) {
  const entries = manifest.packages ?? [{ name: manifest.name, version: manifest.version }];
  const files = manifest.packageFiles ?? { [manifest.name]: manifest.packageFile };
  if (!Array.isArray(entries) || !entries.length || new Set(entries.map((p) => p.name)).size !== entries.length) {
    throw new Error("Invalid native candidate packages");
  }
  return entries.map((pkg) => {
    const filename = files[pkg.name];
    const digest = manifest.files?.find((file) => file.name === filename)?.sha256;
    if (!["@ionizeio/canvas", "@ionizeio/canvas-blur"].includes(pkg.name) || !/^\d+\.\d+\.\d+$/.test(pkg.version)
      || typeof filename !== "string" || !/^[a-zA-Z0-9_.-]+\.tgz$/.test(filename)
      || !/^[a-f0-9]{64}$/.test(digest ?? "")) throw new Error("Invalid native candidate packages");
    return { name: pkg.name, version: pkg.version, filename, sha256: digest };
  });
}

export function packageIdentity(manifest) {
  const digest = manifest.files?.find((file) => file.name === manifest.packageFile)?.sha256;
  if (manifest.name !== "@ionizeio/canvas" || !/^\d+\.\d+\.\d+$/.test(manifest.version)
    || !/^[a-f0-9]{40}$/.test(manifest.source) || !/^[a-f0-9]{40}$/.test(manifest.candidate)
    || !/^[a-f0-9]{64}$/.test(digest ?? "")) throw new Error("Invalid native candidate identity");
  const nativePackages = manifest.packages ? packageArtifacts(manifest).filter((pkg) => pkg.name !== manifest.name)
    .map((pkg) => ({ packageName: pkg.name, packageVersion: pkg.version, packageSha256: pkg.sha256 })) : [];
  return {
    schema: 1, inputMode: "package", packageName: manifest.name,
    sourceRevision: manifest.source, candidateRevision: manifest.candidate,
    packageVersion: manifest.version, packageSha256: digest,
    ...(nativePackages.length ? { nativePackages } : {}),
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
