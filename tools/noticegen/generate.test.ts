import { afterAll, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { collectShipped, readShipped, renderNotices, type Shipped } from "./generate.ts";

// The generator reads each shipped package from the directory the scan recorded, never by
// bare name. The fixture is the layout that broke the notices: a docs devDependency
// hoisted entities@7 to docs/node_modules/entities, and dom-serializer's own entities@4
// moved under docs/node_modules/dom-serializer/node_modules. A by-name lookup returns the
// hoisted copy whichever one shipped.

const root = mkdtempSync(join(tmpdir(), "noticegen-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const bsd2 = (holder: string) =>
  [
    `Copyright (c) 2017 ${holder}`,
    "All rights reserved.",
    "",
    "Redistribution and use in source and binary forms, with or without modification, are",
    "permitted provided that the following conditions are met:",
  ].join("\n");

const mit = (holder: string) =>
  [
    "MIT License",
    "",
    `Copyright (c) 2022 ${holder}`,
    "",
    "Permission is hereby granted, free of charge, to any person obtaining a copy of this software.",
  ].join("\n");

function install(at: string, name: string, version: string, license: string, text: string) {
  const dir = join(root, at);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name, version, license }));
  writeFileSync(join(dir, "LICENSE"), text);
}

const HOISTED = "docs/node_modules/entities";
const NESTED = "docs/node_modules/dom-serializer/node_modules/entities";
install("docs/node_modules/dom-serializer", "dom-serializer", "2.0.0", "MIT", mit("Felix Boehm"));
install(HOISTED, "entities", "7.0.1", "BSD-2-Clause", bsd2("Felix Boehm"));
install(NESTED, "entities", "4.5.0", "BSD-2-Clause", bsd2("Felix Boehm"));
install("node_modules/entities", "entities", "4.5.0", "BSD-2-Clause", bsd2("Felix Boehm"));

const notices = (packages: Shipped["packages"]) => renderNotices(collectShipped(root, { packages }));
const versionsOf = (packages: Shipped["packages"], name: string) =>
  notices(packages).packages.filter((p) => p.name === name).map((p) => p.version);

describe("reading each package from its recorded directory", () => {
  it("reports the nested copy the bundle shipped, not the hoisted one beside it", () => {
    const out = notices({
      "dom-serializer": ["docs/node_modules/dom-serializer"],
      entities: [NESTED],
    });
    expect(out.packages.find((p) => p.name === "entities")?.version).toBe("4.5.0");
    expect(out.rendered).toContain('"version": "4.5.0"');
    expect(out.rendered).not.toContain('"version": "7.0.1"');
  });

  it("reports the hoisted copy when that is the one recorded", () => {
    expect(versionsOf({ entities: [HOISTED] }, "entities")).toEqual(["7.0.1"]);
  });

  it("lists each distinct version when two copies ship", () => {
    const out = notices({ entities: [HOISTED, NESTED] });
    expect(out.packages.map((p) => `${p.name}@${p.version}`)).toEqual(["entities@4.5.0", "entities@7.0.1"]);
    // Both rows carry the one shared BSD text, and the table count matches its rows.
    expect(out.texts).toHaveLength(1);
    expect(out.texts[0].packages).toEqual(["entities"]);
    expect(out.texts[0].count).toBe(2);
    expect(out.rendered).toContain("export const THIRD_PARTY_PACKAGE_COUNT = 2;");
  });

  it("lists one entry for two copies of the same version", () => {
    const out = notices({ entities: [NESTED, "node_modules/entities"] });
    expect(out.packages.map((p) => p.version)).toEqual(["4.5.0"]);
    expect(out.texts[0].count).toBe(1);
  });

  it("skips the first-party packages without reading them", () => {
    expect(notices({ "@ionizeio/canvas": ["docs/node_modules/@ionizeio/canvas"] }).packages).toEqual([]);
  });
});

describe("a stale install or scan fails loudly", () => {
  it("throws when a recorded directory is missing, rather than falling back to another copy", () => {
    // The hoisted docs/node_modules/entities exists; a by-name fallback would find it.
    const gone = "docs/node_modules/css-select/node_modules/entities";
    expect(() => notices({ entities: [gone] })).toThrow(/not installed as recorded/);
    expect(() => notices({ entities: [gone] })).toThrow(`entities (${gone})`);
  });

  it("throws when any one of several recorded directories is missing", () => {
    expect(() => notices({ entities: [NESTED, "docs/node_modules/gone/node_modules/entities"] })).toThrow(
      /Missing: entities \(docs\/node_modules\/gone\/node_modules\/entities\)/,
    );
  });

  it("throws when a recorded directory now holds a different package", () => {
    expect(() => notices({ entities: ["docs/node_modules/dom-serializer"] })).toThrow(
      /docs\/node_modules\/dom-serializer holds dom-serializer, not entities/,
    );
  });
});

describe("shipped.json", () => {
  it("refuses the older names-only format", () => {
    const file = join(root, "names-only.json");
    writeFileSync(file, JSON.stringify({ packages: ["entities"] }));
    expect(() => readShipped(file)).toThrow(/notices:scan/);
  });

  it("refuses a missing file", () => {
    expect(() => readShipped(join(root, "absent.json"))).toThrow(/notices:scan/);
  });

  it("is committed in the per-directory format, every directory repo-relative", () => {
    const shipped = readShipped(join(import.meta.dir, "shipped.json"));
    const names = Object.keys(shipped.packages);
    expect(names.length).toBeGreaterThan(0);
    expect(names).toEqual([...names].sort());
    for (const [name, dirs] of Object.entries(shipped.packages)) {
      for (const dir of dirs) {
        expect(dir, name).not.toMatch(/^\/|^\.\.?\/|\\/);
        expect(dir, name).not.toMatch(/(^|\/)\.\.(\/|$)/);
      }
    }
  });
});
