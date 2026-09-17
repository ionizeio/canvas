import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { Text } from "react-native";
import { Dialog } from "../src/organisms/dialog/dialog.tsx";
import { AlertDialog } from "../src/molecules/alert-dialog/alert-dialog.tsx";
import { Drawer } from "../src/organisms/drawer/drawer.tsx";
import { ActionSheet } from "../src/organisms/action-sheet/action-sheet.tsx";
import { OverlayProvider } from "../src/style/portal.tsx";
import { PopupInteractionContext } from "../src/style/popup-motion.tsx";
import { ThemeProvider } from "../src/style/theme.tsx";

afterEach(cleanup);

const owners: [string, (onOpenChange: (next: boolean) => void) => ReactNode][] = [
  ["Dialog", onOpenChange => <Dialog open overlay title="Nested modal" onOpenChange={onOpenChange} />],
  ["AlertDialog", onOpenChange => <AlertDialog open overlay title="Nested modal" onOpenChange={onOpenChange} />],
  ["Drawer", onOpenChange => <Drawer open onOpenChange={onOpenChange}><Text>Nested modal</Text></Drawer>],
  ["ActionSheet", onOpenChange => <ActionSheet open title="Nested modal" onOpenChange={onOpenChange} actions={[{ label: "Save", onPress: () => {} }]} />],
];

describe("native-window and modal owners inside a retained popup", () => {
  for (const [name, content] of owners) {
    it(`${name}: removes its modal surface and Escape ownership immediately when its parent closes`, () => {
      const requests: boolean[] = [];
      const node = content(next => requests.push(next));
      const page = (interactive: boolean) => <ThemeProvider solid>
        <OverlayProvider>
          <PopupInteractionContext.Provider value={interactive}>{node}</PopupInteractionContext.Provider>
        </OverlayProvider>
      </ThemeProvider>;
      const view = render(page(true));
      expect(screen.getByText("Nested modal")).toBeTruthy();
      view.rerender(page(false));
      expect(screen.queryByText("Nested modal")).toBeNull();
      fireEvent.keyDown(document, { key: "Escape" });
      fireEvent.keyUp(document, { key: "Escape" });
      expect(requests).toEqual([]);
      // The controlled child value stays authoritative during a quick reopen.
      view.rerender(page(true));
      expect(screen.getByText("Nested modal")).toBeTruthy();
    });
  }
});
