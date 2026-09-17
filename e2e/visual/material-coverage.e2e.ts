import { strict as assert } from "node:assert";
import { test } from "@playwright/test";
import navConfig from "../../docs/src/data/nav.config.json";
import { MATERIAL_ROUTES, nativeMaterialRoutes, nativeMaterialTarget } from "../support/material-routes.ts";

test("material captures cover every component reference without duplicate names", () => {
  const expected = new Set(navConfig.web.sidebar.flatMap((group) =>
    group.base === "/components" ? (group.components ?? []).map(({ slug }) => `/components/${slug}`) : [],
  ));
  assert.deepEqual(new Set(MATERIAL_ROUTES.map(({ path }) => path)), expected);
  assert.equal(new Set(MATERIAL_ROUTES.map(({ slug }) => slug)).size, MATERIAL_ROUTES.length);
});

for (const surface of ["solid", "glass"] as const) {
  test(`every native ${surface} deep link carries its material choice`, () => {
    const routes = nativeMaterialRoutes(surface);
    assert.equal(routes.length, MATERIAL_ROUTES.length);
    for (const route of routes) {
      // This models the native driver's input: only route.path survives, not
      // a browser target's query object. Changing that contract must fail here.
      const link = new URL(`canvas:///${route.path.replace(/^\//, "")}`);
      assert.equal(link.searchParams.get("surface"), surface);
      assert.equal(link.pathname, `/components/${route.slug}`);
    }
  });
}

test("native mode selection rejects unsupported values instead of capturing the wrong mode", () => {
  assert.equal(nativeMaterialTarget("glass"), "native-glass");
  assert.equal(nativeMaterialTarget("solid"), "native-solid");
  assert.throws(() => nativeMaterialTarget("frost"), /must be glass or solid/);
});
