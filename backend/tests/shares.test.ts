import { describe, it, expect, vi } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  openSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { openDatabase } from "../src/database";
import { createApp } from "../src/app";
import { fromBuffer } from "yauzl";

// These tests exercise HTTP authorization and behavior; this fixture is not a security test for Linux storage.
vi.mock("../src/storage", () => ({
  DirectoryLimitError: class DirectoryLimitError extends Error {},
  openSourceFile: (root: string, path: string) =>
    openSync(join(root, path), "r"),
  listSourceDirectory: (root: string, path: string) =>
    readdirSync(join(root, path), { withFileTypes: true })
      .filter((x) => x.isFile() || x.isDirectory())
      .map((x) => ({
        name: x.name,
        kind: x.isDirectory() ? "directory" : "file",
      })),
}));

describe("share HTTP flow", () => {
  it("protects content, follows changing folder contents and serves byte ranges", async () => {
    const root = mkdtempSync(join(tmpdir(), "sharelyze-flow-"));
    const db = openDatabase(":memory:");
    try {
      mkdirSync(join(root, "photos"));
      writeFileSync(join(root, "photos", "one.txt"), "0123456789");
      db.prepare("INSERT INTO sources(id,name,root) VALUES (?,?,?)").run(
        "photos",
        "Photos",
        root,
      );
      const origin = "http://localhost:5173",
        setupToken = "0123456789abcdef0123456789abcdef";
      const app = createApp({
        db,
        publicOrigin: origin,
        setupToken,
        secureCookies: false,
      });
      const setup = await request(app)
        .post("/api/auth/setup")
        .set("Origin", origin)
        .send({
          username: "admin",
          password: "correct horse battery staple",
          setupToken,
        })
        .expect(201);
      const admin = setup.headers["set-cookie"][0] as string;
      await request(app)
        .post("/api/shares")
        .set("Origin", origin)
        .send({})
        .expect(401);
      const created = await request(app)
        .post("/api/shares")
        .set("Origin", origin)
        .set("Cookie", admin)
        .send({
          title: "Photos",
          slug: "photos",
          password: "password example long",
          items: [{ sourceId: "photos", path: "photos", kind: "directory" }],
        })
        .expect(201);
      const locked = await request(app).get("/api/public/photos").expect(200);
      expect(locked.body).toEqual({ locked: true });
      await request(app)
        .post("/api/public/photos/unlock")
        .set("Origin", origin)
        .send({ password: "wrong" })
        .expect(401);
      const unlock = await request(app)
        .post("/api/public/photos/unlock")
        .set("Origin", origin)
        .send({ password: "password example long" })
        .expect(200);
      const grant = unlock.headers["set-cookie"][0] as string;
      const page = await request(app)
        .get("/api/public/photos")
        .set("Cookie", grant)
        .expect(200);
      const item = page.body.items[0].id;
      db.prepare("UPDATE sources SET active=0 WHERE id=?").run("photos");
      await request(app)
        .get("/api/public/photos")
        .set("Cookie", grant)
        .expect(500);
      db.prepare("UPDATE sources SET active=1 WHERE id=?").run("photos");
      await request(app)
        .get(`/api/public/photos/items/${item}/download?path=one.txt`)
        .expect(404);
      const beforeHead = db
        .prepare(
          "SELECT count(*) AS count FROM events WHERE type='download_start'",
        )
        .get();
      await request(app)
        .head(`/api/public/photos/items/${item}/download?path=one.txt`)
        .set("Cookie", grant)
        .expect("Accept-Ranges", "bytes")
        .expect(200);
      expect(
        db
          .prepare(
            "SELECT count(*) AS count FROM events WHERE type='download_start'",
          )
          .get(),
      ).toEqual(beforeHead);
      const partial = await request(app)
        .get(`/api/public/photos/items/${item}/download?path=one.txt`)
        .set("Cookie", grant)
        .set("Range", "bytes=2-4")
        .expect(206);
      expect(partial.body.toString()).toBe("234");
      expect(partial.headers["content-range"]).toBe("bytes 2-4/10");
      const originalValidator = partial.headers.etag;
      writeFileSync(join(root, "photos", "one.txt"), "abcdefghij");
      const whole = await request(app)
        .get(`/api/public/photos/items/${item}/download?path=one.txt`)
        .set("Cookie", grant)
        .set("Range", "bytes=2-4")
        .set("If-Range", originalValidator)
        .expect(200);
      expect(whole.body.toString()).toBe("abcdefghij");
      const statistics = await request(app).get('/api/analytics').set('Cookie',admin).expect(200);
      expect(statistics.body.files).toEqual(expect.arrayContaining([expect.objectContaining({slug:'photos',title:'Photos',file_path:'one.txt',count:2})]));
      await request(app)
        .get(`/api/public/photos/items/${item}/download?path=one.txt`)
        .set("Cookie", grant)
        .set("Range", "bytes=100-")
        .expect(416);
      await request(app)
        .get(`/api/public/photos/items/${item}/download?path=../one.txt`)
        .set("Cookie", grant)
        .expect(404);
      writeFileSync(join(root, "photos", "two.txt"), "new");
      const listing = await request(app)
        .get(`/api/public/photos/items/${item}`)
        .set("Cookie", grant)
        .expect(200);
      expect(
        listing.body.entries.map((x: { name: string }) => x.name),
      ).toContain("two.txt");
      const archive = await request(app)
        .get("/api/public/photos/zip")
        .set("Cookie", grant)
        .buffer(true)
        .parse((res, callback) => {
          const chunks: Buffer[] = [];
          res.on("data", (chunk: Buffer) => chunks.push(chunk));
          res.on("end", () => callback(null, Buffer.concat(chunks)));
        })
        .expect("Content-Type", /zip/)
        .expect(200);
      await request(app)
        .head("/api/public/photos/zip")
        .set("Cookie", grant)
        .expect(405);
      const names = await new Promise<string[]>((resolve, reject) =>
        fromBuffer(archive.body, { lazyEntries: true }, (error, zip) => {
          if (error || !zip) {
            reject(error);
            return;
          }
          const found: string[] = [];
          zip.on("entry", (entry) => {
            found.push(entry.fileName);
            zip.readEntry();
          });
          zip.on("end", () => resolve(found));
          zip.on("error", reject);
          zip.readEntry();
        }),
      );
      expect(names.sort()).toEqual(["1-photos/one.txt", "1-photos/two.txt"]);
      await request(app)
        .patch(`/api/shares/${created.body.id}`)
        .set("Origin", origin)
        .set("Cookie", admin)
        .send({
          items: [
            { sourceId: "photos", path: "photos", kind: "directory" },
            { sourceId: "photos", path: "photos/two.txt", kind: "file" },
          ],
        })
        .expect(200);
      const edited = await request(app)
        .get("/api/public/photos")
        .set("Cookie", grant)
        .expect(200);
      expect(edited.body.items).toHaveLength(2);
      expect(edited.body.items[0].id).toBe(item);
      await request(app)
        .get("/photos")
        .expect("Location", "/share/photos")
        .expect(302);
      await request(app)
        .patch(`/api/shares/${created.body.id}`)
        .set("Origin", origin)
        .set("Cookie", admin)
        .send({ password: "another secure password" })
        .expect(200);
      expect(
        (
          await request(app)
            .get("/api/public/photos")
            .set("Cookie", grant)
            .expect(200)
        ).body.locked,
      ).toBe(true);
      await request(app)
        .patch(`/api/shares/${created.body.id}`)
        .set("Origin", origin)
        .set("Cookie", admin)
        .send({ active: false })
        .expect(200);
      await request(app)
        .get("/api/public/photos")
        .set("Cookie", grant)
        .expect(404);
    } finally {
      db.close();
      rmSync(root, { recursive: true, force: true });
    }
  });
});
