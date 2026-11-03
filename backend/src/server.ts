import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { openDatabase } from "./database";
import { createApp } from "./app";

const publicOrigin = process.env.PUBLIC_ORIGIN;
const setupToken = process.env.SETUP_TOKEN;
if (!publicOrigin || !setupToken)
  throw new Error("PUBLIC_ORIGIN and SETUP_TOKEN are required");
const url = new URL(publicOrigin);
if (
  url.pathname !== "/" ||
  url.search ||
  url.hash ||
  !["http:", "https:"].includes(url.protocol)
)
  throw new Error("PUBLIC_ORIGIN must be an HTTP(S) origin");
if (
  url.protocol === "http:" &&
  !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
)
  throw new Error("HTTP is allowed only on localhost");
const dbPath = resolve(process.env.DB_PATH || "./.local-config/sharelyze.db");
mkdirSync(dirname(dbPath), { recursive: true, mode: 0o700 });
const db = openDatabase(dbPath);
const retentionDays = Number(process.env.ANALYTICS_RETENTION_DAYS || "30");
if (
  !Number.isInteger(retentionDays) ||
  retentionDays < 1 ||
  retentionDays > 3650
)
  throw new Error("Invalid ANALYTICS_RETENTION_DAYS");
function clearOldEvents() {
  db.prepare("DELETE FROM events WHERE created_at < ?").run(
    new Date(Date.now() - retentionDays * 86400000).toISOString(),
  );
}
clearOldEvents();
setInterval(clearOldEvents, 86400000).unref();
{
  const sources: unknown = JSON.parse(process.env.SOURCES_JSON || "[]");
  if (
    !Array.isArray(sources) ||
    sources.some(
      (s: any) =>
        !s ||
        typeof s.id !== "string" ||
        !/^[a-z0-9-]+$/.test(s.id) ||
        typeof s.name !== "string" ||
        !s.name ||
        typeof s.root !== "string" ||
        !s.root.startsWith("/"),
    )
  )
    throw new Error(
      "SOURCES_JSON must contain sources with an id, name and absolute root",
    );
  if (new Set(sources.map((s) => s.id)).size !== sources.length)
    throw new Error("Duplicate source IDs");
  db.transaction(() => {
    db.prepare("UPDATE sources SET active=0").run();
    for (const s of sources) {
      const old = db
        .prepare("SELECT root FROM sources WHERE id=?")
        .get(s.id) as { root: string } | undefined;
      if (
        old &&
        old.root !== s.root &&
        db
          .prepare("SELECT 1 FROM share_items WHERE source_id=? LIMIT 1")
          .get(s.id)
      )
        throw new Error("Cannot change the root of a source used by a share");
      db.prepare(
        "INSERT INTO sources(id,name,root,active) VALUES (?,?,?,1) ON CONFLICT(id) DO UPDATE SET name=excluded.name,root=excluded.root,active=1",
      ).run(s.id, s.name, s.root);
    }
  })();
}
const trustedProxies = (process.env.TRUSTED_PROXIES || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
if (trustedProxies.some((s) => s === "*" || s === "true" || /^\d+$/.test(s)))
  throw new Error("TRUSTED_PROXIES must list explicit IP addresses or CIDRs");
const host = process.env.BACKEND_HOST || "127.0.0.1";
const allowLoopbackAliases = process.env.SHARELYZE_LOCAL_DEV === "1";
if (
  allowLoopbackAliases &&
  (process.env.NODE_ENV === "production" ||
    !["127.0.0.1", "localhost", "::1"].includes(host))
)
  throw new Error("Local development aliases require a loopback-only backend");
const app = createApp({
  db,
  publicOrigin,
  setupToken,
  secureCookies: url.protocol === "https:",
  frontendDir: process.env.FRONTEND_DIR
    ? resolve(process.env.FRONTEND_DIR)
    : undefined,
  trustedProxies,
  allowLoopbackAliases,
  developmentOrigins: allowLoopbackAliases ? JSON.parse(process.env.SHARELYZE_DEV_ORIGINS || "[]") : [],
});
const port = Number(process.env.BACKEND_PORT || "3000");
app.listen(port, host, () =>
  console.log(`ShareLyze development API listening on ${host}:${port}`),
);
