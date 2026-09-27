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
