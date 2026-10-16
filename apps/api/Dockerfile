FROM dunglas/frankenphp:1-php8.3-bookworm AS base

RUN install-php-extensions pdo_sqlite sqlite3 mbstring intl zip opcache \
    && apt-get update \
    && apt-get install -y --no-install-recommends gosu \
    && cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

FROM base AS dependencies
COPY --from=composer:2.8 /usr/bin/composer /usr/local/bin/composer
COPY apps/api/composer.json apps/api/composer.lock ./
RUN composer install --no-dev --prefer-dist --no-interaction --no-scripts --no-progress --optimize-autoloader

FROM base AS test
COPY --from=composer:2.8 /usr/bin/composer /usr/local/bin/composer
COPY apps/api/composer.json apps/api/composer.lock ./
RUN composer install --prefer-dist --no-interaction --no-scripts --no-progress
COPY apps/api/ /app/
COPY data/products.csv /app/data/products.csv
RUN composer dump-autoload --no-interaction --no-scripts --optimize

FROM base AS runtime
ENV XDG_CONFIG_HOME=/tmp/caddy-config XDG_DATA_HOME=/tmp/caddy-data
COPY --from=composer:2.8 /usr/bin/composer /usr/local/bin/composer
COPY apps/api/ /app/
COPY --from=dependencies /app/vendor /app/vendor
COPY data/products.csv /app/data/products.csv
COPY infra/docker/api/Caddyfile /etc/frankenphp/Caddyfile
COPY infra/docker/api/entrypoint.sh /usr/local/bin/api-entrypoint
COPY infra/docker/api/start.sh /usr/local/bin/api-start
COPY infra/docker/api/health.php /usr/local/bin/api-health.php
RUN composer dump-autoload --no-dev --no-interaction --no-scripts --optimize \
    && touch /app/.env \
    && mkdir -p /app/var /data /tmp/caddy-config /tmp/caddy-data \
    && chown -R www-data:www-data /app/var /data /tmp/caddy-config /tmp/caddy-data \
    && chmod +x /usr/local/bin/api-entrypoint /usr/local/bin/api-start

EXPOSE 8000
ENTRYPOINT ["/usr/local/bin/api-entrypoint"]
CMD ["/usr/local/bin/api-start"]
