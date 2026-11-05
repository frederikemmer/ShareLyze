import { Router, type RequestHandler } from "express";
import { randomUUID } from "node:crypto";
import { constants, createWriteStream, mkdirSync, openSync, closeSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";

// Upload directories are private to ShareLyze and must not be writable by other users.
export function uploadsRouter(root: string, admin: RequestHandler) {
  const router = Router();
  router.post("/api/uploads", admin, (_req, res) => {
    const id = randomUUID();
    try { mkdirSync(join(root, id), { mode: 0o700 }); res.status(201).json({ id }); }
    catch { res.status(500).json({ error: "Upload storage unavailable" }); }
  });
  router.put("/api/uploads/:id", admin, async (req, res) => {
    const id = String(req.params.id);
    const name = typeof req.query.path === "string" ? req.query.path : "";
    const parts = name.split("/");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id) || parts.length > 32 || !name || name.length > 2048 || parts.some(p => !p || p === "." || p === ".." || p.includes("\\") || p.includes("\0") || Buffer.byteLength(p) > 255)) {
      res.status(400).json({ error: "Invalid upload path" }); return;
    }
    if (req.get("content-type") !== "application/octet-stream") { res.status(415).json({ error: "Invalid upload type" }); return; }
    const descriptors: number[] = [];
    let outputPath = "";
    let created = false;
    try {
      if (process.platform !== "linux") throw new Error("Linux required");
      let fd = openSync(join(root, id), constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW); descriptors.push(fd);
      for (const part of parts.slice(0, -1)) {
        const child = `/proc/self/fd/${fd}/${part}`;
        try { mkdirSync(child, { mode: 0o700 }); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
        fd = openSync(child, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW); descriptors.push(fd);
      }
      outputPath = `/proc/self/fd/${fd}/${parts.at(-1)}`;
      const outputFd = openSync(outputPath, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
      created = true;
      let bytes = 0;
      const limit = new Transform({ transform(chunk, _encoding, callback) { bytes += chunk.length; callback(bytes > 10 * 1024 ** 3 ? new Error("Upload too large") : null, chunk); } });
      await pipeline(req, limit, createWriteStream("", { fd: outputFd, autoClose: true }));
      res.status(201).json({ path: `${id}/${name}` });
    } catch (error) {
      if (created) try { unlinkSync(outputPath); } catch { /* best effort */ }
      if (!res.headersSent && !res.destroyed) res.status((error as NodeJS.ErrnoException).code === "EEXIST" ? 409 : 400).json({ error: "Upload failed" });
    } finally { for (const fd of descriptors.reverse()) closeSync(fd); }
  });
  return router;
}
