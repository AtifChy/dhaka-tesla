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
