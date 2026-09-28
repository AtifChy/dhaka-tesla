# Complete backend code guide

This sub-guide explains the NestJS/Fastify backend file by file. Every code block is preceded by its repository-relative filename. The checked-in files under `src/`, `test/`, and the repository root are the authoritative implementation; keep excerpts synchronized when those files change.

The code deliberately uses the current project choices:

- NestJS 12 on the regular Fastify adapter.
- REST with Swagger/OpenAPI.
- Prisma ORM 8 and PostgreSQL.
- `nestjs-zod` for request and response validation.
- Passport JWT with short-lived, stateless access tokens.
- Argon2id password hashing.
- Integer poysha for arithmetic and two-decimal BDT strings at the database/API boundary.
- Database transactions plus a conditional SQL update for pool capacity.

## Copy order

1. [Database and seed](00-database-and-seed.md)
2. [Bootstrap, configuration, errors, and authorization](01-bootstrap-and-common.md)
3. [Authentication](02-authentication.md)
4. [Passenger rides, geography, and fare](03-passenger-rides.md)
5. [Pools, driver flow, lifecycle, and history](04-pools-and-driver.md)
6. [Tests](05-tests.md)
7. [Docker and final run commands](06-docker-and-run.md)

Do not copy only one middle chapter. Later chapters import files defined earlier.

## API surface delivered by the guide

| Method | Route                                       | Role            | Purpose                                             |
| ------ | ------------------------------------------- | --------------- | --------------------------------------------------- |
| `POST` | `/api/v1/auth/register`                     | Public          | Register a passenger                                |
| `POST` | `/api/v1/auth/register/driver`              | Public          | Register a driver and vehicle                       |
| `POST` | `/api/v1/auth/login`                        | Public          | Obtain a 15-minute JWT                              |
| `GET`  | `/api/v1/auth/me`                           | Authenticated   | Read the database-validated current identity        |
| `GET`  | `/api/v1/health`                            | Public          | Container health probe                              |
| `GET`  | `/api/v1/rides/options`                     | Passenger       | List supported routes and fare previews             |
| `POST` | `/api/v1/rides`                             | Passenger       | Create a ride request                               |
| `GET`  | `/api/v1/rides/me`                          | Passenger       | List only the caller's requests                     |
| `GET`  | `/api/v1/rides/:id`                         | Passenger owner | View one owned request                              |
| `POST` | `/api/v1/rides/:id/cancel`                  | Passenger owner | Cancel before the ride starts                       |
| `GET`  | `/api/v1/driver/requests`                   | Driver          | List compatible waiting requests                    |
| `GET`  | `/api/v1/driver/vehicle`                    | Driver          | View the caller's vehicle                           |
| `POST` | `/api/v1/driver/vehicle/online`             | Driver          | Make the vehicle available                          |
| `POST` | `/api/v1/driver/vehicle/offline`            | Driver          | Go offline when no pool is active                   |
| `POST` | `/api/v1/driver/requests/:requestId/accept` | Driver          | Create/reuse a pool and atomically reserve capacity |
| `POST` | `/api/v1/driver/pools/:poolId/arrive`       | Assigned driver | Record driver arrival                               |
| `POST` | `/api/v1/driver/pools/:poolId/start`        | Assigned driver | Start the trip                                      |
| `POST` | `/api/v1/driver/pools/:poolId/complete`     | Assigned driver | Complete the trip                                   |
| `GET`  | `/api/v1/driver/pools`                      | Driver          | List the caller's pools                             |
| `GET`  | `/api/v1/driver/pools/:poolId`              | Assigned driver | View authorized pool/member details                 |

## Stateless JWT decision

Passport verifies the JWT signature and `exp` before `JwtStrategy.validate()` runs. The strategy then validates the payload shape with Zod and loads the user from PostgreSQL. That database lookup proves the user still exists and that the token role still matches the database role.

There is intentionally no `Session` table in this MVP because the assignment does not require refresh tokens, device sessions, or immediate logout/revocation. Add stateful sessions only if those requirements are introduced; otherwise they add schema and lifecycle work without improving the assessed flows.

## Completion gate

After copying all chapters, the following must succeed:

```bash
bun install
bun run contract:emit
bun run db:up
bun run migrate
bun run db:seed
bun run typecheck
bun run test
bun run test:integration
docker compose up --build --wait
```
