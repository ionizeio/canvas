import { FontDisplay } from "expo-font";
import {
  useFonts,
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
  Geist_800ExtraBold,
} from "@expo-google-fonts/geist";
import {
  GeistMono_400Regular,
  GeistMono_500Medium,
  GeistMono_600SemiBold,
} from "@expo-google-fonts/geist-mono";
import {
  Urbanist_400Regular,
  Urbanist_500Medium,
  Urbanist_600SemiBold,
  Urbanist_700Bold,
} from "@expo-google-fonts/urbanist";
import type { ThemeFonts } from "@nannier-com/canvas";

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

// Load the faces the docs use, cross-platform (iOS / Android / web): Urbanist is the
// kit's brand face (`typeface.sans`), handed to the kit through the ThemeProvider
// `fonts` prop below; Geist and Geist Mono dress the docs' own chrome and code. Custom
// fonts in RN don't auto-map fontWeight, so each weight is its own family and is
// selected explicitly (the kit does it through `fonts`, the chrome via geist()).
export function useDocsFonts(): [boolean, Error | null] {
  return useFonts({
    Urbanist_400Regular: swap(Urbanist_400Regular),
    Urbanist_500Medium: swap(Urbanist_500Medium),
    Urbanist_600SemiBold: swap(Urbanist_600SemiBold),
    Urbanist_700Bold: swap(Urbanist_700Bold),
    Geist_400Regular: swap(Geist_400Regular),
    Geist_500Medium: swap(Geist_500Medium),
    Geist_600SemiBold: swap(Geist_600SemiBold),
    Geist_700Bold: swap(Geist_700Bold),
    Geist_800ExtraBold: swap(Geist_800ExtraBold),
    GeistMono_400Regular: swap(GeistMono_400Regular),
    GeistMono_500Medium: swap(GeistMono_500Medium),
    GeistMono_600SemiBold: swap(GeistMono_600SemiBold),
  });
}

/**
 * The registered faces the kit paints with (ThemeProvider `fonts`): one face per
 * weight, so the kit's Text primitive picks the registered family for a style's
 * fontWeight and drops the weight (a per-weight face already carries it). A module
 * constant, so the theme value is not rebuilt on every render.
 */
export const CANVAS_FONTS: ThemeFonts = {
  sans: {
    "400": "Urbanist_400Regular",
    "500": "Urbanist_500Medium",
    "600": "Urbanist_600SemiBold",
    "700": "Urbanist_700Bold",
  },
  mono: {
    "400": "GeistMono_400Regular",
    "500": "GeistMono_500Medium",
    "600": "GeistMono_600SemiBold",
  },
};

export type SansWeight = "400" | "500" | "600" | "700" | "800";
export type MonoWeight = "400" | "500" | "600";

const SANS: Record<SansWeight, string> = {
  "400": "Geist_400Regular",
  "500": "Geist_500Medium",
  "600": "Geist_600SemiBold",
  "700": "Geist_700Bold",
  "800": "Geist_800ExtraBold",
};
const MONO: Record<MonoWeight, string> = {
  "400": "GeistMono_400Regular",
  "500": "GeistMono_500Medium",
  "600": "GeistMono_600SemiBold",
};

export const geist = (weight: SansWeight = "400") => SANS[weight];
export const geistMono = (weight: MonoWeight = "400") => MONO[weight];

export type BrandWeight = "400" | "500" | "600" | "700";
/** The kit's brand face by weight, for docs specimens that show the face itself. */
export const urbanist = (weight: BrandWeight = "400") => CANVAS_FONTS.sans![weight] as string;
