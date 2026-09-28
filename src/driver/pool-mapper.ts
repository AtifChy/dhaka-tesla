import { PrismaService } from "../prisma.service";
import type { PoolResponseDto } from "./dto/driver-response.dto";

export async function loadPoolResponse(
  prisma: PrismaService,
  poolId: number,
): Promise<PoolResponseDto | null> {
  const pool = await prisma.db.orm.public.Pool.where({ id: poolId }).first();
  if (!pool) return null;

  const vehicle = await prisma.db.orm.public.Vehicle.where({ id: pool.vehicleId }).first();
  if (!vehicle) return null;

  const memberships = await prisma.db.orm.public.PoolMember.where({ poolId }).all();
  const members = await Promise.all(
    memberships.map(async (membership) => {
      const request = await prisma.db.orm.public.Request.where({
        id: membership.requestId,
      }).first();
      if (!request) throw new Error(`Request ${membership.requestId} is missing`);

      const passenger = await prisma.db.orm.public.User.where({
        id: request.passengerId,
      }).first();
      if (!passenger) throw new Error(`Passenger ${request.passengerId} is missing`);

      return {
        requestId: request.id,
        passengerName: passenger.name,
        destinationZone: request.destinationZone,
        seats: membership.seats,
        fare: membership.fare,
        currency: "BDT" as const,
      };
    }),
  );

  return {
    id: pool.id,
    vehicleId: vehicle.id,
    vehicleName: vehicle.name,
    status: pool.status,
    pickupZone: pool.pickupZone,
    corridor: pool.corridor,
    capacity: pool.capacity,
    occupiedSeats: pool.occupiedSeats,
    members,
    createdAt: pool.createdAt,
    updatedAt: pool.updatedAt,
  };
}
