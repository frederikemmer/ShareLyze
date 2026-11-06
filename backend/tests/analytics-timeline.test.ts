import { it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { openDatabase } from "../src/database";
import { timelinePoints } from "../../shared/analytics-timeline";
it("returns complete cumulative inputs beyond 730 groups, scopes links, and filters exact log intervals",async()=>{
  const db=openDatabase(":memory:"),origin="http://localhost:5173",setupToken="0123456789abcdef0123456789abcdef";
  const app=createApp({db,publicOrigin:origin,setupToken,secureCookies:false});
  try {
    const setup=await request(app).post("/api/auth/setup").set("Origin",origin).send({username:"admin",password:"correct horse battery staple",setupToken}).expect(201);
    const cookie=setup.headers['set-cookie'][0];
    db.exec("INSERT INTO links(id,slug,target_url,created_at) VALUES('timeline','family','https://example.org','now'),('other-timeline','other','https://example.org','now')");
    const insert=db.prepare("INSERT INTO events(link_id,type,created_at) VALUES(?,?,?)");
    for(let i=0;i<300;i++)for(const type of ['view','download_start','transfer_finished'])insert.run('timeline',type,new Date(Date.UTC(2026,0,1+i,12)).toISOString());
    insert.run('other-timeline','view','2026-01-01T12:00:00.000Z');
    const query='?slug=family&from=2026-01-01&to=2026-10-27&resolution=day';
    await request(app).get('/api/analytics/timeline'+query).expect(401);
    const result=await request(app).get('/api/analytics/timeline'+query).set('Cookie',cookie).expect(200);
    expect(result.body.rows).toHaveLength(900);expect(timelinePoints(result.body).at(-1)?.cumulative).toEqual({view:300,download_start:300,transfer_finished:300});
    const interval='?slug=family&from=2026-01-01&to=2026-01-01&since=2026-01-01T12:00:00.000Z&until=2026-01-01T13:00:00.000Z';
    const events=await request(app).get('/api/analytics/events'+interval).set('Cookie',cookie).expect(200);expect(events.body.events).toHaveLength(3);
    await request(app).get('/api/analytics/export'+interval+'&type=view').set('Cookie',cookie).expect(200).then(r=>expect(r.text.trim().split('\n')).toHaveLength(1));
    const empty=await request(app).get('/api/analytics/events?slug=family&since=2026-01-01T11:00:00.000Z&until=2026-01-01T12:00:00.000Z').set('Cookie',cookie).expect(200);expect(empty.body.events).toEqual([]);
    const hourly=await request(app).get('/api/analytics/timeline?slug=family&from=2026-01-01&to=2026-01-01&resolution=hour').set('Cookie',cookie).expect(200);expect(hourly.body.rows[0].bucket).toBe('2026-01-01T12:00:00.000Z');
    for(const bad of ['?from=2020-01-01&to=2026-01-01','?from=2026-01-01&to=2026-01-02&resolution=minute','?from=2026-02-30&to=2026-03-01','?from=2026-01-01&to=2026-01-01&since=garbage'])await request(app).get('/api/analytics/timeline'+bad).set('Cookie',cookie).expect(400);
  }finally{db.close();}
});
