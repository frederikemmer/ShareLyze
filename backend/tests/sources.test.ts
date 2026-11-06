import { it, expect } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { configureSources } from "../src/sources";
import { openDatabase } from "../src/database";
it("discovers directory mounts, preserves exact-path IDs, disables removed sources and ignores symlinks", () => {
  const root=mkdtempSync(join(tmpdir(),"sharelyze-sources-")), db=openDatabase(":memory:");
  try {
    const sources=join(root,"sources"),uploads=join(root,"uploads");mkdirSync(sources);mkdirSync(join(sources,"Fotos"));
    symlinkSync(root,join(sources,"Unsafe"));
    db.prepare("INSERT INTO sources VALUES('existing','old',?,1)").run(join(sources,"Fotos"));
    configureSources(db,sources,uploads);
    expect(db.prepare("SELECT id,name FROM sources WHERE active=1 AND id!='sharelyze-uploads'").all()).toEqual([{id:"existing",name:"Fotos"}]);
    rmSync(join(sources,"Fotos"),{recursive:true});
    configureSources(db,sources,uploads);
    expect(db.prepare("SELECT active FROM sources WHERE id='existing'").get()).toEqual({active:0});
    mkdirSync(join(sources,"Fotos"));configureSources(db,sources,uploads);
    expect(db.prepare("SELECT active FROM sources WHERE id='existing'").get()).toEqual({active:1});
  } finally {db.close();rmSync(root,{recursive:true,force:true});}
});
