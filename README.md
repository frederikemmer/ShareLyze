# ShareLyze

ShareLyze is a planned self-hosted file-sharing and link-analytics application. The current repository contains an **experimental MVP in progress** and is not ready for public deployment.

The product scope, implementation status, security constraints and remaining milestones are documented in [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md). Contributors and coding agents should also read [AGENTS.md](AGENTS.md).

## Development

Node.js 24 is required.

```sh
npm ci
npm test
npm run build
```

Alternatively, after `npm ci`, start the local preview with the platform script:

```sh
# macOS / Linux
./scripts/dev-local.sh
```

```powershell
# Windows PowerShell
./scripts/dev-local.ps1
```

Both scripts expose the development frontend on all network interfaces by default; the backend remains on loopback. They stop with Ctrl+C and fail if a port is occupied. Set `FRONTEND_HOST=127.0.0.1` to restrict the frontend to this computer. Set `FRONTEND_PORT` and/or `BACKEND_PORT` to change the ports. Frontend changes use Vite hot module replacement; the backend restarts automatically after code changes. The scripts run natively and do not require Docker.

Linux-only storage tests are skipped on other operating systems. Do not expose this unfinished project to the internet.

## License

AGPL-3.0-only; see [LICENSE](LICENSE). The frontend's initial visual styling is inspired by the AGPL-licensed [MediaLyze](https://github.com/frederikemmer/MediaLyze) project.

## Development backend and storage

The local scripts start the development API and frontend together and print the setup token for the current run. Unless `SETUP_TOKEN` is set explicitly, a new token is generated each time the scripts start; an older terminal's token will not work. Local development accepts `localhost`, `127.0.0.1`, `[::1]`, the machine hostname, its `.local` name, and its IPv4 addresses detected at startup on the configured frontend port. Restart after network addresses change. Name resolution and firewall access depend on the network; use a printed IP address if `.local` does not resolve. The development server uses unencrypted HTTP and is intended only for trusted networks. Production continues to require the configured `PUBLIC_ORIGIN`. The backend uses `.local-config/sharelyze.db` by default. Source browsing, file downloads and uploads currently require Linux; on macOS and Windows the native development server runs with those features unavailable. The local development scripts create `.local-sources/Testdateien/` in the repository as a test source. Put disposable test files there; the directory is ignored by Git and its contents persist until you remove them. Set `SOURCES_JSON` to replace the default source list, for example `[{"id":"files","name":"Files","root":"/absolute/path"}]`. Source paths and ancestors are trusted administrator configuration; use disposable data while testing.

## Docker (experimental)

Copy `.env.example` to `.env`, set a real random `SETUP_TOKEN` and external HTTPS `PUBLIC_ORIGIN`, configure `SOURCES_JSON` and add matching read-only bind mounts in `docker-compose.yml`, then run `docker compose up --build`. See [deployment and recovery](docs/DEPLOYMENT.md) for details. Proxy the public HTTPS origin to the loopback port 3000. The application is not yet security-reviewed or production-ready. A Linux Docker image, an isolated browser flow and an Nginx HTTPS reverse-proxy flow were tested; Zoraxy and the target NAS have not yet been verified. Configure `TRUSTED_PROXIES` only with explicit trusted proxy IPs or CIDRs; without it, rate limiting sees the proxy as one client.

In the admin settings, the public link address controls the domain used for copied links. DNS and the reverse proxy must already route that address to ShareLyze. The separate `PUBLIC_ORIGIN` environment variable still controls the trusted admin origin and must match the address used to access the administration interface.

For a MediaLyze-style NAS example using a published image, see [docker-compose.nas.yml](docker-compose.nas.yml) and the [NAS deployment notes](docs/DEPLOYMENT.md#nas-compose-example). The image must be published and accessible before it can be pulled.
