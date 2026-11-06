import { it, expect } from "vitest";
import request from "supertest";
import { defaultUploadPatterns, isUploadIgnored, validateUploadSettings } from "../../shared/upload-filter";
import { getUploadSettings } from "../src/upload-settings";
import { createApp } from "../src/app";
import { openDatabase } from "../src/database";
import { mkdtempSync, rmSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

it("skips metadata at all folder levels and allows ordinary hidden files", () => {
  const settings={enabled:true,patterns:[...defaultUploadPatterns]};
  for (const path of [".DS_Store","Fotos/.ds_store","Fotos/._photo.jpg","Fotos/._\nphoto","__MACOSX/Fotos/photo.jpg",".Trashes/sub/file","Fotos/Thumbs.db","desktop.ini"]) expect(isUploadIgnored(path,settings),path).toBe(true);
  for (const path of ["Fotos/photo.jpg",".env",".gitignore","my.DS_Store.jpg"]) {
    expect(isUploadIgnored(path,settings),path).toBe(false);
  }
  expect(isUploadIgnored(".DS_Store",{...settings,enabled:false})).toBe(false);
  expect(isUploadIgnored(".DS_Store",{...settings,patterns:[]})).toBe(false);
  expect(isUploadIgnored("a.TMP",{enabled:true,patterns:["*.tmp"]})).toBe(true);
  expect(isUploadIgnored("a🙂b",{enabled:true,patterns:["a?b"]})).toBe(true);
  expect(isUploadIgnored("[draft].txt",{enabled:true,patterns:["[draft].txt"]})).toBe(true);
  expect(isUploadIgnored("draft.txt",{enabled:true,patterns:["[draft].txt"]})).toBe(false);
});

it("validates and normalizes filename globs without accepting paths or unbounded settings", () => {
  expect(validateUploadSettings({enabled:true,patterns:[" .DS_Store ",".DS_Store"]})).toEqual({enabled:true,patterns:[".DS_Store"]});
  for (const input of [null,{}, {enabled:"true",patterns:[]}, {enabled:true,patterns:["../secret"]},{enabled:true,patterns:["a\\b"]},{enabled:true,patterns:["\nfile"]},{enabled:true,patterns:[""]},{enabled:true,patterns:[".."]},{enabled:true,patterns:["a".repeat(129)]},{enabled:true,patterns:Array(101).fill("x")}]) expect(() => validateUploadSettings(input)).toThrow();
});

const origin="http://localhost:5173", setupToken="0123456789abcdef0123456789abcdef";
it("protects and persists upload settings and supplies enabled defaults for existing databases", async () => {
  const root=mkdtempSync(join(tmpdir(),"sharelyze-upload-settings-")), filename=join(root,"db");
  let db=openDatabase(filename);
  try {
    const app=createApp({db,publicOrigin:origin,setupToken,secureCookies:false});
    await request(app).get("/api/settings/uploads").expect(401);
    await request(app).put("/api/settings/uploads").set("Origin",origin).send({enabled:false,patterns:[]}).expect(401);
    const setup=await request(app).post("/api/auth/setup").set("Origin",origin).send({username:"admin",password:"correct horse battery staple",setupToken}).expect(201);
    const cookie=setup.headers["set-cookie"][0] as string;
    expect((await request(app).get("/api/settings/uploads").set("Cookie",cookie)).body).toEqual({enabled:true,patterns:defaultUploadPatterns});
    await request(app).put("/api/settings/uploads").set("Cookie",cookie).set("Origin","https://evil.example").send({enabled:false,patterns:[]}).expect(403);
    await request(app).put("/api/settings/uploads").set("Cookie",cookie).set("Origin",origin).send({enabled:true,patterns:["folder/file"]}).expect(400);
    await request(app).put("/api/settings/uploads").set("Cookie",cookie).set("Origin",origin).send({enabled:false,patterns:["*.tmp"]}).expect(200);
    db.close(); db=openDatabase(filename);
    expect(getUploadSettings(db)).toEqual({enabled:false,patterns:["*.tmp"]});
  } finally {db.close();rmSync(root,{recursive:true,force:true});}
});

it.skipIf(process.platform !== "linux")("enforces filters server-side before writing or creating parent directories; disabling allows metadata", async () => {
  const root=mkdtempSync(join(tmpdir(),"sharelyze-upload-filter-")), db=openDatabase(":memory:");
  try {
    const app=createApp({db,publicOrigin:origin,setupToken,secureCookies:false,uploadRoot:root});
    const setup=await request(app).post("/api/auth/setup").set("Origin",origin).send({username:"admin",password:"correct horse battery staple",setupToken}).expect(201);
    const cookie=setup.headers["set-cookie"][0] as string;
    const batch=await request(app).post("/api/uploads").set("Cookie",cookie).set("Origin",origin).send({}).expect(201);
    const put=(path:string) => request(app).put(`/api/uploads/${batch.body.id}?path=${encodeURIComponent(path)}`).set("Cookie",cookie).set("Origin",origin).set("Content-Type","application/octet-stream").send(Buffer.from("test"));
    for(const path of [".DS_Store","Photos/._photo.jpg","__MACOSX/nested/photo.jpg"]) expect((await put(path).expect(200)).body).toEqual({skipped:true,reason:"ignored"});
    expect(readdirSync(join(root,batch.body.id))).toEqual([]);
    await put("photo.jpg").expect(201);
    expect(existsSync(join(root,batch.body.id,"photo.jpg"))).toBe(true);
    await request(app).put("/api/settings/uploads").set("Cookie",cookie).set("Origin",origin).send({enabled:false,patterns:defaultUploadPatterns}).expect(200);
    await put(".DS_Store").expect(201);
    expect(existsSync(join(root,batch.body.id,".DS_Store"))).toBe(true);
    await request(app).put("/api/settings/uploads").set("Cookie",cookie).set("Origin",origin).send({enabled:true,patterns:["*.tmp"]}).expect(200);
    await put("sub/Test.TMP").expect(200);
    expect(existsSync(join(root,batch.body.id,"sub"))).toBe(false);
  } finally {db.close();rmSync(root,{recursive:true,force:true});}
});
