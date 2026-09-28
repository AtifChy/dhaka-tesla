import { HttpStatus } from "@nestjs/common";

import { DomainException } from "../../common/errors/domain.exception";

export const RIDE_STATUSES = [
  "REQUESTED",
  "MATCHED",
  "DRIVER_ARRIVED",
  "STARTED",
  "COMPLETED",
  "CANCELED",
] as const;

export type RideStatus = (typeof RIDE_STATUSES)[number];

const allowedTransitions: Record<RideStatus, readonly RideStatus[]> = {
  REQUESTED: ["MATCHED", "CANCELED"],
  MATCHED: ["DRIVER_ARRIVED", "CANCELED"],
  DRIVER_ARRIVED: ["STARTED"],
  STARTED: ["COMPLETED"],
  COMPLETED: [],
  CANCELED: [],
};

export function assertTransition(from: RideStatus, to: RideStatus): void {
  if (!allowedTransitions[from].includes(to)) {
    throw new DomainException(
      HttpStatus.CONFLICT,
      "INVALID_TRANSITION",
      `Cannot change ride status from ${from} to ${to}`,
    );
  }
}
