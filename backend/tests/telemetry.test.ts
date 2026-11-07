import { it,expect,vi } from "vitest";
import { EventEmitter } from "node:events";
import { mkdtempSync,writeFileSync,openSync,readdirSync,rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import request from "supertest";
import { createApp } from "../src/app";
import { openDatabase } from "../src/database";
import { observeTransfer,diagnose } from "../src/transfer-observer";
import { campaignQuery,readCampaign,validateClientContext } from "../../shared/telemetry";
vi.mock("../src/storage",() => ({
  DirectoryLimitError:class extends Error {},
  openSourceFile:(root:string,path:string) => openSync(join(root,path),"r"),
  listSourceDirectory:(root:string,path:string) => readdirSync(join(root,path),{withFileTypes:true}).map(entry => ({name:entry.name,kind:entry.isDirectory() ? "directory" : "file"})),
  measureSourceItem:async () => ({fileCount:1,totalBytes:10}),
}));
const eofGate=vi.hoisted(() => ({hold:false,release:undefined as (()=>void)|undefined}));
vi.mock("node:fs",async importOriginal => {
  const fs=await importOriginal<typeof import("node:fs")>();
  return {...fs,createReadStream:(...args:Parameters<typeof fs.createReadStream>) => {
    const stream=fs.createReadStream(...args),push=stream.push.bind(stream);
    stream.push=(chunk: any,encoding?:BufferEncoding) => {
      if(chunk===null && eofGate.hold) {eofGate.release=()=>push(null);return false;}
      return push(chunk,encoding);
    };
    return stream;
  }};
});
const client={timeZone:"Europe/Berlin",utcOffsetMinutes:-60,touchPoints:5,colorScheme:"dark",view:"grid"};
const origin="http://localhost:5173",setupToken="0123456789abcdef0123456789abcdef";

it("records bounded transfer measurements and exactly one terminal outcome for completion, failure or disconnect",() => {
  for(const mode of ["completed","aborted","failed","range"] as const) {
    const req={method:"GET",get:(name:string) => name==="range" && mode==="range" ? "bytes=5-" : undefined} as any;
    const res=Object.assign(new EventEmitter(),{statusCode:mode==="range" ? 416 : 200,writableFinished:false});
    const events:{type:string;metrics:any;diagnostic:any}[]=[];
    const observer=observeTransfer(req,res as any,"download","txt",(type,metrics,diagnostic) => events.push({type,metrics,diagnostic}));
    observer.expected(10);observer.start();observer.meter.write(Buffer.from("12345"));
    if(mode==="failed") observer.fail("source_changed");
    if(mode==="completed") {res.writableFinished=true;res.emit("finish");} else res.emit("close");
    res.emit("close");
    const terminal=events.filter(event => event.metrics.outcome!=="started");
    expect(terminal).toHaveLength(1);
    expect(terminal[0].metrics).toMatchObject({bytes:5,expectedBytes:10,fileType:"txt"});
    expect(Number.isFinite(terminal[0].metrics.bytesPerSecond)).toBe(true);
    if(mode==="aborted") expect(terminal[0].diagnostic).toMatchObject({code:"client_disconnected"});
    if(mode==="failed") expect(terminal[0].diagnostic).toMatchObject({code:"source_changed"});
    if(mode==="range") expect(events.some(event => event.type==="resume_attempt")).toBe(true);
  }
  expect(diagnose("anything",404).code).toBe("unavailable");
  const log=vi.spyOn(console,"error").mockImplementation(() => {});
  try {
    const response=Object.assign(new EventEmitter(),{statusCode:200,writableFinished:true});
    const observed=observeTransfer({method:"GET",get:() => undefined} as any,response as any,"download","txt",() => {throw new Error("storage unavailable");});
    expect(() => response.emit("finish")).not.toThrow();
    expect(observed.meter.destroyed).toBe(true);
    expect(log).toHaveBeenCalledWith("ShareLyze: transfer analytics result could not be persisted.");
  } finally {log.mockRestore();}
});
it("allowlists campaign parameters and validates browser context without treating unsupported touch as no touch",() => {
  expect(readCampaign({utm_source:" invite ",utm_medium:"qr",secret:"not-stored",utm_content:["bad"]})).toEqual({utm_source:"invite",utm_medium:"qr"});
  expect(campaignQuery({utm_source:"a&b",secret:"never"})).toBe("?utm_source=a%26b");
  expect(validateClientContext({...client,touchPoints:null})).toMatchObject({touchPoints:null});
  for(const value of [{...client,timeZone:"not/a/zone"},{...client,utcOffsetMinutes:900},{...client,view:"other"},{...client,touchPoints:100}]) expect(() => validateClientContext(value)).toThrow();
});

it("binds client context and campaign to one short-lived share visit and measures range/download/preview errors",async () => {
  const root=mkdtempSync(join(tmpdir(),"sharelyze-telemetry-")),db=openDatabase(":memory:");
  const app=createApp({db,publicOrigin:origin,setupToken,secureCookies:false});
  try {
    writeFileSync(join(root,"file.txt"),"0123456789");writeFileSync(join(root,"broken.jpg"),"not an image");
    db.prepare("INSERT INTO sources(id,name,root) VALUES('src','src',?)").run(root);
    db.exec("INSERT INTO shares(id,title,created_at) VALUES('s','s','now'),('o','o','now'); INSERT INTO links(id,slug,share_id,created_at) VALUES('l','photo','s','now'),('other','other','o','now'); INSERT INTO share_items(id,share_id,source_id,relative_path,kind) VALUES('f','s','src','file.txt','file'),('b','s','src','broken.jpg','file');");
    const page=await request(app).get("/api/public/photo?utm_source=invitation&utm_medium=qr&utm_campaign=party&password=never-store").expect(200);
    const token=page.body.telemetry;
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const report=(body:object,slug="photo") => request(app).post("/api/public/"+slug+"/telemetry").set("Origin",origin).set("X-ShareLyze-Visit",token).send({client,...body});
    await report({kind:"context",campaign:{utm_source:"spoof"}}).expect(202);
    await report({kind:"view_change",client:{...client,view:"list"}}).expect(202);
    await report({kind:"navigation",timing:{durationMs:120,ttfbMs:30,domReadyMs:100,status:200}}).expect(202);
    await report({kind:"resource_error",resource:"preview",itemId:"b",path:"",message:"do not save raw errors"}).expect(202);
    await report({kind:"context"},"other").expect(403);
    await report({kind:"context",client:{...client,timeZone:"bad"}}).expect(400);
    await report({kind:"resource_error",resource:"preview",itemId:"not-in-share"}).expect(400);
    await request(app).post("/api/public/photo/telemetry").set("Origin","https://evil.example").set("X-ShareLyze-Visit",token).send({client,kind:"context"}).expect(403);
    await request(app).get("/api/public/photo/items/f/download?visit="+token).set("Range","bytes=2-4").expect(206).expect(res => expect(res.body.toString()).toBe("234"));
    const rows=db.prepare("SELECT type,details_json FROM events").all() as any[];
    const complete=JSON.parse(rows.find(row => row.type==="transfer_finished").details_json);
    expect(complete).toMatchObject({client:{view:"list",touchPoints:5,timeZone:"Europe/Berlin"},campaign:{utm_source:"invitation",utm_medium:"qr"},transfer:{bytes:3,expectedBytes:3,outcome:"completed",rangeAccepted:true,resumeAttempt:true,fileType:"txt"}});
    expect(complete.transfer.durationMs).toBeGreaterThanOrEqual(0);
    expect(rows.some(row => row.type==="resume_attempt")).toBe(true);
    const initial=JSON.parse(rows.find(row => row.type==="view").details_json);
    expect(initial.client.view).toBe("grid");
    await request(app).get("/api/public/photo/items/f/download?visit="+token).set("Range","bytes=100-").expect(416);
    await request(app).get("/api/public/photo/items/f/download?visit="+token).set("Range","bytes=2-").set("If-Range",'"old"').expect(200);
    const retry=db.prepare("SELECT details_json FROM events WHERE type='transfer_finished' ORDER BY id DESC LIMIT 1").get() as any;
    expect(JSON.parse(retry.details_json).transfer).toMatchObject({rangeAccepted:false,rangeFallback:"if_range_mismatch_or_unsupported",bytes:10});
    expect(JSON.parse(retry.details_json).transfer.retryOf).toBeTruthy();
    expect(db.prepare("SELECT count(*) AS n FROM events WHERE type='retry_attempt'").get()).toEqual({n:1});
    await request(app).get("/api/public/photo/items/b/preview?visit="+token).expect(404);
    await request(app).get("/api/public/photo/items/unknown/download").expect(404);
    const failures=db.prepare("SELECT type,details_json FROM events WHERE type IN ('download_error','preview_error')").all() as any[];
    expect(failures.some(row => JSON.parse(row.details_json).diagnostic.code==="invalid_range")).toBe(true);
    expect(failures.some(row => JSON.parse(row.details_json).diagnostic.code==="render_failed")).toBe(true);
    expect(JSON.stringify(db.prepare("SELECT * FROM events").all())).not.toContain(token);
    expect(JSON.stringify(db.prepare("SELECT * FROM events").all())).not.toContain("never-store");
    expect(JSON.stringify(db.prepare("SELECT * FROM events").all())).not.toContain("do not save raw errors");
    const setup=await request(app).post("/api/auth/setup").set("Origin",origin).send({username:"admin",password:"correct horse battery staple",setupToken}).expect(201),cookie=setup.headers["set-cookie"][0] as string;
    const overview=await request(app).get("/api/analytics/report?source=invitation&medium=qr").set("Cookie",cookie).expect(200);
    expect(overview.body.campaigns[0]).toMatchObject({source:"invitation",medium:"qr",views:1,downloads:2,completed:2});
    expect(overview.body.context.viewChanges).toEqual([{label:"list",count:1}]);
    expect(overview.body.context.initialViews).toEqual([{label:"grid",count:1}]);
    expect(overview.body.context.regions[0]).toMatchObject({timeZone:"Europe/Berlin"});
    expect(overview.body.transfers.some((value:any) => value.kind==="download" && value.bytes>=3)).toBe(true);
    expect(overview.body.quality.some((value:any) => value.origin==="browser" && value.durationMs===120)).toBe(true);
    expect(overview.body.visitHeatmap.reduce((total:number,row:any) => total+row.count,0)).toBe(1);
    db.prepare("UPDATE public_visits SET reports=200").run();await report({kind:"context"}).expect(429);
    db.prepare("UPDATE public_visits SET expires_at='2000-01-01'").run();await report({kind:"context"}).expect(403);
  } finally {db.close();rmSync(root,{recursive:true,force:true});}
});

it("generates local campaign QR PNGs and preserves campaign across share/password redirects",async () => {
  const db=openDatabase(":memory:"),app=createApp({db,publicOrigin:origin,setupToken,secureCookies:false});
  try {
    const setup=await request(app).post("/api/auth/setup").set("Origin",origin).send({username:"admin",password:"correct horse battery staple",setupToken}).expect(201),cookie=setup.headers["set-cookie"][0] as string;
    db.exec("INSERT INTO shares(id,title,created_at) VALUES('s','s','now'); INSERT INTO links(id,slug,share_id,created_at) VALUES('l','photo','s','now')");
    await request(app).post("/api/analytics/campaign-link").set("Origin",origin).send({slug:"photo"}).expect(401);
    const result=await request(app).post("/api/analytics/campaign-link").set("Origin",origin).set("Cookie",cookie).send({slug:"photo",utm_source:"card",utm_medium:"qr",utm_campaign:"birthday"}).expect(200);
    const url=new URL(result.body.url);
    expect(url.origin).toBe(origin);expect(url.searchParams.get("utm_medium")).toBe("qr");
    const png=Buffer.from(result.body.qrDataUrl.split(",")[1],"base64");
    expect(png.subarray(0,8).toString("hex")).toBe("89504e470d0a1a0a");
    await request(app).get(url.pathname+url.search+"&password=secret").expect(302).expect("Location","/share/photo?utm_source=card&utm_medium=qr&utm_campaign=birthday");
    const protectedLink=await request(app).post("/api/links").set("Origin",origin).set("Cookie",cookie).send({slug:"private-link",url:"https://example.org/target",password:"x"}).expect(201);
    expect(protectedLink.body.slug).toBe("private-link");
    const prompt=await request(app).get("/private-link?utm_source=card&utm_medium=qr").expect(200);
    expect(prompt.text).toContain("/api/link-access/private-link?utm_source=card&amp;utm_medium=qr");
    await request(app).post("/api/link-access/private-link?utm_source=card&utm_medium=qr").set("Origin",origin).type("form").send({password:"x"}).expect(302);
    const redirect=db.prepare("SELECT details_json FROM events WHERE type='redirect'").get() as any;
    expect(JSON.parse(redirect.details_json).campaign).toEqual({utm_source:"card",utm_medium:"qr"});
  } finally {db.close();}
});

// Expose the CI race deterministically: all bytes have been read, but EOF is held.
it("does not expose a complete HTTP body before final source verification",async()=>{
  const root=mkdtempSync(join(tmpdir(),"sharelyze-eof-")),db=openDatabase(":memory:");
  const app=createApp({db,publicOrigin:origin,setupToken,secureCookies:false});
  let pending:Promise<unknown>|undefined;
  try {
    writeFileSync(join(root,"file.txt"),"0123456789");
    db.prepare("INSERT INTO sources(id,name,root) VALUES('src','src',?)").run(root);
    db.exec("INSERT INTO shares(id,title,created_at) VALUES('s','s','now'); INSERT INTO links(id,slug,share_id,created_at) VALUES('l','photo','s','now'); INSERT INTO share_items(id,share_id,source_id,relative_path,kind) VALUES('f','s','src','file.txt','file')");
    eofGate.hold=true;let settled=false;
    pending=request(app).get("/api/public/photo/items/f/download").expect(200).then(response=>{settled=true;expect(response.body.toString()).toBe("0123456789");});
    await vi.waitFor(()=>expect(eofGate.release).toBeTypeOf("function"));
    // Give a Content-Length client time to consume a prematurely exposed body.
    await new Promise(resolve=>setTimeout(resolve,30));
    expect(settled).toBe(false);
    expect(db.prepare("SELECT count(*) AS n FROM events WHERE type='transfer_finished'").get()).toEqual({n:0});
    eofGate.hold=false;eofGate.release!();await pending;
    await vi.waitFor(()=>expect(db.prepare("SELECT count(*) AS n FROM events WHERE type='transfer_finished'").get()).toEqual({n:1}));
  } finally {
    eofGate.hold=false;eofGate.release?.();eofGate.release=undefined;
    await pending?.catch(()=>{});db.close();rmSync(root,{recursive:true,force:true});
  }
});
