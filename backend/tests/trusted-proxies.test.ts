import { expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { openDatabase } from "../src/database";

it("configures persistent proxy trust only for authenticated admins and follows the trusted chain", async () => {
  const db=openDatabase(":memory:");
  const options={db,publicOrigin:"http://localhost:5173",setupToken:"0123456789abcdef0123456789abcdef",secureCookies:false};
  const app=createApp(options);
  const origin=options.publicOrigin;
  try {
    const setup=await request(app).post("/api/auth/setup").set("Origin",origin).send({username:"admin",password:"correct horse battery staple",setupToken:options.setupToken}).expect(201);
    const cookie=setup.headers["set-cookie"][0] as string;
    db.prepare("INSERT INTO links(id,slug,target_url,created_at) VALUES('l','sample','https://example.org','now')").run();
    const visit=async (target:typeof app,forwarded:string) => {
      await request(target).get("/sample").set("X-Forwarded-For",forwarded).set("Authorization","Bearer never-store").expect(302);
      return db.prepare("SELECT * FROM events ORDER BY id DESC LIMIT 1").get() as {ip_address:string;details_json:string};
    };
    expect((await visit(app,"8.8.8.8")).ip_address).not.toBe("8.8.8.8");
    await request(app).put("/api/settings/trusted-proxies").set("Origin",origin).send({proxies:["127.0.0.1"]}).expect(401);
    await request(app).put("/api/settings/trusted-proxies").set("Cookie",cookie).send({proxies:["127.0.0.1"]}).expect(403);
    await request(app).put("/api/settings/trusted-proxies").set("Origin",origin).set("Cookie",cookie).send({proxies:["127.0.0.1"]}).expect(200);
    const row=await visit(app,"8.8.8.8");
    expect(row.ip_address).toBe("8.8.8.8");expect(JSON.stringify(row)).not.toContain("never-store");
    expect((await visit(app,"8.8.8.8, 203.0.113.9")).ip_address).toBe("203.0.113.9");
    await request(app).put("/api/settings/trusted-proxies").set("Origin",origin).set("Cookie",cookie).send({proxies:["127.0.0.1","203.0.113.0/24"]}).expect(200);
    expect((await visit(app,"8.8.8.8, 203.0.113.9")).ip_address).toBe("8.8.8.8");
    for(const address of ["*","true","0.0.0.0/0","::/0","127.0.0.1/33","not-an-ip"]) await request(app).put("/api/settings/trusted-proxies").set("Origin",origin).set("Cookie",cookie).send({proxies:[address]}).expect(400);
    const restarted=createApp(options);
    expect((await visit(restarted,"8.8.8.8, 203.0.113.9")).ip_address).toBe("8.8.8.8");
    const overridden=createApp({...options,trustedProxies:["192.0.2.1"]});
    expect((await request(overridden).get("/api/settings/trusted-proxies").set("Cookie",cookie).expect(200)).body).toMatchObject({locked:true,proxies:["192.0.2.1"]});
    await request(overridden).put("/api/settings/trusted-proxies").set("Origin",origin).set("Cookie",cookie).send({proxies:[]}).expect(409);
    expect((await visit(overridden,"8.8.8.8")).ip_address).not.toBe("8.8.8.8");
    await request(restarted).put("/api/settings/trusted-proxies").set("Origin",origin).set("Cookie",cookie).send({proxies:[]}).expect(200);
    expect((await visit(restarted,"8.8.8.8")).ip_address).not.toBe("8.8.8.8");
  } finally {db.close();}
});
