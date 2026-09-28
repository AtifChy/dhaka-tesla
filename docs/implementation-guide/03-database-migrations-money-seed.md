# Step 3 - database, migrations, money, and seed

## Required tables

The current contract implements every required core table:

| Model        | Purpose                                                          |
| ------------ | ---------------------------------------------------------------- |
| `User`       | Identity, Argon2 password hash, passenger/driver role            |
| `Vehicle`    | Driver-owned Bullet, fixed capacity, online state                |
| `Request`    | Passenger route snapshot, seats, lifecycle, fare, payment choice |
| `Pool`       | Driver/vehicle assignment, route, lifecycle, capacity snapshot   |
| `PoolMember` | Explicit request-to-pool membership, seat and fare snapshot      |
| `Event`      | Append-only request/pool history and actor                       |

`Payment`, `Rating`, and a separate audit table are optional. `paymentMethod` is sufficient while TeslaPay is only a simulated choice. Add wallet/transaction tables only if balance and debit history become real requirements. `Event` already supplies the required history/audit trail.

## Identifier decision

Keep the current auto-incrementing `Int` IDs. UUIDs are unnecessary for this assignment, and integers make Swagger, seed inspection, and the interview demo easier. Record that globally guessable IDs are safe only because every private query also enforces ownership.

## Contract hardening before API work

The implemented contract uses these assignment-focused invariants:

```prisma
model Request {
  // Keep the existing fields.
  estimatedFare Decimal
  quotedFare    Decimal

  @@check(expression: "\"estimatedFare\" >= 0 AND \"estimatedFare\" = round(\"estimatedFare\", 2)", name: "request_estimated_fare_valid")
  @@check(expression: "\"quotedFare\" >= 0 AND \"quotedFare\" = round(\"quotedFare\", 2)", name: "request_quoted_fare_valid")
}

model Pool {
  // Keep the existing fields.
  @@check(expression: "\"occupiedSeats\" >= 0", name: "pool_occupied_seats_nonnegative")
  @@check(expression: "\"occupiedSeats\" <= capacity", name: "pool_capacity_not_exceeded")
}

model PoolMember {
  // Keep the existing fields.
  @@check(expression: "fare >= 0", name: "pool_member_fare_nonnegative")
}
```

`quotedFare` is non-null because this MVP's fixed route catalog produces the final deterministic pooled quote when the request is created. Driver acceptance copies that quote into `PoolMember.fare`; it does not renegotiate the price.

Also enforce in services:

- A `PASSENGER` creates requests; a `DRIVER` owns a vehicle/pool.
- The pool's driver owns the selected vehicle.
- Pool capacity is copied from the vehicle and never accepted from the browser.
- Pool/member/request seat counts remain consistent inside transactions.

## Money policy

Store BDT as PostgreSQL `Decimal`, not `Float`. PostgreSQL numeric values are exact, and Prisma 8 exposes them as decimal strings. API responses should therefore return values such as `"112.00"`, which also preserves two-decimal display.

To avoid JavaScript floating-point arithmetic, calculate in integer poysha and convert at the persistence boundary:

```ts
export function poyshaToBdt(value: number): string {
  const taka = Math.trunc(value / 100);
  const poysha = String(value % 100).padStart(2, "0");
  return `${taka}.${poysha}`;
}
```

This is a deliberate hybrid: integer calculations for safety, Decimal storage for the requested human-friendly `123.40` representation.

## Prisma 8 migration loop

Prisma 8 uses a contract and graph-based migrations. After each contract change:

```bash
bun run contract:emit
bunx prisma migration plan --name harden_pool_constraints
bunx prisma migration show migrations/app/<generated-directory>
bun --env-file=.env run migrate --advance-ref db
bun --env-file=.env run db:verify
bun --env-file=.env run migration:status
```

Review `migration.ts` and `ops.json` before applying. Commit the contract source, generated `contract.json`/`contract.d.ts`, migration directory, snapshots, and lockfile together. Never edit emitted contract artifacts manually.

The current initial migration and live database have previously verified against the current contract; rerun verification after the hardening migration.

## Seed policy

The current seed correctly creates:

- Jashim (`DRIVER`).
- Nusrat, Rafiq, and Shirin (`PASSENGER`).
- Bullet, capacity three, owned by Jashim and initially online.
- The same non-production password for the four accounts, hashed with Argon2id.

Run it explicitly:

```bash
bun run db:seed
bun run db:seed
```

The second run must not add duplicates. Do not seed during a normal read/controller request. Do not seed ride requests: create them through the API so validation, fare calculation, authorization, and creation events are exercised.

## Suggested commits

```text
feat(database): enforce capacity and money constraints
refactor(database): make quoted fare optional before matching
test(database): cover constraints and idempotent seed
```

## Acceptance gate

- A blank database migrates to the current contract.
- `db:verify` and `migration:status` succeed with `.env` loaded.
- Occupancy outside `0..capacity` is rejected by PostgreSQL.
- Money rejects negative values and more than two decimal places.
- The seed runs twice with four users and one Bullet vehicle.
