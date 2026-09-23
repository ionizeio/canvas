import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "../src/style/theme.tsx";
import { colorsByScheme, palette } from "../src/style/tokens.ts";
import { destructiveText } from "../src/style/destructive-text.ts";
import { layoutEntrance } from "./entrance-layout.ts";
import { Field } from "../src/molecules/field/field.tsx";
import { Field as IOSField } from "../src/molecules/field/field.ios.tsx";
import { Field as AndroidField } from "../src/molecules/field/field.android.tsx";
import { Textarea } from "../src/atoms/textarea/textarea.tsx";
import { Textarea as IOSTextarea } from "../src/atoms/textarea/textarea.ios.tsx";
import { Textarea as AndroidTextarea } from "../src/atoms/textarea/textarea.android.tsx";
import { Dialog } from "../src/organisms/dialog/dialog.tsx";
import { Dialog as IOSDialog } from "../src/organisms/dialog/dialog.ios.tsx";
import { Dialog as AndroidDialog } from "../src/organisms/dialog/dialog.android.tsx";
import { AlertDialog } from "../src/molecules/alert-dialog/alert-dialog.tsx";
import { AlertDialog as IOSAlertDialog } from "../src/molecules/alert-dialog/alert-dialog.ios.tsx";
import { AlertDialog as AndroidAlertDialog } from "../src/molecules/alert-dialog/alert-dialog.android.tsx";
import { Dropdown } from "../src/atoms/dropdown/dropdown.tsx";
import { Dropdown as IOSDropdown } from "../src/atoms/dropdown/dropdown.ios.tsx";
import { Dropdown as AndroidDropdown } from "../src/atoms/dropdown/dropdown.android.tsx";
import { RowMenu } from "../src/organisms/row-menu/row-menu.tsx";
import { RowMenu as IOSRowMenu } from "../src/organisms/row-menu/row-menu.ios.tsx";
import { RowMenu as AndroidRowMenu } from "../src/organisms/row-menu/row-menu.android.tsx";
import { ActionSheet } from "../src/organisms/action-sheet/action-sheet.tsx";
import { ActionSheet as IOSActionSheet } from "../src/organisms/action-sheet/action-sheet.ios.tsx";
import { ActionSheet as AndroidActionSheet } from "../src/organisms/action-sheet/action-sheet.android.tsx";

afterEach(cleanup);

function rgb(value: string): string {
  if (/^#[\da-f]{6}$/i.test(value)) return [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16)).join(",");
  const channels = value.match(/[\d.]+/g);
  if (!channels || channels.length < 3) throw new Error(`Expected rendered color: ${value}`);
  return channels.slice(0, 3).map(Number).join(",");
}

const platforms = [
  { name: "web", Field, Textarea, Dialog, AlertDialog, Dropdown, RowMenu, ActionSheet },
  { name: "ios", Field: IOSField, Textarea: IOSTextarea, Dialog: IOSDialog, AlertDialog: IOSAlertDialog,
    Dropdown: IOSDropdown, RowMenu: IOSRowMenu, ActionSheet: IOSActionSheet },
  { name: "android", Field: AndroidField, Textarea: AndroidTextarea, Dialog: AndroidDialog, AlertDialog: AndroidAlertDialog,
    Dropdown: AndroidDropdown, RowMenu: AndroidRowMenu, ActionSheet: AndroidActionSheet },
] as const;

function sizeMenu(container: HTMLElement): void {
  const menu = container.querySelector('[role="menu"]');
  if (!menu) throw new Error("Expected the mounted inline menu before reporting its layout");
  layoutEntrance(menu, { width: 260, height: 160 });
}

describe("real destructive text consumers", () => {
  for (const scheme of ["light", "dark"] as const) for (const p of platforms) {
    const t = colorsByScheme[scheme];
    it(`${scheme} ${p.name} Field error and soft-limit count recover without changing their control`, () => {
      const ui = (error?: string) => <ThemeProvider scheme={scheme}>
        <p.Field label="Description" helper="Keep it concise." error={error}>
          <p.Textarea defaultValue="Long" showCount maxLength={3} />
        </p.Field>
      </ThemeProvider>;
      const { rerender } = render(ui("Describe the change."));
      const field = screen.getByLabelText("Description");
      expect(rgb(screen.getByText("Describe the change.").style.color)).toBe(rgb(destructiveText(t)));
      expect(screen.getByRole("alert").textContent).toBe("Describe the change.");
      expect(rgb(screen.getByText("4 / 3").style.color)).toBe(rgb(destructiveText(t)));
      fireEvent.change(field, { target: { value: "OK" } });
      expect(rgb(screen.getByText("2 / 3").style.color)).toBe(rgb(t["muted-foreground"]));
      rerender(ui());
      expect(screen.getByLabelText("Description")).toBe(field);
      expect(screen.queryByRole("alert")).toBeNull();
      expect(rgb(screen.getByText("Keep it concise.").style.color)).toBe(rgb(t["muted-foreground"]));
    });

    for (const [name, Component] of [["Dialog", p.Dialog], ["AlertDialog", p.AlertDialog]] as const) {
      it(`${scheme} ${p.name} ${name} uses the correct text/fill pair and still confirms once`, () => {
        let confirms = 0;
        render(<ThemeProvider scheme={scheme}><Component open destructive title="Delete record" confirmLabel="Delete" onConfirm={() => confirms++} /></ThemeProvider>);
        const label = screen.getByText("Delete");
        const action = screen.getByRole("button", { name: "Delete" });
        expect(rgb(label.style.color)).toBe(rgb(p.name === "web" ? t["destructive-foreground"] : destructiveText(t)));
        if (p.name === "ios") expect(rgb(action.style.backgroundColor)).toBe(rgb(t.secondary));
        if (p.name === "web") expect(rgb(action.style.backgroundColor)).toBe(rgb(t.destructive));
        fireEvent.click(action);
        expect(confirms).toBe(1);
      });
    }

    // Every menu paints a destructive row in the destructive-text role (the error ink), on
    // every platform, so a brand's text-grade red reaches its menus too.
    it(`${scheme} ${p.name} Dropdown and RowMenu paint destructive rows in the destructive-text role and keep disabled rows inert`, () => {
      let selected = 0;
      const tokens = { destructive: "#613020", "destructive-text": "#b25340" };
      const items = [{ label: "Delete", destructive: true }, { label: "Unavailable", destructive: true, disabled: true }];
      const { container, unmount } = render(<ThemeProvider scheme={scheme} tokens={tokens}>
        <p.Dropdown open trigger="Actions" items={items} onSelect={() => selected++} />
      </ThemeProvider>);
      sizeMenu(container);
      expect(rgb(screen.getByText("Delete").style.color)).toBe(rgb(tokens["destructive-text"]));
      const unavailable = screen.getByRole("menuitem", { name: "Unavailable" });
      expect(unavailable.getAttribute("aria-disabled")).toBe("true");
      fireEvent.click(unavailable);
      expect(selected).toBe(0);
      fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
      expect(selected).toBe(1);
      unmount();
      const row = render(<ThemeProvider scheme={scheme} tokens={tokens}>
        <p.RowMenu open items={items} onSelect={() => selected++} />
      </ThemeProvider>);
      sizeMenu(row.container);
      expect(rgb(screen.getByText("Delete").style.color)).toBe(rgb(tokens["destructive-text"]));
      fireEvent.click(screen.getByRole("menuitem", { name: "Unavailable" }));
      expect(selected).toBe(1);
      fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
      expect(selected).toBe(2);
    });

    it(`${scheme} ${p.name} ActionSheet keeps destructive actions readable and disabled actions inert`, () => {
      let selected = 0;
      const closed: boolean[] = [];
      render(<ThemeProvider scheme={scheme}><p.ActionSheet open title="Record actions" onOpenChange={next => closed.push(next)} actions={[
        { label: "Delete", destructive: true, onPress: () => selected++ },
        { label: "Unavailable", destructive: true, disabled: true, onPress: () => selected++ },
      ]} /></ThemeProvider>);
      expect(rgb(screen.getByText("Delete").style.color)).toBe(rgb(destructiveText(t)));
      const unavailable = screen.getByRole("button", { name: "Unavailable" });
      expect(unavailable.getAttribute("aria-disabled")).toBe("true");
      fireEvent.click(unavailable);
      expect(selected).toBe(0);
      expect(closed).toEqual([]);
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
      expect(selected).toBe(1);
      expect(closed).toEqual([false]);
    });
  }

  it("retains actual iOS ActionSheet press dimming with the new text role", async () => {
    let selected = 0;
    render(<ThemeProvider light solid><IOSActionSheet open actions={[
      { label: "Delete", destructive: true, onPress: () => selected++ },
    ]} /></ThemeProvider>);
    const action = screen.getByRole("button", { name: "Delete" });
    fireEvent.mouseDown(action, { button: 0, buttons: 1, clientX: 1, clientY: 1 });
    await waitFor(() => expect(action.style.opacity).toBe("0.8"));
    expect(rgb(screen.getByText("Delete").style.color)).toBe(rgb(destructiveText(colorsByScheme.light)));
    expect(selected).toBe(0);
    fireEvent.mouseUp(action, { button: 0, buttons: 0, clientX: 1, clientY: 1 });
    fireEvent.click(action);
    expect(selected).toBe(1);
  });
});
