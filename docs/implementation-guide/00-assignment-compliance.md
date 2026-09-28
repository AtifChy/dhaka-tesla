# Step 0 - assignment compliance and decisions

## Mandatory outcomes

| Assignment requirement    | Project decision                                                   | Evidence required                                                |
| ------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------- |
| React or Next.js frontend | Next.js App Router                                                 | Passenger and driver pages with loading, error, and empty states |
| Node.js backend           | NestJS with Fastify adapter                                        | API starts independently and exposes health endpoint             |
| Relational database       | PostgreSQL 18                                                      | Prisma contract, migrations, constraints, indexes                |
| API design                | REST                                                               | README justification and Swagger document                        |
| Validation                | `nestjs-zod`                                                       | Invalid DTO tests and consistent `400` response                  |
| Auth                      | Passport JWT                                                       | Login, bearer auth, role and ownership tests                     |
| Passenger flow            | Requests, fares, status, history, valid cancellation               | UI, API, tests, video                                            |
| Driver flow               | Online/offline, relevant requests, accept, arrive, start, complete | UI, API, tests, video                                            |
| Pooling                   | Explicit membership and individual fares                           | `Pool` and `PoolMember`, UI, tests                               |
| Capacity                  | Never exceed Bullet's three seats                                  | DB check, atomic update, concurrency test                        |
| Geography                 | Simple documented matching rule                                    | Fixed route catalog and compatibility tests                      |
| Payment                   | Cash or simulated TeslaPay                                         | Enum/selection only; no real gateway                             |
| Docker                    | `docker compose up` runs app containers and DB                     | DB, migrate, API, web, health checks                             |
| Seed                      | Story cast                                                         | Jashim, Bullet, Nusrat, Rafiq; Shirin retained for race scenario |
| Architecture              | Browser -> frontend -> API -> DB and ERD                           | README Mermaid diagrams                                          |
| Tests                     | Risk-focused                                                       | Fares, ownership, transitions, cancellation, concurrency         |
| Git process               | Required branches and meaningful history                           | `master`, `pre-release`, `release/v1.0.0`, `feature/*`           |
| AI disclosure             | Transparent README entry                                           | Tools, purpose, one accepted and one changed/rejected suggestion |
| Video                     | Maximum six minutes                                                | README link and required timing                                  |
| Deployment                | Free/free-tier only                                                | Public URL or documented reproducible Docker constraint          |

## Explicit assumptions

Document these in the final README and change them only deliberately:

1. One user has exactly one role: passenger or driver.
2. One driver owns at most one vehicle in the MVP.
3. Bullet has capacity three; a request can ask for one to three seats.
4. Routes use predefined zones and distances, not a live map API.
5. Requests are compatible when they share a pickup zone and corridor.
6. `MATCHED` represents the assignment's “matched/accepted” state.
7. Cancellation is allowed only in `REQUESTED` and `MATCHED`.
8. Cash and TeslaPay are simulated choices. No real charge or gateway exists.
9. Integer database identifiers are acceptable for this assessment and keep manual testing simple.
10. PostgreSQL `Decimal` stores BDT exactly; calculation code uses integer poysha.

## Scope boundary

Do not add Redis, queues, WebSockets, geospatial databases, microservices, Kafka, or Kubernetes to the MVP. Discuss them only in the optional scaling section unless a real implementation need appears.

## Acceptance gate

- Every mandatory row has a planned artifact or test.
- Every ambiguity has a written assumption.
- Optional payment, rating, and scaling work cannot delay the core passenger/driver/pooling flow.
