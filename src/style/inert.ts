import { version } from "react";
import { type ViewProps } from "react-native";

// `inert` for a View: on the web, the HTML attribute that takes a subtree out of the tab
// order and the accessibility tree and stops it taking presses. react-native-web forwards
// the prop to the DOM untouched, so the value is React DOM's to read, and the two React
// majors the kit supports read it oppositely: React 19 knows `inert` as a boolean
// attribute (it writes `true` and drops the empty string, with a warning), while React 18
// does not (it drops `true`, with a warning, and writes the empty string). React's
// experimental builds, versioned 0.0.0-experimental-..., read it as React 19 does.
// React Native has no such prop and drops it.
export function inertProps(reactVersion: string = version): ViewProps {
  const react18 = Number.parseInt(reactVersion, 10) === 18;
  return { inert: react18 ? "" : true } as unknown as ViewProps;
}
