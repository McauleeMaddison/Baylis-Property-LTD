#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd -- "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
COMPOSE_BIN="docker compose"

MYSQL_HOST=${MYSQL_HOST:-127.0.0.1}
MYSQL_USER=${MYSQL_USER:-baylis_user}
MYSQL_PASSWORD=${MYSQL_PASSWORD:-baylis_pass}
MYSQL_DATABASE=${MYSQL_DATABASE:-baylis_db}

log() {
  echo -e "[test-db] $1"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "'$1' is required but not installed." >&2
    exit 1
  fi
}

require_cmd docker

start_db() {
  log "Starting MySQL container via docker compose..."
  (cd "$ROOT_DIR" && $COMPOSE_BIN up -d db)
}

wait_for_mysql() {
  log "Waiting for MySQL to accept connections..."
  local retries=30
  until (cd "$ROOT_DIR" && $COMPOSE_BIN exec -T db mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" -e "SELECT 1" "$MYSQL_DATABASE" >/dev/null 2>&1); do
    retries=$((retries - 1))
    if [ "$retries" -le 0 ]; then
      echo "MySQL did not become ready in time." >&2
      exit 1
    fi
    sleep 2
  done
}

run_migration() {
  log "Running SQL migration against $MYSQL_DATABASE..."
  (cd "$ROOT_DIR" && MYSQL_HOST="$MYSQL_HOST" MYSQL_USER="$MYSQL_USER" MYSQL_PASSWORD="$MYSQL_PASSWORD" MYSQL_DATABASE="$MYSQL_DATABASE" node server/migrate.js migrations/0001_init.sql)
}

run_tests() {
  log "Executing API tests..."
  (cd "$ROOT_DIR" && MYSQL_HOST="$MYSQL_HOST" MYSQL_USER="$MYSQL_USER" MYSQL_PASSWORD="$MYSQL_PASSWORD" MYSQL_DATABASE="$MYSQL_DATABASE" npm run test:api)
}

start_db
wait_for_mysql
run_migration
run_tests

log "All done! Stop MySQL with 'docker compose down' when finished."
