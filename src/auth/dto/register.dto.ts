import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(10).max(128),
});

const registerDriverSchema = registerSchema.extend({
  vehicleName: z.string().trim().min(2).max(80),
  vehicleCapacity: z.number().int().min(1).max(6),
});

export class RegisterDto extends createZodDto(registerSchema) {}
export class RegisterDriverDto extends createZodDto(registerDriverSchema) {}
