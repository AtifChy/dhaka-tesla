import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const moneySchema = z.string().regex(/^\d+\.\d{2}$/);

export const rideResponseSchema = z.object({
  id: z.number().int().positive(),
  pickupZone: z.string(),
  destinationZone: z.string(),
  corridor: z.string(),
  distanceMeters: z.number().int().positive(),
  seatsRequested: z.number().int().positive(),
  status: z.enum(["REQUESTED", "MATCHED", "DRIVER_ARRIVED", "STARTED", "COMPLETED", "CANCELED"]),
  estimatedFare: moneySchema,
  quotedFare: moneySchema,
  currency: z.literal("BDT"),
  paymentMethod: z.enum(["CASH", "TESLAPAY"]),
  poolId: z.number().int().positive().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export class RideResponseDto extends createZodDto(rideResponseSchema) {}
export class RideListResponseDto extends createZodDto(z.array(rideResponseSchema)) {}
