import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const statusSchema = z.enum([
  "REQUESTED",
  "MATCHED",
  "DRIVER_ARRIVED",
  "STARTED",
  "COMPLETED",
  "CANCELED",
]);
const moneySchema = z.string().regex(/^\d+\.\d{2}$/);

export const vehicleResponseSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  capacity: z.number().int().positive(),
  isOnline: z.boolean(),
});

export const availableRequestSchema = z.object({
  id: z.number().int().positive(),
  passengerName: z.string(),
  pickupZone: z.string(),
  destinationZone: z.string(),
  corridor: z.string(),
  seatsRequested: z.number().int().positive(),
  estimatedFare: moneySchema,
  currency: z.literal("BDT"),
});

export const poolMemberSchema = z.object({
  requestId: z.number().int().positive(),
  passengerName: z.string(),
  destinationZone: z.string(),
  seats: z.number().int().positive(),
  fare: moneySchema,
  currency: z.literal("BDT"),
});

export const poolResponseSchema = z.object({
  id: z.number().int().positive(),
  vehicleId: z.number().int().positive(),
  vehicleName: z.string(),
  status: statusSchema,
  pickupZone: z.string(),
  corridor: z.string(),
  capacity: z.number().int().positive(),
  occupiedSeats: z.number().int().nonnegative(),
  members: z.array(poolMemberSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export class VehicleResponseDto extends createZodDto(vehicleResponseSchema) {}
export class AvailableRequestsResponseDto extends createZodDto(z.array(availableRequestSchema)) {}
export class PoolResponseDto extends createZodDto(poolResponseSchema) {}
export class PoolListResponseDto extends createZodDto(z.array(poolResponseSchema)) {}
