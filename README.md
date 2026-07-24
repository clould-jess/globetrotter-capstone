# GlobeTrotter Travel Assistant - Phase 1

Next.js 14 + Prisma 5 + SQLite for local testing. No deployment yet; this runs entirely on your machine.

See `docs/globetrotter-phase1-threat-model.md` for the security rationale behind the design decisions in this codebase.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment:
   ```bash
   copy .env.example .env
   copy .env.example .env.local
   ```
   Prisma CLI reads `.env`; Next.js reads `.env.local`.

3. Create the local SQLite database and generate Prisma Client:
   ```bash
   npm run db:sqlite
   npm run db:generate
   ```

4. Seed sample destinations:
   ```bash
   npm run db:seed
   ```

5. Run the app:
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000`.

## Project Layout

```text
app/                    web UI pages
app/api/auth/           signup, login, logout, me
app/api/itineraries/    CRUD + sharing
app/api/destinations/   search
app/api/health/         database-backed health check
lib/db.ts               Prisma client singleton
lib/session.ts          hashed-token session auth with HttpOnly cookie
lib/authz.ts            canAccessItinerary(), the authorization chokepoint
lib/audit.ts            audit log writer
lib/logger.ts           pino logger with sensitive-field redaction
lib/rateLimit.ts        in-memory rate limiter for Phase 1
lib/validations/        Zod schemas per resource
middleware.ts           security headers on every response
prisma/schema.prisma    User, Session, Itinerary, ItineraryShare, AuditLog, Destination
prisma/dev.db           local SQLite database, ignored by git
```

## Manual Security Checklist

Run these against your own local instance before moving to Phase 2:

- [ ] Create two users, A and B. Confirm B cannot `GET /api/itineraries/{A's id}` without a share grant. Expect 404, not the data.
- [ ] Share an itinerary from A to B with `VIEW` only. Confirm B's `PATCH` on it is rejected and B's `DELETE` is rejected.
- [ ] Confirm B cannot call `POST /api/itineraries/{id}/share` on A's itinerary, even with `EDIT` permission.
- [ ] Try sending `{"ownerId": "someone-else"}` in an itinerary create/update body. Confirm it is rejected or ignored, never respected.
- [ ] Try 15+ rapid login attempts with a wrong password. Confirm you get rate-limited with 429.
- [ ] Inspect login/signup responses and server logs. Confirm `passwordHash` never appears in a client response or log line.
- [ ] Check the session cookie in browser devtools. Confirm `HttpOnly` is set and the raw value does not directly match the `Session.tokenHash` value.
- [ ] Query the `AuditLog` table after a share/delete action. Confirm an entry was written.

## Notes

- SQLite is enabled now so the app can be tested without Docker/Postgres.
- PostgreSQL remains the target database for the original Phase 1 architecture and later cloud phases.
- Rate limiting is in-memory for Phase 1 and should move to Redis in Phase 3/4.
- Secrets are local `.env` files for now; Phase 3 should move secrets into the deployment platform's secrets manager.
