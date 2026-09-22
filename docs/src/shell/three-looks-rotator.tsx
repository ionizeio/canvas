import { useState } from "react";
import { View, Text, Button, Row, Icon, Image, useTheme, useResponsive } from "@ionizeio/canvas";
import { useRouter } from "expo-router";
import { COMPONENTS } from "../core/data/components";
import { FIRST_EXAMPLE_CODE } from "../core/previews";
import { LOOKS_SHOTS, LOOKS_ASPECT } from "./looks-shots";
import { DeviceFrame } from "./device-frames";
import { sans, geistMono } from "../ui/fonts";
import { alpha } from "../ui/color";

// The landing page's comparison hero: full device-screen captures of each atom's docs
// page, taken on the iPhone 17 Pro simulator, the Android emulator retargeted to that
// same screen, and phone-width web, stepping alphabetically through every atom with a
// captured set on the reader's own chevrons (nothing advances or fades on its own).
// Baked images (not live renders) so each pane is the platform's true full-screen view,
// status bar and tab bar included; the drawn DeviceFrame supplies the bezel and camera
// cutout around it. The code chip and the "Open <Atom>" CTA follow the atom on stage.
// Regenerate the shots with `bun scripts/capture-looks.ts`.

// Width of the atom name + counter block between the chevrons. Fixed so the arrows stay
// put while stepping; sized past the longest atom name at the 17px semibold face.
const LABEL_W = 200;

const PLATFORMS = [
  { key: "ios", label: "iOS", device: "iPhone 17 Pro" },
  { key: "android", label: "Android", device: "Pixel 10 Pro" },
  { key: "web", label: "Web", device: "Chrome" },
] as const;

// The code chip quotes each atom's first example from the generated previews map (a
// few kilobytes of strings) rather than the component docs modules, which are the
// component pages' own chunks in the web export and have no business on the home page.
const ATOMS = COMPONENTS.filter((c) => c.category === "Atoms" && LOOKS_SHOTS[c.slug])
  .map((c) => ({ ...c, code: FIRST_EXAMPLE_CODE[c.dir ?? c.slug] }))
  .sort((a, b) => a.name.localeCompare(b.name));

// False on native, where looks-shots.ts resolves to the empty fallback map: the
// section is web-only (on a device you ARE the platform), and gating on the data
// keeps the home shell free of Platform branches.
export const LOOKS_AVAILABLE = ATOMS.length > 0;

// First line of the example's JSX, elided when the fence is longer: the chip is a
// scent of the API, the component page has the full code.
function codePreview(code: string) {
  const lines = code.split("\n");
  const first = lines[0].trim();
  const clipped = first.length > 64 ? `${first.slice(0, 63)}…` : first;
  return lines.length > 1 && clipped === first ? `${first} …` : clipped;
}

// LOOKS_AVAILABLE is the real gate (home.tsx checks it before rendering this); the
// repeat here is the safety net for any other call site, since the body below indexes
// ATOMS unconditionally. It sits in this hook-free shell rather than inside the body:
// an early return above a hook call makes every hook after it conditional, which is a
// rules-of-hooks violation and would break as soon as the shot map went from empty to
// populated (or back) within one bundle.
export function ThreeLooksRotator() {
  if (!LOOKS_AVAILABLE) return null; // shot map not generated for this platform
  return <Rotator />;
}

function Rotator() {
  const { tokens } = useTheme();
  const router = useRouter();
  const [index, setIndex] = useState(0);
  // Three columns above md (768), by the kit's viewport bucket (desktop on the server).
  const columns = useResponsive({ base: true, md: false });

  const atom = ATOMS[index % ATOMS.length];
  const shots = LOOKS_SHOTS[atom.slug];
  const code = atom.code;

  const step = (delta: number) => setIndex((i) => (i + delta + ATOMS.length) % ATOMS.length);

  return (
    <View style={{ gap: 20 }}>
      {/* Which atom is on stage, with manual controls. */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14 }}>
        <Button ghost small iconLeft={<Icon chevronLeft size={15} />} accessibilityLabel="Previous atom" onPress={() => step(-1)} />
        {/* Fixed width, not intrinsic: the name and the counter both change length as the
            carousel advances, and letting this block size to its content slides the
            chevrons out from under the cursor mid-cycle. LABEL_W clears the longest atom
            name ("Row & Column") with room to spare, and the name truncates rather than
            widening if a longer one is ever added. */}
        <Row snug center baseline style={{ width: LABEL_W }}>
          <Text
            numberOfLines={1}
            style={{ fontFamily: sans("600"), fontSize: 17, letterSpacing: -0.17, color: tokens.foreground, flexShrink: 1 }}
          >
            {atom.name}
          </Text>
          <Text style={{ fontFamily: geistMono("400"), fontSize: 12, color: tokens["muted-foreground"] }}>
            {(index % ATOMS.length) + 1}/{ATOMS.length}
          </Text>
        </Row>
        <Button ghost small iconLeft={<Icon chevronRight size={15} />} accessibilityLabel="Next atom" onPress={() => step(1)} />
      </View>

      {/* One phone pane per platform: three side-by-side columns on wide viewports,
          stacked when narrow. Each pane is an aspect-ratio container with an
          absolute-fill image (RNW ignores aspectRatio on an auto-height Image). */}
      <View style={{ flexDirection: columns ? "row" : "column", gap: 16, width: "100%", maxWidth: 1040, alignSelf: "center" }}>
        {PLATFORMS.map((p) => (
          <View key={p.key} style={{ flex: columns ? 1 : undefined, width: columns ? undefined : "100%", minWidth: 0 }}>
            <Text style={{ fontFamily: sans("600"), fontSize: 11, letterSpacing: 0.55, textTransform: "uppercase", color: tokens["muted-foreground"], textAlign: "center" }}>
              {p.label}
            </Text>
            <Text style={{ fontFamily: sans("400"), fontSize: 11, color: tokens["muted-foreground"], textAlign: "center", marginBottom: 8, opacity: 0.7 }}>
              {p.device}
            </Text>
            <DeviceFrame variant={p.key} aspect={LOOKS_ASPECT} label={p.device}>
              <Image
                cover
                source={shots[p.key]}
                accessibilityLabel={`The ${atom.name} docs page as it renders on ${p.label}`}
                style={{ width: "100%", height: "100%" }}
              />
            </DeviceFrame>
          </View>
        ))}
      </View>

      <View style={{ alignItems: "center", gap: 18 }}>
        {code ? (
          <View style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, backgroundColor: alpha(tokens.primary, 0.12), borderWidth: 1, borderColor: alpha(tokens.primary, 0.26), maxWidth: "100%" }}>
            <Text numberOfLines={1} style={{ fontFamily: geistMono("400"), fontSize: 12.5, color: tokens.primary }}>
              {codePreview(code)}
            </Text>
          </View>
        ) : null}
        <Row cozy wrap center>
          <Button primary large iconRight={<Icon arrowRight primaryForeground size={16} />} onPress={() => router.push("/components" as never)}>
            See every component live
          </Button>
          <Button outline large onPress={() => router.push(`/components/${atom.slug}` as never)}>
            Open {atom.name}
          </Button>
        </Row>
      </View>
    </View>
  );
}
