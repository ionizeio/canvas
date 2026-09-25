import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { ThemeProvider } from "../src/style/theme.tsx";
import type { InputOTPProps } from "../src/atoms/input-otp/input-otp.shared.tsx";
import { InputOTP as WebInputOTP } from "../src/atoms/input-otp/input-otp.tsx";
import { InputOTP as IosInputOTP } from "../src/atoms/input-otp/input-otp.ios.tsx";
import { InputOTP as AndroidInputOTP } from "../src/atoms/input-otp/input-otp.android.tsx";

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
}

/** The props the shell handed its TextInput, read from React's tree: react-native-web
 *  renders no attribute for `selectionColor`, so the DOM cannot show it. */
function textInputProps(input: HTMLInputElement): Record<string, unknown> {
  const node = input as unknown as Record<string, Fiber>;
  let fiber: Fiber | null = node[Object.keys(node).find((key) => key.startsWith("__reactFiber$"))!]!;
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
});
