#!/bin/sh
set -eu

# Only private application directories are adjusted. Never touch /sources.
if [ "$(id -u)" -eq 0 ]; then
  uid=${PUID:-1000}
  gid=${PGID:-1000}
  case "$uid" in ''|*[!0-9]*|0) echo 'PUID must be a non-zero numeric user ID.' >&2; exit 1;; esac
  case "$gid" in ''|*[!0-9]*|0) echo 'PGID must be a non-zero numeric group ID.' >&2; exit 1;; esac
  data=${DATA_ROOT:-/data}
  config=${CONFIG_ROOT:-$data/config}
  database=${DB_PATH:-$data/database/sharelyze.db}
  uploads=${UPLOAD_ROOT:-$data/uploads}
  previews=${PREVIEW_ROOT:-$data/previews}
  for directory in "$data" "$config" "$(dirname "$database")" "$uploads" "$previews"; do
    if [ -L "$directory" ]; then echo 'Application data directories must not be symbolic links.' >&2; exit 1; fi
    mkdir -p "$directory"
    chown "$uid:$gid" "$directory"
  done
  for directory in "$config" "$(dirname "$database")" "$uploads" "$previews"; do
    # Do not follow symbolic links or cross nested mounts.
    find "$directory" -xdev ! -type l -exec chown "$uid:$gid" {} +
  done
  for file in "$data/sharelyze.db" "$data/sharelyze.db-wal" "$data/sharelyze.db-shm" "$data/sharelyze.db-journal" "$data/link-password.key"; do
    if [ -L "$file" ]; then echo 'Application data files must not be symbolic links.' >&2; exit 1; fi
    if [ -e "$file" ]; then chown "$uid:$gid" "$file"; fi
  done
  exec gosu "$uid:$gid" "$@"
fi
exec "$@"
