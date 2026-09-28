import type { Models } from "../prisma/contract";
import type { RideResponseDto } from "./dto/ride-response.dto";

type RideRow = Pick<
  Models.public_Request,
  | "id"
  | "pickupZone"
  | "destinationZone"
  | "corridor"
  | "distanceMeters"
  | "seatsRequested"
  | "status"
  | "estimatedFare"
  | "quotedFare"
  | "paymentMethod"
  | "createdAt"
  | "updatedAt"
>;

export function toRideResponse(ride: RideRow, poolId: number | null): RideResponseDto {
  return {
    id: ride.id,
    pickupZone: ride.pickupZone,
    destinationZone: ride.destinationZone,
    corridor: ride.corridor,
    distanceMeters: ride.distanceMeters,
    seatsRequested: ride.seatsRequested,
    status: ride.status,
    estimatedFare: ride.estimatedFare,
    quotedFare: ride.quotedFare,
    currency: "BDT",
    paymentMethod: ride.paymentMethod,
    poolId,
    createdAt: ride.createdAt,
    updatedAt: ride.updatedAt,
  };
}
