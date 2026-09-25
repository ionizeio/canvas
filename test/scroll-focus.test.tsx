import { afterEach, expect, it } from "bun:test";
import { act, cleanup, renderHook } from "@testing-library/react";
import { Platform, type LayoutChangeEvent } from "react-native";
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

// Android's HorizontalScrollView claims any sideways drag past touch slop even when it
// cannot scroll; every other platform keeps a fitting scroller enabled (on the web a
// disabled one sets touch-action: none).
function onPlatform(os: string, run: () => void) {
  const original = Object.getOwnPropertyDescriptor(Platform, "OS")!;
  Object.defineProperty(Platform, "OS", { configurable: true, value: os });
  try {
    run();
  } finally {
    cleanup();
    Object.defineProperty(Platform, "OS", original);
  }
}

it("lets an Android scroller take a drag only while its content overflows", () => onPlatform("android", () => {
  const { result } = renderHook(useHorizontalScrollFocus);
  expect(result.current.scrollEnabled).toBe(false);
  act(() => result.current.onLayout(layout(320)));
  act(() => result.current.onContentSizeChange(320, 80));
  expect(result.current.scrollEnabled).toBe(false);
  act(() => result.current.onContentSizeChange(800, 80));
  expect(result.current.scrollEnabled).toBe(true);
  act(() => result.current.onLayout(layout(800)));
  expect(result.current.scrollEnabled).toBe(false);
}));

for (const os of ["web", "ios"]) {
  it(`keeps a fitting scroller enabled on ${os}`, () => onPlatform(os, () => {
    const { result } = renderHook(useHorizontalScrollFocus);
    expect(result.current.scrollEnabled).toBe(true);
    act(() => result.current.onLayout(layout(320)));
    act(() => result.current.onContentSizeChange(320, 80));
    expect(result.current.scrollEnabled).toBe(true);
    act(() => result.current.onContentSizeChange(800, 80));
    expect(result.current.scrollEnabled).toBe(true);
  }));
}
