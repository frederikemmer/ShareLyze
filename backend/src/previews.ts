import { createHash, randomUUID } from "node:crypto";
import { closeSync, fstatSync, readSync, mkdirSync } from "node:fs";
import { readFile, writeFile, rename, readdir, lstat, unlink } from "node:fs/promises";
import { join } from "node:path";
import type Database from "better-sqlite3";
import sharp from "sharp";
import { listSourceDirectory, openSourceFile } from "./storage";

export const previewPattern = /\.(jpe?g|png|webp|gif|avif|svg|tiff?|heic|heif|txt|md|csv|json|log|ya?ml)$/i;
const textPattern = /\.(txt|md|csv|json|log|ya?ml)$/i;
const escapeXml = (s: string) => s.replace(/[<>&"']/g, c => ({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;","'":"&apos;"}[c]!));
export class PreviewCache {
  private jobs = new Map<string, Promise<Buffer>>();
  private tail: Promise<unknown> = Promise.resolve();
  private scanning = false;
  private generation = 0;
  status = { running:false, phase:"idle", total:0, completed:0, failed:0, error:"" };
  constructor(readonly root?: string) { if (root) mkdirSync(root, {recursive:true, mode:0o700}); }
  async get(root: string, path: string): Promise<Buffer> {
    if (!previewPattern.test(path)) throw new Error("Unsupported preview");
    // Validate the current source before accessing cached output.
    const fd = openSourceFile(root, path);
    let key: string;
    let before: ReturnType<typeof fstatSync>;
    try {
      before = fstatSync(fd);
      if (before.size > 50 * 1024 ** 2) throw new Error("Preview input too large");
      key = createHash("sha256").update(JSON.stringify([root,path,before.dev,before.ino,before.size,before.mtimeMs,before.ctimeMs,"v1"])).digest("hex");
    } catch (e) { closeSync(fd); throw e; }
    const current = this.jobs.get(key);
    if (current) { closeSync(fd); return current; }
    if (this.jobs.size >= 256) { closeSync(fd); throw new Error("Preview queue full"); }
    const work = this.tail.then(async () => {
      try {
        if (this.root) {
          try { return await readFile(join(this.root, key + ".jpg")); }
          catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; }
        }
        const length = textPattern.test(path) ? Math.min(before.size, 16000) : before.size;
        const input = Buffer.alloc(length);
        let offset = 0;
        while (offset < length) { const n = readSync(fd,input,offset,length-offset,offset); if (!n) throw new Error("Source changed"); offset += n; }
        const after = fstatSync(fd);
        if (after.size !== before.size || after.mtimeMs !== before.mtimeMs || after.ctimeMs !== before.ctimeMs) throw new Error("Source changed");
        let data = input;
        if (textPattern.test(path)) {
          const text = new TextDecoder("utf-8", {fatal:true}).decode(input);
          if (text.includes("\0")) throw new Error("Binary text");
          const lines = text.split(/\r?\n/).slice(0,28);
          data = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#fff"/><g font-family="monospace" font-size="16" fill="#222">' + lines.map((line,i) => '<text x="16" y="' + (26+i*20) + '">' + escapeXml(line.slice(0,90)) + '</text>').join("") + '</g></svg>');
        } else if (/\.svg$/i.test(path)) {
          const text = input.toString("utf8");
          // Rasterize only self-contained SVGs; no active markup or external resources.
          if (!/<svg[\s>]/i.test(text) || /<!|<\?|<style|\bstyle\s*=|<script|<foreignObject|\bon\w+\s*=|\b(?:href|src)\s*=\s*["']\s*[^#]|url\s*\(|@import/i.test(text)) throw new Error("Unsafe SVG");
        } else if (/\.(jpe?g|png|webp|gif|avif)$/i.test(path)) {
          const format = (await sharp(data).metadata()).format;
          if (!format || !["jpeg","png","webp","gif","heif","avif"].includes(format)) throw new Error("Invalid image");
        }
        const output = await sharp(data, {limitInputPixels:40_000_000, failOn:"error"}).timeout({seconds:15}).rotate().resize({width:800,height:600,fit:"inside",withoutEnlargement:true}).jpeg({quality:78}).toBuffer();
        if (this.root) {
          const temporary = join(this.root, key + "." + randomUUID() + ".tmp");
          try { await writeFile(temporary,output,{mode:0o600,flag:"wx"}); await rename(temporary,join(this.root,key+".jpg")); await this.clean(3650); }
          finally { await unlink(temporary).catch(() => {}); }
        }
        return output;
      } finally { closeSync(fd); }
    });
    this.jobs.set(key,work);
    this.tail = work.catch(() => {}).finally(() => {this.jobs.delete(key);});
    return work;
  }
  async warm(db: Database.Database) {
    if (this.scanning) return;
    this.scanning = true;
    const generation = ++this.generation;
    this.status = {running:true,phase:"scanning",total:0,completed:0,failed:0,error:""};
    try {
      const entries = db.prepare("SELECT i.relative_path AS path,i.kind,s.root FROM share_items i JOIN sources s ON s.id=i.source_id JOIN shares sh ON sh.id=i.share_id WHERE s.active=1 AND sh.active=1 AND sh.deleted_at IS NULL AND (sh.expires_at IS NULL OR sh.expires_at>?)").all(new Date().toISOString()) as {path:string;kind:string;root:string}[];
      const seen = new Set<string>();
      let visited = 0;
      while (entries.length) {
        const item = entries.pop()!;
        const identity = JSON.stringify([item.root,item.path]);
        if (seen.has(identity)) continue;
        seen.add(identity);
        if (++visited > 100000) throw new Error("Mehr als 100.000 Einträge; weitere Vorschauen werden bei Zugriff erzeugt.");
        if (item.kind === "directory") {
          try { for (const child of listSourceDirectory(item.root,item.path)) entries.push({root:item.root,path:[item.path,child.name].filter(Boolean).join("/"),kind:child.kind}); }
          catch { this.status.total++; this.status.failed++; }
        } else if (previewPattern.test(item.path)) {
          this.status.total++;
          this.status.phase = "generating";
          try { await this.get(item.root,item.path); this.status.completed++; } catch { this.status.total++; this.status.failed++; }
        }
        if (visited % 100 === 0) await new Promise<void>(resolve => setImmediate(resolve));
      }
    } catch (e) { this.status.error = (e as Error).message; }
    finally { if (generation === this.generation) {this.scanning=false;this.status.running=false;this.status.phase="idle";} }
  }
  async clean(days: number, clear = false) {
    if (!this.root) return {bytes:0, files:0};
    if (clear && (this.scanning || this.jobs.size)) throw new Error("Cache busy");
    const files = [];
    for (const name of await readdir(this.root)) {
      if (!/^[a-f0-9]{64}(\.jpg|\.[a-f0-9-]+\.tmp)$/.test(name)) continue;
      const path = join(this.root,name);
      try {
        const info = await lstat(path);
        if(info.isFile()) files.push({path,name,...info});
      } catch(error) {if((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;}
    }
    files.sort((a,b) => b.mtimeMs-a.mtimeMs);
    let bytes = 0, count = 0;
    for (const file of files) {
      const key = file.name.slice(0,64);
      if (!this.jobs.has(key) && (clear || Date.now()-file.mtimeMs > days*86400000 || bytes+file.size > 512*1024**2)) await unlink(file.path).catch(() => {});
      else {bytes += file.size;count++;}
    }
    return {bytes,files:count};
  }
}
