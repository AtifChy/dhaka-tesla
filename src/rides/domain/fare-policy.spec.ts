import { describe, expect, it } from "vitest";

import { calculatePooledFareBdt, calculatePooledFarePoysha, poyshaToBdt } from "./fare-policy";

describe("fare policy", () => {
  it("calculates Nusrat's trip", () => {
    expect(calculatePooledFarePoysha(3_000)).toBe(11_200);
    expect(calculatePooledFareBdt(3_000)).toBe("112.00");
  });

  it("calculates Rafiq's trip", () => {
    expect(calculatePooledFarePoysha(2_500)).toBe(10_400);
    expect(calculatePooledFareBdt(2_500)).toBe("104.00");
  });

  it("formats money with two decimal places", () => {
    expect(poyshaToBdt(12_340)).toBe("123.40");
  });

  it.each([
    [3_000, 1, "112.00"],
    [3_000, 2, "224.00"],
    [3_000, 3, "336.00"],
    [2_500, 1, "104.00"],
    [2_500, 2, "208.00"],
    [2_500, 3, "312.00"],
  ])("quotes %i metres for %i seats as %s BDT", (distanceMeters, seatsRequested, expected) => {
    expect(calculatePooledFareBdt(distanceMeters, seatsRequested)).toBe(expected);
  });

  it("rounds the per-seat fare before multiplying seats", () => {
    expect(calculatePooledFarePoysha(1_001, 1)).toBe(8_002);
    expect(calculatePooledFarePoysha(1_001, 3)).toBe(24_006);
  });

  it.each([0, -1, 1.5, 4, NaN, Infinity])("rejects invalid seat count %s", (seatsRequested) => {
    expect(() => calculatePooledFareBdt(3_000, seatsRequested)).toThrow(/seatsRequested/);
  });
});
