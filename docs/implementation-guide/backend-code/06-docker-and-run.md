# 06 - Docker and final backend run

The checked-in Compose stack starts PostgreSQL, runs migrations and the idempotent seed in a one-shot container, and starts the API only after initialization succeeds.

## `Dockerfile`

```dockerfile
FROM oven/bun:1.4.2-alpine

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run contract:emit && bun run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["bun", "dist/server.mjs"]
```

## `.dockerignore`

```dockerignore
.git
.gitignore
.env
.alchemy
.prisma-composer
coverage
dist
docs
node_modules
npm-debug.log*
bun-error.log*
```

## `docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:18-alpine
    container_name: dhaka-tesla-postgres
    restart: always
    environment:
      POSTGRES_DB: dhaka_tesla
      POSTGRES_USER: dhaka_tesla
      POSTGRES_PASSWORD: dhaka_tesla_dev
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
    volumes:
      - dhaka_tesla_postgres_data:/var/lib/postgresql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dhaka_tesla -d dhaka_tesla"]
      interval: 5s
      timeout: 3s
      retries: 10

  migrate:
    build:
      context: .
    image: dhaka-tesla-pool-api:local
    command: ["sh", "-c", "bun run migrate && bun run db:seed"]
    environment: &api-environment
      NODE_ENV: production
      DATABASE_URL: postgresql://dhaka_tesla:dhaka_tesla_dev@postgres:5432/dhaka_tesla
      PORT: 3000
      HOST: 0.0.0.0
      JWT_ACCESS_SECRET: ${JWT_ACCESS_SECRET:-development-only-change-this-secret-1234}
      CORS_ORIGIN: ${CORS_ORIGIN:-http://localhost:5173}
    depends_on:
      postgres:
        condition: service_healthy
    restart: "no"

  api:
    build:
      context: .
    image: dhaka-tesla-pool-api:local
    environment: *api-environment
    ports:
      - "${API_PORT:-3000}:3000"
    depends_on:
      postgres:
        condition: service_healthy
      migrate:
        condition: service_completed_successfully
    healthcheck:
      test:
        [
          "CMD",
          "bun",
          "-e",
          "const response = await fetch('http://127.0.0.1:3000/api/v1/health'); if (!response.ok) process.exit(1);",
        ]
      interval: 5s
      timeout: 3s
      retries: 12
      start_period: 10s
    restart: unless-stopped

volumes:
  dhaka_tesla_postgres_data:
```

When the Next.js application is implemented, add its `web` service and make it depend on the healthy API. The assignment's final Compose submission must include that frontend service.

## Local backend run

```bash
cp .env.example .env
bun install
bun run db:up
bun --env-file=.env run migrate
bun --env-file=.env run db:seed
bun --env-file=.env run dev
```

Open:

- API health: `http://localhost:3000/api/v1/health`
- Swagger UI: `http://localhost:3000/docs`

## Container run

```bash
docker compose config
docker compose up --build --wait
docker compose ps -a
docker compose logs migrate api postgres
```

Expected state: PostgreSQL and API are healthy, and `migrate` exited with code `0` after reporting migration and seed success.

## Smoke test

```bash
curl http://localhost:3000/api/v1/health

curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"nusrat@example.com","password":"superstrongpassword"}'
```

Use the returned token as `Authorization: Bearer <token>` in Swagger. Create Nusrat's `BANANI -> MOHAKHALI` request and confirm the fare is `112.00` BDT.

## Verification performed

On 2026-09-28, `docker compose up -d --build --wait` completed successfully, `migrate` exited `0`, seeding completed, the API health check passed, Nusrat logged in, `/auth/me` returned `PASSENGER`, and `/docs` returned `200`.

Do not commit `.env`, access tokens, or a production JWT secret. The Compose fallback secret is for local evaluation only.
