# 00 - Database and seed code

This chapter retains simple integer IDs and the six assignment-focused tables. It adds the database invariant that occupied seats can never be greater than pool capacity.

## `src/prisma/contract.prisma`

```prisma
// use prisma-8
enum Role {
  PASSENGER
  DRIVER
}

enum Status {
  REQUESTED
  MATCHED
  DRIVER_ARRIVED
  STARTED
  COMPLETED
  CANCELED
}

enum PaymentMethod {
  CASH
  TESLAPAY
}

model User {
  id           Int               @id @default(autoincrement())
  name         String
  email        String            @unique
  passwordHash String
  role         Role
  vehicle      Vehicle?
  requests     Request[]
  pools        Pool[]
  events       Event[]
  createdAt    TimestamptzString @default(now())
  updatedAt    temporal.updatedAtString()

  @@index([role])
  @@map("users")
}

model Vehicle {
  id        Int               @id @default(autoincrement())
  driverId  Int               @unique
  name      String
  capacity  Int
  isOnline  Boolean           @default(false)
  driver    User              @relation(fields: [driverId], references: [id], onDelete: Restrict)
  pools     Pool[]
  createdAt TimestamptzString @default(now())
  updatedAt temporal.updatedAtString()

  @@check(expression: "capacity > 0", name: "vehicle_capacity_positive")
  @@map("vehicles")
}

model Request {
  id              Int               @id @default(autoincrement())
  passengerId     Int
  passenger       User              @relation(fields: [passengerId], references: [id], onDelete: Restrict)
  pickupZone      String
  destinationZone String
  corridor        String
  distanceMeters  Int
  seatsRequested  Int
  status          Status            @default(REQUESTED)
  estimatedFare   Decimal
  quotedFare      Decimal
  paymentMethod   PaymentMethod
  membership      PoolMember?
  events          Event[]
  createdAt       TimestamptzString @default(now())
  updatedAt       temporal.updatedAtString()

  @@check(expression: "\"distanceMeters\" > 0", name: "request_distance_positive")
  @@check(expression: "\"seatsRequested\" > 0", name: "request_seats_positive")
  @@check(expression: "\"estimatedFare\" >= 0 AND \"estimatedFare\" = round(\"estimatedFare\", 2)", name: "request_estimated_fare_valid")
  @@check(expression: "\"quotedFare\" >= 0 AND \"quotedFare\" = round(\"quotedFare\", 2)", name: "request_quoted_fare_valid")
  @@index([passengerId, createdAt])
  @@index([status, pickupZone, corridor, createdAt])
  @@map("requests")
}

model Pool {
  id            Int               @id @default(autoincrement())
  driverId      Int
  driver        User              @relation(fields: [driverId], references: [id], onDelete: Restrict)
  vehicleId     Int
  vehicle       Vehicle           @relation(fields: [vehicleId], references: [id], onDelete: Restrict)
  status        Status            @default(MATCHED)
  pickupZone    String
  corridor      String
  capacity      Int
  occupiedSeats Int               @default(0)
  members       PoolMember[]
  events        Event[]
  createdAt     TimestamptzString @default(now())
  updatedAt     temporal.updatedAtString()

  @@check(expression: "capacity > 0", name: "pool_capacity_positive")
  @@check(expression: "\"occupiedSeats\" >= 0", name: "pool_occupied_seats_nonnegative")
  @@check(expression: "\"occupiedSeats\" <= capacity", name: "pool_capacity_not_exceeded")
  @@index([driverId, status])
  @@index([vehicleId, status])
  @@index([pickupZone, corridor, status])
  @@map("pools")
}

model PoolMember {
  id        Int               @id @default(autoincrement())
  poolId    Int
  pool      Pool              @relation(fields: [poolId], references: [id], onDelete: Restrict)
  requestId Int               @unique
  request   Request           @relation(fields: [requestId], references: [id], onDelete: Restrict)
  seats     Int
  fare      Decimal
  joinedAt  TimestamptzString @default(now())

  @@check(expression: "seats > 0", name: "pool_member_seats_positive")
  @@check(expression: "fare >= 0", name: "pool_member_fare_nonnegative")
  @@index([poolId])
  @@map("pool_members")
}

model Event {
  id         Int               @id @default(autoincrement())
  requestId  Int?
  request    Request?          @relation(fields: [requestId], references: [id], onDelete: Restrict)
  poolId     Int?
  pool       Pool?             @relation(fields: [poolId], references: [id], onDelete: Restrict)
  actorId    Int
  actor      User              @relation(fields: [actorId], references: [id], onDelete: Restrict)
  type       String
  fromStatus Status?
  toStatus   Status?
  metadata   Json?
  createdAt  TimestamptzString @default(now())

  @@index([requestId, createdAt])
  @@index([poolId, createdAt])
  @@map("events")
}
```

## `src/prisma/db.ts`

```ts
import postgres from "@prisma/orm-postgres/runtime";

import "temporal-polyfill/global";

import service from "../../service.ts";
import type { Contract } from "./contract.d.ts";
import contractJson from "./contract.json" with { type: "json" };

function loadComposerDatabase() {
  try {
    return service.load().database.client;
  } catch {
    return undefined;
  }
}

export const db =
  loadComposerDatabase() ??
  (process.env.DATABASE_URL
    ? postgres<Contract>({ contractJson, url: process.env.DATABASE_URL })
    : postgres<Contract>({ contractJson }));

let connection: Promise<void> | undefined;

export function connectDatabase(): Promise<void> {
  connection ??= db
    .connect()
    .then(() => undefined)
    .catch((error: unknown) => {
      connection = undefined;
      throw error;
    });
  return connection;
}
```

## `src/prisma.service.ts`

```ts
import { Injectable, type OnApplicationShutdown, type OnModuleInit } from "@nestjs/common";
import { connectDatabase, db } from "./prisma/db";

@Injectable()
export class PrismaService implements OnModuleInit, OnApplicationShutdown {
  readonly db = db;

  async onModuleInit(): Promise<void> {
    await connectDatabase();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.db.close();
  }
}
```

## `src/prisma/seed.ts`

```ts
import { argon2id, hash } from "argon2";
import { connectDatabase, db } from "./db.ts";

export const DEMO_PASSWORD = "superstrongpassword";

const demoUsers = [
  { name: "Jashim", email: "jashim@example.com", role: "DRIVER" },
  { name: "Nusrat", email: "nusrat@example.com", role: "PASSENGER" },
  { name: "Rafiq", email: "rafiq@example.com", role: "PASSENGER" },
  { name: "Shirin", email: "shirin@example.com", role: "PASSENGER" },
] as const;

let pendingSeed: Promise<void> | undefined;

async function runSeed(): Promise<void> {
  await connectDatabase();

  const passwordHash = await hash(DEMO_PASSWORD, {
    type: argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });

  const ids = new Map<string, number>();
  for (const user of demoUsers) {
    const saved = await db.orm.public.User.select("id", "email").upsert({
      create: { ...user, passwordHash },
      update: { name: user.name, passwordHash, role: user.role },
      conflictOn: { email: user.email },
    });
    ids.set(saved.email, saved.id);
  }

  const jashimId = ids.get("jashim@example.com");
  if (jashimId === undefined) throw new Error("Jashim seed failed");

  await db.orm.public.Vehicle.upsert({
    create: { driverId: jashimId, name: "Bullet", capacity: 3, isOnline: true },
    update: { name: "Bullet", capacity: 3, isOnline: true },
    conflictOn: { driverId: jashimId },
  });
}

export function seed(): Promise<void> {
  pendingSeed ??= runSeed().catch((error: unknown) => {
    pendingSeed = undefined;
    throw error;
  });
  return pendingSeed;
}
```

## `scripts/seed.ts`

```ts
import { db } from "../src/prisma/db";
import { seed } from "../src/prisma/seed";

try {
  await seed();
  console.log("Database seed completed.");
} catch (error: unknown) {
  console.error("Database seed failed:", error);
  process.exitCode = 1;
} finally {
  await db.close();
}
```

## Apply the database code

```bash
bun run contract:emit
bun run migration:plan --name backend_constraints
bun run migrate
bun run db:seed
bun run db:verify
```

Review the generated migration before applying it. The contract is the source of truth; do not hand-edit `contract.d.ts` or `contract.json`.
