import { MaterialsBody } from "../../../../../examples/starter/smoke/fixtures/materials";
import { Page } from "../../../ui/page";
import { useLocalSearchParams } from "expo-router";
import { ThemeProvider } from "@ionizeio/canvas";
import { LiquidGeometryProbe } from "../../../ui/testing/liquid-geometry";

export default function MaterialLifecycleFixture() {
  const params = useLocalSearchParams<{ geometry?: string; mode?: string; scheme?: string }>();
  if (params.geometry === "1") return <ThemeProvider solid>
    <Page viewportOverlays><LiquidGeometryProbe initialGlass={params.mode === "glass"} dark={params.scheme === "dark"} /></Page>
  </ThemeProvider>;
  return <Page viewportOverlays><MaterialsBody /></Page>;
}
