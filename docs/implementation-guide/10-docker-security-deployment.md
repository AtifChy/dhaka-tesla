# Step 10 - Docker, security, and deployment

## Current status

The checked-in Compose file now starts PostgreSQL, applies migrations and seed data in a one-shot container, and starts a health-checked API. The remaining Docker task is to add the Next.js `web` service after the frontend exists.

## Target services

```text
postgres -> migrate -> api -> web
```

- `postgres`: PostgreSQL 18 with persistent volume and `pg_isready` health check.
- `migrate`: one-shot API image that applies checked-in Prisma migrations and runs the idempotent seed.
- `api`: NestJS/Fastify production build with `/api/v1/health`.
- `web`: Next.js standalone production build with a health check.

## Compose outline

```yaml
services:
  postgres:
    image: postgres:18-alpine
    environment:
      POSTGRES_DB: dhaka_tesla
      POSTGRES_USER: dhaka_tesla
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-dhaka_tesla_dev}
    volumes:
      - dhaka_tesla_postgres_data:/var/lib/postgresql
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dhaka_tesla -d dhaka_tesla"]
      interval: 5s
      timeout: 3s
      retries: 10

  migrate:
    build:
      context: .
      target: api-runtime
    environment:
      DATABASE_URL: postgresql://dhaka_tesla:${POSTGRES_PASSWORD:-dhaka_tesla_dev}@postgres:5432/dhaka_tesla
    depends_on:
      postgres:
        condition: service_healthy
    command: ["sh", "-c", "bun run migrate --advance-ref db && bun run db:seed"]
    restart: "no"

  api:
    build:
      context: .
      target: api-runtime
    environment:
      NODE_ENV: production
      PORT: 3000
      DATABASE_URL: postgresql://dhaka_tesla:${POSTGRES_PASSWORD:-dhaka_tesla_dev}@postgres:5432/dhaka_tesla
      JWT_SECRET: ${JWT_SECRET}
      WEB_ORIGIN: http://localhost:3000
      ENABLE_SWAGGER: ${ENABLE_SWAGGER:-true}
    depends_on:
      migrate:
        condition: service_completed_successfully
    ports: ["${API_PORT:-3000}:3000"]
    healthcheck:
      test:
        [
          "CMD",
          "bun",
          "-e",
          "const r=await fetch('http://127.0.0.1:3000/api/v1/health');if(!r.ok)process.exit(1)",
        ]
      interval: 10s
      timeout: 3s
      retries: 10

  web:
    build:
      context: ./web
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3000/api/v1
    depends_on:
      api:
        condition: service_healthy
    ports: ["3000:3000"]

volumes:
  dhaka_tesla_postgres_data:
```

Validate the exact command in the final image; do not assume Bun, shell, or `wget` exists unless the Dockerfile installs/copies it. The Compose outline is a target, not proof that Docker is complete.

PostgreSQL 18 must keep its volume mounted at `/var/lib/postgresql`, as the current file does.

## Dockerfiles

Use multi-stage builds:

- Install from `bun.lock` with a frozen lockfile.
- Build in one stage.
- Copy only production runtime files into a non-root runtime stage.
- Add `.dockerignore` for `.git`, `.env`, `node_modules`, `dist`, test output, and local logs.
- Next.js should use `output: "standalone"` for a compact runtime image.

## Health endpoints

Expose:

```text
GET /api/v1/health -> process is alive after Prisma initialization succeeds
```

Do not include secrets, full connection errors, or stack traces in health responses.

## Basic security checklist

- Argon2id password hashing.
- Short-lived signed JWTs and expiration verification.
- Role plus resource-ownership authorization.
- Zod validation and response serialization.
- Helmet, restricted CORS, auth rate limits, body-size limit.
- Parameterized Prisma queries; no interpolated raw SQL.
- No secrets in images, Git, logs, Swagger examples, or frontend variables.
- Dependency lockfile committed and image built reproducibly.
- Structured logs with sensitive-field redaction.

## Deployment

Spend nothing. Prefer a public free/free-tier deployment only if it can run the API and PostgreSQL reliably enough for evaluation. Provider free tiers change, so verify limits at deployment time and document what is actually available.

If no suitable free backend/database remains available:

1. State the constraint honestly in README.
2. Provide the fully reproducible Docker deployment.
3. Include exact start/stop/reset commands and expected URLs.
4. Record the local Docker product tour in the video.

Do not enter a paid plan or card charge for bonus points.

## Clean-clone test

On a disposable environment:

```bash
copy .env.example .env
docker compose up --build --wait
```

Verify database migration/seed logs, health endpoints, Swagger, web, demo login, and one complete pooled ride. `docker compose down -v` is destructive and should be used only for a deliberately disposable test database.

## Suggested commits

```text
build(api): add production container
build(web): add standalone nextjs container
build(docker): run migrations seed api web and postgres
docs(deploy): document free hosting constraint and docker fallback
```

## Acceptance gate

- A fresh clone starts with one Compose command.
- Migration and seed complete before API accepts traffic.
- API and web health checks become healthy.
- No host `localhost` database URL is used inside containers.
- No real secret appears in the repository or image history.
