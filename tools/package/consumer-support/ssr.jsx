import React from "react";
import { renderToString } from "react-dom/server";
import {
  AlertDialog, Autocomplete, Dialog, OverlayProvider, Select, ThemeProvider, Typography,
} from "@ionizeio/canvas";

if (typeof window !== "undefined" || typeof document !== "undefined") {
  throw new Error("The SSR compatibility fixture must run without browser globals");
}
const errors = [];
const original = console.error;
console.error = (...args) => { errors.push(args.map(String).join(" ")); };
let html;
try {
  html = renderToString(
    <ThemeProvider>
      <OverlayProvider>
        <Typography>Server compatibility content</Typography>
        <Dialog open={false} title="Closed dialog" trigger="Open server dialog" />
        <AlertDialog open={false} title="Closed alert" trigger="Open server alert" />
        <Autocomplete options={["Apple", "Pear"]} placeholder="Server fruit" />
        <Select options={["Montreal", "Toronto"]} placeholder="Server city" />
        <Dialog open title="Visible server dialog" />
      </OverlayProvider>
    </ThemeProvider>,
  );
} finally {
  console.error = original;
}
const layoutWarnings = errors.filter(message => /useLayoutEffect.*server/i.test(message));
if (layoutWarnings.length) {
  throw new Error(`Shared effects warned during SSR:\n${layoutWarnings.join("\n")}`);
}
if (errors.length) throw new Error(`Unexpected server-rendering errors:\n${errors.join("\n")}`);
for (const text of ["Server compatibility content", "Open server dialog", "Open server alert", "Visible server dialog", "Server fruit"]) {
  if (!html.includes(text)) throw new Error(`Missing server-rendered content: ${text}`);
}
console.log(JSON.stringify({ reactVersion: React.version, htmlLength: html.length, layoutWarnings: layoutWarnings.length }));
