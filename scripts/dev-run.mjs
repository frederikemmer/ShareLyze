import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
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
const backendCommand = process.execPath;
const backendArgs = ["--watch", "--import", "tsx", resolve("backend/src/server.ts")];
const backendEnv = env;
if (process.platform !== "linux") {
  console.warn("Native development: source browsing, downloads and uploads require Linux.");
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
