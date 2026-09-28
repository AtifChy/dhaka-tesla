import { HttpStatus, Injectable } from "@nestjs/common";

import type { AuthUser } from "../common/auth/auth-user";
import { DomainException } from "../common/errors/domain.exception";
import { PrismaService } from "../prisma.service";
import { db } from "../prisma/db";
import { assertTransition, type RideStatus } from "../rides/domain/ride-transitions";
import type { PoolResponseDto } from "./dto/driver-response.dto";
import { loadPoolResponse } from "./pool-mapper";

const ACTIVE_STATUSES: RideStatus[] = ["MATCHED", "DRIVER_ARRIVED", "STARTED"];

@Injectable()
export class DriverService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireVehicle(driverId: number) {
    const vehicle = await this.prisma.db.orm.public.Vehicle.where({ driverId }).first();
    if (!vehicle) {
      throw new DomainException(
        HttpStatus.NOT_FOUND,
        "VEHICLE_NOT_FOUND",
        "Driver vehicle not found",
      );
    }
    return vehicle;
  }

  async vehicle(user: AuthUser) {
    const vehicle = await this.requireVehicle(user.id);
    return {
      id: vehicle.id,
      name: vehicle.name,
      capacity: vehicle.capacity,
      isOnline: vehicle.isOnline,
    };
  }

  async setOnline(user: AuthUser, isOnline: boolean) {
    const vehicle = await this.requireVehicle(user.id);
    if (!isOnline) {
      const pools = await this.prisma.db.orm.public.Pool.where({ driverId: user.id }).all();
      if (pools.some((pool) => ACTIVE_STATUSES.includes(pool.status))) {
        throw new DomainException(
          HttpStatus.CONFLICT,
          "ACTIVE_POOL",
          "Complete the active pool before going offline",
        );
      }
    }

    const updated = await this.prisma.db.orm.public.Vehicle.where({ id: vehicle.id }).update({
      isOnline,
    });
    if (!updated) throw new Error("Vehicle could not be updated");
    return {
      id: updated.id,
      name: updated.name,
      capacity: updated.capacity,
      isOnline: updated.isOnline,
    };
  }

  async availableRequests(user: AuthUser) {
    const vehicle = await this.requireVehicle(user.id);
    if (!vehicle.isOnline) {
      throw new DomainException(
        HttpStatus.CONFLICT,
        "VEHICLE_OFFLINE",
        "Go online before viewing requests",
      );
    }

    const pools = await this.prisma.db.orm.public.Pool.where({ driverId: user.id }).all();
    const activePool = pools.find((pool) => ACTIVE_STATUSES.includes(pool.status));
    const requests = await this.prisma.db.orm.public.Request.where({ status: "REQUESTED" }).all();
    const compatible = activePool
      ? requests.filter(
          (request) =>
            request.pickupZone === activePool.pickupZone &&
            request.corridor === activePool.corridor &&
            request.seatsRequested <= activePool.capacity - activePool.occupiedSeats,
        )
      : requests.filter((request) => request.seatsRequested <= vehicle.capacity);

    return Promise.all(
      compatible.map(async (request) => {
        const passenger = await this.prisma.db.orm.public.User.where({
          id: request.passengerId,
        }).first();
        if (!passenger) throw new Error(`Passenger ${request.passengerId} is missing`);
        return {
          id: request.id,
          passengerName: passenger.name,
          pickupZone: request.pickupZone,
          destinationZone: request.destinationZone,
          corridor: request.corridor,
          seatsRequested: request.seatsRequested,
          estimatedFare: request.estimatedFare,
          currency: "BDT" as const,
        };
      }),
    );
  }

  async accept(user: AuthUser, requestId: number): Promise<PoolResponseDto> {
    const poolId = await this.prisma.db.transaction(async (transaction) => {
      const vehicle = await transaction.orm.public.Vehicle.where({ driverId: user.id }).first();
      if (!vehicle) {
        throw new DomainException(
          HttpStatus.NOT_FOUND,
          "VEHICLE_NOT_FOUND",
          "Driver vehicle not found",
        );
      }
      if (!vehicle.isOnline) {
        throw new DomainException(
          HttpStatus.CONFLICT,
          "VEHICLE_OFFLINE",
          "Go online before accepting requests",
        );
      }

      const request = await transaction.orm.public.Request.where({ id: requestId }).first();
      if (!request || request.status !== "REQUESTED") {
        throw new DomainException(
          HttpStatus.CONFLICT,
          "REQUEST_UNAVAILABLE",
          "Request is no longer available",
        );
      }

      const pools = await transaction.orm.public.Pool.where({ driverId: user.id }).all();
      let pool = pools.find((candidate) => ACTIVE_STATUSES.includes(candidate.status));
      if (pool && pool.status !== "MATCHED") {
        throw new DomainException(
          HttpStatus.CONFLICT,
          "POOL_CLOSED",
          "The active pool no longer accepts passengers",
        );
      }
      if (pool && (pool.pickupZone !== request.pickupZone || pool.corridor !== request.corridor)) {
        throw new DomainException(
          HttpStatus.CONFLICT,
          "INCOMPATIBLE_ROUTE",
          "Request is not compatible with the active pool",
        );
      }

      if (!pool) {
        pool = await transaction.orm.public.Pool.create({
          driverId: user.id,
          vehicleId: vehicle.id,
          status: "MATCHED",
          pickupZone: request.pickupZone,
          corridor: request.corridor,
          capacity: vehicle.capacity,
          occupiedSeats: 0,
        });
        await transaction.orm.public.Event.create({
          requestId: null,
          poolId: pool.id,
          actorId: user.id,
          type: "POOL_CREATED",
          fromStatus: null,
          toStatus: "MATCHED",
          metadata: { vehicleId: vehicle.id, capacity: vehicle.capacity },
        });
      }

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

      await transaction.orm.public.PoolMember.create({
        poolId: pool.id,
        requestId: request.id,
        seats: request.seatsRequested,
        fare: request.quotedFare,
      });
      const updatedRequest = await transaction.orm.public.Request.where({
        id: request.id,
        status: "REQUESTED",
      }).update({ status: "MATCHED" });
      if (!updatedRequest) {
        throw new DomainException(
          HttpStatus.CONFLICT,
          "REQUEST_UNAVAILABLE",
          "Request was accepted by another driver",
        );
      }

      await transaction.orm.public.Event.create({
        requestId: request.id,
        poolId: pool.id,
        actorId: user.id,
        type: "REQUEST_MATCHED",
        fromStatus: "REQUESTED",
        toStatus: "MATCHED",
        metadata: { seatsReserved: request.seatsRequested },
      });

      return pool.id;
    });

    const response = await loadPoolResponse(this.prisma, poolId);
    if (!response) throw new Error("Accepted pool could not be loaded");
    return response;
  }

  async transition(
    user: AuthUser,
    poolId: number,
    target: "DRIVER_ARRIVED" | "STARTED" | "COMPLETED",
  ): Promise<PoolResponseDto> {
    await this.prisma.db.transaction(async (transaction) => {
      const pool = await transaction.orm.public.Pool.where({
        id: poolId,
        driverId: user.id,
      }).first();
      if (!pool) {
        throw new DomainException(HttpStatus.NOT_FOUND, "POOL_NOT_FOUND", "Pool not found");
      }
      assertTransition(pool.status, target);

      const memberships = await transaction.orm.public.PoolMember.where({ poolId }).all();
      if (memberships.length === 0) {
        throw new DomainException(
          HttpStatus.CONFLICT,
          "EMPTY_POOL",
          "An empty pool cannot start a trip",
        );
      }

      const updatedPool = await transaction.orm.public.Pool.where({ id: poolId }).update({
        status: target,
      });
      if (!updatedPool) throw new Error("Pool could not be updated");

      const eventType =
        target === "DRIVER_ARRIVED"
          ? "DRIVER_ARRIVED"
          : target === "STARTED"
            ? "TRIP_STARTED"
            : "TRIP_COMPLETED";

      await transaction.orm.public.Event.create({
        requestId: null,
        poolId,
        actorId: user.id,
        type: eventType,
        fromStatus: pool.status,
        toStatus: target,
        metadata: null,
      });

      for (const membership of memberships) {
        const request = await transaction.orm.public.Request.where({
          id: membership.requestId,
        }).first();
        if (!request) throw new Error(`Request ${membership.requestId} is missing`);
        assertTransition(request.status, target);

        const updatedRequest = await transaction.orm.public.Request.where({
          id: request.id,
        }).update({ status: target });
        if (!updatedRequest) throw new Error(`Request ${request.id} could not be updated`);
        await transaction.orm.public.Event.create({
          requestId: request.id,
          poolId,
          actorId: user.id,
          type: eventType,
          fromStatus: request.status,
          toStatus: target,
          metadata: null,
        });
      }
    });

    const response = await loadPoolResponse(this.prisma, poolId);
    if (!response) throw new Error("Transitioned pool could not be loaded");
    return response;
  }

  async pools(user: AuthUser): Promise<PoolResponseDto[]> {
    const pools = await this.prisma.db.orm.public.Pool.where({ driverId: user.id }).all();
    const responses = await Promise.all(
      pools.map((pool) => loadPoolResponse(this.prisma, pool.id)),
    );
    return responses
      .filter((pool): pool is PoolResponseDto => pool !== null)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async pool(user: AuthUser, poolId: number): Promise<PoolResponseDto> {
    const pool = await this.prisma.db.orm.public.Pool.where({
      id: poolId,
      driverId: user.id,
    }).first();
    if (!pool) {
      throw new DomainException(HttpStatus.NOT_FOUND, "POOL_NOT_FOUND", "Pool not found");
    }

    const response = await loadPoolResponse(this.prisma, pool.id);
    if (!response) throw new Error("Pool could not be loaded");
    return response;
  }
}
