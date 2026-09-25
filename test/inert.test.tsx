import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { version } from "react";
import { View } from "react-native";
import { inertProps } from "../src/style/inert.ts";

afterEach(cleanup);

describe("inertProps", () => {
  it("spells inert the way each supported React major writes it to the DOM", () => {
    // React 19 writes `true` and drops "" (warning); React 18 drops `true` (warning) and
    // writes "". Either wrong spelling leaves the subtree focusable.
    expect(inertProps("19.2.7")).toEqual({ inert: true } as never);
    expect(inertProps("20.0.0")).toEqual({ inert: true } as never);
    expect(inertProps("19.3.0-canary-a1b2c3d4-20260901")).toEqual({ inert: true } as never);
    expect(inertProps("0.0.0-experimental-a1b2c3d4-20260901")).toEqual({ inert: true } as never);
    expect(inertProps("18.3.1")).toEqual({ inert: "" } as never);
  });

  it("puts the attribute on a react-native-web View under the installed React, without a warning", () => {
    const errors = spyOn(console, "error");
    try {
      const { getByTestId } = render(<View testID="layer" {...inertProps()} />);
      expect(getByTestId("layer").hasAttribute("inert")).toBe(true);
      expect(Number.parseInt(version, 10)).toBeGreaterThanOrEqual(19);
      expect(errors).not.toHaveBeenCalled();
    } finally {
      errors.mockRestore();
    }
  });
});
