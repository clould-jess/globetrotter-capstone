#!/usr/bin/env bash
# Run on the confirmed Ubuntu deployment host before updating this stack.
set -euo pipefail
umask 077
cd /opt/cameroon-project
test -z "$(git status --porcelain)" || { echo 'Deployment checkout has changes; stopping.'; exit 1; }
test "$(git remote get-url origin)" = 'https://github.com/clould-jess/globetrotter-capstone.git'
install -d -m 700 /opt/cameroon-backups
backup_dir=$(mktemp -d /opt/cameroon-backups/release-XXXXXXXX)
git rev-parse HEAD > "$backup_dir/revision.txt"
cp backend/docker-compose.yml "$backup_dir/docker-compose.yml"
install -m 600 backend/.env "$backup_dir/backend.env"
cp /etc/nginx/sites-enabled/cameroon.conf "$backup_dir/cameroon.conf"
if [ -f /etc/nginx/sites-available/cameroon-community-https.conf ]; then
  cp /etc/nginx/sites-available/cameroon-community-https.conf "$backup_dir/cameroon-community-https.conf"
fi
cd backend
docker compose exec -T user-db pg_dump -U cameroon_user cameroon_users </dev/null | gzip > "$backup_dir/users.sql.gz"
docker compose exec -T itinerary-db pg_dump -U cameroon_itinerary cameroon_itineraries </dev/null | gzip > "$backup_dir/itineraries.sql.gz"
docker compose exec -T discovery-db pg_dump -U cameroon_discovery cameroon_discovery </dev/null | gzip > "$backup_dir/discovery.sql.gz"
gzip -t "$backup_dir/users.sql.gz" "$backup_dir/itineraries.sql.gz" "$backup_dir/discovery.sql.gz"
if docker compose config --services | grep -qx community-db; then
  docker compose exec -T community-db pg_dump -U cameroon_community cameroon_community </dev/null | gzip > "$backup_dir/community.sql.gz"
  gzip -t "$backup_dir/community.sql.gz"
fi
for container in $(docker ps -q --filter label=com.docker.compose.project=cameroon-project); do
  service=$(docker inspect -f '{{index .Config.Labels "com.docker.compose.service"}}' "$container")
  image=$(docker inspect -f '{{.Image}}' "$container")
  tag="cameroon-rollback-${service}:$(basename "$backup_dir")"
  docker image tag "$image" "$tag"
  printf '%s %s %s\n' "$service" "$image" "$tag" >> "$backup_dir/images.txt"
done
printf 'Verified backup: %s\n' "$backup_dir"
docker compose exec -T user-db psql -U cameroon_user -d cameroon_users -Atc 'SELECT count(*) FROM users' </dev/null
python3 - <<'PY'
from pathlib import Path
names = {line.split('=', 1)[0].strip() for line in Path('.env').read_text().splitlines() if '=' in line and not line.lstrip().startswith('#')}
for name in ['USER_DB_PASSWORD', 'ITINERARY_DB_PASSWORD', 'DISCOVERY_DB_PASSWORD', 'RABBITMQ_PASSWORD', 'ADMIN_EMAIL', 'ADMIN_PASSWORD']:
    print(name + ': ' + ('configured' if name in names else 'absent'))
PY
