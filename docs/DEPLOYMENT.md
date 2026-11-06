# Deployment and recovery (experimental)

ShareLyze has not yet completed its security review or UGREEN/Zoraxy validation. Use isolated data until the project plan marks it ready for public deployment.

## NAS Compose example

[`docker-compose.nas.yml`](../docker-compose.nas.yml) is a MediaLyze-style example for a pre-existing external `docker_bridge` network. Copy `.env.example` to `.env`, set `PUBLIC_ORIGIN` (for example `https://s.fe-server.de`) and a random `SETUP_TOKEN`, and keep `.env` private. Set `HOST_PORT`, `DATA_HOST_DIR`, `MEDIATHEK_HOST_DIR` and `FE_HOST_DIR` in `.env` if the example paths or port do not match your NAS. Verify those paths exist; use isolated test folders first. Edit only the source mounts if your sources differ; each immediate directory under `/sources` becomes a source named after that directory. `SOURCES_JSON` is obsolete and ignored. Sources are mounted read-only. Uploads are stored separately under `/data/uploads` in the persistent application data volume, never in the read-only source mounts. Back up this directory together with the database. `UPLOAD_ROOT` can select another private, persistent directory; it must not overlap a configured source and must be writable by the runtime UID/GID.

The container starts as root only to prepare the private configuration, database, upload and preview directories for `PUID`/`PGID` (default 1000:1000), then runs the application under those IDs. It does not change the mounted source directories. Set both IDs to a non-zero numeric account that can read and traverse the sources. Docker user overrides bypass this preparation; custom application directory overrides are prepared by the entrypoint as well. Read-only mounts, NAS ACLs, rootless Docker or network filesystems may prevent automatic ownership changes. The external network must already exist; if the proxy is not on it, adjust the network accordingly. The default `8080:3000` publishes on all host interfaces and can conflict with MediaLyze; choose a free `HOST_PORT` and restrict access with your firewall. Alternatively, use the container's name and port 3000 from a proxy on the same Docker network and omit the published port.

Point Zoraxy or another HTTPS proxy to the ShareLyze container on port 3000, or to the chosen NAS host port, and forward the original Host and protocol. Set `TRUSTED_PROXIES` only after determining the proxy's actual stable IP/CIDR; do not guess or trust all clients. `PUBLIC_ORIGIN` must match the public admin URL. The `ghcr.io/frederikemmer/sharelyze:dev` image must exist and be accessible before the following command can pull it; this has not yet been established for this project:

```sh
docker compose -f docker-compose.nas.yml config
docker compose -f docker-compose.nas.yml up -d
```

For a local image built from this checkout, substitute that image in the NAS Compose file or use the source-build Compose below. Follow the backup instructions in this document; for the NAS Compose include `-f docker-compose.nas.yml` in the Compose commands. No NAS or Zoraxy deployment has been tested yet.

## Source build

1. Copy `.env.example` to `.env`. Generate a random setup token, e.g. `openssl rand -hex 32`, and set it as `SETUP_TOKEN`. Set `PUBLIC_ORIGIN` to the exact external HTTPS origin, without a path. Keep `.env` private.
2. Add read-only bind mounts to `docker-compose.yml`, each at a distinct path beneath `/sources`. The runtime `PUID`/`PGID` account must have read and directory traversal permission.
3. Run `docker compose up --build`. Expose `127.0.0.1:3000` only through an HTTPS reverse proxy. Set `TRUSTED_PROXIES` only to explicit proxy IPs or CIDRs if the proxy forwards client addresses; verify your proxy's actual address. Without it the rate limiter treats requests as coming from the proxy, so visitors may share the same limit. Login, setup, unlock and browsing use separate buckets.
4. Open `PUBLIC_ORIGIN` and supply the setup token, admin username and password. Keep the token for container restarts; setup is disabled after the first admin exists.

The settings page can store a public link address used when copying links. Configure DNS and your reverse proxy separately. This setting does not change `PUBLIC_ORIGIN`, which remains the trusted origin for the admin interface; update that environment variable and restart the service if the admin address changes. Use HTTPS except for local loopback testing.

### SQLite cannot open the database

`SQLITE_CANTOPEN` during startup can mean that the process cannot write to the directory mounted at `/data`. Inspect the actual mount and numeric permissions on the NAS rather than assuming the relative Compose path:

```sh
docker inspect sharelyze --format '{{range .Mounts}}{{println .Destination "<-" .Source}}{{end}}'
ls -ldn /path/reported/for/data
```

The application runs as `PUID`/`PGID`, defaulting to 1000:1000, and needs write and directory traversal access to the mounted directory and its database files. Current images attempt to set ownership on startup; check that the updated image is in use and inspect logs for ownership errors. For an existing database, preserve and back up the data before changing permissions. Read-only filesystems, full disks, unavailable mounts and ACLs can also cause this error. Never use a source-data folder as the writable config directory.

Source IDs are persistent: removing a source from the configuration disables it, and changing a root used by a share prevents startup. A read-only mount does not stop another process or NAS user from changing the source files. Directory shares expose later additions. Directory browsing is limited to 10,000 entries per directory, ZIP creation to 10,000 entries and 50 levels; pagination is not implemented. Simultaneous file streams are limited to 32 and ZIP streams to three as resource safeguards. These are not per-share download quotas.

## SQLite backup

The application stores configuration, links, password hashes and analytics in the persistent `/data` volume. SQLite uses WAL, so copying only the live database file is not a reliable backup. While the container is running, create a consistent SQLite backup under a unique name (choose a name that does not already exist):

```sh
docker compose exec sharelyze node -e "const D=require('better-sqlite3'); const d=new D('/data/database/sharelyze.db',{readonly:true}); d.backup('/data/sharelyze-backup-2026-11-02.db').then(()=>d.close()).catch(e=>{console.error(e);process.exitCode=1})"
docker compose cp sharelyze:/data/sharelyze-backup-2026-11-02.db ./sharelyze-backup-2026-11-02.db
```

New or changed short-link passwords can be copied by administrators. They are stored as an authentication hash plus AES-256-GCM encrypted data. The encryption key is generated as `link-password.key` in the configuration directory (default `/data/config/link-password.key`), with mode 0600. Back up this key with the SQLite database, retain its private permissions, and restore the same key. If encrypted passwords exist and the key is missing or does not match, startup fails instead of replacing it. A database-only backup cannot recover copyable passwords. Passwords created before this feature have only a hash and must be set again to enable copying.

Protect backups as sensitive data. Also back up your Compose configuration, `.env`, and source data separately. The backup above remains in the volume; remove it only when you have confirmed your copy and no longer need it.

To restore, stop the service, preserve the existing volume/database first, and restore the backup into a separate volume or copy as `sharelyze.db` while no application process is accessing it. Do not reuse stale `-wal` or `-shm` files with the restored database. Start the service and verify the admin, sources and shares. Backup and restoration to a separate test volume were verified with an admin login and restored link; rehearse the procedure for your own deployment before relying on it.

Analytics stores visitor IP addresses, user-agent strings and referrer origins for the configured retention period (unlimited by default; configurable in Settings → Aufbewahrung, with an explicit ANALYTICS_RETENTION_DAYS deployment value taking precedence). Configure trusted proxies correctly or addresses can be inaccurate or spoofed. Review the privacy notice and applicable requirements for your deployment. Location is not resolved.

## Storage layout and migration (6 November 2026)

One writable mount is sufficient; the application creates its own directories. Existing source files remain read-only. For example:

```yaml
volumes:
  - /volume1/docker/sharelyze/data:/data
  - /volume1/Ordner1/Fotos:/sources/Fotos:ro
  - /volume1/Dokumente:/sources/Dokumente:ro
```

To put the four areas on separate storage devices, replace the first mount with:

```yaml
volumes:
  - /volume1/sharelyze/config:/data/config
  - /volume1/sharelyze/database:/data/database
  - /volume2/sharelyze/uploads:/data/uploads
  - /volume2/sharelyze/previews:/data/previews
  - /volume1/Ordner1/Fotos:/sources/Fotos:ro
```

The application code stays in the image at `/app`. Configuration means the persistent secret key at `/data/config/link-password.key`; editable application settings are stored in SQLite at `/data/database/sharelyze.db`. Uploaded originals are in `/data/uploads`, disposable preview JPEGs in `/data/previews`. `DATA_ROOT`, `CONFIG_ROOT`, `DB_PATH`, `UPLOAD_ROOT` and `PREVIEW_ROOT` override these defaults. Native development defaults to `.local-config`; the development launcher mounts `.local-sources/Testdateien` as a source in its Linux backend. Native macOS source access remains unsupported.

Stop the old instance and back up its complete data directory before upgrading. Keep the same host data directory in the new mount (older NAS examples called this `CONFIG_HOST_DIR`, now `DATA_HOST_DIR`). At first start the app uses SQLite backup to copy the legacy `/data/sharelyze.db`, including committed WAL data, into the new database directory, then archives the old database as `sharelyze.db.migrated`. The old key is copied to config and archived as `link-password.key.migrated`. Migration never silently overwrites an existing destination. If both old and new files exist after an interrupted migration, stop and inspect/restore the backed-up data before retrying. An explicit `DB_PATH` keeps that database path. Back up config, database and uploads together; previews can be regenerated. Do not run old and new app instances concurrently against these files.

Source IDs are preserved for exact matching container paths. Newly discovered names receive deterministic IDs. Removed mounts disable the corresponding sources; restoring the same mount reactivates them. Symlink directories are ignored. Source discovery runs at startup: recreate/restart the container after editing mounts. Old roots such as `/share/Fotos` are not guessed or rebound to `/sources/Fotos`, because that might expose different content through old links. Preserve the old container root using `SOURCES_ROOT=/share` during transition, or recreate affected shares after verifying the new selection.

## Deletion, retention and previews

Deleting a share immediately disables public access and revokes its password grants. After the configured grace period (default one day), it no longer protects its own uploads from cleanup. A whole upload batch is retained while any non-purged share still references any part of it, including disabled and expired shares. Unreferenced batches are removed after the orphan-upload interval (default one day); currently uploading batches are protected. Unknown names and symlinks in upload storage are not recursively deleted. Removal from a share selection is covered by the orphan cleanup too. Source mounts are never deleted or changed.

Share/link/item metadata and slug reservations remain as historical records so event statistics retain their attribution; secret password data are cleared on deletion. Analytics events are retained indefinitely by default. Settings offer analytics retention, deleted-share grace, orphan-upload retention and preview retention (each 1–3650 days; analytics may be unlimited). Maintenance runs at startup and hourly, so deletion may happen up to an hour after a deadline. Explicit `ANALYTICS_RETENTION_DAYS` takes precedence over the UI.

Preview creation runs in a serial background queue at startup, hourly, after share creation/editing, on demand, and through the prepare button. Settings show processed/total/failed work and disk usage, plus prepare/clear controls. Counts are discovered during traversal and can grow while running; restarting resets job progress and reuses persisted results. Dynamic folder changes are picked up on demand or the next scan. Scans stop after 100,000 entries and report the limit; individual downloads remain independent of previews.

Supported thumbnails: JPEG, PNG, GIF (first frame), WebP, AVIF, TIFF, self-contained SVG, HEIF/HEIC when supported by the installed sharp/libvips decoder, and UTF-8 TXT/Markdown/CSV/JSON/log/YAML excerpts (up to 16 KB / 28 lines). SVG and text are always rasterized to JPEG; SVG with active markup/styles/external references is rejected. Additional formats in the viewer use the rasterized thumbnail; full original downloads remain available. Existing video streaming stays unchanged. HEIC codec availability varies with the image build; unsupported files keep their download action. PDF/Office/video transcoding is outside this simple-preview implementation.

Inputs are limited to 50 MiB and 40 million pixels; rendering has a 15-second sharp timeout and at most 256 queued requests. Cache keys include the source path and inode/size/mtime/ctime; metadata-preserving changes have the same limits as download validators. Authorization and source existence are checked even for cached responses. The cache is trimmed to 512 MiB after generation and during maintenance, oldest first, and cleared according to preview retention; in-flight jobs may temporarily exceed that budget. Only generated cache filenames are removed.

Validation is documented in PROJECT_PLAN.md. Real NAS ACL behavior and interactive browser verification remain separate checks.

## Upload exclusions

Settings → Upload-Filter controls upload exclusions, enabled by default. Default names: `.DS_Store`, `._*`, `Thumbs.db`, `desktop.ini`, `__MACOSX`, `.Spotlight-V100`, `.Trashes`. Edit one filename pattern per line and save, disable the filter, or insert the default rules and save. `*` matches any number of characters, `?` one character; matching ignores letter case and applies to each path component. A matching directory excludes its descendants. Patterns do not accept paths, regular expressions or negation. Other hidden files remain eligible for upload.

The browser skips matches before transfer and reports the skipped count. If the complete selection is ignored, no upload directory is created. The backend also enforces the current persisted rules on direct upload requests before creating files or directories. Excluded requests return HTTP 200 with `{"skipped":true,"reason":"ignored"}`. Existing uploaded files and source mounts are unaffected. Settings are stored with the database; no environment variable or Docker restart is needed.
