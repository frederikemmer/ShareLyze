import { Router, type RequestHandler } from "express";
import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { basename } from "node:path";
import { closeSync, createReadStream, fstatSync, type Stats } from "node:fs";
import { ZipFile } from "yazl";
import { Readable } from "node:stream";
import {
  createSessionToken,
  hashSessionToken,
  hashPassword,
  verifyPassword,
} from "./auth";
import { normalizeSlug, randomSlug } from "./links";
import {
  DirectoryLimitError,
  listSourceDirectory,
  openSourceFile,
} from "./storage";
import { parseRange } from "./range";

type Source = { id: string; name: string; root: string };
type Item = {
  id: string;
  share_id: string;
  source_id: string;
  relative_path: string;
  kind: "file" | "directory";
  root: string;
  source_active: number;
};
type Share = {
  id: string;
  title: string;
  password_hash: string | null;
  expires_at: string | null;
  link_id: string;
};
const validPath = (path: string, empty = false) =>
  (empty && path === "") ||
  (!!path &&
    !path.startsWith("/") &&
    !path.includes("\0") &&
    path.split("/").every((p) => p && p !== "." && p !== ".."));
const sameFile = (a: Stats, b: Stats) =>
  a.dev === b.dev &&
  a.ino === b.ino &&
  a.size === b.size &&
  a.mtimeMs === b.mtimeMs &&
  a.ctimeMs === b.ctimeMs;

export function sharesRouter(
  db: Database.Database,
  admin: RequestHandler,
  secureCookies: boolean,
  rateLimit: RequestHandler,
  browseLimit: RequestHandler,
) {
  const router = Router();
  let activeZips = 0;
  let activeDownloads = 0;
  const source = (id: string) =>
    db
      .prepare("SELECT id,name,root FROM sources WHERE id=? AND active=1")
      .get(id) as Source | undefined;
  const find = (slug: string): Share | undefined =>
    db
      .prepare(
        `SELECT s.*, l.id AS link_id FROM links l JOIN shares s ON s.id=l.share_id WHERE l.slug=? AND l.active=1 AND s.active=1 AND (s.expires_at IS NULL OR s.expires_at>?)`,
      )
      .get(slug, new Date().toISOString()) as Share | undefined;
  const items = (shareId: string) => {
    const found = db
      .prepare(
        "SELECT i.*,s.root,s.active AS source_active FROM share_items i JOIN sources s ON s.id=i.source_id WHERE i.share_id=? ORDER BY i.rowid",
      )
      .all(shareId) as Item[];
    if (found.some((i) => !i.source_active))
      throw new Error("Source unavailable");
    return found;
  };
  const granted = (share: Share, cookie?: string) => {
    if (!share.password_hash) return true;
    const token = cookie
      ?.split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("sharelyze_grant="))
      ?.slice("sharelyze_grant=".length);
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
    return !!db
      .prepare(
        "SELECT 1 FROM share_grants WHERE token_hash=? AND share_id=? AND expires_at>?",
      )
      .get(hashSessionToken(token), share.id, new Date().toISOString());
  };
  const event = (
    share: Share,
    type: string,
    itemId?: string,
    filePath?: string,
  ) =>
    db
      .prepare(
        "INSERT INTO events(link_id,share_id,item_id,type,created_at,file_path) VALUES (?,?,?,?,?,?)",
      )
      .run(
        share.link_id,
        share.id,
        itemId ?? null,
        type,
        new Date().toISOString(),
        filePath ?? null,
      );
  router.get("/api/sources", admin, (_req, res) => {
    res.json({
      sources: db
        .prepare("SELECT id,name FROM sources WHERE active=1 ORDER BY name")
        .all(),
    });
  });
  router.get("/api/sources/:id/browse", admin, (req, res) => {
    const s = source(String(req.params.id));
    const path = typeof req.query.path === "string" ? req.query.path : "";
    if (!s || !validPath(path, true)) {
      res.status(400).json({ error: "Invalid source or path" });
      return;
    }
    try {
      res.json({ entries: listSourceDirectory(s.root, path) });
    } catch (error) {
      res.status(error instanceof DirectoryLimitError ? 413 : 404).json({
        error:
          error instanceof DirectoryLimitError
            ? "Directory contains too many entries"
            : "Directory unavailable",
      });
    }
  });
  router.get("/api/shares", admin, (_req, res) => {
    res.json({
      shares: db
        .prepare(
          "SELECT s.id,s.title,s.active,s.expires_at,s.password_hash IS NOT NULL AS has_password,s.created_at,l.slug FROM shares s JOIN links l ON l.share_id=s.id ORDER BY s.created_at DESC",
        )
        .all(),
    });
  });
  router.get("/api/analytics", admin, (_req, res) => {
    res.json({
      totals: db
        .prepare(
          "SELECT type, count(*) AS count FROM events GROUP BY type ORDER BY type",
        )
        .all(),
      links: db
        .prepare(
          "SELECT l.slug,e.type,count(*) AS count FROM events e JOIN links l ON l.id=e.link_id GROUP BY l.id,e.type ORDER BY l.slug,e.type",
        )
        .all(),
      daily: db
        .prepare(
          "SELECT substr(created_at,1,10) AS day,type,count(*) AS count FROM events GROUP BY day,type ORDER BY day DESC LIMIT 300",
        )
        .all(),
      dailyByLink: db
        .prepare(
          "SELECT l.slug,substr(e.created_at,1,10) AS day,e.type,count(*) AS count FROM events e JOIN links l ON l.id=e.link_id GROUP BY l.id,day,e.type ORDER BY day DESC LIMIT 1000",
        )
        .all(),
      files: db
        .prepare(
          "SELECT l.slug,s.title,i.relative_path,e.file_path,count(*) AS count FROM events e JOIN share_items i ON i.id=e.item_id JOIN shares s ON s.id=e.share_id JOIN links l ON l.id=e.link_id WHERE e.type='download_start' GROUP BY e.link_id,e.share_id,e.item_id,e.file_path ORDER BY count DESC LIMIT 100",
        )
        .all(),
    });
  });
  router.post("/api/shares", admin, async (req, res) => {
    const { title, slug, password, expiresAt } = req.body ?? {};
    const selected = req.body?.items;
    if (
      typeof title !== "string" ||
      !title.trim() ||
      title.length > 150 ||
      !Array.isArray(selected) ||
      !selected.length ||
      selected.length > 500 ||
      (slug !== undefined && typeof slug !== "string") ||
      (password !== undefined &&
        (typeof password !== "string" ||
          password.length < 12 ||
          Buffer.byteLength(password) > 1024)) ||
      (expiresAt != null &&
        (typeof expiresAt !== "string" ||
          !Number.isFinite(Date.parse(expiresAt)) ||
          Date.parse(expiresAt) <= Date.now()))
    ) {
      res.status(400).json({ error: "Invalid share" });
      return;
    }
    let short: string;
    try {
      short = slug ? normalizeSlug(slug) : randomSlug();
    } catch {
      res.status(400).json({ error: "Invalid slug" });
      return;
    }
    for (const entry of selected) {
      if (
        !entry ||
        typeof entry.sourceId !== "string" ||
        typeof entry.path !== "string" ||
        !validPath(entry.path, true) ||
        !["file", "directory"].includes(entry.kind) ||
        (entry.kind === "file" && !entry.path)
      ) {
        res.status(400).json({ error: "Invalid selection" });
        return;
      }
      const s = source(entry.sourceId);
      if (!s) {
        res.status(400).json({ error: "Invalid source" });
        return;
      }
      try {
        if (entry.kind === "file") {
          const fd = openSourceFile(s.root, entry.path);
          closeSync(fd);
        } else listSourceDirectory(s.root, entry.path);
      } catch {
        res.status(400).json({ error: "Selection unavailable" });
        return;
      }
    }
    const id = randomUUID(),
      linkId = randomUUID(),
      hash = password ? await hashPassword(password) : null;
    try {
      db.transaction(() => {
        db.prepare(
          "INSERT INTO shares(id,title,password_hash,expires_at,created_at) VALUES (?,?,?,?,?)",
        ).run(
          id,
          title.trim(),
          hash,
          expiresAt ? new Date(expiresAt).toISOString() : null,
          new Date().toISOString(),
        );
        const insert = db.prepare(
          "INSERT INTO share_items(id,share_id,source_id,relative_path,kind) VALUES (?,?,?,?,?)",
        );
        for (const item of selected)
          insert.run(randomUUID(), id, item.sourceId, item.path, item.kind);
        db.prepare(
          "INSERT INTO links(id,slug,share_id,created_at) VALUES (?,?,?,?)",
        ).run(linkId, short, id, new Date().toISOString());
      })();
    } catch (e) {
      if (
        e instanceof Error &&
        e.message.includes("UNIQUE constraint failed: links.slug")
      ) {
        res.status(409).json({ error: "Slug already exists" });
        return;
      }
      throw e;
    }
    res.status(201).json({ id, slug: short });
  });
  router.patch("/api/shares/:id", admin, async (req, res) => {
    const old = db
      .prepare("SELECT * FROM shares WHERE id=?")
      .get(req.params.id) as
      | {
          title: string;
          active: number;
          expires_at: string | null;
          password_hash: string | null;
        }
      | undefined;
    if (!old) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const { active, title, expiresAt, password, slug } = req.body ?? {};
    const selected = req.body?.items;
    if (
      (active !== undefined && typeof active !== "boolean") ||
      (title !== undefined &&
        (typeof title !== "string" || !title.trim() || title.length > 150)) ||
      (expiresAt !== undefined &&
        expiresAt !== null &&
        (typeof expiresAt !== "string" ||
          !Number.isFinite(Date.parse(expiresAt)) ||
          Date.parse(expiresAt) <= Date.now())) ||
      (password !== undefined &&
        password !== null &&
        (typeof password !== "string" ||
          password.length < 12 ||
          Buffer.byteLength(password) > 1024)) ||
      (slug !== undefined && typeof slug !== "string")
    ) {
      res.status(400).json({ error: "Invalid share" });
      return;
    }
    let normalized: string | undefined;
    try {
      normalized = slug === undefined ? undefined : normalizeSlug(slug);
    } catch {
      res.status(400).json({ error: "Invalid slug" });
      return;
    }
    if (selected !== undefined) {
      if (
        !Array.isArray(selected) ||
        !selected.length ||
        selected.length > 500
      ) {
        res.status(400).json({ error: "Invalid selection" });
        return;
      }
      for (const entry of selected) {
        if (
          !entry ||
          typeof entry.sourceId !== "string" ||
          typeof entry.path !== "string" ||
          !validPath(entry.path, true) ||
          !["file", "directory"].includes(entry.kind) ||
          (entry.kind === "file" && !entry.path)
        ) {
          res.status(400).json({ error: "Invalid selection" });
          return;
        }
        const s = source(entry.sourceId);
        if (!s) {
          res.status(400).json({ error: "Invalid source" });
          return;
        }
        try {
          if (entry.kind === "file") {
            const fd = openSourceFile(s.root, entry.path);
            closeSync(fd);
          } else listSourceDirectory(s.root, entry.path);
        } catch {
          res.status(400).json({ error: "Selection unavailable" });
          return;
        }
      }
    }
    const hash =
      password === undefined
        ? old.password_hash
        : password === null
          ? null
          : await hashPassword(password);
    try {
      db.transaction(() => {
        db.prepare(
          "UPDATE shares SET title=?,active=?,expires_at=?,password_hash=? WHERE id=?",
        ).run(
          title === undefined ? old.title : title.trim(),
          active === undefined ? old.active : active ? 1 : 0,
          expiresAt === undefined
            ? old.expires_at
            : expiresAt === null
              ? null
              : new Date(expiresAt).toISOString(),
          hash,
          req.params.id,
        );
        if (normalized !== undefined)
          db.prepare("UPDATE links SET slug=? WHERE share_id=?").run(
            normalized,
            req.params.id,
          );
        if (password !== undefined)
          db.prepare("DELETE FROM share_grants WHERE share_id=?").run(
            req.params.id,
          );
        if (selected !== undefined) {
          const existing = db
            .prepare(
              "SELECT id,source_id,relative_path,kind FROM share_items WHERE share_id=?",
            )
            .all(req.params.id) as {
            id: string;
            source_id: string;
            relative_path: string;
            kind: string;
          }[];
          const keep = new Set<string>();
          const insert = db.prepare(
            "INSERT INTO share_items(id,share_id,source_id,relative_path,kind) VALUES (?,?,?,?,?)",
          );
          for (const item of selected) {
            const match = existing.find(
              (x) =>
                !keep.has(x.id) &&
                x.source_id === item.sourceId &&
                x.relative_path === item.path &&
                x.kind === item.kind,
            );
            if (match) keep.add(match.id);
            else
              insert.run(
                randomUUID(),
                req.params.id,
                item.sourceId,
                item.path,
                item.kind,
              );
          }
          const del = db.prepare("DELETE FROM share_items WHERE id=?");
          for (const item of existing) if (!keep.has(item.id)) del.run(item.id);
        }
      })();
    } catch (e) {
      if (
        e instanceof Error &&
        e.message.includes("UNIQUE constraint failed: links.slug")
      ) {
        res.status(409).json({ error: "Slug already exists" });
        return;
      }
      throw e;
    }
    res.json({ ok: true });
  });
  router.post("/api/public/:slug/unlock", rateLimit, async (req, res) => {
    const share = find(String(req.params.slug));
    if (!share || !share.password_hash) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (
      typeof req.body?.password !== "string" ||
      !(await verifyPassword(req.body.password, share.password_hash))
    ) {
      res.status(401).json({ error: "Invalid password" });
      return;
    }
    const token = createSessionToken(),
      expires = new Date(Date.now() + 60 * 60 * 1000);
    db.prepare("DELETE FROM share_grants WHERE expires_at<=?").run(
      new Date().toISOString(),
    );
    db.prepare(
      "INSERT INTO share_grants(token_hash,share_id,expires_at) VALUES (?,?,?)",
    ).run(hashSessionToken(token), share.id, expires.toISOString());
    res.cookie("sharelyze_grant", token, {
      httpOnly: true,
      secure: secureCookies,
      sameSite: "strict",
      path: "/",
      expires,
    });
    res.json({ ok: true });
  });
  router.get("/api/public/:slug", (req, res) => {
    const share = find(String(req.params.slug));
    if (!share) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    event(share, "view");
    if (!granted(share, req.headers.cookie)) {
      res.json({ locked: true });
      return;
    }
    res.json({
      locked: false,
      title: share.title,
      items: items(share.id).map((i) => ({
        id: i.id,
        name: i.relative_path
          ? basename(i.relative_path)
          : source(i.source_id)?.name,
        kind: i.kind,
      })),
    });
  });
  function resolveItem(share: Share, itemId: string, subpath: string) {
    const item = items(share.id).find((i) => i.id === itemId);
    if (!item || !validPath(subpath, true) || (item.kind === "file" && subpath))
      return null;
    const path = [item.relative_path, subpath].filter(Boolean).join("/");
    return { item, path };
  }
  router.get("/api/public/:slug/items/:itemId", browseLimit, (req, res) => {
    const share = find(String(req.params.slug));
    if (!share || !granted(share, req.headers.cookie)) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const sub = typeof req.query.path === "string" ? req.query.path : "";
    const target = resolveItem(share, String(req.params.itemId), sub);
    if (!target || target.item.kind !== "directory") {
      res.status(404).json({ error: "Not found" });
      return;
    }
    try {
      res.json({ entries: listSourceDirectory(target.item.root, target.path) });
    } catch (error) {
      res.status(error instanceof DirectoryLimitError ? 413 : 404).json({
        error:
          error instanceof DirectoryLimitError
            ? "Directory contains too many entries"
            : "Not found",
      });
    }
  });
  router.get("/api/public/:slug/items/:itemId/download", (req, res) => {
    const share = find(String(req.params.slug));
    if (!share || !granted(share, req.headers.cookie)) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const sub = typeof req.query.path === "string" ? req.query.path : "";
    const target = resolveItem(share, req.params.itemId, sub);
    if (!target) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (req.method !== "HEAD" && activeDownloads >= 32) {
      res
        .status(503)
        .set("Retry-After", "5")
        .json({ error: "Download capacity reached; try again later" });
      return;
    }
    let fd: number;
    try {
      fd = openSourceFile(target.item.root, target.path);
    } catch {
      res.status(404).json({ error: "Not found" });
      return;
    }
    let stat;
    try {
      stat = fstatSync(fd);
    } catch {
      closeSync(fd);
      res.status(404).json({ error: "Not found" });
      return;
    }
    // Keep sub-second timestamp precision so same-size replacements made in
    // the same second are less likely to reuse a validator for old bytes.
    const etag = `"${stat.dev.toString(16)}-${stat.ino.toString(16)}-${stat.size.toString(16)}-${stat.mtimeMs.toString(16)}-${stat.ctimeMs.toString(16)}"`;
    res.set({
      "Accept-Ranges": "bytes",
      ETag: etag,
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="download"; filename*=UTF-8''${encodeURIComponent(basename(target.path)).replace(/['()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase())}`,
    });
    const header = req.get("range");
    const ifRange = req.get("if-range");
    const range =
      header && (!ifRange || ifRange === etag)
        ? parseRange(header, stat.size)
        : null;
    if (header && (!ifRange || ifRange === etag) && !range) {
      closeSync(fd);
      res.set("Content-Range", `bytes */${stat.size}`).status(416).end();
      return;
    }
    if (range) {
      res.status(206).set({
        "Content-Range": `bytes ${range.start}-${range.end}/${stat.size}`,
        "Content-Length": String(range.end - range.start + 1),
      });
    } else res.set("Content-Length", String(stat.size));
    if (req.method === "HEAD") {
      closeSync(fd);
      res.end();
      return;
    }
    try {
      event(share, "download_start", target.item.id, sub);
    } catch (error) {
      closeSync(fd);
      throw error;
    }
    activeDownloads++;
    const stream = createReadStream("", {
      fd,
      autoClose: true,
      ...(range ? { start: range.start, end: range.end } : {}),
    });
    let changed = false;
    stream.on("error", () => {
      if (!res.destroyed) res.destroy();
    });
    stream.on("end", () => {
      try {
        const after = fstatSync(fd);
        if (!sameFile(after, stat)) {
          changed = true;
          res.destroy();
        }
      } catch {
        changed = true;
        res.destroy();
      }
    });
    res.on("close", () => {
      activeDownloads--;
      stream.destroy();
    });
    res.on("finish", () => {
      if (!changed) event(share, "transfer_finished", target.item.id, sub);
    });
    stream.pipe(res);
  });
  router.get("/api/public/:slug/zip", (req, res) => {
    if (req.method === "HEAD") {
      res.status(405).set("Allow", "GET").end();
      return;
    }
    const share = find(String(req.params.slug));
    if (!share || !granted(share, req.headers.cookie)) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (activeZips >= 3) {
      res
        .status(503)
        .json({ error: "Archive capacity reached; try again later" });
      return;
    }
    const zip = new ZipFile();
    let count = 0;
    let activeStream: Readable | undefined;
    let cancelled = false;
    zip.on("error", () => {
      activeStream?.destroy();
      if (res.destroyed) return;
      if (res.headersSent) res.destroy();
      else res.status(500).json({ error: "Archive unavailable" });
    });
    try {
      function add(
        item: Item,
        path: string,
        archivePath: string,
        depth: number,
      ) {
        if (depth > 50 || ++count > 10000) throw new Error("Archive too large");
        const entries = listSourceDirectory(item.root, path);
        if (!entries.length) zip.addEmptyDirectory(archivePath + "/");
        for (const entry of entries) {
          const child = [path, entry.name].filter(Boolean).join("/");
          const target = archivePath + "/" + entry.name;
          if (entry.kind === "directory") add(item, child, target, depth + 1);
          else addFile(item, child, target);
        }
      }
      function addFile(item: Item, path: string, name: string) {
        if (++count > 10000) throw new Error("Archive too large");
        const initialFd = openSourceFile(item.root, path);
        let initial;
        try {
          initial = fstatSync(initialFd);
        } finally {
          closeSync(initialFd);
        }
        zip.addReadStreamLazy(
          name,
          { compress: false, forceZip64Format: true, size: initial.size },
          (callback) => {
            setImmediate(() => {
              if (cancelled) return;
              let fd: number | undefined;
              try {
                fd = openSourceFile(item.root, path);
                const current = fstatSync(fd);
                if (!sameFile(current, initial))
                  throw new Error("File changed");
                const stream = createReadStream("", { fd, autoClose: true });
                const streamFd = fd;
                fd = undefined;
                activeStream = stream;
                stream.on("error", (error) => zip.emit("error", error));
                stream.on("end", () => {
                  try {
                    if (!sameFile(fstatSync(streamFd), initial))
                      zip.emit("error", new Error("File changed"));
                  } catch (error) {
                    zip.emit("error", error);
                  }
                });
                callback(null, stream);
              } catch (error) {
                if (fd !== undefined) closeSync(fd);
                callback(
                  error as Error,
                  null as unknown as NodeJS.ReadableStream,
                );
              }
            });
          },
        );
      }
      for (const [index, item] of items(share.id).entries()) {
        const name = `${index + 1}-${item.relative_path ? basename(item.relative_path) : (source(item.source_id)?.name ?? "folder")}`;
        if (item.kind === "directory") add(item, item.relative_path, name, 0);
        else addFile(item, item.relative_path, name);
      }
    } catch (error) {
      res
        .status(error instanceof DirectoryLimitError ? 413 : 400)
        .json({ error: "Archive unavailable" });
      return;
    }
    activeZips++;
    let released = false;
    const releaseZip = () => {
      if (released) return;
      released = true;
      activeZips--;
      cancelled = true;
      activeStream?.destroy();
      (zip.outputStream as Readable).destroy();
    };
    res.set({
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="sharelyze.zip"',
    });
    event(share, "zip_start");
    zip.outputStream.on("error", () => res.destroy());
    res.on("close", releaseZip);
    res.on("finish", () => event(share, "zip_finished"));
    zip.outputStream.pipe(res);
    zip.end({ forceZip64Format: true, comment: "" });
  });
  return router;
}
