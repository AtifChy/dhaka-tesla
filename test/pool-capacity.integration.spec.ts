import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { AuthUser } from "../src/common/auth/auth-user";
import { DomainException } from "../src/common/errors/domain.exception";
import { DriverService } from "../src/driver/driver.service";
import { PrismaService } from "../src/prisma.service";
import { db } from "../src/prisma/db";

const prisma = new PrismaService();
const driverService = new DriverService(prisma);
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

let driver: AuthUser;
let driverId: number | undefined;
const passengerIds: number[] = [];

async function createRequest(passengerId: number, destinationZone: string) {
  return db.orm.public.Request.create({
    passengerId,
    pickupZone: "BANANI",
    destinationZone,
    corridor: "BANANI_NORTH",
    distanceMeters: 3_000,
    seatsRequested: 1,
    status: "REQUESTED",
    estimatedFare: "112.00",
    quotedFare: "112.00",
    paymentMethod: "CASH",
  });
}

describe("pool capacity integration", () => {
  beforeAll(async () => {
    await prisma.onModuleInit();

    const testDriver = await db.orm.public.User.create({
      name: "Capacity Driver",
      email: `capacity-driver-${suffix}@example.com`,
      passwordHash: "not-used-in-service-test",
      role: "DRIVER",
    });
    driverId = testDriver.id;
    driver = { id: testDriver.id, email: testDriver.email, role: "DRIVER" };
    await db.orm.public.Vehicle.create({
      driverId: testDriver.id,
      name: "Test Bullet",
      capacity: 2,
      isOnline: true,
    });

    for (const name of ["First", "Second", "Third"]) {
      const passenger = await db.orm.public.User.create({
        name,
        email: `capacity-${name.toLowerCase()}-${suffix}@example.com`,
        passwordHash: "not-used-in-service-test",
        role: "PASSENGER",
      });
      passengerIds.push(passenger.id);
    }
  });

  afterAll(async () => {
    if (driverId !== undefined) {
      await db.orm.public.Event.where({ actorId: driverId }).deleteAll();
      const pools = await db.orm.public.Pool.where({ driverId }).all();
      for (const pool of pools) {
        await db.orm.public.PoolMember.where({ poolId: pool.id }).deleteAll();
      }
      for (const passengerId of passengerIds) {
        await db.orm.public.Request.where({ passengerId }).deleteAll();
      }
      await db.orm.public.Pool.where({ driverId }).deleteAll();
      await db.orm.public.Vehicle.where({ driverId }).deleteAll();
      for (const passengerId of passengerIds) {
        await db.orm.public.User.where({ id: passengerId }).deleteAll();
      }
      await db.orm.public.User.where({ id: driverId }).deleteAll();
    }
    await db.close();
  });

  it("allows exactly one request to claim the final seat", async () => {
    const first = await createRequest(passengerIds[0]!, "MOHAKHALI");
    const second = await createRequest(passengerIds[1]!, "GULSHAN_1");
    const third = await createRequest(passengerIds[2]!, "GULSHAN_1");

    const initialPool = await driverService.accept(driver, first.id);
    expect(initialPool.occupiedSeats).toBe(1);

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

    const storedPool = await db.orm.public.Pool.where({ id: initialPool.id }).first();
    const memberships = await db.orm.public.PoolMember.where({
      poolId: initialPool.id,
    }).all();
    expect(storedPool?.occupiedSeats).toBe(2);
    expect(storedPool?.capacity).toBe(2);
    expect(memberships).toHaveLength(2);

    const contenders = await Promise.all([
      db.orm.public.Request.where({ id: second.id }).first(),
      db.orm.public.Request.where({ id: third.id }).first(),
    ]);
    expect(contenders.filter((request) => request?.status === "MATCHED")).toHaveLength(1);
    expect(contenders.filter((request) => request?.status === "REQUESTED")).toHaveLength(1);
  });
});
