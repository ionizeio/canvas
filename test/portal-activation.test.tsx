import { afterEach, describe, expect, it } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { type ReactNode } from "react";
import { Text, TextInput, View } from "react-native";
import { PortalActivationContext } from "../src/style/portal-activation.ts";
import { OverlayProvider, Portal, useOverlayHost, type OverlayHost } from "../src/style/portal.tsx";
import { ThemeProvider } from "../src/style/theme.tsx";

afterEach(cleanup);

function Publisher({ name, token = null, active = true, label = name, children }: {
  name: string;
  token?: symbol | number | null;
  active?: boolean;
  label?: string;
  children?: ReactNode;
}) {
  return <PortalActivationContext.Provider value={token}>
    <Portal>
      <View aria-hidden={!active}>
        <Text>{label}</Text>
        <TextInput testID={`editor-${name}`} defaultValue={`${name} draft`} />
        {children}
      </View>
    </Portal>
  </PortalActivationContext.Provider>;
}

function editorsIn(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLInputElement>('[data-testid^="editor-"]')];
}

function orderIn(container: HTMLElement) {
  return editorsIn(container).map((editor) => editor.getAttribute("data-testid")!.replace("editor-", ""));
}

describe("retained portal logical activation", () => {
  for (const glass of [false, true]) {
    it(`${glass ? "glass" : "solid"}: raises a reopened editor above a newer sibling without remounting it`, () => {
      function Fixture({ aToken = 1, aActive = true, b = false, label = "A" }: {
        aToken?: number; aActive?: boolean; b?: boolean; label?: string;
      }) {
        return <ThemeProvider glass={glass} solid={!glass}><OverlayProvider>
          <Publisher name="A" token={aToken} active={aActive} label={label} />
          {b && <Publisher name="B" token={1} />}
        </OverlayProvider></ThemeProvider>;
      }
      const { container, getByTestId, rerender } = render(<Fixture />);
      const editor = getByTestId("editor-A") as HTMLInputElement;
      fireEvent.change(editor, { target: { value: "unfinished local draft" } });
      act(() => { editor.focus(); editor.setSelectionRange(2, 7); });
      rerender(<Fixture aActive={false} />);
      rerender(<Fixture aActive={false} b />);
      expect(orderIn(container)).toEqual(["A", "B"]);
      rerender(<Fixture aActive={false} b label="A content update during exit" />);
      expect(orderIn(container)).toEqual(["A", "B"]);
      rerender(<Fixture aToken={2} b />);
      expect(orderIn(container)).toEqual(["B", "A"]);
      expect(getByTestId("editor-A")).toBe(editor);
      expect(editor.value).toBe("unfinished local draft");
      expect(document.activeElement).toBe(editor);
      expect([editor.selectionStart, editor.selectionEnd]).toEqual([2, 7]);
      rerender(<Fixture aToken={2} b label="Geometry and content are current" />);
      expect(orderIn(container)).toEqual(["B", "A"]);
      expect(getByTestId("editor-A")).toBe(editor);
    });
  }

  it("raises a retained parent with its nested descendants in their existing order", () => {
    function Fixture({ parentToken = 1, childToken = 1, siblingToken = 1, sibling = false }: {
      parentToken?: number; childToken?: number; siblingToken?: number; sibling?: boolean;
    }) {
      return <ThemeProvider><OverlayProvider>
        <Publisher name="parent" token={parentToken}>
          <Publisher name="child" token={childToken}>
            <Publisher name="grandchild" token={1} />
          </Publisher>
        </Publisher>
        {sibling && <Publisher name="sibling" token={siblingToken} />}
      </OverlayProvider></ThemeProvider>;
    }
    const { container, getByTestId, rerender } = render(<Fixture />);
    const original = editorsIn(container);
    expect(orderIn(container)).toEqual(["parent", "child", "grandchild"]);
    rerender(<Fixture sibling />);
    expect(orderIn(container)).toEqual(["parent", "child", "grandchild", "sibling"]);
    rerender(<Fixture sibling parentToken={2} />);
    expect(orderIn(container)).toEqual(["sibling", "parent", "child", "grandchild"]);
    for (const editor of original) expect(getByTestId(editor.getAttribute("data-testid")!)).toBe(editor);
    rerender(<Fixture sibling parentToken={2} siblingToken={2} />);
    expect(orderIn(container)).toEqual(["parent", "child", "grandchild", "sibling"]);
    rerender(<Fixture sibling parentToken={2} siblingToken={2} childToken={2} />);
    expect(orderIn(container)).toEqual(["parent", "sibling", "child", "grandchild"]);
  });

  it("does not let an enclosing token reactivate ordinary nested portals on content updates", () => {
    function Fixture({ token = 1, sibling = false, label = "parent" }: {
      token?: number; sibling?: boolean; label?: string;
    }) {
      return <ThemeProvider><OverlayProvider>
        <PortalActivationContext.Provider value={token}>
          <Portal>
            <Text>{label}</Text>
            <TextInput testID="editor-parent" />
            <Portal><TextInput testID="editor-child" /></Portal>
          </Portal>
        </PortalActivationContext.Provider>
        {sibling && <Publisher name="sibling" />}
      </OverlayProvider></ThemeProvider>;
    }
    const { container, rerender } = render(<Fixture />);
    rerender(<Fixture sibling />);
    expect(orderIn(container)).toEqual(["parent", "child", "sibling"]);
    rerender(<Fixture sibling label="updated parent" />);
    expect(orderIn(container)).toEqual(["parent", "child", "sibling"]);
    rerender(<Fixture sibling token={2} />);
    expect(orderIn(container)).toEqual(["sibling", "parent", "child"]);
  });

  it("keeps legacy portals ordered by mount, and cleans up after the host changes", () => {
    let host: OverlayHost | null = null;
    function HostProbe() { host = useOverlayHost(); return null; }
    function Fixture({ viewport = false, mounted = true, label = "A" }: {
      viewport?: boolean; mounted?: boolean; label?: string;
    }) {
      return <ThemeProvider><OverlayProvider viewport={viewport}>
        <HostProbe />
        {mounted && <><Publisher name="A" label={label} /><Publisher name="B" /></>}
      </OverlayProvider></ThemeProvider>;
    }
    const { container, rerender, unmount } = render(<Fixture />);
    const previousHost = host;
    expect(orderIn(container)).toEqual(["A", "B"]);
    rerender(<Fixture label="updated" />);
    expect(orderIn(container)).toEqual(["A", "B"]);
    rerender(<Fixture viewport />);
    expect(host).not.toBe(previousHost);
    expect(orderIn(container)).toEqual(["A", "B"]);
    rerender(<Fixture viewport mounted={false} />);
    expect(orderIn(container)).toEqual([]);
    rerender(<Fixture viewport />);
    expect(orderIn(container)).toEqual(["A", "B"]);
    unmount();
    expect(document.querySelector('[data-testid^="editor-"]')).toBeNull();
  });

  it("falls back inline without an overlay host", () => {
    const { container, getByTestId, rerender } = render(<ThemeProvider><Publisher name="inline" token={1} /></ThemeProvider>);
    const editor = getByTestId("editor-inline");
    rerender(<ThemeProvider><Publisher name="inline" token={2} /></ThemeProvider>);
    expect(orderIn(container)).toEqual(["inline"]);
    expect(getByTestId("editor-inline")).toBe(editor);
  });
});
