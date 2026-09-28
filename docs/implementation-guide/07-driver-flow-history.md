# Step 7 - driver flow, privacy, and history

## Driver endpoints

```text
GET  /v1/driver/vehicle
POST /v1/driver/vehicle/online
POST /v1/driver/vehicle/offline
GET  /v1/driver/requests/available
POST /v1/driver/requests/:requestId/accept
GET  /v1/driver/pools/active
POST /v1/driver/pools/:poolId/arrive
POST /v1/driver/pools/:poolId/start
POST /v1/driver/pools/:poolId/complete
GET  /v1/driver/pools/history
```

All endpoints require a driver JWT and ownership checks.

## Online/offline

- Online makes the vehicle eligible for matching.
- Offline prevents new assignments.
- Going offline must not abandon an active pool. Either reject with `409 ACTIVE_POOL` or keep the current trip active while blocking new matches; document the chosen behavior.

The simplest MVP rule is to reject offline while a non-terminal pool exists.

## Available requests

Return only `REQUESTED` requests compatible with the driver's online vehicle and active/new pool. Include only what the driver needs:

```json
{
  "id": 12,
  "passenger": { "id": 3, "name": "Nusrat" },
  "pickupZone": "BANANI",
  "destinationZone": "MOHAKHALI",
  "seatsRequested": 1,
  "estimatedFare": "112.00",
  "currency": "BDT"
}
```

The driver may see assigned passenger names and seats for the active trip. Passengers must never see other pool members or fares.

## Lifecycle commands

Each command:

1. Loads the pool scoped by `driverId`.
2. Calls the pure transition guard.
3. Updates the pool and all active member requests in one transaction.
4. Appends an event for the pool and affected requests.
5. Returns a driver-safe response DTO.

Do not implement a generic endpoint that accepts an arbitrary status from the client. Named commands (`arrive`, `start`, `complete`) expose intent and make authorization/testing clearer.

## Event design

Recommended event types:

```text
REQUEST_CREATED
REQUEST_MATCHED
REQUEST_CANCELED
POOL_CREATED
POOL_MEMBER_JOINED
POOL_MEMBER_LEFT
DRIVER_ARRIVED
TRIP_STARTED
TRIP_COMPLETED
```

Store only useful structured metadata, such as seats reserved/released or a cancellation reason code. Never store JWTs, passwords, authorization headers, or duplicated full user records.

Events are append-only application records. Correct mistakes by recording a new event and correcting current state through a deliberate operation; do not rewrite history silently.

## History reads

- Passenger history: only that passenger's requests, newest first.
- Driver history: only pools driven by that driver, newest first.
- Paginate both with a small bounded limit.
- Show terminal status, route, timestamps, vehicle/pool summary, and the caller's relevant fare.

## Suggested commits

```text
feat(driver): toggle vehicle availability safely
feat(driver): expose compatible requests and active pool
feat(driver): implement arrival start and completion commands
feat(history): expose role-scoped ride history
```

## Acceptance gate

- Drivers cannot operate another driver's vehicle or pool.
- Passengers cannot call driver endpoints.
- Lifecycle updates affect pool and member requests atomically.
- History explains the demonstrated journey in chronological order.
- Response DTOs expose no password hashes or unrelated passenger data.
