# Community and routes release

## What changed

- Account-only site access at the Docker gateway; signed-in community API verifies sessions itself, not client identity headers.
- Destination rooms and user-created community-visible groups. Anyone with an account can join a group; membership is required to read/post its messages and attachments. These are **not private or end-to-end encrypted groups**.
- Photos from camera/file picker, voice recording and audio file upload with preview before sending. JPEG/PNG/WebP up to 12 MB and 16 megapixels; metadata removed and photos resized. Voice notes up to 90 seconds are decoded and converted to Ogg/Opus. Files are stored in the community PostgreSQL volume, linked to messages, and deleted with their messages. Per-account attachment quota: 100 MB.
- One editable star-rated review per member per place, with owner/admin deletion.
- Leaflet/OpenStreetMap street map, permission-based current location, manual map points, up to ten ordered stops, road distance and estimated driving time per leg, and account-saved itineraries.
- Nearby gyms, monuments/memorials and ministries from OpenStreetMap within 15 km of the selected map centre in Cameroon. Coverage is not exhaustive. Old catalogue coordinates remain indicative; some represent city centres and must be checked before routing.
- Admin catalogue editing and account/activity statistics retained. Bootstrap admin only creates an account if its email does not exist; it does not reset credentials on restart.

## Providers and privacy

The map loads tiles from OpenStreetMap. Route calculation sends selected coordinates to OSRM; nearby search sends the map centre to Overpass. These public endpoints offer no uptime or traffic-data guarantee. Respect provider policies and configure a suitable hosted or self-hosted provider for sustained production usage. Nothing is presented as a live-traffic ETA.

- https://operations.osmfoundation.org/policies/tiles/
- https://project-osrm.org/docs/v5.22.0/api/
- https://leafletjs.com/reference

Camera/microphone recording and geolocation need HTTPS (localhost is allowed for local testing). Mobile photo capture depends on the device/browser. File upload remains available where recording is unsupported. Account creation without email verification is currently supported; password reset/email verification are not implemented.

## IMPORTANT: existing VPS first

The repository snapshot at b23623c configures the old web service on port **3001** and the API on **8085**. This is repository evidence, not proof of the current VPS configuration or automatic deployment. Do not run another project with those ports until inspecting Docker.

On the VPS:

```bash
docker ps --format 'table {{.Names}}\t{{.Ports}}'
```

For the identified web container, inspect only Compose location labels (do not publish a full Docker inspection containing environment secrets):

```bash
docker inspect --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}' CONTAINER_NAME
docker inspect --format '{{index .Config.Labels "com.docker.compose.project.config_files"}}' CONTAINER_NAME
```

Then, in the confirmed repository directory, check `git status --short`, `git remote -v` and `git branch --show-current`. A Git remote does not by itself enable automatic deployment. Preserve local changes and the current `.env`. **Never copy the example over an existing `.env`; never change database passwords just by changing Compose variables on existing PostgreSQL volumes.**

## Backup and update (only after locating the correct stack)

1. Record the running Git revision and images. Back up each database with `docker compose exec -T DATABASE_SERVICE pg_dump -U DATABASE_USER DATABASE_NAME` to a protected backup outside the repository. Existing database/user names are in the Compose file. Include community-db on subsequent upgrades; it contains media. Protect backups because they include accounts and messages.
2. Review `git diff` and resolve any local changes. Fetch the approved release and use a fast-forward pull on the deployment branch. Do not force-reset, delete volumes, run `docker compose down -v`, or remove other projects.
3. This release reuses Compose project name `cameroon-project` and service name `web`. Only the gateway publishes a port; `web` and the internal APIs are not directly exposed. Set `APP_PORT` to the confirmed free/owned port (repository default 3001). The default `BIND_ADDRESS=127.0.0.1` deliberately restricts access until a trusted HTTPS reverse proxy is configured. The old API port 8085 is no longer published.
4. Preserve current database/RabbitMQ credentials in `backend/.env`. For a new install generate strong unique values, and set a new admin email/password (at least ten characters). Set `SESSION_COOKIE_SECURE=true` for HTTPS. Do not commit `.env` or backups.
5. Configure the HTTPS reverse proxy for the chosen domain or trusted IP certificate. Proxy the whole site to `127.0.0.1:APP_PORT`, forward the original Host, allow a 13 MB request body and at least 65 seconds for upload processing. Do not forward only the frontend container. Do not disable TLS verification or ask visitors to ignore certificate warnings.
6. From the confirmed backend directory:

```bash
docker compose config --quiet
docker compose build
docker compose up -d
docker compose ps
docker compose exec gateway nginx -t
```

7. Check HTTPS account registration/login/logout, two-account group membership, photo upload, voice recording/playback, review edit/delete, current location, road routing, saved itinerary reload, and admin access rejection for normal users. Check that media disappears after its message is deleted. Inspect logs locally without posting credentials.
8. For rollback, restore the previous approved source/image versions and the original Compose port mapping; preserve volumes. The community schema changes are additive. Restore a database backup only if necessary and after considering data created after the backup.

## Optional HTTPS without a personal domain

The `https` Compose profile adds Caddy for `cameroon-169-58-83-56.sslip.io` (override `SITE_HOST` in `.env`). This DNS service is third-party infrastructure, not a personally owned domain, and its availability/certificate rate limits are outside the project’s control. Caddy stores and renews the public certificate in persistent volumes. See https://nip.io/ and https://caddyserver.com/docs/automatic-https.

Before activating, verify on the VPS that ports 80 and 443 are free (`ss -ltn '( sport = :80 or sport = :443 )'`), inspect existing reverse proxies, confirm the hostname resolves to 169.58.83.56, and ensure those ports are reachable externally. Do not stop another project's proxy or broadly change its firewall rules. If occupied, integrate with the existing proxy after reviewing its configuration.

Set `SESSION_COOKIE_SECURE=true`, keep `BIND_ADDRESS=127.0.0.1`, and, after backups/build checks, use:

```bash
docker compose --profile https up -d
docker compose logs --tail=60 https
```

Then verify `https://cameroon-169-58-83-56.sslip.io/account` **without** bypassing certificate validation. The old HTTP port is deliberately restricted to loopback. Persistent `/data` is required for automatic renewals; do not delete the HTTPS volumes. After a restart, use the same profile (or set `COMPOSE_PROFILES=https` in the deployment environment).

## Local checks

### This Contabo VPS uses existing host Nginx

The inspected VPS already serves other projects on ports 80/443. **Do not enable the Caddy profile on this host.** Use the dedicated `backend/gateway/host-nginx-http.conf` to obtain a certificate with existing Certbot's webroot plugin (`/var/www/cameroon-acme`), then install `host-nginx-https.conf` as its separate vhost. Validate with `nginx -t` before every graceful reload. Preserve all other vhosts. `scripts/cameroon-certificate-renewed.sh` is a deploy hook scoped to this certificate only; the existing certbot timer handles renewal.

The public entry point is `https://cameroon-169-58-83-56.sslip.io`. The old raw-IP port 3001 becomes loopback-only. An origin remote is not automatic deployment: after an approved push, back up, fast-forward the VPS checkout, build, and update only this Compose project as above.

```bash
npm ci
DEPLOY_TARGET=vps npx vinext build
npx eslint . --ignore-pattern dist --ignore-pattern .next
python -m pip install -r backend/services/community-service/requirements.txt pytest httpx
python -m pytest backend/services/community-service/tests -q
```

Docker-based integration and real device permission tests are required before calling a VPS deployment verified. Mock/unit/browser-fixture tests are not substitutes for testing the live PostgreSQL/auth/gateway stack.
