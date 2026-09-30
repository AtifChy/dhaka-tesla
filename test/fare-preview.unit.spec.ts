import { describe, expect, it } from "vitest";

import { calculatePooledFareBdt } from "../src/rides/domain/fare-policy";
import { estimateFareForSeats } from "../web/lib/fare";

describe("frontend fare preview", () => {
  it.each([1, 2, 3])("matches the backend booking total for %i seats", (seatsRequested) => {
    for (const distanceMeters of [3_000, 2_500, 1_001]) {
      const perSeatFare = calculatePooledFareBdt(distanceMeters);
      expect(estimateFareForSeats(perSeatFare, seatsRequested)).toBe(
        calculatePooledFareBdt(distanceMeters, seatsRequested),
      );
    }
  });

  it("preserves fractional taka when multiplying a quote", () => {
    expect(estimateFareForSeats("123.40", 3)).toBe("370.20");
  });
});
