import type Database from "better-sqlite3";
import { defaultUploadPatterns, validateUploadSettings, type UploadSettings } from "../../shared/upload-filter";

export function getUploadSettings(db: Database.Database): UploadSettings {
  const row = db.prepare("SELECT value FROM settings WHERE key='upload_filter'").get() as {value:string}|undefined;
  return row ? validateUploadSettings(JSON.parse(row.value)) : {enabled:true,patterns:[...defaultUploadPatterns]};
}
