// Focus-ring pixel checks, shared by the scroll-focus spec (Chromium) and the keyboard
// journeys (Chromium, Firefox and WebKit).
import type { Locator, Page } from "@playwright/test";

export const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};
// Whether the ring shows along each side of `frame`, read from the pixels: a computed
// outline proves nothing when a parent clips it or the scrolled content paints over it.
// The page decodes a screenshot of the frame's edges and looks for ring-coloured pixels
// along the middle of every side, within 6 px of the frame's edge on either side.
export async function ringShows(page: Page, frame: Locator, color: string) {
  const box = await frame.boundingBox();
  if (!box) throw new Error("the frame has no box");
  const pad = 6;
  const clip = { x: box.x - pad, y: box.y - pad, width: box.width + pad * 2, height: box.height + pad * 2 };
  const png = (await page.screenshot({ clip })).toString("base64");
  return page.evaluate(async ({ png, pad, color, clip }) => {
    const image = new Image();
    image.src = `data:image/png;base64,${png}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
    const [r, g, b] = (color.match(/\d+/g) ?? []).map(Number) as [number, number, number];
    const near = (x: number, y: number) => {
      const i = (y * width + x) * 4;
      return Math.abs(data[i]! - r) + Math.abs(data[i + 1]! - g) + Math.abs(data[i + 2]! - b) < 60;
    };
    const band = Math.round(pad * 2 * (width / clip.width));
    // Nine in ten points along the middle three fifths of a side hold a ring pixel.
    const side = (horizontal: boolean, far: boolean) => {
      const length = horizontal ? width : height;
      const depthLimit = horizontal ? height : width;
      let points = 0;
      let hits = 0;
      for (let t = Math.round(length * 0.2); t < Math.round(length * 0.8); t++, points++) {
        for (let d = 0; d < band; d++) {
          const depth = far ? depthLimit - 1 - d : d;
          if (horizontal ? near(t, depth) : near(depth, t)) {
            hits++;
            break;
          }
        }
      }
      return hits >= points * 0.9;
    };
    return { top: side(true, false), right: side(false, true), bottom: side(true, true), left: side(false, false) };
  }, { png, pad, color, clip });
}
export const ALL_SIDES = { top: true, right: true, bottom: true, left: true };
