import { Injectable, type OnApplicationShutdown, type OnModuleInit } from "@nestjs/common";

import { db } from "./prisma/db";
import { seed } from "./prisma/seed";

@Injectable()
export class PrismaService implements OnModuleInit, OnApplicationShutdown {
  readonly db = db;

  async onModuleInit() {
    await seed();
  }

  async onApplicationShutdown() {
    await this.db.close();
  }
}
