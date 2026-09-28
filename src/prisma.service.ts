import { Injectable, type OnApplicationShutdown, type OnModuleInit } from "@nestjs/common";

import { connectDatabase, db } from "./prisma/db";

@Injectable()
export class PrismaService implements OnModuleInit, OnApplicationShutdown {
  readonly db = db;

  async onModuleInit() {
    await connectDatabase();
  }

  async onApplicationShutdown() {
    await this.db.close();
  }
}
