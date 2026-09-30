# Step 9 - meaningful tests

## Current status

The repository has 34 unit tests and two real-PostgreSQL integration tests. Vitest is a direct development dependency. Unit tests include one/two/three-seat fare totals, rounding, invalid seat counts, and agreement between the frontend preview and backend calculation. The integration suites cover a final-seat race, persisted two-seat quotes, ownership, cancellation of the last matched member, driver recovery, and late-cancellation rejection. Add further cases when the API surface expands rather than chasing a vanity coverage percentage.

Package scripts:

```json
{
  "scripts": {
    "test": "vitest run --config vitest.config.ts",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:watch": "vitest"
  }
}
```

## Test structure

```text
src/rides/domain/
  fare-policy.spec.ts
  route-catalog.spec.ts
  ride-transitions.spec.ts
src/common/errors/
  api-exception.filter.spec.ts
test/
  pool-capacity.integration.spec.ts
  ride-cancellation.integration.spec.ts
  fare-preview.unit.spec.ts
```

## Unit examples

```ts
describe("pooled fare", () => {
  it("calculates Nusrat's fare", () => {
    expect(calculatePooledFarePoysha(3_000)).toBe(11_200);
  });

  it("calculates Rafiq's fare", () => {
    expect(calculatePooledFarePoysha(2_500)).toBe(10_400);
  });

  it("charges Nusrat for two reserved seats", () => {
    expect(calculatePooledFareBdt(3_000, 2)).toBe("224.00");
  });
});
```

```ts
it("rejects skipping directly from MATCHED to COMPLETED", () => {
  expect(() => assertTransition("MATCHED", "COMPLETED")).toThrow(/Cannot change ride status/);
});
```

## Required risk matrix

| Risk            | Test                                  | Expected result                                       |
| --------------- | ------------------------------------- | ----------------------------------------------------- |
| Fare            | Nusrat at 3 km                        | `112.00` BDT                                          |
| Fare            | Rafiq at 2.5 km                       | `104.00` BDT                                          |
| Multi-seat fare | Two/three seats on both demo routes   | Nusrat `224.00`/`336.00`; Rafiq `208.00`/`312.00`     |
| Fare preview    | Frontend preview versus backend total | Equal for one, two, and three seats; exact poysha     |
| Stored quote    | Create/accept a two-seat booking      | Request, driver list, and member fare remain `224.00` |
| Matching        | Same pickup/corridor                  | Compatible                                            |
| Matching        | Different pickup/corridor             | Rejected without writes                               |
| Capacity        | Fill Bullet past three seats          | `409`; occupancy remains three                        |
| Concurrency     | Nusrat/Shirin race for one seat       | One success, one `POOL_FULL`                          |
| Lifecycle       | `MATCHED -> COMPLETED`                | `409`; no state change                                |
| Ownership       | Nusrat reads/cancels Rafiq request    | `404`; Rafiq unchanged                                |
| Role            | Passenger calls driver command        | `403`                                                 |
| Auth            | Missing/bad/expired JWT               | `401`                                                 |
| Cancellation    | Requested/matched                     | Allowed with event; seats released                    |
| Cancellation    | Arrived/started                       | Rejected; unchanged                                   |
| Validation      | Bad DTO                               | Stable `VALIDATION_ERROR`                             |
| Serialization   | User/ride responses                   | No password/private relations                         |
| Audit           | Complete trip                         | Ordered events explain transitions                    |
| Seed            | Run twice                             | No duplicate users/vehicle                            |
| Docker          | Fresh volumes                         | Migrate, seed, API, web healthy                       |

## API testing

Create the Nest application with the Fastify adapter and use `app.inject()`; no network port is required. Test actual guards, pipes, filters, and serialization. Mocking pure external boundaries is acceptable, but do not mock ownership queries or pooling transactions in the tests meant to prove them.

## Integration database

Use a local disposable database, ideally separate from the development database. Never point tests at a deployed database. `vitest.integration.config.ts` rejects any `DATABASE_URL` whose host is not `localhost`, `127.0.0.1`, or `postgres`; this is a safety guard, not a substitute for checking the database name and port yourself. Do not use `bun --env-file=.env run test:integration` if `.env` points to a remote service.

For the default local Compose port on PowerShell:

```powershell
$env:DATABASE_URL = 'postgresql://dhaka_tesla:dhaka_tesla_dev@localhost:5432/dhaka_tesla'
bun run test:integration
```

Adjust the port to `POSTGRES_PORT` and ensure checked-in migrations have been applied first.

For each integration suite:

1. Start PostgreSQL.
2. Apply checked-in migrations to the test URL.
3. Insert only fixtures required by the suite.
4. Clean tables in foreign-key-safe order or recreate the database/schema.
5. Close Prisma and the Nest app.

## Concurrency test outline

```ts
const results = await Promise.allSettled([
  poolsService.acceptRequest(jashim, nusratRequestId),
  poolsService.acceptRequest(jashim, shirinRequestId),
]);

expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);

const pool = await readPool();
expect(pool.occupiedSeats).toBe(pool.capacity);
expect(await countNewMemberships()).toBe(1);
```

Run it repeatedly during development. A single lucky pass does not prove race safety.

## Suggested commits

```text
test(domain): cover fares matching and lifecycle
test(api): cover auth roles ownership and validation
test(database): cover constraints and seed idempotency
test(pool): prove final-seat allocation under concurrency
```

## Acceptance gate

- Every matrix row has a passing test.
- Capacity and transaction tests use real PostgreSQL.
- Tests fail if the capacity predicate or ownership filter is deliberately removed.
- Test setup cannot destroy development or deployment data.
