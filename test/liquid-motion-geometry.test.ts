import { describe, expect, it } from "bun:test";
import { liquidTravel } from "../src/style/liquid-motion-geometry.ts";

const bounds = { x: 0, y: 0, width: 80, height: 20 };

describe("directional liquid geometry", () => {
  it("normalizes horizontal and vertical travel to their measured extent", () => {
    const across = liquidTravel(bounds, { ...bounds, x: 80 }, 16, false, false);
    const down = liquidTravel(bounds, { ...bounds, y: 20 }, 16, false, false);
    expect(across.direction).toEqual({ horizontal: 1, vertical: 0 });
    expect(down.direction).toEqual({ horizontal: 0, vertical: 1 });
    expect(across.impulse).toBe(18);
    expect(down.impulse).toBe(18);
    expect(liquidTravel(bounds, { ...bounds, x: -80 }, 16, false, false)).toEqual(across);
    expect(liquidTravel(bounds, { ...bounds, y: -20 }, 16, false, false)).toEqual(down);
  });

  it("projects diagonal travel into bounded direction weights", () => {
    const travel = liquidTravel(bounds, { ...bounds, x: 30, y: 40 }, 16, false, false);
    expect(travel.direction.horizontal).toBeCloseTo(0.36, 8);
    expect(travel.direction.vertical).toBeCloseTo(0.64, 8);
    expect(travel.direction.horizontal + travel.direction.vertical).toBeCloseTo(1, 8);
    expect(travel.impulse).toBeCloseTo(18 * 50 / Math.hypot(80 * 0.6, 20 * 0.8), 8);
  });

  it("does not interpret changing width or height as directional travel", () => {
    const previousDirection = { horizontal: 0, vertical: 1 };
    expect(liquidTravel(bounds, { ...bounds, width: 100, height: 36 }, 16, false, false, previousDirection))
      .toEqual({ direction: previousDirection, impulse: 0 });
  });

  it("couples pointer impulse to bounded sample time and clamps distant jumps", () => {
    const next = { ...bounds, x: 20 };
    expect(liquidTravel(bounds, next, 8, true, true).impulse).toBe(9);
    expect(liquidTravel(bounds, next, 16, true, true).impulse).toBe(4.5);
    expect(liquidTravel(bounds, next, 64, true, true).impulse).toBe(1.125);
    expect(liquidTravel(bounds, next, 0, true, true).impulse).toBe(9);
    expect(liquidTravel(bounds, next, 1000, true, true).impulse).toBe(1.125);
    expect(liquidTravel(bounds, { ...bounds, x: 10000, y: 10000 }, 0, true, true).impulse).toBe(22.5);
    expect(liquidTravel(bounds, next, 16, true, false).impulse).toBe(0);
  });

  it("keeps selection impulse independent of time spent resting", () => {
    const next = { ...bounds, x: 40 };
    expect(liquidTravel(bounds, next, 8, false, false)).toEqual(liquidTravel(bounds, next, 60000, false, false));
    expect(liquidTravel({ ...bounds, width: 0, height: 0 }, { x: 10, y: 10, width: 0, height: 0 }, 0, true, true).impulse).toBe(22.5);
  });
});
