# Dhaka Tesla Pool - implementation guide

This folder turns the assignment brief into an executable build sequence for this repository. The assignment PDF is the authority for product and submission requirements. The architecture and implementation choices below are project decisions made to satisfy it.

## Chosen stack

- Frontend: Next.js App Router in `web/`.
- Backend: NestJS on the Fastify adapter at the repository root.
- API: versioned REST plus Swagger/OpenAPI.
- Validation: Zod through `nestjs-zod`.
- Authentication: Passport JWT with role and ownership checks.
- Database: PostgreSQL 18 with Prisma ORM 8 contracts and migrations.
- Money: exact PostgreSQL `Decimal` values in BDT, while calculations use integer poysha.
- Tests: Vitest for unit/API/integration tests; real PostgreSQL for capacity races.
- Runtime/package manager: Node.js-compatible TypeScript and Bun scripts.

## Current repository checkpoint

Implemented and verified on `master`:

- NestJS/Fastify API with validated environment configuration, Helmet, rate limiting, request logs, stable error responses, and Swagger.
- Passport JWT authentication with database-backed user/role validation, passenger/driver role guards, and ownership checks.
- Prisma 8 contract/runtime, committed migrations, exact two-decimal BDT constraints, and pool-capacity constraints.
- `User`, `Vehicle`, `Request`, `Pool`, `PoolMember`, and `Event` models using integer IDs.
- Idempotent Jashim/Nusrat/Rafiq/Shirin and Bullet seed data.
- Passenger requests, fixed routes, hand-testable fares, cancellation, driver matching, pooling, and lifecycle transitions.
- Fare/route/transition/rate-limit unit tests and real PostgreSQL concurrency, ownership, cancellation, and lifecycle tests using `deleteAll()` cleanup.
- PostgreSQL, one-shot migration/seed, API, and standalone Next.js containers started by `docker compose up`.
- Next.js passenger/driver dashboards with a visual status timeline, Shirin demo quick-fill, and loading/error/empty states.
- Required `master`, `pre-release`, and `release/v1.0.0` branches, with the current tested code promoted in that order.
- Root README with architecture, ERD, API, money, verification, Git, deployment, and AI disclosure.

Still to verify or supply before final submission:

- Public end-to-end backend/database deployment, not merely the public frontend URL.
- README screenshots/GIFs and a recorded six-minute video link.
- Final media and public deployment acceptance before submission.

Do not mark a step complete merely because it appears in this guide. Use each acceptance gate.

## Build order

1. [Assignment compliance and decisions](00-assignment-compliance.md)
2. [Project foundation and dependencies](01-project-foundation.md)
3. [Architecture and code boundaries](02-architecture-and-code-boundaries.md)
4. [Database, migrations, money, and seed](03-database-migrations-money-seed.md)
5. [Authentication, validation, errors, and Swagger](04-auth-validation-errors-swagger.md)
6. [Passenger requests, geography, and fares](05-passenger-rides-geography-fares.md)
7. [Pooling, capacity, concurrency, and lifecycle](06-pooling-concurrency-lifecycle.md)
8. [Driver flow, privacy, and history](07-driver-flow-history.md)
9. [Next.js frontend](08-nextjs-frontend.md)
10. [Meaningful tests](09-testing.md)
11. [Docker, security, and deployment](10-docker-security-deployment.md)
12. [Git, README, AI policy, video, and submission](11-git-readme-ai-video-submission.md)
13. [End-to-end execution checklist](12-execution-checklist.md)
14. [AI usage log](ai-usage-log.md)

The step-by-step chapters explain the decisions. The checked-in source under `src/` is authoritative where an explanatory excerpt and the current implementation differ.

## Definition of done

The work is complete only when a fresh clone can run the complete application with `docker compose up`, the story cast is available, passenger and driver flows work, capacity cannot be exceeded under concurrency, the tests pass, documentation matches the implementation, and the required Git branches and six-minute video exist.

## Primary references

- Assignment: `C:\Users\Atif\Downloads\Dhaka_Tesla_Pool_PRD_Internship.pdf`
- [NestJS OpenAPI](https://docs.nestjs.com/openapi/introduction)
- [NestJS authentication](https://docs.nestjs.com/security/authentication)
- [NestJS Fastify](https://docs.nestjs.com/techniques/performance)
- [nestjs-zod](https://github.com/BenLorantfy/nestjs-zod)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Prisma 8 data contract](https://docs.prisma.io/docs/orm/contract-authoring/the-data-contract)
- [Prisma 8 migrations](https://www.prisma.io/docs/orm/migrations/how-migrations-work)
