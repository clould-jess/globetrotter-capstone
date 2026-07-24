# GlobeTrotter Travel Assistant — Phase 1 (Monolith)
## Threat Model & Secure Architecture Document

**Scope:** Local development only, no deployment yet
**Stack:** Next.js 14 (App Router) + Prisma 5 + PostgreSQL 15
**Prepared as:** CISO-level review, pre-implementation

---

## 1. System Overview

Phase 1 is a monolith exposing REST-style API routes (via Next.js Route Handlers) backed by a single PostgreSQL database via Prisma. Core features in scope:

- Auth (signup/login/session)
- Destination search & recommendations
- Itinerary CRUD (create/view/manage)
- Itinerary sharing (friends/family — multi-user access to one resource)

```
[Browser] --HTTPS/HTTP(local)--> [Next.js App Router: Pages + API Routes]
                                        |
                                  [Auth layer]
                                        |
                                  [Service/Business logic]
                                        |
                                  [Prisma Client]
                                        |
                                  [PostgreSQL]
```

Even running locally, we design as if this were internet-facing — Phase 3 will just add network exposure, not new logic. Security debt introduced now becomes much harder to retrofit once microservices split the trust boundaries.

---

## 2. Assets (What We're Protecting)

| Asset | Why it matters |
|---|---|
| User credentials (password hashes) | Full account takeover if compromised |
| Session tokens / JWTs | Session hijacking |
| User PII (email, travel preferences, past trips) | Privacy, regulatory exposure |
| Itinerary data | Contains travel dates/locations — physical safety implication (reveals when someone's home is empty) |
| Sharing/permission grants | Determines who can see/edit another user's itinerary |
| Database credentials / `.env` secrets | Full data breach if leaked |
| Recommendation logic | Lower sensitivity, but integrity matters (manipulated recs = trust/business risk) |

---

## 3. Trust Boundaries

1. **Browser ↔ Next.js server** — untrusted input boundary. Everything crossing this is hostile until validated.
2. **Next.js server ↔ PostgreSQL** — should be the *only* path to data; no client-side DB access.
3. **User A ↔ User B's data** — itinerary sharing means we have an *intra-application* trust boundary between tenants (users), not just an outer perimeter. This is the boundary most teams get wrong.

---

## 4. STRIDE Threat Analysis

### 4.1 Spoofing (identity)
| Threat | Risk | Mitigation |
|---|---|---|
| Credential stuffing / brute force login | High | Rate-limit `/api/auth/login`; account lockout/backoff; Argon2id or bcrypt (cost ≥12) for password hashing |
| Session fixation / token theft via XSS | High | HttpOnly + Secure + SameSite=Lax cookies for session tokens; never store JWTs in localStorage |
| Weak password policy | Medium | Enforce min length/entropy (NIST 800-63B style: length over complexity rules, check against breached-password lists) |

### 4.2 Tampering (data integrity)
| Threat | Risk | Mitigation |
|---|---|---|
| Mass assignment via Prisma (client sends extra fields, e.g. `role: "admin"`) | High | Explicit Zod schemas per endpoint; never spread raw `req.body` into `prisma.create()`/`update()` |
| Itinerary edited by non-owner | Critical | Every mutation checks `ownerId === session.user.id` OR explicit share-grant with `canEdit` flag — enforced server-side, never trust client-supplied user IDs |
| SQL injection | Low (Prisma parameterizes by default) | Never use `$queryRawUnsafe` with interpolated strings; if raw SQL needed, use tagged `$queryRaw` |

### 4.3 Repudiation (accountability)
| Threat | Risk | Mitigation |
|---|---|---|
| No record of who shared/deleted an itinerary | Medium | Audit log table: `actorId, action, resourceId, timestamp` for sensitive actions (share, delete, permission change) |
| Logs contain no correlation ID | Low | Generate request ID per API call, include in logs |

### 4.4 Information Disclosure (the big one for this app)
| Threat | Risk | Mitigation |
|---|---|---|
| **IDOR** — `GET /api/itineraries/:id` returns any itinerary regardless of requester | **Critical** | Server-side authorization check on every read: is requester the owner, or does a share-grant exist? Never rely on "unguessable ID" as security. |
| Verbose error messages leak stack traces/queries | Medium | Generic error responses to client; detailed errors only in server logs |
| Password hashes or emails leaked via over-fetching (Prisma `select *`) | High | Always use explicit `select`/`omit` in Prisma queries — never return the full User model to the client |
| Logging sensitive data (passwords, tokens, full itinerary contents) | Medium | Structured logging with an explicit denylist of fields never logged |

### 4.5 Denial of Service
| Threat | Risk | Mitigation |
|---|---|---|
| Unbounded recommendation/search queries | Medium | Pagination + query limits; timeout on DB queries |
| No rate limiting on any endpoint | Medium | Even locally, build rate-limiting middleware now (in-memory limiter is fine for Phase 1; Redis-backed comes in Phase 3/4) |

### 4.6 Elevation of Privilege
| Threat | Risk | Mitigation |
|---|---|---|
| Client-supplied role/permission fields trusted | High | Roles/permissions only ever set server-side, derived from session + DB, never from request body |
| Shared itinerary viewer able to escalate to editor/owner | High | Permission model checked explicitly per action, not just per resource (view ≠ edit ≠ delete ≠ re-share) |

---

## 5. Baseline Security Controls for Phase 1

**Authentication**
- Auth.js (NextAuth) with credentials provider, Argon2id password hashing
- Session via signed, HttpOnly, SameSite cookies (JWT or DB session — DB session preferred so you can revoke server-side)

**Authorization**
- Centralized `can(user, action, resource)` helper used in *every* API route touching user data — not scattered ad hoc checks
- Deny-by-default: if no explicit grant, access is denied

**Input validation**
- Zod schema per API route, applied before any DB call
- Reject unknown fields (`.strict()` schemas) to block mass assignment

**Secrets management**
- All secrets in `.env.local` (git-ignored), never committed
- `.env.example` with placeholder values committed instead
- DB user for the app has least-privilege grants (not `postgres` superuser)

**Transport & headers (even locally)**
- Security headers via Next.js middleware: `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`
- CSRF protection for state-changing requests (Auth.js provides this for its own routes; custom mutation routes need same-origin checks)

**Observability**
- Structured JSON logging (e.g. pino) with a denylist for sensitive fields
- Audit log table for share/permission/delete actions

**Dependency hygiene**
- `npm audit` (or better, `pnpm audit`) run before each phase milestone
- Lockfile committed

---

## 6. What We're Deliberately Deferring (Not Phase 1)

- Network-level controls (WAF, TLS termination, VPC) — Phase 3
- Rate limiting backed by shared store (Redis) — Phase 3/4
- Secrets manager (Vault/cloud KMS) — Phase 3
- Circuit breakers / message queues — Phase 4

Deferring these is fine *as long as* the application-layer boundaries (authz, input validation, secrets hygiene) are correct now — those don't get easier to add later, they get harder.

---

## 7. Immediate Action Items Before Writing Code

1. Define the Prisma schema with explicit ownership fields (`ownerId`) and a `ItineraryShare` join table (`itineraryId, userId, permission`) — get the sharing model right at the schema level.
2. Write the `can()` authorization helper first, before any route.
3. Set up Zod schemas per entity before scaffolding routes.
4. Add `.env.local` to `.gitignore` immediately, before the first commit.
