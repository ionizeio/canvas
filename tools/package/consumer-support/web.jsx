import React, { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import * as Canvas from "@ionizeio/canvas";

// Retain every runtime export so a named-only bundle cannot hide broken imports.
window.canvasExports = Canvas;
window.canvasReactVersion = React.version;
function Consumer() {
  const [name, setName] = useState("");
  const [city, setCity] = useState("Toronto");
  const [subscribed, setSubscribed] = useState(false);
  const [saved, setSaved] = useState("");
  const field = useRef(null);
  return <Canvas.ThemeProvider light>
    <Canvas.OverlayProvider>
      <Canvas.Column padLoose relaxed>
        <Canvas.Typography h1>Consumer compatibility</Canvas.Typography>
        <Canvas.Form submitLabel="Save workspace" onSubmit={() => setSaved(`${name}: ${city}: ${subscribed ? "subscribed" : "unsubscribed"}`)}>
          <Canvas.Input ref={field} label="Workspace" value={name} onChangeText={setName} />
          <Canvas.Select label="City" options={["Toronto", "Montreal"]} value={city} onSelect={setCity} />
          <Canvas.Checkbox checked={subscribed} onChange={setSubscribed}>Subscribe to updates</Canvas.Checkbox>
        </Canvas.Form>
        <Canvas.Button onPress={() => field.current?.focus()}>Focus workspace</Canvas.Button>
        <Canvas.Typography testID="saved-workspace">{saved || "Nothing saved"}</Canvas.Typography>
        <Canvas.QRCode value="https://canvas.nannier.com" accessibilityLabel="Optional QR renderer fallback" small />
      </Canvas.Column>
    </Canvas.OverlayProvider>
  </Canvas.ThemeProvider>;
}
createRoot(document.getElementById("root")).render(<Consumer />);
