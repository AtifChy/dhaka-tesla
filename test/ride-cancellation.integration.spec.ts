import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { AuthUser } from "../src/common/auth/auth-user";
import { DriverService } from "../src/driver/driver.service";
import { PrismaService } from "../src/prisma.service";
import { db } from "../src/prisma/db";
import { RidesService } from "../src/rides/rides.service";

const prisma = new PrismaService();
const rides = new RidesService(prisma);
const driverService = new DriverService(prisma);
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const userIds: number[] = [];
const requestIds: number[] = [];
const poolIds: number[] = [];
let driver: AuthUser;
let nusrat: AuthUser;
let shirin: AuthUser;

async function createUser(name: string, role: AuthUser["role"]): Promise<AuthUser> {
  const user = await db.orm.public.User.create({
    name,
    email: `cancellation-${name.toLowerCase()}-${suffix}@example.com`,
    passwordHash: "not-used-in-service-test",
    role,
  });
  userIds.push(user.id);
  return { id: user.id, email: user.email, role };
}

describe("ride cancellation integration", () => {
  beforeAll(async () => {
    await prisma.onModuleInit();
    driver = await createUser("Jashim", "DRIVER");
    nusrat = await createUser("Nusrat", "PASSENGER");
    shirin = await createUser("Shirin", "PASSENGER");
    await db.orm.public.Vehicle.create({
      driverId: driver.id,
      name: "Test Bullet",
      capacity: 3,
      isOnline: true,
    });
  });

  afterAll(async () => {
    try {
      for (const requestId of requestIds) {
        await db.orm.public.Event.where({ requestId }).deleteAll();
      }
      for (const poolId of poolIds) {
        await db.orm.public.Event.where({ poolId }).deleteAll();
      }
      for (const userId of userIds) {
        await db.orm.public.Event.where({ actorId: userId }).deleteAll();
      }
      for (const poolId of poolIds) {
        await db.orm.public.PoolMember.where({ poolId }).deleteAll();
      }
      for (const requestId of requestIds) {
        await db.orm.public.Request.where({ id: requestId }).deleteAll();
      }
      for (const poolId of poolIds) {
        await db.orm.public.Pool.where({ id: poolId }).deleteAll();
      }
      if (driver) await db.orm.public.Vehicle.where({ driverId: driver.id }).deleteAll();
      for (const userId of userIds) {
        await db.orm.public.User.where({ id: userId }).deleteAll();
      }
    } finally {
      await db.close();
    }
  }, 30_000);

  it("protects ownership, closes an empty matched pool, and rejects late cancellation", async () => {
    const first = await rides.create(nusrat, {
      pickupZone: "BANANI",
      destinationZone: "MOHAKHALI",
      seatsRequested: 1,
      paymentMethod: "CASH",
    });
    requestIds.push(first.id);

    await expect(rides.one(shirin, first.id)).rejects.toMatchObject({
      code: "RIDE_NOT_FOUND",
    });
    await expect(rides.cancel(shirin, first.id)).rejects.toMatchObject({
      code: "RIDE_NOT_FOUND",
    });

    const firstPool = await driverService.accept(driver, first.id);
    poolIds.push(firstPool.id);
    const canceled = await rides.cancel(nusrat, first.id);
    expect(canceled.status).toBe("CANCELED");
    expect(await db.orm.public.PoolMember.where({ poolId: firstPool.id }).all()).toHaveLength(0);
    expect(await db.orm.public.Pool.where({ id: firstPool.id }).first()).toMatchObject({
      status: "CANCELED",
      occupiedSeats: 0,
    });
    expect(
      await db.orm.public.Event.where({ poolId: firstPool.id, type: "POOL_CANCELED" }).first(),
    ).toMatchObject({ fromStatus: "MATCHED", toStatus: "CANCELED" });

    await expect(driverService.setOnline(driver, false)).resolves.toMatchObject({
      isOnline: false,
    });
    await driverService.setOnline(driver, true);

    const second = await rides.create(shirin, {
      pickupZone: "BASHUNDHARA",
      destinationZone: "BADDA",
      seatsRequested: 1,
      paymentMethod: "TESLAPAY",
    });
    requestIds.push(second.id);
    const secondPool = await driverService.accept(driver, second.id);
    poolIds.push(secondPool.id);
    expect(secondPool.id).not.toBe(firstPool.id);

    await driverService.transition(driver, secondPool.id, "DRIVER_ARRIVED");
    await expect(rides.cancel(shirin, second.id)).rejects.toMatchObject({
      code: "INVALID_TRANSITION",
    });
    expect(await db.orm.public.Request.where({ id: second.id }).first()).toMatchObject({
      status: "DRIVER_ARRIVED",
    });

    await driverService.transition(driver, secondPool.id, "STARTED");
    await driverService.transition(driver, secondPool.id, "COMPLETED");
  }, 30_000);
});
