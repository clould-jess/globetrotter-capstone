#!/usr/bin/env bash
set -eu
ss -ltnp '( sport = :80 or sport = :443 )'
systemctl is-active nginx apache2 caddy || true
nginx -T 2>/dev/null | grep -E '^# configuration file|listen |server_name|proxy_pass|ssl_certificate' | sed -E 's#(https?://)[^/@]+@#\1[hidden]@#' || true
command -v certbot || true
certbot --version 2>/dev/null || true
getent ahostsv4 cameroon-169-58-83-56.sslip.io | head -1
cd /opt/cameroon-project/backend
docker compose exec -T user-db psql -U cameroon_user -d cameroon_users -Atc 'SELECT role, count(*) FROM users GROUP BY role' </dev/null
python3 - <<'PY'
from pathlib import Path
names = {line.split('=', 1)[0].strip() for line in Path('.env').read_text().splitlines() if '=' in line and not line.lstrip().startswith('#')}
for name in ['USER_DB_PASSWORD', 'ITINERARY_DB_PASSWORD', 'DISCOVERY_DB_PASSWORD', 'RABBITMQ_PASSWORD', 'ADMIN_EMAIL', 'ADMIN_PASSWORD', 'SESSION_COOKIE_SECURE']:
    print(name + ': ' + ('configured' if name in names else 'absent'))
PY
