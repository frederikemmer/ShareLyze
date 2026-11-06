import { it,expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { openDatabase } from "../src/database";
import { GeoIpService, normalizeIp } from "../src/geoip";

const ua="Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const origin="http://localhost:5173",setupToken="0123456789abcdef0123456789abcdef";
const city={country:{iso_code:"DE",names:{en:"Germany",de:"Deutschland"}},city:{names:{en:"Munich",de:"München"}},subdivisions:[{names:{en:"Bavaria",de:"Bayern"}}],location:{latitude:48.1,longitude:11.5}};
function fakeGeo() {
  const geo=new GeoIpService();
  (geo as any).city={get:() => city};
  (geo as any).asn={get:() => ({autonomous_system_number:123,autonomous_system_organization:"Example Network"})};
  geo.state.cityDate="2026-11-01T00:00:00.000Z";
  return geo;
}
it("normalizes IPv4-mapped IPv6 and skips private/reserved ranges for geolocation",() => {
  expect(normalizeIp("::ffff:8.8.8.8")).toEqual({address:"8.8.8.8",family:4,scope:"unicast"});
  for(const ip of ["127.0.0.1","::1","192.168.1.1","10.1.2.3","169.254.1.1","fc00::1","100.64.0.1","224.0.0.1"]) expect(fakeGeo().lookup(ip).status,ip).toBe("non_public_ip");
  expect(normalizeIp("garbage").address).toBeNull();
  expect(fakeGeo().lookup("8.8.8.8")).toMatchObject({status:"found",city:"München",country:"Deutschland",asn:123,organization:"Example Network",latitude:48.1});
});

it("records a consistent visitor snapshot on redirects, respects trust proxy, and omits sensitive header/query data",async () => {
  const db=openDatabase(":memory:");
  const app=createApp({db,publicOrigin:origin,setupToken,secureCookies:false,geoIp:fakeGeo(),trustedProxies:["loopback"]});
  try {
    db.prepare("INSERT INTO links(id,slug,target_url,created_at) VALUES('l','sample','https://example.org','now')").run();
    await request(app).get("/sample?token=never-store-this").set("X-Forwarded-For","8.8.8.8").set("User-Agent",ua).set("Accept-Language","de-DE,de;q=0.9").set("Referer","https://source.example/path?secret=never-store-this").set("Cookie","secret=never-store-this").set("Authorization","Bearer never-store-this").set("Sec-CH-UA-Platform",'"Android"').set("Sec-CH-UA-Model",'"Pixel 7"').set("Sec-CH-UA-Mobile","?1").expect(302).expect("Accept-CH",/sec-ch-ua-model/);
    const row=db.prepare("SELECT * FROM events").get() as any, detail=JSON.parse(row.details_json);
    expect(row).toMatchObject({type:"redirect",ip_address:"8.8.8.8",referrer_origin:"https://source.example"});
    expect(detail.agent).toMatchObject({browser:"Mobile Chrome",os:"Android",model:"Pixel 7",device:"mobile"});
    expect(detail.request).toMatchObject({path:"/sample",language:"de-DE,de;q=0.9"});
    expect(detail.geo).toMatchObject({city:"München",asn:123});
    expect(JSON.stringify(row)).not.toContain("never-store-this");
    const untrusted=createApp({db,publicOrigin:origin,setupToken,secureCookies:false,geoIp:fakeGeo()});
    await request(untrusted).get("/sample").set("X-Forwarded-For","8.8.8.8").expect(302);
    const last=db.prepare("SELECT * FROM events ORDER BY id DESC LIMIT 1").get() as any;
    expect(last.ip_address).not.toBe("8.8.8.8");
    expect(JSON.parse(last.details_json).geo.status).toBe("non_public_ip");
  } finally {db.close();}
});

it("filters full history before aggregation/pagination, distinguishes bot traffic and exports only authorized filtered events",async () => {
  const db=openDatabase(":memory:");
  const app=createApp({db,publicOrigin:origin,setupToken,secureCookies:false,geoIp:fakeGeo(),trustedProxies:["loopback"]});
  try {
    const setup=await request(app).post("/api/auth/setup").set("Origin",origin).send({username:"admin",password:"correct horse battery staple",setupToken}).expect(201);
    const cookie=setup.headers["set-cookie"][0] as string;
    db.exec("INSERT INTO links(id,slug,target_url,created_at) VALUES('l','sample','https://example.org','now'),('o','other','https://example.org','now')");
    await request(app).get("/sample").set("User-Agent",ua).set("X-Forwarded-For","8.8.8.8").expect(302);
    const original=db.prepare("SELECT * FROM events").get() as any;
    db.exec("DELETE FROM events");
    const insert=db.prepare("INSERT INTO events(link_id,type,created_at,ip_address,user_agent,details_json) VALUES(?,?,?,?,?,?)");
    for(let i=0;i<225;i++) insert.run("o","redirect","2026-10-01T12:00:00.000Z","8.8.4.4",ua,original.details_json);
    for(let i=0;i<55;i++) insert.run("l","redirect","2026-11-01T12:00:00.000Z","8.8.8.8",ua,original.details_json);
    await request(app).get("/sample").set("User-Agent","Googlebot/2.1 (+http://www.google.com/bot.html)").expect(302);
    const bot=db.prepare("SELECT details_json FROM events ORDER BY id DESC LIMIT 1").get() as any;
    expect(JSON.parse(bot.details_json).agent.bot).toBe(true);
    db.prepare("UPDATE events SET created_at='2026-11-02T12:00:00.000Z' WHERE id=(SELECT max(id) FROM events)").run();
    insert.run("l","redirect","2026-11-01T11:00:00.000Z",null,null,null);
    await request(app).get("/api/analytics/events").expect(401);
    await request(app).get("/api/analytics/report").expect(401);
    await request(app).get("/api/analytics/export").expect(401);
    await request(app).get("/api/geoip").expect(401);
    await request(app).post("/api/geoip/update").set("Origin",origin).send({}).expect(401);
    const filter="slug=sample&from=2026-11-01&to=2026-11-01&traffic=human";
    const report=await request(app).get("/api/analytics/report?"+filter).set("Cookie",cookie).expect(200);
    expect(report.body.total).toBe(55);
    expect(report.body.dimensions.countries).toEqual([{label:"Deutschland",count:55}]);
    const first=await request(app).get("/api/analytics/events?"+filter).set("Cookie",cookie).expect(200);
    expect(first.body.events).toHaveLength(50);
    const second=await request(app).get("/api/analytics/events?"+filter+"&cursor="+first.body.nextCursor).set("Cookie",cookie).expect(200);
    expect(second.body.events).toHaveLength(5);expect(second.body.nextCursor).toBeNull();
    expect(new Set([...first.body.events,...second.body.events].map(row => row.id)).size).toBe(55);
    const bots=await request(app).get("/api/analytics/report?slug=sample&traffic=bots").set("Cookie",cookie).expect(200);
    expect(bots.body.total).toBe(1);
    const historical=await request(app).get("/api/analytics/events?slug=sample&q=doesnotexist").set("Cookie",cookie).expect(200);
    expect(historical.body.events).toHaveLength(0);
    const exported=await request(app).get("/api/analytics/export?"+filter).set("Cookie",cookie).buffer(true).parse((res,done) => {res.setEncoding("utf8");let text="";res.on("data",chunk => {text+=chunk;});res.on("end",() => done(null,text));}).expect(200);
    expect(exported.body.trim().split("\n")).toHaveLength(55);
    expect(JSON.parse(exported.body.trim().split("\n")[0]).details.geo.city).toBe("München");
    for(const invalid of ["from=bad","from=2026-02-30","from=2026-11-02&to=2026-11-01","type=bad","traffic=bad","slug[]=sample"]) await request(app).get("/api/analytics/report?"+invalid).set("Cookie",cookie).expect(400);
    await request(app).get("/api/analytics/events?cursor=1.5").set("Cookie",cookie).expect(400);
  } finally {db.close();}
});

it("migrates v13 event history without fabricating visitor details",async () => {
  const {mkdtempSync,rmSync}=await import("node:fs");
  const {join}=await import("node:path");
  const {tmpdir}=await import("node:os");
  const root=mkdtempSync(join(tmpdir(),"sharelyze-analytics-migration-")),file=join(root,"db");
  try {
    const old=openDatabase(file);
    old.exec("INSERT INTO links(id,slug,target_url,created_at) VALUES('l','old','https://example.org','now'); INSERT INTO events(link_id,type,created_at,ip_address,user_agent) VALUES('l','redirect','2026-11-01T00:00:00.000Z','8.8.8.8','legacy'); DROP INDEX events_type_time; ALTER TABLE events DROP COLUMN details_json; PRAGMA user_version=13;");
    old.close();
    const migrated=openDatabase(file);
    try {
      expect(migrated.pragma("user_version",{simple:true})).toBe(15);
      expect(migrated.prepare("SELECT ip_address,user_agent,details_json FROM events").get()).toEqual({ip_address:"8.8.8.8",user_agent:"legacy",details_json:null});
    } finally {migrated.close();}
  } finally {rmSync(root,{recursive:true,force:true});}
});
