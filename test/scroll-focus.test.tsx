import { afterEach, expect, it, spyOn } from "bun:test";
import { useEffect } from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { AccessibilityInfo, Platform, type LayoutChangeEvent } from "react-native";
import { useHorizontalScrollFocus, useScrollFocus } from "../src/style/use-scroll-focus.ts";

afterEach(cleanup);
const layout = (width: number) => ({ nativeEvent: { layout: { x: 0, y: 0, width, height: 80 } } }) as LayoutChangeEvent;

it("uses vertical overflow for capped menu content", () => {
  const { result } = renderHook(() => useScrollFocus("vertical"));
  act(() => result.current.onLayout(layout(320)));
  act(() => result.current.onContentSizeChange(600, 80));
  expect(result.current.tabIndex).toBe(-1);
  act(() => result.current.onContentSizeChange(320, 300));
  expect(result.current.tabIndex).toBe(0);
  act(() => result.current.onContentSizeChange(320, 40));
  expect(result.current.tabIndex).toBe(-1);
});

it("waits for both native measurements before exposing overflowing content to the keyboard", () => {
  const { result } = renderHook(useHorizontalScrollFocus);
  expect(result.current.focusable).toBe(false);
  expect(result.current.tabIndex).toBe(-1);
  act(() => result.current.onContentSizeChange(900, 80));
  expect(result.current.tabIndex).toBe(-1);
  act(() => result.current.onLayout(layout(320)));
  expect(result.current.focusable).toBe(true);
  expect(result.current.tabIndex).toBe(0);
});

it("updates keyboard access when the container grows and shrinks without remounting", () => {
  const { result } = renderHook(useHorizontalScrollFocus);
  act(() => result.current.onLayout(layout(500)));
  act(() => result.current.onContentSizeChange(450, 80));
  expect(result.current.tabIndex).toBe(-1);
  act(() => result.current.onLayout(layout(300)));
  expect(result.current.focusable).toBe(true);
  act(() => result.current.onLayout(layout(450)));
  expect(result.current.focusable).toBe(false);
  expect(result.current.tabIndex).toBe(-1);
});

it("tracks changed snippet or table content independently of viewport layout", () => {
  const { result } = renderHook(useHorizontalScrollFocus);
  act(() => result.current.onLayout(layout(320)));
  act(() => result.current.onContentSizeChange(800, 80));
  expect(result.current.tabIndex).toBe(0);
  act(() => result.current.onContentSizeChange(320, 240));
  expect(result.current.tabIndex).toBe(-1);
  act(() => result.current.onContentSizeChange(600, 80));
  expect(result.current.tabIndex).toBe(0);
  act(() => result.current.onLayout(layout(0)));
  expect(result.current.focusable).toBe(false);
});

// Tabs keeps its scroll geometry out of render on purpose; the hook it shares with the
// other scrollports re-renders only when the content starts or stops overflowing.
// Commits are counted, not calls: React may call a component once before bailing out
// of an update that set the same state, and that call never commits.
it("re-renders only when the overflow flips, not on every resize", () => {
  let renders = 0;
  const { result } = renderHook(() => {
    useEffect(() => {
      renders += 1;
    });
    return useHorizontalScrollFocus();
  });
  const handlers = [result.current.onLayout, result.current.onContentSizeChange] as const;
  act(() => result.current.onLayout(layout(500)));
  act(() => result.current.onContentSizeChange(450, 80));
  act(() => result.current.onLayout(layout(480)));
  act(() => result.current.onContentSizeChange(460, 80));
  expect(renders).toBe(1);
  act(() => result.current.onLayout(layout(300)));
  expect(result.current.focusable).toBe(true);
  expect(renders).toBe(2);
  act(() => result.current.onLayout(layout(310)));
  act(() => result.current.onContentSizeChange(700, 80));
  expect(renders).toBe(2);
  expect(result.current.onLayout).toBe(handlers[0]);
  expect(result.current.onContentSizeChange).toBe(handlers[1]);
});

// Android's HorizontalScrollView claims any sideways drag past touch slop even when it
// cannot scroll; every other platform keeps a fitting scroller enabled (on the web a
// disabled one sets touch-action: none). On Android a disabled scroller also drops the
// hover events TalkBack's touch exploration is made of, so it stays enabled while
// touch exploration is on or not yet read. `exploring` is what the platform reports
// ("pending" never settles the read); `setExploring` fires a live change.
async function onPlatform(
  os: string,
  run: (setExploring: (value: boolean) => void) => void | Promise<void>,
  exploring: boolean | "pending" = false,
) {
  const original = Object.getOwnPropertyDescriptor(Platform, "OS")!;
  Object.defineProperty(Platform, "OS", { configurable: true, value: os });
  const handlers: Array<(value: boolean) => void> = [];
  const read = spyOn(AccessibilityInfo, "isScreenReaderEnabled").mockImplementation(
    () => (exploring === "pending" ? new Promise<boolean>(() => {}) : Promise.resolve(exploring)),
  );
  const add = spyOn(AccessibilityInfo, "addEventListener").mockImplementation(((event: string, handler: (value: boolean) => void) => {
    if (event === "screenReaderChanged") handlers.push(handler);
    return { remove: () => {} };
  }) as typeof AccessibilityInfo.addEventListener);
  try {
    await run((value) => act(() => handlers.forEach((handler) => handler(value))));
    if (os !== "android") {
      // Only Android reads touch exploration; nothing else subscribes to it.
      expect(read).not.toHaveBeenCalled();
      expect(add.mock.calls.some(([event]) => event === "screenReaderChanged")).toBe(false);
    }
  } finally {
    cleanup();
    read.mockRestore();
    add.mockRestore();
    Object.defineProperty(Platform, "OS", original);
  }
}
// Let the touch exploration read settle.
const settle = () => act(async () => {});

it("lets an Android scroller take a drag only while its content overflows", () => onPlatform("android", async () => {
  const { result } = renderHook(useHorizontalScrollFocus);
  await settle();
  expect(result.current.scrollEnabled).toBe(false);
  act(() => result.current.onLayout(layout(320)));
  act(() => result.current.onContentSizeChange(320, 80));
  expect(result.current.scrollEnabled).toBe(false);
  act(() => result.current.onContentSizeChange(800, 80));
  expect(result.current.scrollEnabled).toBe(true);
  act(() => result.current.onLayout(layout(800)));
  expect(result.current.scrollEnabled).toBe(false);
}));

it("keeps a fitting Android scroller taking drags while TalkBack explores by touch", () => onPlatform("android", async (setExploring) => {
  const { result } = renderHook(useHorizontalScrollFocus);
  await settle();
  act(() => result.current.onLayout(layout(320)));
  act(() => result.current.onContentSizeChange(320, 80));
  expect(result.current.scrollEnabled).toBe(true);
  setExploring(false);
  expect(result.current.scrollEnabled).toBe(false);
  setExploring(true);
  expect(result.current.scrollEnabled).toBe(true);
}, true));

it("counts touch exploration as on until Android has reported it", () => onPlatform("android", async () => {
  const { result } = renderHook(useHorizontalScrollFocus);
  await settle();
  act(() => result.current.onLayout(layout(320)));
  act(() => result.current.onContentSizeChange(320, 80));
  expect(result.current.scrollEnabled).toBe(true);
}, "pending"));

for (const os of ["web", "ios"]) {
  it(`keeps a fitting scroller enabled on ${os}`, () => onPlatform(os, async () => {
    const { result } = renderHook(useHorizontalScrollFocus);
    await settle();
    expect(result.current.scrollEnabled).toBe(true);
    act(() => result.current.onLayout(layout(320)));
    act(() => result.current.onContentSizeChange(320, 80));
    expect(result.current.scrollEnabled).toBe(true);
    act(() => result.current.onContentSizeChange(800, 80));
    expect(result.current.scrollEnabled).toBe(true);
  }));
}
