import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { resolve, dirname } from "node:path";
import { mkdirSync } from "node:fs";
import { hostname, networkInterfaces } from "node:os";

const host = process.env.FRONTEND_HOST || "0.0.0.0";
const frontendPort = process.env.FRONTEND_PORT || "5173";
const backendPort = process.env.BACKEND_PORT || "3000";
const publicOrigin =
  process.env.PUBLIC_ORIGIN || `http://127.0.0.1:${frontendPort}`;
const setupToken = process.env.SETUP_TOKEN || randomBytes(24).toString("hex");
for (const port of [frontendPort, backendPort]) {
  if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535)
    throw new Error("Invalid port");
}
if (frontendPort === backendPort)
  throw new Error("Frontend and backend ports must differ");
const originUrl = new URL(publicOrigin);
const localAliases =
  originUrl.protocol === "http:" &&
  ["127.0.0.1", "localhost", "[::1]"].includes(originUrl.hostname);
const machine = hostname().toLowerCase();
const devHosts = [...new Set([machine, `${machine}.local`, ...Object.values(networkInterfaces()).flatMap((entries) => (entries ?? []).filter((entry) => entry.family === "IPv4").map((entry) => entry.address))])];
const devOrigins = devHosts.map((name) => `http://${name}:${frontendPort}`);
const sourcesRoot = resolve(process.env.SOURCES_ROOT || ".local-sources");
const testSource = resolve(sourcesRoot,"Testdateien");
mkdirSync(testSource,{recursive:true});
const env = {
  ...process.env,
  SOURCES_ROOT: sourcesRoot,
  BACKEND_PORT: backendPort,
  BACKEND_HOST: "127.0.0.1",
  PUBLIC_ORIGIN: publicOrigin,
  SETUP_TOKEN: setupToken,
  SHARELYZE_LOCAL_DEV: localAliases ? "1" : "0",
  SHARELYZE_DEV_ORIGINS: localAliases ? JSON.stringify(devOrigins) : "[]",
  SHARELYZE_DEV_HOSTS: localAliases ? JSON.stringify(devHosts) : "[]",
};
let backendCommand = process.execPath;
let backendArgs = ["--watch", "--import", "tsx", resolve("backend/src/server.ts")];
let backendEnv = env;
if (process.platform === "darwin") {
  const dataRoot = resolve(process.env.DATA_ROOT || ".local-config");
  const configRoot = resolve(process.env.CONFIG_ROOT || resolve(dataRoot,"config"));
  const dbPath = resolve(process.env.DB_PATH || resolve(dataRoot,"database/sharelyze.db"));
  const uploadRoot = resolve(process.env.UPLOAD_ROOT || resolve(dataRoot,"uploads"));
  const previewRoot = resolve(process.env.PREVIEW_ROOT || resolve(dataRoot,"previews"));
  for(const directory of [dataRoot,configRoot,dirname(dbPath),uploadRoot,previewRoot]) mkdirSync(directory,{recursive:true});
  const mounts = [[resolve("backend"),"/app/backend",true],[resolve("shared"),"/app/shared",true],[dataRoot,dataRoot,false],[configRoot,configRoot,false],[dirname(dbPath),dirname(dbPath),false],[uploadRoot,uploadRoot,false],[previewRoot,previewRoot,false],[sourcesRoot,"/sources",true]];
  if (mounts.some(([src, dst]) => src.includes(",") || dst.includes(",")))
    throw new Error("Docker development mounts cannot contain commas in paths");
  console.log("Building Linux development backend (Docker Desktop required)...");
  const build = spawnSync("docker", ["build", "-t", "sharelyze-local-dev", "."], { stdio: "inherit" });
  if (build.status !== 0) throw new Error("Could not build Linux development backend. Check Docker Desktop.");
  backendEnv = { ...env, NODE_ENV: "development", BACKEND_HOST: "0.0.0.0", BACKEND_PORT: "3000", DATA_ROOT: dataRoot, CONFIG_ROOT: configRoot, ...(process.env.DB_PATH ? {DB_PATH:dbPath} : {}), UPLOAD_ROOT: uploadRoot, PREVIEW_ROOT:previewRoot, SOURCES_ROOT:"/sources", SHARELYZE_CONTAINER_DEV: "1" };
  backendCommand = "docker";
  backendArgs = ["run", "--rm", "-i", "--init", "--user", `${process.getuid()}:${process.getgid()}`, "--entrypoint", "node", "-p", `127.0.0.1:${backendPort}:3000`, ...mounts.filter((mount,index,all) => all.findIndex(other => other[1] === mount[1]) === index).flatMap(([src, dst, readonly]) => ["--mount", `type=bind,src=${src},dst=${dst}${readonly ? ",readonly" : ""}`]), ...["NODE_ENV", "BACKEND_HOST", "BACKEND_PORT", "DATA_ROOT", "CONFIG_ROOT", "DB_PATH", "UPLOAD_ROOT", "PREVIEW_ROOT", "SOURCES_ROOT", "PUBLIC_ORIGIN", "SETUP_TOKEN", "SHARELYZE_LOCAL_DEV", "SHARELYZE_CONTAINER_DEV", "SHARELYZE_DEV_ORIGINS", "SHARELYZE_DEV_HOSTS"].flatMap((key) => ["-e", key]), "sharelyze-local-dev", "--watch", "--import", "tsx", "backend/src/server.ts"];
}
console.log(
  "ShareLyze development mode. Do not expose this unfinished application publicly.",
);
console.log(
  `Open ${publicOrigin}. Setup token for first-time setup: ${setupToken}`,
);
if (localAliases) console.log(`LAN addresses: ${devOrigins.join(", ")}`);
console.log(`Local test source: ${testSource}`);
const children = [
  spawn(
    backendCommand,
    backendArgs,
    { stdio: "inherit", env: backendEnv },
  ),
  spawn(
    process.execPath,
    [
      resolve("node_modules/vite/bin/vite.js"),
      "--config",
      resolve("frontend/vite.config.ts"),
      "--host",
      host,
      "--port",
      frontendPort,
      "--strictPort",
    ],
    { stdio: "inherit", env },
  ),
];
let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (!child.killed) child.kill("SIGTERM");
  setTimeout(() => process.exit(code), 500).unref();
}
for (const child of children) {
  child.on("error", (err) => {
    console.error("Could not start development server:", err.message);
    stop(1);
  });
  child.on("exit", (code, signal) => {
    if (!stopping) {
      console.error(`Development server stopped (${signal || code}).`);
      stop(code || 1);
    }
  });
}
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
