import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync, readFileSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { openDatabase } from "../src/database";
import { createApp } from "../src/app";

const origin = "http://localhost:5173";
describe("upload storage", () => {
  it("requires authentication and origin and validates upload paths", async () => {
    const root = mkdtempSync(join(tmpdir(), "sharelyze-upload-"));
    const db = openDatabase(":memory:");
    const app = createApp({ db, publicOrigin: origin, setupToken: "0123456789abcdef0123456789abcdef", secureCookies: false, uploadRoot: root });
    try {
      await request(app).post("/api/uploads").set("Origin", origin).send({}).expect(401);
      const setup = await request(app).post("/api/auth/setup").set("Origin", origin).send({ username: "admin", password: "correct horse battery staple", setupToken: "0123456789abcdef0123456789abcdef" }).expect(201);
      const cookie = setup.headers["set-cookie"][0] as string;
      await request(app).post("/api/uploads").set("Cookie", cookie).set("Origin", "http://evil.example").send({}).expect(403);
      if (process.platform !== "linux") {
        await request(app).post("/api/uploads").set("Cookie", cookie).set("Origin", origin).send({}).expect(501);
        return;
      }
      const batch = await request(app).post("/api/uploads").set("Cookie", cookie).set("Origin", origin).send({}).expect(201);
      const id = batch.body.id as string;
      await request(app).put(`/api/uploads/${id}?path=${encodeURIComponent("../escape")}`).set("Cookie", cookie).set("Origin", origin).set("Content-Type", "application/octet-stream").send(Buffer.from("bad")).expect(400);
      if (process.platform === "linux") {
        await request(app).put(`/api/uploads/${id}?path=${encodeURIComponent("folder/test.txt")}`).set("Cookie", cookie).set("Origin", origin).set("Content-Type", "application/octet-stream").send(Buffer.from("hello")).expect(201);
        expect(readFileSync(join(root, id, "folder", "test.txt"), "utf8")).toBe("hello");
        symlinkSync(tmpdir(), join(root, id, "escape"));
        await request(app).put(`/api/uploads/${id}?path=${encodeURIComponent("escape/test.txt")}`).set("Cookie", cookie).set("Origin", origin).set("Content-Type", "application/octet-stream").send(Buffer.from("bad")).expect(400);
        db.prepare("INSERT INTO sources(id,name,root,active) VALUES(?,?,?,1)").run("sharelyze-uploads", "Uploads", root);
        await request(app).post("/api/shares").set("Cookie", cookie).set("Origin", origin).send({ slug: "uploaded-test", items: [{ sourceId: "sharelyze-uploads", path: `${id}/folder/test.txt`, kind: "file" }] }).expect(201);
        await request(app).get("/api/public/uploaded-test").expect(200);
        await request(app).put(`/api/uploads/${id}?path=${encodeURIComponent("folder/test.txt")}`).set("Cookie", cookie).set("Origin", origin).set("Content-Type", "application/octet-stream").send(Buffer.from("again")).expect(409);
      }
    } finally { db.close(); rmSync(root, { recursive: true, force: true }); }
  });
});

it.skipIf(process.platform !== "linux")("applies slug defaults and case rules to real file shares", async () => {
 const root=mkdtempSync(join(tmpdir(),"sharelyze-slug-"));
 const db=openDatabase(":memory:");
 const setupToken="0123456789abcdef0123456789abcdef";
 const app=createApp({db,publicOrigin:origin,setupToken,secureCookies:false,uploadRoot:root});
 try {
 const setup=await request(app).post("/api/auth/setup").set("Origin",origin).send({username:"admin",password:"correct horse battery staple",setupToken}).expect(201);
 const cookie=setup.headers["set-cookie"][0] as string;
 const batch=await request(app).post("/api/uploads").set("Cookie",cookie).set("Origin",origin).send({}).expect(201);
 await request(app).put(`/api/uploads/${batch.body.id}?path=test.txt`).set("Cookie",cookie).set("Origin",origin).set("Content-Type","application/octet-stream").send(Buffer.from("hello")).expect(201);
 db.prepare("INSERT INTO sources(id,name,root,active) VALUES('upload','Uploads',?,1)").run(root);
 await request(app).put("/api/settings/slugs").set("Cookie",cookie).set("Origin",origin).send({length:6,alphabet:"letters",letterCase:"upper",caseSensitive:true,avoidAmbiguous:false}).expect(200);
 const created=await request(app).post("/api/shares").set("Cookie",cookie).set("Origin",origin).send({items:[{sourceId:"upload",path:`${batch.body.id}/test.txt`,kind:"file"}]}).expect(201);
 const slug=created.body.slug as string;expect(slug).toMatch(/^[A-Z]{6}$/);
 await request(app).get(`/${slug}`).expect(302);
 await request(app).get(`/api/public/${slug}`).expect(200);
 await request(app).get(`/${slug.toLowerCase()}`).expect(404);
 await request(app).get(`/api/public/${slug.toLowerCase()}`).expect(404);
 } finally {db.close();rmSync(root,{recursive:true,force:true});}
});
