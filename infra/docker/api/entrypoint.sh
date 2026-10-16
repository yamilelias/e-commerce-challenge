#!/bin/sh
set -eu

for name in APP_SECRET ADMIN_USERNAME ADMIN_PASSWORD_HASH RECEIPT_SECRET PUBLIC_ORIGIN DATABASE_URL; do
    value=$(printenv "$name" || true)
    if [ -z "$value" ] || [ "${value#REPLACE_WITH_}" != "$value" ]; then
        echo "Missing or placeholder required environment variable: $name" >&2
        exit 1
    fi
done

mkdir -p /data/sessions /app/var
chown -R www-data:www-data /data /app/var
exec gosu www-data "$@"
