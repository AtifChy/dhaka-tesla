# Dhaka Tesla Pool web

Next.js 16 App Router frontend with React 19, shadcn/ui, Tailwind CSS 4, TypeScript 7, Oxfmt, and Oxlint.

## Development

From this `web` directory:

```bash
bun install
bun run dev
```

Open `http://localhost:3001`. Browser requests use the same-origin `/api/v1` path, and Next.js proxies them to the backend at `http://localhost:3000`.

Copy `.env.example` to `.env.local` only when those defaults need to change. `API_INTERNAL_URL` is server-only; `NEXT_PUBLIC_API_URL` should normally remain `/api/v1`.

## Quality checks

```bash
bun run format:check
bun run lint
bun run typecheck
bun run build
```

Use `bun run format` to apply Oxfmt and `bun run lint:fix` for safe Oxlint fixes.

## Add shadcn/ui components

```bash
bunx shadcn@latest add button
```

Generated components are placed in `components/ui` and can be imported through the `@/` alias.

## Docker

From the repository root, `docker compose up --build --wait` starts PostgreSQL, runs migrations and seed data, starts the API, and then starts this standalone Next.js image. The frontend health check is available on `http://localhost:3001`.
