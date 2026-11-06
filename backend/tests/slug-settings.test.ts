import { it, expect } from "vitest";
import request from "supertest";
import { openDatabase } from "../src/database";
import { createApp } from "../src/app";
import { defaultSlugSettings, suggestSlug, validateSlugSettings } from "../src/slug-settings";

it("validates generation settings and rejects reserved names regardless of case", () => {
 for (const input of [{...defaultSlugSettings,length:0},{...defaultSlugSettings,length:65},{...defaultSlugSettings,alphabet:"symbols"},{...defaultSlugSettings,caseSensitive:1}]) expect(() => validateSlugSettings(input)).toThrow();
});
it("persists defaults, generates usable suggestions and preserves per-link case rules", async () => {
 const db = openDatabase(":memory:");
 const origin="http://localhost:5173", setupToken="0123456789abcdef0123456789abcdef";
 const options={db,publicOrigin:origin,setupToken,secureCookies:false};
 const app=createApp(options);
 try {
 await request(app).get("/api/settings/slugs").expect(401);
 const setup=await request(app).post("/api/auth/setup").set("Origin",origin).send({username:"admin",password:"correct horse battery staple",setupToken}).expect(201);
 const cookie=setup.headers["set-cookie"][0] as string;
 await request(app).get("/api/settings/slugs").set("Cookie",cookie).expect(200).expect(({body}) => expect(body).toEqual({length:6,alphabet:"alphanumeric",letterCase:"upper",caseSensitive:false,avoidAmbiguous:true}));
 expect(suggestSlug(db)).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
 const create=(body:object)=>request(app).post("/api/links").set("Cookie",cookie).set("Origin",origin).send(body);
 await create({url:"https://example.org",slug:"Legacy"}).expect(201);
 const settings={...defaultSlugSettings,length:7,alphabet:"letters",letterCase:"upper",avoidAmbiguous:true,caseSensitive:true};
 await request(app).put("/api/settings/slugs").set("Cookie",cookie).set("Origin","http://evil.test").send(settings).expect(403);
 await request(app).put("/api/settings/slugs").set("Cookie",cookie).set("Origin",origin).send({...settings,length:2}).expect(400);
 await request(app).put("/api/settings/slugs").set("Cookie",cookie).set("Origin",origin).send(settings).expect(200);
 await request(createApp(options)).get("/api/settings/slugs").set("Cookie",cookie).expect(200).expect(({body})=>expect(body).toEqual(settings));
 const proposal=await request(app).post("/api/slugs/suggest").set("Cookie",cookie).set("Origin",origin).send({}).expect(200);
 expect(proposal.body.slug).toMatch(/^[A-HJ-NP-Z]{7}$/);
 for(let i=0;i<50;i++) expect(suggestSlug(db)).toMatch(/^[A-HJ-NP-Z]{7}$/);
 await create({url:"https://example.org",slug:"API"}).expect(400);
 await create({url:"https://example.org",slug:"legacy"}).expect(409);
 await create({url:"https://example.org",slug:proposal.body.slug}).expect(201);
 const auto=await create({url:"https://example.org"}).expect(201); expect(auto.body.slug).toMatch(/^[A-HJ-NP-Z]{7}$/);
 for(const prefix of ["/","/r/"]) {
   await request(app).get(`${prefix}${proposal.body.slug}`).expect(302);
   await request(app).get(`${prefix}${proposal.body.slug.toLowerCase()}`).expect(404);
   await request(app).get(`${prefix}LEGACY`).expect(302);
 }
 await request(app).put("/api/settings/slugs").set("Cookie",cookie).set("Origin",origin).send(defaultSlugSettings).expect(200);
 await request(app).get(`/${proposal.body.slug.toLowerCase()}`).expect(404);
 } finally {db.close();}
});

it("generates the configured character sets and lengths", () => {
 const db=openDatabase(":memory:");
 try {
 for(const alphabet of ["letters","alphanumeric"] as const) for(const letterCase of ["lower","upper","mixed"] as const) {
   const settings={...defaultSlugSettings,length:12,alphabet,letterCase};
   db.prepare("INSERT OR REPLACE INTO settings(key,value) VALUES('slug_defaults',?)").run(JSON.stringify(settings));
   for(let n=0;n<20;n++) {
     const value=suggestSlug(db); expect(value).toHaveLength(12);
     expect(value).toMatch(alphabet==="letters" ? /^[a-z]+$/i : /^[a-z0-9]+$/i);
     if(letterCase==="lower") expect(value).toBe(value.toLowerCase());
     if(letterCase==="upper") expect(value).toBe(value.toUpperCase());
   }
 }
 } finally {db.close();}
});

it("deletes only authenticated external links while retaining their events", async () => {
 const db=openDatabase(":memory:"), origin="http://localhost:5173", setupToken="0123456789abcdef0123456789abcdef";
 const app=createApp({db,publicOrigin:origin,setupToken,secureCookies:false});
 try {
 const setup=await request(app).post("/api/auth/setup").set("Origin",origin).send({username:"admin",password:"correct horse battery staple",setupToken}).expect(201);
 const cookie=setup.headers["set-cookie"][0] as string;
 const made=await request(app).post("/api/links").set("Origin",origin).set("Cookie",cookie).send({slug:"delete-test",url:"https://example.org"}).expect(201);
 await request(app).get("/delete-test").expect(302);
 const path=`/api/links/${made.body.id}`;
 await request(app).delete(path).set("Origin",origin).expect(401);
 await request(app).delete(path).set("Cookie",cookie).set("Origin","http://evil.test").expect(403);
 await request(app).delete(path).set("Cookie",cookie).set("Origin",origin).expect(204);
 await request(app).get("/delete-test").expect(404);
 await request(app).get("/r/delete-test").expect(404);
 expect(db.prepare("SELECT count(*) AS n FROM events").get()).toEqual({n:1});
 await request(app).delete(path).set("Cookie",cookie).set("Origin",origin).expect(404);
 db.prepare("INSERT INTO shares(id,title,created_at) VALUES('s','s','now')").run();
 db.prepare("INSERT INTO links(id,slug,share_id,created_at) VALUES('share','share-test','s','now')").run();
 await request(app).delete("/api/links/share").set("Cookie",cookie).set("Origin",origin).expect(404);
 expect(db.prepare("SELECT id FROM shares WHERE id='s'").get()).toBeTruthy();
 } finally {db.close();}
});
