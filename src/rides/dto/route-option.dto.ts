import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const routeOptionSchema = z.object({
  pickupZone: z.string(),
  destinationZone: z.string(),
  distanceMeters: z.number().int().positive(),
  corridor: z.string(),
  estimatedFare: z.string().regex(/^\d+\.\d{2}$/),
  currency: z.literal("BDT"),
});

export class RouteOptionsResponseDto extends createZodDto(z.array(routeOptionSchema)) {}
