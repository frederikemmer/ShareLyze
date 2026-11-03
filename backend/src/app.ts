import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import type Database from "better-sqlite3";
import { randomUUID, timingSafeEqual } from "node:crypto";
import {
  createSessionToken,
  hashSessionToken,
  hashPassword,
  verifyPassword,
} from "./auth";
import { externalUrl, normalizeSlug, randomSlug } from "./links";
import { sharesRouter } from "./shares";
import { join } from "node:path";

interface AppOptions {
  db: Database.Database;
  publicOrigin: string;
  setupToken: string;
  secureCookies: boolean;
  frontendDir?: string;
  trustedProxies?: string[];
  allowLoopbackAliases?: boolean;
}

/** This API is still under development and must not be exposed publicly. */
export function createApp({
  db,
  publicOrigin,
  setupToken,
  secureCookies,
  frontendDir,
  trustedProxies = [],
  allowLoopbackAliases = false,
}: AppOptions) {
  const publicUrl = new URL(publicOrigin);
  const origin = publicUrl.origin;
  const allowedOrigins = new Set([origin]);
  if (allowLoopbackAliases) {
    if (
      publicUrl.protocol !== "http:" ||
      secureCookies ||
      !["127.0.0.1", "localhost", "[::1]"].includes(publicUrl.hostname)
    )
      throw new Error(
        "Loopback aliases require a local HTTP development origin",
      );
    for (const host of ["127.0.0.1", "localhost", "[::1]"])
      allowedOrigins.add(
        `http://${host}${publicUrl.port ? `:${publicUrl.port}` : ""}`,
      );
  }
  if (setupToken.length < 32)
    throw new Error("Setup token must contain at least 32 characters");
  const app = express();
  if (trustedProxies.length) app.set("trust proxy", trustedProxies);
  app.disable("x-powered-by");
  app.use(express.json({ limit: "256kb" }));
  app.use((_req, res, next) => {
    res.set({
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "DENY",
    });
    next();
  });
  // An explicitly configured origin is used, never Host or proxy headers.
  app.use((req, res, next) => {
    if (
      ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
      !allowedOrigins.has(req.get("origin") ?? "")
    ) {
      res.status(403).json({ error: "Invalid origin", code: "INVALID_ORIGIN" });
      return;
    }
    next();
  });
  const attempts = new Map<string, { count: number; until: number }>();
  function rateLimit(bucket: string, maximum = 10, windowMs = 15 * 60_000) {
    return (req: Request, res: Response, next: NextFunction) => {
      const now = Date.now();
      for (const [key, value] of attempts)
        if (value.until <= now) attempts.delete(key);
      const key = `${bucket}:${req.ip ?? "unknown"}`;
      const existing = attempts.get(key);
      if (!existing && attempts.size >= 10000) {
        res.status(503).json({ error: "Rate limiter capacity reached" });
        return;
      }
      const entry = existing ?? { count: 0, until: now + windowMs };
      if (++entry.count > maximum) {
        res.status(429).json({ error: "Too many attempts" });
        return;
      }
      attempts.set(key, entry);
      next();
    };
  }
  function token(req: Request): string | undefined {
    const value = req.headers.cookie
      ?.split(";")
      .map((x) => x.trim())
      .find((x) => x.slice(0, x.indexOf("=")) === "sharelyze_session");
    const result = value?.slice("sharelyze_session=".length);
    return result && /^[A-Za-z0-9_-]{43}$/.test(result) ? result : undefined;
  }
  const sessionIsValid = (session?: { expires_at: string }) => {
    if (!session) return false;
    const expires = Date.parse(session.expires_at);
    return Number.isFinite(expires) && expires > Date.now();
  };
  const findSession = (value?: string) =>
    value
      ? (db
          .prepare("SELECT expires_at FROM sessions WHERE token_hash = ?")
          .get(hashSessionToken(value)) as { expires_at: string } | undefined)
      : undefined;
  function requireAdmin(req: Request, res: Response, next: NextFunction) {
    const session = findSession(token(req));
    if (!sessionIsValid(session)) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    next();
  }
  function issueSession(res: Response) {
    const value = createSessionToken();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(
      new Date().toISOString(),
    );
    db.prepare(
      "INSERT INTO sessions(token_hash, expires_at) VALUES (?, ?)",
    ).run(hashSessionToken(value), expires.toISOString());
    res.cookie("sharelyze_session", value, {
      httpOnly: true,
      secure: secureCookies,
      sameSite: "strict",
      path: "/",
      expires,
    });
  }
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", stage: "development" });
  });
  app.get("/api/auth/status", (req, res) => {
    const configured = Boolean(
      db.prepare("SELECT id FROM admins WHERE id=1").get(),
    );
    const session = findSession(token(req));
    res.json({
      configured,
      authenticated: sessionIsValid(session),
    });
  });
  app.post("/api/auth/setup", rateLimit("setup"), async (req, res) => {
    if (db.prepare("SELECT id FROM admins WHERE id=1").get()) {
      res.status(409).json({ error: "Already configured" });
      return;
    }
    const supplied =
      typeof req.body?.setupToken === "string"
        ? Buffer.from(req.body.setupToken)
        : Buffer.alloc(0);
    const expected = Buffer.from(setupToken);
    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    ) {
      res
        .status(403)
        .json({ error: "Invalid setup token", code: "INVALID_SETUP_TOKEN" });
      return;
    }
    const username = req.body?.username;
    const password = req.body?.password;
    if (
      typeof username !== "string" ||
      username.trim().length < 2 ||
      username.trim().length > 64 ||
      typeof password !== "string" ||
      password.length < 12 ||
      Buffer.byteLength(password) > 1024
    ) {
      res.status(400).json({ error: "Invalid credentials" });
      return;
    }
    const hash = await hashPassword(password);
    try {
      db.prepare(
        "INSERT INTO admins(id, username, password_hash) VALUES (1, ?, ?)",
      ).run(username.trim(), hash);
    } catch {
      res.status(409).json({ error: "Already configured" });
      return;
    }
    issueSession(res);
    res.status(201).json({ ok: true });
  });
  app.post("/api/auth/login", rateLimit("login"), async (req, res) => {
    const username = req.body?.username;
    const password = req.body?.password;
    if (
      typeof username !== "string" ||
      typeof password !== "string" ||
      username.length > 64 ||
      Buffer.byteLength(password) > 1024
    ) {
      res.status(400).json({ error: "Invalid credentials" });
      return;
    }
    const admin = db
      .prepare("SELECT username,password_hash FROM admins WHERE id=1")
      .get() as { username: string; password_hash: string } | undefined;
    if (
      !admin ||
      username.trim() !== admin.username ||
      !(await verifyPassword(password, admin.password_hash))
    ) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    issueSession(res);
    res.json({ ok: true });
  });
  app.post("/api/auth/logout", requireAdmin, (req, res) => {
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(
      hashSessionToken(token(req)!),
    );
    res.clearCookie("sharelyze_session", {
      httpOnly: true,
      secure: secureCookies,
      sameSite: "strict",
      path: "/",
    });
    res.json({ ok: true });
  });
  app.get("/api/admin/status", requireAdmin, (_req, res) => {
    res.json({ stage: "development" });
  });
  app.get("/api/settings", requireAdmin, (_req, res) => {
    const row = db
      .prepare("SELECT value FROM settings WHERE key='public_link_origin'")
      .get() as { value: string } | undefined;
    res.json({ publicLinkOrigin: row?.value ?? origin, defaultOrigin: origin });
  });
  app.put("/api/settings", requireAdmin, (req, res) => {
    const value = req.body?.publicLinkOrigin;
    if (typeof value !== "string" || value.length > 2048) {
      res.status(400).json({ error: "Invalid public URL" });
      return;
    }
    let parsed: URL;
    try {
      parsed = new URL(value.trim());
    } catch {
      res.status(400).json({ error: "Invalid public URL" });
      return;
    }
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(
      parsed.hostname,
    );
    if (
      (parsed.protocol !== "https:" &&
        !(parsed.protocol === "http:" && loopback)) ||
      parsed.username ||
      parsed.password ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash
    ) {
      res.status(400).json({ error: "Invalid public URL" });
      return;
    }
    db.prepare(
      "INSERT INTO settings(key,value) VALUES('public_link_origin',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
    ).run(parsed.origin);
    res.json({ publicLinkOrigin: parsed.origin, defaultOrigin: origin });
  });
  app.get("/api/links", requireAdmin, (_req, res) => {
    const links = db
      .prepare(
        "SELECT id,slug,target_url,active,created_at FROM links WHERE target_url IS NOT NULL ORDER BY created_at DESC",
      )
      .all();
    res.json({ links });
  });
  app.post("/api/links", requireAdmin, (req, res) => {
    if (
      typeof req.body?.url !== "string" ||
      (req.body.slug !== undefined && typeof req.body.slug !== "string")
    ) {
      res.status(400).json({ error: "Invalid link" });
      return;
    }
    let slug: string, url: string;
    try {
      slug = req.body.slug ? normalizeSlug(req.body.slug) : randomSlug();
      url = externalUrl(req.body.url);
    } catch {
      res.status(400).json({ error: "Invalid slug or URL" });
      return;
    }
    const id = randomUUID();
    try {
      db.prepare(
        "INSERT INTO links (id,slug,target_url,created_at) VALUES (?,?,?,?)",
      ).run(id, slug, url, new Date().toISOString());
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("UNIQUE constraint failed: links.slug")
      ) {
        res.status(409).json({ error: "Slug already exists" });
        return;
      }
      throw error;
    }
    res.status(201).json({ id, slug, url });
  });
  app.patch("/api/links/:id", requireAdmin, (req, res) => {
    const old = db
      .prepare(
        "SELECT slug,target_url,active FROM links WHERE id=? AND target_url IS NOT NULL",
      )
      .get(req.params.id) as
      | { slug: string; target_url: string; active: number }
      | undefined;
    if (!old) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (
      (req.body?.active !== undefined &&
        typeof req.body.active !== "boolean") ||
      (req.body?.slug !== undefined && typeof req.body.slug !== "string") ||
      (req.body?.url !== undefined && typeof req.body.url !== "string")
    ) {
      res.status(400).json({ error: "Invalid link" });
      return;
    }
    let slug: string, url: string;
    try {
      slug =
        req.body?.slug === undefined ? old.slug : normalizeSlug(req.body.slug);
      url =
        req.body?.url === undefined
          ? old.target_url
          : externalUrl(req.body.url);
    } catch {
      res.status(400).json({ error: "Invalid slug or URL" });
      return;
    }
    try {
      db.prepare(
        "UPDATE links SET slug=?,target_url=?,active=? WHERE id=?",
      ).run(
        slug,
        url,
        req.body?.active === undefined ? old.active : req.body.active ? 1 : 0,
        req.params.id,
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("UNIQUE constraint failed: links.slug")
      ) {
        res.status(409).json({ error: "Slug already exists" });
        return;
      }
      throw error;
    }
    res.json({ ok: true });
  });
  app.get("/r/:slug", (req, res) => {
    const row = db
      .prepare(
        "SELECT id,target_url FROM links WHERE slug=? AND active=1 AND target_url IS NOT NULL",
      )
      .get(req.params.slug) as { id: string; target_url: string } | undefined;
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    db.prepare(
      "INSERT INTO events(link_id,type,created_at) VALUES (?,?,?)",
    ).run(row.id, "redirect", new Date().toISOString());
    res.redirect(302, row.target_url);
  });
  app.use(
    sharesRouter(
      db,
      requireAdmin,
      secureCookies,
      rateLimit("unlock"),
      rateLimit("browse", 120, 60_000),
    ),
  );
  if (frontendDir) {
    app.use(express.static(frontendDir, { index: false, fallthrough: true }));
    app.get(["/", "/share/:slug"], (_req, res) => {
      res.sendFile(join(frontendDir, "index.html"));
    });
  }
  app.get("/:slug", (req, res) => {
    const link = db
      .prepare(
        "SELECT l.id,l.target_url,l.share_id FROM links l LEFT JOIN shares s ON s.id=l.share_id WHERE l.slug=? AND l.active=1 AND (l.target_url IS NOT NULL OR (s.active=1 AND (s.expires_at IS NULL OR s.expires_at>?)))",
      )
      .get(req.params.slug, new Date().toISOString()) as
      | { id: string; target_url: string | null; share_id: string | null }
      | undefined;
    if (!link) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (link.target_url) {
      db.prepare(
        "INSERT INTO events(link_id,type,created_at) VALUES (?,?,?)",
      ).run(link.id, "redirect", new Date().toISOString());
      res.redirect(302, link.target_url);
      return;
    }
    res.redirect(302, `/share/${encodeURIComponent(String(req.params.slug))}`);
  });
  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });
  app.use(
    (error: unknown, _req: Request, res: Response, next: NextFunction) => {
      if (res.headersSent) {
        next(error);
        return;
      }
      const status =
        error && typeof error === "object" && "status" in error
          ? (error as { status: unknown }).status
          : undefined;
      if (status === 400 || status === 413) {
        res.status(status).json({
          error: status === 413 ? "Request too large" : "Invalid request",
        });
        return;
      }
      res.status(500).json({ error: "Internal server error" });
    },
  );
  return app;
}
