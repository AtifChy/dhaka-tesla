# Step 8 - Next.js frontend

## Create the app

From the repository root on `feature/frontend-foundation`:

```bash
bunx create-next-app@latest web --ts --tailwind --eslint --app --src-dir --import-alias "@/*"
```

Keep the frontend a client of the NestJS API. Do not duplicate database/business rules in Next.js route handlers.

## Suggested structure

```text
web/src/
  app/
    login/page.tsx
    register/page.tsx
    passenger/
      request/page.tsx
      rides/page.tsx
      rides/[id]/page.tsx
    driver/
      dashboard/page.tsx
      history/page.tsx
  components/
    ui/
    feedback/
  features/
    auth/
    passenger/
    driver/
  lib/
    api-client.ts
    auth.ts
    money.ts
    types.ts
```

## Required flows

Passenger:

1. Register/login.
2. Select pickup, destination, seats, and Cash/TeslaPay.
3. Review server-calculated estimate.
4. Create request.
5. Track waiting, matched, arrived, started, completed/canceled.
6. Cancel only while the API permits.
7. View history.

Driver:

1. Login as Jashim.
2. Toggle Bullet online/offline.
3. View compatible requests.
4. Accept passengers until capacity is full.
5. See assigned passenger names and seat counts.
6. Mark arrived, started, and completed.
7. View history.

## UI state contract

Every data surface needs:

- Loading: skeleton/spinner and disabled repeat action.
- Error: human message, error code when useful, retry action.
- Empty: specific guidance, not a blank table.
- Success: visible status/fare and next valid action.
- Mutation pending: disable the exact button and prevent double submission.

Examples:

```text
No available requests: "No compatible Banani corridor requests right now."
Pool full: "Bullet's seats were just taken. Refresh available requests."
No history: "Completed or canceled rides will appear here."
```

## API client

Create one typed wrapper that:

- Uses `NEXT_PUBLIC_API_URL`.
- Sends `Content-Type: application/json`.
- Adds `Authorization: Bearer <token>` when present.
- Parses the stable API error envelope.
- Handles `401` by clearing the session and redirecting to login.
- Never logs passwords or tokens.

For this assessment, a short-lived access token may be kept in memory/session storage with the XSS trade-off documented. A production evolution would use secure HttpOnly cookies and refresh-token rotation.

## Money and privacy

Treat API fare values as decimal strings:

```ts
export function formatBdt(value: string): string {
  return `BDT ${value}`;
}
```

Do not convert to floating-point for calculations. The frontend displays server results only.

Passenger screens never receive or render another passenger's name, seats, fare, or status. Hiding a field in JSX is not authorization; the API must omit it.

## Refresh behavior

Polling every 3-5 seconds for an active ride is sufficient for the MVP. Stop polling on terminal state or when the tab is hidden. WebSockets are optional future work, not required.

## Suggested commits

```text
feat(web): add authentication screens and API client
feat(web): implement passenger request and history flows
feat(web): implement driver dashboard and lifecycle controls
fix(web): render loading empty and conflict states
```

## Acceptance gate

- Passenger and driver happy paths work without Swagger.
- Loading, error, empty, pending, and terminal states are visible.
- Repeated button clicks do not create duplicate mutations.
- Browser refresh has a documented session behavior.
- The UI never calculates an authoritative fare or capacity.
