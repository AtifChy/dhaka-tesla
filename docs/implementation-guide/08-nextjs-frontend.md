# Step 8 - Next.js frontend

The implemented frontend lives in `web/` and uses Next.js App Router, React, shadcn/ui, Tailwind CSS, TypeScript, Zustand, Oxfmt, and Oxlint. Check `web/package.json` and `web/bun.lock` for the exact installed versions.

## Install and run

```bash
cd web
bun install
bun run dev
```

Open `http://localhost:3001`. Keep the backend on `http://localhost:3000`.

## Tooling

Prettier and ESLint were removed from the template. The replacement commands are:

```bash
bun run format
bun run format:check
bun run lint
bun run lint:fix
bun run typecheck
bun run build
```

- `.oxfmtrc.json` sorts imports and Tailwind classes, including classes passed through `cn()` and `cva()`.
- `.oxlintrc.json` enables React, Next.js, accessibility, TypeScript, promise, Unicorn, and Oxc rules with type-aware checks.
- `next.config.ts` fixes the Turbopack root, emits standalone Docker output, and proxies API requests.

## Implemented structure

```text
web/
  app/
    layout.tsx                 metadata, fonts, theme provider
    page.tsx                   application entry
  components/
    app-shell.tsx              hydration-safe auth/dashboard switch
    auth-screen.tsx            login plus passenger/driver registration
    dashboard-header.tsx       identity and logout
    passenger-dashboard.tsx    route quote, request, cancel, history
    driver-dashboard.tsx       vehicle, waiting requests, pools, history
    status-badge.tsx           shared lifecycle labels
    ui/                        shadcn/ui primitives
  lib/
    api.ts                     typed fetch boundary and error mapping
    types.ts                   API response/request types
  stores/
    auth-store.ts              persisted Zustand authentication only
```

Zustand is deliberately limited to the session shared across the whole application. Dashboard server data, forms, errors, and pending actions remain local to their owning component; a larger global store would add complexity without improving this MVP.

## Authentication and registration

The login form starts empty. Evaluators may use the quick-fill buttons for Nusrat, Rafiq, or Jashim.

Registration offers two explicit choices:

- Passenger sends name, email, and password to `POST /api/v1/auth/register`.
- Driver additionally sends vehicle name and capacity to `POST /api/v1/auth/register/driver`.

Driver creation is not implemented as an arbitrary role field. The backend command validates the vehicle data and creates the `DRIVER` plus their offline `Vehicle` in one transaction.

The 15-minute bearer token is persisted by Zustand in local storage for assessment convenience. This is an acknowledged XSS trade-off; a production design should prefer secure HttpOnly cookies with refresh-token rotation.

## Same-origin API integration

The browser client uses `/api/v1` by default. Next.js rewrites that path to the backend:

```text
browser http://localhost:3001/api/v1/...
    -> Next.js server proxy
    -> http://localhost:3000/api/v1/...
```

This avoids making local browser behavior depend on a separately started backend's CORS environment. Docker builds the same rule with `API_INTERNAL_URL=http://api:3000`, using the Compose service name instead of host localhost.

The API wrapper:

- sends JSON and bearer authentication;
- maps the stable backend error envelope to `ApiError`;
- clears the session on `401`;
- converts network failures into a useful message;
- never logs credentials or tokens.

## Passenger flow

1. Register or log in.
2. Load server-owned route options and fares.
3. Choose pickup, destination, seats, and Cash/TeslaPay.
4. Submit a request; no authoritative fare is calculated in the browser.
5. View waiting, matched, arrived, started, completed, or canceled status.
6. Cancel only while the API exposes a cancelable state.

## Driver flow

1. Register with a vehicle or log in as Jashim.
2. Toggle the vehicle online/offline.
3. View compatible unassigned requests.
4. Accept a request; the backend remains responsible for capacity enforcement.
5. Inspect occupancy and member details.
6. Advance a pool through arrived, started, and completed states.
7. View completed/canceled history.

## UI state contract

Each data surface renders:

- a skeleton or disabled control while loading;
- an inline alert for API/network errors;
- specific empty-state guidance;
- a disabled action with spinner while a mutation is pending;
- the server-provided fare, occupancy, and lifecycle state after success.

## Docker

`web/Dockerfile` installs from the frozen Bun lockfile, builds Next.js standalone output, and copies only the runtime server plus static assets to the final image. The root Compose stack waits for database, migration, and API health before starting the web service on port 3001.

```bash
docker compose up --build --wait
```

## Acceptance gate

```bash
cd web
bun outdated --latest
bun run format:check
bun run lint
bun run typecheck
bun run build
```

Also verify both seeded roles in a browser and confirm `/api/v1/health` succeeds through the Next.js origin.
