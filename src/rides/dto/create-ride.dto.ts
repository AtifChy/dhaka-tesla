import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { ZONES } from "../domain/route-catalog";

const createRideSchema = z
  .object({
    pickupZone: z.enum(ZONES),
    destinationZone: z.enum(ZONES),
    seatsRequested: z.number().int().min(1).max(3),
    paymentMethod: z.enum(["CASH", "TESLAPAY"]),
  })
  .refine((value) => value.pickupZone !== value.destinationZone, {
    path: ["destinationZone"],
    message: "Pickup and destination must be different",
  });

export class CreateRideDto extends createZodDto(createRideSchema) {}
