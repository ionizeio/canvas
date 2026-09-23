// The painted beds the kit's text roles must stay legible on, shared by
// test/text-contrast.test.tsx and the Dark Factory token solver
// (tools/darkfactory/derive-tokens.ts), so the solver clears exactly the composites the
// test checks: the neutral surfaces, the tonal and tile fills a skin lays under a
// label, the pressed and ripple states of the menus and sheets, each perturbed by one
// 8-bit step per channel the way engines round a converted color.
import type { ColorTokens } from "../../src/style/tokens.ts";
import { colorsByScheme } from "../../src/style/tokens.ts";
import * as actionSheetSkins from "../../src/organisms/action-sheet/action-sheet.styles.ts";
import * as dialogSkins from "../../src/organisms/dialog/dialog.styles.ts";
import * as alertDialogSkins from "../../src/molecules/alert-dialog/alert-dialog.styles.ts";
import * as tabsSkins from "../../src/organisms/tabs/tabs.styles.ts";
import * as navbarSkins from "../../src/organisms/navbars/navbars.styles.ts";
import * as calendarSkins from "../../src/organisms/calendar/calendar.styles.ts";
import * as textareaSkins from "../../src/atoms/textarea/textarea.styles.ts";
import * as dropdownSkins from "../../src/atoms/dropdown/dropdown.styles.ts";
import * as rowMenuSkins from "../../src/organisms/row-menu/row-menu.styles.ts";
import { destructiveText } from "../../src/style/destructive-text.ts";

export type Rgba = readonly [red: number, green: number, blue: number, alpha: number];
export type SrgbColor = string | Rgba;

// Parse the hex and rgb/rgba forms used by the source tokens and rendered text.
// Keep fractional channels throughout compositing, before WCAG linearization.
export function rgba(color: SrgbColor): Rgba {
  if (typeof color !== "string") return color;
  const hex = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(color);
  if (hex) return [
    parseInt(hex[1]!.slice(0, 2), 16), parseInt(hex[1]!.slice(2, 4), 16), parseInt(hex[1]!.slice(4, 6), 16),
    hex[2] ? parseInt(hex[2], 16) / 255 : 1,
  ];
  const functional = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(color);
  if (functional) {
    const channels = functional.slice(1, 4).map(Number);
    const alpha = functional[4] === undefined ? 1 : Number(functional[4]);
    if (channels.every(channel => Number.isFinite(channel) && channel >= 0 && channel <= 255) &&
        Number.isFinite(alpha) && alpha >= 0 && alpha <= 1) {
      return [channels[0]!, channels[1]!, channels[2]!, alpha];
    }
  }
  throw new Error(`Expected an sRGB color: ${color}`);
}

export function composite(foreground: SrgbColor, background: SrgbColor): Rgba {
  const front = rgba(foreground), back = rgba(background);
  const alpha = front[3] + back[3] * (1 - front[3]);
  if (alpha === 0) return [0, 0, 0, 0];
  const channel = (index: 0 | 1 | 2) => (front[index] * front[3] + back[index] * back[3] * (1 - front[3])) / alpha;
  return [channel(0), channel(1), channel(2), alpha];
}

export function luminance(color: SrgbColor): number {
  const channels = rgba(color);
  if (channels[3] !== 1) throw new Error("Composite translucent colors onto an opaque backdrop before measuring contrast");
  const [r, g, b] = channels.slice(0, 3).map(channel => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return r! * 0.2126 + g! * 0.7152 + b! * 0.0722;
}

export function contrast(a: SrgbColor, b: SrgbColor): number {
  const [low, high] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (high! + 0.05) / (low! + 0.05);
}

export function textContrast(text: SrgbColor, background: SrgbColor): number {
  return contrast(composite(text, background), background);
}

export function paint(style: { color?: unknown; backgroundColor?: unknown }, property: "color" | "backgroundColor" = "color"): string {
  const value = style[property];
  if (typeof value !== "string") throw new Error(`Expected a source ${property}, received ${String(value)}`);
  return value;
}

// Pin the supported default surface set. Use the actual layered skin fills,
// including the two built-in compositions a neutral-pair check cannot catch.
export function primaryTextSurfaces(tokens: ColorTokens): [string, SrgbColor][] {
  const neutral = ["background", "card", "popover", "muted"] as const;
  const tonal = paint(tabsSkins.androidSkin.pillsFill(tokens, true, false), "backgroundColor");
  const navTile = paint(navbarSkins.iosSkin.linkTile(tokens, false), "backgroundColor");
  return [
    ...neutral.map((key): [string, SrgbColor] => [key, tokens[key]]),
    ...neutral.map((key): [string, SrgbColor] => [`tonal selected on ${key}`, composite(tonal, tokens[key])]),
    ...neutral.map((key): [string, SrgbColor] => [`iOS Navbar inactive on ${key}`, composite(navTile, tokens[key])]),
    ["today within range", composite(
      paint(calendarSkins.webSkin.dayCellState(tokens, { selected: false, today: true }), "backgroundColor"),
      composite(paint(calendarSkins.webSkin.rangeBand(tokens), "backgroundColor"), tokens.card),
    )],
  ];
}

export function neighborhood(color: SrgbColor): Rgba[] {
  const [r, g, b, a] = rgba(color);
  const bounded = (channel: number) => Math.max(0, Math.min(255, channel));
  const values: Rgba[] = [];
  for (const dr of [-1, 0, 1]) for (const dg of [-1, 0, 1]) for (const db of [-1, 0, 1]) {
    values.push([bounded(r + dr), bounded(g + dg), bounded(b + db), a]);
  }
  return values;
}

export interface TextState { name: string; text: SrgbColor; fill: SrgbColor }
export function opacity(color: SrgbColor, value: number): Rgba {
  const [r, g, b, a] = rgba(color);
  return [r, g, b, a * value];
}

// Parent opacity composites the entire painted group onto its parent. The text
// does not first blend into the already-dimmed row a second time.
export function groupState(name: string, text: SrgbColor, fill: SrgbColor, parent: SrgbColor, dim = 1): TextState {
  return { name, text: composite(opacity(text, dim), parent), fill: composite(opacity(fill, dim), parent) };
}

export function destructiveStates(t: ColorTokens): TextState[] {
  const text = destructiveText(t);
  const states: TextState[] = (["background", "card", "popover", "muted"] as const)
    .map(key => ({ name: key, text, fill: t[key] }));
  const field = textareaSkins.androidSkin.field(t, { focused: false, error: true });
  states.push({ name: "Android filled Textarea", text, fill: paint(field, "backgroundColor") });
  const dialog = dialogSkins.iosSkin;
  const capsule = paint(dialog.capsule!(t, true, true), "backgroundColor");
  const dialogText = paint(dialog.capsuleLabel!(t, true, true));
  states.push(groupState("iOS Dialog resting", dialogText, capsule, t.popover));
  states.push(groupState("iOS Dialog pressed", dialogText, capsule, t.popover, dialog.capsulePressedOpacity!));
  const alert = alertDialogSkins.iosSkin;
  states.push(groupState("iOS AlertDialog pressed", paint(alert.confirmLabelStyle!(t, true)),
    paint(alert.confirmFill!(t, true), "backgroundColor"), t.popover, alert.pressedOpacity!));
  const dropdown = dropdownSkins.iosSkin;
  states.push(groupState("iOS Dropdown pressed", paint(dropdown.itemTextColor(t, false, true)),
    paint(dropdown.itemPressed!(t), "backgroundColor"), t.popover, dropdown.pressedOpacity!));
  for (const [name, skin] of [["web", actionSheetSkins.webSkin], ["ios", actionSheetSkins.iosSkin], ["android", actionSheetSkins.androidSkin]] as const) {
    const surface = paint(skin.actionsCard(t), "backgroundColor");
    const fill = skin.rowFill ? composite(paint(skin.rowFill(t), "backgroundColor"), surface) : surface;
    const label = paint(skin.rowLabel(t, true, false));
    states.push(groupState(`${name} ActionSheet resting`, label, fill, surface));
    if (skin.pressedOpacity != null) {
      states.push(groupState(`${name} ActionSheet pressed`, label, fill, surface, skin.pressedOpacity));
    } else if (skin.ripple) {
      // The ripple is behind the label; test its full declared state-layer alpha.
      states.push({ name: `${name} ActionSheet ripple`, text: label, fill: composite(skin.ripple(t).color, fill) });
    }
  }
  for (const [name, skin] of [["web", dropdownSkins.webSkin], ["ios", dropdownSkins.iosSkin], ["android", dropdownSkins.androidSkin]] as const) {
    const label = paint(skin.itemTextColor(t, t === colorsByScheme.dark, true));
    if (skin.ripple) states.push({ name: `${name} Dropdown ripple`, text: label, fill: composite(skin.ripple(t).color, t.popover) });
    else if (skin.pressedOpacity == null) states.push({ name: `${name} Dropdown pressed`, text: label, fill: paint(skin.itemPressed!(t), "backgroundColor") });
  }
  for (const [name, skin] of [["web", rowMenuSkins.webSkin], ["ios", rowMenuSkins.iosSkin], ["android", rowMenuSkins.androidSkin]] as const) {
    const label = paint(skin.rowTextColor({ label: "Delete", destructive: true }, false, t, t === colorsByScheme.dark));
    const fill = skin.ripple ? composite(skin.ripple(t).color, t.popover) : paint(skin.itemPressed(t), "backgroundColor");
    states.push({ name: `${name} fixed-red RowMenu pressed`, text: label, fill });
  }
  return states;
}
