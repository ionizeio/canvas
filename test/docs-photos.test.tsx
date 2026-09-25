import { afterEach, describe, expect, it } from "bun:test";
import { plugin } from "bun";
import { cleanup, render } from "@testing-library/react";
import { createElement, useEffect, type ComponentType } from "react";

// docs/src/core/photos.ts requires the sample photos and clip for Metro to bundle; under
// Bun each loads as the asset object Metro hands the web, carrying its own path as the
// URL. Registered before the module is imported, so the import below is dynamic.
plugin({
  name: "docs-sample-media",
  setup(build) {
    build.onLoad({ filter: /\/docs\/public\/[^/]+\.(jpe?g|png|mp4)$/ }, (args) => ({ exports: { uri: args.path }, loader: "object" }));
  },
});
const { applyResolvedPhotos } = await import("../docs/src/core/photos.ts");

afterEach(cleanup);

// A fresh example scope, the way the Playground builds one on every render.
function scopeOf(components: Record<string, unknown>): Record<string, ComponentType<Record<string, unknown>>> {
  const scope = { ...components };
  applyResolvedPhotos(scope);
  return scope as Record<string, ComponentType<Record<string, unknown>>>;
}

describe("the docs' sample photo wrapper", () => {
  it("wraps each component once, so a rebuilt scope keeps its component types", () => {
    const Video = () => null;
    const Avatar = () => null;
    const first = scopeOf({ Video, Avatar });
    const second = scopeOf({ Video, Avatar });
    expect(first.Video).not.toBe(Video);
    expect(second.Video).toBe(first.Video);
    expect(second.Avatar).toBe(first.Avatar);
    expect(first.Avatar).not.toBe(first.Video);
  });

  it("keeps a photo-bearing example mounted when the stage re-renders with a rebuilt scope", () => {
    // A remount restarted a playing Video, and took a full-screen <video> out of the
    // document, so the browser left full screen.
    let mounts = 0;
    const sources: { uri: string }[] = [];
    function Video(props: { source: { uri: string } }) {
      sources.push(props.source);
      useEffect(() => {
        mounts += 1;
      }, []);
      return null;
    }
    const view = render(createElement(scopeOf({ Video }).Video, { source: { uri: "/video-sample.mp4" } }));
    view.rerender(createElement(scopeOf({ Video }).Video, { source: { uri: "/video-sample.mp4" } }));
    expect(mounts).toBe(1);
    expect(sources).toHaveLength(2);
    // The sample path still resolves to the bundled clip on every render.
    for (const source of sources) expect(source.uri).toEndWith("/docs/public/video-sample.mp4");
  });
});
