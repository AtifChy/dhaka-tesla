# Step 1 - project foundation and dependencies

## Why this architecture

Keep the frontend and API separate:

```text
Browser -> Next.js web app -> NestJS/Fastify REST API -> PostgreSQL
```

Next.js can implement server endpoints, but a separate Node API makes the assignment's backend design, authorization, transactions, capacity enforcement, logging, Docker service, and Swagger surface explicit.

REST fits this MVP better than GraphQL because the resources and state-changing commands are small, the evaluator can exercise them directly in Swagger, and the API does not need flexible client-selected graphs. Reconsider GraphQL only if several clients later need substantially different read shapes.

## Work on a feature branch

Follow the assignment's flow, not a generic GitFlow interpretation:

```bash
git switch master
git pull
git switch -c feature/project-foundation
```

The current repository already contains `master`, `pre-release`, and `feature/database-foundation`. Do not rewrite existing history merely to make it look staged; make future work traceable.

## Install backend dependencies

Use unpinned `bun add` only when intentionally accepting the latest compatible release, then commit the resolved `bun.lock`:

```bash
bun add nestjs-zod zod
bun add @nestjs/passport passport passport-jwt @nestjs/jwt
bun add @nestjs/swagger @fastify/static
bun add @fastify/helmet @fastify/rate-limit
bun add @nestjs/config
bun add -d @types/passport-jwt @nestjs/testing vitest
```

`argon2` is already installed. Keep Zod as the single request/response validation source; do not add `class-validator` in parallel.

## Intended backend layout

```text
src/
  common/
    auth/
    decorators/
    errors/
    filters/
    logging/
  config/
  modules/
    auth/
    health/
    rides/
    pools/
    vehicles/
    users/
  prisma/
    contract.prisma
    contract.json
    contract.d.ts
    db.ts
    seed.ts
scripts/
  seed.ts
test/
  unit/
  api/
  integration/
web/
```

Remove starter controllers/services only when their replacement compiles. Preserve unrelated user changes.

## Environment contract

Expand `.env.example` with placeholders only:

```dotenv
NODE_ENV=development
API_PORT=3000
WEB_PORT=3000
WEB_ORIGIN=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
DATABASE_URL=postgresql://dhaka_tesla:dhaka_tesla_dev@localhost:5432/dhaka_tesla
JWT_SECRET=replace-with-at-least-32-random-characters
JWT_EXPIRES_IN=15m
ENABLE_SWAGGER=true
```

Validate environment variables with Zod at startup and fail fast. Never log or commit the real JWT secret, database URL, tokens, or `.env`.

## Suggested commits

```text
chore(api): add validation auth swagger and test dependencies
refactor(api): organize modules by domain
chore(config): validate application environment
```

## Acceptance gate

- `bun install --frozen-lockfile`, type checking, linting, and build pass.
- The Fastify adapter still starts.
- Configuration fails clearly when required variables are missing.
- `.env.example` contains no secret.
