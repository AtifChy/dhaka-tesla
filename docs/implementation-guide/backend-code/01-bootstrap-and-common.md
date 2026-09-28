# 01 - Bootstrap, configuration, errors, and authorization

## Packages

The backend uses `@nestjs/platform-fastify`, `nestjs-zod`, Passport JWT, Argon2, `@nestjs/swagger`, `@fastify/static`, `@fastify/helmet`, and `@fastify/rate-limit`. See `package.json` and `bun.lock` for the exact installed versions.

## `.env.example`

```dotenv
NODE_ENV="development"
DATABASE_URL="postgresql://dhaka_tesla:dhaka_tesla_dev@localhost:5432/dhaka_tesla"
POSTGRES_PORT=5432
PORT=3000
HOST="localhost"
JWT_ACCESS_SECRET="replace-with-at-least-32-random-characters"
CORS_ORIGIN="http://localhost:3001"
API_PORT=3000
```

## `src/config/env.ts`

```ts
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default("localhost"),
  DATABASE_URL: z.url(),
  JWT_ACCESS_SECRET: z.string().min(32).max(128),
  CORS_ORIGIN: z.url().default("http://localhost:3001"),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(env: Record<string, unknown>): Env {
  return envSchema.parse(env);
}
```

Invalid or missing production configuration fails during startup rather than during the first request.

## Common authorization files

- `src/common/auth/auth-user.ts` defines `{ id, email, role }` attached by Passport.
- `src/common/auth/public.decorator.ts` marks health/register/login as exceptions to private-by-default auth.
- `src/common/auth/current-user.decorator.ts` reads the typed request user.
- `src/common/auth/roles.decorator.ts` declares required roles.
- `src/common/auth/roles.guard.ts` compares the authenticated database-backed role with route metadata.

## Common error files

- `src/common/errors/domain.exception.ts` carries stable domain code, HTTP status, and safe message.
- `src/common/errors/api-exception.filter.ts` converts validation, authentication, authorization, conflict, not-found, and unexpected errors to one envelope containing `error`, `requestId`, and `timestamp`.

The filter logs 5xx failures with method, URL, and stack, while returning a generic message to clients.

## `src/prisma.service.ts`

```ts
import { Injectable, type OnApplicationShutdown, type OnModuleInit } from "@nestjs/common";

import { connectDatabase, db } from "./prisma/db";

@Injectable()
export class PrismaService implements OnModuleInit, OnApplicationShutdown {
  readonly db = db;

  async onModuleInit() {
    await connectDatabase();
  }

  async onApplicationShutdown() {
    await this.db.close();
  }
}
```

## `src/prisma.module.ts`

```ts
import { Global, Module } from "@nestjs/common";

import { PrismaService } from "./prisma.service";

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

These files live directly under `src/`, while the contract/runtime/seed live under `src/prisma/`.

## `src/app.controller.ts`

```ts
import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { Public } from "./common/auth/public.decorator";

@ApiTags("health")
@Controller()
export class AppController {
  @Public()
  @Get("health")
  health() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }
}
```

## `src/app.module.ts`

```ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";
import { ZodSerializerInterceptor, ZodValidationPipe } from "nestjs-zod";

import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";
import { RolesGuard } from "./common/auth/roles.guard";
import { ApiExceptionFilter } from "./common/errors/api-exception.filter";
import { validateEnv } from "./config/env";
import { DriverModule } from "./driver/driver.module";
import { PrismaModule } from "./prisma.module";
import { RidesModule } from "./rides/rides.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
    PrismaModule,
    AuthModule,
    RidesModule,
    DriverModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule {}
```

## `src/main.ts`

```ts
import "reflect-metadata";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { cleanupOpenApiDoc } from "nestjs-zod";

import { AppModule } from "./app.module";
import type { Env } from "./config/env";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true, trustProxy: true }),
  );
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.enableShutdownHooks();
  app.setGlobalPrefix("api/v1");
  app.enableCors({
    origin: config.get("CORS_ORIGIN", { infer: true }),
    credentials: false,
    methods: ["GET", "POST", "PATCH", "DELETE"],
  });
  await app.register(helmet);
  await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Dhaka Tesla Pool API")
    .setDescription("Passenger pooling and driver lifecycle API")
    .setVersion("1.0.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, cleanupOpenApiDoc(document));

  await app.listen(config.get("PORT", { infer: true }), config.get("HOST", { infer: true }));
}

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
```

The checked-in `src/main.ts` also prints the final URL. Swagger is available at `/docs` and its OpenAPI JSON at `/docs-json`.
