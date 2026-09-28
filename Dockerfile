FROM oven/bun:1.4.2-alpine

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run contract:emit && bun run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["bun", "dist/server.mjs"]
