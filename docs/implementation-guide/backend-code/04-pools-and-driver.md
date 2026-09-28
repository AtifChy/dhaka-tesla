# 04 - Pools, driver flow, lifecycle, and history

The implemented driver flow uses one accept command. A driver does not manually create a pool and then add a member through two public endpoints. `accept()` finds the driver's compatible matched pool or creates it, atomically claims capacity, creates membership, transitions the request, and writes events in one transaction.

## Files

- `src/driver/driver.controller.ts` - REST/role boundary.
- `src/driver/driver.service.ts` - vehicle, matching, transaction, lifecycle, and ownership rules.
- `src/driver/pool-mapper.ts` - driver-only member response mapping.
- `src/driver/dto/driver-response.dto.ts` - Zod response contracts.
- `src/driver/driver.module.ts` - Nest module registration.

## `src/driver/driver.controller.ts`

```ts
import { Controller, Get, Param, ParseIntPipe, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ZodSerializerDto } from "nestjs-zod";

import type { AuthUser } from "../common/auth/auth-user";
import { CurrentUser } from "../common/auth/current-user.decorator";
import { Roles } from "../common/auth/roles.decorator";
import { DriverService } from "./driver.service";
import {
  AvailableRequestsResponseDto,
  PoolListResponseDto,
  PoolResponseDto,
  VehicleResponseDto,
} from "./dto/driver-response.dto";

@ApiTags("driver")
@ApiBearerAuth()
@Roles("DRIVER")
@Controller("driver")
export class DriverController {
  constructor(private readonly driver: DriverService) {}

  @Get("vehicle")
  @ZodSerializerDto(VehicleResponseDto)
  vehicle(@CurrentUser() user: AuthUser) {
    return this.driver.vehicle(user);
  }

  @Post("vehicle/online")
  @ZodSerializerDto(VehicleResponseDto)
  online(@CurrentUser() user: AuthUser) {
    return this.driver.setOnline(user, true);
  }

  @Post("vehicle/offline")
  @ZodSerializerDto(VehicleResponseDto)
  offline(@CurrentUser() user: AuthUser) {
    return this.driver.setOnline(user, false);
  }

  @Get("requests")
  @ZodSerializerDto(AvailableRequestsResponseDto)
  requests(@CurrentUser() user: AuthUser) {
    return this.driver.availableRequests(user);
  }

  @Post("requests/:requestId/accept")
  @ZodSerializerDto(PoolResponseDto)
  accept(@CurrentUser() user: AuthUser, @Param("requestId", ParseIntPipe) requestId: number) {
    return this.driver.accept(user, requestId);
  }

  @Post("pools/:poolId/arrive")
  @ZodSerializerDto(PoolResponseDto)
  arrive(@CurrentUser() user: AuthUser, @Param("poolId", ParseIntPipe) poolId: number) {
    return this.driver.transition(user, poolId, "DRIVER_ARRIVED");
  }

  @Post("pools/:poolId/start")
  @ZodSerializerDto(PoolResponseDto)
  start(@CurrentUser() user: AuthUser, @Param("poolId", ParseIntPipe) poolId: number) {
    return this.driver.transition(user, poolId, "STARTED");
  }

  @Post("pools/:poolId/complete")
  @ZodSerializerDto(PoolResponseDto)
  complete(@CurrentUser() user: AuthUser, @Param("poolId", ParseIntPipe) poolId: number) {
    return this.driver.transition(user, poolId, "COMPLETED");
  }

  @Get("pools")
  @ZodSerializerDto(PoolListResponseDto)
  pools(@CurrentUser() user: AuthUser) {
    return this.driver.pools(user);
  }

  @Get("pools/:poolId")
  @ZodSerializerDto(PoolResponseDto)
  pool(@CurrentUser() user: AuthUser, @Param("poolId", ParseIntPipe) poolId: number) {
    return this.driver.pool(user, poolId);
  }
}
```

## Atomic claim in `src/driver/driver.service.ts`

The full checked-in service is authoritative. Its critical race-safe operation is:

```ts
const claimSeats = db.raw.sql`
  UPDATE pools
  SET "occupiedSeats" = "occupiedSeats" + ${request.seatsRequested}
  WHERE id = ${pool.id}
    AND status = 'MATCHED'
    AND "occupiedSeats" + ${request.seatsRequested} <= capacity
`
  .affectedCount()
  .build();

const claimed = await transaction.execute(claimSeats);
if (claimed.affectedRows !== 1) {
  throw new DomainException(HttpStatus.CONFLICT, "POOL_FULL", "Not enough seats remain");
}
```

In the same transaction, the service creates `PoolMember`, conditionally changes the request from `REQUESTED` to `MATCHED`, and writes `REQUEST_MATCHED`. Any failure rolls the seat update back.

## Lifecycle

`transition(user, poolId, target)` scopes the pool by both ID and authenticated driver ID, validates the transition, rejects an empty pool, updates the pool, then updates every member request and event in the same transaction.

The only allowed forward path is:

```text
MATCHED -> DRIVER_ARRIVED -> STARTED -> COMPLETED
```

## Privacy

Passenger endpoints never use the driver mapper and therefore never expose other passenger names. The driver mapper exposes passenger name, destination, seats, and accepted fare only for a pool owned by that driver.
