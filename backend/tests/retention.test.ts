import { it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, utimesSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase } from "../src/database";
import { getRetention, runRetention, validateRetention, activeUploadBatches } from "../src/retention";
import { dataLayout } from "../src/data-layout";

it("retains statistics and shared upload batches; only purges unreferenced private uploads after the grace period", () => {
  const root=mkdtempSync(join(tmpdir(),"sharelyze-retention-")), db=openDatabase(":memory:");
  const a="00000000-0000-4000-8000-000000000001", b="00000000-0000-4000-8000-000000000002", c="00000000-0000-4000-8000-000000000003";
  const old=new Date(Date.now()-3*86400000);
  try {
    for(const name of [a,b,c,"not-managed"]) {mkdirSync(join(root,name));writeFileSync(join(root,name,"keep.txt"),"original");utimesSync(join(root,name),old,old);}
    db.prepare("INSERT INTO sources(id,name,root) VALUES('sharelyze-uploads','Uploads',?)").run(root);
    db.exec("INSERT INTO shares(id,title,created_at,deleted_at) VALUES('a','a','now','2020-01-01'),('b','b','now',NULL); INSERT INTO links(id,slug,share_id,created_at) VALUES('l','historic','a','now'); INSERT INTO events(link_id,share_id,type,created_at) VALUES('l','a','view','2020-01-01');");
    const insert=db.prepare("INSERT INTO share_items(id,share_id,source_id,relative_path,kind) VALUES(?,?,'sharelyze-uploads',?,'directory')");
    insert.run("a","a",a);insert.run("b","b",a);
    activeUploadBatches.set(c,1);
    runRetention(db,root);
    expect(existsSync(join(root,a))).toBe(true);
    expect(existsSync(join(root,b))).toBe(false);
    expect(existsSync(join(root,c))).toBe(true);
    expect(existsSync(join(root,"not-managed"))).toBe(true);
    expect(db.prepare("SELECT link_id,share_id FROM events").get()).toEqual({link_id:"l",share_id:"a"});
    expect(getRetention(db).analyticsDays).toBeNull();
    db.prepare("UPDATE shares SET deleted_at='2020-01-01' WHERE id='b'").run();
    runRetention(db,root);
    expect(existsSync(join(root,a))).toBe(false);
    expect(() => validateRetention({analyticsDays:0,deletedShareDays:1,orphanUploadDays:1,previewDays:30})).toThrow();
    db.prepare("INSERT INTO settings VALUES('retention',?)").run(JSON.stringify({analyticsDays:30,deletedShareDays:1,orphanUploadDays:1,previewDays:30}));
    runRetention(db,root);
    expect(db.prepare("SELECT * FROM events").all()).toHaveLength(0);
  } finally {activeUploadBatches.clear();db.close();rmSync(root,{recursive:true,force:true});}
});

it("backs up legacy SQLite including WAL and moves the encryption key to the separate config directory", async () => {
  const root=mkdtempSync(join(tmpdir(),"sharelyze-layout-"));
  try {
    const db=openDatabase(join(root,"sharelyze.db"));
    db.exec("INSERT INTO settings VALUES('keep','yes')");
    writeFileSync(join(root,"link-password.key"),"key-material",{mode:0o600});
    const layout=await dataLayout({DATA_ROOT:root});
    const migrated=openDatabase(layout.dbPath);
    expect(migrated.prepare("SELECT value FROM settings WHERE key='keep'").get()).toEqual({value:"yes"});
    migrated.close();db.close();
    expect(existsSync(layout.passwordKeyPath)).toBe(true);
    expect(existsSync(join(root,"sharelyze.db.migrated"))).toBe(true);
    await dataLayout({DATA_ROOT:root});
    const explicit = await dataLayout({DATA_ROOT:join(root,"explicit"),DB_PATH:join(root,"explicit/sharelyze.db")});
    expect(explicit.dbPath).toBe(join(root,"explicit/sharelyze.db"));
    const other=join(root,"outside");mkdirSync(other);
    symlinkSync(other,join(root,"linked"));
    await expect(dataLayout({DATA_ROOT:root,PREVIEW_ROOT:join(root,"linked")})).rejects.toThrow();
  } finally {rmSync(root,{recursive:true,force:true});}
});
