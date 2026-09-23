import { Platform } from "react-native";
import { FontDisplay, useFonts } from "expo-font";
import type { ThemeFonts } from "@ionizeio/canvas";

// The seven faces, cut down to the glyphs the docs can show by scripts/subset-fonts.mjs
// from the full files the @expo-google-fonts packages carry (those packages are dev
// dependencies now, the subsetter's input). Every face is on the first paint's
// critical path, since each pre-rendered page preloads them all, and the full files
// held Greek, Cyrillic and Vietnamese the docs never render: the subsets are about
// 166 KB over the wire for all seven against 305 KB. Manrope's outlines are about twice
// as detailed as Urbanist's were, so its five faces cost 117 KB where Urbanist's four
// cost 66 KB; Geist Mono stops at 400 and 600 to hold the count at seven.
const Manrope_400Regular = require("../../assets/fonts/Manrope_400Regular.ttf");
const Manrope_500Medium = require("../../assets/fonts/Manrope_500Medium.ttf");
const Manrope_600SemiBold = require("../../assets/fonts/Manrope_600SemiBold.ttf");
const Manrope_700Bold = require("../../assets/fonts/Manrope_700Bold.ttf");
const Manrope_800ExtraBold = require("../../assets/fonts/Manrope_800ExtraBold.ttf");
const GeistMono_400Regular = require("../../assets/fonts/GeistMono_400Regular.ttf");
const GeistMono_600SemiBold = require("../../assets/fonts/GeistMono_600SemiBold.ttf");

// Every face is loaded as a FontResource rather than a bare module id so it can carry
// `display: swap`. Without it the browser default is `auto`, which hides text until the
// face arrives; `swap` paints the fallback immediately and repaints once the face is ready.
// The root layout currently gates the app on fontsLoaded (docs/src/app/_layout.tsx), so
// in the normal path nothing renders before the faces resolve; swap is the safety net
// for a face that arrives late or fails, and it keeps text visible if that gate is ever
// dropped. The option is web-only (it becomes the font-display descriptor on the
// generated @font-face rule); native already behaves like swap, and the extra wrapper
// is inert there.
const swap = (uri: number) => ({ uri, display: FontDisplay.SWAP });

// Load the two faces the docs use, cross-platform (iOS / Android / web): Manrope is the
// kit's brand face (`typeface.sans`), handed to the kit through the ThemeProvider `fonts`
// prop below and worn by the docs' own chrome too; Geist Mono sets the code. Custom fonts
// in RN don't auto-map fontWeight, so each weight is its own family and is selected
// explicitly (the kit does it through `fonts`, the chrome via sans()).
//
// `useFonts` comes from expo-font itself, not from the @expo-google-fonts re-export. The
// re-export is a plain client hook that starts false and flips in an effect, and effects
// never run in a static render, so every pre-rendered page came out EMPTY behind the
// root layout's font gate. expo-font's hook knows about the server: there it registers
// each face so the exporter writes the @font-face rules and the preload links into the
// page's head.
//
// On the web the gate is reported open outright. The document owns the faces there:
// the pre-rendered head preloads them and declares them, so they are loading before
// the bundle has even arrived, and the server always renders the tree. Asking the hook
// instead would make the hydration render depend on the browser's CSSOM: expo-font
// decides a face is loaded by comparing the @font-face rule's `fontFamily` string, and
// Firefox serialises that name with quotes, so it answered "not loaded" there, the
// hydration render produced an empty tree against a full page, and React rebuilt the
// whole document. On iOS and Android the answer is the real one: the faces are read
// from the bundle, and the tree waits for them.
export function useDocsFonts(): [boolean, Error | null] {
  const [loaded, error] = useFonts({
    Manrope_400Regular: swap(Manrope_400Regular),
    Manrope_500Medium: swap(Manrope_500Medium),
    Manrope_600SemiBold: swap(Manrope_600SemiBold),
    Manrope_700Bold: swap(Manrope_700Bold),
    Manrope_800ExtraBold: swap(Manrope_800ExtraBold),
    GeistMono_400Regular: swap(GeistMono_400Regular),
    GeistMono_600SemiBold: swap(GeistMono_600SemiBold),
  });
  return [Platform.OS === "web" || loaded, error];
}

export type SansWeight = "400" | "500" | "600" | "700" | "800";
export type MonoWeight = "400" | "600";

const SANS: Record<SansWeight, string> = {
  "400": "Manrope_400Regular",
  "500": "Manrope_500Medium",
  "600": "Manrope_600SemiBold",
  "700": "Manrope_700Bold",
  "800": "Manrope_800ExtraBold",
};
const MONO: Record<MonoWeight, string> = {
  "400": "GeistMono_400Regular",
  "600": "GeistMono_600SemiBold",
};

/**
 * The registered faces the kit paints with (ThemeProvider `fonts`): one face per
 * weight, so the kit's Text primitive picks the registered family for a style's
 * fontWeight and drops the weight (a per-weight face already carries it). A module
 * constant, so the theme value is not rebuilt on every render.
 */
export const CANVAS_FONTS: ThemeFonts = { sans: SANS, mono: MONO };

/** The brand face by weight, for the docs' own chrome (the kit gets it through `fonts`). */
export const sans = (weight: SansWeight = "400") => SANS[weight];
export const geistMono = (weight: MonoWeight = "400") => MONO[weight];
