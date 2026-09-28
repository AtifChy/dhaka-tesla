# Step 4 - authentication, validation, errors, and Swagger

## Module layout

```text
src/modules/auth/
  auth.module.ts
  auth.controller.ts
  auth.service.ts
  dto/login.dto.ts
  dto/register.dto.ts
  jwt.strategy.ts
src/common/auth/
  authenticated-user.ts
  current-user.decorator.ts
  jwt-auth.guard.ts
  roles.decorator.ts
  roles.guard.ts
src/common/errors/
  api-exception.ts
  api-exception.filter.ts
```

## DTO validation with `nestjs-zod`

```ts
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const RegisterSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
  password: z.string().min(10).max(128),
  role: z.enum(["PASSENGER", "DRIVER"]),
});

export class RegisterDto extends createZodDto(RegisterSchema) {}

const LoginSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
});

export class LoginDto extends createZodDto(LoginSchema) {}
```

Register `ZodValidationPipe` globally. Define response DTOs and use `ZodSerializerInterceptor` so `passwordHash` cannot leak through accidental object spreading.

## Passwords and JWT

Hash registration passwords with the same Argon2id settings as the seed. Never compare raw hashes manually; use `argon2.verify`.

Use a small JWT payload and describe it with a runtime schema. A TypeScript interface alone disappears at runtime and validates nothing:

```ts
const AccessTokenPayloadSchema = z.object({
  sub: z.number().int().positive(),
  email: z.email(),
  role: z.enum(["PASSENGER", "DRIVER"]),
});

export type AccessTokenPayload = z.infer<typeof AccessTokenPayloadSchema>;
```

Do not put mutable profile data, password hashes, vehicle data, fares, or permissions in the token.

Passport JWT performs token extraction, signature verification, and expiration verification before invoking the strategy's `validate()` hook. The hook is required by Passport; use it to validate application claims and build the authenticated principal:

```ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("JWT_SECRET"),
    });
  }

  validate(payload: unknown): AuthenticatedUser {
    const result = AccessTokenPayloadSchema.safeParse(payload);

    if (!result.success) {
      throw new UnauthorizedException("Invalid access token");
    }

    return {
      id: result.data.sub,
      email: result.data.email,
      role: result.data.role,
    };
  }
}
```

Import `ConfigService` as a runtime value, not with `import type`, because Nest needs its constructor metadata for dependency injection.

This remains stateless: a correctly signed token for a subsequently deleted user stays valid until expiry. For immediate account disabling or always-fresh roles, make `validate()` asynchronous, load the user by `sub`, reject a missing/disabled account, and return the role from the database. For this MVP, short-lived tokens plus runtime claim validation are acceptable if that trade-off is documented.

## Authorization layers

1. `JwtAuthGuard`: valid signed, unexpired access token.
2. `RolesGuard`: passenger versus driver route.
3. Service ownership predicate: the authenticated user owns this exact request, pool, or vehicle.

An ownership query must include both IDs. For example, a passenger lookup conceptually uses:

```text
request.id = :requestId AND request.passengerId = :authenticatedUserId
```

Return `404` for another user's private resource so the API does not confirm that it exists.

## Auth endpoints

```text
POST /v1/auth/register
POST /v1/auth/login
GET  /v1/auth/me
```

Return a generic login error for unknown email and wrong password. Rate-limit registration and login. A driver approval process is outside this assignment; document that role selection is allowed for demo purposes.

## Swagger/OpenAPI

Swagger is worthwhile because it gives the evaluator an API index and manual test surface. With Fastify, install both `@nestjs/swagger` and `@fastify/static`.

Bootstrap outline:

```ts
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { cleanupOpenApiDoc, ZodValidationPipe } from "nestjs-zod";

app.setGlobalPrefix("v1");
app.useGlobalPipes(new ZodValidationPipe());

if (process.env.ENABLE_SWAGGER === "true") {
  const config = new DocumentBuilder()
    .setTitle("Dhaka Tesla Pool API")
    .setVersion("1.0.0")
    .addBearerAuth()
    .build();

  const documentFactory = () => cleanupOpenApiDoc(SwaggerModule.createDocument(app, config));

  SwaggerModule.setup("docs", app, documentFactory, {
    useGlobalPrefix: true,
  });
}
```

Decorate protected controllers with `@ApiBearerAuth()`. Enable Swagger locally and in a controlled demo deployment; disable or protect it for an unrestricted production environment.

## Error handling and security

- Global exception filter returns the stable envelope from Step 2.
- Log request ID, route, method, status, latency, user ID when known, and error code.
- Never log authorization headers, cookies, JWTs, passwords, hashes, or database URLs.
- Configure CORS to `WEB_ORIGIN`, not `*` with credentials.
- Register Helmet and API rate limiting with Fastify-compatible plugins.
- Do not expose stack traces in production responses.

## Suggested commits

```text
feat(auth): add zod registration and login DTOs
feat(auth): issue and verify passport JWT access tokens
feat(authz): enforce roles and resource ownership
docs(api): expose authenticated swagger documentation
```

## Acceptance gate

- Registration stores only an Argon2id hash.
- Bad credentials, malformed JWTs, and expired JWTs return `401`.
- Wrong roles return `403`; foreign private resources return `404`.
- Invalid DTOs return stable `VALIDATION_ERROR` responses.
- Swagger shows schemas, errors, and the bearer Authorize button.
- No response or log contains `passwordHash` or a token.
