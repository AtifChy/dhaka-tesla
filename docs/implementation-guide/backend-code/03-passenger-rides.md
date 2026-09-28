# 03 - Passenger rides, geography, and fare code

The client chooses only a supported pickup, destination, seat count, and payment method. Distance, corridor, fare, status, and passenger ID are server-owned.

## `src/rides/domain/route-catalog.ts`

```ts
export const ZONES = ["BANANI", "GULSHAN_1", "MOHAKHALI", "DHANMONDI", "MIRPUR", "UTTARA"] as const;

export type Zone = (typeof ZONES)[number];

export interface RouteDefinition {
  pickupZone: Zone;
  destinationZone: Zone;
  distanceMeters: number;
  corridor: string;
}

const routes: RouteDefinition[] = [
  {
    pickupZone: "BANANI",
    destinationZone: "MOHAKHALI",
    distanceMeters: 3_000,
    corridor: "BANANI_NORTH",
  },
  {
    pickupZone: "BANANI",
    destinationZone: "GULSHAN_1",
    distanceMeters: 2_500,
    corridor: "BANANI_NORTH",
  },
  {
    pickupZone: "MIRPUR",
    destinationZone: "DHANMONDI",
    distanceMeters: 8_000,
    corridor: "MIRPUR_SOUTH",
  },
  {
    pickupZone: "UTTARA",
    destinationZone: "BANANI",
    distanceMeters: 12_000,
    corridor: "AIRPORT_ROAD",
  },
];

export const ROUTES: readonly RouteDefinition[] = routes;

export function findRoute(pickupZone: Zone, destinationZone: Zone): RouteDefinition | undefined {
  return routes.find(
    (route) => route.pickupZone === pickupZone && route.destinationZone === destinationZone,
  );
}
```

## `src/rides/domain/fare-policy.ts`

```ts
const BASE_FARE_POYSHA = 8_000;
const PER_KM_POYSHA = 2_000;
const POOLED_PERCENT = 80;

export function calculatePooledFarePoysha(distanceMeters: number): number {
  if (!Number.isInteger(distanceMeters) || distanceMeters <= 0) {
    throw new Error("distanceMeters must be a positive integer");
  }

  const distanceCharge = Math.round((distanceMeters * PER_KM_POYSHA) / 1_000);
  const soloFare = BASE_FARE_POYSHA + distanceCharge;
  return Math.round((soloFare * POOLED_PERCENT) / 100);
}

export function poyshaToBdt(poysha: number): string {
  if (!Number.isSafeInteger(poysha) || poysha < 0) throw new Error("Invalid poysha amount");
  return `${Math.floor(poysha / 100)}.${String(poysha % 100).padStart(2, "0")}`;
}

export function calculatePooledFareBdt(distanceMeters: number): string {
  return poyshaToBdt(calculatePooledFarePoysha(distanceMeters));
}
```

Manual checks required by the assignment:

```text
Nusrat: (BDT 80.00 + 3.0 km × BDT 20.00) × 80% = BDT 112.00
Rafiq:  (BDT 80.00 + 2.5 km × BDT 20.00) × 80% = BDT 104.00
```

## `src/rides/domain/ride-transitions.ts`

```ts
import { HttpStatus } from "@nestjs/common";
import { DomainException } from "../../common/errors/domain.exception";

export const RIDE_STATUSES = [
  "REQUESTED",
  "MATCHED",
  "DRIVER_ARRIVED",
  "STARTED",
  "COMPLETED",
  "CANCELED",
] as const;

export type RideStatus = (typeof RIDE_STATUSES)[number];

const allowed: Record<RideStatus, readonly RideStatus[]> = {
  REQUESTED: ["MATCHED", "CANCELED"],
  MATCHED: ["DRIVER_ARRIVED", "CANCELED"],
  DRIVER_ARRIVED: ["STARTED"],
  STARTED: ["COMPLETED"],
  COMPLETED: [],
  CANCELED: [],
};

export function assertTransition(from: RideStatus, to: RideStatus): void {
  if (!allowed[from].includes(to)) {
    throw new DomainException(
      HttpStatus.CONFLICT,
      "INVALID_TRANSITION",
      `Cannot change ride status from ${from} to ${to}`,
    );
  }
}
```

## `src/rides/dto/create-ride.dto.ts`

```ts
import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { ZONES } from "../domain/route-catalog";

const createRideSchema = z
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

export class CreateRideDto extends createZodDto(createRideSchema) {}
```

## `src/rides/dto/ride-response.dto.ts`

```ts
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const moneySchema = z.string().regex(/^\d+\.\d{2}$/);

export const rideResponseSchema = z.object({
  id: z.number().int().positive(),
  pickupZone: z.string(),
  destinationZone: z.string(),
  corridor: z.string(),
  distanceMeters: z.number().int().positive(),
  seatsRequested: z.number().int().positive(),
  status: z.enum(["REQUESTED", "MATCHED", "DRIVER_ARRIVED", "STARTED", "COMPLETED", "CANCELED"]),
  estimatedFare: moneySchema,
  quotedFare: moneySchema,
  currency: z.literal("BDT"),
  paymentMethod: z.enum(["CASH", "TESLAPAY"]),
  poolId: z.number().int().positive().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export class RideResponseDto extends createZodDto(rideResponseSchema) {}

export class RideListResponseDto extends createZodDto(z.array(rideResponseSchema)) {}
```

## `src/rides/dto/route-option.dto.ts`

```ts
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const routeOptionSchema = z.object({
  pickupZone: z.string(),
  destinationZone: z.string(),
  distanceMeters: z.number().int().positive(),
  corridor: z.string(),
  estimatedFare: z.string().regex(/^\d+\.\d{2}$/),
  currency: z.literal("BDT"),
});

export class RouteOptionsResponseDto extends createZodDto(z.array(routeOptionSchema)) {}
```

## `src/rides/ride-mapper.ts`

```ts
import type { Models } from "../prisma/contract";
import type { RideResponseDto } from "./dto/ride-response.dto";

type RideRow = Pick<
  Models.public_Request,
  | "id"
  | "pickupZone"
  | "destinationZone"
  | "corridor"
  | "distanceMeters"
  | "seatsRequested"
  | "status"
  | "estimatedFare"
  | "quotedFare"
  | "paymentMethod"
  | "createdAt"
  | "updatedAt"
>;

export function toRideResponse(ride: RideRow, poolId: number | null): RideResponseDto {
  return {
    id: ride.id,
    pickupZone: ride.pickupZone,
    destinationZone: ride.destinationZone,
    corridor: ride.corridor,
    distanceMeters: ride.distanceMeters,
    seatsRequested: ride.seatsRequested,
    status: ride.status,
    estimatedFare: ride.estimatedFare,
    quotedFare: ride.quotedFare,
    currency: "BDT",
    paymentMethod: ride.paymentMethod,
    poolId,
    createdAt: ride.createdAt,
    updatedAt: ride.updatedAt,
  };
}
```

## `src/rides/rides.service.ts`

```ts
import { HttpStatus, Injectable } from "@nestjs/common";
import type { AuthUser } from "../common/auth/auth-user";
import { DomainException } from "../common/errors/domain.exception";
import { db } from "../prisma/db";
import { PrismaService } from "../prisma.service";
import { calculatePooledFareBdt } from "./domain/fare-policy";
import { findRoute, ROUTES } from "./domain/route-catalog";
import { assertTransition } from "./domain/ride-transitions";
import type { CreateRideDto } from "./dto/create-ride.dto";
import type { RideResponseDto } from "./dto/ride-response.dto";
import { toRideResponse } from "./ride-mapper";

@Injectable()
export class RidesService {
  constructor(private readonly prisma: PrismaService) {}

  options() {
    return ROUTES.map((route) => ({
      ...route,
      estimatedFare: calculatePooledFareBdt(route.distanceMeters),
      currency: "BDT" as const,
    }));
  }

  async create(user: AuthUser, input: CreateRideDto): Promise<RideResponseDto> {
    const route = findRoute(input.pickupZone, input.destinationZone);
    if (!route) {
      throw new DomainException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        "UNSUPPORTED_ROUTE",
        "This route is not supported",
      );
    }

    const fare = calculatePooledFareBdt(route.distanceMeters);
    const ride = await this.prisma.db.transaction(async (tx) => {
      const created = await tx.orm.public.Request.create({
        passengerId: user.userId,
        pickupZone: route.pickupZone,
        destinationZone: route.destinationZone,
        corridor: route.corridor,
        distanceMeters: route.distanceMeters,
        seatsRequested: input.seatsRequested,
        status: "REQUESTED",
        estimatedFare: fare,
        quotedFare: fare,
        paymentMethod: input.paymentMethod,
      });
      await tx.orm.public.Event.create({
        requestId: created.id,
        poolId: null,
        actorId: user.userId,
        type: "REQUEST_CREATED",
        fromStatus: null,
        toStatus: "REQUESTED",
        metadata: { paymentMethod: input.paymentMethod },
      });
      return created;
    });
    return toRideResponse(ride, null);
  }

  async mine(user: AuthUser): Promise<RideResponseDto[]> {
    const rides = await this.prisma.db.orm.public.Request.where({ passengerId: user.userId }).all();
    const output = await Promise.all(
      rides.map(async (ride) => {
        const member = await this.prisma.db.orm.public.PoolMember.where({
          requestId: ride.id,
        }).first();
        return toRideResponse(ride, member?.poolId ?? null);
      }),
    );
    return output.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async oneForUser(user: AuthUser, requestId: number): Promise<RideResponseDto> {
    const ride = await this.prisma.db.orm.public.Request.where({ id: requestId }).first();
    if (!ride) throw new DomainException(HttpStatus.NOT_FOUND, "RIDE_NOT_FOUND", "Ride not found");

    if (user.role === "PASSENGER" && ride.passengerId !== user.userId) {
      throw new DomainException(HttpStatus.NOT_FOUND, "RIDE_NOT_FOUND", "Ride not found");
    }
    const member = await this.prisma.db.orm.public.PoolMember.where({ requestId }).first();
    if (user.role === "DRIVER") {
      if (!member)
        throw new DomainException(HttpStatus.NOT_FOUND, "RIDE_NOT_FOUND", "Ride not found");
      const pool = await this.prisma.db.orm.public.Pool.where({ id: member.poolId }).first();
      if (!pool || pool.driverId !== user.userId) {
        throw new DomainException(HttpStatus.NOT_FOUND, "RIDE_NOT_FOUND", "Ride not found");
      }
    }
    return toRideResponse(ride, member?.poolId ?? null);
  }

  async cancel(user: AuthUser, requestId: number): Promise<RideResponseDto> {
    return this.prisma.db.transaction(async (tx) => {
      const ride = await tx.orm.public.Request.where({
        id: requestId,
        passengerId: user.userId,
      }).first();
      if (!ride)
        throw new DomainException(HttpStatus.NOT_FOUND, "RIDE_NOT_FOUND", "Ride not found");
      assertTransition(ride.status, "CANCELED");

      const member = await tx.orm.public.PoolMember.where({ requestId }).first();
      if (member) {
        const releasePlan = db.raw.sql`
          UPDATE pools
          SET "occupiedSeats" = "occupiedSeats" - ${member.seats}
          WHERE id = ${member.poolId} AND "occupiedSeats" >= ${member.seats}
        `
          .affectedCount()
          .build();
        const released = await tx.execute(releasePlan);
        if (released.affectedRows !== 1) {
          throw new DomainException(
            HttpStatus.CONFLICT,
            "SEAT_RELEASE_FAILED",
            "Pool occupancy is inconsistent",
          );
        }
        await tx.orm.public.PoolMember.where({ id: member.id }).delete();
      }

      const updated = await tx.orm.public.Request.where({ id: requestId }).update({
        status: "CANCELED",
      });
      await tx.orm.public.Event.create({
        requestId,
        poolId: member?.poolId ?? null,
        actorId: user.userId,
        type: "REQUEST_CANCELED",
        fromStatus: ride.status,
        toStatus: "CANCELED",
        metadata: member ? { seatsReleased: member.seats } : null,
      });
      return toRideResponse(updated, member?.poolId ?? null);
    });
  }
}
```

## `src/rides/rides.controller.ts`

```ts
import { Body, Controller, Get, Param, ParseIntPipe, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ZodSerializerDto } from "nestjs-zod";
import { CurrentUser } from "../common/auth/current-user.decorator";
import type { AuthUser } from "../common/auth/auth-user";
import { Roles } from "../common/auth/roles.decorator";
import { CreateRideDto } from "./dto/create-ride.dto";
import { RideListResponseDto, RideResponseDto } from "./dto/ride-response.dto";
import { RouteOptionsResponseDto } from "./dto/route-option.dto";
import { RidesService } from "./rides.service";

@ApiTags("rides")
@ApiBearerAuth()
@Controller("rides")
export class RidesController {
  constructor(private readonly rides: RidesService) {}

  @Get("options")
  @ZodSerializerDto(RouteOptionsResponseDto)
  options() {
    return this.rides.options();
  }

  @Roles("PASSENGER")
  @Post()
  @ZodSerializerDto(RideResponseDto)
  create(@CurrentUser() user: AuthUser, @Body() input: CreateRideDto) {
    return this.rides.create(user, input);
  }

  @Roles("PASSENGER")
  @Get("me")
  @ZodSerializerDto(RideListResponseDto)
  mine(@CurrentUser() user: AuthUser) {
    return this.rides.mine(user);
  }

  @Get(":id")
  @ZodSerializerDto(RideResponseDto)
  one(@CurrentUser() user: AuthUser, @Param("id", ParseIntPipe) id: number) {
    return this.rides.oneForUser(user, id);
  }

  @Roles("PASSENGER")
  @Post(":id/cancel")
  @ZodSerializerDto(RideResponseDto)
  cancel(@CurrentUser() user: AuthUser, @Param("id", ParseIntPipe) id: number) {
    return this.rides.cancel(user, id);
  }
}
```

## `src/rides/rides.module.ts`

```ts
import { Module } from "@nestjs/common";
import { RidesController } from "./rides.controller";
import { RidesService } from "./rides.service";

@Module({
  controllers: [RidesController],
  providers: [RidesService],
  exports: [RidesService],
})
export class RidesModule {}
```

PostgreSQL `Decimal`/`numeric` values are represented by Prisma 8 as strings. Keeping that string through the response prevents a value like `123.40` from being rounded or serialized as `123.4`.
