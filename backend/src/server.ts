import { GeoIpService } from "./geoip";
import { configureSources } from "./sources";
import { dataLayout } from "./data-layout";
import { runRetention, getRetention } from "./retention";
import { PreviewCache } from "./previews";
import { resolve } from "node:path";
import { openDatabase } from "./database";
import { loadPasswordKey, decryptLinkPassword } from "./password-vault";
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
const {dbPath,uploadRoot,previewRoot,passwordKeyPath,configRoot} = await dataLayout();
const db = openDatabase(dbPath);
const previewCache = new PreviewCache(previewRoot);
const geoIp = new GeoIpService(resolve(configRoot,"geoip"));
await geoIp.load();
const encryptedExample = db.prepare("SELECT id,password_encrypted FROM links WHERE password_encrypted IS NOT NULL UNION ALL SELECT id,password_encrypted FROM shares WHERE password_encrypted IS NOT NULL LIMIT 1").get() as {id:string;password_encrypted:string}|undefined;
const passwordKey = loadPasswordKey(passwordKeyPath, !!encryptedExample);
if(encryptedExample) decryptLinkPassword(encryptedExample.password_encrypted,passwordKey,encryptedExample.id);
const retentionDays = process.env.ANALYTICS_RETENTION_DAYS ? Number(process.env.ANALYTICS_RETENTION_DAYS) : null;
if (
  retentionDays !== null && (
  !Number.isInteger(retentionDays) ||
  retentionDays < 1 ||
  retentionDays > 3650
  )
)
  throw new Error("Invalid ANALYTICS_RETENTION_DAYS");
async function maintenance() {
  try { runRetention(db,uploadRoot); await previewCache.clean(getRetention(db).previewDays); await geoIp.maintain(); }
  catch (error) { console.error("ShareLyze maintenance failed", error); }
}

configureSources(db,resolve(process.env.SOURCES_ROOT || "/sources"),uploadRoot);
if (process.env.SOURCES_JSON !== undefined) console.warn("SOURCES_JSON is obsolete and ignored; use mounts beneath SOURCES_ROOT (/sources).");

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
    (!["127.0.0.1", "localhost", "::1"].includes(host) && !(process.env.SHARELYZE_CONTAINER_DEV === "1" && host === "0.0.0.0")))
)
  throw new Error("Local development aliases require a loopback-only backend");
const app = createApp({
  db,
  previewCache,
  geoIp,
  uploadRoot,
  passwordKey,
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
void maintenance().then(() => previewCache.warm(db));
setInterval(() => {void maintenance().then(() => previewCache.warm(db));}, 60 * 60 * 1000).unref();
const port = Number(process.env.BACKEND_PORT || "3000");
app.listen(port, host, () =>
  console.log(`ShareLyze development API listening on ${host}:${port}`),
);
