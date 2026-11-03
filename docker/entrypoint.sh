#!/bin/sh
set -eu

# Only the dedicated application data mount is adjusted; storage sources are untouched.
if [ "$(id -u)" -eq 0 ]; then
  uid=${PUID:-1000}
  gid=${PGID:-1000}
  case "$uid" in ''|*[!0-9]*|0) echo 'PUID must be a non-zero numeric user ID.' >&2; exit 1;; esac
  case "$gid" in ''|*[!0-9]*|0) echo 'PGID must be a non-zero numeric group ID.' >&2; exit 1;; esac
  if [ "${DB_PATH:-/data/sharelyze.db}" = /data/sharelyze.db ]; then
    chown "$uid:$gid" /data || { echo 'Cannot set ownership of /data. Check the config mount and NAS permissions.' >&2; exit 1; }
    for file in /data/sharelyze.db /data/sharelyze.db-wal /data/sharelyze.db-shm /data/sharelyze.db-journal; do
      if [ -L "$file" ]; then echo 'Database files must not be symbolic links.' >&2; exit 1; fi
      if [ -e "$file" ]; then chown "$uid:$gid" "$file" || exit 1; fi
    done
  fi
  exec gosu "$uid:$gid" "$@"
fi
exec "$@"
