import { describe, it, expect, vi } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  openSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { openDatabase } from "../src/database";
import { createApp } from "../src/app";
import { fromBuffer } from "yauzl";
import sharp from "sharp";

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
  measureSourceItem: async (root: string, path: string, kind: string) => {
    const target = join(root, path);
    const stat = statSync(target);
    if (kind === "file" && stat.isFile()) return {fileCount: 1, totalBytes: stat.size};
    if (kind !== "directory" || !stat.isDirectory()) throw new Error("Invalid type");
    const walk = (dir: string): number => readdirSync(dir, {withFileTypes:true}).reduce((sum, entry) => sum + (entry.isDirectory() ? walk(join(dir, entry.name)) : statSync(join(dir, entry.name)).size), 0);
    return {fileCount: 0, totalBytes: walk(target)};
  },
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
      expect(locked.body).toMatchObject({ locked: true });
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
      await request(app).get(`/api/public/photos/items/${item}/size?path=one.txt&kind=file`).expect(404);
      await request(app).get(`/api/public/photos/items/${item}/size?path=../one.txt&kind=file`).set("Cookie", grant).expect(404);
      const size = await request(app).get(`/api/public/photos/items/${item}/size?path=one.txt&kind=file`).set("Cookie", grant).expect(200);
      expect(size.body.totalBytes).toBe(10);
      await request(app).get(`/api/public/photos/items/${item}/zip`).expect(404);
      await request(app).get(`/api/public/photos/items/${item}/zip?path=../other`).set("Cookie", grant).expect(404);
      const folderZip = await request(app).get(`/api/public/photos/items/${item}/zip`).set("Cookie", grant).buffer(true).parse((res, callback) => { const chunks: Buffer[] = []; res.on("data", (chunk: Buffer) => chunks.push(chunk)); res.on("end", () => callback(null, Buffer.concat(chunks))); }).expect("Content-Type", /zip/).expect(200);
      const folderNames = await new Promise<string[]>((resolve, reject) => fromBuffer(folderZip.body, {lazyEntries:true}, (error, zip) => { if (error || !zip) return reject(error); const names: string[] = []; zip.on("entry", entry => { names.push(entry.fileName); zip.readEntry(); }); zip.on("end", () => resolve(names)); zip.on("error", reject); zip.readEntry(); }));
      expect(folderNames).toEqual(["photos/one.txt"]);
      mkdirSync(join(root, "photos", "nested"));
      writeFileSync(join(root, "photos", "nested", "inside.txt"), "abc");
      const folderSize = await request(app).get(`/api/public/photos/items/${item}/size?path=nested&kind=directory`).set("Cookie", grant).expect(200);
      expect(folderSize.body.totalBytes).toBe(3);
      const nestedZip = await request(app).get(`/api/public/photos/items/${item}/zip?path=nested`).set("Cookie", grant).buffer(true).parse((res, callback) => { const chunks: Buffer[] = []; res.on("data", (chunk: Buffer) => chunks.push(chunk)); res.on("end", () => callback(null, Buffer.concat(chunks))); }).expect(200);
      const nestedNames = await new Promise<string[]>((resolve, reject) => fromBuffer(nestedZip.body, {lazyEntries:true}, (error, zip) => { if (error || !zip) return reject(error); const names: string[] = []; zip.on("entry", entry => { names.push(entry.fileName); zip.readEntry(); }); zip.on("end", () => resolve(names)); zip.on("error", reject); zip.readEntry(); }));
      expect(nestedNames).toEqual(["nested/inside.txt"]);
      rmSync(join(root, "photos", "nested"), {recursive: true});
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
      const picture = join(root, "photos", "preview.png");
      writeFileSync(picture, await sharp({create:{width:4,height:4,channels:3,background:"red"}}).png().toBuffer());
      await request(app).get(`/api/public/photos/items/${item}/preview?path=preview.png`).expect(404);
      await request(app).get(`/api/public/photos/items/${item}/view?path=preview.png`).expect(404);
      await request(app).get(`/api/public/photos/items/${item}/view?path=../preview.png`).set("Cookie", grant).expect(404);
      await request(app).get(`/api/public/photos/items/${item}/view?path=one.txt`).set("Cookie", grant).expect("Content-Type", /image\/jpeg/).expect(200);
      const fullImage = await request(app).get(`/api/public/photos/items/${item}/view?path=preview.png`).set("Cookie", grant).expect("Content-Type", /image\/png/).expect("Content-Disposition", "inline").expect(200);
      expect(fullImage.body.equals(await sharp({create:{width:4,height:4,channels:3,background:"red"}}).png().toBuffer())).toBe(true);
      const video = Buffer.from("000000186674797069736f6d000000006162636465666768", "hex");
      writeFileSync(join(root, "photos", "movie.mp4"), video);
      const videoUrl = `/api/public/photos/items/${item}/view?path=movie.mp4`;
      await request(app).get(videoUrl).expect(404);
      await request(app).get(videoUrl).set("Cookie", grant).set("Range", "bytes=2-7").buffer(true).parse((res, callback) => {const chunks:Buffer[]=[]; res.on("data", (chunk:Buffer) => chunks.push(chunk)); res.on("end", () => callback(null, Buffer.concat(chunks)));}).expect("Content-Type", /video\/mp4/).expect("Content-Range", `bytes 2-7/${video.length}`).expect(206).expect(response => { expect(response.body.equals(video.subarray(2, 8))).toBe(true); });
      await request(app).get(videoUrl).set("Cookie", grant).set("Range", "bytes=999-").expect("Content-Range", `bytes */${video.length}`).expect(416);
      await request(app).head(videoUrl).set("Cookie", grant).expect("Accept-Ranges", "bytes").expect(200);
      rmSync(join(root, "photos", "movie.mp4"));
      writeFileSync(join(root, "photos", "fake.jpg"), "<svg/>");
      await request(app).get(`/api/public/photos/items/${item}/view?path=fake.jpg`).set("Cookie", grant).expect(404);
      rmSync(join(root, "photos", "fake.jpg"));
      await request(app).get(`/api/public/photos/items/${item}/preview?path=../preview.png`).set("Cookie", grant).expect(404);
      await request(app).get(`/api/public/photos/items/${item}/preview?path=one.txt`).set("Cookie", grant).expect("Content-Type", /image\/jpeg/).expect(200);
      await request(app).get(`/api/public/photos/items/${item}/preview?path=preview.png`).set("Cookie", grant).expect("Content-Type", /image\/jpeg/).expect(200);
      expect(db.prepare("SELECT count(*) AS count FROM events WHERE type='download_start'").get()).toEqual(beforeHead);
      rmSync(picture);
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
      expect(statistics.body.files).toEqual(expect.arrayContaining([expect.objectContaining({slug:'photos',title:'photos',file_path:'one.txt',count:2})]));
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
      const beforeDelete = db.prepare("SELECT count(*) AS count FROM events WHERE share_id=?").get(created.body.id);
      await request(app).delete(`/api/shares/${created.body.id}`).set("Origin",origin).set("Cookie",admin).expect(200);
      await request(app).patch(`/api/shares/${created.body.id}`).set("Origin",origin).set("Cookie",admin).send({active:true}).expect(404);
      await request(app).get("/api/public/photos").set("Cookie",grant).expect(404);
      expect((await request(app).get("/api/shares").set("Cookie",admin)).body.shares).toHaveLength(0);
      expect(db.prepare("SELECT count(*) AS count FROM events WHERE share_id=?").get(created.body.id)).toEqual(beforeDelete);
      await request(app).get("/api/settings/retention").expect(401);
      await request(app).put("/api/settings/retention").set("Origin",origin).set("Cookie",admin).send({analyticsDays:null,deletedShareDays:2,orphanUploadDays:3,previewDays:7}).expect(200);
      expect((await request(app).get("/api/settings/retention").set("Cookie",admin)).body.deletedShareDays).toBe(2);
      await request(app).put("/api/settings/retention").set("Origin",origin).set("Cookie",admin).send({analyticsDays:-1}).expect(400);
    } finally {
      db.close();
      rmSync(root, { recursive: true, force: true });
    }
  });
});
