import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { openDatabase } from "../src/database";
import { createApp } from "../src/app";
import { hashSessionToken } from "../src/auth";

const origin = "http://localhost:5173";
const setupToken = "0123456789abcdef0123456789abcdef";
const db = openDatabase(":memory:");
const app = createApp({
  db,
  publicOrigin: origin,
  setupToken,
  secureCookies: true,
});
afterEach(() => {
  db.exec("DELETE FROM sessions; DELETE FROM admins;");
});

describe("admin authentication", () => {
  it("stores a validated link domain without changing the trusted admin origin", async () => {
    const isolated = openDatabase(":memory:");
    const localApp = createApp({
      db: isolated,
      publicOrigin: origin,
      setupToken,
      secureCookies: false,
    });
    try {
      await request(localApp).get("/api/settings").expect(401);
      const setup = await request(localApp)
        .post("/api/auth/setup")
        .set("Origin", origin)
        .send({
          username: "admin",
          password: "correct horse battery staple",
          setupToken,
        })
        .expect(201);
      const cookie = setup.headers["set-cookie"][0] as string;
      for (const publicLinkOrigin of [
        "javascript:alert(1)",
        "http://example.org",
        "https://user:pass@example.org",
        "https://example.org/a",
        "https://example.org/?x=1",
      ]) {
        await request(localApp)
          .put("/api/settings")
          .set("Cookie", cookie)
          .set("Origin", origin)
          .send({ publicLinkOrigin })
          .expect(400);
      }
      await request(localApp)
        .put("/api/settings")
        .set("Cookie", cookie)
        .set("Origin", origin)
        .send({ publicLinkOrigin: "https://files.example.org/" })
        .expect(200)
        .expect(({ body }) =>
          expect(body.publicLinkOrigin).toBe("https://files.example.org"),
        );
      await request(localApp)
        .get("/api/settings")
        .set("Cookie", cookie)
        .expect(200)
        .expect(({ body }) =>
          expect(body.publicLinkOrigin).toBe("https://files.example.org"),
        );
      await request(localApp)
        .put("/api/settings")
        .set("Cookie", cookie)
        .set("Origin", "https://files.example.org")
        .send({ publicLinkOrigin: "https://other.example.org" })
        .expect(403);
    } finally {
      isolated.close();
    }
  });
  it("accepts only explicitly enabled local aliases in development", async () => {
    const isolated = openDatabase(":memory:");
    const localApp = createApp({
      db: isolated,
      publicOrigin: "http://127.0.0.1:5173",
      setupToken,
      secureCookies: false,
      allowLoopbackAliases: true,
    });
    const credentials = {
      username: "admin",
      password: "correct horse battery staple",
      setupToken,
    };
    try {
      await request(localApp)
        .post("/api/auth/setup")
        .set("Origin", "http://evil.test:5173")
        .send(credentials)
        .expect(403)
        .expect(({ body }) => expect(body.code).toBe("INVALID_ORIGIN"));
      await request(localApp)
        .post("/api/auth/setup")
        .set("Origin", "http://localhost:5174")
        .send(credentials)
        .expect(403);
      await request(localApp)
        .post("/api/auth/setup")
        .set("Origin", "http://localhost:5173")
        .send({ ...credentials, setupToken: "old-token" })
        .expect(403)
        .expect(({ body }) => expect(body.code).toBe("INVALID_SETUP_TOKEN"));
      await request(localApp)
        .post("/api/auth/setup")
        .set("Origin", "http://localhost:5173")
        .send(credentials)
        .expect(201);
    } finally {
      isolated.close();
    }
  });
  it("accepts configured LAN origins only in local development", async () => {
    const isolated = openDatabase(":memory:");
    const localApp = createApp({ db: isolated, publicOrigin: "http://127.0.0.1:5173", setupToken, secureCookies: false, allowLoopbackAliases: true, developmentOrigins: ["http://dev-pi.local:5173", "http://192.168.1.2:5173"] });
    const credentials = { username: "admin", password: "correct horse battery staple", setupToken };
    try {
      await request(localApp).post("/api/auth/setup").set("Origin", "http://evil.local:5173").send(credentials).expect(403);
      await request(localApp).post("/api/auth/setup").set("Origin", "http://dev-pi.local:5174").send(credentials).expect(403);
      await request(localApp).post("/api/auth/setup").set("Origin", "http://dev-pi.local:5173").send(credentials).expect(201);
      await request(localApp).post("/api/auth/login").set("Origin", "http://192.168.1.2:5173").send({ username: credentials.username, password: credentials.password }).expect(200);
    } finally { isolated.close(); }
  });
  it("keeps the origin strict unless development aliases are enabled", async () => {
    const isolated = openDatabase(":memory:");
    const strict = createApp({
      db: isolated,
      publicOrigin: "http://127.0.0.1:5173",
      setupToken,
      secureCookies: false,
    });
    try {
      await request(strict)
        .post("/api/auth/setup")
        .set("Origin", "http://localhost:5173")
        .send({
          username: "admin",
          password: "correct horse battery staple",
          setupToken,
        })
        .expect(403);
    } finally {
      isolated.close();
    }
  });
  it("does not allow loopback aliases for a public or HTTPS origin", () => {
    const isolated = openDatabase(":memory:");
    try {
      expect(() =>
        createApp({
          db: isolated,
          publicOrigin: "https://example.test",
          setupToken,
          secureCookies: true,
          allowLoopbackAliases: true,
        }),
      ).toThrow();
      expect(() =>
        createApp({
          db: isolated,
          publicOrigin: "http://example.test",
          setupToken,
          secureCookies: false,
          allowLoopbackAliases: true,
        }),
      ).toThrow();
    } finally {
      isolated.close();
    }
  });
  it("rejects malformed and oversized JSON without exposing internal errors", async () => {
    await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .set("Origin", origin)
      .send("{")
      .expect(400);
    await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .set("Origin", origin)
      .send(JSON.stringify({ data: "x".repeat(300000) }))
      .expect(413);
  });
  it("ignores forged forwarded addresses when no proxy is trusted", async () => {
    const isolated = openDatabase(":memory:");
    const localApp = createApp({
      db: isolated,
      publicOrigin: origin,
      setupToken,
      secureCookies: false,
    });
    try {
      for (let i = 0; i < 10; i++)
        await request(localApp)
          .post("/api/public/unknown/unlock")
          .set("Origin", origin)
          .set("X-Forwarded-For", `203.0.113.${i + 1}`)
          .send({ password: "bad" })
          .expect(404);
      await request(localApp)
        .post("/api/public/unknown/unlock")
        .set("Origin", origin)
        .set("X-Forwarded-For", "203.0.113.20")
        .send({ password: "bad" })
        .expect(429);
    } finally {
      isolated.close();
    }
  });
  it("isolates rate limits by client address behind an explicitly trusted proxy", async () => {
    const isolated = openDatabase(":memory:");
    const localApp = createApp({
      db: isolated,
      publicOrigin: origin,
      setupToken,
      secureCookies: false,
      trustedProxies: ["loopback"],
    });
    try {
      for (let i = 0; i < 10; i++)
        await request(localApp)
          .post("/api/public/unknown/unlock")
          .set("Origin", origin)
          .set("X-Forwarded-For", "203.0.113.1")
          .send({ password: "bad" })
          .expect(404);
      await request(localApp)
        .post("/api/public/unknown/unlock")
        .set("Origin", origin)
        .set("X-Forwarded-For", "203.0.113.1")
        .send({ password: "bad" })
        .expect(429);
      await request(localApp)
        .post("/api/public/unknown/unlock")
        .set("Origin", origin)
        .set("X-Forwarded-For", "203.0.113.2")
        .send({ password: "bad" })
        .expect(404);
    } finally {
      isolated.close();
    }
  });
  it("does not let unlock rate limiting block admin login", async () => {
    const isolated = openDatabase(":memory:");
    const localApp = createApp({
      db: isolated,
      publicOrigin: origin,
      setupToken,
      secureCookies: false,
    });
    try {
      await request(localApp)
        .post("/api/auth/setup")
        .set("Origin", origin)
        .send({
          username: "admin",
          password: "correct horse battery staple",
          setupToken,
        })
        .expect(201);
      for (let i = 0; i < 10; i++)
        await request(localApp)
          .post("/api/public/unknown/unlock")
          .set("Origin", origin)
          .send({ password: "bad" })
          .expect(404);
      await request(localApp)
        .post("/api/public/unknown/unlock")
        .set("Origin", origin)
        .send({ password: "bad" })
        .expect(429);
      await request(localApp)
        .post("/api/auth/login")
        .set("Origin", origin)
        .send({ username: "admin", password: "correct horse battery staple" })
        .expect(200);
    } finally {
      isolated.close();
    }
  });
  it("requires a setup token and same-origin writes; sessions are revocable", async () => {
    const credentials = {
      username: "admin",
      password: "correct horse battery staple",
      setupToken,
    };
    await request(app).post("/api/auth/setup").send(credentials).expect(403);
    await request(app)
      .post("/api/auth/setup")
      .set("Origin", origin)
      .send({ ...credentials, setupToken: "wrong" })
      .expect(403);
    const setup = await request(app)
      .post("/api/auth/setup")
      .set("Origin", origin)
      .send(credentials)
      .expect(201);
    const cookie = setup.headers["set-cookie"][0] as string;
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Strict");
    await request(app).get("/api/admin/status").expect(401);
    await request(app)
      .get("/api/admin/status")
      .set("Cookie", cookie)
      .expect(200);
    await request(app)
      .post("/api/auth/setup")
      .set("Origin", origin)
      .send(credentials)
      .expect(409);
    await request(app)
      .post("/api/auth/logout")
      .set("Origin", origin)
      .set("Cookie", cookie)
      .expect(200);
    await request(app)
      .get("/api/admin/status")
      .set("Cookie", cookie)
      .expect(401);
    await request(app)
      .post("/api/auth/login")
      .set("Origin", origin)
      .send({ username: "admin", password: "wrong password" })
      .expect(401);
    await request(app)
      .post("/api/auth/login")
      .set("Origin", origin)
      .send(credentials)
      .expect(200);
  });
  it("does not treat malformed session expiry as authenticated", async () => {
    const setup = await request(app)
      .post("/api/auth/setup")
      .set("Origin", origin)
      .send({
        username: "admin",
        password: "correct horse battery staple",
        setupToken,
      })
      .expect(201);
    const cookie = setup.headers["set-cookie"][0] as string;
    const token = cookie.match(/sharelyze_session=([^;]+)/)?.[1];
    expect(token).toBeTruthy();
    db.prepare(
      "UPDATE sessions SET expires_at='invalid' WHERE token_hash=?",
    ).run(hashSessionToken(token!));
    await request(app)
      .get("/api/auth/status")
      .set("Cookie", cookie)
      .expect(200)
      .expect(({ body }) => expect(body.authenticated).toBe(false));
    await request(app)
      .get("/api/admin/status")
      .set("Cookie", cookie)
      .expect(401);
  });
  it("protects link management and counts only successful redirects", async () => {
    await request(app)
      .post("/api/links")
      .set("Origin", origin)
      .send({ url: "https://example.org" })
      .expect(401);
    const setup = await request(app)
      .post("/api/auth/setup")
      .set("Origin", origin)
      .send({
        username: "admin",
        password: "correct horse battery staple",
        setupToken,
      })
      .expect(201);
    const cookie = setup.headers["set-cookie"][0] as string;
    await request(app)
      .post("/api/links")
      .set("Origin", origin)
      .set("Cookie", cookie)
      .send({ url: "javascript:alert(1)", slug: "test" })
      .expect(400);
    const created = await request(app)
      .post("/api/links")
      .set("Origin", origin)
      .set("Cookie", cookie)
      .send({ url: "https://example.org/path", slug: "Test" })
      .expect(201);
    expect(created.body.slug).toBe("Test");
    await request(app)
      .post("/api/links")
      .set("Origin", origin)
      .set("Cookie", cookie)
      .send({ url: "https://example.org", slug: "test" })
      .expect(409);
    await request(app)
      .get("/r/test")
      .expect("Location", "https://example.org/path")
      .expect(302);
    await request(app)
      .get("/test")
      .expect("Location", "https://example.org/path")
      .expect(302);
    expect(
      db
        .prepare("SELECT count(*) AS count FROM events WHERE type='redirect'")
        .get(),
    ).toEqual({ count: 2 });
    const analytics = await request(app)
      .get("/api/analytics")
      .set("Cookie", cookie)
      .expect(200);
    expect(analytics.body.dailyByLink).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slug: "Test", type: "redirect", count: 2 }),
      ]),
    );
    await request(app)
      .patch(`/api/links/${created.body.id}`)
      .set("Origin", origin)
      .set("Cookie", cookie)
      .send({ active: false })
      .expect(400);
    await request(app).get("/r/test").expect(302);
    db.exec("DELETE FROM events; DELETE FROM links");
  });
});
