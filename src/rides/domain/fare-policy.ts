const BASE_FARE_POYSHA = 8_000;
const PER_KM_POYSHA = 2_000;
const POOLED_PERCENT = 80;

export function calculatePooledFarePoysha(distanceMeters: number): number {
  if (!Number.isInteger(distanceMeters) || distanceMeters <= 0) {
    throw new Error("distanceMeters must be a positive integer");
  }

  const distanceCharge = Math.round((distanceMeters * PER_KM_POYSHA) / 1_000);
  const soloFare = BASE_FARE_POYSHA + distanceCharge;
  return Math.round((soloFare * POOLED_PERCENT) / 100);
}

export function poyshaToBdt(poysha: number): string {
  if (!Number.isSafeInteger(poysha) || poysha < 0) {
    throw new Error("poysha must be a non-negative safe integer");
  }

  return `${Math.floor(poysha / 100)}.${String(poysha % 100).padStart(2, "0")}`;
}

export function calculatePooledFareBdt(distanceMeters: number): string {
  return poyshaToBdt(calculatePooledFarePoysha(distanceMeters));
}
