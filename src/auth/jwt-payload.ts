import { z } from "zod";

import type { Role } from "../common/auth/auth-user";

export const accessTokenPayloadSchema = z.object({
  sub: z.number().int().positive(),
  email: z.email(),
  role: z.enum<Role[]>(["PASSENGER", "DRIVER"]),
});

export type AccessTokenPayload = z.infer<typeof accessTokenPayloadSchema>;

export const verifiedAccessTokenSchema = accessTokenPayloadSchema.extend({
  iat: z.number().int().nonnegative(),
  exp: z.number().int().positive(),
});
