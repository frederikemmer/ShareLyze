import type Database from "better-sqlite3";
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

export function configureSources(db: Database.Database, sourceRoot: string, uploadRoot: string) {
  let entries: import("node:fs").Dirent[];
  try { entries = readdirSync(sourceRoot,{withFileTypes:true}); }
  catch(error) {if((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; entries=[];}
  const sources = entries.filter(entry => entry.isDirectory()).map(entry => {
    const root = resolve(sourceRoot,entry.name);
    const existing = db.prepare("SELECT id FROM sources WHERE root=? AND id!='sharelyze-uploads'").all(root) as {id:string}[];
    if (existing.length > 1) throw new Error("Ambiguous existing source path");
    return {id:existing[0]?.id ?? "source-"+createHash("sha256").update(entry.name).digest("hex").slice(0,32),name:entry.name,root};
  });
  if(sources.some(s => s.root === uploadRoot || uploadRoot.startsWith(s.root+"/") || s.root.startsWith(uploadRoot+"/"))) throw new Error("Upload storage must be separate from sources");
  mkdirSync(uploadRoot,{recursive:true,mode:0o700});
  db.transaction(() => {
    db.prepare("UPDATE sources SET active=0").run();
    for(const source of [...sources,{id:"sharelyze-uploads",name:"Uploads",root:uploadRoot}]) {
      const old = db.prepare("SELECT root FROM sources WHERE id=?").get(source.id) as {root:string}|undefined;
      if(old && old.root !== source.root && db.prepare("SELECT 1 FROM share_items WHERE source_id=? LIMIT 1").get(source.id)) throw new Error("Cannot change root of referenced source");
      db.prepare("INSERT INTO sources(id,name,root,active) VALUES(?,?,?,1) ON CONFLICT(id) DO UPDATE SET name=excluded.name,root=excluded.root,active=1").run(source.id,source.name,source.root);
    }
  })();
}
