import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, render, act } from "@testing-library/react";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { createCaptureTarget, useCaptureDemand, useCaptureEnabled, useReadyCaptureTarget } from "../src/style/glass-surface/capture-target.ts";

afterEach(cleanup);

describe("native capture ownership", () => {
  it("captures only for attached retained consumers and makes cleanup idempotent", () => {
    const owner = createCaptureTarget();
    expect(owner.active()).toBe(false);
    const releaseA = owner.retain();
    expect(owner.active()).toBe(false);
    const host = {} as View;
    owner.attach(host);
    expect(owner.ready()).toBe(false);
    expect(owner.active()).toBe(false);
    owner.setAvailable(host, true);
    expect(owner.active()).toBe(true);
    const releaseB = owner.retain();
    releaseA();
    releaseA();
    expect(owner.active()).toBe(true);
    releaseB();
    expect(owner.active()).toBe(false);
    owner.attach(null);
    expect(owner.ready()).toBe(false);
  });

  it("late plane attachment enables consumers and solid removes demand without changing their editor", () => {
    const target = createCaptureTarget();
    function Consumer({ glass }: { glass: boolean }) {
      const ready = useReadyCaptureTarget(target.ref);
      useCaptureDemand(target.ref, glass && ready !== null);
      const [identity] = useState(() => "stable");
      return <TextInput testID="capture-editor" defaultValue={identity} />;
    }
    function Fixture({ glass, attached }: { glass: boolean; attached: boolean }) {
      const active = useCaptureEnabled(target.ref);
      return <View>
        {attached ? <View ref={target.attach} testID="capture-host" /> : null}
        <Text testID="capture-active">{String(active)}</Text>
        <Consumer glass={glass} />
      </View>;
    }
    const { getByTestId, rerender, unmount } = render(<Fixture glass attached={false} />);
    const editor = getByTestId("capture-editor") as HTMLInputElement;
    editor.focus();
    editor.value = "local draft";
    editor.setSelectionRange(2, 7);
    rerender(<Fixture glass attached />);
    expect(getByTestId("capture-active").textContent).toBe("false");
    act(() => target.setAvailable(target.ref.current!, true));
    expect(getByTestId("capture-active").textContent).toBe("true");
    rerender(<Fixture glass={false} attached />);
    expect(getByTestId("capture-active").textContent).toBe("false");
    expect(getByTestId("capture-editor")).toBe(editor);
    expect(editor.value).toBe("local draft");
    expect(document.activeElement).toBe(editor);
    expect([editor.selectionStart, editor.selectionEnd]).toEqual([2, 7]);
    rerender(<Fixture glass attached />);
    expect(target.active()).toBe(true);
    act(() => target.attach(null));
    expect(target.active()).toBe(false);
    unmount();
    expect(target.active()).toBe(false);
  });

  it("a nested glass owner remains active until its own final release", () => {
    const parent = createCaptureTarget();
    const nested = createCaptureTarget();
    parent.attach({} as View);
    nested.attach({} as View);
    parent.setAvailable(parent.ref.current!, true);
    nested.setAvailable(nested.ref.current!, true);
    const parentOff = parent.retain();
    const nestedOff = nested.retain();
    parentOff();
    expect(parent.active()).toBe(false);
    expect(nested.active()).toBe(true);
    nestedOff();
    expect(nested.active()).toBe(false);
  });

  it("observes native host replacement behind one ref without remounting the foreground", () => {
    const target = createCaptureTarget();
    const first = {} as View;
    const second = {} as View;
    const third = {} as View;
    const identities = new Map([[first, "first"], [second, "second"], [third, "third"]]);
    target.attach(first);
    target.setAvailable(first, true);
    function Consumer() {
      const ready = useReadyCaptureTarget(target.ref);
      useCaptureDemand(target.ref, ready !== null);
      return <View>
        <Text testID="capture-identity">{ready?.current ? identities.get(ready.current) : "missing"}</Text>
        <TextInput testID="stable-editor" defaultValue="draft" />
      </View>;
    }
    const { getByTestId, unmount } = render(<Consumer />);
    const editor = getByTestId("stable-editor") as HTMLInputElement;
    act(() => { editor.focus(); editor.setSelectionRange(1, 4); });
    expect(getByTestId("capture-identity").textContent).toBe("first");
    const initialGeneration = target.generation();
    act(() => target.attach(second));
    expect(target.generation()).toBeGreaterThan(initialGeneration);
    expect(getByTestId("capture-identity").textContent).toBe("missing");
    expect(target.active()).toBe(false);
    const replacementGeneration = target.generation();
    act(() => target.setAvailable(first, true));
    expect(target.generation()).toBe(replacementGeneration);
    expect(target.ready()).toBe(false);
    act(() => target.setAvailable(second, true));
    expect(getByTestId("capture-identity").textContent).toBe("second");
    // Ref cleanup and replacement can occur within one React/native commit.
    // Readiness stays true across the batch, but the native tag still changed.
    act(() => { target.attach(null); target.attach(third); target.setAvailable(third, true); });
    expect(getByTestId("capture-identity").textContent).toBe("third");
    expect(target.active()).toBe(true);
    expect(getByTestId("stable-editor")).toBe(editor);
    expect(document.activeElement).toBe(editor);
    expect([editor.selectionStart, editor.selectionEnd]).toEqual([1, 4]);
    act(() => target.setAvailable(third, false));
    expect(getByTestId("capture-identity").textContent).toBe("missing");
    expect(target.active()).toBe(false);
    expect(getByTestId("stable-editor")).toBe(editor);
    expect(document.activeElement).toBe(editor);
    expect([editor.selectionStart, editor.selectionEnd]).toEqual([1, 4]);
    act(() => target.setAvailable(third, true));
    expect(target.active()).toBe(true);
    unmount();
    expect(target.active()).toBe(false);
  });
});
