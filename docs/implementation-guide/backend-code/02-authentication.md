# 02 - Authentication

The implementation uses stateless 15-minute access tokens. Passport verifies signature, issuer, audience, and expiry; `JwtStrategy.validate()` then validates all claims and reloads the user from PostgreSQL so a deleted user or changed email/role invalidates the token.

## Files

- `src/auth/dto/register.dto.ts`, `login.dto.ts`, `auth-response.dto.ts` - Zod boundary schemas.
- `src/auth/password.service.ts` - Argon2id hash/verify.
- `src/auth/jwt-payload.ts` - signed and verified claim schemas.
- `src/auth/jwt.strategy.ts` - Passport verification plus database user check.
- `src/auth/jwt-auth.guard.ts` - global private-by-default guard with `@Public()` escape hatch.
- `src/auth/auth.service.ts`, `auth.controller.ts`, `auth.module.ts` - use cases and routes.

## `src/auth/dto/register.dto.ts`

Registration uses separate commands instead of trusting an arbitrary role string. `/auth/register` always creates a passenger. `/auth/register/driver` requires vehicle details and creates the driver plus their initially offline vehicle in one transaction.

```ts
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
```

## `src/auth/jwt-payload.ts`

`iat` is issued-at time and `exp` is expiry time, both NumericDate seconds. `passport-jwt` enforces `exp`; requiring both fields also rejects malformed tokens.

```ts
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
```

## `src/auth/jwt.strategy.ts`

```ts
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

import type { AuthUser } from "../common/auth/auth-user";
import type { Env } from "../config/env";
import { PrismaService } from "../prisma.service";
import { verifiedAccessTokenSchema } from "./jwt-payload";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get("JWT_ACCESS_SECRET", { infer: true }),
      issuer: "dhaka-tesla-pool",
      audience: "web",
    });
  }

  async validate(untrustedPayload: unknown): Promise<AuthUser> {
    const parsed = verifiedAccessTokenSchema.safeParse(untrustedPayload);
    if (!parsed.success) throw new UnauthorizedException("Invalid access token payload");

    const payload = parsed.data;
    const user = await this.prisma.db.orm.public.User.select("id", "email", "role")
      .where({ id: payload.sub })
      .first();

    if (!user || user.email !== payload.email || user.role !== payload.role) {
      throw new UnauthorizedException("Access token no longer valid");
    }

    return { id: user.id, email: user.email, role: user.role };
  }
}
```

This deliberately does not add a `Session` table. The assignment requires authentication and authorization, not refresh tokens, multi-device sessions, or immediate server-side revocation. Add stateful sessions only if those requirements are introduced.

## Registration rules in `src/auth/auth.service.ts`

```ts
const user = await this.prisma.db.orm.public.User.select("id", "name", "email", "role").create({
  name: input.name,
  email: input.email,
  passwordHash,
  role: "PASSENGER",
});
```

Driver registration keeps the user and required vehicle consistent:

```ts
const user = await this.prisma.db.transaction(async (transaction) => {
  const created = await transaction.orm.public.User.select("id", "name", "email", "role").create({
    name: input.name,
    email: input.email,
    passwordHash,
    role: "DRIVER",
  });

  await transaction.orm.public.Vehicle.create({
    driverId: created.id,
    name: input.vehicleName,
    capacity: input.vehicleCapacity,
    isOnline: false,
  });

  return created;
});
```

This demo allows public driver signup so the evaluator can exercise both roles without database access. A production service would normally add driver/vehicle verification before activation.

Login always returns the same generic `Invalid email or password` response for missing users and bad passwords, avoiding account enumeration.

## Routes

```text
POST /api/v1/auth/register         public, creates PASSENGER
POST /api/v1/auth/register/driver  public, creates DRIVER + Vehicle
POST /api/v1/auth/login            public, returns bearer token
GET  /api/v1/auth/me               authenticated, returns current token identity
```

Swagger marks only `/auth/me` with bearer authentication; public endpoints remain unlocked in the API document.
