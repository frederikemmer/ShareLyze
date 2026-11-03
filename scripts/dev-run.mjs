import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";

const host = process.env.FRONTEND_HOST || "127.0.0.1";
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
const env = {
  ...process.env,
  BACKEND_PORT: backendPort,
  BACKEND_HOST: "127.0.0.1",
  PUBLIC_ORIGIN: publicOrigin,
  SETUP_TOKEN: setupToken,
  SHARELYZE_LOCAL_DEV: localAliases ? "1" : "0",
};
console.log(
  "ShareLyze development mode. Do not expose this unfinished application publicly.",
);
console.log(
  `Open ${publicOrigin}. Setup token for first-time setup: ${setupToken}`,
);
const children = [
  spawn(
    process.execPath,
    ["--import", "tsx", resolve("backend/src/server.ts")],
    { stdio: "inherit", env },
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
