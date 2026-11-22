#!/bin/sh
set -u

: "${POSTGRES_DB:?POSTGRES_DB is required}"
: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"

BACKUP_DIRECTORY="${BACKUP_DIRECTORY:-/backups}"
BACKUP_INTERVAL_SECONDS="${BACKUP_INTERVAL_SECONDS:-86400}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

mkdir -p "$BACKUP_DIRECTORY"
export PGPASSWORD="$POSTGRES_PASSWORD"

while true; do
  backup_file="$BACKUP_DIRECTORY/${POSTGRES_DB}-$(date -u +%Y%m%dT%H%M%SZ).dump"

  if pg_dump --host=db --port=5432 --username="$POSTGRES_USER" \
      --dbname="$POSTGRES_DB" --format=custom --no-owner --no-acl \
      --file="$backup_file" && pg_restore --list "$backup_file" >/dev/null; then
    echo "PostgreSQL backup saved and archive checked: $(basename "$backup_file")"
    find "$BACKUP_DIRECTORY" -type f -name "${POSTGRES_DB}-*.dump" \
      -mtime "+$BACKUP_RETENTION_DAYS" -exec rm -f {} \;
  else
    echo "PostgreSQL backup failed; removing incomplete archive" >&2
    rm -f "$backup_file"
  fi

  sleep "$BACKUP_INTERVAL_SECONDS"
done
