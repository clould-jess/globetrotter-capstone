# GlobeTrotter Travel Assistant — Full Project Plan
**Audience:** AI coding agent (Codex) executing implementation work
**Human owner:** Jess (final-semester ICT student) — CISO/architecture decisions are pre-made below; do not deviate from the security requirements in Section 2 without flagging it back to the human first.

---

## 0. What Already Exists

Phase 1 backend is already scaffolded and working (npm install + tsc --noEmit both pass clean). Do not rebuild it from scratch — extend it. Location: repo root as delivered (`globetrotter-phase1.zip`).

Already implemented:
- `prisma/schema.prisma` — User, Session, Itinerary, ItineraryShare, AuditLog, Destination models
- `lib/session.ts` — hashed-token session auth, HttpOnly cookies
- `lib/authz.ts` — `canAccessItinerary()`, the single authorization chokepoint
- `lib/audit.ts`, `lib/logger.ts`, `lib/rateLimit.ts`
- `lib/validations/*` — Zod schemas (auth, itinerary, search)
- API routes: `auth/{signup,login,logout,me}`, `itineraries` (CRUD), `itineraries/[id]/share`, `destinations/search`
- `middleware.ts` — security headers on every response

Not yet built (this is the near-term backlog — see Section 4.2): frontend UI, recommendation logic, automated tests, user preferences data model, health-check endpoint.

---

## 1. Project Charter

**What:** GlobeTrotter Travel Assistant — a distributed travel recommendation and itinerary system, built as a portfolio-grade demonstration of distributed-systems concepts, progressing through four phases of architectural maturity.

**Business requirements (source of truth — every phase must still satisfy these):**
- Users can search destinations and get personalized recommendations
- Users can create, view, and manage travel itineraries
- Users can share itineraries with friends and family
- System must handle millions of users globally (target, not Phase 1 reality)
- Recommendations based on user preferences, past trips, and popular destinations
- 24/7 availability, minimal downtime

**Technical requirements:**
- Scalable to millions of users
- Resilient to failures (no single point of failure)
- Rapid iteration and deployment
- Cost-effective (pay only for what you use)
- Observable (metrics, logging, tracing)

**Phase learning outcomes (per course brief):**

| Phase | Outcome |
|---|---|
| 1. Monolith | Understand limitations of centralized architectures; build a working REST API |
| 2. Microservices | Service decomposition, inter-service communication, API design |
| 3. Cloud Deployment | Containerization, load balancing, auto-scaling, cloud deployment |
| 4. Resilience | Caching, message queues, circuit breakers, fault tolerance |

---

## 2. Non-Negotiable Security Requirements (All Phases)

These are architectural constraints, not suggestions. An AI coding agent implementing any phase must satisfy these; if a feature request conflicts with one of these, stop and flag it rather than silently weakening the control.

1. **Deny-by-default authorization.** Every resource access (itinerary, and any resource added later) goes through a centralized authorization function, never an inline ownership check copy-pasted per route. IDOR is the single highest-risk bug class in this app because of itinerary sharing — treat it as such.
2. **No client-trusted identity or role fields.** `ownerId`, `role`, `permission` on a resource are never accepted from request bodies — only derived server-side from the authenticated session.
3. **Input validation at every boundary.** Every API input validated against an explicit schema (Zod today; whatever the language-appropriate equivalent is in later phases) with unknown fields rejected, not silently dropped.
4. **Secrets never in source control.** `.env*` files (or language equivalent) git-ignored; only `.env.example` with placeholders committed. Phase 3+ must migrate to a secrets manager (cloud KMS/Vault) — plaintext env files are a Phase 1–2 convenience only.
5. **Passwords hashed with Argon2id** (or bcrypt cost ≥ 12 if a stack constraint forces it) — never reversible encryption, never plaintext.
6. **Sessions/tokens revocable server-side.** Whatever auth mechanism is used, there must be a way to kill a session without waiting for a JWT to expire. If JWTs are introduced in Phase 2 for service-to-service auth, maintain a revocation/blocklist mechanism.
7. **No verbose error leakage.** Client-facing errors are generic; stack traces, query text, and internal identifiers stay in server-side logs only.
8. **Sensitive data never logged.** Passwords, token hashes, full session cookies, and full itinerary contents (PII-adjacent) are redacted from all logs by default-deny field lists, not case-by-case remembering.
9. **Audit trail for sensitive actions.** Share/revoke/delete/permission-change actions are recorded with actor, action, resource, and timestamp, in every phase — this data model doesn't get simpler in microservices, it gets distributed (see Phase 2 notes).
10. **Rate limiting on authentication endpoints** at minimum; broadened to public-facing endpoints as the system moves toward internet exposure in Phase 3.
11. **Every new external dependency gets a quick supply-chain sanity check** (is it maintained, does it have a suspiciously small maintainer base for its popularity, any recent CVEs) before being added — this applies especially once Phase 2 introduces more services and thus more dependency surface.

---

## 3. Architecture Roadmap (All Four Phases)

```
Phase 1: Monolith
[Browser] -> [Next.js App: pages + API routes] -> [Prisma] -> [PostgreSQL]

Phase 2: Microservices
[Browser] -> [API Gateway] -> [Auth Service] -> [Auth DB]
                            -> [Itinerary Service] -> [Itinerary DB]
                            -> [Recommendation Service] -> [Destination DB]
                            (services communicate via REST + events)

Phase 3: Cloud Deployment
[Load Balancer] -> [Container orchestrator: services in containers, N replicas each]
                 -> [Managed Postgres per service / shared cluster]
                 -> [Auto-scaling based on load]
                 -> [CI/CD pipeline: build -> test -> deploy]

Phase 4: Resilience
Adds: [Redis cache] in front of read-heavy services
      [Message queue] (e.g. RabbitMQ/SQS) for async work (notifications, audit fan-out)
      [Circuit breakers] on inter-service calls
      [Retries with backoff + timeouts] everywhere a network call happens
      [Health checks + graceful degradation] (e.g. serve cached recs if recommendation service is down)
```

---

## 4. Phase 1 — Monolith (Detail)

### 4.1 Current State
See Section 0. Backend API is functional locally against Postgres via Docker Compose.

### 4.2 Remaining Work Items (backlog for Codex)

**A. User preferences & recommendation logic**
- Add `UserPreference` model (or a `preferences Json?` field on `User` — prefer a structured join table if preference tags need to be queried, e.g. `UserPreferenceTag { userId, tag }`)
- Add a `Trip` concept if "past trips" needs to be distinct from active `Itinerary` records, or reuse `Itinerary` with a `status` enum (`PLANNED`, `COMPLETED`) — **decide and document the choice, don't leave it ambiguous**
- Recommendation endpoint: `GET /api/recommendations` — rule-based for Phase 1 (no ML yet):
  - Score destinations by: tag overlap with user preferences (weight A) + frequency in user's past completed trips' destinations/tags (weight B) + global popularity across all users (weight C, computed as a simple count of itineraries per destination)
  - Return top N, paginated like search
  - This must go through the same authz pattern (authenticated user required) and same rate-limiting approach as search

**B. Frontend (Next.js App Router pages, using the existing API routes)**
- `/signup`, `/login` — forms posting to existing auth routes
- `/dashboard` — list of itineraries (owned + shared), calls `GET /api/itineraries`
- `/itineraries/[id]` — detail/edit view, respects `permission` returned implicitly by what actions the API allows (if a PATCH/DELETE call gets a 404, the UI should not have offered that action — i.e., **fetch the user's own permission level and hide/disable actions client-side, but never rely on that hiding as the actual security boundary** — the API enforcement already covers that)
- `/itineraries/[id]/share` — share management UI (owner-only view; UI should hide this entirely for non-owners, but again the API is the real gate)
- `/search` — destination search + recommendations
- Keep styling minimal/functional for now; this is a backend/security-first project, not a design showcase

**C. Testing**
- Unit tests for `canAccessItinerary()` — this is the highest-value test file in the whole codebase. Cover: owner access to all actions, VIEW-share cannot edit/delete/share, EDIT-share cannot delete/share, no-share user gets false for everything, nonexistent itinerary returns false
- Integration tests for the IDOR scenarios listed in the README's manual checklist — automate what's currently manual
- Test that mass-assignment attempts (extra fields in request bodies) are rejected by Zod `.strict()` schemas

**D. Operational basics**
- `GET /api/health` — simple health check (DB reachable, returns 200/503) — trivial now, becomes load-balancer-critical in Phase 3
- Confirm `AuditLog` entries are queryable (even just via `prisma studio` for now; a real audit viewer UI is out of scope for Phase 1)

### 4.3 Definition of Done for Phase 1
- All items in 4.2 implemented
- Manual security checklist (README) automated as tests and passing
- `npm run build` succeeds with no type errors
- A fresh clone + `docker compose up -d` + documented setup steps gets a new contributor running in under 10 minutes

---

## 5. Phase 2 — Microservices (Plan, Not Yet Started)

### 5.1 Service Decomposition
Split along data ownership boundaries, not just by feature name — each service owns its own database/schema, no service reaches into another's tables directly:

| Service | Owns | Responsibilities |
|---|---|---|
| **Auth Service** | User, Session tables | Signup, login, logout, session validation, exposes a "verify token/session" endpoint other services call |
| **Itinerary Service** | Itinerary, ItineraryShare tables | CRUD + sharing logic; calls Auth Service to resolve "who is this request from" |
| **Recommendation Service** | Destination table, UserPreference (read replica or its own copy) | Search + recommendation scoring |
| **Audit Service** (optional, can stay embedded longer) | AuditLog | Receives audit events from other services (via message queue in Phase 4, direct calls acceptable for Phase 2) |

### 5.2 Inter-Service Communication
- Synchronous: REST over HTTP for request/response needs (e.g., Itinerary Service asking Auth Service "is this session valid, who is the user")
- The authorization decision (`canAccessItinerary`) logic stays inside the Itinerary Service — do not make that a network round-trip to a separate "authz service" at this scale; that's an over-decomposition trap
- API Gateway sits in front of all services, handles routing, and is the single place TLS terminates and rate limiting/logging is centralized (avoids reimplementing rate limiting per service)

### 5.3 Security Carry-Over
- Session validation becomes a network call (Itinerary Service -> Auth Service) — this call needs its own timeout and failure handling (if Auth Service is briefly unreachable, fail closed: reject the request, don't assume valid)
- Service-to-service calls should be authenticated (mutual TLS or a shared internal token) — a compromised container inside the network should not be able to call any service unchecked just because it's "inside"
- Audit logging now spans services — either centralize (Audit Service receives events) or ensure each service's local audit log can be correlated via a shared request/trace ID

### 5.4 Definition of Done for Phase 2
- Each service independently deployable and testable
- A single request tracing through Gateway -> Itinerary Service -> Auth Service is traceable via a correlation ID in logs
- Contract tests between services (not just each service's internal unit tests)

---

## 6. Phase 3 — Cloud Deployment (Plan, Not Yet Started)

- Containerize each service (Dockerfile per service, multi-stage builds to keep images small)
- Local orchestration first via Docker Compose (multi-service), then a real orchestrator (Kubernetes, or a simpler managed container platform if Kubernetes is overkill for the course scope — decide based on time budget, flag the tradeoff to the human rather than assuming)
- CI/CD: build -> run tests -> build image -> push to registry -> deploy; security gate here is `npm audit`/dependency scan failing the pipeline on high-severity findings
- Load balancing across replicas of each service; auto-scaling rules based on CPU/request rate
- **Secrets migrate off `.env` files** to the platform's secrets manager at this point — this is the point where Requirement #4 in Section 2 stops being optional
- TLS termination at the load balancer/gateway; internal traffic can be plain HTTP only if the network is genuinely private, otherwise mTLS

### Definition of Done for Phase 3
- One command (or one pipeline trigger) deploys all services from a clean state
- Killing one container instance doesn't cause user-visible downtime (load balancer routes around it)
- Secrets are not present in any committed file or container image layer

---

## 7. Phase 4 — Resilience (Plan, Not Yet Started)

- **Caching:** Redis in front of Recommendation Service (popularity scores, search results) and possibly session validation results (short TTL, must respect revocation — a cached "valid" result for a revoked session is a real bug, keep TTL short, e.g. 30–60s)
- **Message queue:** async audit event delivery, async notification sending (e.g., "your itinerary was shared with you") — decouples slow/optional work from the request path
- **Circuit breakers:** on Itinerary Service's call to Auth Service and any call to Recommendation Service — fail fast and serve a degraded response (e.g., "recommendations temporarily unavailable, here's popular destinations from cache") rather than hanging
- **Retries with exponential backoff + jitter**, and explicit timeouts, on every inter-service call — a call with no timeout is a future outage waiting to happen
- **Health checks** feed both the load balancer (Phase 3) and circuit breakers (this phase) — reuse the same signal

### Definition of Done for Phase 4
- Deliberately killing the Recommendation Service does not take down itinerary browsing/sharing
- A load test shows the system degrading gracefully (slower/cached responses) rather than cascading failure when one dependency is slow
- Chaos-test checklist: kill a service mid-request, saturate one service with load, introduce artificial latency on one inter-service call — document observed behavior for each

---

## 8. Testing Strategy (Cross-Phase)

- Unit tests for pure logic (authz, recommendation scoring, validation schemas) — highest ROI, write these first every phase
- Integration tests for API contracts (per service in Phase 2+)
- The IDOR/security checklist from the Phase 1 README should be re-run (and re-automated where the surface changes) at the end of every phase, not just Phase 1 — sharing/authorization is the part most likely to regress when a monolith gets split apart

## 9. Instructions for the Coding Agent

- Do not introduce a new authorization pattern per feature — extend `canAccessItinerary()`'s pattern (or its Phase 2 service-local equivalent) for any new resource type.
- Do not silently relax a Section 2 requirement to make a feature easier to ship — if a request conflicts with one, implement the secure version and note the tradeoff, or stop and ask.
- Prefer boring, well-understood libraries over clever ones, especially for auth/crypto — do not hand-roll cryptographic primitives (hashing/signing algorithms themselves); DO keep the surrounding session/token logic transparent and in-repo rather than delegating to a framework black box, consistent with how Phase 1 was built.
- Every new API endpoint needs: a Zod (or equivalent) schema, an authz check if it touches user-owned data, and an audit log entry if it's a sensitive action (share/delete/permission-change).
- Keep commits/changes scoped — one concern per change set — so the human can review security-relevant diffs (auth, authz, validation) independently from UI/styling changes.
