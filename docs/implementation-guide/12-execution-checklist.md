# Step 12 - end-to-end execution checklist

Use this as the build order. Do not begin release work while a previous gate is red.

## Phase 1 - database foundation

- [x] PostgreSQL Compose service and health check.
- [x] Prisma 8 contract with six core tables.
- [x] Story-cast seed and Bullet capacity three.
- [x] Initial migration applied and verified.
- [x] Upper pool-capacity and two-decimal non-null fare constraints.
- [x] Repeated seed, migration, and contract verification.
- [x] Merge `feature/database-foundation` into `master` after final checks.

## Phase 2 - API foundation

- [x] Install and commit validation/auth/Swagger/security/test dependencies.
- [x] Validate environment at startup.
- [x] Add global Zod pipe, serializer, and exception filter.
- [x] Add Swagger with bearer auth.
- [x] Add public health endpoint.
- [x] Build, lint, and test.

## Phase 3 - authentication and authorization

- [x] Register, login, and current-user endpoints.
- [x] Argon2id password service.
- [x] Passport JWT strategy and guard.
- [x] Role guard and current-user decorator.
- [x] Ownership-scoped service queries.
- [x] Auth/role/ownership smoke verification.

## Phase 4 - passenger rides and fares

- [x] Fixed zones/routes for Nusrat and Rafiq.
- [x] Pure fare function with `112.00` and `104.00` tests.
- [x] Create, mine, detail, cancel endpoints.
- [x] Request creation/cancellation events.
- [x] Ownership-scoped passenger queries and smoke verification.

## Phase 5 - pooling and driver flow

- [x] Online/offline with active-pool rule.
- [x] Compatible-request query.
- [x] Pool creation and membership through request acceptance.
- [x] Atomic conditional seat claim.
- [x] Arrive, start, complete commands.
- [x] Event history writes and pool/request history reads.
- [x] Real PostgreSQL final-seat race test.

## Phase 6 - frontend

- [x] Next.js App Router project.
- [x] Typed API client and session handling.
- [x] Passenger flow and history.
- [x] Driver dashboard and history.
- [x] Loading, error, empty, pending, and terminal states with visual ride progress.
- [x] Responsive, usable demo interface.

## Phase 7 - Docker and deployment

- [x] Production API Dockerfile.
- [x] Next.js standalone Dockerfile.
- [x] Compose web service.
- [x] PostgreSQL/API/web health checks and dependency ordering.
- [x] Compose migration, seed, health, login, and Swagger smoke test.
- [x] Documented reproducible Docker fallback and public frontend URL.
- [ ] Verify the public backend/database with a full passenger-and-driver ride flow.

## Phase 8 - pre-release and release

- [ ] All working feature branches merged into `master` (documentation branch is in progress).
- [ ] Merge `master` into `pre-release` for integration/docs/deployment checks.
- [ ] Capture README screenshots/GIFs; architecture, ERD, and AI disclosure are documented.
- [ ] Run format, lint, type check, build, tests, migration verification, and Compose smoke test.
- [ ] Cut `release/v1.0.0` from `pre-release`.
- [ ] Record the maximum six-minute video using that version.
- [ ] Push required branches/tag and verify evaluator access.

## Final command audit

Run commands documented by the finished project, at minimum:

```bash
bun install --frozen-lockfile
bun run fmt:check
bun run lint
bun run build
bun run test
bun run test:integration # only after setting DATABASE_URL to a local disposable PostgreSQL database
bun --env-file=.env run migration:status
bun --env-file=.env run db:verify
bun run db:seed
docker compose up --build --wait
```

Record the exact result, date, environment, and any known warning. Do not turn unchecked boxes into checked boxes without evidence.
