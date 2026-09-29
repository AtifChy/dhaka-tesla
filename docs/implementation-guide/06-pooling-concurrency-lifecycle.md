# Step 6 - pooling, capacity, concurrency, and lifecycle

## Compatibility rule

A request can join a pool only when all are true:

1. Request status is `REQUESTED`.
2. Vehicle is online.
3. Pool status is `MATCHED`.
4. Pickup zone matches.
5. Corridor matches.
6. Requested seats fit atomically.

Destination equality is not required; that is why Nusrat and Rafiq can share Bullet.

## Accept endpoint

```text
POST /v1/driver/requests/:requestId/accept
```

The authenticated driver never submits driver ID, vehicle ID, pool capacity, occupied seats, status, or fare. Resolve those server-side.

## Atomic final-seat claim

A read-then-write check is unsafe:

```text
read occupiedSeats
if enough seats
  write occupiedSeats + requestedSeats
```

Two transactions can both observe the last seat. Instead, perform one conditional PostgreSQL update inside the same Prisma transaction:

```sql
UPDATE pools
SET "occupiedSeats" = "occupiedSeats" + $1
WHERE id = $2
  AND status = 'MATCHED'
  AND "occupiedSeats" + $1 <= capacity
RETURNING id, "occupiedSeats", capacity;
```

Execute this through Prisma 8's SQL/raw lane. If zero rows return, throw `POOL_FULL`. Do not retry by silently placing the passenger elsewhere.

## Accept transaction

```ts
await db.transaction(async (tx) => {
  // 1. Read the request and authenticated driver's vehicle/pool.
  // 2. Recheck REQUESTED and route compatibility inside the transaction.
  // 3. Run the conditional UPDATE ... RETURNING seat claim.
  // 4. Insert PoolMember with request seats and immutable quoted fare.
  // 5. Update Request to MATCHED and set quotedFare.
  // 6. Insert request and pool Events.
  // Any thrown error rolls all writes back.
});
```

The unique `PoolMember.requestId` prevents one request from joining two pools. The database check `occupiedSeats <= capacity` is the final backstop; the conditional update is what makes the common path race-safe.

## Pool creation

If the driver has no active compatible pool, create it in the transaction using:

- Authenticated driver ID.
- Driver-owned vehicle ID.
- Vehicle capacity snapshot.
- Request pickup zone/corridor.
- `MATCHED` status.
- Zero occupied seats before the conditional claim.

At most one active pool per vehicle should be enforced by service logic for the MVP. If bugs appear, add a PostgreSQL partial unique index for non-terminal pool statuses in a reviewed migration.

## Lifecycle rules

```ts
type RideStatus = "REQUESTED" | "MATCHED" | "DRIVER_ARRIVED" | "STARTED" | "COMPLETED" | "CANCELED";

const ALLOWED: Record<RideStatus, readonly RideStatus[]> = {
  REQUESTED: ["MATCHED", "CANCELED"],
  MATCHED: ["DRIVER_ARRIVED", "CANCELED"],
  DRIVER_ARRIVED: ["STARTED"],
  STARTED: ["COMPLETED"],
  COMPLETED: [],
  CANCELED: [],
};

export function assertTransition(from: RideStatus, to: RideStatus): void {
  if (!ALLOWED[from].includes(to)) {
    throw new InvalidTransitionError(from, to);
  }
}
```

Driver pool transitions update the pool, every non-canceled member request, and events in one transaction. `MATCHED -> COMPLETED` must fail without partial writes.

## Cancellation and seat release

For a matched cancellation:

1. Lock/re-read the membership and pool in the transaction.
2. Reject if request/pool status no longer permits cancellation.
3. Delete membership.
4. Atomically decrement `occupiedSeats` by exactly `membership.seats` with a non-negative predicate.
5. Mark request `CANCELED`.
6. If no members remain and occupancy is zero, move the matched pool to `CANCELED` so it cannot strand the driver.
7. Append request and pool events.

Test this edge case with real PostgreSQL: after the last member cancels, the driver can go offline or accept a new route; a later `DRIVER_ARRIVED` cancellation still fails.

## Required concurrency test

Prepare a pool with one seat remaining. Start Nusrat's and Shirin's accept operations together using `Promise.allSettled`. Assert:

- Exactly one succeeds.
- Exactly one returns `409 POOL_FULL`.
- Occupancy equals capacity, never capacity plus one.
- One new membership exists.
- The losing request remains `REQUESTED`.
- Repeating the test does not intermittently fail.

Use real PostgreSQL, not mocked repositories.

## Suggested commits

```text
feat(pool): match requests by pickup zone and corridor
feat(pool): reserve seats with atomic conditional update
feat(pool): enforce ride lifecycle transitions
test(pool): prove final-seat concurrency safety
```

## Acceptance gate

- Bullet can never contain more than three occupied seats.
- Duplicate membership and invalid transitions are rejected.
- Every multi-row operation rolls back on failure.
- The final-seat race passes repeatedly against PostgreSQL.
