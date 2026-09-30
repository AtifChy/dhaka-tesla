import { HttpStatus, Injectable } from "@nestjs/common";

import type { AuthUser } from "../common/auth/auth-user";
import { DomainException } from "../common/errors/domain.exception";
import { PrismaService } from "../prisma.service";
import { db } from "../prisma/db";
import { calculatePooledFareBdt } from "./domain/fare-policy";
import { assertTransition } from "./domain/ride-transitions";
import { findRoute, ROUTES } from "./domain/route-catalog";
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

    const fare = calculatePooledFareBdt(route.distanceMeters, input.seatsRequested);
    const ride = await this.prisma.db.transaction(async (transaction) => {
      const created = await transaction.orm.public.Request.create({
        passengerId: user.id,
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
      await transaction.orm.public.Event.create({
        requestId: created.id,
        poolId: null,
        actorId: user.id,
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
    const rides = await this.prisma.db.orm.public.Request.where({ passengerId: user.id }).all();
    const responses = await Promise.all(
      rides.map(async (ride) => {
        const membership = await this.prisma.db.orm.public.PoolMember.where({
          requestId: ride.id,
        }).first();
        return toRideResponse(ride, membership?.poolId ?? null);
      }),
    );
    return responses.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async one(user: AuthUser, requestId: number): Promise<RideResponseDto> {
    const ride = await this.prisma.db.orm.public.Request.where({
      id: requestId,
      passengerId: user.id,
    }).first();
    if (!ride) {
      throw new DomainException(HttpStatus.NOT_FOUND, "RIDE_NOT_FOUND", "Ride not found");
    }

    const membership = await this.prisma.db.orm.public.PoolMember.where({ requestId }).first();
    return toRideResponse(ride, membership?.poolId ?? null);
  }

  async cancel(user: AuthUser, requestId: number): Promise<RideResponseDto> {
    return this.prisma.db.transaction(async (transaction) => {
      const ride = await transaction.orm.public.Request.where({
        id: requestId,
        passengerId: user.id,
      }).first();
      if (!ride) {
        throw new DomainException(HttpStatus.NOT_FOUND, "RIDE_NOT_FOUND", "Ride not found");
      }
      assertTransition(ride.status, "CANCELED");

      const membership = await transaction.orm.public.PoolMember.where({ requestId }).first();
      if (membership) {
        const releaseSeats = db.raw.sql`
          UPDATE pools
          SET "occupiedSeats" = "occupiedSeats" - ${membership.seats}
          WHERE id = ${membership.poolId}
            AND status = 'MATCHED'
            AND "occupiedSeats" >= ${membership.seats}
        `
          .affectedCount()
          .build();
        const released = await transaction.execute(releaseSeats);
        if (released.affectedRows !== 1) {
          throw new DomainException(
            HttpStatus.CONFLICT,
            "SEAT_RELEASE_FAILED",
            "Pool occupancy is inconsistent",
          );
        }
        await transaction.orm.public.PoolMember.where({ id: membership.id }).delete();
      }

      const updated = await transaction.orm.public.Request.where({
        id: requestId,
        passengerId: user.id,
        status: ride.status,
      }).update({ status: "CANCELED" });
      if (!updated) {
        throw new DomainException(
          HttpStatus.CONFLICT,
          "RIDE_CHANGED",
          "Ride status changed before cancellation",
        );
      }
      await transaction.orm.public.Event.create({
        requestId,
        poolId: membership?.poolId ?? null,
        actorId: user.id,
        type: "REQUEST_CANCELED",
        fromStatus: ride.status,
        toStatus: "CANCELED",
        metadata: membership ? { seatsReleased: membership.seats } : null,
      });

      if (membership) {
        const remaining = await transaction.orm.public.PoolMember.where({
          poolId: membership.poolId,
        }).first();
        if (!remaining) {
          const closeEmptyPool = db.raw.sql`
            UPDATE pools
            SET status = 'CANCELED'
            WHERE id = ${membership.poolId}
              AND status = 'MATCHED'
              AND "occupiedSeats" = 0
          `
            .affectedCount()
            .build();
          const closed = await transaction.execute(closeEmptyPool);
          if (closed.affectedRows !== 1) {
            throw new DomainException(
              HttpStatus.CONFLICT,
              "POOL_CLOSE_FAILED",
              "Empty pool could not be canceled",
            );
          }
          await transaction.orm.public.Event.create({
            requestId: null,
            poolId: membership.poolId,
            actorId: user.id,
            type: "POOL_CANCELED",
            fromStatus: "MATCHED",
            toStatus: "CANCELED",
            metadata: { reason: "LAST_MEMBER_CANCELED" },
          });
        }
      }

      return toRideResponse(updated, membership?.poolId ?? null);
    });
  }
}
