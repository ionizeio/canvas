import { afterEach, describe, expect, it } from "bun:test";
import { act, cleanup, createEvent, fireEvent, render, screen } from "@testing-library/react";
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

  // A pasted or autofilled code arrives as one change, and the platform cuts it at the
  // input's maxLength BEFORE the shell sees it (a browser and both native text inputs
  // enforce the attribute on inserted text). The helper delivers it that way. A capture
  // input capped at the cell count cut "65-43 21" to "65-43 " and kept 6543.
  function paste(input: HTMLInputElement, text: string) {
    const max = input.hasAttribute("maxlength") ? Number(input.getAttribute("maxlength")) : Infinity;
    fireEvent.change(input, { target: { value: text.slice(0, max) } });
  }

  for (const [name, InputOTP] of [["web", WebInputOTP], ...NATIVE] as const) {
    it(`${name}: keeps every digit of a formatted paste`, () => {
      for (const [pasted, code] of [["123-456", "123456"], ["123 456", "123456"], ["65-43 21", "654321"], ["(555) 012-3456", "555012"]] as const) {
        const { root, input } = renderField(InputOTP);
        paste(input, pasted);
        expect(input.value, pasted).toBe(code);
        expect(root.textContent, pasted).toContain(code);
        cleanup();
      }
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

// Every edit reaches the field as the capture input's new text, after the platform applied it:
// a keystroke, a delete, Paste, one-time-code autofill and a keyboard's clipboard suggestion
// alike. The platform puts inserted text at the caret, which the field pins to the end of the
// code, so a code pasted into a field that already held part of one used to be appended and
// cut ("12" and "482913" made 124829), and a paste on a full code changed nothing. An insertion
// that carries a whole code now IS the code; anything shorter lands where typing would.
//
// Where an insertion went is read from the selection the field handed the input, or, where the
// edit did not happen there, from the caret iOS and Android report with the change (the web
// reports none): the text alone reads "4" and "482913" pasted before it the same as "4" and
// "829134" pasted after it.
describe("how an edit lands", () => {
  type Platform = "web" | "iOS" | "Android";
  // AndroidInputOTP reads Platform.Version, which the harness leaves unset, so it builds the
  // Android 9 configuration; Android 10 and later (the range held) is its own row.
  const ENTRIES: Array<[string, ComponentType<InputOTPProps>, Platform]> = [
    ["web", WebInputOTP, "web"],
    ["iOS", IosInputOTP, "iOS"],
    ["Android 9", AndroidInputOTP, "Android"],
    ["Android 10", Android10, "Android"],
  ];

  /** The change the platform reports after inserting `text` at `at` (the end of the code,
   *  where the caret is pinned, unless given), or over the range `at`..`to`: the new text and,
   *  on iOS and Android, the caret after the insertion. */
  function insert(platform: Platform, input: HTMLInputElement, text: string, at = input.value.length, to = at) {
    report(platform, input, input.value.slice(0, at) + text + input.value.slice(to), at + text.length);
  }

  /** A change the platform reports: its whole new text and, on iOS and Android, its caret. */
  function report(platform: Platform, input: HTMLInputElement, value: string, caret: number) {
    const change = createEvent.change(input, { target: { value } });
    if (platform !== "web") Object.defineProperty(change, "selection", { value: { start: caret, end: caret } });
    fireEvent(input, change);
  }

  function landing(InputOTP: ComponentType<InputOTPProps>, props: InputOTPProps = {}) {
    const changes: string[] = [];
    const completes: string[] = [];
    const field = renderField(InputOTP, {
      onChangeText: (code) => changes.push(code),
      onComplete: (code) => completes.push(code),
      ...props,
    });
    return { ...field, changes, completes };
  }

  for (const [name, InputOTP, platform] of ENTRIES) {
    it(`${name}: a whole code pasted into a partly entered code replaces it`, () => {
      const { root, input, changes, completes } = landing(InputOTP, { defaultValue: "12" });
      insert(platform, input, "482913");
      expect(input.value).toBe("482913");
      expect(root.textContent).toContain("482913");
      expect(changes).toEqual(["482913"]);
      expect(completes).toEqual(["482913"]);
    });

    it(`${name}: a whole code pasted over a full code replaces it`, () => {
      const { input, changes, completes } = landing(InputOTP, { defaultValue: "123456" });
      insert(platform, input, "482913");
      expect(input.value).toBe("482913");
      expect(changes).toEqual(["482913"]);
      // The seed completed the field first; the new code completes it again.
      expect(completes).toEqual(["123456", "482913"]);
    });

    it(`${name}: a whole code keeps every character through its separators, or out of a message`, () => {
      for (const [seed, pasted, code] of [
        ["12", "482 913", "482913"],
        ["123456", "482-913", "482913"],
        ["", "65-43 21", "654321"],
        ["1", "Your code is 482913. It expires in 10 minutes.", "482913"],
      ] as const) {
        const { input } = landing(InputOTP, { defaultValue: seed });
        insert(platform, input, pasted);
        expect(input.value, pasted).toBe(code);
        cleanup();
      }
    });

    it(`${name}: a pasted code that begins with the code's own characters is read at the caret`, () => {
      // At the pinned caret the new text starts with the whole old code, so the insertion is
      // what follows it, not a shorter tail that happens to differ.
      for (const [seed, pasted, code] of [["12", "123456", "123456"], ["4", "482913", "482913"], ["123456", "123456", "123456"]] as const) {
        const { input, changes } = landing(InputOTP, { defaultValue: seed });
        insert(platform, input, pasted);
        expect(input.value, `${seed} + ${pasted}`).toBe(code);
        expect(changes, `${seed} + ${pasted}`).toEqual([code]);
        cleanup();
      }
    });

    it(`${name}: part of a code lands where typing would and is cut at the last cell`, () => {
      const { input, changes } = landing(InputOTP, { defaultValue: "12" });
      insert(platform, input, "34");
      expect(input.value).toBe("1234");
      insert(platform, input, "5678");
      expect(input.value).toBe("123456");
      insert(platform, input, "78");
      expect(input.value).toBe("123456");
      // onChangeText reports every edit, one that changes nothing included (as it always has).
      expect(changes).toEqual(["1234", "123456", "123456"]);
      cleanup();
      // Gboard offers "482 913" on the clipboard as two suggestions, tapped in turn.
      const chips = landing(InputOTP);
      insert(platform, chips.input, "482");
      insert(platform, chips.input, "913");
      expect(chips.input.value).toBe("482913");
    });

    it(`${name}: typing, deleting and a refused character are unchanged`, () => {
      const { input, changes } = landing(InputOTP);
      for (const key of ["4", "8", "a", "-", " ", "2"]) insert(platform, input, key);
      expect(input.value).toBe("482");
      insert(platform, input, "", 2, 3);
      expect(input.value).toBe("48");
      expect(changes).toEqual(["4", "48", "48", "48", "48", "482", "48"]);
    });

    it(`${name}: an alphanumeric code keeps only ASCII letters and digits`, () => {
      const { input } = landing(InputOTP, { alphanumeric: true });
      insert(platform, input, "AB-12 CD");
      expect(input.value).toBe("AB12CD");
      cleanup();
      const typed = landing(InputOTP, { alphanumeric: true, defaultValue: "Gab" });
      for (const key of [" ", "-", "c", "_", "d"]) insert(platform, typed.input, key);
      expect(typed.input.value).toBe("Gabcd");
      insert(platform, typed.input, "x9-Q7 ZK");
      expect(typed.input.value).toBe("x9Q7ZK");
    });
  }

  // The web reports no caret with a change, and a press on the same spot of the code twice can
  // leave its caret there: part of a code pasted from the context menu still lands at the end.
  it("the web: part of a code pasted at a caret left in the code lands at the end", () => {
    const { input } = landing(WebInputOTP, { defaultValue: "1234" });
    insert("web", input, "56", 1);
    expect(input.value).toBe("123456");
  });

  // A fill sets the whole text: Android's autofill calls setText, whose change reports the caret
  // at 0, and a browser's password manager swaps the value. The new text is the code, even when
  // it happens to share its first or last characters with the code it replaced.
  for (const [name, InputOTP, platform] of [["iOS", IosInputOTP, "iOS"], ["Android", AndroidInputOTP, "Android"], ["the web", WebInputOTP, "web"]] as const) {
    it(`${name}: a fill that replaces the whole text is the code`, () => {
      for (const [seed, filled] of [["123456", "999996"], ["12", "829132"], ...(platform === "web" ? [] : ([["4", "829134"]] as const))] as const) {
        const { input, completes } = landing(InputOTP, { defaultValue: seed });
        report(platform, input, filled, 0);
        expect(input.value, `${seed} filled with ${filled}`).toBe(filled);
        expect(completes.at(-1)).toBe(filled);
        cleanup();
      }
    });
  }

  // iOS clears a secure field for the first keystroke after it regains focus, so that change is
  // the typed character alone. Read against the platform's text before the blur (a paste that
  // had not been cleaned yet), it looked like a delete of all of it.
  it("iOS: a masked field retyped after it regains focus keeps the keystroke", () => {
    const { input } = landing(IosInputOTP, { masked: true, defaultValue: "12" });
    act(() => input.focus());
    report("iOS", input, "12482913", 8);
    expect(input.value).toBe("482913");
    act(() => input.blur());
    act(() => input.focus());
    report("iOS", input, "1", 1);
    expect(input.value).toBe("1");
  });

  // In a one-cell field every character is a whole code, so a keystroke replaces the character.
  it("a one-cell field takes each keystroke as the code", () => {
    const { input, completes } = landing(IosInputOTP, { length: 1, defaultValue: "4" });
    insert("iOS", input, "7");
    expect(input.value).toBe("7");
    expect(completes).toEqual(["4", "7"]);
  });

  // A range the field holds (the web and Android 10 keep the one the platform selects) is where
  // the edit went: a whole code pasted over part of the code replaces the whole code, even when
  // the pasted code ends with the characters that followed the range (the text alone reads
  // "1482913456" as "48291" put in place of "2").
  for (const [name, InputOTP, platform] of [["the web", WebInputOTP, "web"], ["Android 10", Android10, "Android"]] as const) {
    it(`${name}: a whole code over a held range replaces the whole code`, () => {
      for (const [from, to, pasted] of [[0, 6, "482913"], [1, 3, "482913"], [1, 5, "482915"], [4, 6, "123456"]] as const) {
        const { input } = landing(InputOTP, { defaultValue: "123456" });
        selectRange(input, from, to);
        insert(platform, input, pasted, from, to);
        expect(input.value, `${from}..${to} + ${pasted}`).toBe(pasted);
        cleanup();
      }
    });
  }

  // Android's Paste collapses a held range to its end just before it pastes over it. Both
  // reports reach React in one batch, before the field renders again (measured on Android 15),
  // so the paste is still read at the range, even when the pasted code begins with the
  // characters it replaced (read at the end of the code, "1234567890" would be 7890 typed).
  it("Android 10: a paste read after Android let go of the range still replaces the code", () => {
    for (const [from, to, pasted] of [[4, 6, "567890"], [1, 3, "234567"], [0, 6, "482913"]] as const) {
      const { input } = landing(Android10, { defaultValue: "123456" });
      selectRange(input, from, to);
      act(() => {
        input.setSelectionRange(to, to);
        fireEvent.select(input);
        insert("Android", input, pasted, from, to);
      });
      expect(input.value, `${from}..${to} + ${pasted}`).toBe(pasted);
      cleanup();
    }
  });

  // iOS and Android also report where their caret went, which reads an edit made at a caret the
  // pin had not yet moved: a press put the caret before the code, and a paste came before the
  // next frame.
  for (const [name, InputOTP] of NATIVE) {
    it(`${name}: a whole code pasted before the code is read at the platform's caret`, () => {
      for (const [seed, pasted, code] of [["4", "482913", "482913"], ["12", "123456", "123456"], ["12", "482913", "482913"]] as const) {
        const { input } = landing(InputOTP, { defaultValue: seed });
        insert(name as Platform, input, pasted, 0);
        expect(input.value, `${pasted} before ${seed}`).toBe(code);
        cleanup();
      }
    });

    // Anything shorter than a whole code lands where a keystroke does, whichever cell the
    // caret was in: a paste of part of a code, or a delete, at a caret the pin had not moved.
    it(`${name}: part of a code or a delete at a caret the pin had not moved lands at the end`, () => {
      const { input } = landing(InputOTP, { defaultValue: "1234" });
      insert(name as Platform, input, "56", 1);
      expect(input.value).toBe("123456");
      cleanup();
      const deleted = landing(InputOTP, { defaultValue: "1234" });
      report(name as Platform, deleted.input, "134", 1);
      expect(deleted.input.value).toBe("123");
    });

    // React Native hands the input the code only while the platform has made no newer edit, so
    // an edit a frame after a paste is made to the platform's own text: "12" and a pasted
    // "482913" stay "12482913" in the input while the field shows 482913 (a paste, then a space
    // and a 7, made 124829 on Android 15, every time).
    it(`${name}: an edit made to text the input never showed lands on the code`, () => {
      for (const [edits, code] of [
        [[["12482913", 8], ["12482913 ", 9], ["12482913 7", 10]], "482913"],
        [[["12482913", 8], ["1248291", 7]], "48291"],
        [[["12482913", 8], ["12482913 ", 9], ["12482913", 8], ["1248291", 7]], "48291"],
      ] as const) {
        // Each edit in its own batch, and all of them in one: React Native delivers a burst to
        // the handlers of one render, which the DOM never does for a controlled input (React
        // renders again after each change event), so the batch calls the handler directly.
        for (const batched of [false, true]) {
          const { input, completes } = landing(InputOTP, { defaultValue: "12" });
          if (batched) {
            const onChange = textInputProps(input).onChange as (e: unknown) => void;
            act(() => {
              for (const [text, caret] of edits) onChange({ nativeEvent: { text, selection: { start: caret, end: caret } } });
            });
          } else {
            for (const [text, caret] of edits) report(name as Platform, input, text, caret);
          }
          expect(input.value, `${batched ? "one batch: " : ""}${edits.map(([text]) => text).join(" > ")}`).toBe(code);
          // In one batch the pasted code is never shown, so only a complete final code completes.
          expect(completes).toEqual(batched && code.length < 6 ? [] : ["482913"]);
          cleanup();
        }
      }
    });
  }

  it("hands a controlling parent the whole pasted code", () => {
    let code = "";
    function Controlled() {
      const [value, setValue] = useState("12");
      code = value;
      return <IosInputOTP length={6} testID="otp" value={value} onChangeText={setValue} />;
    }
    render(
      <ThemeProvider solid>
        <Controlled />
      </ThemeProvider>,
    );
    const input = screen.getByTestId("otp").querySelector("input") as HTMLInputElement;
    insert("iOS", input, "482 913");
    expect(code).toBe("482913");
    expect(input.value).toBe("482913");
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
