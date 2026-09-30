# Step 5 - passenger requests, geography, and fares

## Module layout

```text
src/modules/rides/
  domain/fare-policy.ts
  domain/route-catalog.ts
  domain/ride-transitions.ts
  dto/create-request.dto.ts
  dto/request-response.dto.ts
  rides.controller.ts
  rides.service.ts
  rides.module.ts
```

## Fixed geography

Use a deterministic route catalog instead of a map API:

```ts
export const ZONES = [
  "BANANI",
  "BASHUNDHARA",
  "BADDA",
  "DHANMONDI",
  "FARMGATE",
  "GULSHAN_1",
  "GULSHAN_2",
  "KARWAN_BAZAR",
  "MIRPUR_10",
  "MOHAKHALI",
  "MOTIJHEEL",
  "SHAHBAGH",
  "UTTARA",
] as const;

export const ROUTES = {
  "BANANI:MOHAKHALI": {
    distanceMeters: 3_000,
    corridor: "BANANI_NORTH",
  },
  "BANANI:GULSHAN_1": {
    distanceMeters: 2_500,
    corridor: "BANANI_NORTH",
  },
} as const;
```

The implementation defines 17 two-way route pairs, producing 34 supported directions. Every zone can be used as both pickup and destination, but only catalog pairs are accepted. Distances and corridors remain server-owned.

Nusrat and Rafiq are compatible because both start in `BANANI` and use `BANANI_NORTH`, even though their destinations differ. Matching always requires both the same pickup zone and the same corridor.

## Hand-testable pooled fare

Use this documented formula:

```text
soloFarePerSeat = baseFare + distanceKm * distanceRate
pooledPerSeat   = soloFarePerSeat * 80%
bookingTotal    = pooledPerSeat * seatsRequested

baseFare       = BDT 80.00
distanceRate   = BDT 20.00 per km
```

Calculate with integer poysha:

```ts
const BASE_FARE_POYSHA = 8_000;
const PER_KM_POYSHA = 2_000;
const POOLED_PERCENT = 80;

export function calculatePooledFarePoysha(distanceMeters: number, seatsRequested = 1): number {
  if (!Number.isInteger(distanceMeters) || distanceMeters <= 0) {
    throw new Error("distanceMeters must be a positive integer");
  }
  if (!Number.isInteger(seatsRequested) || seatsRequested < 1 || seatsRequested > 3) {
    throw new Error("seatsRequested must be an integer between 1 and 3");
  }

  const distanceCharge = Math.round((distanceMeters * PER_KM_POYSHA) / 1_000);
  const soloFare = BASE_FARE_POYSHA + distanceCharge;
  const perSeatFare = Math.round((soloFare * POOLED_PERCENT) / 100);
  return perSeatFare * seatsRequested;
}
```

Manual examples:

```text
Nusrat: 80.00 + 3.0 * 20.00 = 140.00; minus 20% = BDT 112.00
Rafiq:  80.00 + 2.5 * 20.00 = 130.00; minus 20% = BDT 104.00
Two seats: Nusrat = BDT 224.00; Rafiq = BDT 208.00
Three seats: Nusrat = BDT 336.00; Rafiq = BDT 312.00
```

These first two examples reserve one seat each. Round the per-seat fare to integer poysha before multiplying by seats. Persist the **booking total** as a Decimal string and return it with `currency: "BDT"`. Route options contain one-seat quotes; the browser multiplies that quote for its preview only. The API independently recalculates the total from the route and validated `seatsRequested`. Do not accept distance, corridor, fare, passenger ID, or status from the browser.

The 20% discount is applied upfront, even before another passenger joins. Pool occupancy does not reprice a booking. Existing quotes remain unchanged; no data migration is needed for the per-seat rule.

Traffic/weather multipliers are unnecessary. If added, they must be fixed, visible inputs that preserve the evaluator's hand calculation.

## Create DTO

```ts
const CreateRequestSchema = z
  .object({
    pickupZone: z.enum(ZONES),
    destinationZone: z.enum(ZONES),
    seatsRequested: z.number().int().min(1).max(3),
    paymentMethod: z.enum(["CASH", "TESLAPAY"]),
  })
  .refine((value) => value.pickupZone !== value.destinationZone, {
    path: ["destinationZone"],
    message: "Pickup and destination must be different",
  });
```

## Passenger endpoints

```text
POST /v1/requests
GET  /v1/requests/mine
GET  /v1/requests/:id
POST /v1/requests/:id/cancel
```

All require a passenger JWT.

## Create request transaction

1. Resolve the route from the server-owned catalog.
2. Calculate the booking total using the route distance and `seatsRequested`.
3. Create `Request` with authenticated `passengerId` and `REQUESTED`.
4. Create `Event` with `type: REQUEST_CREATED`, no `fromStatus`, and `toStatus: REQUESTED`.
5. Commit and return a response DTO without private relations.

## Reads and cancellation

All reads are scoped by authenticated passenger ID. A matched response may include the pool ID, vehicle display name, and status, but never other passengers or their fares.

- `REQUESTED -> CANCELED`: update request and append event in one transaction.
- `MATCHED -> CANCELED`: delete membership, release its exact seats, update request, append request/pool events in one transaction. If this was the last member, also cancel the empty pool.
- After `DRIVER_ARRIVED` or `STARTED`: reject cancellation with `409 INVALID_TRANSITION`.

## Suggested commits

```text
feat(fare): add deterministic pooled fare policy
feat(rides): create and list passenger requests
feat(rides): enforce ownership and cancellation rules
```

## Acceptance gate

- Nusrat calculates to exactly `112.00` BDT.
- Rafiq calculates to exactly `104.00` BDT.
- Two-seat totals are `224.00` and `208.00`; three-seat totals are `336.00` and `312.00`.
- The browser preview, persisted request quote, driver request list, and pool-member fare agree.
- Unsupported route pairs return `422`.
- A passenger cannot retrieve or cancel another passenger's request.
- Create/cancel operations always write explanatory events.
