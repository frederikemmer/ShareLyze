import { it, expect, vi } from "vitest";
import { mkdtempSync, writeFileSync, openSync, rmSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";
import { PreviewCache } from "../src/previews";
// Rendering/cache behavior only. Linux descriptor traversal has separate integration tests.
vi.mock("../src/storage", () => ({openSourceFile:(root:string,path:string) => openSync(join(root,path),"r"),listSourceDirectory:() => []}));
it("caches and invalidates raster previews, rasterizes SVG/text and rejects external SVG references", async () => {
  const root=mkdtempSync(join(tmpdir(),"sharelyze-preview-")), cache=new PreviewCache(join(root,"cache"));
  try {
    writeFileSync(join(root,"safe.svg"),'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="red"/></svg>');
    const [first,second]=await Promise.all([cache.get(root,"safe.svg"),cache.get(root,"safe.svg")]);
    expect(first.equals(second)).toBe(true);
    expect((await sharp(first).metadata()).format).toBe("jpeg");
    expect(readdirSync(cache.root!)).toHaveLength(1);
    writeFileSync(join(root,"safe.svg"),'<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30"><rect width="30" height="30" fill="blue"/></svg>');
    expect((await cache.get(root,"safe.svg")).equals(first)).toBe(false);
    writeFileSync(join(root,"bad.svg"),'<svg xmlns="http://www.w3.org/2000/svg"><image href="file:///etc/passwd"/></svg>');
    await expect(cache.get(root,"bad.svg")).rejects.toThrow();
    writeFileSync(join(root,"hello.md"),"Hello <script> is plain text");
    expect((await sharp(await cache.get(root,"hello.md")).metadata()).format).toBe("jpeg");
    rmSync(join(root,"safe.svg"));
    await expect(cache.get(root,"safe.svg")).rejects.toThrow();
    await cache.clean(30,true);
    expect(readdirSync(cache.root!)).toHaveLength(0);
  } finally {rmSync(root,{recursive:true,force:true});}
});
