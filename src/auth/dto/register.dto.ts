import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(10).max(128),
});

export class RegisterDto extends createZodDto(registerSchema) {}
