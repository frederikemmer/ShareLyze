import { it, expect } from "vitest";
import request from "supertest";
import { openDatabase } from "../src/database";
import { createApp } from "../src/app";
it("persists region and hour format and rejects invalid or unauthorized updates",async()=>{
 const db=openDatabase(":memory:"),origin="http://localhost:5173",setupToken="0123456789abcdef0123456789abcdef";
 const options={db,publicOrigin:origin,setupToken,secureCookies:false}, app=createApp(options);
 try {
  await request(app).get("/api/settings/datetime").expect(401);
  const setup=await request(app).post("/api/auth/setup").set("Origin",origin).send({username:"admin",password:"correct horse battery staple",setupToken}).expect(201);
  const cookie=setup.headers["set-cookie"][0] as string;
  await request(app).get("/api/settings/datetime").set("Cookie",cookie).expect(200).expect(({body})=>expect(body).toEqual({region:"auto",timeFormat:"auto"}));
  await request(app).put("/api/settings/datetime").set("Cookie",cookie).set("Origin",origin).send({region:"invalid",timeFormat:"12"}).expect(400);
  await request(app).put("/api/settings/datetime").set("Cookie",cookie).set("Origin","http://evil.test").send({region:"en-US",timeFormat:"12"}).expect(403);
  await request(app).put("/api/settings/datetime").set("Cookie",cookie).set("Origin",origin).send({region:"en-US",timeFormat:"12"}).expect(200);
  await request(createApp(options)).get("/api/settings/datetime").set("Cookie",cookie).expect(200).expect(({body})=>expect(body).toEqual({region:"en-US",timeFormat:"12"}));
 } finally {db.close();}
});
