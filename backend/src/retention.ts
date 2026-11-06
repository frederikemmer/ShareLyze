import type Database from "better-sqlite3";
import { lstatSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

export type RetentionSettings = { analyticsDays: number | null; deletedShareDays: number; orphanUploadDays: number; previewDays: number };
export function validateRetention(value: any): RetentionSettings {
  if (!value || ![value.deletedShareDays, value.orphanUploadDays, value.previewDays].every(n => Number.isInteger(n) && n >= 1 && n <= 3650) ||
      (value.analyticsDays !== null && (!Number.isInteger(value.analyticsDays) || value.analyticsDays < 1 || value.analyticsDays > 3650))) throw new Error("Invalid retention");
  return { analyticsDays: value.analyticsDays, deletedShareDays: value.deletedShareDays, orphanUploadDays: value.orphanUploadDays, previewDays: value.previewDays };
}
export function getRetention(db: Database.Database): RetentionSettings {
  const row = db.prepare("SELECT value FROM settings WHERE key='retention'").get() as {value:string}|undefined;
  const saved = row ? validateRetention(JSON.parse(row.value)) : {analyticsDays:null, deletedShareDays:1, orphanUploadDays:1, previewDays:30};
  return process.env.ANALYTICS_RETENTION_DAYS ? {...saved, analyticsDays: Number(process.env.ANALYTICS_RETENTION_DAYS)} : saved;
}
export const activeUploadBatches = new Map<string, number>();
const batchId = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
/** Deletes only private upload batches, never a source path. Historical rows remain for analytics. */
export function runRetention(db: Database.Database, uploadRoot?: string, now = Date.now()) {
  const settings = getRetention(db);
  if (settings.analyticsDays !== null) db.prepare("DELETE FROM events WHERE created_at < ?").run(new Date(now - settings.analyticsDays * 86400000).toISOString());
  const cutoff = new Date(now - settings.deletedShareDays * 86400000).toISOString();
  db.prepare("UPDATE shares SET purged_at=? WHERE deleted_at<=? AND purged_at IS NULL").run(new Date(now).toISOString(), cutoff);
  if (!uploadRoot) return;
  const references = db.prepare("SELECT i.relative_path FROM share_items i JOIN shares s ON s.id=i.share_id WHERE i.source_id='sharelyze-uploads' AND s.purged_at IS NULL").all() as {relative_path:string}[];
  // A reference to the upload root protects every batch. Partial references protect the complete batch.
  if (references.some(r => r.relative_path === "")) return;
  const keep = new Set(references.map(r => r.relative_path.split("/")[0]));
  for (const entry of readdirSync(uploadRoot, {withFileTypes:true})) {
    if (!entry.isDirectory() || !batchId.test(entry.name) || keep.has(entry.name) || activeUploadBatches.has(entry.name)) continue;
    const path = join(uploadRoot, entry.name);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink() || now - stat.mtimeMs < settings.orphanUploadDays * 86400000) continue;
    rmSync(path, {recursive:true});
  }
}
