import { it, expect } from "vitest";
import request from "supertest";
import { openDatabase } from "../src/database";
import { createApp } from "../src/app";

it("enforces expiry and password on both redirect paths without revealing the target", async () => {
 const db = openDatabase(":memory:");
 const origin = "http://localhost:5173";
 const setupToken = "0123456789abcdef0123456789abcdef";
 const app = createApp({db, publicOrigin:origin, setupToken, secureCookies:false});
 try {
 const setup = await request(app).post("/api/auth/setup").set("Origin",origin).send({username:"admin",password:"correct horse battery staple",setupToken}).expect(201);
 const cookie = setup.headers["set-cookie"][0] as string;
 const create = (body: object) => request(app).post("/api/links").set("Origin",origin).set("Cookie",cookie).send(body);
 await create({url:"https://example.org/secret",password:42}).expect(400);
 await create({url:"https://example.org/secret",expiresAt:"invalid"}).expect(400);
 await create({url:"https://example.org/secret",expiresAt:"2000-01-01"}).expect(400);
 const made = await create({slug:"protected",url:"https://example.org/secret",password:"x",expiresAt:new Date(Date.now()+3600000).toISOString()}).expect(201);
 for (const path of ["/protected","/r/protected"]) {
 const response = await request(app).get(path).expect(200);
 expect(response.text).toContain("Passwort eingeben"); expect(response.text).not.toContain("https://example.org/secret"); expect(response.headers.location).toBeUndefined();
 }
 expect(db.prepare("SELECT count(*) AS n FROM events WHERE type='redirect'").get()).toEqual({n:0});
 await request(app).post("/api/link-access/protected").set("Origin","https://evil.test").type("form").send({password:"x"}).expect(403);
 await request(app).post("/api/link-access/protected").set("Origin",origin).type("form").send({password:"wrong"}).expect(401);
 await request(app).post("/api/link-access/protected").set("Origin",origin).type("form").send({password:"x"}).expect(302).expect("Location","https://example.org/secret");
 const listing = await request(app).get("/api/links").set("Cookie",cookie).expect(200);
 expect(listing.body.links[0].has_password).toBe(1); expect(JSON.stringify(listing.body)).not.toContain("password_hash");
 db.prepare("UPDATE links SET expires_at='2000-01-01T00:00:00.000Z'").run();
 for (const path of ["/protected","/r/protected"]) await request(app).get(path).expect(404);
 await request(app).post("/api/link-access/protected").set("Origin",origin).type("form").send({password:"x"}).expect(404);
 await request(app).patch(`/api/links/${made.body.id}`).set("Cookie",cookie).set("Origin",origin).send({expiresAt:null,password:""}).expect(200);
 for (const path of ["/protected","/r/protected"]) await request(app).get(path).expect(302).expect("Location","https://example.org/secret");
 await request(app).patch(`/api/links/${made.body.id}`).set("Cookie",cookie).set("Origin",origin).send({password:"y"}).expect(200);
 await request(app).post("/api/link-access/protected").set("Origin",origin).type("form").send({password:"y"}).expect(302);
 await request(app).patch(`/api/links/${made.body.id}`).set("Cookie",cookie).set("Origin",origin).send({active:false}).expect(400);
 for (const path of ["/protected","/r/protected"]) await request(app).get(path).expect(200);
 } finally {db.close();}
});

it("retrieves encrypted passwords only through the admin endpoint and handles legacy/reset cases", async () => {
 const db=openDatabase(":memory:"), passwordKey=Buffer.alloc(32,7);
 const origin="http://localhost:5173", setupToken="0123456789abcdef0123456789abcdef";
 const options={db,publicOrigin:origin,setupToken,secureCookies:false,passwordKey};
 const app=createApp(options);
 try {
 const setup=await request(app).post("/api/auth/setup").set("Origin",origin).send({username:"admin",password:"correct horse battery staple",setupToken}).expect(201);
 const cookie=setup.headers["set-cookie"][0] as string;
 const created=await request(app).post("/api/links").set("Origin",origin).set("Cookie",cookie).send({url:"https://example.org",password:"copy me"}).expect(201);
 const path=`/api/links/${created.body.id}/password`;
 await request(app).post(path).set("Origin",origin).send({}).expect(401);
 await request(app).post(path).set("Origin","https://evil.test").set("Cookie",cookie).send({}).expect(403);
 await request(app).post(path).set("Origin",origin).set("Cookie",cookie).send({}).expect(200).expect("Cache-Control","no-store").expect(({body})=>expect(body.password).toBe("copy me"));
 await request(createApp(options)).post(path).set("Origin",origin).set("Cookie",cookie).send({}).expect(200);
 const listing=await request(app).get("/api/links").set("Cookie",cookie).expect(200);
 expect(listing.body.links[0].has_copyable_password).toBe(1);
 expect(JSON.stringify(listing.body)).not.toContain("copy me");expect(JSON.stringify(listing.body)).not.toContain("password_encrypted");
 const encrypted=(db.prepare("SELECT password_encrypted FROM links WHERE id=?").get(created.body.id) as {password_encrypted:string}).password_encrypted;
 expect(encrypted).not.toContain("copy me");
 db.prepare("UPDATE links SET password_encrypted=NULL").run();
 await request(app).post(path).set("Origin",origin).set("Cookie",cookie).send({}).expect(409);
 await request(app).patch(`/api/links/${created.body.id}`).set("Origin",origin).set("Cookie",cookie).send({password:"new"}).expect(200);
 await request(app).post(path).set("Origin",origin).set("Cookie",cookie).send({}).expect(200).expect(({body})=>expect(body.password).toBe("new"));
 await request(app).patch(`/api/links/${created.body.id}`).set("Origin",origin).set("Cookie",cookie).send({password:""}).expect(200);
 await request(app).post(path).set("Origin",origin).set("Cookie",cookie).send({}).expect(404);
 expect(db.prepare("SELECT password_encrypted FROM links WHERE id=?").get(created.body.id)).toEqual({password_encrypted:null});
 } finally {db.close();}
});
