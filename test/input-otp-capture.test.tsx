import { afterEach, describe, expect, it } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState, type ComponentType } from "react";
import { ThemeProvider } from "../src/style/theme.tsx";
import { createInputOTP, type InputOTPProps } from "../src/atoms/input-otp/input-otp.shared.tsx";
import { androidSkin } from "../src/atoms/input-otp/input-otp.styles.ts";
import { InputOTP as WebInputOTP } from "../src/atoms/input-otp/input-otp.tsx";
import { InputOTP as IosInputOTP } from "../src/atoms/input-otp/input-otp.ios.tsx";
import { InputOTP as AndroidInputOTP, androidParts } from "../src/atoms/input-otp/input-otp.android.tsx";

// The Android field reads its API level when the module loads, and the web harness reports
// none, so the two Android builds are made here from the entry's own parts: Android 10 and
// later, and Android 9 and older, where React Native cannot ink the cursor or handles.
const Android10 = createInputOTP(androidSkin, androidParts(35));
const Android9 = createInputOTP(androidSkin, androidParts(28));

// The capture input (the one TextInput stretched over the cells) paints nothing on every
// platform, and how it does is the platform's part (InputOTPParts.opaqueCapture). The web
// keeps it see-through: a browser still hit-tests and exposes an opacity-0 input, and only
// opacity hides the fill and ink it paints over an autofilled one. iOS and Android keep it
// opaque and hide its ink, because both drop a zero-alpha view: UIKit and React Native's
// own hit test skip any view below 0.01 alpha (a tap on a cell never focused the field on
// iOS), and neither VoiceOver nor TalkBack is offered a zero-alpha view.

afterEach(cleanup);

/** A CSS colour's channels, [r, g, b, a]. */
function channels(color: string): number[] {
  const m = color.match(/^rgba?\(([^)]*)\)$/);
  if (!m) throw new Error(`not an rgb colour: ${color}`);
  const [r, g, b, a = "1"] = m[1]!.split(",").map((v) => v.trim());
  return [Number(r), Number(g), Number(b), Number(a)];
}

interface Fiber {
  memoizedProps?: Record<string, unknown>;
  return: Fiber | null;
  child: Fiber | null;
  sibling: Fiber | null;
  stateNode?: unknown;
}

/** The committed fiber of a DOM node. The node keeps the fiber it was created with, which
 *  after an update can be the stale copy, so this finds it again in the root's current tree. */
function committedFiber(dom: Element): Fiber {
  const node = dom as unknown as Record<string, Fiber>;
  let root = node[Object.keys(node).find((key) => key.startsWith("__reactFiber$"))!]!;
  while (root.return) root = root.return;
  const stack = [(root.stateNode as { current: Fiber }).current];
  while (stack.length) {
    const fiber = stack.pop()!;
    if (fiber.stateNode === dom) return fiber;
    if (fiber.sibling) stack.push(fiber.sibling);
    if (fiber.child) stack.push(fiber.child);
  }
  throw new Error("the node is not in the committed tree");
}

/** The props the shell handed its TextInput, read from React's tree: react-native-web
 *  renders no attribute for `selectionColor` (or `selection`), so the DOM cannot show it. */
function textInputProps(input: HTMLInputElement): Record<string, unknown> {
  let fiber: Fiber | null = committedFiber(input);
  while (fiber && !(fiber.memoizedProps && "selectionColor" in fiber.memoizedProps)) fiber = fiber.return;
  if (!fiber) throw new Error("no TextInput above the capture input");
  return fiber.memoizedProps!;
}

function renderField(InputOTP: ComponentType<InputOTPProps>, props: InputOTPProps = {}) {
  render(
    <ThemeProvider solid>
      <InputOTP length={6} testID="otp" {...props} />
    </ThemeProvider>,
  );
  const root = screen.getByTestId("otp");
  return { root, input: root.querySelector("input") as HTMLInputElement };
}

const NATIVE: Array<[string, ComponentType<InputOTPProps>]> = [
  ["iOS", IosInputOTP],
  ["Android", AndroidInputOTP],
];

describe("the capture input", () => {
  it("is see-through on the web", () => {
    const { input } = renderField(WebInputOTP);
    expect(input.style.opacity).toBe("0");
  });

  for (const [name, InputOTP] of NATIVE) {
    it(`${name}: stays opaque, so the platform hit-tests it and exposes it, and hides its ink`, () => {
      const { input } = renderField(InputOTP, { defaultValue: "12" });
      // No view alpha at all, not a value just above a platform's threshold.
      expect(input.style.opacity).toBe("");
      const [r, g, b, a] = channels(input.style.color);
      expect(a).toBe(0);
      // Clear, but not rgba(0, 0, 0, 0): as a packed colour that is the integer 0, which
      // React Native's Android renderer reads as "no colour set" and replaces with black ink.
      expect(r + g + b).toBeGreaterThan(0);
      // The selection (and Android's handles, which take its colour) paints nothing either.
      expect(channels(textInputProps(input).selectionColor as string)).toEqual([r, g, b, a]);
    });

    it(`${name}: is still the field's one labelled input with one-time-code autofill, and takes a whole code in one change`, () => {
      const { root, input } = renderField(InputOTP);
      expect(root.querySelectorAll("input")).toHaveLength(1);
      expect(input.getAttribute("aria-label")).toBe("One-time code");
      expect(input.getAttribute("autocomplete")).toBe("one-time-code");
      fireEvent.change(input, { target: { value: "12-34 56" } });
      expect(input.value).toBe("123456");
      expect(root.textContent).toContain("123456");
    });
  }

  it("never corrects or flags a code on any platform", () => {
    // An opaque capture would paint autocorrect's prompt and marks over the cells, and a
    // correction rewrites an alphanumeric code into a word whichever way it is hidden.
    for (const InputOTP of [WebInputOTP, IosInputOTP, AndroidInputOTP]) {
      const { input } = renderField(InputOTP, { alphanumeric: true });
      expect(input.getAttribute("autocorrect")).toBe("off");
      expect(input.getAttribute("spellcheck")).toBe("false");
      expect(input.getAttribute("autocapitalize")).toBe("none");
      cleanup();
    }
  });

  it("masks the input itself on every platform, whichever way it is hidden", () => {
    for (const InputOTP of [WebInputOTP, IosInputOTP, AndroidInputOTP]) {
      const { input } = renderField(InputOTP, { masked: true, defaultValue: "12" });
      expect(input.type).toBe("password");
      cleanup();
    }
  });

  it("keeps one-time-code autofill on every platform, whichever way its caret is hidden", () => {
    for (const InputOTP of [WebInputOTP, IosInputOTP, AndroidInputOTP]) {
      const { input } = renderField(InputOTP);
      const props = textInputProps(input);
      expect(props.textContentType).toBe("oneTimeCode");
      expect(props.autoComplete).toBe("one-time-code");
      cleanup();
    }
  });
});

// The platform caret paints nothing on every platform, and how is the platform's part
// (InputOTPParts.inklessCaret). From Android 10 the cursor stays on and is inked clear: the
// editor opens the long-press Paste popup only while the cursor is on, and `caretHidden`
// switches it off (EditText.setCursorVisible(false) disables the editor's insertion
// controller). iOS, the web and older Android switch it off, as before: iOS opens its edit
// menu at a hidden caret.
describe("the capture input's caret", () => {
  it("Android 10 and later: stays on for the editor, with a cursor and handles that paint nothing", () => {
    const { input } = renderField(Android10, { defaultValue: "12" });
    const props = textInputProps(input);
    expect(props.caretHidden).toBe(false);
    for (const color of [props.cursorColor, props.selectionHandleColor] as string[]) {
      const [r, g, b, a] = channels(color);
      expect(a).toBe(0);
      // Not the integer 0 that Android reads as "no colour" and replaces with the theme's.
      expect(r + g + b).toBeGreaterThan(0);
    }
  });

  for (const [name, InputOTP] of [["the web", WebInputOTP], ["iOS", IosInputOTP], ["Android 9", Android9]] as const) {
    it(`${name}: is switched off`, () => {
      const { input } = renderField(InputOTP, { defaultValue: "12" });
      expect(textInputProps(input).caretHidden).toBe(true);
    });
  }
});

/** Select a range in the capture input the way the platform reports one. */
function selectRange(input: HTMLInputElement, start: number, end: number) {
  act(() => {
    input.setSelectionRange(start, end);
    fireEvent.select(input);
  });
}

/** The selection the shell hands its TextInput: React Native re-applies it over whatever
 *  selection the platform reports that differs, so this is what the field keeps. */
function handedSelection(input: HTMLInputElement) {
  return textInputProps(input).selection as { start: number; end: number };
}

// A range the platform selects (select-all, the word a long press or a double tap picks, a
// dragged handle) is mirrored back as the controlled selection, so React Native never
// re-applies anything over it. On Android re-applying it rewrites the text, which the editor
// takes as an edit that stops the selection toolbar: a long press on the digits offered no
// Paste, and a range widened to the whole code lost its toolbar the same way. iOS paints its
// selection band and grabbers whatever their colour (InputOTPParts.visibleSelection), so
// there a range goes back to the end of the code like a stray caret.
describe("a selection", () => {
  for (const [name, InputOTP] of [["the web", WebInputOTP], ["Android 10", Android10]] as const) {
    it(`${name}: is kept exactly where the platform put it`, () => {
      const { input } = renderField(InputOTP, { defaultValue: "123" });
      selectRange(input, 0, 3);
      expect(handedSelection(input)).toEqual({ start: 0, end: 3 });
      expect([input.selectionStart, input.selectionEnd]).toEqual([0, 3]);
      // Part of the code (one word of it): kept as it is, not widened.
      selectRange(input, 1, 3);
      expect(handedSelection(input)).toEqual({ start: 1, end: 3 });
      expect([input.selectionStart, input.selectionEnd]).toEqual([1, 3]);
    });

    it(`${name}: lets go once the code changes, and pins the caret to the new end`, () => {
      const { input } = renderField(InputOTP, { defaultValue: "123" });
      selectRange(input, 0, 3);
      // A paste over the selected code replaces it.
      fireEvent.change(input, { target: { value: "482913" } });
      expect(input.value).toBe("482913");
      expect(handedSelection(input)).toEqual({ start: 6, end: 6 });
    });

    it(`${name}: lets go when the caret collapses, and still pins a stray caret to the end`, () => {
      const { input } = renderField(InputOTP, { defaultValue: "123" });
      selectRange(input, 0, 3);
      selectRange(input, 1, 1);
      expect(handedSelection(input)).toEqual({ start: 3, end: 3 });
      expect([input.selectionStart, input.selectionEnd]).toEqual([3, 3]);
    });
  }

  for (const [name, InputOTP] of [["iOS", IosInputOTP], ["Android 9", Android9]] as const) {
    it(`${name}: goes back to the end of the code, where its band or handles would not show`, () => {
      const { input } = renderField(InputOTP, { defaultValue: "123" });
      selectRange(input, 0, 3);
      expect(handedSelection(input)).toEqual({ start: 3, end: 3 });
      expect([input.selectionStart, input.selectionEnd]).toEqual([3, 3]);
    });
  }

  it("never comes back when the parent clears the code and fills the same one again", () => {
    let setCode: (code: string) => void = () => {};
    function Controlled() {
      const [code, set] = useState("123");
      setCode = set;
      return <Android10 length={6} testID="otp" value={code} onChangeText={set} />;
    }
    render(
      <ThemeProvider solid>
        <Controlled />
      </ThemeProvider>,
    );
    const input = screen.getByTestId("otp").querySelector("input") as HTMLInputElement;
    selectRange(input, 1, 3);
    expect(handedSelection(input)).toEqual({ start: 1, end: 3 });
    act(() => setCode(""));
    act(() => setCode("123"));
    expect(handedSelection(input)).toEqual({ start: 3, end: 3 });
  });
});

// Where a press lands in the capture input is where the platform puts its caret, its Paste
// popup and its edit menu. The invisible code sits at the start of the row on every platform,
// so a press anywhere past it lands at the end of the code on its own and the pin has nothing
// to correct: centred, a press left of the code landed before it, and on Android the pin's
// correction (a rewrite of the text) closed the Paste popup, or never came, so a paste on a
// field never focused went in before the code.
describe("the capture input's text", () => {
  it("sits at the start of the row on every platform", () => {
    for (const InputOTP of [WebInputOTP, IosInputOTP, AndroidInputOTP]) {
      const { input } = renderField(InputOTP, { defaultValue: "12" });
      expect(input.style.textAlign).toBe("left");
      cleanup();
    }
  });
});

describe("the Android parts", () => {
  it("ink the cursor and keep a range from Android 10, where React Native can recolour them", () => {
    for (const level of [29, 35, 37]) {
      expect(androidParts(level)).toEqual({ opaqueCapture: true, inklessCaret: true, visibleSelection: false });
    }
  });

  it("keep the caret off and let no range stand before it", () => {
    for (const level of [24, 27, 28]) {
      expect(androidParts(level)).toEqual({ opaqueCapture: true, inklessCaret: false, visibleSelection: true });
    }
  });
});
