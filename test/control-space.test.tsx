import { afterEach, describe, expect, it } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { type ReactNode } from "react";
import { Checkbox } from "../src/atoms/checkbox/checkbox.tsx";
import { Switch } from "../src/atoms/switch/switch.tsx";
import { Radio } from "../src/atoms/radio/radio.tsx";
import { RadioGroup } from "../src/atoms/radio/radio.tsx";
import { Button } from "../src/atoms/button/button.tsx";
import { ThemeProvider } from "../src/style/theme.tsx";

afterEach(cleanup);
const themed = (node: ReactNode) => <ThemeProvider>{node}</ThemeProvider>;

for (const [name, Control, role] of [["Checkbox", Checkbox, "checkbox"], ["Switch", Switch, "switch"], ["Radio", Radio, "radio"]] as const) {
  describe(`${name} Space activation`, () => {
    const setup = () => {
      let calls = 0;
      const changed = () => { calls += 1; };
      const tree = (disabled = false) => themed(<><Control disabled={disabled} onChange={changed}>Choice</Control><Button>Elsewhere</Button></>);
      const view = render(tree());
      const host = screen.getByRole(role);
      act(() => host.focus());
      return { calls: () => calls, host, view, tree };
    };

    it("prevents scrolling and activates once on release, including a held key", () => {
      const { host, calls } = setup();
      expect(fireEvent.keyDown(host, { key: " " })).toBe(false);
      expect(calls()).toBe(0);
      expect(fireEvent.keyDown(host, { key: " ", repeat: true })).toBe(false);
      expect(calls()).toBe(0);
      expect(fireEvent.keyUp(host, { key: " " })).toBe(false);
      expect(calls()).toBe(1);
      fireEvent.keyUp(host, { key: " " });
      expect(calls()).toBe(1);
      fireEvent.click(host, { detail: 0 });
      expect(calls()).toBe(2);
      fireEvent.click(host, { detail: 1 });
      expect(calls()).toBe(3);
    });

    it("leaves Enter to RNW's complete press responder sequence", () => {
      const { host, calls } = setup();
      fireEvent.keyDown(host, { key: "Enter" });
      expect(calls()).toBe(0);
      fireEvent.keyUp(host, { key: "Enter" });
      expect(calls()).toBe(1);
    });

    it("cancels the held key on blur, disabled changes and an intervening Escape", () => {
      const { host, calls, view, tree } = setup();
      fireEvent.keyDown(host, { key: " " });
      act(() => screen.getByRole("button", { name: "Elsewhere" }).focus());
      act(() => host.focus());
      fireEvent.keyUp(host, { key: " " });
      expect(calls()).toBe(0);
      fireEvent.keyDown(host, { key: " " });
      view.rerender(tree(true));
      view.rerender(tree(false));
      fireEvent.keyUp(host, { key: " " });
      expect(calls()).toBe(0);
      fireEvent.keyDown(host, { key: " " });
      fireEvent.keyDown(host, { key: "Escape" });
      fireEvent.keyUp(host, { key: " " });
      expect(calls()).toBe(0);
      fireEvent.keyDown(host, { key: " ", repeat: true });
      fireEvent.keyUp(host, { key: " " });
      expect(calls()).toBe(0);
    });

    for (const composition of [{ isComposing: true }, { keyCode: 229 }]) {
      it(`does not consume composing Space (${JSON.stringify(composition)})`, () => {
        const { host, calls } = setup();
        expect(fireEvent.keyDown(host, { key: " ", ...composition })).toBe(true);
        fireEvent.keyUp(host, { key: " ", ...composition });
        expect(calls()).toBe(0);
        fireEvent.keyDown(host, { key: " " });
        fireEvent.keyUp(host, { key: " ", ...composition });
        fireEvent.keyUp(host, { key: " " });
        expect(calls()).toBe(0);
      });
    }

    it("honors prevented key events and ignores key events from descendants", () => {
      const { host, calls } = setup();
      const prevented = (type: string) => {
        const event = new KeyboardEvent(type, { key: " ", bubbles: true, cancelable: true });
        event.preventDefault();
        fireEvent(host, event);
      };
      prevented("keydown");
      fireEvent.keyUp(host, { key: " " });
      expect(calls()).toBe(0);
      fireEvent.keyDown(host, { key: " " });
      prevented("keyup");
      fireEvent.keyUp(host, { key: " " });
      expect(calls()).toBe(0);
      const label = screen.getByText("Choice");
      fireEvent.keyDown(label, { key: " " });
      fireEvent.keyUp(label, { key: " " });
      expect(calls()).toBe(0);
    });

    it("drops a pending press when the host unmounts", () => {
      const { host, calls, view, tree } = setup();
      fireEvent.keyDown(host, { key: " " });
      view.rerender(themed(null));
      fireEvent.keyUp(host, { key: " " });
      view.rerender(tree());
      fireEvent.keyUp(screen.getByRole(role), { key: " " });
      expect(calls()).toBe(0);
    });
  });
}

it("selects a focused Radio once with Space while preserving arrow-key group selection", () => {
  const values: (string | number)[] = [];
  render(themed(<RadioGroup defaultValue="daily" onChange={(next) => values.push(next)}><Radio value="daily">Daily</Radio><Radio value="weekly">Weekly</Radio></RadioGroup>));
  const weekly = screen.getByRole("radio", { name: "Weekly" });
  act(() => weekly.focus());
  fireEvent.keyDown(weekly, { key: " " });
  fireEvent.keyUp(weekly, { key: " " });
  expect(values).toEqual(["weekly"]);
  expect(weekly.getAttribute("aria-checked")).toBe("true");
  fireEvent.keyDown(weekly, { key: "ArrowLeft" });
  fireEvent.keyUp(weekly, { key: "ArrowLeft" });
  expect(values).toEqual(["weekly", "daily"]);
  expect(document.activeElement).toBe(screen.getByRole("radio", { name: "Daily" }));
});
