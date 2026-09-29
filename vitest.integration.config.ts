import { defineConfig } from "vitest/config";

const databaseUrl = process.env.DATABASE_URL;
const localHosts = new Set(["localhost", "127.0.0.1", "postgres"]);
if (!databaseUrl || !localHosts.has(new URL(databaseUrl).hostname)) {
  throw new Error("Integration tests require a local PostgreSQL DATABASE_URL");
}

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.integration.spec.ts"],
    fileParallelism: false,
  },
});
