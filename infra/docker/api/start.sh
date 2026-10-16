#!/bin/sh
set -eu

cd /app
php bin/console doctrine:migrations:migrate --no-interaction --allow-no-migration
php bin/console app:products:seed --file=/app/data/products.csv
exec frankenphp run --config /etc/frankenphp/Caddyfile
