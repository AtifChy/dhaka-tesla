import { describe, expect, it } from "vitest";

import { findRoute, ROUTES, ZONES } from "./route-catalog";

describe("route catalog", () => {
  it("offers every documented zone as both a pickup and destination", () => {
    expect(ZONES).toHaveLength(13);
    expect(ROUTES).toHaveLength(34);

    for (const zone of ZONES) {
      expect(ROUTES.some((route) => route.pickupZone === zone)).toBe(true);
      expect(ROUTES.some((route) => route.destinationZone === zone)).toBe(true);
    }
  });

  it("keeps Nusrat and Rafiq compatible with hand-testable distances", () => {
    expect(findRoute("BANANI", "MOHAKHALI")).toEqual({
      pickupZone: "BANANI",
      destinationZone: "MOHAKHALI",
      distanceMeters: 3_000,
      corridor: "BANANI_NORTH",
    });
    expect(findRoute("BANANI", "GULSHAN_1")).toEqual({
      pickupZone: "BANANI",
      destinationZone: "GULSHAN_1",
      distanceMeters: 2_500,
      corridor: "BANANI_NORTH",
    });
  });

  it("contains no duplicate directions or invalid distances", () => {
    const routeKeys = ROUTES.map((route) => `${route.pickupZone}:${route.destinationZone}`);

    expect(new Set(routeKeys).size).toBe(routeKeys.length);
    expect(ROUTES.every((route) => Number.isInteger(route.distanceMeters))).toBe(true);
    expect(ROUTES.every((route) => route.distanceMeters > 0)).toBe(true);
  });
});
