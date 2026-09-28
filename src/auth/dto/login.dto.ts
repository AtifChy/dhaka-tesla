import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const loginSchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1).max(128),
});

export class LoginDto extends createZodDto(loginSchema) {}
