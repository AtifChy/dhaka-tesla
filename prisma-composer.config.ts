import { prismaCloud, prismaState } from "@prisma/composer-prisma-cloud/control";
import { defineConfig } from "@prisma/composer/config";
import { nodeBuild } from "@prisma/composer/node/control";

export default defineConfig({
  extensions: [prismaCloud({ region: "us-east-1" }), nodeBuild()],
  state: prismaState(),
});
