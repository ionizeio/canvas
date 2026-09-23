import { describe, it, expect, afterEach } from "bun:test";
import { render, cleanup, screen } from "@testing-library/react";
import { ThemeProvider } from "../src/style/theme.tsx";
import { Text, TextInput, fontStyle } from "../src/style/text.tsx";
import { resolveFontFace, weightKey, typeface, type ThemeFonts } from "../src/style/fonts.ts";
import { MONO_FONT } from "../src/style/mono.ts";
import { Button } from "../src/atoms/button/button.tsx";
import { Typography } from "../src/atoms/typography/typography.tsx";

afterEach(cleanup);

// The faces an app registers per weight (the expo-google-fonts shape), plus a mono set.
const FACES: ThemeFonts = {
  sans: { "400": "Manrope_400Regular", "500": "Manrope_500Medium", "700": "Manrope_700Bold" },
  mono: { "400": "GeistMono_400Regular" },
};

describe("weightKey", () => {
  it("normalizes every RN weight spelling onto the hundreds", () => {
    expect(weightKey(undefined)).toBe("400");
    expect(weightKey("normal")).toBe("400");
    expect(weightKey("bold")).toBe("700");
    expect(weightKey("600")).toBe("600");
    expect(weightKey(550)).toBe("600");
    expect(weightKey("950")).toBe("900");
  });
});

describe("resolveFontFace", () => {
  it("leaves the style alone when nothing was registered", () => {
    expect(resolveFontFace(undefined, "500")).toBeNull();
    expect(resolveFontFace({}, "500")).toBeNull();
  });

  it("returns one family verbatim and keeps the weight on the style", () => {
    expect(resolveFontFace("Manrope", "700")).toEqual({ fontFamily: "Manrope", dropWeight: false });
  });

  it("picks the registered face for the weight and drops the weight", () => {
    expect(resolveFontFace(FACES.sans, "500")).toEqual({ fontFamily: "Manrope_500Medium", dropWeight: true });
  });

  it("falls to the nearest registered weight, heavier on a tie", () => {
    // 600 sits between 500 and 700: the heavier face reads as emphasis.
    expect(resolveFontFace(FACES.sans, "600")?.fontFamily).toBe("Manrope_700Bold");
    // 300 has only heavier neighbours.
    expect(resolveFontFace(FACES.sans, "300")?.fontFamily).toBe("Manrope_400Regular");
    // 900 has only lighter neighbours.
    expect(resolveFontFace(FACES.sans, "900")?.fontFamily).toBe("Manrope_700Bold");
  });
});

describe("fontStyle", () => {
  it("passes the style through untouched when the theme registered no faces", () => {
    const style = { fontSize: 14, fontWeight: "500" as const };
    expect(fontStyle(style, {})).toBe(style);
  });

  it("applies the sans face for the style's weight and removes the weight", () => {
    expect(fontStyle([{ fontSize: 14 }, { fontWeight: "500" }], FACES)).toEqual({ fontSize: 14, fontFamily: "Manrope_500Medium" });
  });

  it("keeps the weight when one family carries every weight", () => {
    expect(fontStyle({ fontWeight: "700" }, { sans: "Manrope" })).toEqual([{ fontWeight: "700" }, { fontFamily: "Manrope" }]);
  });

  it("substitutes the mono face where the kit asked for MONO_FONT, and only there", () => {
    expect(fontStyle({ fontFamily: MONO_FONT, fontSize: 13 }, FACES)).toEqual({ fontSize: 13, fontFamily: "GeistMono_400Regular" });
    // A caller's own explicit family is theirs.
    expect(fontStyle({ fontFamily: "Comic Sans" }, FACES)).toEqual({ fontFamily: "Comic Sans" });
    // No mono registered: the kit's alias stands.
    expect(fontStyle({ fontFamily: MONO_FONT }, { sans: "Manrope" })).toEqual({ fontFamily: MONO_FONT });
  });
});

describe("the themed primitives", () => {
  it("render every kit label in the registered face, from ThemeProvider fonts alone", () => {
    render(
      <ThemeProvider fonts={FACES}>
        <Text style={{ fontWeight: "700" }}>Plain</Text>
        <Button primary>Save</Button>
        <Typography h2>Title</Typography>
        <Typography code>--primary</Typography>
        <TextInput value="typed" onChangeText={() => {}} style={{ fontSize: 16 }} />
      </ThemeProvider>,
    );
    expect(getComputedStyle(screen.getByText("Plain")).fontFamily).toBe("Manrope_700Bold");
    expect(getComputedStyle(screen.getByText("Plain")).fontWeight).not.toBe("700");
    // Button labels are medium; the web skin's fontWeight resolves to the 500 face.
    expect(getComputedStyle(screen.getByText("Save")).fontFamily).toBe("Manrope_500Medium");
    // Typography titles are bold in the Dark Factory scale: the h2 role asks for 700.
    expect(getComputedStyle(screen.getByText("Title")).fontFamily).toBe("Manrope_700Bold");
    // The code role asks for MONO_FONT and gets the registered mono face.
    expect(getComputedStyle(screen.getByText("--primary")).fontFamily).toBe("GeistMono_400Regular");
    expect(getComputedStyle(screen.getByDisplayValue("typed")).fontFamily).toBe("Manrope_400Regular");
  });

  it("render in the system face when no fonts are passed, as before", () => {
    render(<ThemeProvider><Text>Plain</Text></ThemeProvider>);
    expect(getComputedStyle(screen.getByText("Plain")).fontFamily).not.toContain("Manrope");
  });

  it("name the brand faces the app is expected to register", () => {
    expect(typeface).toEqual({ sans: "Manrope", mono: "Geist Mono" });
  });
});
