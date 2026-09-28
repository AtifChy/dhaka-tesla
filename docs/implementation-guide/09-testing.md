# Step 9 - meaningful tests

## Current status

The repository has 13 unit tests for fare/transition rules and one real PostgreSQL final-seat concurrency test. Vitest is a direct development dependency. Add further API/ownership cases when the API surface expands rather than chasing a vanity coverage percentage.

Package scripts:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:unit": "vitest run test/unit",
    "test:api": "vitest run test/api",
    "test:integration": "vitest run test/integration"
  }
}
```

## Test structure

```text
test/
  unit/
    fare-policy.spec.ts
    route-compatibility.spec.ts
    ride-transitions.spec.ts
  api/
    auth.spec.ts
    passenger-ownership.spec.ts
    driver-authorization.spec.ts
    validation-errors.spec.ts
  integration/
    database-constraints.spec.ts
    pool-capacity.spec.ts
    seed.spec.ts
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
});
```

```ts
it("rejects skipping directly from MATCHED to COMPLETED", () => {
  expect(() => assertTransition("MATCHED", "COMPLETED")).toThrow(InvalidTransitionError);
});
```

## Required risk matrix

| Risk          | Test                               | Expected result                    |
| ------------- | ---------------------------------- | ---------------------------------- |
| Fare          | Nusrat at 3 km                     | `112.00` BDT                       |
| Fare          | Rafiq at 2.5 km                    | `104.00` BDT                       |
| Matching      | Same pickup/corridor               | Compatible                         |
| Matching      | Different pickup/corridor          | Rejected without writes            |
| Capacity      | Fill Bullet past three seats       | `409`; occupancy remains three     |
| Concurrency   | Nusrat/Shirin race for one seat    | One success, one `POOL_FULL`       |
| Lifecycle     | `MATCHED -> COMPLETED`             | `409`; no state change             |
| Ownership     | Nusrat reads/cancels Rafiq request | `404`; Rafiq unchanged             |
| Role          | Passenger calls driver command     | `403`                              |
| Auth          | Missing/bad/expired JWT            | `401`                              |
| Cancellation  | Requested/matched                  | Allowed with event; seats released |
| Cancellation  | Arrived/started                    | Rejected; unchanged                |
| Validation    | Bad DTO                            | Stable `VALIDATION_ERROR`          |
| Serialization | User/ride responses                | No password/private relations      |
| Audit         | Complete trip                      | Ordered events explain transitions |
| Seed          | Run twice                          | No duplicate users/vehicle         |
| Docker        | Fresh volumes                      | Migrate, seed, API, web healthy    |

## API testing

Create the Nest application with the Fastify adapter and use `app.inject()`; no network port is required. Test actual guards, pipes, filters, and serialization. Mocking pure external boundaries is acceptable, but do not mock ownership queries or pooling transactions in the tests meant to prove them.

## Integration database

Use a separate database such as `dhaka_tesla_test`. Never point tests at the developer or deployed database.

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
