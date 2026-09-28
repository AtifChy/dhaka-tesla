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
  const port = config.get("PORT", { infer: true });
  const host = config.get("HOST", { infer: true });

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

  await app.listen(port, host);
  console.log(`Server running at http://${host}:${port}/api/v1`);
}

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
