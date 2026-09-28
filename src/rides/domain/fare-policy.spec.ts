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
});
