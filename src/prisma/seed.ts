import { argon2id, hash } from "argon2";

import { connectDatabase, db } from "./db.ts";

const DEMO_PASSWORD = "superstrongpassword";

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

  const userIdsByEmail = new Map<string, number>();

  for (const user of demoUsers) {
    const seededUser = await db.orm.public.User.select("id", "email").upsert({
      create: { ...user, passwordHash },
      update: {
        name: user.name,
        passwordHash,
        role: user.role,
      },
      conflictOn: { email: user.email },
    });

    userIdsByEmail.set(seededUser.email, seededUser.id);
  }

  const jashimId = userIdsByEmail.get("jashim@example.com");

  if (jashimId === undefined) {
    throw new Error("Jashim was not created during database seeding");
  }

  await db.orm.public.Vehicle.upsert({
    create: {
      driverId: jashimId,
      name: "Bullet",
      capacity: 3,
      isOnline: true,
    },
    update: {
      name: "Bullet",
      capacity: 3,
      isOnline: true,
    },
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
