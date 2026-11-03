# Deployment and recovery (experimental)

ShareLyze has not yet completed its security review or UGREEN/Zoraxy validation. Use isolated data until the project plan marks it ready for public deployment.

## NAS Compose example

[`docker-compose.nas.yml`](../docker-compose.nas.yml) is a MediaLyze-style example for a pre-existing external `docker_bridge` network. Copy `.env.example` to `.env`, set `PUBLIC_ORIGIN` (for example `https://s.fe-server.de`) and a random `SETUP_TOKEN`, and keep `.env` private. Set `HOST_PORT`, `CONFIG_HOST_DIR`, `MEDIATHEK_HOST_DIR` and `FE_HOST_DIR` in `.env` if the example paths or port do not match your NAS. Verify those paths exist; use isolated test folders first. Edit the mounts and matching `SOURCES_JSON` together if your sources differ. Sources are mounted read-only. No upload directory is required: ShareLyze currently shares existing files and does not accept file uploads.

The image runs as the `node` user (UID/GID 1000), which needs write permission on the host config directory mounted at `/data`, and read and traversal permission on every source and its parent directories. There is currently no PUID/PGID setting. Confirm and arrange permissions for your NAS without broadly opening access. The external network must already exist; if the proxy is not on it, adjust the network accordingly. The default `8080:3000` publishes on all host interfaces and can conflict with MediaLyze; choose a free `HOST_PORT` and restrict access with your firewall. Alternatively, use the container's name and port 3000 from a proxy on the same Docker network and omit the published port.

Point Zoraxy or another HTTPS proxy to the ShareLyze container on port 3000, or to the chosen NAS host port, and forward the original Host and protocol. Set `TRUSTED_PROXIES` only after determining the proxy's actual stable IP/CIDR; do not guess or trust all clients. `PUBLIC_ORIGIN` must match the public admin URL. The `ghcr.io/frederikemmer/sharelyze:dev` image must exist and be accessible before the following command can pull it; this has not yet been established for this project:

```sh
docker compose -f docker-compose.nas.yml config
docker compose -f docker-compose.nas.yml up -d
```

For a local image built from this checkout, substitute that image in the NAS Compose file or use the source-build Compose below. Follow the backup instructions in this document; for the NAS Compose include `-f docker-compose.nas.yml` in the Compose commands. No NAS or Zoraxy deployment has been tested yet.

## Source build

1. Copy `.env.example` to `.env`. Generate a random setup token, e.g. `openssl rand -hex 32`, and set it as `SETUP_TOKEN`. Set `PUBLIC_ORIGIN` to the exact external HTTPS origin, without a path. Keep `.env` private.
2. Add read-only bind mounts to `docker-compose.yml`, each at a distinct path beneath `/sources`. Set `SOURCES_JSON` to an array of objects with stable `id`, `name`, and the matching absolute container `root`. The container's `node` user must have read and directory traversal permission.
3. Run `docker compose up --build`. Expose `127.0.0.1:3000` only through an HTTPS reverse proxy. Set `TRUSTED_PROXIES` only to explicit proxy IPs or CIDRs if the proxy forwards client addresses; verify your proxy's actual address. Without it the rate limiter treats requests as coming from the proxy, so visitors may share the same limit. Login, setup, unlock and browsing use separate buckets.
4. Open `PUBLIC_ORIGIN` and supply the setup token, admin username and password. Keep the token for container restarts; setup is disabled after the first admin exists.

The settings page can store a public link address used when copying links. Configure DNS and your reverse proxy separately. This setting does not change `PUBLIC_ORIGIN`, which remains the trusted origin for the admin interface; update that environment variable and restart the service if the admin address changes. Use HTTPS except for local loopback testing.

Source IDs are persistent: removing a source from the configuration disables it, and changing a root used by a share prevents startup. A read-only mount does not stop another process or NAS user from changing the source files. Directory shares expose later additions. Directory browsing is limited to 10,000 entries per directory, ZIP creation to 10,000 entries and 50 levels; pagination is not implemented. Simultaneous file streams are limited to 32 and ZIP streams to three as resource safeguards. These are not per-share download quotas.

## SQLite backup

The application stores configuration, links, password hashes and analytics in the persistent `/data` volume. SQLite uses WAL, so copying only the live database file is not a reliable backup. While the container is running, create a consistent SQLite backup under a unique name (choose a name that does not already exist):

```sh
docker compose exec sharelyze node -e "const D=require('better-sqlite3'); const d=new D('/data/sharelyze.db',{readonly:true}); d.backup('/data/sharelyze-backup-2026-11-02.db').then(()=>d.close()).catch(e=>{console.error(e);process.exitCode=1})"
docker compose cp sharelyze:/data/sharelyze-backup-2026-11-02.db ./sharelyze-backup-2026-11-02.db
```

Protect backups as sensitive data. Also back up your Compose configuration, `.env`, and source data separately. The backup above remains in the volume; remove it only when you have confirmed your copy and no longer need it.

To restore, stop the service, preserve the existing volume/database first, and restore the backup into a separate volume or copy as `sharelyze.db` while no application process is accessing it. Do not reuse stale `-wal` or `-shm` files with the restored database. Start the service and verify the admin, sources and shares. Backup and restoration to a separate test volume were verified with an admin login and restored link; rehearse the procedure for your own deployment before relying on it.
