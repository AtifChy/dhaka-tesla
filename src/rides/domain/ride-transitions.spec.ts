import { describe, expect, it } from "vitest";

import { assertTransition } from "./ride-transitions";

describe("ride transitions", () => {
  it.each([
    ["REQUESTED", "MATCHED"],
    ["REQUESTED", "CANCELED"],
    ["MATCHED", "DRIVER_ARRIVED"],
    ["MATCHED", "CANCELED"],
    ["DRIVER_ARRIVED", "STARTED"],
    ["STARTED", "COMPLETED"],
  ] as const)("allows %s -> %s", (from, to) => {
    expect(() => assertTransition(from, to)).not.toThrow();
  });

  it.each([
    ["REQUESTED", "COMPLETED"],
    ["MATCHED", "COMPLETED"],
    ["COMPLETED", "CANCELED"],
    ["CANCELED", "MATCHED"],
  ] as const)("rejects %s -> %s", (from, to) => {
    expect(() => assertTransition(from, to)).toThrow(/Cannot change ride status/);
  });
});
