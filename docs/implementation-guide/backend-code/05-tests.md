# 05 - Backend tests

The backend has fast pure unit tests and one focused PostgreSQL integration test for the highest-risk invariant: two concurrent requests competing for the last seat.

## `vitest.config.ts`

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.spec.ts"],
  },
});
```

## `vitest.integration.config.ts`

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.integration.spec.ts"],
    fileParallelism: false,
  },
});
```

## Unit tests

`src/rides/domain/fare-policy.spec.ts` proves the exact hand calculations, including:

```ts
expect(calculatePooledFareBdt(3_000)).toBe("112.00");
expect(calculatePooledFareBdt(2_500)).toBe("104.00");
```

`src/rides/domain/ride-transitions.spec.ts` covers every allowed forward/cancel transition and rejects invalid or terminal transitions. Together these files currently contain 13 passing tests.

## `test/pool-capacity.integration.spec.ts`

The test creates its own uniquely named driver, capacity-two vehicle, and three passengers. It accepts one passenger, then races the remaining two for the one remaining seat:

```ts
const results = await Promise.allSettled([
  driverService.accept(driver, second.id),
  driverService.accept(driver, third.id),
]);

expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
const failure = results.find((result) => result.status === "rejected");
expect(failure?.status).toBe("rejected");

if (failure?.status === "rejected") {
  expect(failure.reason).toBeInstanceOf(DomainException);
  expect((failure.reason as DomainException).code).toBe("POOL_FULL");
}
```

It then verifies all persistent results, not just returned promises:

```ts
expect(storedPool?.occupiedSeats).toBe(2);
expect(storedPool?.capacity).toBe(2);
expect(memberships).toHaveLength(2);
expect(contenders.filter((request) => request?.status === "MATCHED")).toHaveLength(1);
expect(contenders.filter((request) => request?.status === "REQUESTED")).toHaveLength(1);
```

Cleanup targets only the isolated test IDs and uses Prisma 8 `deleteAll()` for collections:

```ts
await db.orm.public.Event.where({ actorId: driverId }).deleteAll();
await db.orm.public.PoolMember.where({ poolId: pool.id }).deleteAll();
await db.orm.public.Request.where({ passengerId }).deleteAll();
await db.orm.public.Pool.where({ driverId }).deleteAll();
await db.orm.public.Vehicle.where({ driverId }).deleteAll();
await db.orm.public.User.where({ id: passengerId }).deleteAll();
```

This keeps required seed users and unrelated developer data intact.

## Run

```bash
bun run test
bun --env-file=.env run test:integration
```

Start PostgreSQL and apply migrations before the integration suite:

```bash
bun run db:up
bun --env-file=.env run migrate
```

Verified on 2026-09-28: 13 unit tests and the final-seat integration test pass.
