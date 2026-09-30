import { prismaCloud, prismaState } from "@prisma/composer-prisma-cloud/control";
import { defineConfig } from "@prisma/composer/config";
import { nodeBuild } from "@prisma/composer/node/control";

export default defineConfig({
  extensions: [prismaCloud({ region: "ap-southeast-1" }), nodeBuild()],
  state: prismaState(),
});
