#!/usr/bin/env sh
set -eu
if [ "${RENEWED_LINEAGE:-}" = /etc/letsencrypt/live/cameroon-169-58-83-56.sslip.io ]; then
    nginx -t && systemctl reload nginx
fi
