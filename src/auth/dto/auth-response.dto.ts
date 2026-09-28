import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import type { Role } from "../../common/auth/auth-user";

export const authResponseSchema = z.object({
  accessToken: z.string().min(1).max(512),
  tokenType: z.literal("Bearer"),
  expiresInSeconds: z.literal(900), // 15 minutes
  user: z.object({
    id: z.number().int().positive(),
    name: z.string(),
    email: z.email(),
    role: z.enum<Role[]>(["PASSENGER", "DRIVER"]),
  }),
});

export class AuthResponseDto extends createZodDto(authResponseSchema) {}

export class AuthUserResponseDto extends createZodDto(
  z.object({
    id: z.number().int().positive(),
    email: z.email(),
    role: z.enum<Role[]>(["PASSENGER", "DRIVER"]),
  }),
) {}
