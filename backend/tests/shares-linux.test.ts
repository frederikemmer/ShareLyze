import { describe, expect, it } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  symlinkSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { openDatabase } from "../src/database";
import { createApp } from "../src/app";

describe.skipIf(process.platform !== "linux")(
  "real Linux storage and sharing",
  () => {
    it("rejects symlink escape and serves authorized files and dynamic directories", async () => {
      const root = mkdtempSync(join(tmpdir(), "sharelyze-real-"));
      const db = openDatabase(":memory:");
      try {
        mkdirSync(join(root, "folder"));
        mkdirSync(join(root, "second"));
        writeFileSync(join(root, "folder", "one.txt"), "abcdefgh");
        writeFileSync(join(root, "second", "two.txt"), "source two");
        symlinkSync("/etc/passwd", join(root, "folder", "escape"));
        db.prepare("INSERT INTO sources(id,name,root) VALUES (?,?,?)").run(
          "one",
          "One",
          root,
        );
        db.prepare("INSERT INTO sources(id,name,root) VALUES (?,?,?)").run(
          "two",
          "Two",
          join(root, "second"),
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
        const cookie = setup.headers["set-cookie"][0] as string;
        await request(app)
          .post("/api/shares")
          .set("Origin", origin)
          .set("Cookie", cookie)
          .send({
            title: "unsafe",
            items: [{ sourceId: "one", path: "folder/escape", kind: "file" }],
          })
          .expect(400);
        await request(app)
          .post("/api/shares")
          .set("Origin", origin)
          .set("Cookie", cookie)
          .send({
            title: "safe",
            slug: "safe",
            items: [{ sourceId: "one", path: "folder", kind: "directory" }],
          })
          .expect(201);
        const page = await request(app).get("/api/public/safe").expect(200);
        const id = page.body.items[0].id;
        const result = await request(app)
          .get(`/api/public/safe/items/${id}/download?path=one.txt`)
          .set("Range", "bytes=2-4")
          .expect(206);
        expect(result.body.toString()).toBe("cde");
        await request(app)
          .get(`/api/public/safe/items/${id}/download?path=escape`)
          .expect(404);
        writeFileSync(join(root, "folder", "two.txt"), "new");
        const listing = await request(app)
          .get(`/api/public/safe/items/${id}`)
          .expect(200);
        expect(
          listing.body.entries.map((e: { name: string }) => e.name).sort(),
        ).toEqual(["one.txt", "two.txt"]);
        await request(app).get("/api/public/safe/zip").expect(200);
        await request(app)
          .post("/api/shares")
          .set("Origin", origin)
          .set("Cookie", cookie)
          .send({
            title: "multiple sources",
            slug: "multi",
            items: [
              { sourceId: "one", path: "folder/one.txt", kind: "file" },
              { sourceId: "two", path: "two.txt", kind: "file" },
            ],
          })
          .expect(201);
        const mixed = await request(app).get("/api/public/multi").expect(200);
        expect(mixed.body.items).toHaveLength(2);
        const second = await request(app)
          .get(`/api/public/multi/items/${mixed.body.items[1].id}/download`)
          .expect(200);
        expect(second.body.toString()).toBe("source two");
      } finally {
        db.close();
        rmSync(root, { recursive: true, force: true });
      }
    });
  },
);
